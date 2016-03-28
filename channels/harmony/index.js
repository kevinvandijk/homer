import harmony from 'harmonyhubjs-client';

export default class HarmonyChannel {
  async client() {
    // TODO: Find better way for this, pass in or something:
    // TODO: Error handling
    if (!this._connection) this._connection = harmony(process.env.HARMONY_HOST);
    return this._connection;
  }

  // TODO: private?
  async listActivities() {
    const client = await this.client();
    return client.getActivities();
  }

  async startActivity(label) {
    const client = await this.client();
    const activities = await this.listActivities();
    const activity = activities.find(activity => activity.label === label);

    if (!activity) throw new Error('startActivity: No activities found');
    return client.startActivity(activity.id);
  }

  // Turns off everything basically:
  async stopActivity(label) {
    const client = await this.client();
    return client.turnOff();
  }

  // TODO: turnOff, turnOn methods?
}
