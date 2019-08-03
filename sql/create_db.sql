CREATE TABLE IF NOT EXISTS songs (
  song_id INT PRIMARY KEY,
  reference TEXT,
  title TEXT UNIQUENOT NULL,
  url TEXT,
  comment TEXT
);

CREATE TABLE IF NOT EXISTS parts (
  part_id INT PRIMARY KEY,
  song_id INT NOT NULL,
  name TEXT UNIQUTE NOT NULL,
  `order` INT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  user_id INT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  password TEXT,
  auth_type TEXT,
  token TEXT
);

CREATE TABLE IF NOT EXISTS entries (
  entry_id INT PRIMARY KEY,
  song_id INT NOT NULL,
  part_id INT NOT NULL,
  user_id INT NOT NULL
);


