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
import path from 'path';

dotenv.load();

const log = bunyan.createLogger({
  name: 'homer',
});
const store = configureStore(reducer);
const router = koaRouter();
const app = new Koa();

app
  .use(convert(bunyanLogger(log)))
  .use(errorHandler)
  .use(convert(bodyParser()))
  .use(router.routes())
  .use(router.allowedMethods());

// Autoloading channels:
const packageJSON = require(path.join(__dirname, 'package.json'));
const channels = Object.keys(packageJSON.dependencies).filter(
  name => name.match(/^homer-channel-/)
);

// TODO: Refactor:
const channelHelpers = {
  waitForAction: (actionType) => (waitOnAction(store, actionType)),
};

channels.forEach(fullName => {
  // // TODO: Replace object with function for state for channel
  const channel = require(fullName)({}, store.dispatch);
  const channelName = fullName.replace(/^homer-channel-/, '');

  if (channel.router) {
    const channelRouter = (typeof channel.router === 'function'
      ? channel.router(channelHelpers)
      : channel.router
    );

    router.use(
      `/api/channel/${channelName}`,
      channelRouter.routes(),
      channelRouter.allowedMethods()
    );
  }
});

// After importing all reducers and sagas and actions and stuff, fire a global
// CONNECT type of action, to which all others are listening and will set their connections
// in state at one point
const config = {}; // TODO: Read configs
store.dispatch({
  config,
  type: 'homer/request_connectors',
});

app.listen(3000, () => {
  console.log('App listening at port 3000');
});
