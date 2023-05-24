const fs = require('fs');
const { join } = require('path');
const process = require('process');

const dotenv = require('dotenv');
const yaml = require('yaml');

const util = require('./util');

const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;
dotenv.config({ path: join(__dirname, '../..', envFile) });

const mimeTypesPath = 'config/mime-types.yml';
const configPaths = [
  'config/server.yml',
  'user/server.yml',
  env.CONFIG,
].filter((e) => !!e);

class Config {
  constructor() {
    let env = process.env.NODE_ENV || DEFAULT_ENV;
    configPaths.forEach((filename) => {
      const path = util.baseJoin(filename);
      const defaultConfig = {};
      const envConfig = {};
      if (fs.existsSync(path)) {
        const configObj = this.getYamlFile(path);
        util.merge(defaultConfig, configObj.default);
        util.merge(envConfig, configObj[env]);
      }
      util.merge(this, defaultConfig, envConfig);
    });
    this.mimeTypes = this.getYamlFile(util.baseJoin(mimeTypesPath));
  }

  getYamlFile(path) {
    const text = fs.readFileSync(path, 'utf8');
    return yaml.parse(text);
  }
}

module.exports = new Config();
