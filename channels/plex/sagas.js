// TODO: Figure out the best way to get homer action types in here
// import PlexChannel from './index';
import uuid from 'node-uuid';
import {
  updateStatus,
  UPDATE_STATUS,
  SEARCH_MEDIA_REQUEST,
  PLAYER_REQUEST,
  playerSuccess,
  playerFailure,
  searchMediaSuccess,
  searchMediaFailure,
} from './actions';
import Plex from './plex';
import { cancel, race, put, take, call, fork } from 'redux-saga/effects';

let instances;

// a utility function: return a Promise that will resolve after 1 second
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


// Maybe call store here before dispatching to not constantly do an updateStatus
export function* listener(id, instance) {
  let prevState;


  while (true) {
    // If the status is changed from another source and an UPDATE_STATUS action
    // was dispatched, reset the prevState cache, otherwise update by polling Plex
    // TODO: Maybe it's better to use select() and compare the new state to the current
    // state in the store. If the status gets updated by any other means than UPDATE_STATUS
    // it might not work. Can this happen?
    const { fromState } = yield race({
      fromState: take(UPDATE_STATUS),
      fromListener: call(delay, prevState ? 3000 : 0),
    });

    if (fromState) {
      prevState = fromState.status;
    } else {
      // Poll Plex:
      try {
        const newState = yield call(instance.status);

        if (newState !== prevState) {
          yield put(updateStatus(id, newState));
          prevState = newState;
        }
      } catch (e) {
        console.log('do something with error', e);
      }
    }
  }
}

export function* searchMedia(id, instance, title) {
  try {
    const results = yield call(instance.search, title);
    yield put(searchMediaSuccess(id, title, results));
  } catch (err) {
    yield put(searchMediaFailure(id, err));
  }
}

export function* playerRequest(id, instance, command) {
  try {
    const result = yield call(instance.player, command);
    yield put(playerSuccess(id, result));
  } catch (err) {
    yield put(playerFailure(id, err));
  }
}

function* controller() {
  while (true) {
    const action = yield take('*');

    switch (action.type) {
      case SEARCH_MEDIA_REQUEST: {
        const { id } = action.payload;
        const instance = instances[id];
        yield fork(searchMedia, id, instance, action.payload.title);
        break;
      }

      case PLAYER_REQUEST: {
        const { id, command } = action.payload;
        const instance = instances[id];
        yield fork(playerRequest, id, instance, command);
        break;
      }
      default:
        break;
    }
  }
}

export function* createConnector(options) {
  const connectorId = 'server' || uuid.v4();
  const instance = new Plex(options);

  return { connectorId, instance };
}

export function createSaga(actions, options) {
  return function* runSaga() {
    while (true) {
      yield take(actions.REQUEST_CONNECTORS);

      const { connectorId, instance } = yield createConnector(options);
      instances = {
        [connectorId]: instance,
      };

      const sagas = yield [
        fork(listener, connectorId, instance),
        fork(controller, connectorId, instance),
      ];

      yield take(actions.STOP_CONNECTORS);

      yield [
        cancel(sagas[0]),
        cancel(sagas[1]),
      ];
    }
  };
}
