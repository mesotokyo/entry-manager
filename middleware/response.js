

function _html(status, html) {
  const res = this;
  if (html === undefined) {
    html = status;
    status = 200;
  }
  if (!status || !html) {
    res.writeHead(500);
    res.end();
    return;
  }
  
  const buf = Buffer.from(html);
  const headers = {
    'Content-Length': buf.length,
    'Content-Type': 'text/html; charset=utf-8',
  };
  res.writeHead(status, headers);
  res.end(html);
}

function _json(status, obj) {
  const res = this;
  if (obj === undefined) {
    obj = status;
    status = 200;
  }

  if (!status || !obj) {
    res.writeHead(500);
    res.end();
    return;
  }

  const json = JSON.stringify(obj);
  const buf = Buffer.from(json);
  const headers = {
    'Content-Length': buf.length,
    'Content-Type': 'application/json',
  };
  res.writeHead(status, headers);
  res.end(json);
}

function response(req, res, next) {
  res.json = _json;
  res.html = _html;
  next();
}


module.exports = exports = response;
