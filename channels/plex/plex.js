// ÷import PlexApi from 'plex-api';
const PlexApi = require('plex-api');

function findPlayer(name, sessions) {
  let player;
  for (let i in sessions) {
    if (i) {
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
  }

  return player || null;
}

async function getPlayerStatus(connection, device) {
  const sessions = (await connection.query('/status/sessions') || {})._children;
  if (!sessions) return 'stopped';

  const player = findPlayer(device, sessions);
  if (!player) return 'stopped';

  return player.state;
}

export default class PlexController {
  constructor(plexOptions) {
    this.device = plexOptions.device;
    this.connection = new PlexApi(plexOptions);
    this.connection.authToken = plexOptions.authToken;
  }

  status = async () => {
    const state = await getPlayerStatus(this.connection, this.device);
    return state;
  }
}
