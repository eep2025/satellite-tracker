import { state } from "./state.js";

export async function initialiseSnapshotCalls() {
    const socket = io("http://localhost:5000");

    //get response from frontend
    const response = await fetch("/i_to_ids");
    const {i_to_ids, sat_count} = await response.json();

    console.log(i_to_ids, sat_count, Object.keys(i_to_ids).length)
    
    state.i_to_ids = i_to_ids;
    state.sat_count = sat_count;

    //buffer lists
    let current = Array.from({length: sat_count}, () => ({x:0,y:0,z:0,t: Date.now()}));
    let next = Array.from({length: sat_count}, () => ({x:0,y:0,z:0,t: Date.now()}));


    //handles updating the buffer arrays with the satellite data
    socket.on("snapshot", async (data) => {
    
        // handle ArrayBuffer/Blob safely
        let buf;
        if (data instanceof ArrayBuffer) buf = data;
        else if (data instanceof Blob) buf = await data.arrayBuffer();
        else {
            console.warn("snapshot: unexpected data type", typeof data);
            return;
        }

        const arr = new Float64Array(buf);


        const satCountInPacket = Math.floor(arr.length / 4);
        //index of sent array = index of buffer
        for (let i = 0; i < satCountInPacket; i++) {
            const index = Math.trunc(arr[i*4])

            //ensures doesn't break
            if (!Number.isInteger(index) || index < 0 || index >= sat_count) {
                console.warn("bad index", index);
                continue;
            }

            next[index] = {
                x: arr[i*4 + 1],
                y: arr[i*4 + 2],
                z: arr[i*4 + 3],
                t: Date.now()
            }

            if (i < 10) {
                console.log("raw index value:", arr[i * 4]);
            }
        }

        //swap buffers
        [current, next] = [next, current];

        //sync buffers with state
        state.currentPositions = current;
        state.nextPositions = next;

        if (!state.firstSnapshotArrived) {
            state.firstSnapshotArrived = true;
        }
    });
}
