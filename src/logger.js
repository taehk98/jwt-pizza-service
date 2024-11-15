const Logger = require('pizza-logger');
const config = require("./config.js");

module.exports = new Logger(config);