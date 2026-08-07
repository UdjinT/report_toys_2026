CREATE TABLE collectors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_user_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE machines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  point_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  description TEXT,
  FOREIGN KEY(point_id) REFERENCES points(id)
);

CREATE TABLE collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_id INTEGER NOT NULL,
  collector_id INTEGER,
  collector TEXT NOT NULL,
  amount REAL NOT NULL,
  quantity INTEGER NOT NULL,
  comment TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(machine_id) REFERENCES machines(id),
  FOREIGN KEY(collector_id) REFERENCES collectors(id)
);

CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  comment TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(machine_id) REFERENCES machines(id)
);
