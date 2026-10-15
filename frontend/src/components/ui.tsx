import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useScrollInView } from "@/hooks/use-scroll-in-view";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-9 px-3.5 text-sm",
        size === "lg" && "h-11 px-5 text-base",
        variant === "primary" && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        variant === "secondary" &&
          "border border-border bg-card/70 text-foreground hover:bg-accent",
        variant === "ghost" && "text-muted-foreground hover:bg-accent hover:text-foreground",
        variant === "danger" &&
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        className,
      )}
      {...props}
    />
  );
}

export function GlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("glass rounded-2xl", className)}>{children}</section>;
}

export function Status({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "success" | "danger" | "warning" | "info" | "neutral" | "good" | "warn";
  className?: string;
}) {
  const normalizedTone = tone === "good" ? "success" : tone === "warn" ? "warning" : tone;

  return (
    <span
      className={cn(
        "inline-flex items-center shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold tracking-tight transition-colors",
        normalizedTone === "success" && "bg-success/10 text-success",
        normalizedTone === "danger" && "bg-destructive/10 text-destructive",
        normalizedTone === "warning" && "bg-warning/15 text-warning-foreground",
        normalizedTone === "info" && "bg-primary/10 text-primary",
        normalizedTone === "neutral" && "bg-muted text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function MetricBar({
  value,
  peer,
  tone = "primary",
  className,
}: {
  value: number;
  peer?: number | undefined;
  tone?: "primary" | "danger" | "warn" | "warning" | "success" | "good";
  className?: string;
}) {
  const { ref, isInView } = useScrollInView({ threshold: 0.1 });
  const normalizedTone = tone === "good" ? "success" : tone === "warn" ? "warning" : tone;
  const clampedValue = Math.max(0, Math.min(100, value));
  const clampedPeer = peer !== undefined ? Math.max(0, Math.min(100, peer)) : undefined;

  return (
    <div
      ref={ref}
      className={cn("relative h-2 flex-1 overflow-visible rounded-full bg-muted/80", className)}
    >
      <div className="h-full w-full overflow-hidden rounded-full">
        {/* Animated Progress Bar sweeping over 800ms */}
        <div
          className={cn(
            "h-full rounded-full transition-all duration-800 ease-out",
            normalizedTone === "primary" && "bg-primary",
            normalizedTone === "danger" && "bg-destructive",
            normalizedTone === "warning" && "bg-warning",
            normalizedTone === "success" && "bg-success",
          )}
          style={{ width: isInView ? `${clampedValue}%` : "0%" }}
        />
      </div>

      {/* Floating vertical peer benchmark needle */}
      {clampedPeer !== undefined && (
        <div
          className={cn(
            "absolute -top-1 -bottom-1 z-10 w-0.5 rounded-full bg-foreground shadow-xs transition-all duration-800 delay-200 ease-out",
            isInView ? "scale-y-100 opacity-90" : "scale-y-0 opacity-0",
          )}
          style={{ left: `${clampedPeer}%` }}
          title={`Peer average: ${clampedPeer}%`}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 size-1.5 rounded-full bg-foreground" />
        </div>
      )}
    </div>
  );
}
