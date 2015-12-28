import PlexApi from 'plex-api';
import Promise from 'bluebird';
import _ from 'lodash';
import {stringifyParams} from '../helpers/url';
import {fuzzySearch, normalSearch} from '../helpers/search';

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
    return Promise.resolve(this.server.query('/library/sections/2/all')).then(results => {
      return results._children || [];
    });
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
    return this.getShows().then(tvshows => {
      const shows = (options.fuzzy ? fuzzySearch(tvshows, name) : normalSearch(tvshows, name));

      return (shows
        ? Promise.resolve(shows[0])
        : Promise.reject(createError('no-show-found', 'No show found'))
      );
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
