import React, { useState, useEffect } from 'react';
import { Sun, CloudRain, Snowflake, Cloud, MapPin, Loader2, Thermometer, Umbrella, AlertCircle, RefreshCw } from 'lucide-react';

interface WeatherData {
  current: {
    temp: number;
    code: number;
    isRaining: boolean;
  };
  tomorrow: {
    min: number;
    max: number;
    code: number;
  };
}

// Interprétation des codes WMO Open-Meteo
const getWeatherDetails = (code: number) => {
  if (code === 0 || code === 1) return { label: 'Ensoleillé', icon: Sun, color: 'text-[#FFB020]', bg: 'bg-[#FFB020]/10' };
  if (code === 2 || code === 3) return { label: 'Nuageux', icon: Cloud, color: 'text-white/60', bg: 'bg-white/5' };
  if (code >= 51 && code <= 67) return { label: 'Pluie légère', icon: CloudRain, color: 'text-[#4F8CFF]', bg: 'bg-[#4F8CFF]/10' };
  if (code >= 80 && code <= 82) return { label: 'Averses', icon: CloudRain, color: 'text-[#4F8CFF]', bg: 'bg-[#4F8CFF]/10' };
  if (code >= 71 && code <= 86) return { label: 'Neige', icon: Snowflake, color: 'text-white', bg: 'bg-white/10' };
  if (code >= 95) return { label: 'Orage', icon: AlertCircle, color: 'text-[#FF4D6D]', bg: 'bg-[#FF4D6D]/10' };
  return { label: 'Variable', icon: Cloud, color: 'text-white/50', bg: 'bg-white/5' };
};

const getClothingAdvice = (temp: number, isRaining: boolean) => {
  if (temp < 10) {
    return "🥶 Froid polaire. Préparez le gros manteau, le bonnet et l'écharpe pour Amadou et Awa !";
  } else if (temp < 18) {
    if (isRaining) return "🌧️ Frais et humide. Un bon coupe-vent imperméable et des bottines sont conseillés.";
    return "🌤️ Temps frais. Une veste mi-saison et un pull feront l'affaire aujourd'hui.";
  } else if (temp < 25) {
    if (isRaining) return "🌧️ Pluie douce. Sortez les K-ways légers et parapluies.";
    return "👕 Température idéale. Un t-shirt et un gilet léger suffiront pour l'école.";
  } else {
    return "☀️ Fortes chaleurs prévues ! Casquette obligatoire, t-shirt léger et n'oubliez pas la gourde d'eau !";
  }
};

