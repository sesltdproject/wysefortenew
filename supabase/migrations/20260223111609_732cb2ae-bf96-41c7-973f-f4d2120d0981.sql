ALTER TABLE public.website_settings ALTER COLUMN smtp_port SET DEFAULT 465;
UPDATE public.website_settings SET smtp_port = 465 WHERE smtp_port = 587;