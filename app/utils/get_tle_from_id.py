import requests
import pandas
from pandas.errors import DatabaseError
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import create_engine

#TODO make separate utils folder for functions like these
from .helpers import gmst_from_jd
from .get_all_tles import DB_COLUMNS


db = create_engine("sqlite:///tles.db")

def get_tle_from_header(id):
    tle = pandas.read_sql(f"SELECT * from tles WHERE header = ?", db, params=(id,))
    return tle[DB_COLUMNS].to_dict(orient="records")

def get_tle_from_norad(norad):
    tle = pandas.read_sql(f"SELECT * from tles WHERE norad = ?", db, params=(norad,))
    return tle[DB_COLUMNS].to_dict(orient="records")

def get_Position(id, time):
    """returns Cartesian3 position, time in JulianDate
"""

    return None