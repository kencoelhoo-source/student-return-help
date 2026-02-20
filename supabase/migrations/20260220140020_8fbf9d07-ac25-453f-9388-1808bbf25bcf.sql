
-- Fix the notifications INSERT policy to be more restrictive
DROP POLICY "System can create notifications" ON public.notifications;
CREATE POLICY "Users can create notifications for others" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
