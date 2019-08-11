CREATE TABLE IF NOT EXISTS songs (
  song_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  reference TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  url TEXT,
  url_type TEXT,
  url_key TEXT,
  comment TEXT,
  create_time TEXT DEFAULT CURRENT_TIMESTAMP,
  update_time TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT,
  UNIQUE(title, reference)
);

CREATE TABLE IF NOT EXISTS parts (
  part_id INTEGER PRIMARY KEY,
  song_id INTEGER NOT NULL,
  part_name TEXT NOT NULL,
  `order` INTEGER NOT NULL,
  required INTEGER DEFAULT 0,
  user_id INTEGER,
  instrument_name TEXT,
  status TEXT
);

CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  password TEXT,
  auth_type TEXT,
  token TEXT
);

CREATE TABLE IF NOT EXISTS logs (
  log_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comments (
  comment_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  comment TEXT NOT NULL,
  song_id INTEGER NOT NULL,
  `status` TEXT,
  create_time TEXT DEFAULT CURRENT_TIMESTAMP,
  update_time TEXT DEFAULT CURRENT_TIMESTAMP
);

