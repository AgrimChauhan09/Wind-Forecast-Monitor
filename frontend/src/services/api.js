import axios from 'axios';

export async function fetchWindData({ startDate, endDate, horizon }) {
  const response = await axios.get('/api/wind-data', {
    params: {
      startDate,
      endDate,
      horizon,
    },
  });
  return response.data;
}
