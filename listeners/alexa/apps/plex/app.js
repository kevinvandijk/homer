import alexa from 'alexa-app';

const app = new alexa.app('plex');

app.pre = function(req, res, type) {
  if (process.env.ALEXA_APP_ID) {
    if (req.sessionDetails.application.applicationId !== `amzn1.echo-sdk-ams.app.${process.env.ALEXA_APP_ID}`) {
      res.send();
    }
  }
};

export default app;
