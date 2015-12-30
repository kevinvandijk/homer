import PlexApi from 'plex-api';
import Promise from 'bluebird';
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

  getMovies() {
    return Promise.resolve(this.server.query('/library/sections/4/all')).then(results => {
      return results._children || [];
    });
  }

  getEpisodes(showOrKey) {
    const key = (typeof showOrKey === 'object') ? showOrKey.ratingKey : showOrKey;
    return this.server.query(`/library/metadata/${key}/allLeaves`).then(result => result._children || []);
  }

  getFirstEpisode(showOrKey, options = {}) {
    return this.getEpisodes(showOrKey).then(episodes => {
      return episodes[0];
    });
  }

  getNextUnwatchedEpisode(showOrKey, options = {}) {
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

  // TODO: Refactor these 3 methods since they're basically all the same
  findShow(options = {}) {
    if (!options.key && !options.name) return Promise.reject(createError('no-name-or-key-specified'));

    return this.getShows().then(tvshows => {
      if (options.key) {
        return [tvshows.find(show => parseInt(show.ratingKey, 10) === parseInt(options.key, 10))];
      } else {
        const shows = (options.fuzzy ? fuzzySearch(tvshows, options.name) : normalSearch(tvshows, options.name));
        return shows || [];
      }
    });
  }

  findMovie(options = {}) {
    if (!options.key && !options.name) return Promise.reject(createError('no-name-or-key-specified'));

    return this.getMovies().then(movies => {
      if (options.key) {
        return [movies.find(movie => parseInt(movie.ratingKey, 10) === parseInt(options.key, 10))];
      } else {
        const results = (options.fuzzy ? fuzzySearch(movies, options.name) : normalSearch(movies, options.name));
        return results || [];
      }
    });
  }

  findMedia(options = {}) {
    if (!options.key && !options.name) return Promise.reject(createError('no-name-or-key-specified'));

    return Promise.all([
      this.getMovies(),
      this.getShows()
    ]).then(([shows, movies]) => {
      return shows.concat(movies);
    }).then(media => {
      if (options.key) {
        return [media.find(item => parseInt(item.ratingKey, 10) === parseInt(options.key, 10))];
      } else if (options.name) {
        const results = (options.fuzzy ? fuzzySearch(media, options.name) : normalSearch(media, options.name));
        return results || [];
      }
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
