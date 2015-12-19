import AlexaAppServer from 'alexa-app-server';

export default function start() {
  const server = new AlexaAppServer({
    port: 3001,
    debug: true,
    server_root: __dirname
  });

  server.start();
  server.express.use('/test',function(req,res){ res.send("OK"); });

  return server;
};
