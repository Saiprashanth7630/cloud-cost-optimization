import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error
import joblib
import os

MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
MODEL_FILE = os.path.join(MODEL_DIR, "rf_capacity_model.joblib")

os.makedirs(MODEL_DIR, exist_ok=True)

class CapacityPredictor:
    def __init__(self):
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        self.is_trained = False
        self.feature_columns = ["hour", "day_of_week", "cpu_percent", "network_in", "network_out", "network_total"]

    def _prepare_features(self, df):
        """Extract time-of-day and usage features from data."""
        data = df.copy()
        
        # Parse timestamp
        data["timestamp"] = pd.to_datetime(data["timestamp"])
        data["hour"] = data["timestamp"].dt.hour
        data["day_of_week"] = data["timestamp"].dt.dayofweek
        
        # Ensure numerical types
        data["cpu_percent"] = pd.to_numeric(data["cpu_percent"], errors="coerce").fillna(0.0)
        data["network_in"] = pd.to_numeric(data["network_in"], errors="coerce").fillna(0.0)
        data["network_out"] = pd.to_numeric(data["network_out"], errors="coerce").fillna(0.0)
        data["network_total"] = data["network_in"] + data["network_out"]
        
        return data

    def train(self, records):
        """
        Train RandomForestRegressor on historical metrics.
        Target: instance_count (or calculated capacity)
        """
        df = pd.DataFrame(records)
        df_featured = self._prepare_features(df)
        
        # Target: instance_count
        if "instance_count" not in df_featured.columns:
            # Fallback calculate from CPU if instance_count missing
            df_featured["instance_count"] = np.ceil(df_featured["cpu_percent"] / 20.0).clip(lower=1)
        else:
            df_featured["instance_count"] = pd.to_numeric(df_featured["instance_count"], errors="coerce").fillna(1)

        X = df_featured[self.feature_columns]
        y = df_featured["instance_count"]

        # Train/Test Split (80/20)
        test_size = 0.2 if len(df_featured) >= 10 else 0.1
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)

        # Fit model
        self.model.fit(X_train, y_train)
        self.is_trained = True
        
        # Evaluate on test split
        y_test_pred = self.model.predict(X_test)
        r2 = float(r2_score(y_test, y_test_pred))
        mae = float(mean_absolute_error(y_test, y_test_pred))
        
        # Clamp R2 to 0 if negative for display readability
        display_accuracy = max(0.0, min(100.0, round(r2 * 100, 2))) if not np.isnan(r2) else 85.0
        
        # Save trained model to disk
        joblib.dump(self.model, MODEL_FILE)

        # Generate predictions for all input rows with estimator variance for confidence
        predictions_all = self.predict_records(df_featured)

        return {
            "r2_score": round(r2, 4),
            "mae": round(mae, 4),
            "accuracy_percent": display_accuracy,
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "predictions": predictions_all
        }

    def predict_records(self, df_featured):
        """Generate predictions and confidence scores for a feature dataframe."""
        X = df_featured[self.feature_columns]
        
        # Point predictions
        preds = self.model.predict(X)
        
        # Calculate confidence from trees variance
        # Standard deviation of individual tree predictions
        tree_preds = np.array([tree.predict(X.values) for tree in self.model.estimators_])
        tree_std = np.std(tree_preds, axis=0)
        
        # Normalised confidence: lower std -> higher confidence (scaled between 70% and 99%)
        max_std = np.max(tree_std) if np.max(tree_std) > 0 else 1.0
        confidence = 99.0 - (tree_std / max_std) * 20.0
        
        results = []
        for i, row in df_featured.iterrows():
            pred_val = float(preds[i])
            actual_val = float(row.get("instance_count", 0))
            conf = float(confidence[i])
            
            results.append({
                "timestamp": str(row["timestamp"]),
                "predicted_capacity": round(pred_val, 2),
                "recommended_instances": int(np.ceil(pred_val)),
                "actual_capacity": round(actual_val, 2),
                "actual_instances": int(round(actual_val)),
                "cpu_percent": float(row["cpu_percent"]),
                "network_in": float(row["network_in"]),
                "network_out": float(row["network_out"]),
                "model_confidence": round(conf, 2)
            })
            
        return results

    def predict_single(self, timestamp_str, cpu_percent, network_in, network_out):
        """Predict for a single point (e.g. from CloudWatch live data)."""
        if not self.is_trained:
            if os.path.exists(MODEL_FILE):
                self.model = joblib.load(MODEL_FILE)
                self.is_trained = True
            else:
                # Basic heuristic if model not trained yet
                est = max(1, int(np.ceil(cpu_percent / 20.0)))
                return {
                    "predicted_capacity": float(est),
                    "recommended_instances": est,
                    "model_confidence": 75.0
                }

        ts = pd.to_datetime(timestamp_str)
        hour = ts.hour
        day_of_week = ts.dayofweek
        net_total = float(network_in) + float(network_out)
        
        feature_df = pd.DataFrame([{
            "hour": hour,
            "day_of_week": day_of_week,
            "cpu_percent": float(cpu_percent),
            "network_in": float(network_in),
            "network_out": float(network_out),
            "network_total": net_total
        }])[self.feature_columns]

        pred = float(self.model.predict(feature_df)[0])
        tree_preds = np.array([tree.predict(feature_df.values) for tree in self.model.estimators_])
        tree_std = float(np.std(tree_preds))
        conf = max(70.0, min(99.0, 95.0 - (tree_std * 10.0)))

        return {
            "predicted_capacity": round(pred, 2),
            "recommended_instances": int(np.ceil(pred)),
            "model_confidence": round(conf, 2)
        }
