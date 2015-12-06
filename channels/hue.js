"use strict";

import hue, {HueApi} from 'node-hue-api';
import Promise from 'bluebird';

function connectHue(options) {
  return new Promise(function(resolve, reject) {
    const doConnect = function(bridges) {
      const bridge = bridges[0];
      const hueApi = new HueApi(bridge.ipaddress, process.env.HUE_USERNAME);
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

function findLightsByGroup(name, connection) {
  return connection.then(hueApi => {
    return new Promise((resolve, reject) => {
      hueApi.groups((err, groups) => {
        if (err) return reject();

        const filteredGroups = groups.filter(group => {
          const regex = new RegExp(name, 'gi');
          return regex.test(group.name);
        });

        resolve({
          groups: filteredGroups,
          hueApi
        });
      });
    });
  });
};

export default function(options) {
  const connection = connectHue(options);

  return {
    turnOn(groupName) {
      findLightsByGroup(groupName, connection).then((result) => {
        result.groups.forEach(group => {
          result.hueApi.setGroupLightState(group.id, {'on': true});
        });
      });
    },

    turnOff(groupName) {
      findLightsByGroup(groupName, connection).then((result) => {
        result.groups.forEach(group => {
          result.hueApi.setGroupLightState(group.id, {'on': false});
        });
      });
    }
  };
};
