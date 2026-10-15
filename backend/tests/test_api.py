import logging

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app


@pytest.mark.asyncio
class TestHealth:
    async def test_health(self, client: AsyncClient) -> None:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"


@pytest.mark.asyncio
class TestBranches:
    async def test_list_branches(self, client: AsyncClient) -> None:
        response = await client.get("/api/branches?as_of_date=2026-09-30")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert len(data["data"]) == 7
        assert data["meta"]["asOfDate"] == "2026-09-30"

    async def test_branch_overview(self, client: AsyncClient) -> None:
        response = await client.get("/api/branches/1/overview?as_of_date=2026-09-30")
        assert response.status_code == 200
        data = response.json()
        metrics = data["data"]["metrics"]
        for code in [
            "collection_efficiency",
            "avg_days_to_resolve",
            "contact_rate",
            "ptp_kept_rate",
            "dpd_30_plus_concentration",
        ]:
            assert code in metrics
            assert metrics[code]["availability"] == "available"

    async def test_branch_not_found(self, client: AsyncClient) -> None:
        response = await client.get("/api/branches/999/overview?as_of_date=2026-09-30")
        assert response.status_code == 404

    async def test_invalid_as_of_date(self, client: AsyncClient) -> None:
        response = await client.get("/api/branches/1/overview?as_of_date=bad-date")
        assert response.status_code == 422


@pytest.mark.asyncio
class TestNetworkAnalytics:
    async def test_network_ranking_by_collection_efficiency(self, client: AsyncClient) -> None:
        response = await client.get("/api/analytics/network?as_of_date=2026-09-30")
        assert response.status_code == 200
        data = response.json()
        branches = data["data"]["branches"]
        rates = [b["primaryMetric"] for b in branches]
        assert rates == sorted(rates, reverse=True)
        assert branches[0]["sourceBranchCode"] == "B001"
        assert branches[-1]["sourceBranchCode"] == "B007"

    async def test_network_averages(self, client: AsyncClient) -> None:
        response = await client.get("/api/analytics/network?as_of_date=2026-09-30")
        data = response.json()
        averages = data["data"]["networkAverages"]
        assert averages["collection_efficiency"] is not None
        assert averages["avg_days_to_resolve"] is not None


@pytest.mark.asyncio
class TestPerformance:
    async def test_monthly_comparison_periods(self, client: AsyncClient) -> None:
        response = await client.get("/api/branches/1/performance?as_of_date=2026-09-30")
        assert response.status_code == 200
        data = response.json()
        periods = data["data"]["comparisonPeriods"]
        assert len(periods) == 2
        assert periods[0]["label"] == "August 2026"
        assert periods[1]["label"] == "September 2026"

    async def test_monthly_kpis_present(self, client: AsyncClient) -> None:
        response = await client.get("/api/branches/1/performance?as_of_date=2026-09-30")
        data = response.json()
        monthly = data["data"]["monthlyKpis"]
        for code in [
            "collection_efficiency",
            "avg_days_to_resolve",
            "contact_rate",
            "ptp_kept_rate",
            "dpd_30_plus_concentration",
        ]:
            assert code in monthly
            assert len(monthly[code]) == 2

    async def test_dpd_distribution(self, client: AsyncClient) -> None:
        response = await client.get("/api/branches/1/performance?as_of_date=2026-09-30")
        data = response.json()
        dpd = data["data"]["dpdDistribution"]
        buckets = {d["bucket"] for d in dpd}
        assert buckets == {"current", "1-30", "31-60", "61-90", "90+"}

    async def test_dpd_distribution_is_available_for_historical_month(self, client: AsyncClient) -> None:
        response = await client.get("/api/branches/1/performance?as_of_date=2026-07-01")
        assert response.status_code == 200
        dpd = response.json()["data"]["dpdDistribution"]
        assert len(dpd) == 5
        assert all(bucket["accountCount"] > 0 for bucket in dpd)

    async def test_date_changes_resolve_different_batch(self, client: AsyncClient) -> None:
        sep = (await client.get("/api/branches/1/performance?as_of_date=2026-09-30")).json()
        aug = (await client.get("/api/branches/1/performance?as_of_date=2026-08-31")).json()
        assert sep["meta"]["asOfDate"] == "2026-09-30"
        assert aug["meta"]["asOfDate"] == "2026-08-31"

    async def test_branch_monthly_kpi_patterns_are_not_identical(self, client: AsyncClient) -> None:
        deltas: list[float] = []
        for branch_id in range(1, 8):
            response = await client.get(
                f"/api/branches/{branch_id}/performance?as_of_date=2026-09-30"
            )
            records = response.json()["data"]["monthlyKpis"]["collection_efficiency"]
            deltas.append(records[1]["value"] - records[0]["value"])

        assert len({round(delta, 6) for delta in deltas}) > 1
        assert any(delta > 0 for delta in deltas)
        assert any(delta < 0 for delta in deltas)


