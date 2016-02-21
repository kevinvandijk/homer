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
  const options = { fuzzy: true, name: ctx.query.name };
  const media = await actions.find(options);

  ctx.body = {
    data: plexSerializer(media.slice(0, limit)),
    meta: {
      total: media.length
    }
  };
}

async function play(ctx) {
  try {
    const episode = await actions.play(ctx.query.key, { resume: ctx.query.resume });
    ctx.body = {
      data: plexSerializer(episode)
    };
  } catch (err) {
    const status = err.message === 'not-found' ? 404 : 412;
    ctx.throw(status, err);
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
