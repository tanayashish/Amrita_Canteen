# forecast_service.py
import os
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from pymongo import MongoClient
import pandas as pd
from prophet import Prophet
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/")
DB_NAME = os.getenv("DB_NAME", "smartcanteen")
PORT = int(os.getenv("PORT", 6000))

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
orders_col = db["orders"]

app = FastAPI(title="SmartApp Forecast Service")

# allow local Node server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

def orders_to_daily_df():
    cursor = orders_col.find({}, {"createdAt": 1, "items": 1})
    rows = []
    for o in cursor:
        created = o.get("createdAt")
        if not created:
            continue
        # ensure created is a datetime
        if isinstance(created, str):
            created = datetime.fromisoformat(created)
        rows.append({"createdAt": pd.to_datetime(created), "items": o.get("items", [])})
    if not rows:
        return pd.DataFrame(columns=["ds", "y"])
    df = pd.DataFrame(rows)
    df["ds"] = df["createdAt"].dt.normalize()  # midnight date
    daily = df.groupby("ds").size().reset_index(name="y")
    daily = daily.sort_values("ds")
    return daily

@app.get("/forecast/orders")
def forecast_orders(days: int = Query(2, gt=0, lt=15)):
    """
    Forecast total orders for the next `days` days (default 2).
    Returns past 14 days (if available) and prediction for next `days`.
    """
    df = orders_to_daily_df()
    if df.empty:
        raise HTTPException(status_code=404, detail="No orders found to train model")

    # prepare training data (ensure evenly spaced by day; fill zeros)
    start = df["ds"].min()
    end = df["ds"].max()
    all_days = pd.date_range(start, end, freq="D")
    df_full = pd.DataFrame({"ds": all_days})
    df_full = df_full.merge(df, on="ds", how="left").fillna(0)
    df_full["y"] = df_full["y"].astype(int)

    # Train Prophet on daily counts
    model = Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=False)
    model.fit(df_full.rename(columns={"ds":"ds", "y":"y"}))

    future = model.make_future_dataframe(periods=days)
    forecast = model.predict(future)

    # Format results
    hist_mask = forecast["ds"] <= df_full["ds"].max()
    history = forecast[hist_mask][["ds", "yhat"]].tail(14)  # last 14 days predicted (yhat ~ actual)
    future_mask = forecast["ds"] > df_full["ds"].max()
    future_df = forecast[future_mask][["ds", "yhat"]].head(days)

    return {
        "history": {
            "dates": [d.strftime("%Y-%m-%d") for d in history["ds"].dt.date],
            "values": [int(round(float(v))) for v in history["yhat"].tolist()]
        },
        "forecast": {
            "dates": [d.strftime("%Y-%m-%d") for d in future_df["ds"].dt.date],
            "values": [int(round(float(v))) for v in future_df["yhat"].tolist()]
        }
    }

@app.get("/forecast/items")
def forecast_top_items(days: int = Query(2, gt=0, lt=15), top: int = Query(5, gt=0, lt=50)):
    """
    Predict demand for top-N items for next `days`.
    Strategy:
      - Aggregate item counts per day over history
      - Pick top M historically sold items
      - For each top item, apply simple Prophet if enough history, else moving average
    """
    # fetch all orders
    cursor = orders_col.find({}, {"createdAt": 1, "items": 1})
    rows = []
    for o in cursor:
        created = o.get("createdAt")
        if not created:
            continue
        if isinstance(created, str):
            created = datetime.fromisoformat(created)
        date = pd.to_datetime(created).normalize()
        items = o.get("items", [])
        # items expected: [{name, qty}, ...]
        for it in items:
            name = it.get("name") or it.get("item") or "unknown"
            qty = int(it.get("qty", 1))
            rows.append({"ds": date, "item": name, "qty": qty})
    if not rows:
        raise HTTPException(status_code=404, detail="No orders/items found")

    df = pd.DataFrame(rows)
    # aggregate per day per item
    agg = df.groupby(["ds", "item"])["qty"].sum().reset_index()
    # total per item to pick top
    total_item = agg.groupby("item")["qty"].sum().reset_index().sort_values("qty", ascending=False)
    top_items = total_item.head(top)["item"].tolist()

    results = []
    for item in top_items:
        sub = agg[agg["item"] == item].copy().sort_values("ds")
        # ensure daily series
        if sub.empty:
            continue
        start = sub["ds"].min()
        end = sub["ds"].max()
        all_days = pd.date_range(start, end, freq="D")
        series = pd.DataFrame({"ds": all_days})
        series = series.merge(sub[["ds","qty"]].rename(columns={"qty":"y"}), on="ds", how="left").fillna(0)
        series["y"] = series["y"].astype(float)

        # if we have >=7 days data, use Prophet; else use moving avg
        if len(series) >= 7:
            try:
                m = Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=False)
                m.fit(series)
                fut = m.make_future_dataframe(periods=days)
                pred = m.predict(fut)
                future_mask = pred["ds"] > series["ds"].max()
                values = pred[future_mask]["yhat"].head(days).tolist()
                values = [max(0, int(round(float(v)))) for v in values]
            except Exception as e:
                # fallback
                avg = int(round(series["y"].tail(7).mean()))
                values = [avg]*days
        else:
            avg = int(round(series["y"].mean()))
            values = [avg]*days

        results.append({"item": item, "predicted_next_days": values})

    return {"top_items": results}
