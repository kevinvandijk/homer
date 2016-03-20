import Koa from 'koa';
import convert from 'koa-convert';
import bodyParser from 'koa-bodyparser';
import koaRouter from 'koa-router';
import errorHandler from './middlewares/error-handler';
import bunyanLogger from 'koa-bunyan-logger';
import bunyan from 'bunyan';

// TODO: Rename this:
import plexRouter from './channels/plex/router';

const log = bunyan.createLogger({
  name: 'homer'
});
const router = koaRouter();
const app = new Koa();

app
  .use(convert(bunyanLogger(log)))
  .use(errorHandler)
  .use(convert(bodyParser()))
  .use(router.routes())
  .use(router.allowedMethods());

router.use('/api/plex', plexRouter.routes());

router.all('/api/events/:listener', function(ctx) {
  const listener = ctx.params.listener;
  const name = ctx.request.body.name;
  console.log('event:', listener, name);
});

router.get('/status', function(ctx) {
  ctx.body = "ok";
});

app.listen(3000, function() {
  console.log('App listening at port 3000');
});
