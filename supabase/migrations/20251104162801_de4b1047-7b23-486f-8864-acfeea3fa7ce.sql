-- Create clone_waiting_list table
CREATE TABLE public.clone_waiting_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, mentor_id)
);

-- Enable RLS
ALTER TABLE public.clone_waiting_list ENABLE ROW LEVEL SECURITY;

-- Users can view their own waiting list entries
CREATE POLICY "Users can view their own waiting list entries"
ON public.clone_waiting_list
FOR SELECT
USING (auth.uid() = user_id);

-- Users can join waiting list
CREATE POLICY "Users can join waiting list"
ON public.clone_waiting_list
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove themselves from waiting list
CREATE POLICY "Users can remove themselves from waiting list"
ON public.clone_waiting_list
FOR DELETE
USING (auth.uid() = user_id);

-- Anyone can view the count (for displaying total waiting)
CREATE POLICY "Anyone can view waiting list count"
ON public.clone_waiting_list
FOR SELECT
USING (true);