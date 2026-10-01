from flask import Flask, request, jsonify
from flask_cors import CORS
from model import CapacityPredictor
import logging
import os

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

predictor = CapacityPredictor()

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "ML Cloud Capacity Predictor",
        "model_loaded": predictor.is_trained
    }), 200

@app.route("/train-and-predict", methods=["POST"])
def train_and_predict():
    """
    Receives array of historical usage records from Node backend.
    Trains RandomForestRegressor, computes R2/MAE accuracy, and returns predictions.
    """
    data = request.get_json()
    if not data or "records" not in data:
        return jsonify({"error": "Missing 'records' array in payload"}), 400

    records = data["records"]
    if len(records) < 5:
        return jsonify({"error": "At least 5 records required to train model"}), 400

    try:
        logger.info(f"Received {len(records)} records for training RandomForestRegressor...")
        results = predictor.train(records)
        logger.info(f"Model trained successfully! R2 Score: {results['r2_score']}, MAE: {results['mae']}")
        return jsonify({
            "success": True,
            "metrics": {
                "r2_score": results["r2_score"],
                "mae": results["mae"],
                "accuracy_percent": results["accuracy_percent"],
                "train_samples": results["train_samples"],
                "test_samples": results["test_samples"]
            },
            "predictions": results["predictions"]
        }), 200
    except Exception as e:
        logger.error(f"Error during model training: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route("/predict-live", methods=["POST"])
def predict_live():
    """
    Real-time inference for a single metric data point (e.g. from CloudWatch).
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Empty payload"}), 400

    timestamp = data.get("timestamp")
    cpu_percent = data.get("cpu_percent", 0.0)
    network_in = data.get("network_in", 0.0)
    network_out = data.get("network_out", 0.0)

    try:
        prediction = predictor.predict_single(timestamp, cpu_percent, network_in, network_out)
        return jsonify({
            "success": True,
            "prediction": prediction
        }), 200
    except Exception as e:
        logger.error(f"Error during live prediction: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    logger.info(f"Starting ML Microservice on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
