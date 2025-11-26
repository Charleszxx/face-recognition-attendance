const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const moment = require('moment'); // Import moment.js for easy date formatting
const axios = require('axios');

const app = express();
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));
const db = new sqlite3.Database('./database.db');

// Multer setup - Use name as the filename
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => cb(null, `${req.body.name.toLowerCase().replace(/\s+/g, '_')}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// Upload profile
app.post('/upload', upload.single('image'), (req, res) => {
  const { name, address, dob, role, section_or_staff, phone_number } = req.body;
  const image = req.file.filename;
  db.run(`INSERT INTO people (name, image, address, dob, role, section_or_staff, phone_number)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [name, image, address, dob, role, section_or_staff, phone_number],
          () => res.redirect('/add-profile.html'));
});

// Get profiles for face recognition
app.get('/get-profiles', (req, res) => {
  db.all('SELECT name, image FROM people', (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to get profiles' });
    }
    console.log('Profiles fetched:', rows);
    res.json(rows);
  });
});

// Fetch all profiles (users) from the 'people' table
app.get('/get-all-profiles', (req, res) => {
  db.all('SELECT * FROM people', (err, rows) => {
    if (err) {
      console.error('Error fetching profiles:', err);
      return res.status(500).json({ error: 'Failed to fetch profiles' });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No profiles found' });
    }
    res.json(rows); // Send the rows as a JSON response
  });
});

// DELETE user by ID
app.delete('/delete-user/:id', (req, res) => {
  const userId = req.params.id;
  db.run('DELETE FROM people WHERE id = ?', [userId], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete user' });
    }
    res.json({ message: 'User deleted successfully' });
  });
});

// DELETE all attendance records
app.delete('/delete-all-attendance', (req, res) => {
  db.run('DELETE FROM attendance', function(err) {
    if (err) {
      console.error('Error deleting all attendance records:', err);
      return res.status(500).json({ error: 'Failed to delete all attendance records' });
    }
    res.json({ message: 'All attendance records deleted successfully' });
  });
});

// Get a single user
app.get('/get-user/:id', (req, res) => {
  const userId = req.params.id;
  db.get('SELECT * FROM people WHERE id = ?', [userId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Failed to get user' });
    res.json(row);
  });
});

// Fetch all attendance records with name, date, and time
app.get('/get-all-attendance', (req, res) => {
  const query = `
    SELECT name, date, time
    FROM attendance
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error fetching attendance:', err);
      return res.status(500).json({ error: 'Failed to fetch attendance' });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No attendance records found' });
    }
    res.json(rows); // Send the rows as a JSON response
  });
});

app.get('/get-user-name/:id', (req, res) => {
  const id = req.params.id;
  const query = `SELECT name FROM users WHERE id = ?`;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Error fetching user name:', err);
      return res.status(500).json({ error: 'Failed to fetch user name' });
    }
    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(row);
  });
});

// Get profile by name (used for attendance display)
app.get('/get-profile/:name', (req, res) => {
  const name = req.params.name;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  db.get(`SELECT * FROM people WHERE name = ?`, [name], (err, row) => {
    if (err) {
      console.error('Error fetching profile:', err);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(row);
  });
});

app.get('/mark-attendance', (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).send('Name is required.');

  db.get(`SELECT id, phone_number FROM people WHERE name = ?`, [name], (err, person) => {
    if (err) return res.status(500).send('Database error');
    if (!person) return res.status(404).send('Person not found');

    const now = new Date();
    const formattedDate = moment(now).format('YYYY-MM-DD');
    const formattedTime = moment(now).format('hh:mm:ss A');
    const formattedTimestamp = moment(now).format('YYYY-MM-DD hh:mm:ss A');

    // Check if already marked today
    db.get(`SELECT * FROM attendance WHERE person_id = ? AND date = ?`, [person.id, formattedDate], (err, row) => {
      if (err) return res.status(500).send('Database error');
      if (row) return res.send('Error: You already made an attendance today.');

      // If not, insert attendance
      db.run(
        `INSERT INTO attendance (person_id, name, date, time, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [person.id, name, formattedDate, formattedTime, formattedTimestamp],
        function (err) {
          if (err) return res.status(500).send('Error marking attendance');
          res.send(`Attendance marked for ${name} at ${formattedTimestamp}`);
        }
      );
    });
  });
});


app.listen(3000, () => console.log('Server started at http://localhost:3000'));