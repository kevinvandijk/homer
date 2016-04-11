import mockery from 'mockery';
import Promise from 'bluebird';
import expect from 'expect';

let Plex;

describe('Plex Connector', () => {
  before(() => {
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false,
    });
    mockery.registerAllowable('../../../channels/plex/plex');

    function PlexApiMock() {
      return {
        query() {
          return Promise.resolve();
        },
      };
    }

    mockery.registerMock('plex-api', PlexApiMock);

    Plex = require('../../../channels/plex/plex').default;
  });

  after(() => {
    mockery.disable();
  });

  describe('#status', () => {
    it('queries the Plex API for the state of the configured device', async () => {
      const deviceName = 'testplayer';
      const plex = new Plex({
        device: deviceName,
      });
      const expectedState = 'testing';

      const sessions = {
        _children: [
          {
            _children: [{
              _elementType: 'Player',
              title: deviceName,
              state: expectedState,
            }, {
              _elementType: 'Player',
              title: 'something else',
              state: 'not expected',
            }, {
              _elementType: 'Something else',
              title: deviceName,
              state: 'not expected',
            }],
          },
        ],
      };

      expect.spyOn(plex.connection, 'query').andReturn(Promise.resolve(sessions));
      const status = await plex.status();

      expect(status).toEqual(expectedState);
    });
  });
});
