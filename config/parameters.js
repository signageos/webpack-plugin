const packageConfig = require('../package.json');
module.exports = {
	version: packageConfig.version,
	apiUrl: process.env.SOS_API_URL ? process.env.SOS_API_URL : 'https://api.signageos.io',
};
