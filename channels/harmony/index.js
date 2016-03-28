import harmony from 'harmonyhubjs-client';

export default class HarmonyChannel {
  async client() {
    // TODO: Find better way for this, pass in or something:
    // TODO: Error handling
    return harmony(process.env.HARMONY_HOST);
  }

  async listActivities() {
    const client = await this.client();
    return client.getActivities();
  }

  async startActivity(id) {
    const client = await this.client();
    return client.startActivity(id);
  }
}
