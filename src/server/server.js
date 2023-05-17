const fs = require('fs').promises;
const { join } = require('path');
const { spawn, execSync } = require('child_process');

const express = require('express');

const { baseJoin } = require('./util');

// ---

class Server {
  constructor(config) {
    this.config = config;

    this.imageIdxChars = config.media.imageFilename.match(/\#+/)[0].length;
    this.videoIdxChars = config.media.videoFilename.match(/\#+/)[0].length;
    this.videoIdx = 0;
    this.imagesEnabled = false;
    this.recordingVideo = false;

    execSync(`mkdir -p ${this.config.output} ${this.config.input}`);

    this.app = express();

    this.app.use(express.json());
    this.app.use(express.static('./public'));
    this.app.use('/data', express.static('./lib'));
    this.app.use('/data', express.static('./user'));

    this.app.route('/api')
    .get('/input', async (req, res) => {
      let inputFiles = await fs.readdir(baseJoin(this.config.input));
      res.end(JSON.stringify(inputFiles));
    })
    .get('/input/:inputFile', async (req, res) => {
      let file = await fs.readFile(baseJoin(this.config.input, req.params.inputFile));
      res.end(file);
    })
    .post('/video/:status', async (req, res) => {
      const result = {};

      if (typeof req.body.set == 'boolean') {
        req.body.set ? this.startVideo() : this.endVideo();
        result.set = req.body.set;
        console.log(`Video recording ${this.recordingVideo ? 'started' : 'ended'}`);
      }

      result.status = this.recordingVideo;
      res.end(result);
    })
    .app.post('/images/:status', (req, res) => {
      const result = {};

      if (typeof req.body.set == 'boolean') {
        this.imagesEnabled = req.body.set;
        result.set = req.body.set;
        console.log(`Image saving ${this.imagesEnabled ? 'enabled' : 'disabled'}`);
      }

      result.status = this.imagesEnabled;
      res.end(result);
    })
    .app.post('/frame/:frameIdx', (req, res) => {
      this.processData(req);
      res.end('lgtm');
    });
  }

  use(...args) {
    this.app.use(...args);
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

  startVideo() {
    if (this.recordingVideo) return;
    this.recordingVideo = true;
    let filepath = join(this.config.output, this.config.videoFilename);
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
      this.child = null;
      console.log('Exiting encoder...');
    });
    this.child.stdout.on('data', (data) => {
      console.log(`ENCODER: ${data}`);
    });
    this.child.stderr.on('data', (data) => {
      console.error(`ENCODER: ${data}`);
    });
  }

  endVideo() {
    if (!this.recordingVideo) return;
    this.recordingVideo = false;
    return new Promise((resolve) => {
      this.child.stdin.end();
      this.child.on('exit', () => {
        resolve(true);
      });
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
      if (this.imagesEnabled) {
        let idx = parseInt(req.params.frameIdx);
        let filepath = join(this.config.output, this.config.imageFilename + ext);
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
