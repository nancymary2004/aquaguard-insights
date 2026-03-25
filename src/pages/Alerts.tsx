import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Filter, Mail, X, Clock, MapPin, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { simulateWaterParameters, predictDisease } from '@/lib/predictionEngine';

interface Alert {
  id: string;
  city_name: string;
  disease_name: string;
  risk_level: string;
  severity: string;
  key_factors: string[];
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  parameter_data?: Record<string, number>;
}

const SEVERITY_CONFIG = {
  Critical: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', tag: '🔴 Critical' },
  Warning: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', tag: '🟡 Warning' },
  Safe: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', tag: '🟢 Safe' },
};

// Simulated alert generator for demo
function generateDemoAlerts(userId: string): Omit<Alert, 'id' | 'is_read' | 'is_dismissed'>[] {
  const cities = ['Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Hyderabad'];
  return cities.map((city, i) => {
    const params = simulateWaterParameters(city);
    const pred = predictDisease(params);
    const severity = pred.riskLevel === 'Critical' || pred.riskLevel === 'High' ? 'Critical' : pred.riskLevel === 'Medium' ? 'Warning' : 'Safe';
    const date = new Date();
    date.setHours(date.getHours() - i * 2);
    return {
      city_name: city,
      disease_name: pred.disease,
      risk_level: pred.riskLevel,
      severity,
      key_factors: pred.keyFactors,
      created_at: date.toISOString(),
      parameter_data: params as unknown as Record<string, number>,
    };
  });
}

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'All' | 'Critical' | 'Warning' | 'Safe'>('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, [user]);

  const loadAlerts = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('alerts').select('*').eq('user_id', user.id).eq('is_dismissed', false).order('created_at', { ascending: false });
    
    if (data && data.length > 0) {
      setAlerts(data as Alert[]);
    } else {
      // Insert demo alerts
      const demos = generateDemoAlerts(user.id);
      for (const d of demos) {
        await (supabase.from('alerts') as any).insert({ ...d, user_id: user.id });
      }
      const { data: fresh } = await supabase.from('alerts').select('*').eq('user_id', user.id).eq('is_dismissed', false).order('created_at', { ascending: false });
      if (fresh) setAlerts(fresh as Alert[]);
    }
    setLoading(false);
  };

  const dismissAlert = async (id: string) => {
    await supabase.from('alerts').update({ is_dismissed: true } as any).eq('id', id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const markRead = async (id: string) => {
    await supabase.from('alerts').update({ is_read: true } as any).eq('id', id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  };

  const sendAlert = (alert: Alert) => {
    const subject = `Alert for ${alert.disease_name}`;
    const body = `Alert: ${alert.risk_level} Risk of ${alert.disease_name}
City: ${alert.city_name}
Risk Level: ${alert.risk_level}
Severity: ${alert.severity}
Key Factors: ${alert.key_factors?.join(', ') ?? 'N/A'}
Timestamp: ${new Date(alert.created_at).toLocaleString()}

Please take necessary precautions.`;
    window.location.href = `mailto:nagajithu123@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const cities = ['All', ...Array.from(new Set(alerts.map(a => a.city_name)))];
  const filtered = alerts.filter(a => {
    if (filter !== 'All' && a.severity !== filter) return false;
    if (cityFilter !== 'All' && a.city_name !== cityFilter) return false;
    return true;
  });

  const unread = alerts.filter(a => !a.is_read).length;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Smart Alerts
            {unread > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground">{unread}</span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">{alerts.length} active alerts across {cities.length - 1} cities</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
        <div className="flex flex-wrap gap-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1.5">Severity</div>
            <div className="flex gap-1.5">
              {(['All', 'Critical', 'Warning', 'Safe'] as const).map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={filter === s ? { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' } : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>
                  {s === 'Critical' ? '🔴' : s === 'Warning' ? '🟡' : s === 'Safe' ? '🟢' : ''} {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1.5">City</div>
            <div className="flex flex-wrap gap-1.5">
              {cities.map(c => (
                <button key={c} onClick={() => setCityFilter(c)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={cityFilter === c ? { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' } : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Critical', count: alerts.filter(a => a.severity === 'Critical').length, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Warning', count: alerts.filter(a => a.severity === 'Warning').length, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Safe', count: alerts.filter(a => a.severity === 'Safe').length, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className={`glass-card p-4 text-center ${s.bg}`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
            <div className={`text-xs font-medium ${s.color}`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alert Cards */}
      {loading ? (
        <div className="flex justify-center py-10"><div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((alert, i) => {
              const sc = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.Warning;
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -300 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => markRead(alert.id)}
                  className={`glass-card p-5 border-2 cursor-pointer ${sc.border} ${sc.bg} ${!alert.is_read ? 'ring-2 ring-primary/20' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <sc.icon className={`w-5 h-5 mt-0.5 shrink-0 ${sc.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <span className="font-bold text-foreground">{alert.disease_name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${sc.border} ${sc.color}`}>{sc.tag}</span>
                          {!alert.is_read && <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">NEW</span>}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{alert.city_name}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(alert.created_at).toLocaleString()}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(alert.key_factors ?? []).slice(0, 3).map(f => (
                            <span key={f} className={`text-xs px-2 py-0.5 rounded-md border ${sc.border} ${sc.color} bg-white/50`}>{f}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); sendAlert(alert); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all"
                      >
                        <Mail className="w-3.5 h-3.5" />Send
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); dismissAlert(alert.id); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No alerts matching current filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
