// routes.js
const model = require('../model/model');

const ERROR_NO_UPDATE = { code: -32101, message: "no_update" };
const ERROR_TARGET_NOT_FOUND = { code: -32102, message: "target_not_found" };
const ERROR_CREATE_FAILED = { code: -32103, message: "create_failed" };
const ERROR_CONSTRAINT_VIOLATION = { code: -32104, message: "constraint_violation" };
const ERROR_CREATELOG_FAILED = { code: -32105, message: "create_log_failed" };

exports.createEntry = function createEntry(req, res, next) {
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
        res.json({error: ERROR_CREATE_FAILED});
        return Promise.failed("no_changes");
      }
      return model.createLog({user_id: params.user_id,
                              target_id: params.part_id,
                              action: "create_entry"});
    })
    .then(_logId => {
      res.json({result: { part: params }});
    })
    .catch(err => {
      res.json({ error: { code: -32603, message: err.toString()} });
    });
};

exports.deleteEntry = function deleteEntry(req, res, next) {
  const params = req.body.params || {};

  // check params
  if (!params.part_id) {
    res.json({ error: { code: -32602, message: "no_part_id"} });
    return;
  }

  // get part
  model.getPart(params.part_id)
    .then(part => {
      return model.deleteEntry(part.part_id);
    })
    .then(changes => {
      if (!changes) {
        res.json({ error: ERROR_NO_UPDATE });
        return Promise.failed();
      }
      return model.createLog({user_id: params.user_id,
                              target_id: params.part_id,
                              action: "delete_entry"});
    })
    .then(_logId => {
      res.json({result: {part: params}});
    })
    .catch(err => {
      res.json({ error: { code: -32602, message: "no_part_id"} });
      return;
    });
};

exports.createComment = function createComment(req, res, next) {
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
        res.json({ error: ERROR_CONSTRAINT_VIOLATION });
        return;
      }
      console.error(err);
      res.json({ error: { code: -32603, message: err.toString()}});
    });
  return;
};

exports.deleteComment = function deleteComment(req, res, next) {
  const params = req.body.params || {};
  
  // check params
  if (!params.comment_id) {
    res.json({ error: { code: -32602, message: "no_comment_id"} });
    return;
  }

  // get comment
  let _comment;
  model.getComment(params.comment_id)
    .catch(err => {
      return Promise.reject(ERROR_TARGET_NOT_FOUND);
    })
    .then(comment => {
      _comment = comment;
      return model.deleteComment(comment.comment_id);
    })
    .catch(err => {
      return Promise.reject({code: -32603, message: error});
    })
    .then(changes => {
      if (!changes) {
        return Promise.reject({error: ERROR_NO_UPDATE});
      }
      return model.createLog({user_id: params.user_id,
                              target_id: params.part_id,
                              action: "delete_entry"});
    })
    .catch(err => {
      return Promise.reject({ error: ERROR_CREATELOG_FAILED });
    })
    .then(_logId => {
      res.json({result: {comment: _comment}});
    })
    .catch(err => {
      res.json({ error: err });
      return;
    });
};

exports.createSong = function createSong(req, res, next) {
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
        res.json({ error: ERROR_CONSTRAINT_VIOLATION });
        return;
      }
      console.error(err);
      res.json({ error: { code: -32603, message: err.toString()}});
    });
  return;
};

exports.updateSong = function updateSong(req, res, next) {
  const params = req.body.params || {};
  
  // check params
  if (!params.song_id) {
    res.json({ error: { code: -32602, message: "no_comment_id"} });
    return;
  }

  // get comment
  let _comment;
  model.getComment(params.comment_id)
    .catch(err => {
      return Promise.reject(ERROR_TARGET_NOT_FOUND);
    })
    .then(comment => {
      _comment = comment;
      return model.deleteComment(comment.comment_id);
    })
    .catch(err => {
      return Promise.reject({code: -32603, message: error});
    })
    .then(changes => {
      if (!changes) {
        return Promise.reject({error: ERROR_NO_UPDATE});
      }
      return model.createLog({user_id: params.user_id,
                              target_id: params.part_id,
                              action: "delete_entry"});
    })
    .catch(err => {
      return Promise.reject({ error: ERROR_CREATELOG_FAILED });
    })
    .then(_logId => {
      res.json({result: {comment: _comment}});
    })
    .catch(err => {
      res.json({ error: err });
      return;
    });
};

exports.addPart = function addPart(req, res, next) {
};

exports.deletePart = function deletePart(req, res, next) {
};

exports.listSongs = function listSongs(req, res, next) {
  const params = req.body.params;
  model.getSongs()
    .then((songs) => {
      res.json({ result: { songs: songs } });
    })
    .catch((err) => {
      res.json({ error: { code: -32603, message: err } });
    });
};
  
