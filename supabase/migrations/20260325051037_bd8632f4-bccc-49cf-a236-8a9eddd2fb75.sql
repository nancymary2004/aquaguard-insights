
-- User profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  avatar_url TEXT,
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User cities (saved locations)
CREATE TABLE IF NOT EXISTS public.user_cities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  city_name TEXT NOT NULL,
  country TEXT DEFAULT 'India',
  is_favorite BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prediction history
CREATE TABLE IF NOT EXISTS public.prediction_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  city_name TEXT NOT NULL,
  ph DECIMAL(4,2),
  dissolved_oxygen DECIMAL(5,2),
  turbidity DECIMAL(6,2),
  temperature DECIMAL(5,2),
  rainfall DECIMAL(7,2),
  coliform DECIMAL(10,2),
  predicted_disease TEXT,
  risk_level TEXT CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
  confidence_score DECIMAL(5,2),
  water_quality_index DECIMAL(5,2),
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Smart alerts
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  city_name TEXT NOT NULL,
  disease_name TEXT NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')) NOT NULL,
  severity TEXT CHECK (severity IN ('Safe', 'Warning', 'Critical')) NOT NULL,
  key_factors TEXT[],
  parameter_data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  city_context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Water quality daily snapshots (historical)
CREATE TABLE IF NOT EXISTS public.water_quality_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  city_name TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  ph DECIMAL(4,2),
  dissolved_oxygen DECIMAL(5,2),
  turbidity DECIMAL(6,2),
  temperature DECIMAL(5,2),
  rainfall DECIMAL(7,2),
  coliform DECIMAL(10,2),
  risk_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, city_name, snapshot_date)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_quality_snapshots ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Cities policies
CREATE POLICY "Users manage own cities" ON public.user_cities FOR ALL USING (auth.uid() = user_id);

-- Prediction history policies
CREATE POLICY "Users manage own predictions" ON public.prediction_history FOR ALL USING (auth.uid() = user_id);

-- Alerts policies
CREATE POLICY "Users manage own alerts" ON public.alerts FOR ALL USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users manage own chat" ON public.chat_messages FOR ALL USING (auth.uid() = user_id);

-- Snapshots policies
CREATE POLICY "Users manage own snapshots" ON public.water_quality_snapshots FOR ALL USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
