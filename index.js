const express = require('express');
const path = require('path');
const { initDb } = require('./db');
const { fetchAndStore } = require('./historical');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Yr proxy - today/future forecast
app.get('/forecast', async (req, res) => {
  const lat = req.query.lat || '58.1599';
  const lon = req.query.lon || '7.9957';
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AqForecast/1.0 tommy@skydotten.no' }
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Historical weather - fetches from Open-Meteo and caches in Postgres
app.get('/historical', async (req, res) => {
  const { date, lat, lon, location } = req.query;
  if (!date) return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });

  const useLat = lat || '58.1599';
  const useLon = lon || '7.9957';
  const useLoc = location || 'Kristiansand';

  try {
    const data = await fetchAndStore(useLoc, useLat, useLon, date);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get weather classifications table
app.get('/classifications', async (req, res) => {
  const { pool } = require('./db');
  try {
    const result = await pool.query(
      'SELECT * FROM weather_classifications ORDER BY sort_order'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a classification
app.put('/classifications/:id', async (req, res) => {
  const { pool } = require('./db');
  const { id } = req.params;
  const { label, description, min_precip_mm, max_precip_mm,
          min_hours_with_precip, max_hours_with_precip, icon } = req.body;
  try {
    const result = await pool.query(`
      UPDATE weather_classifications SET
        label = $1, description = $2, min_precip_mm = $3,
        max_precip_mm = $4, min_hours_with_precip = $5,
        max_hours_with_precip = $6, icon = $7
      WHERE id = $8 RETURNING *
    `, [label, description, min_precip_mm, max_precip_mm,
        min_hours_with_precip, max_hours_with_precip, icon, id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', app: 'AqForecast' }));

initDb().then(() => {
  app.listen(3000, () => console.log('AqForecast running on port 3000'));
}).catch(err => {
  console.error('DB init failed:', err.message);
  process.exit(1);
});
