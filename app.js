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
import PlexChannel from './channels/plex';

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


const plexChannel = new PlexChannel();
plexChannel.subscribe(async (state) => {
  const lights = await hue.findLights('desk');

  switch (state.state) {
    case 'playing':
      return hue.turnOff(lights);
    case 'stopped':
      return hue.turnOn(lights);
    case 'paused':
      return hue.turnOn(lights);
  }
});

router.get('/status', function(ctx) {
  ctx.body = "ok";
});

app.listen(3000, function() {
  console.log('App listening at port 3000');
});
