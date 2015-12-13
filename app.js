import dotenv from 'dotenv';
import PlexListener from './listeners/plex';
import hueChannel from './channels/hue';
import PlexChannel from './channels/plex';
import express from 'express';

dotenv.load();
const env = process.env;

const plexOptions = {
  hostname: env.PLEX_HOST,
  port: env.PLEX_PORT,
  username: env.PLEX_USERNAME,
  password: env.PLEX_PASSWORD,
  authToken: env.PLEX_TOKEN,
  device: env.PLEX_DEVICE,
  options: {
    identifier: '9ffb7743-cbd7-42ab-92fb-334f20ea57e6',
    name: 'Jarvis',
    product: 'Jarvis',
    version: '0.0.1'
  }
};

const plexChannel = new PlexChannel(plexOptions);
const app = express();

app.get('/', (req, res) => {
  plexChannel.startShow('Homeland').then(tvshows => {
    res.json(tvshows);
  });
  // res.send('Hello World!');
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
