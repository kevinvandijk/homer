// TODO: Figure out the best way to get homer action types in here
// import PlexChannel from './index';
import uuid from 'node-uuid';
import {
  updateStatus,
  UPDATE_STATUS,
  STOP,
  PAUSE,
  PLAY,
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

function* controller() {
  let runningAction;

  while (true) {
    const winner = yield race({
      play: take(PLAY),
      stop: take(STOP),
      pause: take(PAUSE),
    });

    if (runningAction && runningAction.isRunning()) cancel(runningAction);

    const method = Object.keys(winner)[0];
    const payload = winner[action].payload;

    // // TODO: This sucks, find better way:
    // if (action === 'play') {
    //   runningAction = yield fork(play, payload);
    // } else if (action === 'stop') {
    //   runningAction = yield fork(stop, payload);
    // } else if (action === 'pause') {
    //   runningAction = yield fork(pause, payload);
    // }
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
