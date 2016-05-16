import dotenv from 'dotenv';
import Koa from 'koa';
import convert from 'koa-convert';
import bodyParser from 'koa-bodyparser';
import koaRouter from 'koa-router';
import errorHandler from './middlewares/error-handler';
import bunyanLogger from 'koa-bunyan-logger';
import bunyan from 'bunyan';
import configureStore from './configure-store';
import reducer, { waitOnAction } from './reducer';

// TODO: Rename this:
import plexRouter from './channels/plex/router';

dotenv.load();

const log = bunyan.createLogger({
  name: 'homer',
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

router.get('/status', (ctx) => {
  ctx.body = 'ok';
});


// After importing all reducers and sagas and actions and stuff, fire a global
// CONNECT type of action, to which all others are listening and will set their connections
// in state at one point
const store = configureStore(reducer);
const config = {}; // TODO: Read configs
store.dispatch({
  config,
  type: 'homer/request_connectors',
});

router.post('/action', async (ctx) => {
  const { type, waitOn, payload } = ctx.request.body;
  store.dispatch({ type, payload });

  if (waitOn) {
    const result = await waitOnAction(store, waitOn);
    ctx.body = result.payload;
  } else {
    ctx.status = 202;
  }
});

app.listen(3000, () => {
  console.log('App listening at port 3000');
});
