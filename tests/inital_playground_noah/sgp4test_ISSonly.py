from sgp4.api import Satrec, accelerated, jday, SGP4_ERRORS
from datetime import datetime, timezone
import numpy as np

# https://pypi.org/project/sgp4/ - some documentation here
# https://rhodesmill.org/skyfield/api.html - skyfield api reference
# https://celestrak.org/NORAD/elements/index.php?FORMAT=tle - celestrak element sets

line = """ISS (ZARYA)             
1 25544U 98067A   26005.53262344  .00012388  00000+0  23158-3 0  9995
2 25544  51.6326  24.6699 0007562 343.7680  16.3066 15.49114570546545"""

name, l1, l2 = line.split("\n")

satellite = Satrec.twoline2rv(l1, l2)

# Not used right now (see line after julian_date is assigned here), but kept for future reference
dt = datetime(2026, 1, 5, 12, 45, 0, tzinfo=timezone.utc)
julian_date, fraction_of_day = jday(
    dt.year, dt.month, dt.day,
    dt.hour, dt.minute,
    dt.second + dt.microsecond * 1e-6
)

julian_date, fraction_of_day = satellite.jdsatepoch, satellite.jdsatepochF

# Result 1 - error code: see sgp4.api.SGP4_ERRORS
# Result 2 - position: in kilometres from centre of the earth in the idiosyncratic True Equator Mean Equinox coordinate frame used by SGP4
# Result 3 - velocity: km/s
error_code, position, velocity = satellite.sgp4(julian_date, fraction_of_day)

if error_code != 0:
    raise RuntimeError(f"SGP4 propagation error {error_code}: {SGP4_ERRORS[error_code]}")

# TEME to Cartesian hack - see if there is a more efficient way of doing this!
def gmst_rad(jd):
    T = (jd - 2451545.0) / 36525.0
    theta = (
        280.46061837
        + 360.98564736629 * (jd - 2451545.0)
        + 0.000387933 * T**2
        - T**3 / 38710000.0
    )
    return np.deg2rad(theta % 360.0)

def teme_to_ecef_fast(r, jd, fr):
    theta = gmst_rad(jd + fr)
    c, s = np.cos(theta), np.sin(theta)

    x, y, z = r
    return (
        c*x + s*y,
       -s*x + c*y,
        z
    )

x,y,z = teme_to_ecef_fast(position, julian_date, fraction_of_day) # km
print(x,y,z)
