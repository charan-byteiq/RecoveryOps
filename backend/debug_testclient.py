import asyncio
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_performance():
    response = client.get("/api/branches/1/performance?as_of_date=2026-09-30")
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"monthlyKpis keys: {list(data['data']['monthlyKpis'].keys())}")
    print(f"monthlyKpis: {data['data']['monthlyKpis']}")

if __name__ == "__main__":
    test_performance()
