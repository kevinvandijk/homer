import dotenv from 'dotenv';
import Koa from 'koa';
import convert from 'koa-convert';
import bodyParser from 'koa-bodyparser';
import koaRouter from 'koa-router';
import errorHandler from './middlewares/error-handler';
import bunyanLogger from 'koa-bunyan-logger';
import bunyan from 'bunyan';
import HueChannel from './channels/hue';
import configureStore from './configure-store';
import reducer from './reducer';

// TODO: Rename this:
import plexRouter from './channels/plex/router';

dotenv.load();
// import PlexChannel from './channels/plex';
import HarmonyChannel from './channels/harmony';

const log = bunyan.createLogger({
  name: 'homer',
});
const router = koaRouter();
const app = new Koa();
const hue = new HueChannel({ username: process.env.HUE_USERNAME });

app
  .use(convert(bunyanLogger(log)))
  .use(errorHandler)
  .use(convert(bodyParser()))
  .use(router.routes())
  .use(router.allowedMethods());

router.use('/api/plex', plexRouter.routes());


// const plexChannel = new PlexChannel();
// plexChannel.subscribe(async (state) => {
//   const lights = await hue.findLights('desk');
//
//   switch (state.state) {
//     case 'playing':
//       return hue.turnOff(lights);
//     case 'stopped':
//       return hue.turnOn(lights);
//     case 'paused':
//       return hue.turnOn(lights);
//     default:
//       return hue;
//   }
// });

router.get('/status', (ctx) => {
  ctx.body = 'ok';
});

router.all('/api/power/on', async (ctx) => {
  // TODO: Remove default value:
  const device = ctx.request.body.device || 'tv';

  if (device.match(/tv|television/i)) {
    const harmonyChannel = new HarmonyChannel();
    ctx.body = await harmonyChannel.startActivity('TV');
  }

  ctx.status = 200;
});

router.all('/api/power/off', async (ctx) => {
  // TODO: Remove default value:
  const device = ctx.request.body.device || 'tv';

  if (device.match(/tv|television/i)) {
    const harmonyChannel = new HarmonyChannel();
    ctx.body = await harmonyChannel.stopActivity('TV');
  }

  ctx.status = 200;
});


// After importing all reducers and sagas and actions and stuff, fire a global
// CONNECT type of action, to which all others are listening and will set their connections
// in state at one point
const store = configureStore(reducer);

router.all('/connect', ctx => {
  const config = {}; // TODO: Read configs
  store.dispatch({
    config,
    type: 'homer/request_connectors',
  });
  ctx.body = store.getState();
  ctx.status = 200;
});

import { updateStatus } from './channels/plex/actions';

router.all('/update', ctx => {
  const config = {}; // TODO: Read configs
  store.dispatch({type: 'homer/plex/PLAY'});
  ctx.body = store.getState();
  ctx.status = 200;
});

router.all('/store', ctx => {
  setTimeout(() => {
    store.dispatch({ type: 'SOMETHING' });
    console.log(store.getState());
  }, 5000);
  ctx.body = store.getState();
});

app.listen(3000, () => {
  console.log('App listening at port 3000');
});
