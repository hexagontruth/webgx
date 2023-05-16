const fs = require('fs');
const { join } = require('path');
const process = require('process');

const yaml = require('yaml');

const util = require('./util');

const env = process.env.NODE_ENV || 'development';

const envFile = `.env.${env}`;

require('dotenv').config({ path: join(__dirname, '../..', envFile) });

let serverCongigFilepath = env.CONFIG ||
  (fs.existsSync('user/server.yml') ? 'user/server.yml' : 'config/server.yml');
let mimeTypesFilepath = 'config/mime_types.yml';

class Config {
  constructor() {
    let env = env.env || DEFAULT_ENV;
    let rootConfig = getYamlFile(serverCongigFilepath);
    util.merge(this, rootConfig.default, rootConfig[env], {env});
    this.mimeTypes = getYamlFile(mimeTypesFilepath);
  }
}

function getYamlFile(filename) {
  let text = fs.readFileSync(util.baseJoin(filename), 'utf8');
  let obj = yaml.parse(text);
  return obj;
}

module.exports = new Config();
