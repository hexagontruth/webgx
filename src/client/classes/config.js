import { numberString, merge } from '../util';

export default class Config {
  static DEFAULTS = {
    program: 'default',
    play: true,
    maxDim: null,
    fit: 'cover',
    streamFit: 'cover',
    controlsHidden: false,
    webcamEnabled: false,
    screenshareEnabled: false,
    recordVideo: false,
    recordImages: false,
  };

  static ALIASES = {
    p: 'program',
    d: 'maxDim',
    h: 'controlsHidden',
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

    if (queryObj.test) {
      queryObj.play = false;
    }

    return queryObj;
  }
}