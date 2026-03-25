// ===== WATER QUALITY SIMULATION ENGINE =====
// Simulates realistic water quality parameters based on city + weather data

export interface WaterParameters {
  ph: number;
  dissolvedOxygen: number;
  turbidity: number;
  temperature: number;
  rainfall: number;
  coliform: number;
}

export interface PredictionResult {
  disease: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  confidenceScore: number;
  waterQualityIndex: number;
  keyFactors: string[];
  recommendations: string[];
  parameters: WaterParameters;
}

// City climate profiles for realistic simulation
const CITY_PROFILES: Record<string, { baseTemp: number; rainMultiplier: number; contaminationRisk: number }> = {
  'Mumbai': { baseTemp: 28, rainMultiplier: 1.8, contaminationRisk: 0.7 },
  'Delhi': { baseTemp: 25, rainMultiplier: 0.9, contaminationRisk: 0.8 },
  'Chennai': { baseTemp: 30, rainMultiplier: 1.4, contaminationRisk: 0.6 },
  'Kolkata': { baseTemp: 27, rainMultiplier: 1.6, contaminationRisk: 0.75 },
  'Bangalore': { baseTemp: 23, rainMultiplier: 1.1, contaminationRisk: 0.4 },
  'Hyderabad': { baseTemp: 26, rainMultiplier: 1.0, contaminationRisk: 0.5 },
  'Pune': { baseTemp: 25, rainMultiplier: 1.2, contaminationRisk: 0.45 },
  'Ahmedabad': { baseTemp: 29, rainMultiplier: 0.7, contaminationRisk: 0.65 },
  'Jaipur': { baseTemp: 28, rainMultiplier: 0.6, contaminationRisk: 0.72 },
  'Lucknow': { baseTemp: 26, rainMultiplier: 0.9, contaminationRisk: 0.78 },
};

const DEFAULT_PROFILE = { baseTemp: 25, rainMultiplier: 1.0, contaminationRisk: 0.55 };

// Seeded random for consistent results per city
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function cityHash(city: string): number {
  return city.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

export function simulateWaterParameters(city: string, date?: Date): WaterParameters {
  const profile = CITY_PROFILES[city] || DEFAULT_PROFILE;
  const hash = cityHash(city);
  const dateOffset = date ? Math.floor(date.getTime() / 86400000) : Math.floor(Date.now() / 86400000);
  const rand = seededRandom(hash + dateOffset);

  const noise = (min: number, max: number) => min + rand() * (max - min);
  const risk = profile.contaminationRisk;

  // pH: safe 6.5-8.5, higher risk = more acidic or alkaline
  const ph = risk > 0.6
    ? noise(5.5, 6.8) + (rand() > 0.5 ? noise(0, 1.5) : 0)
    : noise(6.8, 8.2);

  // Dissolved Oxygen: safe > 6 mg/L, risk = lower
  const dissolvedOxygen = risk > 0.6
    ? noise(3.0, 6.0)
    : noise(6.0, 9.5);

  // Turbidity: safe < 4 NTU, high risk = high turbidity
  const turbidity = risk > 0.65
    ? noise(5, 40) * profile.rainMultiplier
    : noise(0.5, 5);

  // Temperature
  const temperature = profile.baseTemp + noise(-4, 6);

  // Rainfall (mm/day)
  const rainfall = noise(0, 20) * profile.rainMultiplier;

  // Coliform (CFU/100mL): safe < 1, dangerous > 100
  const coliform = risk > 0.65
    ? noise(10, 1000) * risk
    : noise(0, 15);

  return {
    ph: Math.round(ph * 100) / 100,
    dissolvedOxygen: Math.round(dissolvedOxygen * 100) / 100,
    turbidity: Math.round(turbidity * 100) / 100,
    temperature: Math.round(temperature * 100) / 100,
    rainfall: Math.round(rainfall * 100) / 100,
    coliform: Math.round(coliform * 100) / 100,
  };
}

export function generate7DayHistory(city: string): (WaterParameters & { date: string })[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      ...simulateWaterParameters(city, date),
      date: date.toISOString().split('T')[0],
    };
  });
}

// ===== PREDICTION ENGINE =====

interface DiseaseRule {
  name: string;
  conditions: (p: WaterParameters) => boolean;
  weight: number;
  precautions: string[];
}

