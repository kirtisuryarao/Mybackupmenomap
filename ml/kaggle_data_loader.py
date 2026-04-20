"""
Kaggle Data Loader for Menstrual Cycle Statistics

Loads and analyzes Kaggle menstrual cycle datasets to extract:
- Average cycle length
- Standard deviation (variation)
- Irregular patterns
- Population-level statistics

This provides general patterns that complement user-specific data.
"""

import pandas as pd
import numpy as np
from typing import Dict, Optional
from pathlib import Path
import os


class KaggleDataLoader:
    """
    Loads and analyzes Kaggle menstrual cycle datasets.

    Provides population-level statistics to enhance predictions
    without overriding user-specific data.
    """

    def __init__(self, data_path: Optional[str] = None):
        """
        Initialize with path to Kaggle dataset.

        Args:
            data_path: Path to CSV file. If None, uses synthetic data.
        """
        self.data_path = data_path or os.path.join(
            os.path.dirname(__file__), 'kaggle_menstrual_data.csv'
        )
        self.data = None
        self.stats = {}

    def load_data(self) -> pd.DataFrame:
        """
        Load menstrual cycle data from CSV or generate synthetic data.

        Returns:
            DataFrame with cycle data
        """
        if os.path.exists(self.data_path):
            # Load real Kaggle data
            self.data = pd.read_csv(self.data_path)
            print(f"Loaded {len(self.data)} records from {self.data_path}")
        else:
            # Generate synthetic population data based on real statistics
            self.data = self._generate_synthetic_kaggle_data()
            print(f"Generated synthetic Kaggle data with {len(self.data)} records")

        return self.data

    def _generate_synthetic_kaggle_data(self) -> pd.DataFrame:
        """
        Generate synthetic menstrual cycle data based on population studies.

        Based on research showing:
        - Average cycle length: 28-29 days
        - Standard deviation: 2-7 days
        - Age affects regularity
        - Some cycles are irregular

        Returns:
            DataFrame with synthetic cycle data
        """
        np.random.seed(42)  # For reproducibility

        n_women = 1000
        cycles_per_woman = 12  # One year of data

        records = []

        for woman_id in range(n_women):
            # Each woman has a baseline cycle length
            base_cycle = np.random.normal(28.5, 2.5)  # Population average ~28.5 days
            base_cycle = max(21, min(45, base_cycle))

            # Age factor (younger women tend to have more regular cycles)
            age = np.random.randint(18, 45)
            regularity_factor = 1.0 - (age - 25) * 0.01  # Slight age effect
            regularity_factor = max(0.7, min(1.0, regularity_factor))

            # Individual variation
            woman_std = np.random.uniform(1.5, 4.0) * regularity_factor

            current_date = pd.Timestamp('2020-01-01')

            for cycle_num in range(cycles_per_woman):
                # Cycle length with variation
                cycle_length = int(round(np.random.normal(base_cycle, woman_std)))
                cycle_length = max(21, min(60, cycle_length))  # Realistic bounds

                # Period length (typically 3-7 days)
                period_length = int(round(np.random.normal(5.0, 1.2)))
                period_length = max(2, min(10, period_length))

                records.append({
                    'woman_id': woman_id,
                    'age': age,
                    'cycle_number': cycle_num + 1,
                    'start_date': current_date,
                    'cycle_length': cycle_length,
                    'period_length': period_length,
                    'regularity_score': regularity_factor,
                })

                # Move to next cycle
                current_date += pd.Timedelta(days=cycle_length)

        return pd.DataFrame(records)

    def compute_population_stats(self) -> Dict:
        """
        Compute population-level statistics from the data.

        Returns:
            Dict with statistics:
            - avg_cycle_length: float
            - cycle_std: float
            - irregularity_rate: float
            - age_groups: Dict with stats by age
        """
        if self.data is None:
            self.load_data()

        df = self.data

        # Overall statistics
        avg_cycle = df['cycle_length'].mean()
        cycle_std = df['cycle_length'].std()
        cycle_cv = cycle_std / avg_cycle  # Coefficient of variation

        # Irregularity: cycles with length > 35 or < 21, or std > 7
        woman_stats = df.groupby('woman_id')['cycle_length'].agg(['mean', 'std', 'count']).reset_index()
        woman_stats['is_irregular'] = (
            (woman_stats['std'] > 7) |
            (woman_stats['mean'] > 35) |
            (woman_stats['mean'] < 21)
        )
        irregularity_rate = woman_stats['is_irregular'].mean()

        # Age group analysis
        age_groups = {}
        for age_range in [(18, 25), (26, 35), (36, 45)]:
            age_data = df[(df['age'] >= age_range[0]) & (df['age'] <= age_range[1])]
            if len(age_data) > 0:
                age_groups[f"{age_range[0]}-{age_range[1]}"] = {
                    'avg_cycle': age_data['cycle_length'].mean(),
                    'std': age_data['cycle_length'].std(),
                    'count': len(age_data),
                }

        self.stats = {
            'avg_cycle_length': float(avg_cycle),
            'cycle_std': float(cycle_std),
            'cycle_cv': float(cycle_cv),
            'irregularity_rate': float(irregularity_rate),
            'total_women': len(df['woman_id'].unique()),
            'total_cycles': len(df),
            'age_groups': age_groups,
        }

        return self.stats

    def get_cycle_length_distribution(self) -> Dict:
        """
        Get cycle length distribution for confidence calculations.

        Returns:
            Dict with percentiles and distribution info
        """
        if self.data is None:
            self.load_data()

        lengths = self.data['cycle_length'].values

        return {
            'percentiles': {
                '5th': float(np.percentile(lengths, 5)),
                '25th': float(np.percentile(lengths, 25)),
                '50th': float(np.percentile(lengths, 50)),
                '75th': float(np.percentile(lengths, 75)),
                '95th': float(np.percentile(lengths, 95)),
            },
            'mean': float(np.mean(lengths)),
            'std': float(np.std(lengths)),
            'min': int(np.min(lengths)),
            'max': int(np.max(lengths)),
        }

    def get_confidence_ranges(self, predicted_length: float) -> Dict:
        """
        Get confidence ranges based on population data.

        Args:
            predicted_length: Predicted cycle length

        Returns:
            Dict with confidence intervals
        """
        if not self.stats:
            self.compute_population_stats()

        population_std = self.stats['cycle_std']

        # Conservative confidence ranges based on population variation
        ranges = {}
        for confidence in [0.68, 0.95, 0.99]:  # 1-sigma, 2-sigma, 3-sigma
            z_score = {0.68: 1, 0.95: 2, 0.99: 3}[confidence]
            margin = z_score * population_std

            ranges[f'{int(confidence*100)}%'] = {
                'lower': max(21, predicted_length - margin),
                'upper': min(60, predicted_length + margin),
                'range_days': margin * 2,
            }

        return ranges


# Global instance for easy access
kaggle_loader = KaggleDataLoader()