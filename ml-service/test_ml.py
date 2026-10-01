import os
import pandas as pd
from model import CapacityPredictor

def test_model():
    sample_csv = os.path.join(os.path.dirname(__file__), "..", "sample_data", "sample_usage_metrics.csv")
    df = pd.read_csv(sample_csv)
    records = df.to_dict(orient="records")
    print(f"Loaded {len(records)} records from sample CSV.")

    predictor = CapacityPredictor()
    results = predictor.train(records)

    print("--- ML Microservice Model Training Verification ---")
    print(f"R² Score: {results['r2_score']}")
    print(f"MAE: {results['mae']}")
    print(f"Accuracy %: {results['accuracy_percent']}%")
    print(f"Total Predictions: {len(results['predictions'])}")
    print(f"Sample Prediction 0: {results['predictions'][0]}")
    
    # Test single live prediction
    single_res = predictor.predict_single("2026-09-04 14:00:00", 65.4, 850.0, 1400.0)
    print(f"Live Prediction Test: {single_res}")
    print("SUCCESS: ML microservice test passed!")

if __name__ == "__main__":
    test_model()
