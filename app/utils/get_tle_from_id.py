import requests
import pandas
from pandas.errors import DatabaseError
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import create_engine

#TODO make separate utils folder for functions like these
from snapshot_server import gmst_from_jd


db = create_engine("sqlite:///tles.db")

def get_tle_from_id(id):
    print("Returning cached data")

    tle = pandas.read_sql(f"SELECT * from tles WHERE header='{id}'", db)
    return tle


def get_Position(id, time):
    """returns Cartesian3 position, time in JulianDate
"""

    return None


print(get_tle_from_id("CALSPHERE 2             "))