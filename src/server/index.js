const process = require('process');

const webpack = require('webpack');
const devMiddleware = require('webpack-dev-middleware');
const hotMiddleware = require('webpack-hot-middleware');

const config = require('./config');
const compiler = webpack(require('../../webpack.config.js'));
const Server = require('./server'); 

const server = new Server(config);

if (process.env.NODE_ENV = 'development') {
  server.use(devMiddleware(compiler));
  server.use(hotMiddleware(compiler)); 
}

server.start();