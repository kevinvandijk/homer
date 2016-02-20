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
        if (resume || !episode.viewOffset) {
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
          }).then(response => {
            res.json(response);
          });
        } else {
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
        }
      }).catch(error => {
        if (error.type === 'no-unwatched-episode-found') {
          const response = {
            type: 'no-unwatched-episode',
            media: {
              title: media.title,
              key: media.key
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

        if (resume || restart || !movie.viewOffset) {
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
          }).then(response => {
            res.json(response);
          });
        } else {
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
        }
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
