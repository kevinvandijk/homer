import Koa from 'koa';
import convert from 'koa-convert';
import bodyParser from 'koa-bodyparser';
import koaRouter from 'koa-router';

// TODO: Rename this:
import plexRouter from './channels/plex/router';

const router = koaRouter();
const app = new Koa();

app.use(convert(bodyParser()))
   .use(router.routes())
   .use(router.allowedMethods());

router.use('/api/plex', plexRouter.routes());

app.listen(3000, function() {
  console.log('App listening at port 3000');
});
