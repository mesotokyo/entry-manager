const config = require('../config');
const pSqlite3 = require('./promised-sqlite3');

exports.getOrCreateUser = function getOrCreateUser(params) {
  if (params.name === undefined || !params.name.length) {
    return Promise.reject("no_name");
  }

  return this.createUser(params)
    .catch(err => {
      return this.getUser(params);
    });
};

exports.getUser = function getUser(params) {
  let _db;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      if (params.name) {
        return pSqlite3.runStatementAndGet(db,
                                           'SELECT * FROM users WHERE name = ?',
                                           params.name);
      }
      return Promise.reject("invalid_params");
    })
    .catch(err => {
      return Promise.reject(err);
    })
    .finally(() => {
      _db.close();
    });
};

exports.createUser = function createUser(params) {
  let _db;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      const sql = 'INSERT INTO users (name) VALUES (?)';
      return pSqlite3.runStatement(db, sql, params.name);
    })
    .then(result => {
      if (!result.lastID) {
        return Promise.reject("user_create_failed");
      }
      params.user_id = result.lastID;
      return Promise.resolve(params);
    })
    .finally(() => {
      _db.close();
    });

};

exports.getParts = function getParts(params) {
  params = params || {};
  let _db;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      let sql;
      if (params.song_id) {
        sql = 'SELECT * FROM parts WHERE song_id = ? AND status IS NULL' +
          '  ORDER BY `order` ASC';
        return pSqlite3.runStatementAndGetAll(db, sql, params.song_id);
      } else {
        sql = 'SELECT * FROM parts';
        return pSqlite3.runStatementAndGetAll(db, sql);
      }
    })
    .finally(() => {
      _db.close();
    });
};

exports.getPart = function getPart(partId) {
  if (partId === undefined) {
    return Promise.reject("no_part_id");
  }

  let _db;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      const sql = 'SELECT * FROM parts WHERE part_id = ?';
      return pSqlite3.runStatementAndGet(db, sql, partId);
    })
    .finally(() => {
      _db.close();
    });
};

exports.createSong = function createSong(params) {
  let _db;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      return pSqlite3.transaction(db);
    })
    .then(db => {
      const sql = 'INSERT INTO songs' +
            '    (title, reference, user_id, url, comment)' +
            '  VALUES (?, ?, ?, ?, ?)';
      return pSqlite3.runStatement(db, sql, params.title, params.reference,
                                   params.user_id, params.url, params.comment);
    })
    .then(result => {
      if (!result.lastID) {
        return Promise.reject("song_create_failed");
      }
      params.song_id = result.lastID;

      // insert parts
      let order = 0;
      let inserted = 0;
      let error_count = 0;
      const sql = 'INSERT INTO parts (song_id, part_name, `order`)' +
            '           VALUES (?, ?, ?)';
      const promises = [];
      for (const part_name of params.parts) {
        promises.push(pSqlite3.runStatement(_db, sql,
                                            params.song_id,
                                            part_name, order));
        order++;
      }
      return Promise.all(promises);
    })
    .then(values => {
      return pSqlite3.commit(_db);
    })
    .then(db => {
      return Promise.resolve(params);
    })
    .finally(() => {
      _db.close();
    });
};

exports.updateSong = function updateSong(params) {
  let _db;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      const sql= 'UPDATE songs' +
            '  SET (title, reference, url, comment, '+
            '     status, update_time)' +
            '  = (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)' +
            '  WHERE song_id = ?';
      return pSqlite3.runStatement(db, sql,
                               params.title, params.reference,
                               params.url, params.comment,
                               params.status, params.song_id);
    })
    .then(result => {
      if (!result.changes) {
        return Promise.reject("song_update_failed");
      }
      return Promise.resolve(result.changes);
    })
    .finally(() => {
      _db.close();
    });
};

exports._updateSongTimestamp = function _updateSongTimestamp(db, songId) {
  const sql = 'UPDATE songs' +
        '  SET update_time = CURRENT_TIMESTAMP' +
        '  WHERE song_id = ?';
  return pSqlite3.runStatement(db, sql, songId);
};

