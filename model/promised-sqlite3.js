const sqlite3 = require('sqlite3');

const TIMEOUT_MSEC = 10000;
const RETRY_MSEC = 10;

exports.connect = function connect(config) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(config.database, function(err) {
      if (err) {
        console.error(err);
        reject(err);
        return;
      }
      resolve(db);
    });
  });
};

exports.close = function close(db) {
  return new Promise((resolve, reject) => {
    db.close(function (err) {
      if (err) {
        console.error(err);
        reject(err);
        return;
      }
      resolve(db);
    });
  });
};

exports.transaction = function transaction(db) {
  return new Promise((resolve, reject) => {
    db.run('BEGIN TRANSACTION', function (err) {
      if (err) {
        console.error(err);
        reject(err);
        return;
      }
      resolve(db);
    });
  }).catch(_err => {
    db.run('ROLLBACK', function (err) {
      if (err) {
        return Promise.reject(err);
      }
      return Promise.reject(_err);
    });
  });
};

exports.commit = function commit(db) {
  return new Promise((resolve, reject) => {
    db.run('COMMIT', function (err) {
      if (err) {
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
        reject(err);
        return;
      }
      resolve(db);
    });
  });
};

function _prepare(db, sql, callback, elapsed) {
  db.prepare(sql, function (err) {
    // if database if busy, retry
    if (err && err.code == 'SQLITE_BUSY') {
      elapsed = elapsed || 0;
      // timeout
      if (elapsed > TIMEOUT_MSEC) {
        callback.call(this, err);
      }

      // retry
      let delay;
      if (!elapsed) {
        delay = RETRY_MSEC;
      } else {
        delay = elapsed;
      }
      elapsed += delay;
      setTimeout(_prepare, delay, sql, callback, elapsed);
      return;
    }

    // done
    callback.call(this, err);
  });
}

exports.prepare = function prepare(db, sql) {
  return new Promise((resolve, reject) => {
    //db.prepare(sql, function (err) {
    _prepare(db, sql, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
};


function _execStmt(stmt, f, args) {
  return new Promise((resolve, reject) => {
    let elapsed = 0;

    function cb(err, result) {
      // if database if busy, retry
      if (err && err.code == 'SQLITE_BUSY') {

        // retry
        if (elapsed < TIMEOUT_MSEC) {
          // retry
          let delay;
          if (!elapsed) {
            delay = RETRY_MSEC;
          } else {
            delay = elapsed;
          }
          elapsed += delay;
          setTimeout(function () {
            stmt[f].apply(stmt, newArgs);
          },  delay);
          return;
        }
      }
      // done
      if (err) {
        reject(err);
        return;
      }
      if (result) {
        resolve(result);
        return;
      }
      resolve(this);
    }

    const newArgs = Array.from(args);
    newArgs.push(cb);
    stmt[f].apply(stmt, newArgs);
  });
}

exports._execStatement = function _execStatement(db, f, sql, args) {
  let _stmt;
  return this.prepare(db, sql)
    .then(stmt => {
      _stmt = stmt;
      return _execStmt(stmt, f, args);
    })
    .catch(err => {
      _stmt.finalize();
      return Promise.reject(err);
    })
    .then(result => {
      _stmt.finalize();
      return Promise.resolve(result);
    })
    .catch(err => {
      //console.error(err);
      return Promise.reject(err);
    });
  
};

exports.runStatement = function runStatement(db, sql) {
  const args = Array.prototype.slice.call(arguments, 2);
  return this._execStatement(db, "run", sql, args);
};

exports.runStatementAndGetAll = function runStatementAll(db, sql) {
  const args = Array.prototype.slice.call(arguments, 2);
  return this._execStatement(db, "all", sql, args);
};

exports.runStatementAndGet = function runStatementAndGet(db, sql) {
  const args = Array.prototype.slice.call(arguments, 2);
  return this._execStatement(db, "get", sql, args);
};
