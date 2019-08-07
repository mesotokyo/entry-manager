const sqlite3 = require('sqlite3');

exports.connect = function connect(config) {
  let _db;
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(config.database);
    _db = db;
    resolve(db);
  });
};

exports.close = function close(db) {
  return new Promise((resolve, reject) => {
    db.close(function (err) {
      if (err) {
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

exports.prepare = function prepare(db, sql) {
  return new Promise((resolve, reject) => {
    db.prepare(sql, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
};

exports._execStatement = function _execStatement(db, f, sql, args) {

  return new Promise((resolve, reject) => {
    return this.prepare(db, sql)
      .then(stmt => {
        args.push(function (err, result) {
          stmt.finalize();
          if (err) {
            reject(err);
            return;
          }
          if (result) {
            resolve(result);
            return;
          }
          resolve(this);
        });
        stmt[f].apply(stmt, args);
      });
    
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
