-- Add new columns to enrollment table
ALTER TABLE "public"."enrollment" 
ADD COLUMN IF NOT EXISTS "payment_status" text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS "unlocked_lessons" integer[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "installment_mode" text DEFAULT 'full',
ADD COLUMN IF NOT EXISTS "installment1_amount" numeric(10,2),
ADD COLUMN IF NOT EXISTS "installment2_amount" numeric(10,2);

-- Add check constraint for payment_status
ALTER TABLE "public"."enrollment"
ADD CONSTRAINT "enrollment_payment_status_check" 
CHECK (payment_status IN ('pending', 'half_paid', 'full_paid'));

-- Add check constraint for installment_mode
ALTER TABLE "public"."enrollment"
ADD CONSTRAINT "enrollment_installment_mode_check" 
CHECK (installment_mode IN ('full', 'installment')); 