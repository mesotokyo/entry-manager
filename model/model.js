const sqlite3 = require('sqlite3');
const config = require('../config');

exports.connect = function connect() {
  const database = config.database
  const db = new sqlite3.Database(database);
  return db;
};

