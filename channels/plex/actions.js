export const UPDATE_STATUS = 'homer/plex/UPDATE_STATUS';

export const SEARCH_MEDIA_REQUEST = 'homer/plex/SEARCH_MEDIA_REQUEST';
export const SEARCH_MEDIA_SUCCESS = 'homer/plex/SEARCH_MEDIA_SUCCESS';
export const SEARCH_MEDIA_FAILURE = 'homer/plex/SEARCH_MEDIA_FAILURE';

export const PLAYER_REQUEST = 'homer/plex/PLAYER_REQUEST';
export const PLAYER_SUCCESS = 'homer/play/PLAYER_SUCCESS';
export const PLAYER_FAILURE = 'homer/play/PLAYER_FAILURE';


export function updateStatus(id, status) {
  return {
    id,
    status,
    type: UPDATE_STATUS,
  };
}

export function searchMedia(id, title) {
  return {
    payload: {
      id,
      title,
    },
    type: SEARCH_MEDIA_REQUEST,
  };
}

export function searchMediaSuccess(id, query, results) {
  return {
    payload: {
      id,
      results,
      query,
    },
    type: SEARCH_MEDIA_SUCCESS,
  };
}

export function searchMediaFailure(id, error) {
  return {
    payload: {
      id,
      error,
    },
    type: SEARCH_MEDIA_FAILURE,
  };
}

export function playerSuccess(id, results) {
  return {
    payload: {
      id,
      results,
    },
    type: PLAYER_SUCCESS,
  };
}

export function playerFailure(id, error) {
  return {
    payload: {
      id,
      error,
    },
    type: PLAYER_FAILURE,
  };
}
export function play(id, key, offset = 0) {
  return {
    payload: {
      id,
      key,
      offset,
      command: 'playMedia',
    },
    type: PLAYER_REQUEST,
  };
}

function createPlayerAction(command) {
  return (id) => (
    {
      payload: {
        id,
        command,
      },
      type: PLAYER_REQUEST,
    }
  );
}

export const pause = createPlayerAction('pause');
export const resume = createPlayerAction('play');
export const stop = createPlayerAction('stop');
export const rewind = createPlayerAction('rewind');
export const stepBack = createPlayerAction('stepBack');
export const bigStepBack = createPlayerAction('bigStepBack');
export const fastForward = createPlayerAction('fastForward');
export const stepForward = createPlayerAction('stepForward');
export const bigStepForward = createPlayerAction('bigStepForward');
export const skipNext = createPlayerAction('skipNext');
export const skipPrevious = createPlayerAction('skipPrevious');





// // END NEW

//
// import dotenv from 'dotenv';
// import Plex from './models/plex';
// import Promise from 'bluebird';
// import numbered from 'numbered';
//
// dotenv.load();
// const env = process.env;
//
// const plexOptions = {
//   hostname: env.PLEX_SERVER_HOST,
//   port: env.PLEX_SERVER_PORT,
//   username: env.PLEX_SERVER_USERNAME,
//   password: env.PLEX_SERVER_PASSWORD,
//   authToken: env.PLEX_SERVER_TOKEN,
//   device: env.PLEX_DEVICE,
//   options: {
//     identifier: '9ffb7743-cbd7-42ab-92fb-334f20ea57e6',
//     name: 'Jarvis',
//     product: 'Jarvis',
//     version: '0.0.1',
//     machineIdentifier: env.PLEX_SERVER_IDENTIFIER
//   }
// };
//
// const plexClientOptions = {
//   hostname: env.PLEX_PLAYER_HOST,
//   port: env.PLEX_PLAYER_PORT,
//   options: {
//     identifier: '9ffb7743-cbd7-42ab-92fb-334f20ea57e6',
//     name: 'Jarvis',
//     product: 'Jarvis',
//     version: '0.0.1'
//   }
// };
//
// const plex = new Plex(plexOptions, plexClientOptions);
//
// export async function getDictionary() {
//   const [movies, shows] = await Promise.all([plex.getMovies(), plex.getShows()]);
//   return movies.concat(shows).map(item => {
//     let title = item.title.toLowerCase();
//     // Remove anything between parenthesis () in the end of the title, like (2010) and stuff
//     title = title.replace(/\(.+\)\s*$/, '');
//     // Replace non-word characters at the beginning of the title because Alexa can't handle those
//     title = title.replace(/^\W/, '');
//     // Replace semicolons and the like, Alexa can't handle those either
//     title = title.replace(/:|;|,|\/|\\/g, '');
//     // Try to replace dots that are not used as an abbreviation:
//     title = title.replace(/(\.)\w/g, function($0) {
//       return $0.replace('.', '');
//     });
//     // Replace ampersands with words:
//     title = title.replace('&', 'and');
//     // Remove weird hyphens and replace with normal ones:
//     title = title.replace(/–|·/g, '-');
//     // Alexa does not permit spaces with hyphens
//     title = title.replace(' - ', ' ');
//     // Regex info: http://stackoverflow.com/questions/13636997/extract-all-numbers-from-string-in-javascript
//     title = title.replace(/([-+]?\d+(\.\d+)?)/g, function($0) {
//       return numbered.stringify($0);
//     });
//
//     return title.trim();
//   });
// }
//
// export async function find(options) {
//   const limit = options.limit;
//
//   // Convert numbered words into numbers for search
//   const name = options.name.split(' ').map(word => {
//     return numbered.parse(word) || word;
//   }).join(' ');
//
//   const media = await plex.findMedia({
//     ...options,
//     name
//   });
//
//   const data = await Promise.all(
//     (limit ? media.slice(0, limit) : media).map(async (item) => {
//       if (item.type === 'show') {
//         const currentEpisode = await plex.getCurrentEpisode(item);
//         if (currentEpisode) {
//           const nextEpisode = { nextEpisode: await plex.getNextEpisode(item) };
//
//           return {
//             ...item,
//             meta: {
//               currentEpisode,
//               ...nextEpisode
//             }
//           };
//         }
//       }
//
//       return item;
//     })
//   );
//
//   return {
//     data,
//     meta: {
//       total: media.length
//     }
//   };
// }
//
// export async function play(key, options = {}) {
//   if (!key) throw new Error('no-key-specified');
//
//   const media = await plex.getByKey(key);
//
//   if (!media) throw new Error('not-found');
//   if (media.type === 'show') throw new Error('show-not-playable-choose-episode');
//
//   const viewOffset = options.restart ? 0 : media.viewOffset || 0;
//
//   await plex.play({
//     mediaKey: media.key,
//     offset: viewOffset
//   });
//
//   return media;
// }
//
// export async function findNextEpisode(media, options = {}) {
//   return plex.getNextUnwatchedEpisode(media, options);
// }
//
// export async function stop() {
//   return plex.stop();
// }
//
// export async function pause() {
//   return plex.pause();
// }
