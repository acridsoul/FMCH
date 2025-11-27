-- Migration 011: Add Department Field to Profiles
-- This migration adds a department field to the profiles table
-- to support department selection during signup for Department Heads and Crew Members

-- Add department column to profiles table
ALTER TABLE public.profiles
ADD COLUMN department TEXT;

-- Add check constraint for valid departments
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_department_check
CHECK (department IS NULL OR department IN (
  'camera',
  'sound',
  'lighting',
  'art',
  'production',
  'costume',
  'makeup',
  'post_production',
  'vfx',
  'stunts',
  'transport',
  'catering'
));

-- Add index for department queries
CREATE INDEX idx_profiles_department ON public.profiles(department);

-- Update the handle_new_user function to include department
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, department)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'crew'),
    NEW.raw_user_meta_data->>'department'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.department IS 'Department assignment for department heads and crew members';
