CREATE UNIQUE INDEX IF NOT EXISTS access_tickets_user_container_unique
  ON public.access_tickets (user_id, container_id, container_type);
