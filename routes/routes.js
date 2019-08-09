// routes.js
const model = require('../model/model');

const ERROR_NO_UPDATE = { code: -32101, message: "no_update" };
const ERROR_TARGET_NOT_FOUND = { code: -32102, message: "target_not_found" };
const ERROR_CREATE_FAILED = { code: -32103, message: "create_failed" };
const ERROR_CONSTRAINT_VIOLATION = { code: -32104, message: "constraint_violation" };
const ERROR_CREATELOG_FAILED = { code: -32105, message: "create_log_failed" };

const moment = require('moment');

function _dateTimeToLocal(string) {
  try {
    return moment.utc(string).utcOffset(9).format("YYYY-MM-DD HH:mm:ss");
  } catch (err) {
    return "";
  }
}

exports.createEntry = async function createEntry(req, res, next) {
  const params = req.body.params || {};
  let err = "";

  // check params
  for (var k of ["part_id", "name"]) {
    if (params[k] === undefined || params[k].length == 0) {
      err = "no_" + k;
    }
  }
  if (err.length) {
    res.json({ error: { code: -32602, message: err } });
    return;
  }

  try {
    const user = await model.getOrCreateUser({name: params.name});
    const part = await model.getPart(params.part_id);

    part.user_id = user.user_id;
    part.instrument_name = params.instrument_name;

    const result = await model.createEntry(part);
    if (result.changes == 0) {
      res.json({error: ERROR_CREATE_FAILED});
      return;
    }

    await model.createLog({user_id: part.user_id,
                           target_id: part.part_id,
                           action: "create_entry"});
    
    res.json({result: { part: part }});
  } catch (err) {
    res.json({ error: { code: -32603, message: err.toString()} });
  }
};

exports.deleteEntry = async function deleteEntry(req, res, next) {
  const params = req.body.params || {};

  // check params
  if (!params.part_id) {
    res.json({ error: { code: -32602, message: "no_part_id"} });
    return;
  }

  try {
    const part = await model.getPart(params.part_id);
    if (!part.user_id) {
      res.json({ error: ERROR_TARGET_NOT_FOUND });
      return;
    }
    let result = await model.deleteEntry(part.part_id);

    if (result.changes == 0) {
      res.json({ error: ERROR_NO_UPDATE });
      return;
    }
    await model.createLog({user_id: part.user_id,
                           target_id: part.part_id,
                           action: "delete_entry"});
    res.json({result: {part: part}});
  } catch (err) {
    res.json({ error: { code: -32602, message: err.toString()} });
    return;
  }
};

exports.createComment = async function createComment(req, res, next) {
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

  try {
    const user = await model.getOrCreateUser({name: params.author});
    params.user_id = user.user_id;
    const comment = await model.createComment(params);

    await model.createLog({user_id: params.user_id,
                     target_id: comment.comment_id,
                     action: "create_comment"});
    res.json({result: { comment: comment } });
  } catch (err) {
    if (err.code && err.code === 'SQLITE_CONSTRAINT') {
      res.json({ error: ERROR_CONSTRAINT_VIOLATION });
      return;
    }
    res.json({ error: { code: -32603, message: err.toString()}});
  }
};

exports.deleteComment = async function deleteComment(req, res, next) {
  const params = req.body.params || {};
  
  // check params
  if (!params.comment_id) {
    res.json({ error: { code: -32602, message: "no_comment_id"} });
    return;
  }

  try {
    const comment = await model.getComment(params.comment_id);
    if (!comment) {
      res.json({error: ERROR_TARGET_NOT_FOUND});
      return;
    }

    const result = await model.deleteComment(comment.comment_id);
    if (!result.changes) {
      res.json({ error: ERROR_NO_UPDATE });
      return;
    }
    await model.createLog({user_id: comment.user_id,
                           target_id: comment.comment_id,
                           action: "delete_entry"});
    res.json({ result: { comment: comment }});
  } catch (err) {
    res.json({ code: -32603, message: err.toString() });
    return;
  }
};

exports.createSong = async function createSong(req, res, next) {
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

  try {
    const user = await model.getOrCreateUser({name: params.author});
    params.user_id = user.user_id;
    const song = await model.createSong(params);
    await model.createLog({user_id: params.user_id,
                           target_id: song.song_id,
                           action: "create_song"});
    res.json({result: { song: song }});
  } catch (err) {
    if (err.code && err.code === 'SQLITE_CONSTRAINT') {
      res.json({ error: ERROR_CONSTRAINT_VIOLATION });
      return;
    }
    res.json({ error: { code: -32603, message: err.toString()}});
  }
};

exports.updateSong = async function updateSong(req, res, next) {
  const params = req.body.params || {};
  
  // check params
  if (!params.song_id) {
    res.json({ error: { code: -32602, message: "no_song_id"} });
    return;
  }

  // get song
  try {
    let song = await model.getSong(params.song_id);

    if (!song) {
      res.json({ error: ERROR_TARGET_NOT_FOUND });
      return;
    }

    for (const k in params) {
      song[k] = params[k];
    }

    const changes = await model.updateSong(song);
    if (!changes) {
      res.json({error: ERROR_NO_UPDATE});
      return;
    }

    await model.createLog({user_id: song.user_id,
                           target_id: params.song_id,
                           action: "update_song"});

    res.json({result: {song: song}});
  } catch (err) {
    if (err.code == "SQLITE_CONSTRAINT") {
      res.json({error: ERROR_CONSTRAINT_VIOLATION});
      return;
    }
    console.error(err);
    res.json({error: {code: -32603, message: err}});
  }

};


exports.addPart = async function addPart(req, res, next) {
  const params = req.body.params || {};
  let err = "";

  // check params
  for (var k of ["song_id", "part_name", "order"]) {
    if (params[k] === undefined || params[k].length == 0) {
      err = "no_" + k;
    }
  }
  if (err.length) {
    res.json({ error: { code: -32602, message: err } });
    return;
  }

  try {
    const song = await model.getSong(params.song_id);
    if (!song) {
      res.json({ error: ERROR_TARGET_NOT_FOUND });
      return;
    }
    const part = await model.addPart(params);
    await model.createLog({user_id: song.user_id,
                           target_id: part.part_id,
                           action: "add_part"});
    
    res.json({result: { part: part }});
  } catch (err) {
    res.json({ error: { code: -32603, message: err.toString()} });
  }
  
};

exports.deletePart = async function deletePart(req, res, next) {
  const params = req.body.params || {};
  let err;

  // check params
  if (!params.part_id) {
    res.json({ error: { code: -32602, message: "no_part_id" } });
    return;
  }

  try {
    const part = await model.getPart(params.part_id);
    if (!part) {
      res.json({ error: ERROR_TARGET_NOT_FOUND });
      return;
    }
    const song = await model.getSong(part.song_id);
    const result = await model.deletePart(part.part_id);
    if (result.changes == 0) {
      res.json({ error: ERROR_NO_UPDATE });
      return;
    }

    await model.createLog({user_id: song.user_id,
                           target_id: part.part_id,
                           action: "delete_part"});
    
    res.json({result: { part: part }});
  } catch (err) {
    res.json({ error: { code: -32603, message: err.toString()} });
  }
  
};

exports.listSongs = async function listSongs(req, res, next) {
  const params = req.body.params;

  try {
    const songs = await model.getSongs();
    for (const song of songs) {
      song.create_time = _dateTimeToLocal(song.create_time);
      song.update_time = _dateTimeToLocal(song.update_time);
    }
    res.json({ result: { songs: songs } });
  } catch (err) {
    res.json({ error: { code: -32603, message: err } });
  }
};
  
