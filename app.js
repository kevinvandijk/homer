import dotenv from 'dotenv';
import PlexListener from './listeners/plex';
import hueChannel from './channels/hue';
import PlexChannel from './channels/plex';
import express from 'express';
import bodyParser from 'body-parser';
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

const plexChannel = new PlexChannel(plexOptions, plexClientOptions);
const app = express();

app.use(bodyParser.json());

app.get('/', (req, res) => {
  plexChannel.findShow(req.query.show, {fuzzy: true}).then(tvshow => {
    plexChannel.startShow(tvshow).then(result => {
      res.json({result: result});
    }).catch(error => {
      res.json({error: error});
    });
  }, error => {
    res.json({error: error});
  });
});

// TODO: Figure out way better routes for this and generalize it more:
// Maybe this should go into the homer-alexa app instead since it does number to word mapping
app.get('/api/plex/dictionary', async function(req, res) {
  try {
    const [movies, shows] = await Promise.all([plexChannel.getMovies(), plexChannel.getShows()]);
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

    res.json({media});
  } catch (error) {
    res.json({error: error});
  }
});

app.all('/api/plex/find', async function(req, res) {
  const { name } = req.query;
  const limit = req.query.limit || 3;
  const options = { fuzzy: true, name };
  const media = await plexChannel.findMedia(options);
  if (!media.length) return res.status(404).json(media);

  res.json({ data: media.slice(0, limit) });
});

app.all('/api/plex/play', async function(req, res) {
  const mediaKey = req.query.key;
  const resume = req.query.resume || false;
  let media = await plexChannel.findMedia({ key: mediaKey });
  if (!media.length) {
    return res.status(404).json('Could not find media');
  }

  media = media[0];

  if (media.type === 'show') {
    let episode;

    try {
      episode = await plexChannel.getNextUnwatchedEpisode(media, { partiallySeen: true });
    } catch (err) {
      // Add links to first episode
      return res.status(500).json(err);
    }

    if (episode.viewOffset && !resume) {
      return res.status(500).json({
        error: {
          type: 'partially-watched-episode',
          episode
        }
      });
    }

    try {
      await plexChannel.play({
        mediaKey: episode.key,
        offset: episode.viewOffset
      });

      res.status(200).json('ok');
    } catch (err) {
      return res.status(500).json(err);
    }
  } else {
    res.json(media);
  }
});

const server = app.listen(3000, () => {
  const host = server.address().address;
  const port = server.address().port;

  console.log(`App listening at http://${host}:${port}`);
});



// (function app() {
//   const hue = hueChannel({
//     username: env.HUE_USERNAME
//   });
//
//   const plexListener = new PlexListener(plexOptions);
//   plexListener.on('play', () => hue.turnOff('living'));
//   plexListener.on('pause', () => hue.dim('living', 10));
//   plexListener.on('resume', () => hue.turnOff('living'));
//   plexListener.on('stop', () => hue.turnOn('living'));
// })();
