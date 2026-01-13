# signageOS Emulator Webpack Plugin

signageOS webpack plugin which allows debugging signageOS application in the browser environment locally

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
			port: 8083, // default 8090
			publicUrl: 'http://192.168.1.113:8083', // default http://localhost:8090
			appletPort: 8091, // default 8091
			appletPublicUrl: 'http://192.168.1.113:8084', // default http://localhost:8091
		}),
	],
};
```

## Local Configuration
You can create a `sos.config.local.json` file in your applet directory to provide configuration values during local development. This file is automatically loaded when the webpack plugin runs and passed to your applet as configuration:

```json
{
  "myConfigKey": "myConfigValue",
  "anotherSetting": true
}
```

This is useful for testing your applet with different configuration values without deploying to a device.

## Contribution
Clone the repository and install dev dependencies
```sh
git clone git@github.com:signageos/webpack-plugin.git # or https://github.com/signageos/webpack-plugin.git
npm install
```
