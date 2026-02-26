import { Sun, Moon, Cloud, CloudRain, CloudLightning, Snowflake, CloudFog, Navigation, Wind, Gauge, Droplets, Activity, Radar } from 'lucide-react';
import { readFileSync } from 'fs';
import { join } from 'path';

function getHourlyIcon(condition: string, partOfDay: string) {
  const isNight = partOfDay === 'night';
  const cond = condition.toLowerCase();

  switch (cond) {
    case 'clear':
      return isNight ? <Moon size={28} color="white" /> : <Sun size={28} color="white" />;
    case 'clouds':
      return <Cloud size={28} color="white" />;
    case 'rain':
    case 'drizzle':
      return <CloudRain size={28} color="white" />;
    case 'thunderstorm':
    case 'squall':
    case 'tornado':
      return <CloudLightning size={28} color="white" />;
    case 'snow':
      return <Snowflake size={28} color="white" />;
    case 'mist':
    case 'smoke':
    case 'haze':
    case 'dust':
    case 'fog':
    case 'ash':
    case 'sand':
      return <CloudFog size={28} color="white" />;
    default:
      return isNight ? <Moon size={28} color="white" /> : <Sun size={28} color="white" />;
  }
}

function getSvgFilename(condition: string, partOfDay: string) {
  const isNight = partOfDay === 'night';
  const cond = condition.toLowerCase();

  switch (cond) {
    case 'clear':
      return isNight ? 'night.svg' : 'day.svg';
    case 'clouds':
      // Using the cloudy night SVG from your screenshot!
      return isNight ? 'cloudy-night-1.svg' : 'cloudy.svg'; 
    case 'rain':
    case 'drizzle':
      return 'rainy-1.svg';
    case 'thunderstorm':
    case 'squall':
    case 'tornado':
      return 'rainy-6.svg';
    case 'snow':
      return 'snowy-1.svg';
    default:
      // Fallback
      return isNight ? 'night.svg' : 'day.svg'; 
  }
}

function getWeatherGradient(condition: string, partOfDay: string) {
  const isNight = partOfDay === 'night';
  const cond = condition.toLowerCase();

  if (isNight) {
    // Nighttime color palettes
    switch (cond) {
      case 'clear': 
        return 'from-indigo-950 via-purple-950 to-black'; // Deep starry night
      case 'clouds': 
      case 'mist':
      case 'fog':
        return 'from-gray-800 via-gray-900 to-black'; // Dark, overcast night
      default: 
        // Storms/Rain at night are just very dark
        return 'from-zinc-900 to-black'; 
    }
  } else {
    // Daytime color palettes (your original ones)
    switch (cond) {
      case 'clear': return 'from-sky-300 via-blue-400 to-blue-600';
      case 'clouds': return 'from-slate-400 via-slate-500 to-slate-600';
      case 'rain': return 'from-slate-700 via-slate-800 to-gray-900';
      case 'snow': return 'from-blue-200 via-blue-300 to-blue-400 text-zinc-900';
      default: return 'from-blue-400 to-blue-600';
    }
  }
}

