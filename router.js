// router.js
const url = require('url');

function router(req, res, next) {
  const parsedUrl = url.parse(req.url);

  if (parsedUrl.pathname == '/api/') {
    jsonRpcRouter(req, res, next);
    return;
  }
  if (parsedUrl.pathname == '/') {
  }
  next();
  return;
}

function jsonRpcRouter(req, res, next) {
  const method = req.body.method;
  const routes = require('./routes/routes');

  if (routes[method]) {
    routes[method](req, res, next);
  } else {
    res.json({ error: { code: -32601, message: "method_not_found" } });
  }
}

module.exports = exports = router;
