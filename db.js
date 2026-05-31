const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'forente_planeter_db',
  port: 5432,
  database: 'aqforecast',
  user: 'aqforecast',
  password: process.env.DB_PASSWORD || 'BadeBall2009'
});

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS weather_classifications (
        id SERIAL PRIMARY KEY,
        label VARCHAR(100) NOT NULL,
        description TEXT,
        min_precip_mm NUMERIC,
        max_precip_mm NUMERIC,
        min_hours_with_precip INTEGER,
        max_hours_with_precip INTEGER,
        min_temp NUMERIC,
        max_temp NUMERIC,
        icon VARCHAR(10),
        sort_order INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS historical_weather (
        id SERIAL PRIMARY KEY,
        location VARCHAR(100) NOT NULL,
        lat NUMERIC NOT NULL,
        lon NUMERIC NOT NULL,
        date DATE NOT NULL,
        temp_min NUMERIC,
        temp_max NUMERIC,
        temp_mean NUMERIC,
        precip_sum NUMERIC,
        precip_hours INTEGER,
        wind_speed_max NUMERIC,
        wind_speed_mean NUMERIC,
        classification_id INTEGER REFERENCES weather_classifications(id),
        raw_data JSONB,
        fetched_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(location, date)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_historical_weather_date 
      ON historical_weather(date);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_historical_weather_location_date 
      ON historical_weather(location, date);
    `);

    // Seed default classifications if empty
    const existing = await client.query('SELECT COUNT(*) FROM weather_classifications');
    if (parseInt(existing.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO weather_classifications 
          (label, description, min_precip_mm, max_precip_mm, min_hours_with_precip, max_hours_with_precip, icon, sort_order)
        VALUES
          ('Klarvær',         'Ingen eller ubetydelig nedbør',           0,    0.1,  0,  1,  '☀️',  1),
          ('Delvis skyet',    'Lite skyer, ingen nedbør',                0,    0.1,  0,  0,  '⛅',  2),
          ('Overskyet',       'Skyet uten nedbør',                       0,    0.1,  0,  0,  '☁️',  3),
          ('Mulighet for byger', 'Sporadiske draber, totalt lite nedbør',0.1,  1.0,  1,  2,  '🌦️', 4),
          ('Lette regnbyger', 'Noen timer med lett regn',                1.0,  5.0,  2,  5,  '🌧️', 5),
          ('Spredte regnbyger','Regn over flere timer',                  5.0, 15.0,  4,  8,  '🌧️', 6),
          ('Kraftig regn',    'Vedvarende og kraftig nedbør',           15.0, 9999, 6,  24, '⛈️',  7),
          ('Sludd',           'Blanding av regn og snø, nær 0 grader',  0.5, 9999, 1,  24, '🌨️',  8),
          ('Snøbyger',        'Kortvarig snøfall',                       0.5,  5.0,  1,  4,  '❄️',  9),
          ('Snøvær',          'Vedvarende snøfall',                      5.0, 9999, 4,  24, '❄️', 10),
          ('Tordenvær',       'Lyn og torden registrert',                2.0, 9999, 1,  24, '⛈️', 11)
        ON CONFLICT DO NOTHING;
      `);
    }

    console.log('DB initialized OK');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
