"""
Cycle Predictor - ML-based menstrual cycle prediction

Uses Random Forest as the baseline model.
Structured for easy replacement with more advanced models
(e.g., LSTM, XGBoost, or custom neural networks).

The predictor can:
1. Train on historical cycle data from multiple users
2. Predict next cycle length for a specific user
3. Calculate predicted period date, ovulation date, and fertile window
4. Provide confidence scores based on prediction uncertainty

Usage:
    from ml.predictor import CyclePredictor
    from ml.features import CycleRecord

    predictor = CyclePredictor()
    
    # Train (or load pre-trained model)
    predictor.train(users_data)
    
    # Predict for a user
    result = predictor.predict(user_cycles)
    print(f"Next period in {result['predicted_cycle_length']} days")
    print(f"Confidence: {result['confidence']:.0%}")
"""

import numpy as np
import joblib
import os
from typing import List, Dict, Optional
from datetime import datetime, timedelta

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import cross_val_score

from .features import CycleRecord, CycleFeatures, extract_features, prepare_training_data


class CyclePredictor:
    """
    ML-based cycle length predictor.
    
    Uses Random Forest regression as baseline.
    Provides predicted cycle length, period date, ovulation date,
    and confidence score.
    """

    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize predictor.
        
        Args:
            model_path: Path to pre-trained model file. If None, a new model is created.
        """
        self.model = None
        self.model_path = model_path or os.path.join(
            os.path.dirname(__file__), 'trained_model.joblib'
        )
        self.is_trained = False
        self.training_score = 0.0

        # Try loading pre-trained model
        if os.path.exists(self.model_path):
            self.load()

    def train(
        self,
        users_cycles: Dict[str, List[CycleRecord]],
        n_estimators: int = 100,
        max_depth: int = 10,
    ) -> Dict:
        """
        Train the model on historical cycle data from multiple users.
        
        Args:
            users_cycles: Dict mapping user_id to list of CycleRecords
            n_estimators: Number of trees in Random Forest
            max_depth: Maximum tree depth (prevents overfitting)
        
        Returns:
            Dict with training metrics (score, cv_score, n_samples)
        """
        X, y = prepare_training_data(users_cycles)

        if len(X) == 0:
            raise ValueError("Not enough data to train. Need at least 3 cycles per user.")

        # Initialize Random Forest
        self.model = RandomForestRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=42,
            n_jobs=-1,  # Use all CPU cores
        )

        # Train
        self.model.fit(X, y)
        self.is_trained = True

        # Calculate training score
        self.training_score = self.model.score(X, y)

        # Cross-validation score (if enough data)
        cv_score = 0.0
        if len(X) >= 5:
            cv_scores = cross_val_score(self.model, X, y, cv=min(5, len(X)), scoring='r2')
            cv_score = float(np.mean(cv_scores))

        # Save model
        self.save()

        return {
            'training_score': self.training_score,
            'cv_score': cv_score,
            'n_samples': len(X),
            'feature_importance': dict(zip(
                CycleFeatures([], 0, 0, 0, 0, None, None, 0, 0).feature_names(),
                self.model.feature_importances_.tolist()
            )),
        }

    def predict(
        self,
        user_cycles: List[CycleRecord],
        last_period_start: Optional[datetime] = None,
    ) -> Dict:
        """
        Predict next cycle for a specific user.
        
        Args:
            user_cycles: User's cycle history
            last_period_start: Start date of most recent period
                             (defaults to last cycle's start_date)
        
        Returns:
            Dict with:
            - predicted_cycle_length: int
            - predicted_period_date: datetime
            - ovulation_date: datetime
            - fertile_window_start: datetime
            - fertile_window_end: datetime
            - confidence: float (0-1)
            - method: 'ml'
        """
        features = extract_features(user_cycles)

        # Determine last period start
        if last_period_start is None:
            valid = [c for c in user_cycles if c.start_date]
            if valid:
                last_period_start = max(c.start_date for c in valid)
            else:
                last_period_start = datetime.now()

        if self.is_trained and self.model is not None:
            # ML prediction
            X = features.to_array()
            predicted_length = int(round(self.model.predict(X)[0]))

            # Confidence from prediction variance across trees
            tree_predictions = np.array([
                tree.predict(X)[0] for tree in self.model.estimators_
            ])
            prediction_std = np.std(tree_predictions)

            # Confidence: lower std = higher confidence
            # Normalize: std of 0 = confidence 1.0, std of 5+ = confidence ~0.3
            confidence = max(0.3, min(0.95, 1.0 - (prediction_std / 10.0)))

            method = 'ml'
        else:
            # Fallback: rule-based prediction using weighted average
            predicted_length = self._rule_based_prediction(features)
            confidence = min(0.8, 0.3 + (features.num_cycles * 0.08))
            method = 'rule_based'

        # Ensure reasonable bounds
        predicted_length = max(21, min(45, predicted_length))

        # Calculate dates
        predicted_period_date = last_period_start + timedelta(days=predicted_length)
        ovulation_day = predicted_length - 14
        ovulation_date = last_period_start + timedelta(days=ovulation_day)
        fertile_start = ovulation_date - timedelta(days=2)
        fertile_end = ovulation_date + timedelta(days=2)

        return {
            'predicted_cycle_length': predicted_length,
            'predicted_period_date': predicted_period_date,
            'ovulation_date': ovulation_date,
            'fertile_window_start': fertile_start,
            'fertile_window_end': fertile_end,
            'confidence': float(confidence),
            'method': method,
        }

    def _rule_based_prediction(self, features: CycleFeatures) -> int:
        """
        Fallback rule-based prediction using weighted average.
        Used when ML model is not trained.
        """
        if not features.cycle_lengths:
            return 28

        # Weighted average: more recent cycles get higher weight
        weights = np.arange(1, len(features.cycle_lengths) + 1, dtype=float)
        weighted_avg = np.average(features.cycle_lengths, weights=weights)

        return int(round(weighted_avg))

    def save(self):
        """Save trained model to disk."""
        if self.model is not None:
            joblib.dump({
                'model': self.model,
                'training_score': self.training_score,
            }, self.model_path)

    def load(self):
        """Load pre-trained model from disk."""
        try:
            data = joblib.load(self.model_path)
            self.model = data['model']
            self.training_score = data.get('training_score', 0.0)
            self.is_trained = True
        except Exception as e:
            print(f"Failed to load model: {e}")
            self.is_trained = False

    def get_feature_importance(self) -> Optional[Dict[str, float]]:
        """Get feature importance from trained model."""
        if not self.is_trained or self.model is None:
            return None

        names = CycleFeatures([], 0, 0, 0, 0, None, None, 0, 0).feature_names()
        importance = self.model.feature_importances_

        return dict(sorted(
            zip(names, importance.tolist()),
            key=lambda x: x[1],
            reverse=True,
        ))
