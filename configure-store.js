import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import createNodeLogger from 'redux-node-logger';
import { createSaga } from './channels/plex/sagas';
import * as actions from './actions';
import dotenv from 'dotenv';
dotenv.load();

const env = process.env;
import { runSaga } from './sagas';

const plexConfig = {
  name: 'Rainman',
  hostname: env.PLEX_SERVER_HOST,
  port: env.PLEX_SERVER_PORT,
  username: env.PLEX_SERVER_USERNAME,
  password: env.PLEX_SERVER_PASSWORD,
  authToken: env.PLEX_SERVER_TOKEN,
  identifier: env.PLEX_SERVER_IDENTIFIER,
  player: {
    name: 'Virtual Box',
    hostname: env.PLEX_PLAYER_HOST,
    port: env.PLEX_PLAYER_PORT,
  },
};

export default function configureStore(reducer) {
  return createStore(
    reducer,
    applyMiddleware(
      createNodeLogger(),
      createSagaMiddleware(createSaga(actions, plexConfig), runSaga)
    )
  );
}