const DISEASE_RULES: DiseaseRule[] = [
  {
    name: 'Cholera',
    conditions: (p) => p.coliform > 200 && p.turbidity > 10,
    weight: 0.9,
    precautions: ['Boil all drinking water', 'Avoid raw foods washed in tap water', 'Use ORS if symptoms appear', 'Seek immediate medical attention'],
  },
  {
    name: 'Typhoid Fever',
    conditions: (p) => p.coliform > 100 && p.ph < 6.5,
    weight: 0.85,
    precautions: ['Drink only purified water', 'Practice thorough handwashing', 'Get typhoid vaccination', 'Avoid street food'],
  },
  {
    name: 'Hepatitis A',
    conditions: (p) => p.coliform > 50 && p.turbidity > 5,
    weight: 0.8,
    precautions: ['Hepatitis A vaccination recommended', 'Avoid contaminated water sources', 'Wash hands with soap frequently'],
  },
  {
    name: 'Giardiasis',
    conditions: (p) => p.turbidity > 8 && p.dissolvedOxygen < 5,
    weight: 0.75,
    precautions: ['Use filtered or boiled water', 'Avoid swallowing water while swimming', 'Treat water with appropriate filters'],
  },
  {
    name: 'Dysentery',
    conditions: (p) => p.coliform > 30 && p.temperature > 30,
    weight: 0.7,
    precautions: ['Maintain strict hygiene', 'Avoid ice made from tap water', 'Wash fruits and vegetables thoroughly'],
  },
  {
    name: 'Leptospirosis',
    conditions: (p) => p.rainfall > 15 && p.turbidity > 12,
    weight: 0.72,
    precautions: ['Avoid walking in flooded water', 'Wear protective footwear during floods', 'Leptospirosis vaccination for high-risk individuals'],
  },
  {
    name: 'Cryptosporidiosis',
    conditions: (p) => p.turbidity > 15 && p.ph < 7.0,
    weight: 0.65,
    precautions: ['UV water treatment recommended', 'Boil water before drinking', 'Immunocompromised individuals should take extra precautions'],
  },
  {
    name: 'E. coli Infection',
    conditions: (p) => p.coliform > 15 && p.temperature > 25,
    weight: 0.6,
    precautions: ['Cook food thoroughly', 'Avoid raw produce washed in tap water', 'Proper food storage'],
  },
];

function calculateWQI(p: WaterParameters): number {
  // Weighted Water Quality Index (0-100, higher = better)
  const phScore = p.ph >= 6.5 && p.ph <= 8.5 ? 100 : p.ph < 5 || p.ph > 9.5 ? 0 : Math.max(0, 100 - Math.abs(p.ph - 7) * 25);
  const doScore = Math.min(100, (p.dissolvedOxygen / 9) * 100);
  const turbScore = Math.max(0, 100 - (p.turbidity / 50) * 100);
  const coliformScore = Math.max(0, 100 - (p.coliform / 500) * 100);

  return Math.round((phScore * 0.25 + doScore * 0.25 + turbScore * 0.25 + coliformScore * 0.25));
}

export function predictDisease(parameters: WaterParameters): PredictionResult {
  const keyFactors: string[] = [];

  if (parameters.ph < 6.5) keyFactors.push('Low pH (acidic water)');
  if (parameters.ph > 8.5) keyFactors.push('High pH (alkaline water)');
  if (parameters.dissolvedOxygen < 4) keyFactors.push('Very low dissolved oxygen');
  if (parameters.turbidity > 10) keyFactors.push(`High turbidity (${parameters.turbidity.toFixed(1)} NTU)`);
  if (parameters.coliform > 100) keyFactors.push(`Dangerous coliform levels (${parameters.coliform.toFixed(0)} CFU/100mL)`);
  if (parameters.coliform > 30) keyFactors.push('Elevated coliform bacteria');
  if (parameters.rainfall > 15) keyFactors.push('Heavy rainfall detected');
  if (parameters.temperature > 32) keyFactors.push('High temperature accelerates contamination');

  // Find matching diseases
  const matchedDiseases = DISEASE_RULES.filter(rule => rule.conditions(parameters));

  const wqi = calculateWQI(parameters);

  let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  let disease: string;
  let confidence: number;
  let recommendations: string[];

  if (matchedDiseases.length === 0 || wqi > 70) {
    riskLevel = wqi > 85 ? 'Low' : 'Medium';
    disease = wqi > 85 ? 'No Significant Disease Risk' : 'Mild Gastrointestinal Infection';
    confidence = wqi > 85 ? 92 : 68;
    recommendations = ['Water quality is acceptable', 'Regular monitoring recommended', 'Maintain standard hygiene practices', 'Annual water testing advised'];
  } else {
    const topDisease = matchedDiseases.sort((a, b) => b.weight - a.weight)[0];
    disease = topDisease.name;
    confidence = Math.round(topDisease.weight * 100 * (0.8 + Math.random() * 0.2));
    recommendations = topDisease.precautions;

    if (wqi < 30 || parameters.coliform > 500) {
      riskLevel = 'Critical';
    } else if (wqi < 50) {
      riskLevel = 'High';
    } else {
      riskLevel = 'Medium';
    }
  }

  return {
    disease,
    riskLevel,
    confidenceScore: confidence,
    waterQualityIndex: wqi,
    keyFactors: keyFactors.length > 0 ? keyFactors : ['Parameters within normal ranges'],
    recommendations,
    parameters,
  };
}
