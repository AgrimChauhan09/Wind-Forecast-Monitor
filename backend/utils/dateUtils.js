function parseIsoDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

function isWithinRange(date, start, end) {
  if (!date || !start || !end) return false;
  return date >= start && date < end;
}

function toUtcISOString(value) {
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString();
}

module.exports = {
  parseIsoDate,
  isWithinRange,
  toUtcISOString,
};

