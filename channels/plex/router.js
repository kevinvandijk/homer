import router from 'koa-router';
import plexSerializer from './serializers/plex';
import * as actions from './actions';

export default router()
  .get('/dictionary', dictionary)
  .get('/find', find)
  .get('/play', play)
  .get('/stop', stop)
  .get('/pause', pause);

// TODO: Figure out way better routes for this and generalize it more:
// Maybe this should go into the homer-alexa app instead since it does number to word mapping
async function dictionary(ctx) {
  ctx.body = {
    data: await actions.getDictionary()
  };
}

async function find(ctx) {
  const limit = ctx.query.limit || 3;
  const options = { fuzzy: true, name: ctx.query.name, limit };
  const media = await actions.find(options);

  ctx.body = {
    data: plexSerializer(media.data),
    meta: {
      ...media.meta
    }
  };
}

async function play(ctx) {
  try {
    const episode = await actions.play(ctx.query.id, { resume: ctx.query.resume });
    ctx.body = {
      data: plexSerializer(episode)
    };
  } catch (err) {
    if (err.message === 'partially-watched' && err.meta.media.type === 'show') {
      const nextEpisode = await actions.findNextEpisode(err.meta.media);
      const error = new Error(err.message);

      if (nextEpisode) {
        error.meta = {
          nextEpisode
        };
      }

      ctx.throw(412, error);
    } else {
      const status = err.message === 'not-found' ? 404 : 412;
      ctx.throw(status, err);
    }
  }
}

async function stop(ctx) {
  await actions.stop();
  ctx.status = 200;
}

async function pause(ctx) {
  await actions.pause();
  ctx.status = 200;
}
