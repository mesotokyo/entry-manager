// routes.js
const model = require('../model/model');
const config = require('../config');

const ERROR_NO_UPDATE = { code: -32101, message: "no_item_updated" };
const ERROR_TARGET_NOT_FOUND = { code: -32102, message: "target_not_found" };
const ERROR_CREATE_FAILED = { code: -32103, message: "create_failed" };
const ERROR_CONSTRAINT_VIOLATION = { code: -32104, message: "constraint_violation" };
const ERROR_CREATELOG_FAILED = { code: -32105, message: "create_log_failed" };

const moment = require('moment');

model.setConfig(config.gamebattle);

function _dateTimeToLocal(string) {
  if (string === undefined) {
    return moment.utc().utcOffset(9).format("YYYY-MM-DD HH:mm:ss");
  }
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
    const result = await model.createComment(params);
    params.comment_id = result.lastID;

    await model.createLog({user_id: params.user_id,
                     target_id: params.comment_id,
                           action: "create_comment"});
    // add create time
    params.create_time = _dateTimeToLocal();
    res.json({result: { comment: params } });
  } catch (err) {
    if (err.code && err.code === 'SQLITE_CONSTRAINT') {
      res.json({ error: ERROR_CONSTRAINT_VIOLATION });
      return;
    }
    res.json({ error: { code: -32603, message: err.toString()}});
  }
};

exports.getComments = async function getComments(req, res, next) {
  const params = req.body.params;

  try {
    const comments = await model.getComments(params.song_id);
    const count = await model.countComments(params.sond_id);

    for (const comment of comments) {
      comment.create_time = _dateTimeToLocal(comment.create_time);
      comment.update_time = _dateTimeToLocal(comment.update_time);
    }
    res.json({ result: { comments: comments, total_comments: count.count } });
  } catch (err) {
    res.json({ error: { code: -32603, message: err.toString() } });
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
                           action: "delete_comment"});
    res.json({ result: { comment: comment }});
  } catch (err) {
    res.json({ code: -32603, message: err.toString() });
    return;
  }
};

function _parseUrl(parsed, params) {

  if ((parsed.hostname == "www.youtube.com"
       || parsed.hostname == "m.youtube.com")
      && parsed.pathname == "/watch") {
    params.url_type = "youtube";
    params.url_key = parsed.searchParams.get("v") || "";
  } else if (parsed.hostname == "youtu.be") {
    params.url_type = "youtube";
    params.url_key = parsed.pathname.slice(1);
  } else if (parsed.hostname == "www.nicovideo.jp") {
    var path = parsed.pathname;
    var m = /^\/watch\/(sm\d+)$/.exec(parsed.pathname);
    if (m) {
      params.url_type = "nicovideo";
      params.url_key = m[1];
    }
  }

}

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
      _parseUrl(parsed, params);
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
    const result = await model.createSong(params);
    params.song_id = result.lastID;
    await model.createLog({user_id: params.user_id,
                           target_id: params.song_id,
                           action: "create_song"});
    res.json({result: { song: params }});
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

  if (params.url && params.url.length) {
    try {
      var parsed = new URL(params.url);
      _parseUrl(parsed, params);
    }
    catch (e) {
      res.json({error: {code: -32603, message: "invalid_url"}});
      return;
    }
  }

  // get song
  try {
    const song = await model.getSong(params.song_id);

    if (!song) {
      res.json({ error: ERROR_TARGET_NOT_FOUND });
      return;
    }

    const parts = await model.getParts({song_id: params.song_id});
    const partsById = {};

    for (var part of parts) {
      partsById[part.part_id] = part;
    }

    // update parts
    let requests = [];
    var index = 0;
    var p;

    if (params.parts) {
      for (part of params.parts) {
        delete partsById[part.part_id];
        part.order = index;
        if (part.part_id) {
          // console.log(`update ${part.part_id}`);
          p = model.updatePart(part);
          requests.push(p);
        } else {
          p = model.addPart(part);
          // console.log(`add ${part}`);
          requests.push(p);
        }
        index++;
      }

      // delete non-exists parts
      for (var deleteId in partsById) {
        // console.log(`delete ${deleteId}`);
        p = model.deletePart(deleteId);
        requests.push(p);
      }
      
      // wait to update done
      if (requests.length) {
        try {
          await Promise.all(requests);
        } catch (err) {
          res.json({error: {code: -32603, message: err.toString()}});
          return;
        }
      }
    }

    // update Songs
    for (const k of ["song_id", "title", "reference",
                     "url", "url_type", "url_key", "comment", "status"]) {
      song[k] = params[k];
    }

    const result = await model.updateSong(song);
    if (!result.changes) {
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
    res.json({error: {code: -32603, message: err.toString()}});
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
    const result = await model.addPart(params);
    params.part_id = result.lastID;
    await model.createLog({user_id: song.user_id,
                           target_id: params.part_id,
                           action: "add_part"});
    
    res.json({result: { part: params }});
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

exports.getSongs = async function getSongs(req, res, next) {
  const params = req.body.params;

  try {
    const songs = await model.getSongs();
    for (const song of songs) {
      song.readiness = true;
      for (const part of song.parts) {
        if (part.required && !part.user_id) {
          song.readiness = false;
        }
      }
      song.create_time = _dateTimeToLocal(song.create_time);
      song.update_time = _dateTimeToLocal(song.update_time);
    }
    res.json({ result: { songs: songs } });
  } catch (err) {
    res.json({ error: { code: -32603, message: err.toString() } });
  }
};
  
exports.getLogs = async function listLogs(req, res, next) {
  const params = req.body.params;

  try {
    const logs = await model.getLogs(params);
    const count = await model.countLogs();

    const songs = await model.getSongs();
    let songById = {};
    for (const song of songs) {
      songById[song.song_id] = song;
    }

    const parts = await model.getParts();
    let partById = {};
    for (const part of parts) {
      partById[part.part_id] = part;
    }

    const comments = await model.getComments();
    let commentById = {};
    for (const comment of comments) {
      commentById[comment.comment_id] = comment;
    }

    for (const log of logs) {
      if (log.action == "create_entry"
          || log.action == "delete_entry"
          || log.action == "add_part"
          || log.action == "delete_part") {
        const part = partById[log.target_id];
        log.target_names = [
          songById[part.song_id].title,
          part.part_name
        ];
      } else if (log.action == "create_comment"
                 || log.action == "delete_comment") {
        const comment = commentById[log.target_id];
        log.target_names = [
          songById[comment.song_id].title
        ];
      } else if (log.action == "create_song"
                 || log.action == "update_song") {
        const song = songById[log.target_id];
        log.target_names = [ song.title ];
      }
      log.timestamp = _dateTimeToLocal(log.timestamp);
    }
    res.json({ result: { logs: logs, total_logs: count.count } });
  } catch (err) {
    res.json({ error: { code: -32603, message: err.toString() } });
  }
};
