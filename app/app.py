from flask import Flask, render_template, jsonify
from utils.get_all_tles import get_all_tles
from utils.setup_logging import setup_and_get_logger
from os import getenv

app = Flask(__name__)
setup_and_get_logger("main")

@app.route("/")
def home():
    return render_template(
        "index.html",
        CESIUM_TOKEN = getenv("CESIUM_TOKEN")
    )

@app.route("/all_tles")
def index():
    data, status_code = get_all_tles()
    return jsonify(data), status_code

if __name__ == "__main__":
    app.run(debug=True)