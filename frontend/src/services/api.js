import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export async function fetchWindData({ startDate, endDate, horizon }) {
  const response = await axios.get(`${API_URL}/api/wind-data`, {
    params: {
      startDate,
      endDate,
      horizon,
    },
  });

  return response.data;
}