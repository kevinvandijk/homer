import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import createNodeLogger from 'redux-node-logger';
import { createSaga } from './channels/plex/sagas';
import * as actions from './actions';

export default function configureStore(reducer) {
  return createStore(
    reducer,
    applyMiddleware(
      createNodeLogger(),
      createSagaMiddleware(createSaga(actions.REQUEST_CONNECTORS, actions.STOP_CONNECTORS))
    )
  );
}
