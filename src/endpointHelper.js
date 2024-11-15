const logger = require('./logger');

class StatusCodeError extends Error {
  constructor(message, statusCode) {
    super(message);
    logger.unhandledErrorLogger(this);
    this.statusCode = statusCode;
  }
}

const asyncHandler = (fn) => (req, res, next) => {
  // return fn(req, res, next)
  //   .then(() => {
  //     logger.factoryLogger({
  //       method: req.method,
  //       url: req.originalUrl,
  //       body: req.body,
  //     });
  //   })
  //   .catch((err) => {
  //     logger.unhandledErrorLogger(err);
  //     next(err);
  //   });
};

module.exports = {
  asyncHandler,
  StatusCodeError,
};
