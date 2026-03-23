from datetime import datetime, timedelta, timezone
import numpy as np
from sgp4.api import Satrec
from sgp4.conveniences import dump_satrec

from utils.get_tle_from_id import get_current_jd, get_position
from utils.helpers import get_altitute, gmst_from_jd, is_sgp4_safe

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

def calculate_satellite_metadata(tle):
    satrec = Satrec.twoline2rv(tle["line1"], tle["line2"])
    
    jd, fr = get_current_jd(datetime.now(timezone.utc))
    gmst = gmst_from_jd(jd, fr)

    status, pos, velocity = satrec.sgp4(jd, fr)

    x_teme, y_teme, z_teme = pos

    #apply the rotation matrix
    sin_gmst, cos_gmst = np.sin(gmst), np.cos(gmst)
    x_ecef = x_teme * cos_gmst + y_teme * sin_gmst
    y_ecef = -x_teme * sin_gmst + y_teme * cos_gmst
    z_ecef = z_teme

    #convert km->m
    x_ecef = x_ecef * 1000.0
    y_ecef = y_ecef * 1000.0
    z_ecef = z_ecef * 1000.0

    alt = get_altitute(x_ecef, y_ecef, z_ecef) / 1000

    velX, velY, velZ = velocity
    inertial_velocity = np.sqrt(velX**2 + velY**2 + velZ**2)

    MEAN_MOTION = float(tle['line2'][52:63])
    ORBITAL_PERIOD = 86400 / MEAN_MOTION

    INT_DESIGNATOR = tle['line1'][9:16]
    # LAUNCH_YEAR = INT_DESIGNATOR[0:1]
    # LAUNCH_NUM = INT_DESIGNATOR[2:4]

    if status == 0 and pos is not None:
        # https://pypi.org/project/sgp4/ (Attributes)
        return {
            "norad": satrec.satnum,
            "eccentricity": round(satrec.em, 6),
            "semi-major-axis": round(satrec.am, 3),
            "inclination": round(satrec.im, 3),
            "right-ascension-of-ascending-node-degrees": round(satrec.Om * 180, 2),
            "argument-of-perigee-degrees": round(satrec.om * 180, 2),
            "mean-anomaly-degrees": round(satrec.mm * 180, 0),
            # "mean-motions-radians-minute": satrec.nm,
            # "alt-perigee": round(satrec.altp, 1),
            # "alt-apogee": round(satrec.alta, 1),
            "bstar": round(satrec.bstar, 5),
            "inertial-velocity": round(inertial_velocity, 2),
            "altitude": round(alt, 1),
            "orbital-period": round(ORBITAL_PERIOD, 1),
            "mean_motion": round(MEAN_MOTION, 2),
            "international-designator": INT_DESIGNATOR
        }