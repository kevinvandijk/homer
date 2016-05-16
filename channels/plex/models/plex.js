import PlexApi from 'plex-api';
import Promise from 'bluebird';
import {stringifyParams} from '../../../helpers/url';
import {fuzzySearch, normalSearch} from '../../../helpers/search';

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


  // getShows() {
  //   return Promise.resolve(this.server.query('/library/sections/2/all')).then(results => {
  //     return results._children || [];
  //   });
  // }
  //
  // getMovies() {
  //   return Promise.resolve(this.server.query('/library/sections/4/all')).then(results => {
  //     return results._children || [];
  //   });
  // }

  getEpisodes(showOrKey) {
    const key = (typeof showOrKey === 'object') ? showOrKey.ratingKey : showOrKey;
    return this.server.query(`/library/metadata/${key}/allLeaves`).then(result => result._children || []);
  }

  getFirstEpisode(showOrKey, options = {}) {
    return this.getEpisodes(showOrKey).then(episodes => {
      return episodes[0];
    });
  }

  getCurrentEpisode(showOrKey) {
    return this.getEpisodes(showOrKey).then(episodes => {
      return episodes.find(episode => !!episode.viewOffset || !!!episode.lastViewedAt) || null;
    })
  }

  async getNextEpisode(showOrKey, previousEpisode) {
    previousEpisode = previousEpisode || await this.getCurrentEpisode(showOrKey);
    const episodes = await this.getEpisodes(showOrKey)
    const index = episodes.findIndex(episode => previousEpisode.key === episode.key);

    return episodes[index + 1];
  }

  async getPreviousEpisode(showOrKey, nextEpisode) {
    nextEpisode = nextEpisode || await this.getCurrentEpisode(showOrKey);
    const episodes = await this.getEpisodes(showOrKey);
    const index = episodes.findIndex(episode => nextEpisode.key === episode.key);

    return episodes[index - 1];
  }

  getByKey(key) {
    // Allow for both full key or short id:
    const shortKey = key.replace('/library/metadata/', '');
    return Promise.resolve(this.server.query(`/library/metadata/${key}`)).then(results => {
      return results._children[0];
    }).catch(error => {
      return null;
    });
  }

  findMedia(options = {}) {
    if (!options.name) return Promise.reject(createError('no-name-or-key-specified'));
    const name = options.name;
    // Search movie or show by name:
    return Promise.all([
      this.getMovies(),
      this.getShows()
    ]).then(([shows, movies]) => {
      return shows.concat(movies);
    }).then(media => {
      const results = (options.fuzzy
        ? fuzzySearch(media, name)
        : normalSearch(media, name)
      ) || [];

      // Fuzzysearch can sometimes be a bit weird and return more than necessary
      // if the title is exactly the same as the search term, just return one result:
      return (results[0] && results[0].title.toLowerCase() === name.toLowerCase()
        ? [results[0]]
        : results
      );
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
