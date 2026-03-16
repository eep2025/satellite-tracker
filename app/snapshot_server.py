from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO
from utils.get_all_tles import get_all_tles
from utils.get_tle_from_id import get_tle_from_header, get_tle_from_norad, get_position
from utils.helpers import gmst_from_jd
from sgp4.api import Satrec, jday
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from os import getenv
import numpy as np

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")
load_dotenv()

# Defines how many times every second location data is sent to each client
RATE_HZ = 5

tles, status_code = get_all_tles() #returns id, t1, t2

#? needs review, might (will) bug out if satrecs order changes
satrecs = {id: Satrec.twoline2rv(t1, t2) for id, t1, t2, header in tles}
i_to_ids = {i: id for i, (id, satrec) in enumerate(satrecs.items())}

SAT_COUNT = len(satrecs)

#? returns array of [i,x,y,z,i,x,y,z,...]. Might want to think about formatting differently later? did this because lazy + speed
def compute_snapshot():
    buffer = np.zeros(SAT_COUNT * 4, dtype=np.float64)
    
    now = datetime.now(timezone.utc)
    jd, fr = jday(now.year, now.month, now.day, now.hour, now.minute, (now.second + now.microsecond *1e-6))

    gmst = gmst_from_jd(jd, fr)
    cos_g = np.cos(gmst)
    sin_g = np.sin(gmst)

    for i, (id, satrec) in enumerate(satrecs.items()):
        status, pos, velocity = satrec.sgp4(jd, fr) #not doing anything with velocity right now, returns TEME pos
        buffer[i*4] = i
        
        if status == 0 and pos is not None:
            x_tem, y_tem, z_tem = pos  # km
            

            # simple GMST rotation about Z-axis
            x_ecef = x_tem * cos_g + y_tem * sin_g
            y_ecef = -x_tem * sin_g + y_tem * cos_g
            z_ecef = z_tem

            #km -> m
            buffer[i*4 + 1] = x_ecef * 1000.0
            buffer[i*4 + 2] = y_ecef * 1000.0
            buffer[i*4 + 3] = z_ecef * 1000.0
        else:
            buffer[i*4 + 1] = np.nan
            buffer[i*4 + 2] = np.nan
            buffer[i*4 + 3] = np.nan

    return buffer.tobytes() #faster in bytes

# send snapshot to frontend every 1/RATE_HZ seconds
def broadcast_loop():
    while True:
        socketio.emit("snapshot", compute_snapshot())
        socketio.sleep(1.0 / RATE_HZ)


@socketio.on("connect")
def connect():
    print("Client connected")

# send i_to_id mapping to frontend. Doing this so faster transmission as transmitting ints rather than strings for id
# this saves a lot of bandwidth as the mapping only needs to be transmitted once, rather than every time broadcast_loop() is run
@app.route("/i_to_ids")
def sendIdMappings():
    return jsonify({
        "i_to_ids": i_to_ids,
        "sat_count": SAT_COUNT
    })

@app.route("/")
def home():
    return render_template(
        "index.html",
        CESIUM_TOKEN = getenv("CESIUM_TOKEN")
    )

@app.route("/all_tles")
def index():
    TLEdata, status_code = get_all_tles()
    print("Success!")
    return jsonify(TLEdata), status_code

#any idea what these two routes are doing here?
# TODO error handling
@app.route("/tle/header/<header>")
def tle_from_header_endpoint(header):
    return jsonify(get_tle_from_header(header)), 200

# TODO error handling
@app.route("/tle/norad/<int:norad>")
def tle_from_norad_endpoint(norad):
    return jsonify(get_tle_from_norad(norad)), 200

@socketio.on("requestPositions")
def handle_position_request(data):
    #runs when frontend requests data
    #currently uses time upon request receieved
    #assumes the data will be a dict containing the id (name) of the satellite
    
    id = data["id"]
    tle = get_tle_from_header(id)
    print(tle[0])
    satrec = Satrec.twoline2rv(tle[0]["line1"], tle[0]["line2"])

    REFERENCE_TIME = datetime.now(timezone.utc)
    PROPAGATION_DURATION_SECONDS = 90*60
    STEP_SECONDS = 10

    #formatted as time (JulianDate), x, y, z
    positions = []

    #varies dt (deltatime) and calculates the position at each offset of REFERENCE_TIME
    for dt_seconds in range(-PROPAGATION_DURATION_SECONDS, PROPAGATION_DURATION_SECONDS, STEP_SECONDS):
        #converts dt_seconds -> dt (deltatime)
        dt = timedelta(seconds=dt_seconds)
        time_jd, x, y, z = get_position(satrec, REFERENCE_TIME, dt)
        positions.append({"time": time_jd, "x": x, "y": y, "z": z})

    return positions


if __name__ == "__main__":
    socketio.start_background_task(broadcast_loop)
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, use_reloader=False)

        



