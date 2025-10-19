import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_employee_data(num_employees=50, num_days=30):
    """Generate demo employee data matching notebook structure"""
    
    np.random.seed(42)
    
    # Employee master data
    employees = []
    departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Operations']
    
    for i in range(num_employees):
        employees.append({
            'employee_id': f'EMP{i:03d}',
            'name': f'Employee_{i}',
            'department': np.random.choice(departments),
            'role': np.random.choice(['Junior', 'Mid', 'Senior', 'Lead']),
            'tenure_years': np.round(np.random.uniform(0.5, 8), 1),
            'skill_level': np.round(np.random.uniform(0.6, 1.0), 2)
        })
    
    employees_df = pd.DataFrame(employees)
    
    # Generate daily metrics
    daily_data = []
    start_date = datetime.now() - timedelta(days=num_days)
    
    for emp in employees:
        for day in range(num_days):
            date = start_date + timedelta(days=day)
            if date.weekday() < 5:  # Weekdays only
                base_workload = np.random.normal(6, 2)
                meetings = int(np.random.poisson(5))
                sleep = max(4, min(10, np.random.normal(7, 1)))
                stress = min(1, max(0, np.random.beta(2, 5)))
                
                daily_data.append({
                    'employee_id': emp['employee_id'],
                    'date': date.date(),
                    'total_active_hours': np.round(max(4, min(14, base_workload)), 2),
                    'num_meetings': meetings,
                    'focus_hours': np.round(max(1, base_workload - meetings * 0.5), 2),
                    'sleep_hours': np.round(sleep, 1),
                    'stress_score': np.round(stress, 2),
                    'steps': int(np.random.normal(7000, 2000)),
                    'after_hours_work': np.round(max(0, base_workload - 8), 1)
                })
    
    daily_df = pd.DataFrame(daily_data)
    features_df = daily_df.merge(employees_df, on='employee_id')
    
    return engineer_features(features_df)

def engineer_features(df):
    """Create ML-ready features"""
    
    # Workload index
    df['workload_index'] = np.round((df['total_active_hours'] * 0.4 + 
                                     df['num_meetings'] * 0.3 + 
                                     df['after_hours_work'] * 0.3), 2)
    
    # Wellness index
    df['wellness_index'] = np.round((np.where(df['sleep_hours'] >= 7, 1.0, 
                                              df['sleep_hours'] / 7) * 0.5 +
                                    (1 - df['stress_score']) * 0.5), 2)
    
    # Meeting burden
    df['meeting_burden'] = np.round(np.where(df['total_active_hours'] > 0,
                                            df['num_meetings'] * 0.5 / df['total_active_hours'], 
                                            0), 2)
    
    # Rolling 7-day averages
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values(by=['employee_id', 'date'])
    
    window_7d = df.groupby('employee_id')['workload_index'].rolling(window=7, min_periods=1).mean()
    df['avg_workload_7d'] = np.round(window_7d.reset_index(level=0, drop=True), 2)
    
    window_7d = df.groupby('employee_id')['wellness_index'].rolling(window=7, min_periods=1).mean()
    df['avg_wellness_7d'] = np.round(window_7d.reset_index(level=0, drop=True), 2)
    
    window_7d = df.groupby('employee_id')['sleep_hours'].rolling(window=7, min_periods=1).std()
    df['sleep_variance_7d'] = np.round(window_7d.reset_index(level=0, drop=True).fillna(0), 2)
    
    # Burnout Risk Index
    df['burnout_risk_index'] = np.round(np.select(
        [
            (df['workload_index'] > 8) & (df['wellness_index'] < 0.5),
            (df['workload_index'] > 7) & (df['wellness_index'] < 0.6),
            df['avg_workload_7d'] > 7
        ],
        [0.9, 0.75, 0.65],
        default=(df['workload_index'] / 10 * 0.4) + ((1 - df['wellness_index']) * 0.6)
    ), 2)
    
    # Burnout category
    df['burnout_category'] = np.select(
        [df['burnout_risk_index'] >= 0.7, df['burnout_risk_index'] >= 0.5],
        ['High', 'Medium'],
        default='Low'
    )
    
    # Productivity index
    df['productivity_index'] = np.round(
        (np.where(df['total_active_hours'] > 0, 
                 df['focus_hours'] / df['total_active_hours'], 0) * 0.5) +
        (df['skill_level'] * 0.3) +
        ((1 - df['meeting_burden']) * 0.2), 2
    )
    
    return df

