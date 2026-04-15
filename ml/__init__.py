"""
MenoMap ML Module - Menstrual Cycle Prediction

This module provides machine learning-based cycle prediction.
It can be used as a standalone Python service or integrated via API.

Architecture:
- predictor.py  : Main prediction class (Random Forest baseline)
- features.py   : Feature engineering from raw cycle data
- train.py      : Model training script
- api.py        : FastAPI endpoint for serving predictions

Usage:
    from ml.predictor import CyclePredictor

    predictor = CyclePredictor()
    predictor.train(user_cycle_data)
    prediction = predictor.predict(user_features)
"""
