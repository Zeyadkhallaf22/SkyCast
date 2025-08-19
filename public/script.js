// DOM Elements
const dashboard = document.getElementById('dashboard');
const searchInput = document.getElementById('searchInput');
const loadingElement = document.getElementById('loading');

// Default cities
const defaultCities = ['London', 'New York', 'Tokyo', 'Paris', 'Cairo'];
let userLocation = null;

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
  // First try to get user's location
  getUserLocation()
    .then((location) => {
      userLocation = location;
      return fetchWeatherData(location.latitude, location.longitude, true);
    })
    .catch((error) => {
      console.error('Error getting user location:', error);
      // If location fails, just load default cities
      loadDefaultCities();
    });

  // Set up search functionality
  setupSearch();
});

// Get user's current location
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        }
      );
    } else {
      reject(new Error('Geolocation is not supported by this browser.'));
    }
  });
}

// Load default cities if location access is denied
function loadDefaultCities() {
  loadingElement.style.display = 'flex';
  dashboard.innerHTML = '';
  dashboard.appendChild(loadingElement);

  const promises = defaultCities.map((city) => fetchWeatherByCity(city));

  Promise.all(promises)
    .then(() => {
      loadingElement.style.display = 'none';
    })
    .catch((error) => {
      showError('Failed to load weather data. Please try again later.');
      console.error(error);
    });
}

// Set up search functionality
function setupSearch() {
  let timeoutId;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(timeoutId);
    const query = e.target.value.trim();

    if (query.length > 2) {
      timeoutId = setTimeout(() => {
        searchCity(query);
      }, 500);
    }
  });
}

// Search for a city
function searchCity(query) {
  loadingElement.style.display = 'flex';
  dashboard.innerHTML = '';
  dashboard.appendChild(loadingElement);

  fetchWeatherByCity(query)
    .then(() => {
      loadingElement.style.display = 'none';
    })
    .catch((error) => {
      showError('City not found. Please try another location.');
      console.error(error);
    });
}

// Fetch weather data by city name - UPDATED to use your server
function fetchWeatherByCity(city) {
  return fetch(`/weather?city=${encodeURIComponent(city)}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error('City not found');
      }
      return response.json();
    })
    .then((data) => {
      if (data.cod !== 200) {
        throw new Error(data.message || 'City not found');
      }
      return fetchForecast(data.coord.lat, data.coord.lon).then(
        (forecastData) => {
          createWeatherCard(data, forecastData);
          return data;
        }
      );
    });
}

// Fetch weather data by coordinates - UPDATED to use your server
function fetchWeatherData(lat, lon, isUserLocation = false) {
  return fetch(`/weather?lat=${lat}&lon=${lon}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.cod !== 200) {
        throw new Error(data.message || 'Failed to fetch weather data');
      }
      return fetchForecast(lat, lon).then((forecastData) => {
        createWeatherCard(data, forecastData, isUserLocation);
        return data;
      });
    })
    .then(() => {
      // After loading user location, load default cities
      if (isUserLocation) {
        loadDefaultCities();
      }
    });
}

