ALTER TABLE public.redemptions
  ADD COLUMN unlock_fee numeric,
  ADD COLUMN unlock_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN unlock_paid_at timestamptz,
  ADD COLUMN mpesa_receipt text;
ALTER TABLE public.platform_settings ADD COLUMN unlock_fee_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.commission_rate_for(_business_id uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(b.commission_rate, c.commission_rate, s.default_commission_rate)
  FROM public.businesses b LEFT JOIN public.categories c ON c.id = b.category_id CROSS JOIN public.platform_settings s
  WHERE b.id = _business_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.unlock_fee_for(_promotion_id uuid) RETURNS TABLE(rate numeric, fee numeric, required boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.commission_rate_for(p.business_id),
         GREATEST(1, ceil(p.promo_price * public.commission_rate_for(p.business_id) / 100)),
         (SELECT unlock_fee_enabled FROM public.platform_settings LIMIT 1)
  FROM public.promotions p WHERE p.id = _promotion_id
$$;
GRANT EXECUTE ON FUNCTION public.unlock_fee_for(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commission_rate_for(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.redeem_promotion(_promotion_id uuid)
 RETURNS redemptions LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p public.promotions; r public.redemptions; c text; used int; fee numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in to redeem'; END IF;
  SELECT * INTO p FROM public.promotions WHERE id = _promotion_id FOR UPDATE;
  IF NOT FOUND OR p.status <> 'approved' OR p.is_flagged THEN RAISE EXCEPTION 'This offer is not available'; END IF;
  IF now() < p.starts_at THEN RAISE EXCEPTION 'This offer has not started yet'; END IF;
  IF now() > p.ends_at THEN RAISE EXCEPTION 'This offer has expired'; END IF;
  IF public.owns_business(p.business_id) THEN RAISE EXCEPTION 'You cannot redeem your own offer'; END IF;
  SELECT * INTO r FROM public.redemptions WHERE user_id = auth.uid() AND promotion_id = _promotion_id AND status NOT IN ('cancelled','reversed') LIMIT 1;
  IF FOUND THEN RETURN r; END IF;
  used := public.redeemed_count(_promotion_id);
  IF p.max_redemptions IS NOT NULL AND used >= p.max_redemptions THEN RAISE EXCEPTION 'All redemptions for this offer have been claimed'; END IF;
  LOOP
    c := 'DEAL-' || upper(substr(translate(md5(random()::text || clock_timestamp()::text), '01', ''), 1, 5));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.redemptions WHERE code = c);
  END LOOP;
  SELECT u.fee INTO fee FROM public.unlock_fee_for(p.id) u;
  INSERT INTO public.redemptions (code, user_id, promotion_id, business_id, method, unlock_fee)
  VALUES (c, auth.uid(), p.id, p.business_id, p.redemption_method, fee) RETURNING * INTO r;
  RETURN r;
END $function$;

CREATE OR REPLACE FUNCTION public.confirm_redemption(_code text, _transaction_value numeric)
 RETURNS redemptions LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.redemptions; rate numeric; req boolean;
BEGIN
  SELECT * INTO r FROM public.redemptions WHERE upper(code) = upper(trim(_code)) FOR UPDATE;
  IF NOT FOUND OR NOT public.owns_business(r.business_id) THEN RAISE EXCEPTION 'Code not found for your business'; END IF;
  IF r.status <> 'available' THEN RAISE EXCEPTION 'This code has already been used (status: %)', r.status; END IF;
  SELECT unlock_fee_enabled INTO req FROM public.platform_settings LIMIT 1;
  IF req AND NOT r.unlock_paid THEN RAISE EXCEPTION 'This voucher has not been unlocked — the customer has not paid the unlock fee'; END IF;
  IF _transaction_value IS NULL OR _transaction_value < 0 OR _transaction_value > 10000000 THEN RAISE EXCEPTION 'Enter a valid transaction value'; END IF;
  rate := public.commission_rate_for(r.business_id);
  UPDATE public.redemptions SET
    status = 'completed', redeemed_at = now(), completed_at = now(), confirmed_by = auth.uid(),
    transaction_value = _transaction_value, commission_rate = rate,
    commission_amount = CASE WHEN r.unlock_paid THEN r.unlock_fee ELSE round(_transaction_value * rate / 100, 2) END,
    commission_paid = r.unlock_paid,
    commission_paid_at = CASE WHEN r.unlock_paid THEN now() ELSE NULL END
  WHERE id = r.id RETURNING * INTO r;
  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (r.user_id, 'Deal redeemed', 'Your code ' || r.code || ' was confirmed. Enjoy!', '/account');
  RETURN r;
END $function$;