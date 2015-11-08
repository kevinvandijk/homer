require('dotenv').load();
var PlexApi = require('plex-api');

var plexOptions = {
  identifier: '9ffb7743-cbd7-42ab-92fb-334f20ea57e6',
  name: 'Jarvis',
  product: 'Jarvis',
  version: '0.0.1'
};

var plex = new PlexApi({
  hostname: process.env.PLEX_HOST,
  port: process.env.PLEX_PORT,
  username: process.env.PLEX_USERNAME,
  password: process.env.PLEX_PASSWORD,
  authToken: process.env.PLEX_TOKEN,
  options: plexOptions
});
