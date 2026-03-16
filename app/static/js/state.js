export const state = {
    savedView: null, //last saved Earth-centered position
    zoomSpeed: 2, //how quickly zoom happens between views
    currentPrimitive: null, //currently selected primitive
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
    currentPropagatedEntity: null,
    selectionInProgress: false,
};

export const socket = io("http://192.168.5.36:5000");