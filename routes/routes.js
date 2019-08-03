// routes.js
const url = require('url');
const model = require('../model/model');

function routes(req, res, next) {
  const parsedUrl = url.parse(req.url);

  if (parsedUrl.pathname == '/api/') {
    return apiEndPoint(req, res, next);
  }
  return next();
}

function apiEndPoint(req, res, next) {
  if (req.body.method == "createSong") {
    createSong(req, res, next);
  } else {
    res.json({ error: { code: -32601, message: "method_not_found" } });
    next();
  }
}
  

function createSong(req, res, next) {
  const params = req.body.params;
  const db = model.connect();
  let err = "";

  // check params
  for (var k of ["title", "reference", "url", "comment"]) {
    if (params[k] === undefined || params[k].length == 0) {
      err = "no_" + k;
    }
  }

  if (err.length) {
    res.json({ error: { code: -32602, message: err } });
    return;
  }

  const stmt = db.prepare('INSERT INTO songs (title, reference, url, comment)' +
                          '           VALUES (?, ?, ?, ?)');
  stmt.run(params.title, params.reference, params.url, params.comment,
           function () {
             stmt.finalize();

             if (!this.lastID) {
               // error
               res.json({ error: { code: -32603, message: "insert_failed" } });
               return;
             }
             const songId = this.lastID;
             db.close();

             res.json({result: { song: { title: params.title,
                                         reference: params.reference,
                                         url: params.url,
                                         comment: params.comment,
                                         song_id: songId }
                               }
                      });
             next();
             
           });
  return;
}

module.exports = exports = routes;
