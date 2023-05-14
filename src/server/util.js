const fs = require('fs');
const pth = require('path');
const util = require('../common/util');

const [readFile, writeFile, copyFile, readdir] = util.promisify(fs.readFile, fs.writeFile, fs.copyFile, fs.readdir);

const magicNumbers = new Map();
magicNumbers.set(Buffer.from('GIF8'), 'image/gif');
magicNumbers.set(Buffer.from('\x89PNG', 'binary'), 'image/png');
magicNumbers.set(Buffer.from('\xff\xd8\xff', 'binary'), 'image/jpeg');

function mimeFromBuffer(buffer) {
  for (let [num, mime] of magicNumbers) {
    if (Buffer.compare(num, buffer.slice(0, num.length)) == 0)
      return mime;
  };
  return 'application/octet-stream'; // o noes
}

function join(...args) {
  return pth.join(__dirname, '..', ...args);
};

Object.assign(util, {
  join, mimeFromBuffer, readFile, writeFile, copyFile, readdir
});

module.exports = util;
