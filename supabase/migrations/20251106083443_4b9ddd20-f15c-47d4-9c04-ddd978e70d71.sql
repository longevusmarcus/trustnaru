-- Create table for daily actions
CREATE TABLE IF NOT EXISTS public.daily_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path_id UUID NOT NULL,
  action_date DATE NOT NULL DEFAULT CURRENT_DATE,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  all_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, action_date)
);

-- Enable RLS
ALTER TABLE public.daily_actions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own daily actions"
  ON public.daily_actions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily actions"
  ON public.daily_actions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily actions"
  ON public.daily_actions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily actions"
  ON public.daily_actions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_daily_actions_updated_at
  BEFORE UPDATE ON public.daily_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_daily_actions_user_date ON public.daily_actions(user_id, action_date);