from flask import Flask
import requests
import pandas
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import create_engine

ALL_TLES_ENDPOINT = f"https://celestrak.org/NORAD/elements/gp.php?GROUP=ACTIVE&FORMAT=tle"
ALL_TLES_UPDATE_RATE = timedelta(hours=2)
DB_COLUMNS = ["header", "line1", "line2"]

app = Flask(__name__)
db = create_engine("sqlite:///tles.db")

def get_all_tles():
    if get_database_age() <= ALL_TLES_UPDATE_RATE:
        print("Returning cached data")

        tle_df = pandas.read_sql("SELECT * from tles", db)
        return tle_df[DB_COLUMNS].to_numpy().tolist()
    
    print("Requesting fresh data from", ALL_TLES_ENDPOINT)
    response = requests.get(ALL_TLES_ENDPOINT)

    if response.status_code == 200:
        data = response.text.splitlines()
        data = np.array(data)

        chunked = data.reshape(-1, 3).tolist()

        write_tles_to_db(chunked)

        return chunked
    else:
        return {"error": "Failed to retrieve TLE data"}

def write_tles_to_db(chunked):
    """Replaces all rows of the `tles` table of the database with the provided array of TLEs, and updates the `metadata` table.

    Args:
        chunked (list[list[str]]): An array of TLE records, where a record is [header, line1, line2]
    """

    df = pandas.DataFrame(chunked, columns=DB_COLUMNS)

    metadata = pandas.DataFrame([{
        "key": "all_tles_last_updated",
        "value": datetime.now().isoformat()
    }])

    # Rolls back if an exception occurs, ensures overlapping writes don't screw with it (shouldn't happen anyway, but whatever)
    with db.begin() as conn:
        df.to_sql("tles", con=conn, if_exists="replace", index=False)
        metadata.to_sql("metadata", con=conn, if_exists="replace", index=False)

def get_database_age():
    df = pandas.read_sql(
        "SELECT value FROM metadata WHERE key='all_tles_last_updated'", 
        db
    )

    if df.empty:
        return False

    last_updated = datetime.fromisoformat(df["value"].iloc[0])
    return datetime.now() - last_updated

@app.route("/api/all_tles")
def index():
    return get_all_tles()

if __name__ == "__main__":
    app.run(debug=True)