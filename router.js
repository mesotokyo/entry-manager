// router.js
const url = require('url');
const config = require('./config');

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

  // check token
  const token = config.gamebattle.token;
  const publicMethod = { getComments: 1,
                         getSongs: 1,
                         getLogs: 1 };
  if (token) {
    if (!publicMethod[method]) {
      if (req.body.params.token != token) {
        res.json({ error: { code: -32600, message: "invalid_request" } });
        return;
      }
    }
  }
  
  if (routes[method]) {
    routes[method](req, res, next);
  } else {
    res.json({ error: { code: -32601, message: "method_not_found" } });
    return;
  }
}

module.exports = exports = router;
