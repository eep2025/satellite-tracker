import numpy as np

MU = 398600.4418  # Earth's gravitational parameter, km^3/s^2
R_EARTH = 6378.137  # Earth's radius in km

def gmst_from_jd(jd, fr):
    """Compute Greenwich Mean Sidereal Time in radians"""
    T = (jd - 2451545.0 + fr) / 36525.0
    gmst = 67310.54841 + (876600.0*3600 + 8640184.812866)*T \
           + 0.093104*T**2 - 6.2e-6*T**3
    gmst = np.deg2rad((gmst/240.0) % 360)  # seconds -> degrees -> radians
    return gmst

def is_sgp4_safe(mean_motion, eccentricity):
    n_rad_s = mean_motion * (2 * np.pi) / 86400  # rad/s
    semi_major_axis = (MU / n_rad_s**2) ** (1/3)
    alt_mean = semi_major_axis - R_EARTH

    return (160 <= alt_mean <= 2000) and eccentricity < 0.2