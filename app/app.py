from flask import Flask, jsonify
from utils.get_all_tles import get_all_tles

app = Flask(__name__)

@app.route("/api/all_tles")
def index():
    data, status_code = get_all_tles()
    return jsonify(data), status_code

if __name__ == "__main__":
    app.run(debug=True)