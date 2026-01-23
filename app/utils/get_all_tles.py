from flask import Flask
import requests
import pandas
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import create_engine

# All related to 25544: https://celestrak.org/NORAD/elements/gp.php?INTDES=1998-067&FORMAT=json
# 25544 only: https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle

ALL_TLES_ENDPOINT = f"https://celestrak.org/NORAD/elements/gp.php?GROUP=ACTIVE&FORMAT=tle"
ALL_TLES_UPDATE_RATE = timedelta(hours=2)

app = Flask(__name__)
db = create_engine("sqlite:///tles.db")
DB_COLUMNS = ["header", "line1", "line2"]

# TODO: Split into functions
def get_all_tles():
    last_updated = pandas.read_sql(
        "SELECT value FROM metadata WHERE key='all_tles_last_updated'", 
        db
    )["value"].iloc[0]

    if datetime.now() - datetime.fromisoformat(last_updated) <= ALL_TLES_UPDATE_RATE:
        print("Returning cached data")

        tle_df = pandas.read_sql("SELECT * from tles", db)
        return tle_df[DB_COLUMNS].to_numpy().tolist()
    
    print("Requesting fresh data from", ALL_TLES_ENDPOINT)
    response = requests.get(ALL_TLES_ENDPOINT)
    if response.status_code == 200:
        data = response.text.splitlines()

        data = np.array(data)
        chunked = data.reshape(-1, 3).tolist()

        rows = []
        for header, line1, line2 in chunked:
            rows.append({
                "header": header,
                "line1": line1,
                "line2": line2
            })

        df = pandas.DataFrame(rows, columns=DB_COLUMNS)
        df.to_sql(
            "tles",
            con=db,
            if_exists="replace",
            index=False
        )

        metadata = pandas.DataFrame([{
            "key": "all_tles_last_updated",
            "value": datetime.now().isoformat()
        }])
        metadata.to_sql(
            "metadata",
            con=db,
            if_exists="replace",
            index=False
        )

        return chunked

    else:
        return {"error": "Failed to retrieve TLE data"}
    
@app.route("/api/all_tles")
def index():
    return get_all_tles()

if __name__ == "__main__":
    app.run(debug=True)