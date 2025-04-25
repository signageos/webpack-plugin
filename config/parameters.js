const packageConfig = require("../package.json");
module.exports = {
  version: packageConfig.version,
  apiUrl: process.env.API_URL
    ? process.env.API_URL
    : "https://api.signageos.io",
};
