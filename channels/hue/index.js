import hue, { HueApi, lightState } from 'node-hue-api';
import Promise from 'bluebird';

export default class HueChannel {
  constructor(config) {
    this._config = config;
    this.connect();
  }

  async connect() {
    if (this._connection) return this._connection;

    const config = this._config;
    const bridges = await Promise.any([hue.nupnpSearch(), hue.upnpSearch()]);
    const bridge = bridges[0];
    const hueApi = new HueApi(bridge.ipaddress, config.username);
    const hueConfig = await hueApi.config();

    if (hueConfig.ipaddress) {
      this._connection = hueApi;
      return this._connection;
    } else {
      throw new Error('Could not connect to hue');
    }
  }

  async getState() {
    const hue = await this.connect();
    return hue.getFullState();
  }

  async findGroup(name) {
    const hue = await this.connect();
    const groups = await hue.groups();
  }

  async findLights(name) {
    const hue = await this.connect();
    const lights = (await hue.lights()).lights;

    if (!name || !name.length) return lights;

    return lights.filter(light => {
      const regex = new RegExp(name, 'gi');
      return regex.test(light.name);
    });
  }

  async setLight(id, state) {
    const hue = await this.connect();
    return hue.setLightState(id, state);
  }

  async setLights(ids, state) {
    return ids.map(id => this.setLight(id, state));
  }
}
