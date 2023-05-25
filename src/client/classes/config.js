import { numberString, merge } from '../util';

export default class Config {
  static defaults = {
    program: 'default',
    autoplay: true,
    maxDim: 0,
    fit: 'cover',
    streamFit: 'cover',
    controlsHidden: false,
    webcamEnabled: false,
    screenShareEnabled: false,
    recordVideo: false,
    recordImages: false,
  };

  static sessionFields = [
    'controlsHidden',
    'fit',
    'streamFit',
    'webcamEnabled',
    'screenShareEnabled',
    'recordImages',
    'recordVideo',
  ];

  static localFields = [];

  static schema = {
    program: 'string',
    autoplay: 'boolean',
    maxDim: 'number',
    fit: 'fit',
    streamFit: 'fit',
    controlsHidden: 'boolean',
    webcamEnabled: 'boolean',
    screenShareEnabled: 'boolean',
    recordVideo: 'boolean',
    recordImages: 'boolean',
  };

  static toggleFns = {
    boolean: (v) => !v,
    fit: (v) => v == 'cover' ? 'contain' : 'cover',
  };

  static queryAliases = {
    p: 'program',
    d: 'maxDim',
    h: 'controlsHidden',
  };

  constructor(app) {
    this.app = app;
    this.localStorage = window.localStorage;
    this.sessionStorage = window.sessionStorage;

    merge(
      this,
      Config.defaults,
      this.retrieveConfig(),
      this.getQueryParams(),
    );
  
    Config.sessionFields.forEach((field) => {
      this.set(field);
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

    return queryObj;
  }
  
  toggle(field) {
    const fn = Config.toggleFns[Config.schema[field]];
    const cur = this[field];
    const next = fn ? fn(cur) : cur;
    this.set(field, next);
    return next;
  }

  set(field, value) {
    value = value ?? this[field];
    if (field == 'screenShareEnabled') {
      this.setScreenShareEnabled(value);
    }
    else if (field == 'webcamEnabled') {
      this.setWebcamEnabled(value);
    }
    else {
      this[field] = value;
      this.storeSessionConfig();
      this.app?.set(field, value);
    }
  }

  setScreenShareEnabled(val) {
    val = val ?? this.screenShareEnabled;
    if (val) {
      navigator.mediaDevices.getDisplayMedia()
      .then((stream) => {
        this.setWebcamEnabled(false);
        this.screenShareEnabled = true;
        this.stream = stream;
        this.storeSessionConfig();
        this.app?.set('screenShareEnabled', true);
      })
      .catch((err) => {
        console.error(err);
        this.setScreenShareEnabled(false);
      });
    }
    else {
      this.screenShareEnabled = false;
      this.stream?.getTracks().forEach((track) => {
        track.readyState == 'live' && track.stop();
      });
      this.stream = null;
      this.storeSessionConfig();
      this.app?.set('screenShareEnabled', val);
    }
  }

  setWebcamEnabled(val) {
    val = val != null ? val : this.webcamEnabled;
    if (val) {
      let constraints = {
        video: { width: 1920},
        audio: false
      };
      navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        this.setScreenShareEnabled(false);
        this.webcamEnabled = true;
        this.stream = stream;
        this.storeSessionConfig();
        this.app?.set('webcamEnabled', true);
      })
      .catch((err) => {
        console.error(err);
        this.setWebcamEnabled(false);
      });
    }
    else {
      this.webcamEnabled = false;
      this.stream?.getTracks()[0].stop();
      this.stream = null;
      this.storeSessionConfig();
      this.app?.set('webcamEnabled', false);
    }
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