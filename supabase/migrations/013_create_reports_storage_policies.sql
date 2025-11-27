-- Film Production Command Hub - Reports Storage Bucket Policies
-- This migration creates RLS policies for the reports storage bucket

-- =====================================================
-- STORAGE POLICIES FOR REPORTS BUCKET
-- =====================================================
-- Note: The 'reports' bucket must be created in Supabase Storage dashboard first
-- These policies allow authenticated users to upload report attachments

-- Enable RLS on storage.objects if not already enabled
-- (This is usually enabled by default, but ensuring it's on)

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Crew can upload report attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view report attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own report attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own report attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete any report attachment" ON storage.objects;
DROP POLICY IF EXISTS "Dept heads can delete any report attachment" ON storage.objects;

-- Allow authenticated users to upload files to their own folder
-- File path format: {userId}/{timestamp}-{random}.{ext}
CREATE POLICY "Crew can upload report attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports' AND
  (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Allow authenticated users to view all files in reports bucket
-- (Admins, dept heads, and project managers need to view attachments)
CREATE POLICY "Authenticated users can view report attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'reports');

-- Allow users to update their own files
CREATE POLICY "Users can update own report attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reports' AND
  (string_to_array(name, '/'))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'reports' AND
  (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own report attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reports' AND
  (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Allow admins to delete any file in reports bucket
CREATE POLICY "Admins can delete any report attachment"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reports' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow department heads to delete any file in reports bucket
CREATE POLICY "Dept heads can delete any report attachment"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reports' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'department_head'
  )
);

