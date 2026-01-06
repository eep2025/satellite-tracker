from flask import Flask
import requests
from datetime import datetime, timedelta

app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello World!"

@app.route("/api/all_tles")
def index():
    return get_all_tles()

ALL_TLES_ENDPOINT = "https://celestrak.org/NORAD/elements/gp.php?GROUP=ACTIVE&FORMAT=tle"
ALL_TLES_UPDATE_RATE = timedelta(hours=2)
all_tle_cache = {
    "lastUpdated": None,
    "data": {}
}

def get_all_tles():
    if False and all_tle_cache["lastUpdated"] is not None and datetime.now() - all_tle_cache["lastUpdated"] <= ALL_TLES_UPDATE_RATE:
        print("Returning cached data")
        return all_tle_cache["data"]
    
    print("Requesting fresh data from", ALL_TLES_ENDPOINT)
    response = requests.get(ALL_TLES_ENDPOINT)
    if response.status_code == 200:
        data = response.text

        all_tle_cache["data"] = data
        all_tle_cache["lastUpdated"] = datetime.now()
        print("Returning data")
        return data
    else:
        return {"error": "Failed to retrieve TLE data"}

if __name__ == "__main__":
    app.run(debug=True)