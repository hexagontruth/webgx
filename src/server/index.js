const process = require('process');

const webpack = require("webpack");
const middleware = require("webpack-dev-middleware");
const compiler = webpack(require('../../webpack.config.js'));

const config = require('./config');
const Server = require('./server');

const server = new Server(config);

if (process.env.NODE_ENV = 'development') {
  server.use(middleware, compiler);
}

server.start();