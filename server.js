require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

app.use(express.static(path.join(__dirname, 'public')));

// Weather by city or coords
app.get('/weather', async (req, res) => {
  try {
    let url;
    if (req.query.city) {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        req.query.city
      )}&appid=${API_KEY}&units=metric`;
    } else if (req.query.lat && req.query.lon) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${req.query.lat}&lon=${req.query.lon}&appid=${API_KEY}&units=metric`;
    } else {
      return res.status(400).json({ error: 'City or lat/lon required' });
    }

    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

// Forecast by coords
app.get('/forecast', async (req, res) => {
  try {
    if (!req.query.lat || !req.query.lon) {
      return res.status(400).json({ error: 'lat & lon required' });
    }

    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${req.query.lat}&lon=${req.query.lon}&appid=${API_KEY}&units=metric`;

    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
