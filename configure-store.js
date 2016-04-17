import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import createNodeLogger from 'redux-node-logger';
import { createSaga } from './channels/plex/sagas';
import * as actions from './actions';

import dotenv from 'dotenv';
dotenv.load();
const env = process.env;

const plexConfig = {
  name: 'Rainman',
  hostname: env.PLEX_SERVER_HOST,
  port: env.PLEX_SERVER_PORT,
  username: env.PLEX_SERVER_USERNAME,
  password: env.PLEX_SERVER_PASSWORD,
  authToken: env.PLEX_SERVER_TOKEN,
  role: 'server',
};

export default function configureStore(reducer) {
  return createStore(
    reducer,
    applyMiddleware(
      createNodeLogger(),
      createSagaMiddleware(createSaga(actions, plexConfig))
    )
  );
}
