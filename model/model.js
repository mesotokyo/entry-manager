const sqlite3 = require('sqlite3');
const config = require('../config');

exports.connect = function connect() {
  const database = config.database;
  const db = new sqlite3.Database(database);
  return db;
};

exports.transaction = function transaction(db) {
  db = db || this.connect();
  return new Promise((resolve, reject) => {
    db.run('BEGIN TRANSACTION', function (err) {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      resolve(db);
    });
  });
};

exports.commit = function commit(db) {
  return new Promise((resolve, reject) => {
    db.run('COMMIT', function (err) {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      resolve(db);
    });
  });
};

exports.rollback = function rollback(db) {
  return new Promise((resolve, reject) => {
    db.run('ROLLBACK', function (err) {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      resolve(db);
    });
  });
};

exports.runStatement = function runStatement(stmt) {
  return new Promise((resolve, reject) => {
    if (stmt == undefined) {
      reject("no_statement");
      return;
    }
    const args = Array.prototype.slice.call(arguments, 1);
    args.push(function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
    stmt.run.apply(stmt, args);
  });
};

exports.runStatementAll = function runStatementAll(stmt) {
  return new Promise((resolve, reject) => {
    if (stmt == undefined) {
      reject("no_statement");
      return;
    }
    const args = Array.prototype.slice.call(arguments, 1);
    args.push(function (err, rows) {
      if (err) { reject(err); return; }
      resolve(rows);
    });
    stmt.all.apply(stmt, args);
  });
};


exports.getOrCreateUser = function getOrCreateUser(params) {
  return new Promise((resolve, reject) => {
    if (params.name === undefined || !params.name.length) {
      reject("no_name");
      return;
    }
    this.createUser(params)
      .then(
        () => { return this.getUser(params) },
        () => { return this.getUser(params) }
      )
      .then(user => {
        resolve(user);
      })
      .catch(err => {
        reject(err);
      });
  });
};

exports.getUser = function getUser(params) {
  return new Promise((resolve, reject) => {
    const db = this.connect();
    let stmt;
    if (params.name) {
      stmt = db.prepare('SELECT * FROM users WHERE name = ?');
    }
    if (stmt === undefined) {
      db.close();
      reject(new Error("no_quey_param"));
      return;
    }
    stmt.get(params.name, function (err, row) {
      stmt.finalize();
      db.close();
      if (err) {
        reject(new Error(err));
        return;
      }
      resolve(row);
      return;
    });
  });
};

exports.createUser = function createUser(params) {
  return new Promise((resolve, reject) => {
    const db = this.connect();
    const stmt = db.prepare('INSERT INTO users (name)' +
                            '           VALUES (?)');
    this.runStatement(stmt, params.name).then(
      result => {
        stmt.finalize();
        db.close();
        if (!result.lastID) {
          reject(new Error("user_create_failed"));
          return;
        }
        resolve(result.lastID);
        return;
      })
      .catch(err => {
        stmt.finalize();
        db.close();
        reject(err);
      });
  });
};

exports.getParts = function getParts(params) {
  return new Promise((resolve, reject) => {
    if (params.song_id === undefined) {
      reject("no_song_id");
      return;
    }
    const db = this.connect();
    const stmt = db.prepare('SELECT * FROM parts WHERE song_id = ?' +
                            '  ORDER BY `order` ASC');
    stmt.runStatementAll(params.song_id)
      .then(rows => {
        stmt.finalize();
        db.close();
        resolve(rows);
        return;
      })
      .catch(err => {
        stmt.finalize();
        db.close();
        reject(err);
      });
  });
};

exports.createSong = function createSong(params) {
  return new Promise((resolve, reject) => {
    // const db = this.connect();
    let db;
    let songId;
    let stmt;

    this.transaction()
      .then(_db => {
        db = _db;
        stmt = db.prepare('INSERT INTO songs' +
                          '    (title, reference, url, comment, user_id)' +
                          '  VALUES (?, ?, ?, ?, ?)');
        return this.runStatement(stmt, params.title, params.reference,
                                 params.url, params.comment, params.user_id);
      })
      .then(result => {
        stmt.finalize();
        if (!result.lastID) {
          return Promise.reject(new Error("song_create_failed"));
        }
        songId = result.lastID;

        // insert parts
        let order = 0;
        let inserted = 0;
        let error_count = 0;
        stmt = db.prepare('INSERT INTO parts (song_id, name, `order`)' +
                          '           VALUES (?, ?, ?)');
        const promises = [];
        for (const name of params.parts) {
          promises.push(this.runStatement(stmt,
                                          songId,
                                          name,
                                          order));
          order++;
        }
        return Promise.all(promises);
      })
      .then(values => {
        stmt.finalize();
        return this.commit(db);
      })
      .then(
        (db) => {
          db.close();
          resolve(songId);
        },
        err => {
          if (stmt) { stmt.finalize(); }
          db.close();
          reject(err);
        }
      )
      .catch(err => {
        if (stmt) { stmt.finalize(); }
        this.rollback(db).finally(() => {
          db.close();
          reject(err);
        });
      });
  });
};

exports.updateSong = function updateSong(params) {
  return new Promise((resolve, reject) => {
    const db = this.connect();
    const stmt = db.prepare('UPDATE songs' +
                            '  (title, reference, url, comment, '+
                            '     status, update_time)' +
                            '  VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)' +
                            '  WHERE song_id = ?');
    return this.runStatement(stmt,
                             params.title, params.reference,
                             params.url, params.comment,
                             params.status, params.song_id)
      .then(result => {
        stmt.finalize();
        if (!result.changes) {
          reject(new Error("song_update_failed"));
          return;
        }
        resolve(result.changes);
      })
      .catch(err => {
        stmt.finalize();
        db.close();
        reject(err);
      });
  });
};

exports.deletePart = function deletePart(params) {
  return new Promise((resolve, reject) => {
    // const db = this.connect();
    let db;
    let part;
    let stmt;

    this.transaction()
      .then(_db => {
        db = _db;
        stmt = db.prepare('SELECT * FROM parts ' +
                          '  WHERE part_id = ?');
        return this.runStatementAll(stmt, params.part_id);
      })
      .then(parts => {
        stmt.finalize();
        if (parts.length == 0) {
          return Promise.reject(new Error("no_part_exists"));
        }
        part = parts[0];
        if (part.user_id) {
          return Promise.reject(new Error("part_has_player"));
        }
        stmt = db.prepare('DELETE FROM parts ' +
                          '  WHERE part_id = ?');
        return this.runStatement(stmt, params.part_id);
      })
      .then(result => {
          stmt.finalize();
          if (!result.changes) {
            return Promise.reject(new Error("delete_part_failed"));
          }
          stmt = db.prepare('UPDATE songs' +
                            '  SET update_time = CURRENT_TIMESTAMP' +
                            '  WHERE song_id = ?');
          return this.runStatement(stmt, part.song_id);
      })
      .then(result => {
        stmt.finalize();
          if (!result.changes) {
            return Promise.reject(new Error("update_timestamp_failed"));
          }
        return this.commit(db);
      })
      .then(
        db => {
          db.close();
          resolve(1);
        },
        err => {
          if (stmt) { stmt.finalize(); }
          db.close();
          reject(err);
        }
      )
      .catch(err => {
        if (stmt) { stmt.finalize(); }
        this.rollback(db).finally(() => {
          db.close();
          reject(err);
        });
      });

}

exports.getSongs = function getSongs() {
  return new Promise((resolve, reject) => {
    const db = this.connect();
    let stmt = db.prepare('SELECT songs.*, users.name AS author FROM songs' +
                          '  LEFT JOIN users USING(user_id)' +
                          '  ORDER BY song_id ASC');
    let songs;
    this.runStatementAll(stmt)
      .then(rows => {
        stmt.finalize();
        songs = rows;
        stmt = db.prepare('SELECT parts.*, users.name AS entry_name' +
                          '  FROM parts' +
                          '  LEFT JOIN users USING(user_id)');
        return this.runStatementAll(stmt);
      })
      .then(rows => {
        stmt.finalize();
        const partList = {};
        for (const part of rows) {
          if (partList[part.song_id] === undefined) {
            partList[part.song_id] = [];
          }
          partList[part.song_id].push(part);
        }
        for (const song of songs) {
          song.parts = partList[song.song_id] || [];
        }
        db.close();
        resolve(songs);
      })
      .catch(err => {
        if (stmt) { stmt.finalize(); };
        db.close();
        reject(err);
      });
  });
};

exports.createEntry = function createEntry(params) {
  return new Promise((resolve, reject) => {
    const db = this.connect();
    const stmt = db.prepare('UPDATE parts SET user_id = ?, instrument_name = ?' +
                            '  WHERE part_id = ? AND user_id IS NULL');
    this.runStatement(stmt,
                      params.user_id,
                      params.instrument_name || "",
                      params.part_id)
      .then(result => {
        stmt.finalize();
        db.close();
        resolve(result.changes);
      })
      .catch(err => {
        stmt.finalize();
        db.close();
        reject(err);
      });
  });
};

exports.deleteEntry = function deleteEntry(params) {
  return new Promise((resolve, reject) => {
    const db = this.connect();
    const stmt = db.prepare('UPDATE parts ' +
                            'SET user_id = NULL, instrument_name = NULL' +
                            '  WHERE part_id = ?');
    this.runStatement(stmt,
                      params.user_id,
                      params.instrument_name || "",
                      params.part_id)
      .then(result => {
        stmt.finalize();
        db.close();
        resolve(result.changes);
      })
      .catch(err => {
        stmt.finalize();
        db.close();
        reject(err);
      });
  });
};

exports.createComment = function createComment(params) {
  return new Promise((resolve, reject) => {
    const db = this.connect();
    const stmt = db.prepare('INSERT INTO comments' +
                            '         (user_id, comment, song_id)' +
                            '  VALUES (?, ?, ?)');
    this.runStatement(stmt,
                      params.user_id,
                      params.comment,
                      params.song_id).then(
      result => {
        stmt.finalize();
        db.close();
        if (!result.lastID) {
          reject(new Error("comment_create_failed"));
          return;
        }
        resolve(result.lastID);
        return;
      })
      .catch(err => {
        stmt.finalize();
        db.close();
        reject(err);
      });
  });
};

exports.deleteComment = function deleteComment(params) {
  return new Promise((resolve, reject) => {
    const db = this.connect();
    const stmt = db.prepare('UPDATE comments' +
                            '  SET status = "deleted",' +
                            '      update_time = CURRENT_TIMESTAMP' +
                            '  WHERE comment_id = ?');
    this.runStatement(stmt, params.comment_d).then(
      result => {
        stmt.finalize();
        db.close();
        if (!result.changes) {
          reject(new Error("comment_delete_failed"));
          return;
        }
        resolve(result.changes);
        return;
      })
      .catch(err => {
        stmt.finalize();
        db.close();
        reject(err);
      });
  });
};

exports.createLog = function createLog(params) {
  return new Promise((resolve, reject) => {
    const db = this.connect();
    const stmt = db.prepare('INSERT INTO logs' +
                            '         (user_id, action, target_id)' +
                            '  VALUES (?,       ?,       ?)');
    this.runStatement(stmt,
                      params.user_id,
                      params.action,
                      params.target_id)
      .then(result => {
        stmt.finalize();
        db.close();
        if (!result.lastID) {
          reject(new Error("log_create_failed"));
          return;
        }
        resolve(result.lastID);
        return;
      })
      .catch(err => {
        stmt.finalize();
        db.close();
        reject(err);
      });
  });
};
