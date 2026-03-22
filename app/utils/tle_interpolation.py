from datetime import datetime, timedelta, timezone
from sgp4.api import Satrec

from utils.get_tle_from_id import get_position
from utils.helpers import is_sgp4_safe

""" Assumes TLE is structures as a single record in the database containing:
{"line1": "xxx", "line2": "xxx"}
"""
def calculate_trajectory_positions(tle):
    satrec = Satrec.twoline2rv(tle["line1"], tle["line2"])
    MEAN_MOTION = float(tle['line2'][52:63])
    ORBITAL_PERIOD = 86400 / MEAN_MOTION

    REFERENCE_TIME = datetime.now(timezone.utc)
    PROPAGATION_DURATION_SECONDS = int(ORBITAL_PERIOD)
    STEP_SECONDS = 1

    if is_sgp4_safe(MEAN_MOTION, float('0.'+ tle['line2'][26:33])):
        PROPAGATION_DURATION_SECONDS = int(ORBITAL_PERIOD)
    else:
        PROPAGATION_DURATION_SECONDS = 1000

    #formatted as time (JulianDate), x, y, z
    positions = []

    #varies dt (deltatime) and calculates the position at each offset of REFERENCE_TIME
    for dt_seconds in range(-PROPAGATION_DURATION_SECONDS // 2 , PROPAGATION_DURATION_SECONDS // 2 , STEP_SECONDS):
        #converts dt_seconds -> dt (deltatime)
        dt = timedelta(seconds=dt_seconds)
        time_jd, x, y, z = get_position(satrec, REFERENCE_TIME, dt)
        positions.append({"time": time_jd, "x": x, "y": y, "z": z})

    return {"positions": positions, "PROPAGATION_DURATION_SECONDS": PROPAGATION_DURATION_SECONDS}