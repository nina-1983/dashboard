// Open-Meteo — free, no API key required.
const DEFAULT_LAT = '52.87'; // Oswestry / Gobowen area
const DEFAULT_LON = '-3.05';

const WEATHER_CODES = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Violent showers',
  95: 'Thunderstorm',
};

export async function getWeather() {
  const lat = process.env.WEATHER_LAT || DEFAULT_LAT;
  const lon = process.env.WEATHER_LON || DEFAULT_LON;

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=Europe%2FLondon`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) throw new Error(`Open-Meteo returned ${res.status}`);
    const data = await res.json();

    return {
      tempC: Math.round(data.current.temperature_2m),
      summary: WEATHER_CODES[data.current.weather_code] || 'Mixed conditions',
      error: null,
    };
  } catch (err) {
    return { tempC: null, summary: null, error: err.message };
  }
}
