import PlexApi from 'plex-api';
// TODO: This needs to move somewhere else:
import { fuzzySearch, normalSearch } from '../../helpers/search';

function findPlayer(name, sessions) {
  let player;
  for (const i in sessions) {
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

async function getDirectories(connection) {
  const result = await connection.query('/library/sections');
  return (result || {})._children || [];
}

async function listItems(connection, sections) {
  const sectionList = Array.isArray(sections) ? sections : [sections];
  const lists = await Promise.all(sectionList.map(directory => {
    const suffix = directory.type === 'show' ? 'all' : 'all';
    const uri = `${directory.uri}/${suffix}`;
    return connection.query(uri);
  }));

  return lists.map(listItem =>
    (listItem || {})._children || []
  ).reduce((a, b) => a.concat(b));
}

export default class PlexController {
  constructor(plexOptions) {
    this.device = plexOptions.device;
    this.server = new PlexApi(plexOptions);
    this.server.authToken = plexOptions.authToken;
    this.server.identifier = plexOptions.identifier;
    this.commandId = 0;
  }

  status = async () => {
    const state = await getPlayerStatus(this.server, this.device);
    return state;
  }

  search = async (query = '', options = { fuzzy: true }) => {
    const directories = await getDirectories(this.server);
    if (!directories.length) return [];

    const items = await listItems(this.server, directories);
    if (!items.length) return [];

    const results = (options.fuzzy
      ? fuzzySearch(items, query)
      : normalSearch(items, query)
    );

    // Fuzzysearch can sometimes be a bit weird and return more than necessary
    // if the title is exactly the same as the search term, just return one result:
    return (results[0] && results[0].title.toLowerCase() === query.toLowerCase()
      ? [results[0]]
      : results
    );
  }
}
