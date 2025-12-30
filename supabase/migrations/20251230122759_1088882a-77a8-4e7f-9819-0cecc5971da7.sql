-- Create master_selections table for tracking user's master chapter choice
CREATE TABLE public.master_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  selected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_certified BOOLEAN DEFAULT false,
  certified_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.master_selections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own master selection" ON public.master_selections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own master selection" ON public.master_selections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own master selection" ON public.master_selections
  FOR UPDATE USING (auth.uid() = user_id);

-- Create feed_posts table for community articles
CREATE TABLE public.feed_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  likes_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for feed - everyone can see, only owner can edit
CREATE POLICY "Everyone can view feed posts" ON public.feed_posts
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own posts" ON public.feed_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON public.feed_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON public.feed_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Create post_likes table
CREATE TABLE public.post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Everyone can view likes" ON public.post_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own likes" ON public.post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" ON public.post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Add highlight_color to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS highlight_color TEXT DEFAULT '#fbbf24';

-- Trigger for updated_at on feed_posts
CREATE TRIGGER update_feed_posts_updated_at
  BEFORE UPDATE ON public.feed_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();