"use strict";

import dotenv from 'dotenv';
import PlexListener from './listeners/plex';
import hueChannel from './channels/hue';

dotenv.load();
const env = process.env;

const plexOptions = {
  hostname: env.PLEX_HOST,
  port: env.PLEX_PORT,
  username: env.PLEX_USERNAME,
  password: env.PLEX_PASSWORD,
  authToken: env.PLEX_TOKEN,
  options: {
    identifier: '9ffb7743-cbd7-42ab-92fb-334f20ea57e6',
    name: 'Jarvis',
    product: 'Jarvis',
    version: '0.0.1'
  }
};

(function app() {
  const hue = hueChannel({
    username: env.HUE_USERNAME
  });

  const plexListener = new PlexListener(plexOptions);
  plexListener.on('play', () => hue.turnOff('living'));
  plexListener.on('pause', () => hue.turnOn('living'));
  plexListener.on('resume', () => hue.turnOff('living'));
  plexListener.on('stop', () => hue.turnOn('living'));
})();
