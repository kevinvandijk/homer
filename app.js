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
  const {name, key} = req.body;
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
  }).then(data => {
    res.json(data);
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
