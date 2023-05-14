const pth = require('path');
const process = require('process');

const PORT = process.env.PORT || 8080;

module.exports = {
  mode: process.env.NODE_ENV,
  target: 'web',
  entry: './src/client/index.js',
  output: {
    filename: 'main.js',
    path: pth.join(__dirname, 'public/dist'),
    publicPath: '/dist/',
  },
  devServer: {
    static: {
      directory: pth.join(__dirname, 'public'),
    },
    devMiddleware: {
      filename: 'main.js',
      path: pth.join(__dirname, 'public/dist'),
      publicPath: '/dist/',
    },
    compress: true,
    port: PORT,
    hot: true,
    historyApiFallback: true,
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
      {
        test: /\.(woff2?)$/,
        type: 'asset/resource',
      },
    ],
  },
}
