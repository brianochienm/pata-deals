
CREATE TYPE public.app_role AS ENUM ('admin','business','customer');
CREATE TYPE public.review_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.redemption_method AS ENUM ('coupon','qr','online','booking','claim');
CREATE TYPE public.redemption_status AS ENUM ('available','redeemed','completed','cancelled','reversed');
CREATE TYPE public.dispute_status AS ENUM ('open','investigating','resolved','rejected');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  phone text,
  preferred_area text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.platform_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_commission_rate numeric(5,2) NOT NULL DEFAULT 5.00,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT UPDATE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings read" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "settings admin update" ON public.platform_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
INSERT INTO public.platform_settings (id) VALUES (1);

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '🏷️',
  sort_order int NOT NULL DEFAULT 0,
  commission_rate numeric(5,2)
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL DEFAULT 'Kenya',
  city text NOT NULL,
  area text NOT NULL,
  lat double precision,
  lng double precision,
  UNIQUE (city, area)
);
GRANT SELECT ON public.locations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "locations read" ON public.locations FOR SELECT USING (true);
CREATE POLICY "locations admin write" ON public.locations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  name text NOT NULL,
  category_id uuid REFERENCES public.categories(id),
  location_id uuid REFERENCES public.locations(id),
  description text,
  logo_url text,
  contact_person text,
  phone text,
  email text,
  website text,
  instagram text,
  address text,
  payout_details text,
  verification_info text,
  status public.review_status NOT NULL DEFAULT 'pending',
  commission_rate numeric(5,2),
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.businesses TO anon;
GRANT SELECT, INSERT, UPDATE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved businesses public" ON public.businesses FOR SELECT USING (status = 'approved' OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner creates business" ON public.businesses FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND status = 'pending' AND commission_rate IS NULL);
CREATE POLICY "owner or admin updates" ON public.businesses FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.guard_business_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    NEW.status := OLD.status;
    NEW.commission_rate := OLD.commission_rate;
    NEW.owner_id := OLD.owner_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_business_update BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.guard_business_update();

CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id),
  location_id uuid REFERENCES public.locations(id),
  title text NOT NULL,
  description text,
  image_url text,
  original_price numeric(12,2) NOT NULL,
  promo_price numeric(12,2) NOT NULL,
  discount_pct int GENERATED ALWAYS AS (CASE WHEN original_price > 0 THEN round((1 - promo_price/original_price)*100)::int ELSE 0 END) STORED,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  max_redemptions int,
  redemption_method public.redemption_method NOT NULL DEFAULT 'qr',
  online_url text,
  terms text,
  instructions text,
  tags text[] NOT NULL DEFAULT '{}',
  status public.review_status NOT NULL DEFAULT 'pending',
  is_featured boolean NOT NULL DEFAULT false,
  is_flagged boolean NOT NULL DEFAULT false,
  view_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.promotions (status, ends_at);
GRANT SELECT ON public.promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_business(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business_id AND owner_id = auth.uid())
$$;

CREATE POLICY "approved promos public" ON public.promotions FOR SELECT USING (
  (status = 'approved' AND NOT is_flagged AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.status = 'approved'))
  OR public.owns_business(business_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner creates promo" ON public.promotions FOR INSERT TO authenticated WITH CHECK (public.owns_business(business_id) AND status = 'pending' AND is_featured = false);
CREATE POLICY "owner/admin update promo" ON public.promotions FOR UPDATE TO authenticated USING (public.owns_business(business_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner/admin delete promo" ON public.promotions FOR DELETE TO authenticated USING (public.owns_business(business_id) OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.guard_promo_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    NEW.is_featured := OLD.is_featured;
    NEW.is_flagged := OLD.is_flagged;
    NEW.view_count := OLD.view_count;
    NEW.business_id := OLD.business_id;
    IF NEW.status <> OLD.status OR NEW.title <> OLD.title OR NEW.promo_price <> OLD.promo_price OR NEW.original_price <> OLD.original_price THEN
      NEW.status := 'pending';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_promo_update BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.guard_promo_update();

CREATE OR REPLACE FUNCTION public.validate_promo() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.promo_price < 0 OR NEW.original_price <= 0 OR NEW.promo_price > NEW.original_price THEN
    RAISE EXCEPTION 'Promotional price must be between 0 and the original price';
  END IF;
  IF NEW.ends_at <= NEW.starts_at THEN RAISE EXCEPTION 'Expiry must be after start date'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_promo BEFORE INSERT OR UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.validate_promo();

CREATE TABLE public.favourites (
  user_id uuid NOT NULL,
  promotion_id uuid NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, promotion_id)
);
GRANT SELECT, INSERT, DELETE ON public.favourites TO authenticated;
GRANT ALL ON public.favourites TO service_role;
ALTER TABLE public.favourites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favs" ON public.favourites FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  promotion_id uuid NOT NULL REFERENCES public.promotions(id) ON DELETE RESTRICT,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  method public.redemption_method NOT NULL,
  status public.redemption_status NOT NULL DEFAULT 'available',
  transaction_value numeric(12,2),
  commission_rate numeric(5,2),
  commission_amount numeric(12,2),
  commission_paid boolean NOT NULL DEFAULT false,
  commission_paid_at timestamptz,
  confirmed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz,
  completed_at timestamptz
);
CREATE INDEX ON public.redemptions (business_id, status);
CREATE INDEX ON public.redemptions (user_id);
GRANT SELECT, UPDATE ON public.redemptions TO authenticated;
GRANT ALL ON public.redemptions TO service_role;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "redemption read" ON public.redemptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.owns_business(business_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update redemption" ON public.redemptions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  promotion_id uuid REFERENCES public.promotions(id) ON DELETE SET NULL,
  author_name text,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (char_length(comment) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, promotion_id)
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "review after redemption" ON public.reviews FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.redemptions r WHERE r.user_id = auth.uid() AND r.business_id = reviews.business_id));
CREATE POLICY "own review delete" ON public.reviews FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_id uuid REFERENCES public.redemptions(id) ON DELETE CASCADE,
  promotion_id uuid REFERENCES public.promotions(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 1000),
  status public.dispute_status NOT NULL DEFAULT 'open',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dispute read" ON public.disputes FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "dispute create" ON public.disputes FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid() AND status = 'open');
