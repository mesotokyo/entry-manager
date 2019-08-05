var typeis = require('type-is');

function tokenAuthFactory(config) {
  return function tokenAuth(req, res, next) {
    if (!req.body || !config.token || !config.token.length) {
      next();
      return;
    }
    if (!typeis(req, ['json'])) {
      next();
      return;
    }

    const params = req.body.params || {};
    if (config.token == params.token) {
      next();
      return;
    }

    res.json({ error: { code: -32200, message: "invalid_token" } });
  };
};

module.exports = exports = tokenAuthFactory;
