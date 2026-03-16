export const state = {
    savedView: null, //last saved Earth-centered position
    zoomSpeed: 2, //how quickly zoom happens between views
    currentEntity: null, //currently selected entity
    lockedOn: false,
    TLEdata: [],
    satellites: new Map(), //using Map() for O(1) lookup speed (faster),
    viewer: null,
    points: null, //collection of orbital points
    currentPositions: [], 
    nextPositions: [],  //these two hold {x,y,z,t} from frontend and swap to buffer data flow
    i_to_ids: {},
    sat_count: null,
    firstSnapshotArrived: false,
}