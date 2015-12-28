import PlexApi from 'plex-api';
import Promise from 'bluebird';
import _ from 'lodash';
import {stringifyParams} from '../helpers/url';
import FuzzySearch from 'fuzzysearch-js';
import levenshteinFS from 'fuzzysearch-js/js/modules/LevenshteinFS';

function createError(type, description) {
  const err = new Error(description || type);
  err.type = type;
  return err;
}
export default class PlexChannel {
  constructor(plexOptions, clientOptions) {
    clientOptions = clientOptions || plexOptions;

    this.server = new PlexApi(plexOptions);
    this.server.authToken = plexOptions.authToken;

    this.player = new PlexApi(clientOptions);
    this.playerCommandId = 0;
  }

  play(options) {
    const { mediaKey, offset } = options;
    return this._playerCommand('playMedia', {
      key: mediaKey,
      offset
    });
  }

  pause() {
    return this._playerCommand('pause');
  }

  resume() {
    return this._playerCommand('play');
  }

  rewind() {
    return this._playerCommand('rewind');
  }

  fastForward() {
    return this._playerCommand('fastForward');
  }

  stepForward() {
    return this._playerCommand('stepForward');
  }

  stepBack() {
    return this._playerCommand('stepBack');
  }

  bigStepForward() {
    return this._playerCommand('bigStepForward');
  }

  bigStepBack() {
    return this._playerCommand('bigStepBack');
  }

  skipNext() {
    return this._playerCommand('skipNext');
  }

  skipPrevious() {
    return this._playerCommand('skipPrevious');
  }

  getShows() {
    return this.server.query('/library/sections/2/all');
  }

  getEpisodes(showOrKey) {
    const key = (typeof showOrKey === 'object') ? showOrKey.ratingKey : showOrKey;
    return this.server.query(`/library/metadata/${key}/allLeaves`).then(result => result._children || []);
  }

  getNextUnwatchedEpisode(showOrKey, options = {partiallySeen: true}) {
    return this.getEpisodes(showOrKey).then(episodes => {
      let nextEpisode;
      if (options.partiallySeen) {
        nextEpisode = episodes.find(episode => !!episode.viewOffset || !!!episode.lastViewedAt);
      } else {
        nextEpisode = episodes.find(episode => !!!episode.lastViewedAt);
      }

      return nextEpisode
        ? Promise.resolve(nextEpisode)
        : Promise.reject(createError('no-unwatched-episode-found'));
    });
  }

  findShow(name, options = {}) {
    return new Promise((resolve, reject) => {
      this.getShows().then(results => {
        return results._children || [];
      }).then(tvshows => {
        // TODO: split off in separate functions
        let show;
        if (options.fuzzy) {
          try {
            const fuzzySearch = new FuzzySearch(tvshows, {
              minimumScore: 200,
              caseSensitive: false,
              returnEmptyArray: true,
              termPath: 'title'
            });
            fuzzySearch.addModule(levenshteinFS({'maxDistanceTolerance': 20, 'factor': 3}));

            const result = fuzzySearch.search(name);

            if (result.length) {
              show = result[0].value;
            }
          } catch (e) {
            reject(e);
          }
        } else {
          show = _(tvshows).find(tvshow =>
            tvshow.title.toLowerCase() === name.toLowerCase()
          );
        }

        if (show) {
          return resolve(show);
        } else {
          return reject(createError('no-show-found', 'No show found'));
        }
      });
    });
  }

  startShow(showOrKey, options) {
    return Promise.resolve();
  }

  _playerCommand(command, options = {}) {
    const server = this.server;
    const params = Object.assign(options, {
      machineIdentifier: server.options.machineIdentifier,
      address: server.hostname,
      port: server.port,
      commandId: this.playerCommandId,
    });

    const url = `/player/playback/${command}?${stringifyParams(params)}`;

    return new Promise((resolve, reject) => {
      this.player.postQuery(url).then(({Response}) => {
        const response = Response.attributes;

        if (parseInt(response.code, 10) !== 200) {
          reject(response);
        } else {
          resolve(response);
        }
      }, error => {
        reject(error);
      });

      this.playerCommandId = this.playerCommandId + 1;
    });
  }
}
