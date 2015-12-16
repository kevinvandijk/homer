import PlexApi from 'plex-api';
import Promise from 'bluebird';
import _ from 'lodash';
import {stringifyParams} from '../helpers/url';

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

  findNextUnwatchedEpisode(episodes, options = {partiallySeen: true}) {
    if (options.partiallySeen) {
      return episodes.find(episode => !!episode.viewOffset || !!!episode.lastViewedAt);
    }
    return _(episodes).find(episode => !!!episode.lastViewedAt);
  }

  getShows() {
    return this.server.query('/library/sections/2/all');
  }

  getShowEpisodes(show) {
    return this.server.query(`/library/metadata/${show.ratingKey}/allLeaves`);
  }

  startShow(name, callback) {
    return new Promise((resolve, reject) => {
      this.getShows().then(tvshows => {
        const show = _(tvshows._children).findWhere({title: name});
        return Promise.resolve(show);
      }).then(
        this.getShowEpisodes.bind(this)
      ).then(episodes => {
        const episode = this.findNextUnwatchedEpisode(episodes._children);
        if (episode) {
          return this.play({
            mediaKey: episode.key,
            offset: episode.viewOffset || 0
          });
        } else {
          return Promise.reject({reason: 'No unwatched episode found'});
        }
      }).then(result => {
        resolve(result);
      }).catch(e => {
        reject(e);
      });
    });
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
