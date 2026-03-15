const express = require('express');
const cors = require('cors');
const windRoutes = require('./routes/windRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Wind forecast backend running' });
});

app.use('/api/wind-data', windRoutes);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

