const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
var ZipPlugin = require('zip-webpack-plugin');
var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const parts = require('./webpack.parts');
const PATHS = {
  index: path.join(__dirname, 'src'),
  dist: path.join(__dirname, 'dist'),
};


const commonConfig = merge([
  {
    output: {
      path: PATHS.dist,
      filename: '[name].js',
      publicPath: '/'
    },
  },
  parts.loadJavaScript({ include: PATHS.dist }),
]);

const productionConfig = merge([
  {
    plugins: [
      new BundleAnalyzerPlugin({
          analyzerMode: 'static'
      }),
      new ZipPlugin({
        filename: 'parsiplayer-' + require('./package.json').version + '.zip',
      }),
    ],
  },
  parts.clean(PATHS.dist),
  parts.minifyJavaScript(),
  parts.minifyCSS({
    options: {
      discardComments: {
        removeAll: true,
      },
      safe: true,
    },
  }),
  parts.generateSourceMaps({ type: 'source-map' }),
  parts.extractCSS({
    use: ['css-loader', parts.autoprefix()],
  }),
  parts.attachCopyrightBanner(),
  parts.setFreeVariable(
    'process.env.NODE_ENV',
    'production'
  ),
]);

const developmentConfig = merge([
  {
    output: {
      devtoolModuleFilenameTemplate: 'webpack:///[absolute-resource-path]',
    },
  },
  parts.generateSourceMaps({ type: 'cheap-module-eval-source-map' }),
  parts.loadCSS(),
  parts.devServer({
    host: 'localhost',
    port: 3333,
  }),
  parts.setFreeVariable(
    'process.env.NODE_ENV',
    'development'
  ),
]);

module.exports = (env) => {
  const pages = [
    parts.page({
      title: 'Parsiplayer Hls Test',
      entry: {
        parsiplayer: PATHS.index,
      },
    }),
  ];
  const config = env === 'production' ?
    productionConfig :
    developmentConfig;

  return merge([commonConfig, config].concat(pages));
};