const fs = require('fs');
const http = require('http');
const pth = require('path');
const {spawn, execSync} = require('child_process');

const express = require('express');

const util = require('./util');

// ---

class Server {
  constructor(config) {
    this.app = express();
    this.config = util.merge({}, config);

    this.imageIdxChars = this.config.imageFilename.match(/\#+/)[0].length;
    this.videoIdxChars = this.config.videoFilename.match(/\#+/)[0].length;
    this.videoIdx = 0;
    this.enableImages = false;
    this.recordingVideo = false;

    execSync(`mkdir -p ${this.config.output} ${this.config.input}`);

    this.app.use(express.static('./public'));
    this.app.use('/data', express.static('./library'));
    this.app.use('/data', express.static('./user'));
    this.app.get('/input', async (req, res) => {
      let inputFiles = await util.readdir(util.join(this.config.input));
      res.end(JSON.stringify(inputFiles));
    });
    this.app.get('/input/:inputFile', async (req, res) => {
      let file = await util.readFile(util.join(this.config.input, req.params.inputFile));
      let mime = util.mimeFromBuffer(file);
      console.log(mime);
      res.end(file);
    });
    this.app.post('/video/:status', (req, res) => {
      if (req.params.status == 'start') {
        this.startVideo(res);
        res.end('probably okay idk');
      }
      else if (req.params.status == 'end') {
        this.endVideo(res);
      }
    });
    this.app.post('/images/:status', (req, res) => {
      // This is highly problematic but I can't be fucked rn to include it in the frame POST body or URL params
      if (req.params.status == 'start') {
        console.log('Image recording enabled');
        this.enableImages = true;
      }
      else if (req.params.status == 'end') {
        console.log('Image recording disabled');
        this.enableImages = false;
      }
      res.end('okay lol');
    });
    this.app.post('/frame/:frameIdx', (req, res) => {
      this.processData(req);
      res.end('lgtm');
    });
  }

  startVideo(res) {
    if (this.recordingVideo) return;
    this.recordingVideo = true;
    let filepath = pth.join(this.config.output, this.config.videoFilename);
    filepath = this.generateFilepath(filepath, this.videoIdxChars, this.videoIdx++);
    let args = [
      '-y',
      '-c:v', 'png',
      '-r', `${this.config.fps}`,
      '-f', 'image2pipe',
      '-i', '-',
      '-pix_fmt', 'yuv420p',

      '-vf', `scale=${this.config.width}x${this.config.height}`,
      '-c:v', this.config.codec,
      '-crf', `${this.config.crf}`,
      filepath,
    ];
    this.child = spawn('ffmpeg', args, {stdio: ['pipe', 'pipe', 'pipe']});
    this.child.on('exit', () => {
      console.log('Exiting encoder...');
    });
    this.child.stdout.on('data', (data) => {
      console.log(`ENCODER: ${data}`);
    });
    this.child.stderr.on('data', (data) => {
      console.error(`ENCODER: ${data}`);
    });
  }

  endVideo(res) {
    if (this.recordingVideo) {
      this.recordingVideo = false;
      this.child.stdin.end();
      this.child.on('exit', () => {
        this.child = null;
        console.log('Done lol');
        res?.end('okay');
      });
    }
  }

  start() {
    this.app.listen(this.config.port, () => {
      console.log(`Listening on port ${this.config.port} lol...`);
    });
    process.on('SIGINT', () => {
      this.endVideo();
      process.exit();
    });
  }

  async processData(req) {
    let data = '';
    req.on('data', (chunk) => data += chunk);
    req.on('end', () => {
      let match = data.match(/:([\w\/]+);/);
      let ext = this.config.mimeTypes[match[1]];
      let base64 = data.slice(data.indexOf(',') + 1);
      let buf = Buffer.from(base64, 'base64');
      if (this.enableImages) {
        let idx = parseInt(req.params.frameIdx);
        let filepath = pth.join(this.config.output, this.config.imageFilename + ext);
        filepath = this.generateFilepath(filepath, this.imageIdxChars, idx);
        console.log(`Writing "${filepath}"...`)
        fs.writeFileSync(filepath, buf);
      }
      if (this.recordingVideo) {
        this.child?.stdin.write(buf);
      }
    });
  }

  generateFilepath(path, idxChars, idx) {
    let idxString = ('0'.repeat(idxChars) + (idx)).slice(-idxChars);
    path = path.replace(/\#+/, idxString);
    return path;
  }
}

module.exports = Server;
