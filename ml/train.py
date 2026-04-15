"""
Training script for the MenoMap cycle predictor.

This script:
1. Loads cycle data from the database (or CSV)
2. Extracts features
3. Trains a Random Forest model
4. Saves the trained model

Usage:
    python -m ml.train --data cycles.csv
    python -m ml.train --db postgresql://...

For initial testing, generates synthetic data if no real data available.
"""

import argparse
import sys
import os
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List

from .features import CycleRecord
from .predictor import CyclePredictor


def generate_synthetic_data(
    n_users: int = 50,
    cycles_per_user: int = 8,
    seed: int = 42,
) -> Dict[str, List[CycleRecord]]:
    """
    Generate synthetic cycle data for model training/testing.
    
    Creates realistic-looking cycle data with:
    - Normal cycles (25-35 days)
    - Slight variation per user
    - Occasional irregular cycles
    
    Args:
        n_users: Number of synthetic users
        cycles_per_user: Number of cycles per user
        seed: Random seed for reproducibility
    
    Returns:
        Dict mapping user_id to list of CycleRecords
    """
    np.random.seed(seed)
    data = {}

    for i in range(n_users):
        user_id = f"synthetic_user_{i}"
        
        # Each user has a baseline cycle length (normally distributed around 28)
        base_length = np.random.normal(28, 3)
        base_length = max(21, min(40, base_length))
        
        # User-specific variation
        user_std = np.random.uniform(1, 4)
        
        cycles = []
        current_date = datetime(2024, 1, 1) + timedelta(days=np.random.randint(0, 60))

        for j in range(cycles_per_user):
            # Cycle length with user-specific variation
            length = int(round(np.random.normal(base_length, user_std)))
            length = max(21, min(50, length))

            # Period length (3-7 days)
            period_length = int(round(np.random.normal(5, 1)))
            period_length = max(3, min(7, period_length))

            end_date = current_date + timedelta(days=length - 1)

            cycles.append(CycleRecord(
                start_date=current_date,
                end_date=end_date,
                length=length,
                period_length=period_length,
            ))

            current_date = current_date + timedelta(days=length)

        data[user_id] = cycles

    return data


def load_data_from_csv(filepath: str) -> Dict[str, List[CycleRecord]]:
    """
    Load cycle data from a CSV file.
    
    Expected CSV format:
    user_id,start_date,end_date,length,period_length
    """
    import pandas as pd
    
    df = pd.read_csv(filepath)
    data = {}
    
    for user_id, group in df.groupby('user_id'):
        cycles = []
        for _, row in group.iterrows():
            cycles.append(CycleRecord(
                start_date=datetime.strptime(row['start_date'], '%Y-%m-%d'),
                end_date=datetime.strptime(row['end_date'], '%Y-%m-%d') if pd.notna(row.get('end_date')) else None,
                length=int(row['length']) if pd.notna(row.get('length')) else None,
                period_length=int(row['period_length']) if pd.notna(row.get('period_length')) else None,
            ))
        data[str(user_id)] = sorted(cycles, key=lambda c: c.start_date)
    
    return data


def main():
    parser = argparse.ArgumentParser(description='Train MenoMap cycle predictor')
    parser.add_argument('--data', type=str, help='Path to CSV data file')
    parser.add_argument('--synthetic', action='store_true', help='Use synthetic data for training')
    parser.add_argument('--n-users', type=int, default=50, help='Number of synthetic users')
    parser.add_argument('--n-estimators', type=int, default=100, help='Number of trees in Random Forest')
    parser.add_argument('--max-depth', type=int, default=10, help='Max tree depth')
    parser.add_argument('--output', type=str, default=None, help='Output model path')
    
    args = parser.parse_args()

    # Load data
    if args.data:
        print(f"Loading data from {args.data}...")
        data = load_data_from_csv(args.data)
    else:
        print(f"Generating synthetic training data ({args.n_users} users)...")
        data = generate_synthetic_data(n_users=args.n_users)

    print(f"Loaded data for {len(data)} users")
    total_cycles = sum(len(v) for v in data.values())
    print(f"Total cycles: {total_cycles}")

    # Train model
    predictor = CyclePredictor(model_path=args.output)
    
    print("\nTraining Random Forest model...")
    metrics = predictor.train(
        data,
        n_estimators=args.n_estimators,
        max_depth=args.max_depth,
    )

    print(f"\nTraining Results:")
    print(f"  Training Score (R²): {metrics['training_score']:.4f}")
    print(f"  Cross-Val Score (R²): {metrics['cv_score']:.4f}")
    print(f"  Training Samples: {metrics['n_samples']}")

    print(f"\nFeature Importance:")
    for name, importance in sorted(
        metrics['feature_importance'].items(),
        key=lambda x: x[1],
        reverse=True,
    ):
        bar = '█' * int(importance * 50)
        print(f"  {name:25s} {importance:.4f} {bar}")

    # Test prediction
    print("\nTest Prediction (first user):")
    first_user = list(data.values())[0]
    result = predictor.predict(first_user)
    
    print(f"  Predicted Cycle Length: {result['predicted_cycle_length']} days")
    print(f"  Predicted Period Date: {result['predicted_period_date'].strftime('%Y-%m-%d')}")
    print(f"  Ovulation Date: {result['ovulation_date'].strftime('%Y-%m-%d')}")
    print(f"  Fertile Window: {result['fertile_window_start'].strftime('%Y-%m-%d')} to {result['fertile_window_end'].strftime('%Y-%m-%d')}")
    print(f"  Confidence: {result['confidence']:.0%}")
    print(f"  Method: {result['method']}")

    model_path = args.output or predictor.model_path
    print(f"\nModel saved to: {model_path}")


if __name__ == '__main__':
    main()
