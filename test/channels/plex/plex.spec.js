import mockery from 'mockery';
import Promise from 'bluebird';
import expect, { spyOn } from 'expect';

let Plex;

describe('Plex Connector', () => {
  const plexApiMock = {
    query() {
      return Promise.resolve();
    },
  };

  const searchHelpersMock = {
    fuzzySearch() {},
    normalSearch() {},
  };

  before(() => {
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false,
    });
    mockery.registerAllowable('../../../channels/plex/plex');

    function PlexApiMock() {
      return plexApiMock;
    }

    mockery.registerMock('plex-api', PlexApiMock);
    mockery.registerMock('../../helpers/search', searchHelpersMock);

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

      const spy = spyOn(plexApiMock, 'query').andReturn(Promise.resolve(sessions));
      const status = await plex.status();

      expect(status).toEqual(expectedState);
      spy.restore();
    });
  });

  describe('#search', () => {
    it('handles an empty library', async (done) => {
      const spy = spyOn(plexApiMock, 'query').andReturn(Promise.resolve({}));

      const plex = new Plex({});
      const result = await plex.search();

      expect(result).toEqual([]);
      spy.restore();
      done();
    });

    it('handles a library with only empty sections', async (done) => {
      const spy = spyOn(plexApiMock, 'query').andCall(query => {
        let reply;
        if (query === '/library/sections') {
          reply = {
            _children: [
              { uri: '/test' },
            ],
          };
        } else {
          reply = {};
        }
        return Promise.resolve(reply);
      });

      const plex = new Plex({});
      const result = await plex.search();

      expect(result).toEqual([]);
      spy.restore();
      done();
    });

    it('does a fuzzy search by default and a normal search when specified', async (done) => {
      const items = {
        _children: [
          { uri: '/test' },
        ],
      };
      const plexSpy = spyOn(plexApiMock, 'query').andReturn(Promise.resolve(items));
      const query = 'Sillicon Valley';

      const fuzzySearchSpy = spyOn(searchHelpersMock, 'fuzzySearch').andReturn([]);
      const normalSearchSpy = spyOn(searchHelpersMock, 'normalSearch').andReturn([]);

      const plex = new Plex({});
      await plex.search(query);

      expect(fuzzySearchSpy).toHaveBeenCalledWith(items._children, query);
      expect(normalSearchSpy).toNotHaveBeenCalled();

      fuzzySearchSpy.reset();

      await plex.search(query, { fuzzy: false });

      expect(fuzzySearchSpy).toNotHaveBeenCalled();
      expect(normalSearchSpy).toHaveBeenCalledWith(items._children, query);

      [plexSpy, fuzzySearchSpy, normalSearchSpy].map(spy => spy.restore());

      done();
    });

    it('only returns the first found item when the name is an exact match', async (done) => {
      const query = 'Sillicon Valley';
      const items = {
        _children: [
          { uri: '/test' },
        ],
      };
      const plexSpy = spyOn(plexApiMock, 'query').andReturn(Promise.resolve(items));
      const searchSpy = spyOn(searchHelpersMock, 'fuzzySearch').andReturn([
        { title: query },
        { title: 'Arrested Development' },
        { title: 'The Wire' },
      ]);

      const plex = new Plex({});
      const result = await plex.search(query);

      expect(result).toEqual([{ title: query }]);

      [plexSpy, searchSpy].map(spy => spy.restore());
      done();
    });
  });
});
