import pickle
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE = Path(__file__).parent
with open(BASE / "Mymdoel.pkl", "rb") as f:
    model = pickle.load(f)

FEATURES = list(model.feature_names_in_)
COEF = dict(zip(FEATURES, model.coef_[0]))

# Slider ranges and a "typical person" reference value for each input.
# (Typical clinical ranges, not measured from your training data.)
RANGES = {
    "Glucose": dict(min=40, max=250, step=1, ref=120, unit="mg/dL"),
    "BloodPressure": dict(min=30, max=130, step=1, ref=69, unit="mmHg"),
    "Insulin": dict(min=0, max=600, step=1, ref=80, unit="µU/mL"),
    "BMI": dict(min=15, max=60, step=0.1, ref=32, unit=""),
    "DiabetesPedigreeFunction": dict(min=0.05, max=2.5, step=0.01, ref=0.47, unit=""),
    "Age": dict(min=18, max=90, step=1, ref=33, unit="years"),
}

app = FastAPI(title="Diabetes Predictor", description="Interactive diabetes risk demo")


class PredictRequest(BaseModel):
    Glucose: float
    BloodPressure: float
    Insulin: float
    BMI: float
    DiabetesPedigreeFunction: float
    Age: float


@app.get("/api/info")
def info():
    return {
        "model": type(model).__name__,
        "features": [{"name": f, **RANGES[f]} for f in FEATURES if f in RANGES],
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/predict")
def predict(req: PredictRequest):
    data = req.model_dump()
    df = pd.DataFrame([data])[FEATURES]
    p = float(model.predict_proba(df)[0][1])
    # How far each input moves the result vs. a typical person (log-odds units)
    contributions = [
        {"feature": f, "effect": round(float(COEF[f] * (data[f] - RANGES[f]["ref"])), 3)}
        for f in FEATURES
    ]
    return {
        "label": "Diabetic" if p >= 0.5 else "Not Diabetic",
        "probability": round(p, 4),
        "contributions": contributions,
    }


@app.get("/")
def home():
    return FileResponse(BASE / "static" / "index.html")


app.mount("/static", StaticFiles(directory=BASE / "static"), name="static")
