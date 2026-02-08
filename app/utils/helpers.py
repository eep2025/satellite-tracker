def gmst_from_jd(jd, fr):
    """Compute Greenwich Mean Sidereal Time in radians"""
    T = (jd - 2451545.0 + fr) / 36525.0
    gmst = 67310.54841 + (876600.0*3600 + 8640184.812866)*T \
           + 0.093104*T**2 - 6.2e-6*T**3
    gmst = np.deg2rad((gmst/240.0) % 360)  # seconds -> degrees -> radians
    return gmst