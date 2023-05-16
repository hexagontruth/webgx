const pth = require('path');
const process = require('process');

const PORT = process.env.PORT || 8080;
const SERVER_PORT = process.env.SERVER_PORT || 8081;

module.exports = {
  target: 'web',
  entry: './src/client/index.js',
  output: {
    filename: 'main.js',
    path: pth.join(__dirname, 'public/dist'),
  },
  devServer: {
    static: {
      directory: pth.join(__dirname, 'public'),
    },
    devMiddleware: {
      publicPath: '/dist/',
    },
    compress: true,
    port: PORT,
    hot: true,
    historyApiFallback: true,
    proxy: {
      '/api/**': {
        target: `http://localhost:${SERVER_PORT}`,
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.(sass|scss|css)$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif)$/,
        type: 'asset/resource',
      },
      {
        test: /\.(txt|html|md)$/,
        type: 'asset/source',
      },
    ],
  },
}
