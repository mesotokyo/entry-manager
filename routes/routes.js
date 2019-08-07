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
  else if (req.body.method == "updateSong") {
    updateSong(req, res, next);
  }
  else if (req.body.method == "addPart") {
    addPart(req, res, next);
  }
  else if (req.body.method == "deletePart") {
    deletePart(req, res, next);
  }
  else if (req.body.method == "listSongs") {
    listSongs(req, res, next);
  }
  else if (req.body.method == "createEntry") {
    createEntry(req, res, next);
  }
  else if (req.body.method == "createComment") {
    createComment(req, res, next);
  }
  else if (req.body.method == "deleteComment") {
    deleteComment(req, res, next);
  }
  else if (req.body.method == "deleteEntry") {
    deleteEntry(req, res, next);
  } else {
    res.json({ error: { code: -32601, message: "method_not_found" } });
  }
}

function createEntry(req, res, next) {
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

function deleteEntry(req, res, next) {
  const params = req.body.params || {};

  // check params
  if (!params.part_id) {
    res.json({ error: { code: -32602, message: "no_part_id"} });
    return;
  }

  // get entry

  model.deleteEntry(params)
    .then(changes => {
      if (!changes) {
        res.json({ error: { code: -32200, message: "no_part_id" } });
        return;
      }
      return model.createLog({user_id: params.user_id,
                              target_id: _commentId,
                              action: "create_comment"});
      res.json({ result: { changes: changes } });
    })
    .then(_commentId => {
      params.comment_id = _commentId;
      return model.createLog({user_id: params.user_id,
                              target_id: _commentId,
                              action: "create_comment"});
    })
    .catch(err => {
      if (err.code && err.code === 'SQLITE_CONSTRAINT') {
        res.json({ error: { code: -32100, message: "SQLITE_CONSTRAINT" } });
        return;
      }
      res.json({ error: { code: -32603, message: err.toString()}});
    });
  return;
}

function createComment(req, res, next) {
  const params = req.body.params || {};
  let err = "";

  // check params
  for (var k of ["comment", "song_id", "author"]) {
    if (params[k] === undefined || params[k].length == 0) {
      err = "no_" + k;
    }
  }

  if (err.length) {
    res.json({ error: { code: -32602, message: err } });
    return;
  }

  model.getOrCreateUser({name: params.author})
    .then(user => {
      params.user_id = user.user_id;
      return model.createComment(params);
    })
    .then(_commentId => {
      params.comment_id = _commentId;
      return model.createLog({user_id: params.user_id,
                              target_id: _commentId,
                              action: "create_comment"});
    })
    .then(_logId => {
      res.json({result: { comment: params } });
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

function deleteComment(req, res, next) {
  const params = req.body.params;
}

function createSong(req, res, next) {
  const params = req.body.params;
  let err = "";

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
    return;
  }

  let _song;
  model.getOrCreateUser({name: params.author})
    .then(user => {
      params.user_id = user.user_id;
      return model.createSong(params);
    })
    .then(song => {
      _song = song;
      return model.createLog({user_id: params.user_id,
                              target_id: song.song_id,
                              action: "create_song"});
    })
    .then(log => {
      res.json({result: { song: _song }});
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

function updateSong(req, res, next) {
}

function addPart(req, res, next) {
}

function deletePart(req, res, next) {
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
