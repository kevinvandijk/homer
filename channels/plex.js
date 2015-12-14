import PlexApi from 'plex-api';
import Promise from 'bluebird';
import _ from 'lodash';

export default class PlexChannel {
  constructor(plexOptions, clientOptions) {
    clientOptions = clientOptions || plexOptions;
    this.device = plexOptions.device;

    this.plex = new PlexApi(plexOptions);
    this.plex.authToken = plexOptions.authToken;
    this.player = new PlexApi(clientOptions);
  }

  play(options) {
    const { mediaKey, offset } = options;
    const server = this.plex;
    const params = {
      machineIdentifier: server.options.machineIdentifier,
      address: server.hostname,
      port: server.port,
      key: mediaKey,
      offset
    };
    const paramsString = Object.keys(params).map(key => {
      return `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`;
    }).join('&');
    const url = `/player/playback/playMedia?${paramsString}`;

    this.player.postQuery(url).then(result => {
      console.log('result');
      console.log(result);
    }, error => {
      console.log('error');
      console.error(error);
    });
  }

  findNextUnwatchedEpisode(episodes, options = {partiallySeen: true}) {
    if (options.partiallySeen) {
      return episodes.find(episode => !!episode.viewOffset || !!!episode.lastViewedAt);
    }
    return _(episodes).find(episode => !!!episode.lastViewedAt);
  }

  getShows() {
    return this.plex.query('/library/sections/2/all');
  }

  getShowEpisodes(show) {
    return this.plex.query(`/library/metadata/${show.ratingKey}/allLeaves`);
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
          this.play({
            mediaKey: episode.key,
            offset: episode.viewOffset || 0
          });
        }
        resolve(episode);
      }).catch(e => {
        reject(e);
      });
    });
  }
}
