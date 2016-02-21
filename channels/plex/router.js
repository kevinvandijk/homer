import router from 'koa-router';
import * as controller from './controller';

export default router()
  .get('/dictionary', controller.dictionary)
  .get('/find', controller.find)
  .get('/play', controller.play);
