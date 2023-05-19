import { merge } from '../util';

export default class Config {
  static DEFAULTS = {
    program: 'default',
    play: true,
    dim: null,
  };

  constructor() {
    merge(this, Config.DEFAULTS);
  }
}