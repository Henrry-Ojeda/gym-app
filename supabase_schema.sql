-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive');
CREATE TYPE fitness_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- 2. TABLES
-- Profiles: Extends Supabase Auth
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    subscription_status subscription_status DEFAULT 'inactive',
    stripe_customer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Exercises: Catalog of movements
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    muscle_group TEXT NOT NULL,
    video_url TEXT, -- Storage path
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Routines: Workout plans
CREATE TABLE routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES profiles(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    level fitness_level DEFAULT 'intermediate',
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Routine Exercises: Junction table with details
CREATE TABLE routine_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID REFERENCES routines(id) ON DELETE CASCADE NOT NULL,
    exercise_id UUID REFERENCES exercises(id) NOT NULL,
    sets INT NOT NULL,
    reps TEXT NOT NULL, -- Flexible formatting (e.g., "12", "10-12", "failure")
    rest_time TEXT, -- e.g., "60s"
    order_index INT NOT NULL,
    UNIQUE(routine_id, order_index)
);

-- Chats: Conversation rooms
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES profiles(id) NOT NULL,
    admin_id UUID REFERENCES profiles(id) NOT NULL,
    last_message TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(client_id, admin_id)
);

-- Messages: Individual chat content
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- User Progress: Tracking performance
CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    exercise_id UUID REFERENCES exercises(id) NOT NULL,
    weight FLOAT,
    reps_done INT,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Exercises Policies (Public/User: Read, Admin: All)
CREATE POLICY "Anyone can read exercises" ON exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins have full access to exercises" ON exercises ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Routines Policies
CREATE POLICY "Anyone can read routines" ON routines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins have full access to routines" ON routines ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Chat Policies
CREATE POLICY "Users can see their own chats" ON chats FOR SELECT USING (auth.uid() = client_id OR auth.uid() = admin_id);
CREATE POLICY "Users can insert messages in their chats" ON messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM chats WHERE id = chat_id AND (auth.uid() = client_id OR auth.uid() = admin_id))
);
CREATE POLICY "Users can see messages in their chats" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM chats WHERE id = chat_id AND (auth.uid() = client_id OR auth.uid() = admin_id))
);

-- Progress Policies
CREATE POLICY "Users can manage their own progress" ON user_progress ALL USING (auth.uid() = user_id);

-- 4. TRIGGERS
-- Create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
