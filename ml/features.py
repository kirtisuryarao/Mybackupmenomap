"""
Feature Engineering for Cycle Prediction

Transforms raw cycle history into features suitable for ML models.

Input: List of cycle records (start_date, length, period_length, temperatures)
Output: Feature matrix for model training/prediction

Features:
- cycle_length_history: Last N cycle lengths
- cycle_length_mean: Mean of recent cycles
- cycle_length_std: Standard deviation (variation)
- cycle_length_trend: Slope of recent cycle lengths (increasing/decreasing)
- period_length_mean: Average period duration
- temperature_mean: Average basal body temperature
- temperature_shift: Pre/post ovulation temperature shift
- cycle_regularity_score: 0-1 score of how regular cycles are
"""

import numpy as np
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass
class CycleRecord:
    """Single cycle record from the database."""
    start_date: datetime
    end_date: Optional[datetime]
    length: Optional[int]
    period_length: Optional[int]
    temperatures: Optional[List[float]] = None


@dataclass
class CycleFeatures:
    """Engineered features for a single user's prediction."""
    cycle_lengths: List[int]          # Raw cycle length history
    cycle_length_mean: float          # Average cycle length
    cycle_length_std: float           # Standard deviation
    cycle_length_trend: float         # Trend slope
    period_length_mean: float         # Average period duration
    temperature_mean: Optional[float] # Average BBT
    temperature_shift: Optional[float]# BBT shift around ovulation
    regularity_score: float           # 0-1 regularity score
    num_cycles: int                   # Number of cycles tracked

    def to_array(self) -> np.ndarray:
        """Convert features to numpy array for model input."""
        return np.array([
            self.cycle_length_mean,
            self.cycle_length_std,
            self.cycle_length_trend,
            self.period_length_mean,
            self.temperature_mean or 36.5,  # Default if no temp data
            self.temperature_shift or 0.3,  # Default shift
            self.regularity_score,
            self.num_cycles,
        ]).reshape(1, -1)

    def feature_names(self) -> List[str]:
        """Feature names for model interpretability."""
        return [
            'cycle_length_mean',
            'cycle_length_std',
            'cycle_length_trend',
            'period_length_mean',
            'temperature_mean',
            'temperature_shift',
            'regularity_score',
            'num_cycles',
        ]


def extract_features(
    cycles: List[CycleRecord],
    max_cycles: int = 12,
) -> CycleFeatures:
    """
    Extract ML features from a user's cycle history.

    Args:
        cycles: List of CycleRecord objects, ordered by start_date ascending
        max_cycles: Maximum number of recent cycles to consider

    Returns:
        CycleFeatures object with engineered features
    """
    # Filter valid cycles and take most recent
    valid_cycles = [c for c in cycles if c.length and c.length > 0 and c.length <= 60]
    recent = valid_cycles[-max_cycles:] if len(valid_cycles) > max_cycles else valid_cycles

    if not recent:
        # Return defaults if no data
        return CycleFeatures(
            cycle_lengths=[28],
            cycle_length_mean=28.0,
            cycle_length_std=0.0,
            cycle_length_trend=0.0,
            period_length_mean=5.0,
            temperature_mean=None,
            temperature_shift=None,
            regularity_score=0.5,
            num_cycles=0,
        )

    lengths = [c.length for c in recent]

    # Cycle length statistics
    mean_length = np.mean(lengths)
    std_length = np.std(lengths, ddof=1) if len(lengths) > 1 else 0.0

    # Trend: linear regression slope on cycle lengths
    if len(lengths) > 2:
        x = np.arange(len(lengths))
        slope = np.polyfit(x, lengths, 1)[0]
    else:
        slope = 0.0

    # Period length
    period_lengths = [c.period_length for c in recent if c.period_length]
    mean_period = np.mean(period_lengths) if period_lengths else 5.0

    # Temperature features
    all_temps = []
    for c in recent:
        if c.temperatures:
            all_temps.extend(c.temperatures)

    temp_mean = np.mean(all_temps) if all_temps else None

    # Temperature shift (simplified: difference between first and second half)
    temp_shift = None
    if all_temps and len(all_temps) > 10:
        mid = len(all_temps) // 2
        first_half = np.mean(all_temps[:mid])
        second_half = np.mean(all_temps[mid:])
        temp_shift = second_half - first_half

    # Regularity score: lower std = more regular
    # Score of 1.0 for std=0, drops toward 0 for high variation
    regularity = max(0.0, 1.0 - (std_length / 10.0))

    return CycleFeatures(
        cycle_lengths=lengths,
        cycle_length_mean=float(mean_length),
        cycle_length_std=float(std_length),
        cycle_length_trend=float(slope),
        period_length_mean=float(mean_period),
        temperature_mean=float(temp_mean) if temp_mean else None,
        temperature_shift=float(temp_shift) if temp_shift else None,
        regularity_score=float(regularity),
        num_cycles=len(recent),
    )


def prepare_training_data(
    users_cycles: Dict[str, List[CycleRecord]],
) -> tuple:
    """
    Prepare training data from multiple users' cycle histories.

    For each user, uses all but the last cycle as features,
    and the last cycle's length as the target.

    Args:
        users_cycles: Dict mapping user_id to list of CycleRecords

    Returns:
        (X, y) tuple of feature matrix and target array
    """
    X_list = []
    y_list = []

    for user_id, cycles in users_cycles.items():
        valid = [c for c in cycles if c.length and c.length > 0]

        if len(valid) < 3:
            continue  # Need at least 3 cycles (2 for features, 1 for target)

        # Use all but last cycle for features, last cycle length as target
        feature_cycles = valid[:-1]
        target_length = valid[-1].length

        features = extract_features(feature_cycles)
        X_list.append(features.to_array().flatten())
        y_list.append(target_length)

    if not X_list:
        return np.array([]), np.array([])

    return np.array(X_list), np.array(y_list)
