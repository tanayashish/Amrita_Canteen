# backend_ml/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from datetime import datetime
from prophet import Prophet
import pandas as pd
import numpy as np

app = FastAPI()

# Allow connections from frontend/backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
client = MongoClient("mongodb://127.0.0.1:27017")
db = client["smartcanteen"]
orders_collection = db["orders"]

@app.get("/")
def root():
    return {"message": "ML forecasting API is running"}

# =============================
# 🧮 1️⃣ Forecast total orders
# =============================
@app.get("/forecast/orders")
def forecast_orders(days: int = 2):
    orders = list(orders_collection.find({}, {"createdAt": 1, "items": 1}))
    if not orders:
        return {"message": "No orders found"}

    data = []
    for o in orders:
        if "createdAt" in o:
            total_qty = sum(i.get("qty", 1) for i in o.get("items", []))
            day = pd.to_datetime(o["createdAt"]).floor("D")
            data.append({"ds": day, "y": total_qty})

    df = pd.DataFrame(data)
    df = df.groupby("ds")["y"].sum().reset_index().sort_values("ds")

    if len(df) < 3:
        return {"message": "Not enough data to forecast"}

    m = Prophet(daily_seasonality=True)
    m.fit(df)

    future = m.make_future_dataframe(periods=days, freq='D')
    forecast = m.predict(future)

    # Clamp negative forecasts to zero
    forecast["yhat"] = forecast["yhat"].clip(lower=0)

    return {
        "history": {
            "dates": df["ds"].dt.strftime("%Y-%m-%d").tolist(),
            "values": df["y"].tolist(),
        },
        "forecast": {
            "dates": forecast.tail(days)["ds"].dt.strftime("%Y-%m-%d").tolist(),
            "values": forecast.tail(days)["yhat"].round().astype(int).tolist(),
        }
    }




# =============================
# 🍽 2️⃣ Forecast item demand
# =============================
@app.get("/forecast/items")
def forecast_items(days: int = 2, top: int = 5):
    """
    Predicts top dishes in demand for the next `days` days
    using historical item frequency from MongoDB.
    """
    orders = list(orders_collection.find({}, {"createdAt": 1, "items": 1}))
    if not orders:
        return {"message": "No orders found"}

    # Flatten items across all orders
    data = []
    for o in orders:
        if "createdAt" in o and "items" in o:
            for i in o["items"]:
                name = i.get("name")
                qty = i.get("qty", 1)
                if name:  # only consider items with valid names
                    data.append({"ds": o["createdAt"], "item": name, "y": qty})

    if not data:
        return {"message": "No valid item data found"}

    df = pd.DataFrame(data)
    df["ds"] = pd.to_datetime(df["ds"])

    # Group by item and date
    item_dfs = {
        item: group.groupby("ds")["y"].sum().reset_index()
        for item, group in df.groupby("item")
    }

    predictions = []
    for item_name, item_df in item_dfs.items():
        try:
            if len(item_df) < 3:
                continue  # skip sparse data
            m = Prophet()
            m.fit(item_df.rename(columns={"ds": "ds", "y": "y"}))
            future = m.make_future_dataframe(periods=days)
            forecast = m.predict(future)
            next_vals = forecast.tail(days)["yhat"].round().astype(int).tolist()
            predictions.append({"item": item_name, "predicted_next_days": next_vals})
        except Exception as e:
            print(f"⚠️ Skipping item {item_name}: {e}")
            continue

    if not predictions:
        return {"message": "Not enough data to forecast"}

    # Rank by total predicted orders (descending)
    predictions.sort(key=lambda x: sum(x["predicted_next_days"]), reverse=True)
    top_items = predictions[:top]

    return {"top_items": top_items}
