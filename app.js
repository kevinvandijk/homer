require('dotenv').load();
var PlexApi = require('plex-api');
var hue = require('node-hue-api');
var HueApi = require('node-hue-api').HueApi;
var Promise = require('bluebird');
var _ = require('underscore');

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

function findPlayer(name, sessions) {
  return new Promise(function(resolve, reject) {
    var player;
    for (var i in sessions) {
      var session = sessions[i];

      if (session._children) {
        var found = _(session._children).findWhere({_elementType: 'Player', title: name});

        if (found) {
          player = found;
          break;
        }
      }
    }

    if (player) {
      resolve(player);
    } else {
      reject();
    }
  });
};

connectHue = function() {
  return new Promise(function(resolve, reject) {
    var doConnect = function(bridges) {
      var bridge = bridges[0];
      var hueApi = new HueApi(bridge.ipaddress, process.env.HUE_USERNAME);
      hueApi.connect().fail(function(err) {
        reject(err);
      }).done(function(config) {
        // console.log('whut', hueApi, config);
        resolve(hueApi, config);
      });
    };

    hue.locateBridges().fail(function() {
      // try via SSDP
      hue.searchForBridges().done(doConnect).fail(reject);
    }).done(doConnect);
  });
};

function findLivingRoom(groups) {
  return _.find(groups, function(group) {
    var matches = group.name.match(/living/i);
    return !!matches;
  });
};

function turnOnLights() {
  console.log('turn on');
  connectHue().then(function(hueApi) {
    hueApi.groups(function(err, groups) {
      if (err) throw new Error('NO GROUPS');

      var livingRoom = findLivingRoom(groups);
      hueApi.setGroupLightState(livingRoom.id, {'on': true});
    });
  });
};

function turnOffLights() {
  console.log('turn off');
  connectHue().then(function(hueApi) {
    hueApi.groups(function(err, groups) {
      if (err) throw new Error('NO GROUPS');

      var livingRoom = findLivingRoom(groups);
      hueApi.setGroupLightState(livingRoom.id, {'on': false});
    });
  });
};

// TODO: fix this shit
var previouslyPlaying = false;

setInterval(function() {
  plex.query('/status/sessions').then(function(result) {
    // Make sure to always have an array, empty or not:
    var sessions = (result || {})._children || [];
    // if (!sessions.length) return;
    findPlayer('Plex Web (Chrome)', sessions).then(function(player) {
      if (player.state === 'playing' && !previouslyPlaying) {
        previouslyPlaying = true;
        turnOffLights();
      } else if (player.state === 'paused' && previouslyPlaying) {
        previouslyPlaying = false;
        turnOnLights();
      }
    }, function() {
      if (previouslyPlaying) {
        previouslyPlaying = false;
        turnOnLights();
      }
    });
  });
}, 1000);
