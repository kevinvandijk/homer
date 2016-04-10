import expect from 'expect';
import uuid from 'uuid-regexp';
import * as Plex from '../../../channels/plex/plex';
import * as effects from 'redux-saga/effects';
import * as sagas from '../../../channels/plex/sagas';
import { updateStatus } from '../../../channels/plex/actions';


const REQUEST_CONNECTORS = 'REQUEST_CONNECTORS';
const STOP_CONNECTORS = 'STOP_CONNECTORS';


describe('Plex Sagas', () => {
  afterEach(() => {
    expect.restoreSpies();
  });

  describe('#createSaga', () => {
    let runSaga;

    beforeEach(() => {
      runSaga = sagas.createSaga(REQUEST_CONNECTORS, STOP_CONNECTORS);
    });

    it('returns a function to run the saga', () => {
      expect(runSaga).toBeA('function');
    });

    it('waits for the REQUEST_CONNECTORS action before doing anything', () => {
      const saga = runSaga();
      expect(saga.next().value).toEqual(effects.take(REQUEST_CONNECTORS));
    });

    it('creates a forked listener and controller', () => {
      const saga = runSaga();
      saga.next();
      saga.next();

      const result = saga.next({ connectorId: 1, instance: undefined }).value;
      expect(result).toBeAn('array');

      // TODO: Find less hacky way to test this:
      const forks = result.map(({ FORK }) => FORK.fn.name);
      expect(forks).toInclude('listener');
      expect(forks).toInclude('controller');
    });

    it('cancels exising forks when STOP_CONNECTORS is dispatched', () => {
      // mockery.registerMock('redux-saga/effects', effects);

      const saga = runSaga();
      saga.next();
      saga.next();
      saga.next({ connectorId: 1, instance: undefined });

      const spy = expect.spyOn(effects, 'cancel');

      saga.next(['stuff', 'more stuff']);
      saga.next();

      expect(spy.calls.length).toEqual(2, 'Expected cancel to be called twice');
      expect(spy.calls[0].arguments).toEqual(['stuff']);
      expect(spy.calls[1].arguments).toEqual(['more stuff']);
    });

    it('waits for a new REQUEST_CONNECTORS action again after it received STOP_CONNECTORS', () => {
      const saga = runSaga();
      saga.next();
      saga.next();
      saga.next({ connectorId: 1, instance: undefined });
      expect.spyOn(effects, 'cancel');
      saga.next(['listener', 'controller']);
      saga.next();

      expect(saga.next().value).toEqual(effects.take(REQUEST_CONNECTORS));
    });
  });

  describe('#createConnector', () => {
    it('creates a unique connectorId', () => {
      const saga = sagas.createConnector();
      const { connectorId } = saga.next().value;

      expect(uuid().test(connectorId)).toBe(true);
    });

    it('creates a Plex instance', () => {
      // Dirty mocking
      class Mock {}
      Plex.default = Mock;

      const saga = sagas.createConnector();
      const { instance } = saga.next().value;

      expect(instance).toBeA(Mock);
    });
  });

  describe('#listener', () => {
    let plexMock;

    beforeEach(() => {
      plexMock = {
        status() {},
      };
    });

    it('requests the status from Plex', () => {
      const saga = sagas.listener(1, plexMock);
      saga.next();
      const result = saga.next({}).value;
      const expected = effects.call(plexMock.status);

      expect(result).toEqual(expected);
    });

    it('dispatches an UPDATE_STATUS action when getting a new status from Plex', () => {
      const newState = 'playing';
      expect.spyOn(plexMock, 'status').andReturn(newState);

      const saga = sagas.listener(1, plexMock);
      saga.next();
      saga.next({});
      const initialResult = saga.next(newState).value;
      const expected = effects.put(updateStatus(1, newState));

      expect(initialResult).toEqual(expected);

      // Next update with same state:
      saga.next();
      saga.next({});
      const nextResult = saga.next(newState).value;

      expect(nextResult).toNotEqual(expected);
    });

    it('does not dispatch anything when the state was updated from somewhere else', () => {
      const newState = 'playing';
      const saga = sagas.listener(1, plexMock);
      saga.next();
      const result = saga.next({
        fromState: { status: newState },
      }).value;

      const notExpected = effects.put(updateStatus(1, newState));

      expect(result).toNotEqual(notExpected);
    });
  });
});
