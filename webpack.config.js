const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/popup.ts',
  output: {
    filename: 'popup.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  target: 'web',
  optimization: {
    minimize: false // 保持代码可读性，便于调试
  }
};