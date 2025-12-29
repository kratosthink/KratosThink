-- Create table for spaced repetition schedules
CREATE TABLE public.lesson_revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  revision_count INTEGER NOT NULL DEFAULT 3,
  revision_dates DATE[] NOT NULL,
  completed_dates DATE[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Enable Row Level Security
ALTER TABLE public.lesson_revisions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own revisions" 
ON public.lesson_revisions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own revisions" 
ON public.lesson_revisions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own revisions" 
ON public.lesson_revisions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own revisions" 
ON public.lesson_revisions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lesson_revisions_updated_at
BEFORE UPDATE ON public.lesson_revisions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();