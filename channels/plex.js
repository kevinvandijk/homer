import PlexApi from 'plex-api';
import Promise from 'bluebird';
import _ from 'lodash';

export default class PlexChannel {
  constructor(plexOptions) {
    this.device = plexOptions.device;

    this.plex = new PlexApi(plexOptions);
    this.plex.authToken = plexOptions.authToken;
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

        resolve(episode);
      }).catch(e => {
        reject(e);
      });
    });
  }
}
