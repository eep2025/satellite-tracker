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

def teme_to_ecef(x_teme, y_teme, z_teme, gmst):
    sin_gmst, cos_gmst = np.sin(gmst), np.cos(gmst)
    x_ecef = x_teme * cos_gmst + y_teme * sin_gmst
    y_ecef = -x_teme * sin_gmst + y_teme * cos_gmst
    z_ecef = z_teme

    #convert km->m
    x_ecef = x_ecef * 1000.0
    y_ecef = y_ecef * 1000.0
    z_ecef = z_ecef * 1000.0

    return x_ecef, y_ecef, z_ecef

def get_altitute(x_ecef, y_ecef, z_ecef):
    a = 6378137.0  # WGS84 semi-major axis
    b = 6356752.3142  # WGS84 semi-minor axis
    f = (a - b) / a
    e_sq = f * (2 - f)
    
    eps = np.finfo(float).eps
    p = np.sqrt(x_ecef**2 + y_ecef**2)
    lat = np.arctan2(z_ecef, p * (1 - e_sq))
    
    # Iterate a few times for precision
    for _ in range(3):
        n = a / np.sqrt(1 - e_sq * np.sin(lat)**2)
        lat = np.arctan2(z_ecef + e_sq * n * np.sin(lat), p)
        
    n = a / np.sqrt(1 - e_sq * np.sin(lat)**2)
    alt = p / np.cos(lat) - n
    return alt

def is_sgp4_safe(mean_motion, eccentricity):
    n_rad_s = mean_motion * (2 * np.pi) / 86400  # rad/s
    semi_major_axis = (MU / n_rad_s**2) ** (1/3)
    alt_mean = semi_major_axis - R_EARTH

    return (160 <= alt_mean <= 2000) and eccentricity < 0.2