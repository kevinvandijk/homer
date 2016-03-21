import dotenv from 'dotenv';
import Koa from 'koa';
import convert from 'koa-convert';
import bodyParser from 'koa-bodyparser';
import koaRouter from 'koa-router';
import errorHandler from './middlewares/error-handler';
import bunyanLogger from 'koa-bunyan-logger';
import bunyan from 'bunyan';
import HueChannel from './channels/hue';

// TODO: Rename this:
import plexRouter from './channels/plex/router';

dotenv.load();

const log = bunyan.createLogger({
  name: 'homer'
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

router.all('/api/events/:listener', async function(ctx) {
  // ALL TEMP ductape:
  const listener = ctx.params.listener;
  const name = ctx.request.body.name;

  if (listener === 'plex' && name === 'playing') {
    const lights = await hue.findLights('desk');
    lights.map(light => {
      hue.setLight(light.id, {on: false});
    });
  }

  if (listener === 'plex' && name === 'stopped') {
    const lights = await hue.findLights('desk');
    lights.map(light => {
      hue.setLight(light.id, {on: true});
    });
  }

  return ctx.body = hue.getState();

  ctx.body = 'ok';
});

router.get('/status', function(ctx) {
  ctx.body = "ok";
});

app.listen(3000, function() {
  console.log('App listening at port 3000');
});
