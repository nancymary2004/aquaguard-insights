import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import { BarChart2, TrendingUp, AlertCircle, CheckCircle, Droplets } from 'lucide-react';
import { simulateWaterParameters, predictDisease, generate7DayHistory } from '@/lib/predictionEngine';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const SAFE_RANGES = {
  ph: { min: 6.5, max: 8.5, label: 'pH' },
  dissolvedOxygen: { min: 6, max: 9.5, label: 'Dissolved O₂ (mg/L)' },
  turbidity: { min: 0, max: 4, label: 'Turbidity (NTU)' },
  temperature: { min: 15, max: 30, label: 'Temperature (°C)' },
  rainfall: { min: 0, max: 10, label: 'Rainfall (mm)' },
  coliform: { min: 0, max: 5, label: 'Coliform (CFU)' },
};

export default function Analysis() {
  const { user } = useAuth();
  const [city, setCity] = useState('Mumbai');
  const [history, setHistory] = useState(generate7DayHistory('Mumbai'));
  const [prediction, setPrediction] = useState(() => predictDisease(simulateWaterParameters('Mumbai')));
  const [savedCities, setSavedCities] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      supabase.from('user_cities').select('city_name').eq('user_id', user.id).then(({ data }) => {
        if (data?.length) {
          setSavedCities(data.map(d => d.city_name));
          setCity(data[0].city_name);
          updateCity(data[0].city_name);
        }
      });
    }
  }, [user]);

  const updateCity = (c: string) => {
    setCity(c);
    const params = simulateWaterParameters(c);
    setPrediction(predictDisease(params));
    setHistory(generate7DayHistory(c));
  };

  const params = prediction.parameters;

  const paramStatus = Object.entries(SAFE_RANGES).map(([key, range]) => {
    const val = params[key as keyof typeof params];
    const pct = Math.min(100, ((val - range.min) / (range.max - range.min + (range.max - range.min))) * 100);
    const isAbnormal = key === 'ph' ? (val < range.min || val > range.max) : val > range.max;
    return { key, label: range.label, value: val, isAbnormal, range, pct: Math.max(0, Math.min(100, pct)) };
  });

  const radarData = [
    { subject: 'pH', value: Math.min(100, params.ph / 14 * 100) },
    { subject: 'DO', value: Math.min(100, params.dissolvedOxygen / 10 * 100) },
    { subject: 'Turbidity', value: Math.min(100, params.turbidity / 50 * 100) },
    { subject: 'Coliform', value: Math.min(100, params.coliform / 500 * 100) },
    { subject: 'Temperature', value: Math.min(100, params.temperature / 45 * 100) },
    { subject: 'Rainfall', value: Math.min(100, params.rainfall / 30 * 100) },
  ];

  const abnormalCount = paramStatus.filter(p => p.isAbnormal).length;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-primary" /> Detailed Analysis
        </h1>
        <p className="text-muted-foreground text-sm">In-depth water parameter breakdown</p>
      </motion.div>

      {/* City selector */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-2">
          {(['Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Bangalore', ...savedCities] as string[]).filter((v, i, a) => a.indexOf(v) === i).slice(0, 8).map(c => (
            <button key={c} onClick={() => updateCity(c)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={city === c
                ? { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
                : {}}>
              <span style={city !== c ? { color: 'hsl(var(--muted-foreground))' } : {}}>{c}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Risk Level', value: prediction.riskLevel, icon: AlertCircle, color: prediction.riskLevel === 'Low' ? 'text-risk-low' : prediction.riskLevel === 'Medium' ? 'text-risk-medium' : 'text-risk-high' },
          { label: 'WQI Score', value: `${prediction.waterQualityIndex}/100`, icon: Droplets, color: 'text-primary' },
          { label: 'Abnormal Params', value: `${abnormalCount}/6`, icon: TrendingUp, color: abnormalCount > 2 ? 'text-risk-high' : 'text-risk-low' },
          { label: 'Confidence', value: `${prediction.confidenceScore}%`, icon: CheckCircle, color: 'text-primary' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="stat-card">
            <s.icon className={`w-5 h-5 mb-2 ${s.color}`} />
            <div className="text-xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Parameter Status */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
          <h3 className="font-semibold text-foreground mb-4">Parameter Status</h3>
          <div className="space-y-4">
            {paramStatus.map((p) => (
              <div key={p.key}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${p.isAbnormal ? 'bg-risk-high' : 'bg-risk-low'}`} />
                    <span className="text-foreground">{p.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-foreground">{Number(p.value).toFixed(2)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.isAbnormal ? 'badge-high' : 'badge-safe'}`}>
                      {p.isAbnormal ? '⚠ Abnormal' : '✓ Normal'}
                    </span>
                  </div>
                </div>
                <div className="param-bar">
                  <div className="param-bar-fill" style={{
                    width: `${p.pct}%`,
                    background: p.isAbnormal ? '#ef4444' : '#22c55e'
                  }} />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Safe: {p.range.min} – {p.range.max}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Radar Chart */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="glass-card p-5">
          <h3 className="font-semibold text-foreground mb-4">Parameter Radar</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Radar name="Value" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* 7-Day Comparison */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-5">
        <h3 className="font-semibold text-foreground mb-4">7-Day Coliform & pH Trend</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => v.slice(5)} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="coliform" fill="#ef4444" name="Coliform (CFU)" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="ph" fill="hsl(var(--primary))" name="pH" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Disease Info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card p-5">
        <h3 className="font-semibold text-foreground mb-4">Disease Prediction Details — {city}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Primary Disease Risk</div>
            <div className="text-2xl font-bold text-foreground">{prediction.disease}</div>
            <div className="mt-3 space-y-2">
              <div className="text-sm font-medium text-foreground">Key Risk Factors:</div>
              {prediction.keyFactors.map(f => (
                <div key={f} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-destructive/5 text-foreground">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  {f}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-foreground mb-2">Recommendations:</div>
            <div className="space-y-2">
              {prediction.recommendations.map(r => (
                <div key={r} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-primary/5 text-foreground">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {r}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