// Fetch forecast data - UPDATED to use your server
function fetchForecast(lat, lon) {
  return fetch(`/forecast?lat=${lat}&lon=${lon}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.cod && data.cod !== '200') {
        throw new Error(data.message || 'Failed to fetch forecast data');
      }
      return data;
    });
}

// Create weather card
function createWeatherCard(weatherData, forecastData, isUserLocation = false) {
  loadingElement.style.display = 'none';

  const cityName = weatherData.name;
  const country = weatherData.sys.country;
  const temp = Math.round(weatherData.main.temp);
  const weather = weatherData.weather[0];
  const humidity = weatherData.main.humidity;
  const windSpeed = weatherData.wind.speed;
  const pressure = weatherData.main.pressure;

  // Get forecast for next 3 days
  const forecastDays = getThreeDayForecast(forecastData);

  const card = document.createElement('div');
  card.className = `weather-card ${isUserLocation ? 'current-location' : ''}`;

  card.innerHTML = `
                <div class="city-name">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${cityName}, ${country}</span>
                </div>
                
                <div class="current-weather">
                    <div class="temperature">${temp}</div>
                    <img src="https://openweathermap.org/img/wn/${
                      weather.icon
                    }@2x.png" alt="${weather.description}" class="weather-icon">
                </div>
                
                <div class="weather-description">${capitalizeFirstLetter(
                  weather.description
                )}</div>
                
                <div class="weather-details">
                    <div class="detail">
                        <i class="fas fa-tint"></i>
                        <div class="detail-value">${humidity}%</div>
                        <div class="detail-label">Humidity</div>
                    </div>
                    <div class="detail">
                        <i class="fas fa-wind"></i>
                        <div class="detail-value">${windSpeed} m/s</div>
                        <div class="detail-label">Wind</div>
                    </div>
                    <div class="detail">
                        <i class="fas fa-tachometer-alt"></i>
                        <div class="detail-value">${pressure} hPa</div>
                        <div class="detail-label">Pressure</div>
                    </div>
                </div>
                
                <div class="forecast">
                    <div class="forecast-title">3-Day Forecast</div>
                    <div class="forecast-days">
                        ${forecastDays
                          .map(
                            (day) => `
                            <div class="forecast-day">
                                <div class="forecast-day-name">${day.day}</div>
                                <img src="https://openweathermap.org/img/wn/${day.icon}@2x.png" alt="${day.weather}" class="forecast-day-icon">
                                <div class="forecast-day-temp">${day.temp}°C</div>
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                </div>
            `;

  // Add animation delay based on position
  const cards = document.querySelectorAll('.weather-card');
  card.style.animationDelay = `${cards.length * 0.1}s`;

  dashboard.appendChild(card);
}

// Get 3-day forecast data
function getThreeDayForecast(forecastData) {
  const forecastDays = [];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Group by day
  const dailyForecasts = {};
  forecastData.list.forEach((item) => {
    const date = new Date(item.dt * 1000);
    const day = date.getDate();

    if (!dailyForecasts[day]) {
      dailyForecasts[day] = {
        temps: [],
        icons: [],
        weathers: [],
      };
    }

    dailyForecasts[day].temps.push(item.main.temp);
    dailyForecasts[day].icons.push(item.weather[0].icon);
    dailyForecasts[day].weathers.push(item.weather[0].main);
  });

  // Get today's date
  const today = new Date().getDate();

  // Process next 3 days
  let daysProcessed = 0;
  for (const day in dailyForecasts) {
    if (parseInt(day) !== today && daysProcessed < 3) {
      const date = new Date();
      date.setDate(parseInt(day));
      const dayName = days[date.getDay()];

      // Get average temp and most common icon/weather
      const avgTemp = Math.round(
        dailyForecasts[day].temps.reduce((a, b) => a + b, 0) /
          dailyForecasts[day].temps.length
      );
      const mostCommonIcon = mode(dailyForecasts[day].icons);
      const mostCommonWeather = mode(dailyForecasts[day].weathers);

      forecastDays.push({
        day: dayName,
        temp: avgTemp,
        icon: mostCommonIcon,
        weather: mostCommonWeather,
      });

      daysProcessed++;
    }
  }

  return forecastDays;
}

// Helper function to find mode (most frequent value) in array
function mode(array) {
  const count = {};
  let maxCount = 0;
  let modeValue;

  array.forEach((value) => {
    count[value] = (count[value] || 0) + 1;
    if (count[value] > maxCount) {
      maxCount = count[value];
      modeValue = value;
    }
  });

  return modeValue;
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Show error message
function showError(message) {
  loadingElement.style.display = 'none';

  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;

  dashboard.innerHTML = '';
  dashboard.appendChild(errorElement);
}
