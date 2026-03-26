import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { simulateWaterParameters, predictDisease } from '@/lib/predictionEngine';
import { BarChart2 } from 'lucide-react';

interface Props {
  cities: { city_name: string }[];
}

const RISK_ORDER = { Low: 1, Medium: 2, High: 3, Critical: 4 };
const RISK_VALUE = { Low: 25, Medium: 55, High: 80, Critical: 100 };
const RISK_BAR_COLOR: Record<string, string> = {
  Low: '#22c55e',
  Medium: '#f97316',
  High: '#ef4444',
  Critical: '#b91c1c',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-lg text-xs space-y-1">
      <div className="font-bold text-foreground text-sm">{d.city}</div>
      <div style={{ color: RISK_BAR_COLOR[d.riskLevel] }} className="font-semibold">{d.riskLevel} Risk</div>
      <div className="text-muted-foreground">WQI: {d.wqi}</div>
      <div className="text-muted-foreground">Disease: {d.disease}</div>
      <div className="text-muted-foreground">Confidence: {d.confidence}%</div>
    </div>
  );
};

export default function CitiesRiskChart({ cities }: Props) {
  const data = useMemo(() =>
    cities.map(c => {
      const params = simulateWaterParameters(c.city_name);
      const pred = predictDisease(params);
      return {
        city: c.city_name,
        riskLevel: pred.riskLevel,
        riskValue: RISK_VALUE[pred.riskLevel] ?? 50,
        wqi: pred.waterQualityIndex.toFixed(1),
        disease: pred.disease,
        confidence: pred.confidenceScore,
      };
    }).sort((a, b) => (RISK_ORDER[b.riskLevel as keyof typeof RISK_ORDER] ?? 0) - (RISK_ORDER[a.riskLevel as keyof typeof RISK_ORDER] ?? 0)),
  [cities]);

  if (!cities.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass-card p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Cities Risk Comparison</h3>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          {Object.entries(RISK_BAR_COLOR).map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: color }} />
              <span className="text-muted-foreground">{label}</span>
            </span>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={data.length > 6 ? 320 : 240}>
        <BarChart
          data={data}
          margin={{ top: 24, right: 10, left: -10, bottom: 8 }}
          barCategoryGap="30%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="city"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[25, 55, 80, 100]}
            tickFormatter={v =>
              v === 25 ? 'Low' : v === 55 ? 'Med' : v === 80 ? 'High' : 'Crit'
            }
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent)/0.4)' }} />
          <Bar dataKey="riskValue" radius={[6, 6, 0, 0]} maxBarSize={56}>
            {data.map((entry) => (
              <Cell key={entry.city} fill={RISK_BAR_COLOR[entry.riskLevel]} fillOpacity={0.9} />
            ))}
            <LabelList
              dataKey="riskLevel"
              position="top"
              style={{ fontSize: 10, fontWeight: 600, fill: 'hsl(var(--foreground))' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* City count summary row */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
        {Object.entries(RISK_BAR_COLOR).map(([level, color]) => {
          const count = data.filter(d => d.riskLevel === level).length;
          if (!count) return null;
          return (
            <div key={level} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white" style={{ background: color }}>
              <span>{count} {count === 1 ? 'city' : 'cities'}</span>
              <span className="opacity-80">— {level}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
