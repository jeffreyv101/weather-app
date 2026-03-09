import { readFileSync } from 'fs';
import { join } from 'path';
import WeatherClient from './weatherClient'; // Ensure this path is correct

// Helper functions for data remain on the server
function getWeatherVideo(condition: string, partOfDay: string) {
    const isNight = partOfDay === 'night';
    const cond = condition.toLowerCase();
    let prefix = 'sunny';
    let maxVideos = 3;

    if (isNight) {
        switch (cond) {
            case 'clouds': prefix = 'night-cloudy'; maxVideos = 2; break;
            case 'clear': prefix = 'night'; break;
            default: prefix = 'night';
        }
    } else {
        switch (cond) {
            case 'clear': prefix = 'sunny'; break;
            case 'clouds': prefix = 'cloudy'; break;
            case 'mist': case 'smoke': case 'haze': case 'fog': prefix = 'foggy'; break;
            case 'rain': prefix = 'rainy'; break;
            case 'thunderstorm': prefix = 'thunder'; break;
            case 'snow': prefix = 'snow'; break;
            default: prefix = 'sunny';
        }
    }

    const randomNum = Math.floor(Math.random() * maxVideos) + 1;
    const paddedNum = randomNum.toString().padStart(2, '0');
    return `/vid/${prefix}-${paddedNum}.mp4`;
}

export default async function Home() {
    // 1. API Config
    const forecastUrl = 'https://weather-api167.p.rapidapi.com/api/weather/forecast?place=Lynchburg,VA,US&units=imperial';
    const aqiUrl = 'https://weather-api167.p.rapidapi.com/api/weather/current?place=Lynchburg,VA,US&units=imperial';
    const alertUrl = "https://api.weather.gov/alerts/active?point=37.4138,-79.1422";
    
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY as string, 
            'x-rapidapi-host': 'weather-api167.p.rapidapi.com'
        },
        next: { revalidate: 600 } 
    };

    let forecastData;
    let aqiData = null;
    let alertData = null;

    // 2. Data Fetching (Server-Side)
    try {
        const [forecastRes, aqiRes, alertRes] = await Promise.all([
            fetch(forecastUrl, options),
            fetch(aqiUrl, options),
            fetch(alertUrl, {
                headers: { "User-Agent": "weather-app", "Accept": "application/geo+json" },
                next: { revalidate: 600 }
            })
        ]);

        // Handle Forecast Fallback
        if (!forecastRes.ok) {
            const fallback = readFileSync(join(process.cwd(), 'public', 'forecast-example.json'), 'utf-8');
            forecastData = JSON.parse(fallback);
        } else {
            forecastData = await forecastRes.json();
        }
        
        // Handle AQI Fallback
        if (aqiRes.ok) {
            aqiData = await aqiRes.json();
        } else {
            const fallback = readFileSync(join(process.cwd(), 'public', 'current-example.json'), 'utf-8');
            aqiData = JSON.parse(fallback);
        }

        if (alertRes.ok) alertData = await alertRes.json();

    } catch (error) {
        console.error("Fetch failed, using fallbacks", error);
        forecastData = JSON.parse(readFileSync(join(process.cwd(), 'public', 'forecast-example.json'), 'utf-8'));
        aqiData = JSON.parse(readFileSync(join(process.cwd(), 'public', 'current-example.json'), 'utf-8'));
    }

    // 3. Prepare data for the Client
    const currentData = aqiData?.main ? aqiData : forecastData.list[0];
    const mainCondition = currentData.weather[0].main;
    const partOfDay = currentData.sys.part_of_day;
    const videoSrc = getWeatherVideo(mainCondition, partOfDay);

    const weatherData = {
        forecastData,
        aqiData,
        alertData,
        videoSrc,
        currentData
    };

    // 4. Pass everything to the Client Component
    return <WeatherClient weatherData={weatherData} />;
}