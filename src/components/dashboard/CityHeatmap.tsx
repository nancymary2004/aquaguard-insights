import React from 'react';
import { motion } from 'framer-motion';
import { simulateWaterParameters, predictDisease } from '@/lib/predictionEngine';
import { MapPin, Star } from 'lucide-react';

interface CityHeatmapProps {
  cities: string[];
}

const RISK_COLORS = {
  Low: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  Medium: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  High: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  Critical: { bg: '#fecaca', text: '#7f1d1d', border: '#f87171' },
};

export default function CityHeatmap({ cities }: CityHeatmapProps) {
  const cityData = cities.slice(0, 12).map(city => {
    const params = simulateWaterParameters(city);
    const pred = predictDisease(params);
    return { city, pred };
  });

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          City Risk Distribution
        </h3>
        <span className="text-xs text-muted-foreground">{cities.length} cities monitored</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cityData.map(({ city, pred }, i) => {
          const rc = RISK_COLORS[pred.riskLevel];
          return (
            <motion.div
              key={city}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="p-3 rounded-xl border-2 transition-all hover:scale-105 cursor-default"
              style={{ background: rc.bg, borderColor: rc.border }}
            >
              <div className="font-semibold text-sm" style={{ color: rc.text }}>{city}</div>
              <div className="text-xs mt-1" style={{ color: rc.text }}>{pred.riskLevel} Risk</div>
              <div className="text-xs opacity-75 mt-0.5" style={{ color: rc.text }}>WQI: {pred.waterQualityIndex}</div>
              <div className="mt-2 h-1.5 rounded-full bg-black/10 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pred.waterQualityIndex}%`, background: rc.text }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
        {Object.entries(RISK_COLORS).map(([level, c]) => (
          <div key={level} className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ background: c.text }} />
            <span className="text-muted-foreground">{level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
