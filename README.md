# Diabetes Predictor: interactive web app

**Live demo:** https://diabetes-predictor-jwjc.onrender.com

(The free server sleeps when idle, so the first load can take 30–60 seconds.)

Uses your trained model (`Mymdoel.pkl`) behind a FastAPI backend with a live, slider-based frontend.

```
diabetes_app/
├── Mymdoel.pkl       your trained LogisticRegression
├── main.py           FastAPI backend (API + serves the page)
├── requirements.txt
└── static/           index.html, style.css, app.js
```

## Run
```
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
Open http://localhost:8000 (app) or http://localhost:8000/docs (API docs).

| Method | Path | Purpose |
|---|---|---|
| GET | /api/info | slider ranges |
| POST | /api/predict | six values -> label, probability, per-input effect |

Educational demo only, not medical advice.
