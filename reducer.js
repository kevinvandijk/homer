import { combineReducers } from 'redux';
import plexReducer from './channels/plex/reducer';

export default combineReducers({
  plex: plexReducer,
});
