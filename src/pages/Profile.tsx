import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, MapPin, Star, Trash2, Plus, Download, History, Settings, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTheme, THEMES } from '@/contexts/ThemeContext';
import { simulateWaterParameters, predictDisease } from '@/lib/predictionEngine';
import jsPDF from 'jspdf';
import CitiesRiskChart from '@/components/dashboard/CitiesRiskChart';

interface City {
  id: string;
  city_name: string;
  is_favorite: boolean;
  is_default: boolean;
  created_at: string;
}

interface PredHistory {
  id: string;
  city_name: string;
  predicted_disease: string;
  risk_level: string;
  confidence_score: number;
  water_quality_index: number;
  created_at: string;
}

const RISK_COLORS: Record<string, string> = {
  Low: '#22c55e',
  Medium: '#f59e0b',
  High: '#ef4444',
  Critical: '#b91c1c',
};

export default function Profile() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [cities, setCities] = useState<City[]>([]);
  const [history, setHistory] = useState<PredHistory[]>([]);
  const [profile, setProfile] = useState<{ username: string; theme: string } | null>(null);
  const [cityInput, setCityInput] = useState('');
  const [activeTab, setActiveTab] = useState<'cities' | 'history' | 'settings'>('cities');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: p }, { data: c }, { data: h }] = await Promise.all([
      supabase.from('profiles').select('username, theme').eq('id', user.id).single(),
      supabase.from('user_cities').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('prediction_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    ]);
    if (p) setProfile(p);
    if (c) setCities(c);
    if (h) setHistory(h);
    setLoading(false);
  };

  const addCity = async () => {
    const city = cityInput.trim();
    if (!city || !user || cities.some(c => c.city_name === city)) return;
    setCityInput('');
    const { data } = await supabase.from('user_cities').insert({ user_id: user.id, city_name: city }).select().single();
    if (data) setCities(prev => [data, ...prev]);
  };

  const toggleFavorite = async (id: string, current: boolean) => {
    await supabase.from('user_cities').update({ is_favorite: !current } as any).eq('id', id);
    setCities(prev => prev.map(c => c.id === id ? { ...c, is_favorite: !current } : c));
  };

  const deleteCity = async (id: string) => {
    await supabase.from('user_cities').delete().eq('id', id);
    setCities(prev => prev.filter(c => c.id !== id));
  };

  const saveTheme = async (t: string) => {
    setTheme(t as any);
    if (user) await supabase.from('profiles').update({ theme: t } as any).eq('id', user.id);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(0, 119, 190);
    doc.text('WBDPS — Water Quality Report', 20, 25);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`User: ${profile?.username ?? user?.email}`, 20, 40);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 20, 50);
    doc.text(`Cities Monitored: ${cities.length}`, 20, 60);
    
    if (history.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(0, 119, 190);
      doc.text('Recent Predictions', 20, 80);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      history.slice(0, 10).forEach((h, i) => {
        const y = 90 + i * 18;
        doc.text(`${h.city_name}`, 20, y);
        doc.text(`Disease: ${h.predicted_disease}`, 60, y);
        doc.text(`Risk: ${h.risk_level}`, 130, y);
        doc.text(`WQI: ${h.water_quality_index}`, 155, y);
        doc.text(new Date(h.created_at).toLocaleDateString(), 175, y);
      });
    }

    // Water parameters for each city
    if (cities.length > 0) {
      let y = 90 + Math.min(history.length, 10) * 18 + 20;
      doc.setFontSize(14);
      doc.setTextColor(0, 119, 190);
      doc.text('City Water Parameters', 20, y);
      y += 10;
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      cities.slice(0, 5).forEach(city => {
        const params = simulateWaterParameters(city.city_name);
        const pred = predictDisease(params);
        doc.text(`${city.city_name}: pH ${params.ph} | DO ${params.dissolvedOxygen} mg/L | Turbidity ${params.turbidity} NTU | Risk: ${pred.riskLevel}`, 20, y);
        y += 12;
      });
    }

    doc.save(`WBDPS_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const tabs = [
    { id: 'cities', label: 'My Cities', icon: MapPin },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-4xl mx-auto">
      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-primary-foreground" style={{ background: 'var(--gradient-hero)' }}>
            {(profile?.username ?? user?.email ?? 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="text-xl font-bold text-foreground">{profile?.username ?? 'User'}</div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
              <span>{cities.length} cities</span>
              <span>•</span>
              <span>{history.length} predictions</span>
            </div>
          </div>
          <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all">
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'cities' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Add City */}
          <div className="glass-card p-4 flex gap-2">
            <input value={cityInput} onChange={(e) => setCityInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCity()}
              placeholder="Add a new city to monitor..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-foreground" />
            <button onClick={addCity} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cities.map((city, i) => {
              const params = simulateWaterParameters(city.city_name);
              const pred = predictDisease(params);
              return (
                <motion.div key={city.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        {city.city_name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">WQI: {pred.waterQualityIndex}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleFavorite(city.id, city.is_favorite)} className={`p-1.5 rounded-lg transition-all ${city.is_favorite ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}>
                        <Star className="w-4 h-4" fill={city.is_favorite ? 'currentColor' : 'none'} />
                      </button>
                      <button onClick={() => deleteCity(city.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: RISK_COLORS[pred.riskLevel] }}>{pred.riskLevel} Risk</span>
                    <span className="text-xs text-muted-foreground">{pred.disease}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pred.waterQualityIndex}%`, background: RISK_COLORS[pred.riskLevel] }} />
                  </div>
                </motion.div>
              );
            })}
          </div>
          {cities.length === 0 && !loading && (
            <div className="text-center py-10 text-muted-foreground">
              <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No cities added yet. Add your first city above!</p>
            </div>
          )}

          {/* Risk Bar Chart */}
          {cities.length >= 2 && <CitiesRiskChart cities={cities} />}
        </motion.div>
      )}

      {activeTab === 'history' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {history.map((h, i) => (
            <motion.div key={h.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="glass-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: RISK_COLORS[h.risk_level] }}>
                {h.risk_level[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">{h.city_name}</span>
                  <span className="text-xs text-muted-foreground">→</span>
                  <span className="text-sm text-foreground">{h.predicted_disease}</span>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-medium" style={{ color: RISK_COLORS[h.risk_level] }}>{h.risk_level}</div>
                <div className="text-xs text-muted-foreground">WQI {h.water_quality_index}</div>
              </div>
            </motion.div>
          ))}
          {history.length === 0 && !loading && (
            <div className="text-center py-10 text-muted-foreground">
              <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No prediction history yet.</p>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'settings' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="font-semibold text-foreground mb-4">Theme Selection</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {THEMES.map(t => (
                <button key={t.value} onClick={() => saveTheme(t.value)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    theme === t.value ? 'border-primary' : 'border-border hover:border-primary/50'
                  }`}>
                  <div className="text-3xl mb-2">{t.icon}</div>
                  <div className="font-medium text-sm text-foreground">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.description}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="font-semibold text-foreground mb-2">Account Info</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between"><span>Email</span><span className="text-foreground">{user?.email}</span></div>
              <div className="flex justify-between"><span>Username</span><span className="text-foreground">{profile?.username}</span></div>
              <div className="flex justify-between"><span>Member since</span><span className="text-foreground">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span></div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
