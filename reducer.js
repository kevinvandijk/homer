import Promise from 'bluebird';
import { combineReducers } from 'redux';
import plexReducer from './channels/plex/reducer';

const reducer = combineReducers({
  plex: plexReducer,
});

export default reducer;

export function waitOnAction(store, actionType) {
  return new Promise(resolve => {
    store.replaceReducer((state, action) => {
      const reduced = reducer(state, action);

      if (action.type === actionType) {
        resolve(action);
      }
      return reduced;
    });
  }).finally(() => {
    store.replaceReducer(reducer);
  });
}
