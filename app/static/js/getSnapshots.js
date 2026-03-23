import { populate_metadata } from "./info_card_manager.js";
import { state , socket} from "./state.js";

export async function initialiseSnapshotCalls() {

    //get response from frontend
    const response = await fetch("/i_to_ids");
    const {i_to_ids, sat_count} = await response.json();
    
    state.i_to_ids = i_to_ids;
    state.sat_count = sat_count;

    //buffer lists
    let current = Array.from({length: sat_count}, () => ({x:0,y:0,z:0,t: Date.now()}));
    let next = Array.from({length: sat_count}, () => ({x:0,y:0,z:0,t: Date.now()}));

    let lastMetadataRequestTime = 0

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

        }


        //sync buffers with state
        state.currentPositions = current;
        state.nextPositions = next;

        //swap buffers
        [current, next] = [next, current];

        if (!state.firstSnapshotArrived) {
            state.firstSnapshotArrived = true;
        }

        const now = Date.now();
        if (state.currentPrimitive && now - lastMetadataRequestTime > 1000) {
            lastMetadataRequestTime = now
            const data = await new Promise((resolve, reject) => {
                let timedOut = false;
                const timer = setTimeout(() => {
                    timedOut = true;
                    reject(new Error("Timeout requesting metadata for current satellite"))
                }, 2000)
                socket.emit("requestMetadata", { id: state.currentPrimitive.id }, (res) => {
                    if (timedOut) {
                        //ignore response if timeOut (late response)
                        return;
                    }
                    clearTimeout(timer);
                    resolve(res); // resumes execution
                });
            });

            populate_metadata(data)
        }
    });
}
