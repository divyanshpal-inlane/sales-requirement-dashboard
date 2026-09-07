-- Learner consent and e-signature captured as the final onboarding step.
ALTER TABLE "public"."Learner"
  ADD COLUMN IF NOT EXISTS "signature_storage_path" text,
  ADD COLUMN IF NOT EXISTS "signature_submitted_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "signature_consent_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "signature_terms_version" text,
  ADD COLUMN IF NOT EXISTS "signature_privacy_version" text,
  ADD COLUMN IF NOT EXISTS "signature_purpose" text,
  ADD COLUMN IF NOT EXISTS "signature_method" text,
  ADD COLUMN IF NOT EXISTS "signature_mime_type" text;

-- Signatures contain personal data, so objects are not publicly addressable.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'learner-signatures',
  'learner-signatures',
  false,
  5242880,
  ARRAY['image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Authenticated users upload learner signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users update learner signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users delete learner signatures" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins view learner signatures" ON storage.objects;

CREATE POLICY "Authenticated users upload learner signatures" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'learner-signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users update learner signatures" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'learner-signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'learner-signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users delete learner signatures" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'learner-signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owners and admins view learner signatures" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'learner-signatures'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR COALESCE(
        auth.jwt() -> 'user_metadata' ->> 'user_role',
        auth.jwt() -> 'app_metadata' ->> 'user_role'
      ) IN ('admin', 'super_admin', 'user')
    )
  );
