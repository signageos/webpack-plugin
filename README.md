# signageOS Emulator Webpack Plugin

signageOS webpack plugin which allows to debug signageOS application in browser environment locally

## Installation
```bash
npm install @signageos/webpack-plugin @signageos/front-display --save-dev
```
> `@signageos/front-display` is peer dependency of webpack plugin.

## Usage
```js
const webpack = require('webpack');
const SignageOSPlugin = require('@signageos/webpack-plugin')

exports = module.exports = {
	// ...
	plugins: [
		// ...
		new SignageOSPlugin({
			https: true, // default false
			port: 8083, // default 8090
			public: 'http://192.168.1.113:8083', // default undefined
			useLocalIp: false, // default true
			host: '192.168.1.113', // default undefined
		}),
	],
};
```

## Contribution
Clone the repository and install dev dependencies
```sh
git clone git@github.com:signageos/webpack-plugin.git # or https://github.com/signageos/webpack-plugin.git
npm install
```
