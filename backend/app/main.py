import logging
import sys
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import branches


class _FlushingStreamHandler(logging.StreamHandler):
    """Stream handler that flushes immediately so logs are visible in real time.

    This avoids output buffering that can hide request logs when the server is
    running under process managers, reloaders, or redirected terminals.
    """

    def emit(self, record: logging.LogRecord) -> None:
        super().emit(record)
        try:
            if self.stream:
                self.stream.flush()
        except Exception:  # pragma: no cover - best-effort flush
            pass


_LOG_FORMAT = logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


def _configure_stdio() -> None:
    """Ensure stdout/stderr are line-buffered so logs appear immediately."""
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(line_buffering=True)
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(line_buffering=True)
    except Exception:
        # Best effort only; some environments restrict reconfiguration.
        pass


def _setup_logging() -> logging.Logger:
    """Configure root and application loggers to emit only to the terminal."""
    _configure_stdio()

    console_handler = _FlushingStreamHandler()
    console_handler.setFormatter(_LOG_FORMAT)

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    # Avoid adding duplicate handlers if the module is reloaded.
    if not any(isinstance(h, _FlushingStreamHandler) for h in root_logger.handlers):
        root_logger.addHandler(console_handler)

    app_logger = logging.getLogger("recoveryops")
    app_logger.setLevel(logging.INFO)
    # Propagate to root so uvicorn and application logs share the same output.
    app_logger.propagate = True

    # Quiet down noisy third-party loggers in development by default.
    logging.getLogger("watchfiles").setLevel(logging.WARNING)

    return app_logger


logger = _setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("RecoveryOps API starting up (version=%s)", app.version)
    try:
        import app.database as db

        async with db.engine.begin() as conn:
            result = await conn.exec_driver_sql("SELECT 1")
            if result.scalar() != 1:
                raise RuntimeError("Database connectivity check failed")
        logger.info("Database connection verified")
    except Exception as exc:
        logger.exception("Database connection failed during startup: %s", exc)
        raise

    yield

    logger.info("RecoveryOps API shutting down")


app = FastAPI(title="RecoveryOps API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        duration = time.perf_counter() - start
        logger.exception(
            "%s %s -> unhandled exception after %.3fs: %s",
            request.method,
            request.url.path,
            duration,
            exc,
        )
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"},
        )
    duration = time.perf_counter() - start
    logger.info(
        "%s %s -> %s (%.3fs)",
        request.method,
        request.url.path,
        response.status_code,
        duration,
    )
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Unhandled exception for %s %s: %s",
        request.method,
        request.url.path,
        exc,
    )
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )


app.include_router(branches.router)
