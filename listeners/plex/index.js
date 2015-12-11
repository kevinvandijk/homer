"use strict";

import PlexApi from 'plex-api';
import Promise from 'bluebird';

export default class PlexWatcher {
  constructor(plexOptions) {
    this.state = '';
    this.device = plexOptions.device;
    delete plexOptions.device;

    const plex = new PlexApi(plexOptions);
    this._eventListeners = [];

    this._startListener(plex);
  }

  on(action, callback) {
    this._eventListeners.push({
      action,
      callback
    });
  }

  off(action, callback) {
    this._eventListeners = this._eventListeners.filter((listener) => {
      if (!callback) {
        return action !== listener.action;
      } else {
        return !(action === listener.action && callback === listener.callback);
      }
    });
  }

  trigger(action) {
    this._eventListeners.forEach(listener => {
      if (listener.action === action) {
        listener.callback(action);
      }
    });
  }

  _findPlayer(name, sessions) {
    let player;

    for (let i in sessions) {
      const session = sessions[i];

      if (session._children) {
        const playerRegex = new RegExp(name, 'i');
        const found = session._children.filter(child =>
          child._elementType == 'Player' && playerRegex.test(child.title)
        );

        if (found.length) {
          player = found[0];
          break;
        }
      }
    }

    return player || null;
  }

  _transitionTo(nextState) {
    const prevState = this.state || 'stopped';

    if (prevState === nextState) return;

    let action;

    if (prevState === 'paused' && nextState === 'playing') {
      action = 'resume';
    } else {
      const actions = {
        'stopped': 'stop',
        'paused': 'pause',
        'playing': 'play'
      };
      action = actions[nextState];
    }

    if (action) {
      this.state = nextState;
      this.trigger(action);
    }
  }

  _startListener(plex) {
    setInterval(() => {
      plex.query('/status/sessions')
        .then(this._findActiveSession.bind(this))
        .then(player => this._transitionTo(player.state))
        .catch(function(e) {
          console.log('Something went wrong', e);
        });
    }, 500);
  }

  _findActiveSession(result = {}) {
    const sessions = result._children || [];

    if (!sessions.length) {
      // console.warn('No sessions found');
      return Promise.resolve({state: 'stopped'});
    }

    const player = this._findPlayer(this.device, sessions);

    if (!player) {
      // console.warn('No active player found');
      return Promise.resolve({state: 'stopped'});
    } else {
      return Promise.resolve(player);
    }
  }
}
