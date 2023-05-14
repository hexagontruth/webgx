import { numberString, merge } from '../util';

import Dim from './dim';
import Hook from './hook';

export default class Config {
  static schema = {
    program: 'string',
    autoplay: 'boolean',
    maxDim: 'number',
    fit: 'fit',
    mediaFit: 'fit',
    streamFit: 'fit',
    bgColor: 'string',
    guideColor: 'string',
    guidesHidden: 'boolean',
    controlsHidden: 'boolean',
    webcamEnabled: 'boolean',
    screenShareEnabled: 'boolean',
    recordVideo: 'boolean',
    recordImages: 'boolean',
  };

  static defaults = {
    program: 'default',
    autoplay: true,
    maxDim: 0,
    fit: 'contain',
    mediaFit: 'cover',
    streamFit: 'cover',
    bgColor: '#000',
    guideColor: '#f00',
    guidesHidden: true,
    controlsHidden: false,
    webcamEnabled: false,
    screenShareEnabled: false,
    recordVideo: false,
    recordImages: false,
  };

  static sessionFields = [
    'bgColor',
    'guideColor',
    'guidesHidden',
    'controlsHidden',
    'fit',
    'recordImages',
    'recordVideo',
    'screenShareEnabled',
    'webcamEnabled',
  ];

  static localFields = [];

  static radioSets = [
    [
      'webcamEnabled',
      'screenShareEnabled',
    ],
  ];

  static toggleFns = {
    boolean: (v) => !v,
    fit: (v) => v == 'cover' ? 'contain' : 'cover',
  };

  static queryAliases = {
    p: 'program',
    d: 'maxDim',
    h: 'controlsHidden',
  };

  constructor() {
    this.localStorage = window.localStorage;
    this.sessionStorage = window.sessionStorage;

    merge(
      this,
      Config.defaults,
      this.retrieveConfig(),
      this.getQueryParams(),
    );

    this.fields = Object.keys(Config.schema);
    this.testSet = new Hook(this, this.fields);
    this.beforeSet = new Hook(this, this.fields);
    this.afterSet = new Hook(this, this.fields);

    this.radioMap = {};
    Config.radioSets.forEach((set) => {
      set.forEach((key) => {
        this.radioMap[key] = set.filter((e) => e != key);
      });
    });
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

    Object.entries(Config.queryAliases).forEach(([source, target]) => {
      if (queryObj[source] !== undefined) {
        queryObj[target] = queryObj[source];
        delete queryObj[source];
      }
    });

    if (queryObj.test) {
      queryObj.autoplay = false;
    }

    if (window.location.pathname.length > 1) {
      queryObj.program = window.location.pathname;
    }

    return queryObj;
  }
  
  toggle(field) {
    const fn = Config.toggleFns[Config.schema[field]];
    const cur = this[field];
    const next = fn ? fn(cur) : cur;
    this.set(field, next);
    return next;
  }

  put(key, val) {
    this[key] = val;
  }

  async set(key, val) {
    const oldVal = this[key];
    val = val ?? oldVal;

    const test = await this.testSet.testAsync(key, val, oldVal);
    if (!test) return;

    await Promise.all(this.beforeSet.map(key, val, oldVal));

    val && this.radioMap[key] && await Promise.all(this.radioMap[key].map((e) => this.set(e, false)));
    this[key] = val;
    Config.sessionFields.includes(key) && this.storeSessionConfig();

    await Promise.all(this.afterSet.map(key, val, oldVal));
  }

  async setAll() {
    await Promise.all(this.fields.map((key) => {
      return this.set(key);
    }));
  }

  // --- STORAGE ---

  getValues(keys) {
    return Object.fromEntries(keys.map((k) => [k, this[k]]));
  }

  getSessionValues() {
    return this.getValues(Config.sessionFields);
  };

  getLocalValues() {
    return this.getValues(Config.localFields);
  }

  retrieveConfig() {
    const sessionConfig = JSON.parse(this.sessionStorage.getItem('sessionConfig') || '{}');
    const localConfig = JSON.parse(this.localStorage.getItem('localConfig') || '{}');
    return merge({}, localConfig, sessionConfig);
  }

  storeSessionConfig() {
    const config = this.getSessionValues();
    this.sessionStorage.setItem('sessionConfig', JSON.stringify(config));
  }

  storeLocalConfig() {
    let config = this.getLocalValues();
    this.localStorage.setItem('localConfig', JSON.stringify(config));
  }

  clearStorage(session=true, local=false) {
    session && this.sessionStorage.clear();
    local && this.localStorage.clear();
  }
}