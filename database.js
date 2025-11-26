const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create or open the database file
const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Create 'people' table
db.run(`
  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image TEXT NOT NULL,
    address TEXT NOT NULL,
    dob TEXT NOT NULL,
    role TEXT NOT NULL,
    section_or_staff TEXT NOT NULL,
    phone_number TEXT NOT NULL
  )
`, (err) => {
  if (err) console.error('Error creating people table:', err.message);
});

// Create 'attendance'
db.run(`
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
  )
`, (err) => {
  if (err) console.error('Error creating attendance table:', err.message);
});

// Export the database
module.exports = db;
