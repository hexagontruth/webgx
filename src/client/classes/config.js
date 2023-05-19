import { numberString, merge } from '../util';

export default class Config {
  static DEFAULTS = {
    program: 'default',
    play: true,
    dim: null,
  };

  static ALIASES = {
    p: 'program',
    d: 'dim',
  };

  constructor() {
    merge(
      this,
      Config.DEFAULTS,
      this.getQueryParams(),
    );
  }

  getQueryParams() {
    const queryString = window.location.search.replaceAll('?', '');
    const queryObj = Object.fromEntries(queryString.split('&').map((prop) => {
      let [key, value] = prop.split('=').map((e) => typeof e == 'string' ? e.trim() : e);
      value = numberString(value);
      if (value === undefined) {
        value = true;
      }
      else if (value === 'null') {
        value = null;
      }
      return [key, value];
    }));

    Object.entries(Config.ALIASES).forEach(([source, target]) => {
      if (queryObj[source] !== undefined) {
        queryObj[target] = queryObj[source];
        delete queryObj[source];
      }
    });

    return queryObj;
  }
}