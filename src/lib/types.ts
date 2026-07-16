export type TableName =
  | 'hms_owner'
  | 'hms_wards'
  | 'hms_doctors'
  | 'hms_staff'
  | 'hms_patients'
  | 'hms_appointments'
  | 'hms_bills'
  | 'hms_transactions'
  | 'hms_admissions'
  | 'hms_logs'

export interface Owner {
  id: string
  hospital_name: string
  owner_name: string
  address: string
  phone: string
  email: string
  tagline: string
  logo_url: string
  created_at: string
  updated_at: string
}

export interface Ward {
  id: string
  name: string
  type: string
  capacity: number
  occupied: number
  bed_rate: number
  created_at: string
  updated_at: string
}

export interface Doctor {
  id: string
  name: string
  specialization: string
  fees: number
  phone: string
  email: string
  created_at: string
  updated_at: string
}

export interface Staff {
  id: string
  name: string
  role: string
  phone: string
  email: string
  created_at: string
  updated_at: string
}

export interface Patient {
  id: string
  name: string
  phone: string
  email: string
  gender: string
  age: number
  address: string
  status: string
  ward_id: string | null
  doctor_id: string | null
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  patient_name: string
  doctor_name: string
  date: string
  time: string
  reason: string
  status: string
  created_at: string
  updated_at: string
}

export interface BillItem {
  desc: string
  qty: number
  price: number
  source?: string
}

export interface Bill {
  id: string
  patient_id: string | null
  patient_name: string
  doctor_id: string | null
  doctor_name: string
  items: BillItem[]
  subtotal: number
  discount: number
  discount_type: string
  discount_value: number
  discount_reason: string
  total: number
  paid: number
  status: string
  notes: string
  admission_id: string | null
  date: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  type: string
  category: string
  amount: number
  date: string
  description: string
  created_at: string
  updated_at: string
}

export interface NursingNote {
  id: string
  dt: string
  temp: string
  bp: string
  pulse: string
  spo2: string
  meds_given: string
  notes: string
  nurse_name: string
  created_at: string
}

export interface Consumable {
  id: string
  name: string
  qty: number
  price: number
  category: string
  dt: string
  added_by: string
  created_at: string
}

export interface Visit {
  id: string
  dt: string
  doctor_id: string
  doctor_name: string
  fee: number
  notes: string
  created_at: string
}

export interface ExtraCharge {
  id: string
  desc: string
  qty: number
  price: number
  created_at: string
}

export interface Admission {
  id: string
  patient_id: string | null
  patient_name: string
  ward_id: string | null
  ward_name: string
  ward_type: string
  bed_number: number
  doctor_id: string | null
  doctor_name: string
  per_day_rate: number
  per_visit_fee: number
  admission_date: string
  admission_notes: string
  diagnosis: string
  status: string
  nursing_notes: NursingNote[]
  consumables: Consumable[]
  visits: Visit[]
  extra_charges: ExtraCharge[]
  discharge_date: string | null
  discharge_diagnosis: string
  discharge_summary: string
  discharge_bill_id: string | null
  created_at: string
  updated_at: string
}

export interface LogEntry {
  id: string
  entity: string
  action: string
  entity_id: string
  summary: string
  actor: string
  created_at: string
}

export interface DashboardStats {
  wards: number
  wardCapacity: number
  wardOccupied: number
  doctors: number
  staff: number
  patients: number
  admittedPatients: number
  bills: number
  outstanding: number
  paidCollected: number
  income: number
  expense: number
  net: number
}
