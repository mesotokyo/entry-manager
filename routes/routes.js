// routes.js
const url = require('url');
const model = require('../model/model');

function routes(req, res, next) {
  const parsedUrl = url.parse(req.url);

  if (parsedUrl.pathname == '/api/') {
    apiEndPoint(req, res, next);
    return;
  }
  if (parsedUrl.pathname == '/') {
  }
  next();
  return;
}

function apiEndPoint(req, res, next) {
  if (req.body.method == "createSong") {
    createSong(req, res, next);
  }
  else if (req.body.method == "listSongs") {
    listSongs(req, res, next);
  }
  else if (req.body.method == "entry") {
    entry(req, res, next);
  } else {
    res.json({ error: { code: -32601, message: "method_not_found" } });
    next();
  }
}

function entry(req, res, next) {
  const params = req.body.params || {};
  let err = "";
  let entryId;

  // check params
  for (var k of ["song_id", "part_id", "name"]) {
    if (params[k] === undefined || params[k].length == 0) {
      err = "no_" + k;
    }
  }
  if (err.length) {
    res.json({ error: { code: -32602, message: err } });
    next();
    return;
  }

  model.getOrCreateUser({name: params.name})
    .then(user => {
      params.user_id = user.user_id;
      return model.createEntry(params);
    })
    .then(changes => {
      if (changes == 0) {
        res.json({error: { code: -32101, message: "no_changes" }});
        return;
      }
      model.createLog({user_id: params.user_id,
                       target_id: params.part_id,
                       action: "entry"})
        .then(_logId => {
          res.json({result: {entry: {entry_id: entryId,
                                     song_id: params.song_id,
                                     user_id: params.user_id,
                                     part_id: params.part_id,
                                     instrument_name: params.instrument_name,
                                    }}});
        });
    })
    .catch(err => {
      res.json({ error: { code: -32603, message: err.toString()} });
    });
};

function createSong(req, res, next) {
  const params = req.body.params;
  let err = "";
  let songId;

  // check params
  for (var k of ["title", "reference", "author", "parts"]) {
    if (params[k] === undefined || params[k].length == 0) {
      err = "no_" + k;
    }
  }

  if (params.url && params.url.length) {
    try {
      var parsed = new URL(params.url);
    }
    catch (e) {
      err = "invalid_url";
    }
  }

  if (err.length) {
    res.json({ error: { code: -32602, message: err } });
    return next();
  }

  model.getOrCreateUser({name: params.author})
    .then(user => {
      params.user_id = user.user_id;
      return model.createSong(params);
    })
    .then(_songId => {
      songId = _songId;
      return model.createLog({user_id: params.user_id,
                              target_id: _songId,
                              action: "create_song"});
    })
    .then(_logId => {
      res.json({result: { song: { title: params.title,
                                  reference: params.reference,
                                  url: params.url,
                                  comment: params.comment,
                                  song_id: songId,
                                  user_id: params.user_id,
                                  author: params.author,
                                }
                        }
               });
    })
    .catch(err => {
      if (err.code && err.code === 'SQLITE_CONSTRAINT') {
        res.json({ error: { code: -32100, message: "SQLITE_CONSTRAINT" } });
        return;
      }
      console.error(err);
      res.json({ error: { code: -32603, message: err.toString()}});
    });
  return;
}

function listSongs(req, res, next) {
  const params = req.body.params;
  model.getSongs()
    .then((songs) => {
      res.json({ result: { songs: songs } });
    })
    .catch((err) => {
      res.json({ error: { code: -32603, message: err } });
    });
}
  
module.exports = exports = routes;