CREATE POLICY "dispute admin update" ON public.disputes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.redeemed_count(_promotion_id uuid) RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.redemptions WHERE promotion_id = _promotion_id AND status NOT IN ('cancelled','reversed')
$$;
GRANT EXECUTE ON FUNCTION public.redeemed_count(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_view(_promotion_id uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.promotions SET view_count = view_count + 1 WHERE id = _promotion_id AND status = 'approved'
$$;
GRANT EXECUTE ON FUNCTION public.increment_view(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.redeem_promotion(_promotion_id uuid) RETURNS public.redemptions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.promotions; r public.redemptions; c text; used int;
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
  INSERT INTO public.redemptions (code, user_id, promotion_id, business_id, method)
  VALUES (c, auth.uid(), p.id, p.business_id, p.redemption_method) RETURNING * INTO r;
  RETURN r;
END $$;
GRANT EXECUTE ON FUNCTION public.redeem_promotion(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.lookup_redemption(_code text)
RETURNS TABLE (id uuid, code text, status public.redemption_status, promotion_title text, promo_price numeric, original_price numeric, customer_name text, created_at timestamptz, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.code, r.status, p.title, p.promo_price, p.original_price, pr.full_name, r.created_at, p.ends_at
  FROM public.redemptions r JOIN public.promotions p ON p.id = r.promotion_id
  LEFT JOIN public.profiles pr ON pr.id = r.user_id
  WHERE upper(r.code) = upper(trim(_code)) AND public.owns_business(r.business_id)
$$;
GRANT EXECUTE ON FUNCTION public.lookup_redemption(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_redemption(_code text, _transaction_value numeric) RETURNS public.redemptions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.redemptions; rate numeric;
BEGIN
  SELECT * INTO r FROM public.redemptions WHERE upper(code) = upper(trim(_code)) FOR UPDATE;
  IF NOT FOUND OR NOT public.owns_business(r.business_id) THEN RAISE EXCEPTION 'Code not found for your business'; END IF;
  IF r.status <> 'available' THEN RAISE EXCEPTION 'This code has already been used (status: %)', r.status; END IF;
  IF _transaction_value IS NULL OR _transaction_value < 0 OR _transaction_value > 10000000 THEN RAISE EXCEPTION 'Enter a valid transaction value'; END IF;
  SELECT COALESCE(b.commission_rate, c.commission_rate, s.default_commission_rate) INTO rate
  FROM public.businesses b LEFT JOIN public.categories c ON c.id = b.category_id CROSS JOIN public.platform_settings s
  WHERE b.id = r.business_id;
  UPDATE public.redemptions SET
    status = 'completed', redeemed_at = now(), completed_at = now(), confirmed_by = auth.uid(),
    transaction_value = _transaction_value, commission_rate = rate,
    commission_amount = round(_transaction_value * rate / 100, 2)
  WHERE id = r.id RETURNING * INTO r;
  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (r.user_id, 'Deal redeemed', 'Your code ' || r.code || ' was confirmed. Enjoy!', '/account');
  RETURN r;
END $$;
GRANT EXECUTE ON FUNCTION public.confirm_redemption(text, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.register_business(
  _name text, _category_id uuid, _location_id uuid, _description text, _contact_person text,
  _phone text, _email text, _website text, _instagram text, _address text, _payout_details text, _verification_info text, _logo_url text)
RETURNS public.businesses LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.businesses;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF length(trim(_name)) < 2 OR length(_name) > 120 THEN RAISE EXCEPTION 'Enter a valid business name'; END IF;
  IF EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = auth.uid()) THEN RAISE EXCEPTION 'You already have a business account'; END IF;
  INSERT INTO public.businesses (owner_id, name, category_id, location_id, description, contact_person, phone, email, website, instagram, address, payout_details, verification_info, logo_url)
  VALUES (auth.uid(), trim(_name), _category_id, _location_id, _description, _contact_person, _phone, _email, _website, _instagram, _address, _payout_details, _verification_info, _logo_url)
  RETURNING * INTO b;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'business') ON CONFLICT DO NOTHING;
  RETURN b;
END $$;
GRANT EXECUTE ON FUNCTION public.register_business(text,uuid,uuid,text,text,text,text,text,text,text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_first_admin() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin');
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_exists() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role='admin') $$;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_user_count() RETURNS int
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN (SELECT count(*) FROM public.profiles);
END $$;
GRANT EXECUTE ON FUNCTION public.admin_user_count() TO authenticated;

CREATE POLICY "media read" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "media own upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

INSERT INTO public.categories (slug, name, icon, sort_order) VALUES
('food','Restaurants & Food','🍽️',1),('fashion','Fashion','👗',2),('beauty','Beauty & Wellness','💆',3),
('travel','Travel','✈️',4),('hotels','Hotels','🏨',5),('entertainment','Entertainment','🎬',6),
('fitness','Fitness','🏋️',7),('electronics','Electronics','📱',8),('supermarkets','Supermarkets','🛒',9),
('services','Services','🧰',10),('experiences','Experiences','🎈',11),('education','Education','🎓',12),
('events','Events','🎟️',13),('healthcare','Healthcare','🩺',14),('other','Other','🏷️',15);

INSERT INTO public.locations (city, area) VALUES
('Nairobi','Westlands'),('Nairobi','Kilimani'),('Nairobi','Kileleshwa'),('Nairobi','Karen'),
('Nairobi','CBD'),('Nairobi','Lavington'),('Nairobi','Parklands'),('Nairobi','Upper Hill'),('Nairobi','Gigiri'),('Nairobi','South B');

INSERT INTO public.businesses (name, category_id, location_id, description, phone, email, website, status) VALUES
('Zucchini Kitchen',(SELECT id FROM categories WHERE slug='food'),(SELECT id FROM locations WHERE area='Westlands'),'Grill house and garden kitchen serving Nairobi since 2014.','+254 700 111 222','hello@zucchini.co.ke','https://example.com','approved'),
('Sunrise Bakery',(SELECT id FROM categories WHERE slug='food'),(SELECT id FROM locations WHERE area='Kilimani'),'Fresh pastries, artisan bread and great coffee.','+254 700 333 444','hi@sunrisebakery.co.ke',NULL,'approved'),
('FitStudio Nairobi',(SELECT id FROM categories WHERE slug='fitness'),(SELECT id FROM locations WHERE area='Kileleshwa'),'Strength, HIIT and spin classes with certified coaches.','+254 700 555 666','team@fitstudio.co.ke','https://example.com','approved'),
('Serenity Spa',(SELECT id FROM categories WHERE slug='beauty'),(SELECT id FROM locations WHERE area='Lavington'),'Day spa offering massages, facials and nail care.','+254 700 777 888','book@serenity.co.ke','https://example.com','approved'),
('Mitumba Mode',(SELECT id FROM categories WHERE slug='fashion'),(SELECT id FROM locations WHERE area='CBD'),'Curated streetwear, sneakers and accessories.','+254 700 999 000','shop@mitumbamode.co.ke','https://example.com','approved'),
('Karen Gardens Hotel',(SELECT id FROM categories WHERE slug='hotels'),(SELECT id FROM locations WHERE area='Karen'),'Boutique garden hotel with pool and restaurant.','+254 711 222 333','stay@karengardens.co.ke','https://example.com','approved'),
('TechHub Electronics',(SELECT id FROM categories WHERE slug='electronics'),(SELECT id FROM locations WHERE area='Westlands'),'Phones, laptops and accessories with warranty.','+254 711 444 555','sales@techhub.co.ke','https://example.com','approved'),
('CineMax Gigiri',(SELECT id FROM categories WHERE slug='entertainment'),(SELECT id FROM locations WHERE area='Gigiri'),'Premium cinema with recliner seats.','+254 711 666 777','tickets@cinemax.co.ke','https://example.com','approved');

INSERT INTO public.promotions (business_id, category_id, location_id, title, description, image_url, original_price, promo_price, starts_at, ends_at, max_redemptions, redemption_method, terms, instructions, tags, status, is_featured, view_count, online_url) VALUES
((SELECT id FROM businesses WHERE name='Zucchini Kitchen'),(SELECT id FROM categories WHERE slug='food'),(SELECT id FROM locations WHERE area='Westlands'),'2-for-1 Grilled Chicken & Sides','Two quarter-chicken plates with your choice of sides for the price of one. Perfect for lunch dates.','seed:chicken',1200,720,now()-interval '3 days',now()+interval '2 days',150,'qr','Valid Mon–Fri, 11am–4pm. Dine-in only. One claim per customer.','Show your QR code to the cashier before ordering.','{lunch,chicken,date night}','approved',true,412,NULL),
((SELECT id FROM businesses WHERE name='Sunrise Bakery'),(SELECT id FROM categories WHERE slug='food'),(SELECT id FROM locations WHERE area='Kilimani'),'Morning Pastry Box','Six assorted pastries plus two cappuccinos.','seed:pastry',850,595,now()-interval '5 days',now()+interval '20 hours',80,'coupon','Valid until 11am daily. Takeaway or dine-in.','Quote your coupon code at the counter.','{breakfast,coffee,pastry}','approved',false,268,NULL),
((SELECT id FROM businesses WHERE name='FitStudio Nairobi'),(SELECT id FROM categories WHERE slug='fitness'),(SELECT id FROM locations WHERE area='Kileleshwa'),'First Week Gym Pass','Unlimited classes and gym floor access for 7 days.','seed:gym',3000,1500,now()-interval '1 day',now()+interval '5 days',60,'booking','New members only. Valid ID required.','Book your first class, then show your code at reception.','{gym,fitness,workout}','approved',true,190,'https://example.com'),
((SELECT id FROM businesses WHERE name='Serenity Spa'),(SELECT id FROM categories WHERE slug='beauty'),(SELECT id FROM locations WHERE area='Lavington'),'60-min Full Body Massage','Relaxing Swedish massage with aromatherapy oils.','seed:spa',5000,3000,now()-interval '2 days',now()+interval '10 days',40,'qr','Booking required 24h in advance.','Call to book and show your QR on arrival.','{massage,spa,relax,weekend}','approved',true,355,NULL),
((SELECT id FROM businesses WHERE name='Mitumba Mode'),(SELECT id FROM categories WHERE slug='fashion'),(SELECT id FROM locations WHERE area='CBD'),'25% Off All Sneakers','Selected brand sneakers at a quarter off.','seed:sneakers',8000,6000,now()-interval '1 day',now()+interval '14 days',NULL,'online','Online orders only while stocks last.','Click through and enter your code at checkout.','{shoes,sneakers,streetwear}','approved',false,140,'https://example.com'),
((SELECT id FROM businesses WHERE name='Karen Gardens Hotel'),(SELECT id FROM categories WHERE slug='hotels'),(SELECT id FROM locations WHERE area='Karen'),'Weekend Staycation for Two','One night bed & breakfast for two, with pool access.','seed:hotel',18000,12600,now()-interval '4 days',now()+interval '21 days',25,'booking','Fri–Sun stays. Subject to availability.','Book via phone quoting your code.','{hotel,weekend,staycation,date night}','approved',true,520,NULL),
((SELECT id FROM businesses WHERE name='TechHub Electronics'),(SELECT id FROM categories WHERE slug='electronics'),(SELECT id FROM locations WHERE area='Westlands'),'Wireless Earbuds Deal','Noise-cancelling earbuds with 1-year warranty.','seed:earbuds',6500,4550,now(),now()+interval '7 days',100,'coupon','While stocks last.','Present your coupon in store.','{earbuds,audio,gadgets}','approved',false,88,NULL),
((SELECT id FROM businesses WHERE name='CineMax Gigiri'),(SELECT id FROM categories WHERE slug='entertainment'),(SELECT id FROM locations WHERE area='Gigiri'),'Movie Night: 2 Tickets + Popcorn','Two recliner tickets with a large popcorn to share.','seed:cinema',2400,1600,now()-interval '1 day',now()+interval '3 days',200,'claim','Valid Tue–Thu screenings.','Claim, then show the code at the box office.','{movies,date night,weekend}','approved',false,301,NULL);
