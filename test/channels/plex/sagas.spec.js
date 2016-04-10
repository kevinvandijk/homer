import expect from 'expect';
import mockery from 'mockery';
import * as effects from 'redux-saga/effects';

const REQUEST_CONNECTORS = 'REQUEST_CONNECTORS';
const STOP_CONNECTORS = 'STOP_CONNECTORS';
let sagas;

describe('Plex Sagas', () => {
  describe('#createSaga', () => {
    let runSaga;

    beforeEach(() => {
      mockery.enable({
        warnOnReplace: false,
        warnOnUnregistered: false,
      });

      mockery.registerMock('redux-saga/effects', effects);

      sagas = require('../../../channels/plex/sagas');
      runSaga = sagas.createSaga(REQUEST_CONNECTORS, STOP_CONNECTORS);
    });

    afterEach(() => {
      expect.restoreSpies();
      mockery.disable();
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
      const saga = runSaga();
      saga.next();
      saga.next();
      saga.next({ connectorId: 1, instance: undefined });

      const spy = expect.spyOn(effects, 'cancel');

      const result = saga.next(['stuff', 'more stuff']);
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
});
