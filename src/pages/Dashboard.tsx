import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import {
  Droplets, MapPin, RefreshCw, AlertTriangle,
  Plus, Activity, Thermometer, CloudRain, Wind, Download, Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { simulateWaterParameters, predictDisease, generate7DayHistory, PredictionResult } from '@/lib/predictionEngine';
import { exportDashboardVisualPDF } from '@/lib/exportPdf';
import RiskGauge from '@/components/dashboard/RiskGauge';
import CityHeatmap from '@/components/dashboard/CityHeatmap';

const POPULAR_CITIES = ['Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Bangalore', 'Hyderabad', 'Pune', 'Jaipur'];

const RISK_COLORS = {
  Low: '#22c55e',
  Medium: '#f59e0b',
  High: '#ef4444',
  Critical: '#b91c1c',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedCity, setSelectedCity] = useState('Mumbai');
  const [cityInput, setCityInput] = useState('');
  const [savedCities, setSavedCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [history, setHistory] = useState<ReturnType<typeof generate7DayHistory>>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const dashboardRef = useRef<HTMLDivElement>(null);

  const runPrediction = (city: string) => {
    setLoading(true);
    setTimeout(() => {
      const params = simulateWaterParameters(city);
      const result = predictDisease(params);
      setPrediction(result);
      setHistory(generate7DayHistory(city));
      setLastUpdated(new Date());
      setLoading(false);
      // Save to DB
      if (user) {
        supabase.from('prediction_history').insert({
          user_id: user.id,
          city_name: city,
          ph: params.ph,
          dissolved_oxygen: params.dissolvedOxygen,
          turbidity: params.turbidity,
          temperature: params.temperature,
          rainfall: params.rainfall,
          coliform: params.coliform,
          predicted_disease: result.disease,
          risk_level: result.riskLevel,
          confidence_score: result.confidenceScore,
          water_quality_index: result.waterQualityIndex,
        });
        // Create alert if risk is high
        if (result.riskLevel === 'High' || result.riskLevel === 'Critical') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase.from('alerts') as any).insert({
            user_id: user.id,
            city_name: city,
            disease_name: result.disease,
            risk_level: result.riskLevel,
            severity: result.riskLevel === 'Critical' ? 'Critical' : 'Warning',
            key_factors: result.keyFactors,
            parameter_data: params,
          });
        }
      }
    }, 800);
  };

  useEffect(() => {
    runPrediction(selectedCity);
    // Load user's saved cities
    if (user) {
      supabase.from('user_cities').select('city_name').eq('user_id', user.id).then(({ data }) => {
        if (data) setSavedCities(data.map(d => d.city_name));
      });
    }
  }, [user]);

  const selectCity = (city: string) => {
    setSelectedCity(city);
    runPrediction(city);
  };

  const addCity = () => {
    const city = cityInput.trim();
    if (!city) return;
    setCityInput('');
    selectCity(city);
    if (user && !savedCities.includes(city)) {
      supabase.from('user_cities').insert({ user_id: user.id, city_name: city });
      setSavedCities(prev => [...prev, city]);
    }
  };

  const params = prediction?.parameters;

  const paramCards = params ? [
    { label: 'pH Level', value: params.ph.toFixed(2), unit: 'pH', icon: Droplets, safe: params.ph >= 6.5 && params.ph <= 8.5, range: '6.5 - 8.5' },
    { label: 'Dissolved O₂', value: params.dissolvedOxygen.toFixed(1), unit: 'mg/L', icon: Activity, safe: params.dissolvedOxygen >= 6, range: '> 6 mg/L' },
    { label: 'Turbidity', value: params.turbidity.toFixed(1), unit: 'NTU', icon: Wind, safe: params.turbidity < 4, range: '< 4 NTU' },
    { label: 'Temperature', value: params.temperature.toFixed(1), unit: '°C', icon: Thermometer, safe: params.temperature < 30, range: '< 30 °C' },
    { label: 'Rainfall', value: params.rainfall.toFixed(1), unit: 'mm', icon: CloudRain, safe: params.rainfall < 10, range: '< 10 mm/d' },
    { label: 'Coliform', value: params.coliform.toFixed(0), unit: 'CFU', icon: AlertTriangle, safe: params.coliform < 5, range: '< 5 CFU' },
  ] : [];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Water Quality Dashboard</h1>
          <p className="text-muted-foreground text-sm">Real-time disease risk monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="w-3.5 h-3.5" />
            Updated {lastUpdated.toLocaleTimeString()}
          </div>
          {prediction && (
            <button
              onClick={() => exportDashboardPDF(selectedCity, prediction)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'hsl(var(--primary))' }}
              title={`Export ${selectedCity} report as PDF`}
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          )}
        </div>
      </motion.div>

      {/* City Selector */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCity()}
              placeholder="Enter any city name..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-foreground"
            />
          </div>
          <button onClick={addCity} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-primary-foreground transition-all hover:opacity-90" style={{ background: 'hsl(var(--primary))' }}>
            <Plus className="w-4 h-4" />Search
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {POPULAR_CITIES.map(city => (
            <button key={city} onClick={() => selectCity(city)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedCity === city ? 'text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
              style={selectedCity === city ? { background: 'hsl(var(--primary))' } : {}}>
              {city}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Risk Gauge */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <RiskGauge
            city={selectedCity}
            prediction={prediction}
            loading={loading}
          />
        </motion.div>

        {/* Key Parameters */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {paramCards.map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i + 0.2 }} className="stat-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{card.label}</span>
                <div className={`p-1.5 rounded-lg ${card.safe ? 'bg-green-100' : 'bg-red-100'}`}>
                  <card.icon className={`w-3.5 h-3.5 ${card.safe ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
              <div className="text-xl font-bold text-foreground">{card.value} <span className="text-xs font-normal text-muted-foreground">{card.unit}</span></div>
              <div className={`text-xs font-medium ${card.safe ? 'text-risk-low' : 'text-risk-high'}`}>
                {card.safe ? '✓ Normal' : '⚠ Abnormal'}
              </div>
              <div className="text-xs text-muted-foreground">Safe: {card.range}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 7-Day Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Temperature + Rainfall */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-primary" />
            Temperature & Rainfall (7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="temperature" stroke="#f59e0b" fill="url(#tempGrad)" name="Temp (°C)" strokeWidth={2} />
              <Area type="monotone" dataKey="rainfall" stroke="#3b82f6" fill="url(#rainGrad)" name="Rain (mm)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Water Quality Trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Droplets className="w-4 h-4 text-primary" />
            Water Quality Trends (7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="ph" stroke="#8b5cf6" name="pH" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="dissolvedOxygen" stroke="#06b6d4" name="DO (mg/L)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="turbidity" stroke="#f97316" name="Turbidity" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* City Heatmap */}
      {savedCities.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <CityHeatmap cities={savedCities} />
        </motion.div>
      )}

      {/* Disease Prediction Summary */}
      {prediction && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="glass-card p-5">
          <h3 className="font-semibold text-foreground mb-4">Prediction Summary — {selectedCity}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Primary Disease Risk</div>
              <div className="text-xl font-bold text-foreground">{prediction.disease}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-medium px-2.5 py-1 rounded-full" style={{
                  background: RISK_COLORS[prediction.riskLevel] + '20',
                  color: RISK_COLORS[prediction.riskLevel]
                }}>
                  {prediction.riskLevel} Risk
                </span>
                <span className="text-sm text-muted-foreground">{prediction.confidenceScore}% confidence</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">Key Risk Factors</div>
              <div className="space-y-1.5">
                {prediction.keyFactors.slice(0, 3).map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground mb-2">Recommendations</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {prediction.recommendations.slice(0, 4).map(r => (
                <div key={r} className="flex items-start gap-2 text-sm text-foreground p-2.5 rounded-lg bg-accent/40">
                  <span className="text-primary mt-0.5">→</span>
                  {r}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
