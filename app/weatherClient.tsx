"use client";
import { useState, useRef } from 'react';
import { Sun, Moon, Cloud, CloudRain, CloudLightning, Snowflake, CloudFog, Navigation, Wind, Gauge, Droplets, Activity, Radar } from 'lucide-react';
import SeamlessVideo from './seamlessVid';

function getHourlyIcon(condition: string, partOfDay: string) {
  const isNight = partOfDay === 'night';
  const cond = condition.toLowerCase();
  const iconProps = { size: 28, color: "white", strokeWidth: 1.5 };

  switch (cond) {
    case 'clear': return isNight ? <Moon {...iconProps} /> : <Sun {...iconProps} />;
    case 'clouds': return <Cloud {...iconProps} />;
    case 'rain':
    case 'drizzle': return <CloudRain {...iconProps} />;
    case 'thunderstorm':
    case 'squall':
    case 'tornado': return <CloudLightning {...iconProps} />;
    case 'snow': return <Snowflake {...iconProps} />;
    case 'mist':
    case 'smoke':
    case 'haze':
    case 'dust':
    case 'fog':
    case 'ash':
    case 'sand': return <CloudFog {...iconProps} />;
    default: return isNight ? <Moon {...iconProps} /> : <Sun {...iconProps} />;
  }
}

