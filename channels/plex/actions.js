import dotenv from 'dotenv';
import Plex from './models/plex';
import Promise from 'bluebird';
import numbered from 'numbered';

dotenv.load();
const env = process.env;

const plexOptions = {
  hostname: env.PLEX_SERVER_HOST,
  port: env.PLEX_SERVER_PORT,
  username: env.PLEX_SERVER_USERNAME,
  password: env.PLEX_SERVER_PASSWORD,
  authToken: env.PLEX_SERVER_TOKEN,
  device: env.PLEX_DEVICE,
  options: {
    identifier: '9ffb7743-cbd7-42ab-92fb-334f20ea57e6',
    name: 'Jarvis',
    product: 'Jarvis',
    version: '0.0.1',
    machineIdentifier: env.PLEX_SERVER_IDENTIFIER
  }
};

const plexClientOptions = {
  hostname: env.PLEX_PLAYER_HOST,
  port: env.PLEX_PLAYER_PORT,
  options: {
    identifier: '9ffb7743-cbd7-42ab-92fb-334f20ea57e6',
    name: 'Jarvis',
    product: 'Jarvis',
    version: '0.0.1'
  }
};

const plex = new Plex(plexOptions, plexClientOptions);

export async function getDictionary() {
  const [movies, shows] = await Promise.all([plex.getMovies(), plex.getShows()]);
  return movies.concat(shows).map(item => {
    let title = item.title.toLowerCase();
    // Remove anything between parenthesis () in the end of the title, like (2010) and stuff
    title = title.replace(/\(.+\)\s*$/, '');
    // Replace non-word characters at the beginning of the title because Alexa can't handle those
    title = title.replace(/^\W/, '');
    // Replace semicolons and the like, Alexa can't handle those either
    title = title.replace(/:|;|,/g, '');
    // Try to replace dots that are not used as an abbreviation:
    title = title.replace(/(\.)\w/g, function($0) {
      return $0.replace('.', '');
    });
    // Replace ampersands with words:
    title = title.replace('&', 'and');
    // Remove weird hyphens and replace with normal ones:
    title = title.replace(/–|·/g, '-');
    // Regex info: http://stackoverflow.com/questions/13636997/extract-all-numbers-from-string-in-javascript
    title = title.replace(/([-+]?\d+(\.\d+)?)/g, function($0) {
      return numbered.stringify($0);
    });

    return title.trim();
  });
}

export async function find(options) {
  return plex.findMedia(options);
}

export async function play(key, options = {}) {
  if (!key) throw new Error('no-key-specified');
  const resume = options.resume || false;

  let media = await plex.findMedia({ key: key });
  if (!media.length) throw new Error('not-found');

  media = media[0];

  if (media.type === 'show') {
    return playShow(media, resume);
  }
}

async function playShow(media, resume) {
  const episode = await plex.getNextUnwatchedEpisode(media, { partiallySeen: true });

  if (episode.viewOffset && !resume) {
    throw new Error('partially-watched');
  }

  await plex.play({
    mediaKey: episode.key,
    offset: episode.viewOffset
  });

  return episode;
}

export async function stop() {
  return plex.stop();
}

export async function pause() {
  return plex.pause();
}