@pytest.mark.asyncio
class TestDrivers:
    async def test_root_cause_drivers(self, client: AsyncClient) -> None:
        response = await client.get("/api/branches/1/drivers?as_of_date=2026-09-30")
        assert response.status_code == 200
        data = response.json()
        drivers = data["data"]["rootCauseDrivers"]
        codes = {d["metricCode"] for d in drivers}
        assert codes == {
            "collection_efficiency",
            "avg_days_to_resolve",
            "contact_rate",
            "ptp_kept_rate",
            "dpd_30_plus_concentration",
        }

    async def test_segment_drivers(self, client: AsyncClient) -> None:
        response = await client.get("/api/branches/1/drivers?as_of_date=2026-09-30")
        data = response.json()
        assert len(data["data"]["drivers"]) > 0


@pytest.mark.asyncio
class TestInsights:
    async def test_insights(self, client: AsyncClient) -> None:
        response = await client.get("/api/branches/1/insights?as_of_date=2026-09-30")
        assert response.status_code == 200
        data = response.json()
        insights = data["data"]
        assert len(insights) > 0
        assert insights[0]["modelVersion"] == "demo-v1"


@pytest.mark.asyncio
class TestAIInsights:
    async def test_ai_insight_endpoints_fallback_without_credentials(self, client: AsyncClient) -> None:
        comparison = await client.get("/api/branches/1/ai-insights/comparison?as_of_date=2026-09-30")
        overall = await client.get("/api/branches/1/ai-insights/overall?as_of_date=2026-09-30")
        assert comparison.status_code == 200
        assert overall.status_code == 200
        assert comparison.json()["ai"]["status"] == "fallback"
        assert overall.json()["ai"]["status"] == "fallback"
        assert comparison.json()["data"]["evidence"]
        assert overall.json()["data"]["narrative"]

    @pytest.mark.parametrize(
        "kpi",
        [
            "collection_efficiency",
            "avg_resolution_days",
            "ptp_kept",
            "contact_rate",
            "dpd_distribution",
        ],
    )
    async def test_selected_kpi_fallback_supports_all_ui_kpis(
        self, client: AsyncClient, kpi: str
    ) -> None:
        response = await client.get(
            f"/api/branches/1/ai-insights/kpi?kpi={kpi}&as_of_date=2026-09-30"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ai"]["status"] == "fallback"
        assert data["data"]["metricCode"]
        assert data["data"]["evidence"]

    async def test_selected_kpi_rejects_unknown_metric(self, client: AsyncClient) -> None:
        response = await client.get(
            "/api/branches/1/ai-insights/kpi?kpi=unknown&as_of_date=2026-09-30"
        )
        assert response.status_code == 422


@pytest.mark.asyncio
class TestLogging:
    async def test_request_logs_are_emitted(self, client: AsyncClient, caplog: pytest.LogCaptureFixture) -> None:
        caplog.set_level(logging.INFO, logger="recoveryops")
        response = await client.get("/api/health")
        assert response.status_code == 200
        assert any("GET /api/health -> 200" in r.message for r in caplog.records)

    async def test_startup_logs_database_check(self, caplog: pytest.LogCaptureFixture) -> None:
        caplog.set_level(logging.INFO, logger="recoveryops")
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await client.get("/api/health")
        assert any("Database connection verified" in r.message for r in caplog.records)


@pytest.mark.asyncio
class TestDataIntegrity:
    async def test_all_branches_have_five_core_kpis(self, client: AsyncClient) -> None:
        response = await client.get("/api/analytics/network?as_of_date=2026-09-30")
        data = response.json()
        for branch in data["data"]["branches"]:
            metrics = branch["metrics"]
            for code in [
                "collection_efficiency",
                "avg_days_to_resolve",
                "contact_rate",
                "ptp_kept_rate",
                "dpd_30_plus_concentration",
            ]:
                assert code in metrics, f"{branch['sourceBranchCode']} missing {code}"
                assert metrics[code]["value"] is not None

    async def test_rate_kpis_include_calculation_provenance(self, client: AsyncClient) -> None:
        response = await client.get("/api/branches/1/overview?as_of_date=2026-09-30")
        metrics = response.json()["data"]["metrics"]
        for code in ["collection_efficiency", "contact_rate", "ptp_kept_rate"]:
            assert metrics[code]["numerator"] is not None
            assert metrics[code]["denominator"] is not None
            assert metrics[code]["denominator"] > 0

    async def test_collection_efficiency_is_only_ranking_metric(self, client: AsyncClient) -> None:
        response = await client.get("/api/analytics/network?as_of_date=2026-09-30")
        data = response.json()
        branches = data["data"]["branches"]
        sorted_by_ce = sorted(
            branches,
            key=lambda b: b["metrics"]["collection_efficiency"]["value"] or 0,
            reverse=True,
        )
        assert [b["id"] for b in branches] == [b["id"] for b in sorted_by_ce]