export default function WeatherClient({ weatherData }: { weatherData: any }) {
    const [scrollAmount, setScrollAmount] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // --- 1. DATA EXTRACTION ---
    const { forecastData, aqiData, alertData, videoSrc, currentData } = weatherData;

    // Header & Main Info
    const currentTemp = currentData.main.temprature;
    const currentTempMin = currentData.main.temprature_min;
    const currentTempMax = currentData.main.temprature_max;
    const feelsLike = currentData.main.temprature_feels_like;
    const cityName = forecastData.city.name;
    const describeWeather = currentData.weather[0].description;

    // Grid Widget Data
    const windSpeed = currentData.wind.speed;
    const windDegrees = currentData.wind.degrees;
    const pressure = currentData.main.pressure;
    const rainAmount = currentData.rain?.amount || 0;
    const snowAmount = currentData.snow?.amount || 0;

    // Air Quality Data (Matching your previous API structure)
    const aqiIndex = aqiData?.list?.[0]?.main?.air_quality_index || "--";
    const aqiStatus = aqiData?.list?.[0]?.main?.air_quality || "Unknown";

    // --- 2. HOURLY FORECAST PROCESSING ---
    const hourlyForecast = [];
    const forecastList = forecastData.list;
    for (let i = 0; i < forecastList.length - 1; i++) {
        const current = forecastList[i];
        const next = forecastList[i + 1];
        hourlyForecast.push(current);
        
        const tempDiff = (next.main.temprature - current.main.temprature) / 3;
        for (let hour = 1; hour <= 2; hour++) {
            hourlyForecast.push({
                ...current,
                dt: current.dt + (hour * 3600),
                main: { 
                    ...current.main, 
                    temprature: current.main.temprature + (tempDiff * hour) 
                }
            });
        }
    }
    const hourlyForecastDisplay = hourlyForecast.slice(0, 24);

    // --- 3. DAILY FORECAST PROCESSING ---
    const dailyForecastMap = new Map();
    const dailyTemps = new Map();
    const dailyConditions = new Map();

    forecastData.list.forEach((item: any) => {
        const dayKey = new Date(item.dt * 1000).toDateString();
        if (!dailyTemps.has(dayKey)) dailyTemps.set(dayKey, []);
        dailyTemps.get(dayKey).push(item.main.temprature);
        
        if (!dailyConditions.has(dayKey)) dailyConditions.set(dayKey, {});
        const cond = item.weather[0].main;
        dailyConditions.get(dayKey)[cond] = (dailyConditions.get(dayKey)[cond] || 0) + 1;

        if (!dailyForecastMap.has(dayKey)) dailyForecastMap.set(dayKey, item);
    });

    const dailyForecast = Array.from(dailyForecastMap.entries()).slice(0, 5).map(([dayKey, forecast]) => {
        const temps = dailyTemps.get(dayKey);
        const conditions = dailyConditions.get(dayKey);
        const priorityOrder = ['Thunderstorm', 'Snow', 'Rain', 'Clouds', 'Clear'];
        let dailyCondition = 'Clear';
        for (const p of priorityOrder) { if (conditions[p]) { dailyCondition = p; break; } }
        
        return {
            ...forecast,
            dailyHigh: Math.max(...temps),
            dailyLow: Math.min(...temps),
            dailyCondition
        };
    });

    // --- 4. SCROLL LOGIC ---
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollAmount(e.currentTarget.scrollTop);
    };
    const headerOpacity = Math.max(0, 1 - scrollAmount / 200);
    const stickyOpacity = Math.min(1, Math.max(0, (scrollAmount - 600) / 100));

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
            <main className="relative flex h-[852px] w-[393px] flex-col items-center overflow-hidden rounded-[3rem] border-[8px] border-zinc-300 shadow-2xl">
                
                <SeamlessVideo src={videoSrc} />
                <div className="absolute inset-0 bg-black/45 z-0"></div>

                {/* --- STICKY MINI HEADER --- */}
                <div 
                    className="absolute top-16 left-0 right-0 z-50 flex items-center justify-center px-6 pointer-events-none transition-all duration-300"
                    style={{ opacity: stickyOpacity, transform: `translateY(${(1 - stickyOpacity) * -10}px)` }}
                >
                    <div className="glass-card flex items-center space-x-3 px-4 py-2 rounded-full shadow-lg border border-white/20">
                        <h2 className="font-fraunces text-sm font-medium lowercase">{cityName}</h2>
                        <div className="h-3 w-[1px] bg-white/30"></div>
                        <p className="font-fraunces text-sm font-bold">{Math.round(currentTemp)}°</p>
                        <div className="h-3 w-[1px] bg-white/30"></div>
                        <p className="font-fraunces text-xs italic opacity-80">{describeWeather}</p>
                    </div>
                </div>

                <div 
                    onScroll={handleScroll}
                    ref={scrollContainerRef}
                    className="relative z-10 flex h-full w-full flex-col items-center overflow-y-auto px-6 pb-10 scrollbar-hide"
                    style={{
                        // Webkit prefix is required for Safari/Brave support on macOS
                        WebkitMaskImage: `linear-gradient(to bottom, 
                            transparent 0px, 
                            transparent 200px, 
                            black 300px, 
                            black 1000px)`,
                        maskImage: `linear-gradient(to bottom, 
                            transparent 0px, 
                            transparent 100px, 
                            black 300px, 
                            black 1000px)`
                    }}
                >
                    <div className="sticky top-4 h-7 w-32 rounded-full bg-black z-50 shrink-0 mx-auto mb-4"></div>

                    {/* --- MAIN HEADER --- */}
                    <div 
                        className="relative z-10 flex w-full h-[calc(100vh-225px)] mt-10 mb-15 flex-col items-start justify-end text-white shrink-0"
                    >
                        <h1 className="font-fraunces font-soft-lg text-4xl italic font-extralight lowercase">{cityName}</h1>
                        <div className="font-fraunces text-[8rem] leading-none font-bold tracking-tight">
                            {Math.round(currentTemp)}°
                        </div>
                        <p className="font-fraunces text-[1.5rem] mt-1 opacity-50">
                            H:{Math.round(currentTempMax)}° | L:{Math.round(currentTempMin)}°
                        </p>
                        <p className="text-lg w-[90%] mt-3 font-medium opacity-80">
                            Feels like {Math.round(feelsLike)}° <span className="lowercase">and {describeWeather}</span>
                        </p>
                    </div>

                    {/* --- HOURLY FORECAST --- */}
                    <div className="glass-card relative z-10 w-[100%] rounded-2xl p-4 text-white mb-4 shrink-0 shadow-lg font-fraunces">
                        <div className="flex w-full space-x-6 overflow-x-auto scrollbar-hide pb-2">
                            {hourlyForecastDisplay.map((hour: any, index: number) => {
                                const time = new Date(hour.dt * 1000).toLocaleTimeString([], { hour: 'numeric' });
                                const IconComponent = getHourlyIcon(hour.weather[0].main, hour.sys.part_of_day);
                                return (
                                    <div key={index} className="flex flex-col items-center flex-shrink-0">
                                        <p className="text-xs font-medium mb-3 opacity-80">{index === 0 ? 'Now' : time}</p>
                                        <div className="mb-3 opacity-90">{IconComponent}</div>
                                        <p className="text-lg font-soft-md font-bold">{Math.round(hour.main.temprature)}°</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* --- DAILY FORECAST --- */}
                    <div className="glass-card relative z-10 w-[100%] rounded-2xl p-5 text-white mb-4 shrink-0 shadow-lg font-fraunces">
                        <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60 mb-4">5-Day Forecast</p>
                        <div className="flex flex-col space-y-4">
                            {dailyForecast.map((day: any, index: number) => {
                                let dayName = index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : new Date(day.dt * 1000).toLocaleDateString([], { weekday: 'short' });
                                return (
                                    <div key={index} className="flex items-center justify-between">
                                        <p className="text-sm font-medium italic w-16 opacity-90">{dayName}</p>
                                        <div className="flex-grow flex justify-center opacity-80">
                                            {getHourlyIcon(day.dailyCondition, 'day')}
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <p className="text-sm font-light opacity-50">{Math.round(day.dailyLow)}°</p>
                                            <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-white/40 rounded-full" style={{ width: '60%' }}></div>
                                            </div>
                                            <p className="text-sm font-bold">{Math.round(day.dailyHigh)}°</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* --- WIDGET GRID --- */}
                    <div className="relative z-10 w-[100%] grid grid-cols-2 gap-4 mb-5 shrink-0 text-white font-fraunces">
                        <div className="glass-card flex flex-col justify-between rounded-3xl p-5 shadow-lg h-40">
                            <div className="flex items-center space-x-2 opacity-70"><Activity size={14} strokeWidth={1.5} /><p className="text-[10px] font-semibold uppercase tracking-widest">Air Quality</p></div>
                            <div><p className="text-4xl font-soft-md font-bold">{aqiIndex}</p><p className="text-sm font-medium mt-1 opacity-80">{aqiStatus}</p></div>
                        </div>
                        <div className="glass-card flex flex-col justify-between rounded-3xl p-5 shadow-lg h-40">
                            <div className="flex items-center space-x-2 opacity-70"><Wind size={14} strokeWidth={1.5} /><p className="text-[10px] font-semibold uppercase tracking-widest">Wind</p></div>
                            <div className="flex items-end justify-between">
                                <div><p className="text-4xl font-soft-md font-bold">{Math.round(windSpeed)}</p><p className="text-[10px] font-medium opacity-60 uppercase tracking-tighter">mph</p></div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20" style={{ transform: `rotate(${windDegrees}deg)` }}><Navigation size={16} fill="white" strokeWidth={0} /></div>
                            </div>
                        </div>
                        <div className="glass-card flex flex-col justify-between rounded-3xl p-5 shadow-lg h-40">
                            <div className="flex items-center space-x-2 opacity-70">{snowAmount > 0 ? <Snowflake size={14} strokeWidth={1.5} /> : <Droplets size={14} strokeWidth={1.5} />}<p className="text-[10px] font-semibold uppercase tracking-widest">{snowAmount > 0 ? 'Snow' : rainAmount > 0 ? 'Rainfall' : 'Precipitation'}</p></div>
                            <div><p className="text-4xl font-soft-md font-bold">{snowAmount > 0 ? snowAmount : rainAmount > 0 ? rainAmount : "0"}{(snowAmount > 0 || rainAmount > 0) && <span className="text-lg font-light ml-1">mm</span>}</p><p className="text-[10px] font-medium opacity-60 mt-1 lowercase">{snowAmount === 0 && rainAmount === 0 ? 'clear skies' : 'in the last hour'}</p></div>
                        </div>
                        <div className="glass-card flex flex-col justify-between rounded-3xl p-5 shadow-lg h-40">
                            <div className="flex items-center space-x-2 opacity-70"><Gauge size={14} strokeWidth={1.5} /><p className="text-[10px] font-semibold uppercase tracking-widest">Pressure</p></div>
                            <div><p className="text-4xl font-soft-md font-bold">{pressure}</p><p className="text-[10px] font-medium opacity-60 mt-1 uppercase tracking-tighter">hPa</p></div>
                        </div>
                    </div>

                    {/* --- RADAR --- */}
                    <div className="glass-card relative z-10 w-[100%] rounded-2xl p-4 text-white mb-10 shrink-0 shadow-lg font-fraunces">
                        <div className="flex items-center space-x-2 opacity-70 mb-4"><Radar size={14} strokeWidth={1.5} /><p className="text-[10px] font-semibold uppercase tracking-widest">Radar</p></div>
                        <iframe className="rounded-xl opacity-90" width="100%" height="450" src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=5&overlay=wind&product=ecmwf&level=surface&lat=37.383&lon=-79.218"></iframe>
                    </div>
                </div>
            </main>
        </div>
    );
}