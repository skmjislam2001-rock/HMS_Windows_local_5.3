/*
# Hospital Management System — Core Schema

1. Purpose
   Rebuilds the HMS (MediCore) data model as a single-tenant Supabase schema.
   No sign-in screen is required by the app, so all tables use anon+authenticated
   public/shared RLS policies.

2. New Tables
   - hms_owner        : single hospital profile row (id='main')
   - hms_wards        : ward definitions with capacity + bed rate
   - hms_doctors      : doctor directory with specialization + fees
   - hms_staff        : staff directory with roles
   - hms_patients     : patient registry with status/ward/doctor links
   - hms_appointments : appointment scheduling
   - hms_bills        : billing records (items JSONB, totals, paid)
   - hms_transactions : income/expense ledger
   - hms_admissions   : IPD admissions (nested nursing_notes/consumables/visits/extra_charges JSONB)
   - hms_logs         : audit log of entity/action/summary

3. Security
   - RLS enabled on every table.
   - Single-tenant: TO anon, authenticated with USING(true) / WITH CHECK(true)
     because the data is intentionally shared (no per-user isolation).

4. Notes
   - All id columns default to gen_random_uuid().
   - created_at / updated_at default to now().
   - JSONB columns hold nested arrays for admissions.
*/

CREATE TABLE IF NOT EXISTS hms_owner (
  id text PRIMARY KEY DEFAULT 'main',
  hospital_name text NOT NULL DEFAULT 'My Hospital',
  owner_name text DEFAULT 'Owner',
  address text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  tagline text DEFAULT 'Compassionate Care, Every Day',
  logo_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hms_wards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text DEFAULT 'General',
  capacity int DEFAULT 0,
  occupied int DEFAULT 0,
  bed_rate numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hms_doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialization text DEFAULT 'General',
  fees numeric DEFAULT 0,
  phone text DEFAULT '',
  email text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hms_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text DEFAULT 'Staff',
  phone text DEFAULT '',
  email text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hms_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  gender text DEFAULT '',
  age int DEFAULT 0,
  address text DEFAULT '',
  status text DEFAULT 'active',
  ward_id uuid DEFAULT NULL,
  doctor_id uuid DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hms_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text NOT NULL,
  doctor_name text DEFAULT '',
  date text DEFAULT '',
  time text DEFAULT '',
  reason text DEFAULT '',
  status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hms_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid DEFAULT NULL,
  patient_name text NOT NULL,
  doctor_id uuid DEFAULT NULL,
  doctor_name text DEFAULT '',
  items jsonb DEFAULT '[]',
  subtotal numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  discount_type text DEFAULT 'flat',
  discount_value numeric DEFAULT 0,
  discount_reason text DEFAULT '',
  total numeric DEFAULT 0,
  paid numeric DEFAULT 0,
  status text DEFAULT 'unpaid',
  notes text DEFAULT '',
  admission_id uuid DEFAULT NULL,
  date text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hms_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'income',
  category text DEFAULT 'Other',
  amount numeric DEFAULT 0,
  date text DEFAULT '',
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hms_admissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid DEFAULT NULL,
  patient_name text NOT NULL,
  ward_id uuid DEFAULT NULL,
  ward_name text DEFAULT '',
  ward_type text DEFAULT '',
  bed_number int DEFAULT 1,
  doctor_id uuid DEFAULT NULL,
  doctor_name text DEFAULT '',
  per_day_rate numeric DEFAULT 0,
  per_visit_fee numeric DEFAULT 0,
  admission_date timestamptz DEFAULT now(),
  admission_notes text DEFAULT '',
  diagnosis text DEFAULT '',
  status text DEFAULT 'active',
  nursing_notes jsonb DEFAULT '[]',
  consumables jsonb DEFAULT '[]',
  visits jsonb DEFAULT '[]',
  extra_charges jsonb DEFAULT '[]',
  discharge_date timestamptz DEFAULT NULL,
  discharge_diagnosis text DEFAULT '',
  discharge_summary text DEFAULT '',
  discharge_bill_id uuid DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text DEFAULT '',
  action text DEFAULT '',
  entity_id text DEFAULT '',
  summary text DEFAULT '',
  actor text DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- Seed the owner profile if absent
INSERT INTO hms_owner (id, hospital_name, owner_name)
SELECT 'main', 'My Hospital', 'Owner'
WHERE NOT EXISTS (SELECT 1 FROM hms_owner WHERE id='main');

-- Enable RLS on every table
ALTER TABLE hms_owner ENABLE ROW LEVEL SECURITY;
ALTER TABLE hms_wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE hms_doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE hms_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE hms_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE hms_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hms_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE hms_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hms_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hms_logs ENABLE ROW LEVEL SECURITY;

-- Single-tenant: shared data, anon + authenticated CRUD
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['hms_owner','hms_wards','hms_doctors','hms_staff','hms_patients','hms_appointments','hms_bills','hms_transactions','hms_admissions','hms_logs'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', t||'_select', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO anon, authenticated USING (true);', t||'_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', t||'_insert', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO anon, authenticated WITH CHECK (true);', t||'_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', t||'_update', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);', t||'_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', t||'_delete', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO anon, authenticated USING (true);', t||'_delete', t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_patients_status ON hms_patients(status);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON hms_admissions(status);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON hms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bills_date ON hms_bills(date);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON hms_transactions(date);
