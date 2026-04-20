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
from datetime import datetime, timedelta

from predictor import CyclePredictor
from features import CycleRecord

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
    cycles: Optional[List[CycleInput]] = None
    last_period_start: Optional[str] = None
    user_id: Optional[str] = None
    cycle_start_dates: Optional[List[str]] = None
    cycle_lengths: Optional[List[int]] = None
    period_durations: Optional[List[int]] = None
    avg_cycle_length: Optional[float] = None
    cycle_length_std: Optional[float] = None
    recent_cycle_lengths: Optional[List[int]] = None
    gaps_between_cycles: Optional[List[int]] = None
    last_period_date: Optional[str] = None


class PredictionResponse(BaseModel):
    predicted_cycle_length: int
    predicted_period_date: str
    ovulation_date: str
    fertile_window_start: str
    fertile_window_end: str
    confidence: float
    confidence_range_days: float
    method: str
    user_avg_cycle: float
    user_variance: float
    population_avg: float
    population_std: float


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
        # Convert input to CycleRecords (legacy + hybrid formats)
        cycles = []

        if request.cycles:
            for c in request.cycles:
                cycles.append(CycleRecord(
                    start_date=datetime.strptime(c.start_date, '%Y-%m-%d'),
                    end_date=datetime.strptime(c.end_date, '%Y-%m-%d') if c.end_date else None,
                    length=c.length,
                    period_length=c.period_length,
                ))
        elif request.cycle_start_dates or request.cycle_lengths:
            cycle_start_dates = request.cycle_start_dates or []
            cycle_lengths = request.cycle_lengths or []
            period_durations = request.period_durations or []

            if cycle_start_dates:
                for i, start in enumerate(cycle_start_dates):
                    parsed_start = datetime.strptime(start, '%Y-%m-%d')
                    length = cycle_lengths[i] if i < len(cycle_lengths) else None
                    period_length = period_durations[i] if i < len(period_durations) else None
                    end_date = parsed_start + timedelta(days=length - 1) if length else None

                    cycles.append(CycleRecord(
                        start_date=parsed_start,
                        end_date=end_date,
                        length=length,
                        period_length=period_length,
                    ))
            else:
                anchor = datetime.now()
                if request.last_period_date:
                    anchor = datetime.strptime(request.last_period_date, '%Y-%m-%d')

                for i, length in enumerate(cycle_lengths):
                    start = anchor + timedelta(days=i * max(20, min(45, length)))
                    period_length = period_durations[i] if i < len(period_durations) else None
                    cycles.append(CycleRecord(
                        start_date=start,
                        end_date=start + timedelta(days=max(1, length) - 1),
                        length=length,
                        period_length=period_length,
                    ))

        last_start = None
        if request.last_period_start:
            last_start = datetime.strptime(request.last_period_start, '%Y-%m-%d')
        elif request.last_period_date:
            last_start = datetime.strptime(request.last_period_date, '%Y-%m-%d')

        result = predictor.predict(cycles, last_start)

        return PredictionResponse(
            predicted_cycle_length=result['predicted_cycle_length'],
            predicted_period_date=result['predicted_period_date'].strftime('%Y-%m-%d'),
            ovulation_date=result['ovulation_date'].strftime('%Y-%m-%d'),
            fertile_window_start=result['fertile_window_start'].strftime('%Y-%m-%d'),
            fertile_window_end=result['fertile_window_end'].strftime('%Y-%m-%d'),
            confidence=result['confidence'],
            confidence_range_days=result['confidence_range_days'],
            method=result['method'],
            user_avg_cycle=result['user_avg_cycle'],
            user_variance=result['user_variance'],
            population_avg=result['population_avg'],
            population_std=result['population_std'],
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
