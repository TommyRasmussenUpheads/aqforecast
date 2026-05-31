const { pool } = require('./db');

async function classify(precipSum, precipHours, tempMean) {
  const client = await pool.connect();
  try {
    if (tempMean !== null && tempMean <= 0 && precipSum > 0.5) {
      const r = await client.query(
        "SELECT id FROM weather_classifications WHERE label = 'Snøvær' LIMIT 1"
      );
      if (r.rows.length) return r.rows[0].id;
    }
    if (tempMean !== null && tempMean > 0 && tempMean <= 2 && precipSum > 0.5) {
      const r = await client.query(
        "SELECT id FROM weather_classifications WHERE label = 'Sludd' LIMIT 1"
      );
      if (r.rows.length) return r.rows[0].id;
    }

    const ps = parseFloat(precipSum) || 0;
    const ph = parseInt(precipHours) || 0;
    const r = await client.query(
      `SELECT id FROM weather_classifications
       WHERE $1 >= min_precip_mm AND $1 < max_precip_mm
         AND $2 >= min_hours_with_precip
         AND $2 <= max_hours_with_precip
       ORDER BY sort_order LIMIT 1`,
      [ps, ph]
    );
    return r.rows.length ? r.rows[0].id : null;
  } finally {
    client.release();
  }
}

async function fetchAndStore(location, lat, lon, date) {
  const cached = await pool.query(
    'SELECT * FROM historical_weather WHERE location = $1 AND date = $2',
    [location, date]
  );
  if (cached.rows.length > 0) return cached.rows[0];

  const url = 'https://archive-api.open-meteo.com/v1/archive?' +
    'latitude=' + lat + '&longitude=' + lon +
    '&start_date=' + date + '&end_date=' + date +
    '&hourly=temperature_2m,precipitation,wind_speed_10m' +
    '&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,' +
    'precipitation_sum,wind_speed_10m_max,wind_speed_10m_mean' +
    '&timezone=Europe/Oslo';

  const res = await fetch(url);
  if (!res.ok) throw new Error('Open-Meteo HTTP ' + res.status);
  const data = await res.json();

  const d = data.daily;
  const tempMin  = d.temperature_2m_min  && d.temperature_2m_min[0]  != null ? d.temperature_2m_min[0]  : null;
  const tempMax  = d.temperature_2m_max  && d.temperature_2m_max[0]  != null ? d.temperature_2m_max[0]  : null;
  const tempMean = d.temperature_2m_mean && d.temperature_2m_mean[0] != null ? d.temperature_2m_mean[0] : null;
  const precipSum = d.precipitation_sum  && d.precipitation_sum[0]   != null ? d.precipitation_sum[0]   : 0;
  const windMax  = d.wind_speed_10m_max  && d.wind_speed_10m_max[0]  != null ? d.wind_speed_10m_max[0]  : null;
  const windMean = d.wind_speed_10m_mean && d.wind_speed_10m_mean[0] != null ? d.wind_speed_10m_mean[0] : null;

  const hourlyPrecip = (data.hourly && data.hourly.precipitation) || [];
  const precipHours = hourlyPrecip.filter(function(p) { return p > 0.1; }).length;

  const classId = await classify(precipSum, precipHours, tempMean);

  const result = await pool.query(
    'INSERT INTO historical_weather' +
    ' (location, lat, lon, date, temp_min, temp_max, temp_mean,' +
    '  precip_sum, precip_hours, wind_speed_max, wind_speed_mean,' +
    '  classification_id, raw_data)' +
    ' VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)' +
    ' ON CONFLICT (location, date) DO UPDATE SET' +
    '  temp_min=EXCLUDED.temp_min, temp_max=EXCLUDED.temp_max,' +
    '  temp_mean=EXCLUDED.temp_mean, precip_sum=EXCLUDED.precip_sum,' +
    '  precip_hours=EXCLUDED.precip_hours, wind_speed_max=EXCLUDED.wind_speed_max,' +
    '  wind_speed_mean=EXCLUDED.wind_speed_mean, classification_id=EXCLUDED.classification_id,' +
    '  raw_data=EXCLUDED.raw_data, fetched_at=NOW()' +
    ' RETURNING *',
    [location, lat, lon, date, tempMin, tempMax, tempMean,
     precipSum, precipHours, windMax, windMean, classId, JSON.stringify(data)]
  );

  return result.rows[0];
}

module.exports = { fetchAndStore };
