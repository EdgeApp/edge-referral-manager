const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: './src/client/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    sourceMapFilename: '[file].map'
  },
  mode: 'development',
  devtool: 'inline-source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: {
          loader: 'ts-loader',
          options: {
            compilerOptions: {
              sourceMap: true,
              inlineSources: true,
              sourceRoot: '/'
            }
          }
        },
        exclude: /node_modules/
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpg|jpeg|gif)$/i,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/client/index.html'
    })
  ],
  devServer: {
    historyApiFallback: true,
    port: 3000,
    proxy: {
      '/api': 'http://localhost:4000'
    }
  },
  optimization: {
    minimize: false
  }
}
