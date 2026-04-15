"""
FastAPI endpoint for ML predictions.

Run as a separate microservice:
    uvicorn ml.api:app --port 8001

The Next.js app can call this service for ML-based predictions
instead of using the rule-based engine.

Endpoints:
    POST /predict   - Get ML prediction for a user's cycle data
    POST /train     - Trigger model retraining
    GET  /health    - Health check
    GET  /model-info - Model metadata and feature importance
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from .predictor import CyclePredictor
from .features import CycleRecord

app = FastAPI(
    title="MenoMap ML Service",
    description="Machine learning predictions for menstrual cycle tracking",
    version="1.0.0",
)

# Global predictor instance
predictor = CyclePredictor()


class CycleInput(BaseModel):
    start_date: str  # YYYY-MM-DD
    end_date: Optional[str] = None
    length: Optional[int] = None
    period_length: Optional[int] = None


class PredictionRequest(BaseModel):
    cycles: List[CycleInput]
    last_period_start: Optional[str] = None


class PredictionResponse(BaseModel):
    predicted_cycle_length: int
    predicted_period_date: str
    ovulation_date: str
    fertile_window_start: str
    fertile_window_end: str
    confidence: float
    method: str


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_trained": predictor.is_trained,
    }


@app.get("/model-info")
async def model_info():
    return {
        "is_trained": predictor.is_trained,
        "training_score": predictor.training_score,
        "feature_importance": predictor.get_feature_importance(),
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Generate ML prediction for a user's cycle history."""
    try:
        # Convert input to CycleRecords
        cycles = []
        for c in request.cycles:
            cycles.append(CycleRecord(
                start_date=datetime.strptime(c.start_date, '%Y-%m-%d'),
                end_date=datetime.strptime(c.end_date, '%Y-%m-%d') if c.end_date else None,
                length=c.length,
                period_length=c.period_length,
            ))

        last_start = None
        if request.last_period_start:
            last_start = datetime.strptime(request.last_period_start, '%Y-%m-%d')

        result = predictor.predict(cycles, last_start)

        return PredictionResponse(
            predicted_cycle_length=result['predicted_cycle_length'],
            predicted_period_date=result['predicted_period_date'].strftime('%Y-%m-%d'),
            ovulation_date=result['ovulation_date'].strftime('%Y-%m-%d'),
            fertile_window_start=result['fertile_window_start'].strftime('%Y-%m-%d'),
            fertile_window_end=result['fertile_window_end'].strftime('%Y-%m-%d'),
            confidence=result['confidence'],
            method=result['method'],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/train")
async def train_model():
    """Trigger model retraining with synthetic data (for demo)."""
    try:
        from .train import generate_synthetic_data
        
        data = generate_synthetic_data(n_users=100)
        metrics = predictor.train(data)
        
        return {
            "status": "trained",
            "metrics": metrics,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
