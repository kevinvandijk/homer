import PlexApi from 'plex-api';

const env = process.env;

const plexOptions = {
  hostname: env.PLEX_SERVER_HOST,
  port: env.PLEX_SERVER_PORT,
  username: env.PLEX_SERVER_USERNAME,
  password: env.PLEX_SERVER_PASSWORD,
  authToken: env.PLEX_SERVER_TOKEN,
  options: {
    identifier: '9ffb7743-cbd7-42ab-92fb-334f20ea57e6',
    name: 'Jarvis',
    product: 'Jarvis',
    version: '0.0.1',
    machineIdentifier: env.PLEX_SERVER_IDENTIFIER
  }
};

function findPlayer(name, sessions) {
  let player;

  for (let i in sessions) {
    const session = sessions[i];

    if (session._children) {
      const playerRegex = new RegExp(name, 'i');
      const found = session._children.filter(child =>
        child._elementType === 'Player' && playerRegex.test(child.title)
      );

      if (found.length) {
        player = found[0];
        break;
      }
    }
  }

  return player || null;
}

async function getPlayerState(connection) {
  const sessions = (await connection.query('/status/sessions') || {})._children;
  if (!sessions) return { state: 'stopped' };

  const player = findPlayer(env.PLEX_DEVICE, sessions);
  if (!player) return { state: 'stopped' };

  return player;
}

function runCallbacks(state = {}, subscribers = []) {
  subscribers.map(subscriber => subscriber.call(subscriber, state));
}

export default class PlexChannel {
  _subscribers = []
  _state = {}

  constructor() {
    this.connection = new PlexApi(plexOptions);
  }

  hasSubscribers() {
    return !!this._subscribers.length;
  }

  subscribe(callback) {
    this._subscribers.push(callback);
    this._listen();
  }

  unsubscribe(callback) {
    this._subscribers = this._subscribers.filter(cb => {
      return cb !== callback;
    });
  }

  _listen = async () => {
    if (this.hasSubscribers()) {
      try {
        // TEmp until something better:
        const state = await getPlayerState(this.connection);
        // console.log(state.state);
        if (state.state !== this.previousState) {
          this.previousState = state.state;
          runCallbacks(state, this._subscribers);
        }
      } catch (e) {
        console.log('ERROR', e);
      }

      setTimeout(this._listen, 1000);
    }
  }
}