export const WidgetMeteo: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [locationName, setLocationName] = useState<string>('Localisation...');
  const [view, setView] = useState<'today' | 'tomorrow'>('today');

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Géolocalisation non supportée par votre navigateur.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Simulation d'un géocodage inversé très basique ou appel API (ici on garde générique)
          setLocationName("Votre position");

          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,rain,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
          );

          if (!response.ok) throw new Error("Erreur réseau API");
          
          const data = await response.json();
          
          setWeather({
            current: {
              temp: Math.round(data.current.temperature_2m),
              code: data.current.weather_code,
              isRaining: data.current.rain > 0 || [51,53,55,61,63,65,80,81,82,95].includes(data.current.weather_code)
            },
            tomorrow: {
              min: Math.round(data.daily.temperature_2m_min[1]),
              max: Math.round(data.daily.temperature_2m_max[1]),
              code: data.daily.weather_code[1]
            }
          });
        } catch (err) {
          setError("Impossible de récupérer la météo.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Accès à la position refusé. Veuillez l'autoriser.");
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  if (loading) {
    return (
      <div className="glass-panel rounded-[28px] p-6 border border-white/6 flex items-center justify-center space-x-3 mb-6 bg-gradient-to-r from-[#0A0D18] to-[#121829]">
        <Loader2 className="w-5 h-5 text-[#6C5CFF] animate-spin" />
        <span className="text-xs text-white/50 font-bold tracking-wider uppercase">Recherche satellite en cours...</span>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="glass-panel rounded-[28px] p-5 border border-[#FF4D6D]/30 flex items-center justify-between mb-6 bg-[#FF4D6D]/5">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-[#FF4D6D]" />
          <div>
            <h4 className="text-xs font-bold text-white">Météo indisponible</h4>
            <p className="text-[10px] text-white/50">{error}</p>
          </div>
        </div>
        <button onClick={fetchWeather} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
          <RefreshCw className="w-4 h-4 text-white/70" />
        </button>
      </div>
    );
  }

  const currentDetails = getWeatherDetails(weather.current.code);
  const tomorrowDetails = getWeatherDetails(weather.tomorrow.code);
  const advice = getClothingAdvice(weather.current.temp, weather.current.isRaining);

  return (
    <div className="glass-panel rounded-[28px] border border-white/10 mb-6 overflow-hidden relative shadow-2xl">
      {/* Background ambient glow based on weather */}
      <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none ${
        weather.current.temp > 22 ? 'bg-[#FFB020]' : weather.current.isRaining ? 'bg-[#4F8CFF]' : 'bg-[#6C5CFF]'
      }`}></div>

      <div className="p-5 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
            <MapPin className="w-3 h-3 text-[#4F8CFF]" />
            <span className="text-[10px] font-bold text-white/70 tracking-wider uppercase">{locationName}</span>
          </div>
          <div className="flex bg-[#112240] p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => setView('today')} 
              className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${view === 'today' ? 'bg-white/10 text-white shadow-md' : 'text-white/40 hover:text-white'}`}
            >
              Aujourd'hui
            </button>
            <button 
              onClick={() => setView('tomorrow')} 
              className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${view === 'tomorrow' ? 'bg-white/10 text-white shadow-md' : 'text-white/40 hover:text-white'}`}
            >
              Demain
            </button>
          </div>
        </div>

        {view === 'today' ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 rounded-[20px] ${currentDetails.bg} border border-white/10 flex items-center justify-center shadow-inner`}>
                <currentDetails.icon className={`w-8 h-8 ${currentDetails.color}`} />
              </div>
              <div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl font-black text-white tracking-tighter">{weather.current.temp}°</span>
                </div>
                <p className={`text-xs font-bold uppercase tracking-wider ${currentDetails.color}`}>
                  {currentDetails.label}
                </p>
              </div>
            </div>

            <div className="flex-1 sm:ml-8 p-3 rounded-2xl bg-white/5 border border-white/5 border-l-4 border-l-[#00D26A] flex items-start space-x-3">
              <div className="p-1.5 bg-[#00D26A]/20 rounded-full shrink-0">
                <Umbrella className="w-4 h-4 text-[#00D26A]" />
              </div>
              <div>
                <h4 className="text-[10px] font-extrabold text-[#00D26A] uppercase tracking-wider mb-0.5">Conseil Vestimentaire</h4>
                <p className="text-[11px] text-white/80 leading-relaxed font-medium">{advice}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
             <div className="flex items-center space-x-4">
              <div className={`w-14 h-14 rounded-[18px] ${tomorrowDetails.bg} border border-white/10 flex items-center justify-center`}>
                <tomorrowDetails.icon className={`w-7 h-7 ${tomorrowDetails.color}`} />
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider ${tomorrowDetails.color} mb-1`}>
                  {tomorrowDetails.label}
                </p>
                <div className="flex items-center space-x-3 text-sm font-bold">
                  <div className="flex items-center text-white/50"><Thermometer className="w-3 h-3 mr-1"/> {weather.tomorrow.min}°</div>
                  <div className="flex items-center text-white"><Thermometer className="w-3 h-3 mr-1 text-[#FF4D6D]"/> {weather.tomorrow.max}°</div>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-white/50 italic text-right max-w-[150px]">
              Préparez les affaires des enfants dès ce soir !
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
