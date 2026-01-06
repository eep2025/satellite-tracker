import numpy as np
from pyproj import Transformer

# This is purely ChatGPT generated! Just saving it here before i forget about it forever

def gmst_rad(jd):
    T = (jd - 2451545.0) / 36525.0
    theta = (
        280.46061837
        + 360.98564736629 * (jd - 2451545.0)
        + 0.000387933 * T**2
        - T**3 / 38710000.0
    )
    return np.deg2rad(theta % 360.0)

def teme_to_ecef_vectorized(positions, jd, fr):
    """
    Convert TEME positions to ECEF (Earth-fixed) positions.
    
    positions: np.array of shape (n_sats,3) in km
    jd, fr: Julian date and fractional day
    Returns: np.array of shape (n_sats,3) in km
    """
    theta = gmst_rad(jd + fr)
    c, s = np.cos(theta), np.sin(theta)

    x = positions[:, 0]
    y = positions[:, 1]
    z = positions[:, 2]

    x_ecef =  c*x + s*y
    y_ecef = -s*x + c*y
    z_ecef =  z

    return np.column_stack((x_ecef, y_ecef, z_ecef))

def ecef_to_latlonalt(ecef_positions):
    """
    Convert ECEF (km) to latitude (deg), longitude (deg), altitude (km)
    """
    transformer = Transformer.from_crs(
        "EPSG:4978",  # ECEF
        "EPSG:4979",  # lat/lon/height
        always_xy=True
    )

    x_m = ecef_positions[:, 0] * 1000
    y_m = ecef_positions[:, 1] * 1000
    z_m = ecef_positions[:, 2] * 1000

    lon, lat, alt_m = transformer.transform(x_m, y_m, z_m)
    alt = alt_m / 1000  # km
    return lat, lon, alt