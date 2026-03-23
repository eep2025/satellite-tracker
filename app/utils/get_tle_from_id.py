from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sgp4.api import jday
import pandas
import numpy as np

#TODO make separate utils folder for functions like these
from .helpers import gmst_from_jd, teme_to_ecef
from .get_all_tles import DB_COLUMNS


db = create_engine("sqlite:///tles.db")

def get_tle_from_header(id):
    tle = pandas.read_sql(f"SELECT * from tles WHERE header = ?", db, params=(id,))
    return tle[DB_COLUMNS].to_dict(orient="records")

def get_tle_from_norad(norad):
    tle = pandas.read_sql(f"SELECT * from tles WHERE norad = ?", db, params=(norad,))
    return tle[DB_COLUMNS].to_dict(orient="records")

def get_current_jd(time, dt=None):
    """_summary_

    Args:
        time (_type_): _description_
        dt (_type_, optional): _description_. Defaults to None.

    Returns:
        _type_: _description_
    """

    if dt:
        time = datetime.now(timezone.utc) + dt

    return jday(time.year, time.month, time.day, time.hour, time.minute, (time.second + time.microsecond *1e-6))

def get_position(satrec,time,dt=timedelta(0)):
    """returns Cartesian3 ecef position
    inputs id as satellite name, time as datetime, dt as timedelta
"""
    jd, fr = get_current_jd(time, dt)
    gmst = gmst_from_jd(jd, fr)

    #gives pos as gmst
    status, pos, velocity = satrec.sgp4(jd, fr) #not using velocity

    if status == 0 and pos is not None:
        x_teme, y_teme, z_teme = pos
        x_ecef, y_ecef, z_ecef = teme_to_ecef(x_teme, y_teme, z_teme, gmst)

        #returns JulianDate, x, y, z
        return (jd+fr), x_ecef, y_ecef, z_ecef
    else:
        print("Error! status != 0")
        return None