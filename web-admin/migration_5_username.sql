ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS username TEXT, ADD COLUMN IF NOT EXISTS raw_password TEXT;
