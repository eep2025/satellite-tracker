from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO
from utils.get_all_tles import get_all_tles
from sgp4.api import Satrec, jday
from datetime import datetime, timezone
from dotenv import load_dotenv
from os import getenv
import numpy as np

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")
load_dotenv()

# handles sending data to the frontend
RATE_HZ = 10

tles, status_code = get_all_tles() #returns id, t1, t2

#? needs review, might (will) bug out if satrecs order changes
satrecs = {id: Satrec.twoline2rv(t1, t2) for id, t1, t2 in tles}
i_to_ids = {i: id for i, (id, satrec) in enumerate(satrecs.items())}

SAT_COUNT = len(satrecs)


#gpt code
def gmst_from_jd(jd, fr):
    """Compute Greenwich Mean Sidereal Time in radians"""
    T = (jd - 2451545.0 + fr) / 36525.0
    gmst = 67310.54841 + (876600.0*3600 + 8640184.812866)*T \
           + 0.093104*T**2 - 6.2e-6*T**3
    gmst = np.deg2rad((gmst/240.0) % 360)  # seconds -> degrees -> radians
    return gmst


#? returns array of [i,x,y,z,i,x,y,z,...]. Might want to think about formatting differently later? did this because lazy + speed
def compute_snapshot():
    buffer = np.zeros(SAT_COUNT * 4, dtype=np.float64)
    
    now = datetime.now(timezone.utc)
    #turn seconds input into float to allow for microseconds to be accounted for
    jd, fr = jday(now.year, now.month, now.day, now.hour, now.minute, (now.second + now.microsecond *1e-6))

    gmst = gmst_from_jd(jd, fr)
    cos_g = np.cos(gmst)
    sin_g = np.sin(gmst)

    for i, (id,satrec) in enumerate(satrecs.items()):
        e, r, v = satrec.sgp4(jd, fr) #not doing anything with velocity right now
        buffer[i*4] = i 
        
        if e == 0 and r is not None:
            x_tem, y_tem, z_tem = r  # km
            

            #gpt conversions
            # Convert TEME -> PEF -> ECEF
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


if __name__ == "__main__":
    socketio.start_background_task(broadcast_loop)
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, use_reloader=False)