import dotenv from 'dotenv';
import Plex from './models/plex';
import Promise from 'bluebird';
import numbered from 'numbered';
import plexSerializer from './serializers/plex';

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

// TODO: Figure out way better routes for this and generalize it more:
// Maybe this should go into the homer-alexa app instead since it does number to word mapping
export async function dictionary(ctx) {
  try {
    const [movies, shows] = await Promise.all([plex.getMovies(), plex.getShows()]);
    const media = movies.concat(shows).map(item => {
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

    ctx.body = media;
  } catch (error) {
    ctx.throw(500, error);
  }
}

export async function find(ctx) {
  const name = ctx.query.name;
  const limit = ctx.query.limit || 3;
  const options = { fuzzy: true, name };
  const media = await plex.findMedia(options);

  ctx.body = {
    data: plexSerializer(media.slice(0, limit)),
    meta: {
      total: media.length
    }
  };
}

export async function play(ctx) {
  const mediaKey = ctx.query.key;
  const resume = ctx.query.resume || false;
  let media = await plex.findMedia({ key: mediaKey });
  if (!media.length) {
    ctx.throw(404, 'Could not find media');
  }

  media = media[0];

  if (media.type === 'show') {
    let episode;

    try {
      episode = await plex.getNextUnwatchedEpisode(media, { partiallySeen: true });
    } catch (err) {
      // Add links to first episode
      ctx.throw(500, err);
    }

    if (episode.viewOffset && !resume) {
      ctx.throw(500, {
        error: {
          type: 'partially-watched-episode',
          episode
        }
      });
    }

    try {
      await plex.play({
        mediaKey: episode.key,
        offset: episode.viewOffset
      });

      ctx.status = 200;
    } catch (err) {
      ctx.throw(500, err);
    }
  } else {
    ctx.body = media;
  }
}
