from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
import numpy as np
import pickle
import os

class BurnoutPredictor:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.label_encoder = None
        self.feature_cols = [
            'workload_index', 'wellness_index', 'meeting_burden',
            'num_meetings', 'focus_hours', 'sleep_hours', 'stress_score',
            'after_hours_work', 'avg_workload_7d', 'avg_wellness_7d',
            'sleep_variance_7d', 'tenure_years', 'skill_level'
        ]
    
    def train(self, features_df):
        """Train the burnout prediction model"""
        
        training_df = features_df.dropna(subset=['avg_workload_7d']).copy()
        
        # Encode target
        self.label_encoder = LabelEncoder()
        training_df['label'] = self.label_encoder.fit_transform(training_df['burnout_category'])
        
        # Prepare features and target
        X = training_df[self.feature_cols]
        y = training_df['label']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        
        # Train model
        self.model = RandomForestClassifier(
            n_estimators=50,
            max_depth=8,
            random_state=42
        )
        self.model.fit(X_train_scaled, y_train)
        
        return self
    
    def predict(self, features_df):
        """Predict burnout risk for employees"""
        
        if self.model is None:
            raise ValueError("Model not trained yet")
        
        X = features_df[self.feature_cols]
        X_scaled = self.scaler.transform(X)
        
        predictions = self.model.predict(X_scaled)
        predictions_proba = self.model.predict_proba(X_scaled)
        
        features_df['prediction_category'] = self.label_encoder.inverse_transform(predictions)
        
        if 'High' in self.label_encoder.classes_:
            high_class_index = list(self.label_encoder.classes_).index('High')
            features_df['prediction_proba_high'] = predictions_proba[:, high_class_index]
        else:
            features_df['prediction_proba_high'] = 0.0
        
        return features_df
    
    def save(self, filepath='model.pkl'):
        """Save model to disk"""
        with open(filepath, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'scaler': self.scaler,
                'label_encoder': self.label_encoder,
                'feature_cols': self.feature_cols
            }, f)
    
    def load(self, filepath='model.pkl'):
        """Load model from disk"""
        if os.path.exists(filepath):
            with open(filepath, 'rb') as f:
                data = pickle.load(f)
                self.model = data['model']
                self.scaler = data['scaler']
                self.label_encoder = data['label_encoder']
                self.feature_cols = data['feature_cols']
        return self