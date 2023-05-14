const fs = require('fs');
const process = require('process');
const pth = require('path');

const yaml = require('yaml');

const util = require('./util');

const DEFAULT_ENV = 'development';

let serverCongigFilepath = process.env.config ||
  (fs.existsSync('user/server.yml') ? 'user/server.yml' : 'config/server.yml');
let mimeTypesFilepath = 'config/mime_types.yml';

class Config {
  constructor() {
    let env = process.env.env || DEFAULT_ENV;
    let rootConfig = getYamlFile(serverCongigFilepath);
    util.merge(this, rootConfig.default, rootConfig[env], {env});
    this.mimeTypes = getYamlFile(mimeTypesFilepath);
  }
}

function getYamlFile(filename) {
  let text = fs.readFileSync(util.join(filename), 'utf8');
  let obj = yaml.parse(text);
  return obj;
}

module.exports = new Config();
