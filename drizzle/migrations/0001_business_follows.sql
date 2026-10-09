CREATE TABLE public.business_follows (
  user_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, business_id)
);
GRANT SELECT, INSERT, DELETE ON public.business_follows TO authenticated;
GRANT ALL ON public.business_follows TO service_role;
ALTER TABLE public.business_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own follows" ON public.business_follows FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.follower_count(_business_id uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT count(*)::int FROM public.business_follows WHERE business_id = _business_id $$;

CREATE OR REPLACE FUNCTION public.notify_followers() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bname text;
BEGIN
  IF NEW.status = 'approved' AND NOT NEW.is_flagged
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT name INTO bname FROM public.businesses WHERE id = NEW.business_id;
    INSERT INTO public.notifications (user_id, title, body, link)
    SELECT f.user_id, 'New deal from ' || COALESCE(bname,'a brand you follow'), NEW.title, '/deals/' || NEW.id
    FROM public.business_follows f WHERE f.business_id = NEW.business_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER notify_followers AFTER INSERT OR UPDATE OF status ON public.promotions
FOR EACH ROW EXECUTE FUNCTION public.notify_followers();