exports.addPart = function addPart(params) {
  let _db;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      return pSqlite3.transaction(db);
    })
    .then(db => {
      const sql = 'INSERT INTO parts ' +
            '  (song_id, part_name, `order`)' +
            '  VALUES (?, ?, ?)';
      return pSqlite3.runStatement(db, sql,
                                   params.song_id,
                                   params.part_name,
                                   params.order);
    })
    .then(result => {
      if (!result.lastID) {
        return Promise.reject("add_part_failed");
      }
      params.part_id = result.lastID;
      return this._updateSongTimestamp(_db, params.song_id);
    })
    .then(result => {
      if (!result.changes) {
        return Promise.reject("update_timestamp_failed");
      }
      return pSqlite3.commit(_db);
    })
    .then(db => {
      return Promise.resolve(params);
    })
    .finally(() => {
      _db.close();
    });
};

exports.updatePart = function updatePart(params) {
  let _db;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      return pSqlite3.transaction(db);
    })
    .then(db => {
      const sql = 'UPDATE parts ' +
            '  (part_name, order, user_id, instrument_name)' +
            '  VALUE (?, ?, ?, ?)' +
            '  WHERE part_id = ?';
      return pSqlite3.runStatement(db, sql,
                                   params.part_name,
                                   params.order,
                                   params.user_id,
                                   params.instrument_name,
                                   params.part_id);
    })
    .then(result => {
      if (!result.changes) {
        return Promise.reject(new Error("update_timestamp_failed"));
      }
      return this._updateSongTimestamp(db, part.song_id);
    })
    .then( result => {
      if (!result.changes) {
        return Promise.reject("update_timestamp_failed");
      }
      return pSqlite3.commit(_db);
    })
    .then(db => {
      return Promise.resolve(params);
    })
    .finally(() => {
      _db.close();
    });
};

exports.deletePart = function deletePart(partId) {
  let _db;
  let _part;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      return pSqlite3.transaction(db);
    })
    .then(db => {
      const sql = 'SELECT * FROM parts WHERE part_id = ?';
      return pSqlite3.runStatementAndGet(db, sql, partId);
    })
    .then(part => {
      if (!part) {
        return Promise.reject("no_part_exists");
      }
      if (part.user_id) {
        return Promise.reject("part_has_player");
      }
      _part = part;
      const sql = 'UPDATE parts SET status = "deleted" WHERE part_id = ?';
      return pSqlite3.runStatement(_db, sql, part.part_id);
    })
    .then(result => {
      if (!result.changes) {
        return Promise.reject("delete_part_failed");
      }
      return this._updateSongTimestamp(_db, _part.song_id);
    })
    .then(result => {
      if (!result.changes) {
        return Promise.reject(new Error("update_timestamp_failed"));
      }
      return pSqlite3.commit(_db);
    })
    .then(db => {
      return Promise.resolve(_part);
    })
    .finally(() => {
      _db.close();
    });
};

exports.getSong = function getSong(songId) {
  let _db;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      const sql = 'SELECT songs.*, users.name AS author FROM songs' +
            '  LEFT JOIN users USING(user_id)' +
            '  WHERE song_id = ?';
      return pSqlite3.runStatementAndGet(db, sql, songId);
    })
    .finally(() => {
      _db.close();
    });
};

exports.getSongs = function getSongs() {
  let _songs;
  let _db;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      const sql = 'SELECT songs.*, users.name AS author FROM songs' +
            '  LEFT JOIN users USING(user_id)' +
            '  ORDER BY song_id ASC';
      return pSqlite3.runStatementAndGetAll(db, sql);
    })
    .then(rows => {
      _songs = rows;
      const sql = 'SELECT parts.*, users.name AS entry_name' +
            '  FROM parts' +
            '  LEFT JOIN users USING(user_id)' +
            '  WHERE parts.status IS NULL';
      return pSqlite3.runStatementAndGetAll(_db, sql);
      })
    .then(rows => {
      const partList = {};
      for (const part of rows) {
        if (partList[part.song_id] === undefined) {
          partList[part.song_id] = [];
        }
        partList[part.song_id].push(part);
      }
      for (const song of _songs) {
        song.parts = partList[song.song_id] || [];
      }
      return Promise.resolve(_songs);
    })
    .finally(() => {
      _db.close();
    });
};

exports.createEntry = function createEntry(params) {
  let _db;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      const sql = 'UPDATE parts SET user_id = ?, instrument_name = ?' +
            '  WHERE part_id = ? AND user_id IS NULL';
      return pSqlite3.runStatement(db, sql,
                                   params.user_id,
                                   params.instrument_name || "",
                                   params.part_id);
    })
    .finally(() => {
      _db.close();
    });
};

