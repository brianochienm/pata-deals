-- Restrict platform_settings SELECT to admins only (previously any signed-in user could read it).
DROP POLICY IF EXISTS "settings read" ON public.platform_settings;
CREATE POLICY "settings admin read" ON public.platform_settings
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.platform_settings TO authenticated;