export default async function Home() {
    // 1. Define both endpoints
    const forecastUrl = 'https://weather-api167.p.rapidapi.com/api/weather/forecast?place=Lynchburg,VA,US&units=imperial';
    // Using the current weather endpoint you provided for AQI
    const aqiUrl = 'https://weather-api167.p.rapidapi.com/api/weather/current?place=Lynchburg,VA,US&units=imperial'; 
    
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

    try {
        // 2. Fetch BOTH APIs simultaneously for maximum speed
        try {
            const [forecastRes, aqiRes] = await Promise.all([
                fetch(forecastUrl, options),
                fetch(aqiUrl, options)
            ]);

            if (!forecastRes.ok) {
                // Use local fallback for forecast
                console.warn('Forecast API failed, using local fallback');
                const fallbackData = readFileSync(join(process.cwd(), 'public', 'forecast-example.json'), 'utf-8');
                forecastData = JSON.parse(fallbackData);
            } else {
                forecastData = await forecastRes.json();
            }
            
            // Fallback to null if AQI fails, so it doesn't break the whole app
            if (aqiRes.ok) {
                aqiData = await aqiRes.json();
            } else {
                console.warn('AQI API failed, using local fallback');
                const fallbackData = readFileSync(join(process.cwd(), 'public', 'current-example.json'), 'utf-8');
                aqiData = JSON.parse(fallbackData);
            }
        } catch (apiError) {
            // If API fetch fails completely (network error, etc.), use local fallbacks
            console.warn('API fetch failed completely, using local fallbacks', apiError);
            const forecastFallbackData = readFileSync(join(process.cwd(), 'public', 'forecast-example.json'), 'utf-8');
            const aqiFallbackData = readFileSync(join(process.cwd(), 'public', 'current-example.json'), 'utf-8');
            forecastData = JSON.parse(forecastFallbackData);
            aqiData = JSON.parse(aqiFallbackData);
        }
        
        // --- DATA EXTRACTION ---
        const currentData = forecastData.list[0];
        const currentTemp = currentData.main.temprature;
        const feelsLike = currentData.main.temprature_feels_like;
        const currentTempMin = currentData.main.temprature_min;
        const currentTempMax = currentData.main.temprature_max;
        const humidity = currentData.main.humidity;
        const mainCondition = currentData.weather[0].main;
        const cityName = forecastData.city.name;
        const partOfDay = currentData.sys.part_of_day;
        
        // New Data for your requested widgets:
        const pressure = currentData.main.pressure;
        const windSpeed = currentData.wind.speed;
        const windDegrees = currentData.wind.degrees;
        
        // Safely check for rain/snow using optional chaining
        const rainAmount = currentData.rain?.amount || 0;
        const snowAmount = currentData.snow?.amount || 0;

        // Safely extract Air Quality (matching your JSON example)
        const aqiIndex = aqiData?.list?.[0]?.main?.air_quality_index || "--";
        const aqiStatus = aqiData?.list?.[0]?.main?.air_quality || "Unknown";

        const hourlyForecast = forecastData.list.slice(0, 8);
        const gradientClasses = getWeatherGradient(mainCondition, partOfDay);
        const svgFile = getSvgFilename(mainCondition, partOfDay);

        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
                <main className={`relative flex h-[852px] w-[393px] flex-col items-center overflow-y-auto overflow-x-hidden rounded-[3rem] border-[8px] border-zinc-300 shadow-2xl bg-gradient-to-br bg-[size:200%_200%] animate-pan-bg ${gradientClasses} scrollbar-hide`}>
                    
                    {/* Fake Dynamic Island - Added mx-auto to ensure it stays centered */}
                    <div className="sticky top-4 h-7 w-32 rounded-full bg-black z-50 shrink-0 mx-auto"></div>

                    {/* --- MAIN HEADER --- 
                        Changed mt-12 to mt-20 to add more space above the city name.
                    */}
                    <div className="relative z-10 flex w-full flex-col items-center text-center mt-20 text-white drop-shadow-md shrink-0">
                        <h1 className="text-3xl font-semibold tracking-tight">
                            {cityName}
                        </h1>

                        {/* SVG Container: 
                            Removed 'scale', set absolute sizes (h-56 w-56), and added mx-auto to guarantee perfect centering. 
                        */}
                        <div className="my-4 h-56 w-56 mx-auto flex justify-center items-center drop-shadow-2xl scale-150 mr-50 ml-50">
                            <img 
                                src={`/${svgFile}`} 
                                alt={`${mainCondition}`} 
                                className="h-full w-full object-contain" 
                            />
                        </div>

                        <div className="text-[5.5rem] leading-none font-bold drop-shadow-lg tracking-tight">
                            {Math.round(currentTemp)}°
                        </div>
                        
                        {/* Reordered to match your screenshot perfectly */}
                        <p className="text-lg mt-3 font-medium opacity-80">
                            Feels like {Math.round(feelsLike)}°
                        </p>
                        <p className="text-lg mt-1 font-medium opacity-80">
                            H:{Math.round(currentTempMax)}° | L:{Math.round(currentTempMin)}°
                        </p>
                    </div>

                    {/* --- THE MAGIC SPACER --- 
                        This invisible block grows to fill empty space, pushing everything below it to the bottom!
                    */}
                    <div className="flex-grow min-h-[60px]"></div>

                    {/* --- HOURLY FORECAST --- */}
                    <div className="relative z-10 w-[90%] rounded-2xl bg-black/20 backdrop-blur-md p-4 text-white mb-4 shrink-0 border border-white/10 shadow-lg">
                        <div className="flex w-full space-x-6 overflow-x-auto scrollbar-hide pb-2">
                            {hourlyForecast.map((hour: any, index: number) => {
                                // Get the time format (e.g., "3 PM")
                                const time = new Date(hour.dt * 1000).toLocaleTimeString([], { hour: 'numeric' });
                                
                                // Call our new Lucide icon function!
                                const hourlyCondition = hour.weather[0].main;
                                const hourlyPartOfDay = hour.sys.part_of_day;
                                const IconComponent = getHourlyIcon(hourlyCondition, hourlyPartOfDay);

                                return (
                                    <div key={index} className="flex flex-col items-center flex-shrink-0">
                                        <p className="text-sm font-medium mb-3">{index === 0 ? 'Now' : time}</p>
                                        
                                        {/* Render the Lucide Icon here */}
                                        <div className="mb-3">
                                            {IconComponent}
                                        </div>
                                        
                                        <p className="text-lg font-bold">{Math.round(hour.main.temprature)}°</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* --- THE NEW WIDGET GRID --- */}
                    <div className="relative z-10 w-[90%] grid grid-cols-2 gap-4 mb-5 shrink-0 text-white">
                        
                        {/* 1. AIR QUALITY */}
                        <div className="flex flex-col justify-between rounded-3xl bg-black/20 backdrop-blur-md p-4 border border-white/10 shadow-lg h-36">
                            <div className="flex items-center space-x-2 opacity-70">
                                <Activity size={14} />
                                <p className="text-xs font-semibold uppercase">Air Quality</p>
                            </div>
                            <div>
                                <p className="text-4xl font-bold">{aqiIndex}</p>
                                <p className="text-md font-medium mt-1">{aqiStatus}</p>
                            </div>
                        </div>

                        {/* 2. WIND & DIRECTION ARROW */}
                        <div className="flex flex-col justify-between rounded-3xl bg-black/20 backdrop-blur-md p-4 border border-white/10 shadow-lg h-36">
                            <div className="flex items-center space-x-2 opacity-70">
                                <Wind size={14} />
                                <p className="text-xs font-semibold uppercase">Wind</p>
                            </div>
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-4xl font-bold">{Math.round(windSpeed)}</p>
                                    <p className="text-sm font-medium opacity-80">mph</p>
                                </div>
                                {/* The Compass Arrow: Rotates dynamically based on API degrees! */}
                                <div 
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 border border-white/10 shadow-inner"
                                    style={{ transform: `rotate(${windDegrees}deg)` }}
                                >
                                    <Navigation size={18} fill="white" />
                                </div>
                            </div>
                        </div>

                        {/* 3. PRECIPITATION (Rain or Snow) */}
                        <div className="flex flex-col justify-between rounded-3xl bg-black/20 backdrop-blur-md p-4 border border-white/10 shadow-lg h-36">
                            <div className="flex items-center space-x-2 opacity-70">
                                {/* Swap icon based on if it's snowing, otherwise default to the raindrop */}
                                {snowAmount > 0 ? <Snowflake size={14} /> : <Droplets size={14} />}
                                
                                {/* Change the title based on what is falling (or if nothing is falling) */}
                                <p className="text-xs font-semibold uppercase">
                                    {snowAmount > 0 ? 'Snow' : rainAmount > 0 ? 'Rainfall' : 'Precipitation'}
                                </p>
                            </div>
                            
                            <div>
                                {/* Display the amount, or a '0' if it's dry */}
                                <p className="text-4xl font-bold">
                                    {snowAmount > 0 ? snowAmount : rainAmount > 0 ? rainAmount : "0"}
                                    
                                    {/* Only show the 'mm' unit if there is actually precipitation */}
                                    {(snowAmount > 0 || rainAmount > 0) && (
                                        <span className="text-lg font-normal opacity-80 ml-1">mm</span>
                                    )}
                                </p>
                                
                                {/* The magic text swap happens right here! */}
                                <p className="text-sm font-medium opacity-80 mt-1">
                                    {snowAmount === 0 && rainAmount === 0 
                                        ? 'No rain or snow.' 
                                        : 'in the last hour'
                                    }
                                </p>
                            </div>
                        </div>

                        {/* 4. PRESSURE */}
                        <div className="flex flex-col justify-between rounded-3xl bg-black/20 backdrop-blur-md p-4 border border-white/10 shadow-lg h-36">
                            <div className="flex items-center space-x-2 opacity-70">
                                <Gauge size={14} />
                                <p className="text-xs font-semibold uppercase">Pressure</p>
                            </div>
                            <div>
                                <p className="text-4xl font-bold">{pressure}</p>
                                <p className="text-sm font-medium opacity-80 mt-1">hPa</p>
                            </div>
                        </div>
                    </div>
                    <div className="relative z-10 w-[90%] rounded-2xl bg-black/20 backdrop-blur-md p-4 text-white mb-10 shrink-0 border border-white/10 shadow-lg">
                        <div className="flex items-center space-x-2 opacity-70 mb-4">
                            <Radar size={14} />
                            <p className="text-xs font-semibold uppercase">Radar</p>
                        </div>

                        <iframe className="mb-2 rounded-2xl" width="305" height="450" src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=5&overlay=wind&product=ecmwf&level=surface&lat=37.383&lon=-79.218"></iframe>
                        
                    </div>
                </main>
            </div>
        );

    } catch (error) {
        console.error("Failed to fetch weather:", error);
        return <div>Could not load weather data.</div>;
    }
}