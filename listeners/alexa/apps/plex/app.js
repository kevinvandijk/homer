import alexa from 'alexa-app';

export const events = {
  _eventListeners: [],

  on(action, callback) {
    this._eventListeners.push({
      action,
      callback
    });
  },

  off(action, callback) {
    this._eventListeners = this._eventListeners.filter((listener) => {
      if (!callback) {
        return action !== listener.action;
      } else {
        return !(action === listener.action && callback === listener.callback);
      }
    });
  },

  trigger(action, options) {
    this._eventListeners.forEach(listener => {
      if (listener.action === action) {
        listener.callback(options);
      }
    });
  }
};

const app = new alexa.app('plex');

app.pre = function(req, res, type) {
  if (process.env.ALEXA_APP_ID) {
    if (req.sessionDetails.application.applicationId !== `amzn1.echo-sdk-ams.app.${process.env.ALEXA_APP_ID}`) {
      res.send();
    }
  }
};

app.intent('startShow', {
  'utterances': ['my name is henk']
}, (req, res) => {
  res.say('Starting a show');
});



export default app;
