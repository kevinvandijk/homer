import PlexApi from 'plex-api';
import fetch from 'node-fetch';

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

const plex = new PlexApi(plexOptions);
let state;

// Statuses: buffering / paused / stopped / playing
async function transitionState(nextState) {
  console.log(nextState);
  const prevState = state;

  if (prevState === nextState) return;
  state = nextState;

  const headers = { 'Content-Type': 'application/json' };
  const body = JSON.stringify({ name: state });
  const result = await fetch(`${env.API_URL}/api/events/plex`, { method: 'POST', body, headers });


  if (result.status !== 200) {
    // TODO: Add more details to error
    throw new Error('Error connecting to api');
  }

  return result.json();
}

function findPlayer(name, sessions) {
  let player;

  for (let i in sessions) {
    const session = sessions[i];

    if (session._children) {
      // console.log(session._children);
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

async function getPlayerState() {
  const sessions = (await plex.query('/status/sessions') || {})._children;
  if (!sessions) return 'stopped';

  const player = findPlayer(env.PLEX_DEVICE, sessions);
  if (!player) return 'stopped';

  return player.state;
}

async function listener() {
  try {
    const state = await getPlayerState();
    await transitionState(state);
  } catch (e) {
    console.log('Error', e);
  }

  setTimeout(listener, 1000);
};

listener();