exports.deleteEntry = function deleteEntry(partId) {
  let _db;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      const sql = 'UPDATE parts ' +
            'SET user_id = NULL, instrument_name = NULL' +
            '  WHERE part_id = ?';
      return pSqlite3.runStatement(db, sql, partId);
    })
    .finally(() => {
      _db.close();
    });
};

exports.createComment = function createComment(params) {
  let _db;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      const sql = 'INSERT INTO comments (user_id, comment, song_id)' +
            '  VALUES (?, ?, ?)';
      return pSqlite3.runStatement(db, sql,
                                   params.user_id,
                                   params.comment,
                                   params.song_id);
    })
    .then(result => {
      if (!result.lastID) {
        return Promise.reject("comment_create_failed");
      }
      params.comment_id = result.lastID;
      return Promise.resolve(params);
    })
    .finally(() => {
      _db.close();
    });
};

exports.getComment = function getComment(comment_id) {
  let _db;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      const sql = 'SELECT comments.*, users.name AS author FROM comments' +
            '  LEFT JOIN users USING(user_id)' +
            '  WHERE comments.comment_id = ?';
      return pSqlite3.runStatementAndGet(db, sql, comment_id);
    })
    .finally(() => {
      _db.close();
    });
};

exports.countComments = function countComments(song_id) {
  let _db;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      if (song_id) {
        const sql = 'SELECT COUNT(comment_id) AS count FROM comments' +
              '  WHERE comments.song_id = ?';
        return pSqlite3.runStatementAndGet(db, sql, song_id);
      } else {
        const sql = 'SELECT COUNT(comment_id) AS count FROM comments';
        return pSqlite3.runStatementAndGet(db, sql);
      }
    })
    .finally(() => {
      _db.close();
    });
};

exports.getComments = function getComments(song_id) {
  let _db;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      if (song_id) {
        const sql = 'SELECT comments.*, users.name AS author FROM comments' +
          '  LEFT JOIN users USING(user_id)' +
          '  WHERE comments.song_id = ? AND comments.status IS NULL';
        return pSqlite3.runStatementAndGetAll(db, sql, song_id);
      } else {
        const sql = 'SELECT comments.*, users.name AS author FROM comments' +
          '  LEFT JOIN users USING(user_id)';
        return pSqlite3.runStatementAndGetAll(db, sql);
      }
    })
    .finally(() => {
      _db.close();
    });
};


exports.deleteComment = function deleteComment(commentId) {
  let _db;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      const sql = 'UPDATE comments' +
            '  SET status = "deleted",' +
            '      update_time = CURRENT_TIMESTAMP' +
            '  WHERE comment_id = ?';
      return pSqlite3.runStatement(db, sql, commentId);
    })
    .finally(() => {
      _db.close();
    });
};

exports.createLog = function createLog(params) {
  let _db;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      const sql = 'INSERT INTO logs' +
            '         (user_id, action, target_id)' +
            '  VALUES (?,       ?,       ?)';
      return pSqlite3.runStatement(db, sql,
                                   params.user_id,
                                   params.action,
                                   params.target_id);
    })
    .then(result => {
      if (!result.lastID) {
        return Promise.reject("log_create_failed");
      }
      params.log_id = result.lastID;
      return Promise.resolve(params);
    })
    .finally(() => {
      _db.close();
    });
};

exports.getLogs = function getLogs(params) {
  let _db;
  params.limit = params.limit || 100;
  params.offset = params.offset || 0;
  
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      const sql = 'SELECT * FROM logs' +
            '        LEFT JOIN users USING(user_id)' +
            '        ORDER BY timestamp DESC LIMIT ? OFFSET ?';
      return pSqlite3.runStatementAndGetAll(db, sql,
                                            params.limit,
                                            params.offset);
    })
    .finally(() => {
      _db.close();
    });
};

exports.countLogs = function countLogs() {
  let _db;
  return pSqlite3.connect(config)
    .then(db => {
      _db = db;
      const sql = 'SELECT COUNT(log_id) AS count FROM logs';
        return pSqlite3.runStatementAndGet(db, sql);
    })
    .finally(() => {
      _db.close();
    });
};
