import requests
import pandas
from pandas.errors import DatabaseError
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from .setup_logging import setup_and_get_logger

ALL_TLES_ENDPOINT = f"https://celestrak.org/NORAD/elements/gp.php?GROUP=ACTIVE&FORMAT=tle"
ALL_TLES_UPDATE_RATE = timedelta(hours=2)
DB_COLUMNS = ["header", "line1", "line2"]

db = create_engine("sqlite:///tles.db")
logger = setup_and_get_logger(__name__)

def get_all_tles():
    if is_database_younger_than(ALL_TLES_UPDATE_RATE):
        logger.info("Returning cached data.")

        tle_df = pandas.read_sql("SELECT * from tles", db)
        data = tle_df[DB_COLUMNS].to_numpy().tolist()
        return data, 200
    
    logger.info(f"Requesting fresh data from {ALL_TLES_ENDPOINT}")
    response = requests.get(ALL_TLES_ENDPOINT)

    if response.status_code == 200:
        data = response.text.splitlines()
        data = np.array(data)

        if len(data) % 3 != 0:
            logger.error(f"Data from Celestrak returned a list NOT divisble by 3! (line count={len(data)})")
            return {"error": "Failed to retrieve TLE data on the server-side"}, 500

        chunked_tles = data.reshape(-1, 3).tolist()

        write_tles_to_db(chunked_tles)

        return chunked_tles, 200
    else:
        logger.error(f"Error code {response.status_code} fetching from {ALL_TLES_ENDPOINT}")
        return {"error": "Failed to retrieve TLE data on the server-side"}, 500

def write_tles_to_db(chunked):
    """Replaces all rows of the `tles` table of the database with the provided array of TLEs, and updates the `metadata` table.

    Args:
        chunked (list[list[str]]): An array of TLE records, where a record is [header, line1, line2]
    """

    tle_df = pandas.DataFrame(chunked, columns=DB_COLUMNS)

    metadata_df = pandas.DataFrame([{
        "key": "all_tles_last_updated",
        "value": datetime.now().isoformat()
    }])

    # Rolls back if an exception occurs, ensures overlapping writes don't screw with it (shouldn't happen anyway, but whatever)
    with db.begin() as conn:
        tle_df.to_sql("tles", con=conn, if_exists="replace", index=False)
        metadata_df.to_sql("metadata", con=conn, if_exists="replace", index=False)

def is_database_younger_than(duration):
    try:
        last_updated_df = pandas.read_sql(
            "SELECT value FROM metadata WHERE key='all_tles_last_updated'", 
            db
        )
    except DatabaseError as err:
        if "no such table" in str(err):
            return False
        else:
            logger.exception("Database error reading 'all_tles_last_updated' from 'metadata' table")
            raise

    if last_updated_df.empty:
        return False

    last_updated = datetime.fromisoformat(last_updated_df["value"].iloc[0])
    return datetime.now() - last_updated <= duration