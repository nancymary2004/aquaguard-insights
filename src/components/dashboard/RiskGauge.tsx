import React from 'react';
import { motion } from 'framer-motion';
import { PredictionResult } from '@/lib/predictionEngine';

interface RiskGaugeProps {
  city: string;
  prediction: PredictionResult | null;
  loading: boolean;
}

const RISK_CONFIG = {
  Low: { color: '#22c55e', bg: '#dcfce7', label: '🟢 LOW RISK', degrees: 45 },
  Medium: { color: '#f59e0b', bg: '#fef9c3', label: '🟡 MEDIUM RISK', degrees: 90 },
  High: { color: '#ef4444', bg: '#fee2e2', label: '🔴 HIGH RISK', degrees: 135 },
  Critical: { color: '#b91c1c', bg: '#fecaca', label: '🔴 CRITICAL', degrees: 170 },
};

export default function RiskGauge({ city, prediction, loading }: RiskGaugeProps) {
  const risk = prediction?.riskLevel ?? 'Low';
  const config = RISK_CONFIG[risk] || RISK_CONFIG.Low;
  const wqi = prediction?.waterQualityIndex ?? 100;

  // SVG arc math
  const cx = 120, cy = 110, r = 85;
  const startAngle = -180;
  const endAngle = 0;
  const totalDeg = endAngle - startAngle;
  const wqiDeg = startAngle + (wqi / 100) * totalDeg;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (from: number, to: number) => {
    const x1 = cx + r * Math.cos(toRad(from));
    const y1 = cy + r * Math.sin(toRad(from));
    const x2 = cx + r * Math.cos(toRad(to));
    const y2 = cy + r * Math.sin(toRad(to));
    const large = to - from > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  // Needle
  const needleAngle = -180 + (wqi / 100) * 180;
  const nx = cx + (r - 15) * Math.cos(toRad(needleAngle));
  const ny = cy + (r - 15) * Math.sin(toRad(needleAngle));

  return (
    <div className="glass-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Risk Gauge</h3>
        <span className="text-xs text-muted-foreground">{city}</span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex justify-center">
            <svg width="240" height="130" viewBox="0 0 240 130">
              {/* Background arc */}
              <path d={arcPath(-180, 0)} fill="none" stroke="hsl(var(--muted))" strokeWidth="16" strokeLinecap="round" />

              {/* Color zones */}
              <path d={arcPath(-180, -120)} fill="none" stroke="#22c55e" strokeWidth="14" strokeLinecap="round" opacity={0.7} />
              <path d={arcPath(-120, -60)} fill="none" stroke="#f59e0b" strokeWidth="14" strokeLinecap="round" opacity={0.7} />
              <path d={arcPath(-60, -20)} fill="none" stroke="#ef4444" strokeWidth="14" strokeLinecap="round" opacity={0.7} />
              <path d={arcPath(-20, 0)} fill="none" stroke="#b91c1c" strokeWidth="14" strokeLinecap="round" opacity={0.7} />

              {/* Value arc */}
              <path d={arcPath(-180, wqiDeg)} fill="none" stroke={config.color} strokeWidth="16" strokeLinecap="round" />

              {/* Needle */}
              <motion.line
                x1={cx} y1={cy}
                x2={nx} y2={ny}
                stroke={config.color}
                strokeWidth="3"
                strokeLinecap="round"
                animate={{ x2: nx, y2: ny }}
                transition={{ type: 'spring', damping: 15 }}
              />
              <circle cx={cx} cy={cy} r="8" fill={config.color} />
              <circle cx={cx} cy={cy} r="4" fill="hsl(var(--card))" />

              {/* WQI text */}
              <text x={cx} y={cy - 20} textAnchor="middle" fontSize="26" fontWeight="bold" fill={config.color}>{wqi}</text>
              <text x={cx} y={cy - 6} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">WQI</text>

              {/* Labels */}
              <text x="22" y="125" fontSize="9" fill="#22c55e">Safe</text>
              <text x="100" y="30" fontSize="9" fill="#f59e0b">Med</text>
              <text x="185" y="125" fontSize="9" fill="#ef4444">High</text>
            </svg>
          </div>

          <div className="text-center">
            <motion.div
              key={risk}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-block px-4 py-2 rounded-full text-sm font-bold mb-3"
              style={{ background: config.bg, color: config.color }}
            >
              {config.label}
            </motion.div>
            <div className="text-lg font-bold text-foreground">{prediction?.disease}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {prediction?.confidenceScore}% confidence score
            </div>

            {/* WQI bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Water Quality Index</span>
                <span>{wqi}/100</span>
              </div>
              <div className="param-bar">
                <motion.div
                  className="param-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${wqi}%` }}
                  style={{ background: config.color }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
