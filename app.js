import dotenv from 'dotenv';
import PlexListener from './listeners/plex';
import hueChannel from './channels/hue';
import PlexChannel from './channels/plex';
import express from 'express';
import bodyParser from 'body-parser';
import Promise from 'bluebird';

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


app.all('/api/plex/start', (req, res) => {
  const {name, key, resume, nextEpisode, restart} = req.body;
  const options = {fuzzy: true, name, key};

  plexChannel.findMedia(options).then(media => {
    if (!media.length) return Promise.reject({type: 'no-media-found'});

    const {title, type, ratingKey: key, studio} = media[0];
    const data = {title, type, key, studio};

    if (media.length > 1) {
      const error = {
        type: 'not-certain',
        suggestion: data
      };

      return Promise.reject(error);
    } else {
      return Promise.resolve(data);
    }
  }).then(media => {
    if (media.type === 'show') {
      // find next unwatched episode
      // if next unwatched is partially watched: ask to resume or to start next episode
      // if next unwatched not watched: start
      // if no unwatched episodes available: ask to restart series

      // TODO: Build way to get episode by key instead of hacky partiallySeen hack
      const options = {
        partiallySeen: !!!nextEpisode // Next episode should not be partially watched, so this works for now
      };

      const method = (restart ? 'getFirstEpisode' : 'getNextUnwatchedEpisode');

      plexChannel[method].apply(plexChannel, [media.key, options]).then(episode => {
        if (episode.viewOffset && !resume) {
          const error = {
            type: 'partially-watched-episode',
            media: {
              title: episode.title,
              type: episode.type,
              key: episode.ratingKey,
              episode: episode.index,
              season: episode.parentIndex,
              originallyAvailableAt: episode.originallyAvailableAt,
              show: media.title,
              showKey: media.key
            }
          };

          res.status(422).json(error);
        } else {
          // play it
          return plexChannel.play({
            mediaKey: episode.key,
            offset: episode.viewOffset || 0
          }).then(result => {
            return {
              status: 'playing',
              media: {
                title: episode.title,
                type: episode.type,
                key: episode.ratingKey,
                episode: episode.index,
                season: episode.parentIndex,
                originallyAvailableAt: episode.originallyAvailableAt,
                show: media.title,
                showKey: media.key
              }
            };
          });
        }
      }).then(response => {
        res.json(response);
      }).catch(error => {
        if (error.type === 'no-unwatched-episode-found') {
          const response = {
            type: 'no-unwatched-episode',
            media: {
              show: media.title,
              showKey: media.key
            }
          };

          res.status(422).json(response);
        } else {
          res.status(500).json('Error');
        }
      });
    } else if (media.type === 'movie') {
      // see if movie was previously partially watched
      // if so: ask to resume or to restart
      // if not: start
      plexChannel.findMovie({key: media.key}).then(results => {
        const movie = results[0];

        if (movie.viewOffset && (!resume || !restart)) {
          const error = {
            type: 'partially-watched-movie',
            media: {
              title: movie.title,
              type: movie.type,
              key: movie.ratingKey,
              originallyAvailableAt: movie.originallyAvailableAt
            }
          };

          res.status(422).json(error);
        } else {
          return plexChannel.play({
            mediaKey: movie.key,
            offset: (restart ? 0 : movie.viewOffset || 0)
          }).then(result => {
            return {
              status: 'playing',
              media: {
                title: movie.title,
                type: movie.type,
                key: movie.ratingKey,
                originallyAvailableAt: movie.originallyAvailableAt
              }
            };
          });
        }
      }).then(response => {
        res.json(response);
      }).catch(error => {
        res.status(500).json(error);
      });
    }

    // after starting, see if hue is on, if so, ask if it should be turned off or dimmed
  }).catch(error => {
    let code = 400;

    switch (error.type) {
      case 'no-media-found':
        code = 404;
    }

    res.status(code).json(error);
  });
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
