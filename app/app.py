from flask import Flask, render_template, jsonify
from utils.get_all_tles import get_all_tles
from os import getenv

app = Flask(__name__)

@app.route("/")
def home():
    return render_template(
        "index.html",
        CESIUM_TOKEN = getenv("CESIUM_TOKEN")
    )

@app.route("/all_tles")
def index():
    # TODO: Look over NOT passing the logger as a parameter. I hate it. It's ugly.
    data, status_code = get_all_tles(app.logger)
    return jsonify(data), status_code

if __name__ == "__main__":
    app.run(debug=True)