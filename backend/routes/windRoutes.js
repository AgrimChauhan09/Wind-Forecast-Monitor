const express = require('express');
const { getWindData } = require('../services/windService');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, horizon } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required query parameters' });
    }

    let horizonHours = Number.isNaN(Number(horizon)) ? 0 : Number(horizon);
    if (horizonHours < 0) horizonHours = 0;
    if (horizonHours > 48) horizonHours = 48;

    const data = await getWindData({
      startDate,
      endDate,
      horizonHours,
    });

    return res.json(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in /api/wind-data route', error.message);
    return res.status(500).json({ error: 'Failed to fetch wind data' });
  }
});

module.exports = router;

