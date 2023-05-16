const { join } = require('path');

const util = require('../common/util');

function baseJoin(...args) {
  return join(__dirname, '..', ...args);
};

module.exports = Object.assign(
  {},
  util, 
  {
    baseJoin,
  },
);
