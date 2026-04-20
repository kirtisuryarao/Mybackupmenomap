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
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import cross_val_score

from features import CycleRecord, CycleFeatures, extract_features, prepare_training_data
from kaggle_data_loader import kaggle_loader


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
        Predict next cycle for a specific user using hybrid approach.
        
        Combines user-specific data with population-level patterns from Kaggle data.
        
        Args:
            user_cycles: User's cycle history
            last_period_start: Start date of most recent period
        
        Returns:
            Dict with prediction results including confidence ranges
        """
        features = extract_features(user_cycles)

        # Determine last period start
        if last_period_start is None:
            valid = [c for c in user_cycles if c.start_date]
            if valid:
                last_period_start = max(c.start_date for c in valid)
            else:
                last_period_start = datetime.now()

        # Get user-specific prediction
        user_prediction = self._get_user_specific_prediction(user_cycles, features)
        
        # Get population-level statistics
        kaggle_stats = kaggle_loader.compute_population_stats()
        
        # Hybrid logic: prioritize user data, use Kaggle for confidence
        final_prediction = self._compute_hybrid_prediction(
            user_prediction, kaggle_stats, features
        )

        # Calculate dates
        predicted_period_date = last_period_start + timedelta(days=final_prediction['cycle_length'])
        ovulation_day = final_prediction['cycle_length'] - 14
        ovulation_date = last_period_start + timedelta(days=ovulation_day)
        fertile_start = ovulation_date - timedelta(days=2)
        fertile_end = ovulation_date + timedelta(days=2)

        return {
            'predicted_cycle_length': final_prediction['cycle_length'],
            'predicted_period_date': predicted_period_date,
            'ovulation_date': ovulation_date,
            'fertile_window_start': fertile_start,
            'fertile_window_end': fertile_end,
            'confidence': final_prediction['confidence'],
            'confidence_range_days': final_prediction['confidence_range_days'],
            'method': final_prediction['method'],
            'user_avg_cycle': user_prediction.get('user_avg', 28),
            'user_variance': user_prediction.get('user_std', 3),
            'population_avg': kaggle_stats['avg_cycle_length'],
            'population_std': kaggle_stats['cycle_std'],
        }

    def _predict_personalized(
        self,
        user_cycles: List[CycleRecord],
        history_window: int = 3,
    ) -> Optional[Tuple[int, float]]:
        """
        Train a lightweight per-user random forest from historical windows.

        Example:
        [27, 28, 29] -> target 28
        [28, 29, 28] -> target 30

        Returns None if the user doesn't have enough cycle history.
        """
        lengths = [c.length for c in user_cycles if c.length and 15 <= c.length <= 60]

        if len(lengths) < history_window + 2:
            return None

        X, y = self._build_personalized_dataset(lengths, history_window)
        if len(X) < 3:
            return None

        model = RandomForestRegressor(
            n_estimators=200,
            max_depth=6,
            random_state=42,
            n_jobs=-1,
        )
        model.fit(X, y)

        latest_window = np.array(lengths[-history_window:]).reshape(1, -1)
        prediction = int(round(model.predict(latest_window)[0]))

        tree_predictions = np.array([tree.predict(latest_window)[0] for tree in model.estimators_])
        prediction_std = np.std(tree_predictions)
        confidence = max(0.35, min(0.95, 1.0 - (prediction_std / 10.0)))

        return prediction, float(confidence)

    def _build_personalized_dataset(
        self,
        lengths: List[int],
        history_window: int,
    ) -> Tuple[np.ndarray, np.ndarray]:
        X_rows: List[np.ndarray] = []
        y_rows: List[int] = []

        for index in range(history_window, len(lengths)):
            X_rows.append(np.array(lengths[index - history_window:index], dtype=float))
            y_rows.append(int(lengths[index]))

        return np.array(X_rows), np.array(y_rows)

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

    def _get_user_specific_prediction(
        self,
        user_cycles: List[CycleRecord],
        features: CycleFeatures,
    ) -> Dict:
        """
        Get user-specific prediction using existing ML logic.
        
        Returns:
            Dict with user_avg, user_std, predicted_length, confidence, method
        """
        personalized = self._predict_personalized(user_cycles)

        if personalized is not None:
            predicted_length, confidence = personalized
            method = 'ml_personalized'
        elif self.is_trained and self.model is not None:
            # ML prediction from global model
            X = features.to_array()
            predicted_length = int(round(self.model.predict(X)[0]))

            # Confidence from prediction variance across trees
            tree_predictions = np.array([
                tree.predict(X)[0] for tree in self.model.estimators_
            ])
            prediction_std = np.std(tree_predictions)

            # Confidence: lower std = higher confidence
            confidence = max(0.3, min(0.95, 1.0 - (prediction_std / 10.0)))
            method = 'ml'
        else:
            # Fallback: statistical weighted-average prediction
            predicted_length = self._rule_based_prediction(features)
            confidence = min(0.8, 0.3 + (features.num_cycles * 0.08))
            method = 'rule_based'

        # Ensure reasonable bounds
        predicted_length = max(21, min(45, predicted_length))

        return {
            'user_avg': features.cycle_length_mean,
            'user_std': features.cycle_length_std,
            'predicted_length': predicted_length,
            'confidence': confidence,
            'method': method,
        }

    def _compute_hybrid_prediction(
        self,
        user_prediction: Dict,
        kaggle_stats: Dict,
        features: CycleFeatures,
    ) -> Dict:
        """
        Compute hybrid prediction combining user data with population patterns.
        
        Prioritizes user-specific data but uses Kaggle data for:
        - Confidence ranges when user has limited data
        - General patterns for users with very irregular cycles
        - Validation of predictions against population norms
        
        Args:
            user_prediction: User-specific prediction results
            kaggle_stats: Population statistics from Kaggle data
            features: User's cycle features
        
        Returns:
            Dict with final prediction, confidence, and range
        """
        user_avg = user_prediction['user_avg']
        user_std = user_prediction['user_std']
        user_predicted = user_prediction['predicted_length']
        user_confidence = user_prediction['confidence']
        method = user_prediction['method']

        population_avg = kaggle_stats['avg_cycle_length']
        population_std = kaggle_stats['cycle_std']

        # Base prediction: always use user data
        final_cycle_length = user_predicted

        # Confidence range: max of user variance and population variance
        # This ensures we don't underestimate uncertainty
        user_variance = user_std if user_std > 0 else population_std
        final_variance = max(user_variance, population_std * 0.8)  # Slightly conservative

        # Adjust confidence based on data quality
        data_quality_factor = min(1.0, features.num_cycles / 6.0)  # More cycles = higher confidence
        regularity_factor = max(0.5, 1.0 - (user_std / 10.0))  # More regular = higher confidence
        
        base_confidence = user_confidence * data_quality_factor * regularity_factor
        
        # If user has very limited data, be more conservative
        if features.num_cycles < 3:
            final_variance = max(final_variance, population_std)
            base_confidence *= 0.7
        
        # If prediction deviates significantly from population norm, reduce confidence
        deviation_from_norm = abs(user_predicted - population_avg) / population_std
        if deviation_from_norm > 2.0:  # More than 2 standard deviations
            base_confidence *= 0.8
        
        final_confidence = max(0.3, min(0.95, base_confidence))
        
        # Confidence range in days (±)
        confidence_range_days = final_variance * 2  # Approximate 95% confidence interval

        return {
            'cycle_length': int(round(final_cycle_length)),
            'confidence': float(final_confidence),
            'confidence_range_days': float(confidence_range_days),
            'method': f"hybrid_{method}",
        }
