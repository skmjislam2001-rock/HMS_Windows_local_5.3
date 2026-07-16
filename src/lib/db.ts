import { supabase } from './supabase'
import type {
  Owner,
  Ward,
  Doctor,
  Staff,
  Patient,
  Appointment,
  Bill,
  Transaction,
  Admission,
  LogEntry,
  DashboardStats,
} from './types'

export const uid = () =>
  (crypto as any).randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })

export const nowIso = () => new Date().toISOString()

// ---- generic CRUD ----
async function list<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw error
  return (data ?? []) as T[]
}

async function getOne<T>(table: string, id: string): Promise<T | null> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as T) ?? null
}

async function insertOne<T>(table: string, row: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase
    .from(table)
    .insert(row)
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data as T
}

async function updateOne<T>(
  table: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<T | null> {
  const { data, error } = await supabase
    .from(table)
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()
  if (error) throw error
  return (data as T) ?? null
}

async function deleteOne(table: string, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

// ---- audit log ----
export async function log(
  entity: string,
  action: string,
  entityId = '',
  summary = '',
  actor = 'admin',
) {
  try {
    await insertOne<LogEntry>('hms_logs', {
      id: uid(),
      entity,
      action,
      entity_id: entityId,
      summary,
      actor,
      created_at: nowIso(),
    })
  } catch (e) {
    console.warn('log failed', e)
  }
}

// ---- Owner ----
export const dbOwner = {
  get: () => getOne<Owner>('hms_owner', 'main'),
  upsert: async (patch: Partial<Owner>) => {
    const existing = await getOne<Owner>('hms_owner', 'main')
    if (existing) {
      return updateOne<Owner>('hms_owner', 'main', { ...patch, updated_at: nowIso() })
    }
    return insertOne<Owner>('hms_owner', { id: 'main', ...patch } as Record<string, unknown>)
  },
}

// ---- Wards ----
export const dbWards = {
  list: () => list<Ward>('hms_wards'),
  get: (id: string) => getOne<Ward>('hms_wards', id),
  create: (row: Partial<Ward>) =>
    insertOne<Ward>('hms_wards', { id: uid(), ...row, created_at: nowIso(), updated_at: nowIso() }),
  update: (id: string, patch: Partial<Ward>) =>
    updateOne<Ward>('hms_wards', id, { ...patch, updated_at: nowIso() }),
  remove: (id: string) => deleteOne('hms_wards', id),
}

// ---- Doctors ----
export const dbDoctors = {
  list: () => list<Doctor>('hms_doctors'),
  get: (id: string) => getOne<Doctor>('hms_doctors', id),
  create: (row: Partial<Doctor>) =>
    insertOne<Doctor>('hms_doctors', { id: uid(), ...row, created_at: nowIso(), updated_at: nowIso() }),
  update: (id: string, patch: Partial<Doctor>) =>
    updateOne<Doctor>('hms_doctors', id, { ...patch, updated_at: nowIso() }),
  remove: (id: string) => deleteOne('hms_doctors', id),
}

// ---- Staff ----
export const dbStaff = {
  list: () => list<Staff>('hms_staff'),
  get: (id: string) => getOne<Staff>('hms_staff', id),
  create: (row: Partial<Staff>) =>
    insertOne<Staff>('hms_staff', { id: uid(), ...row, created_at: nowIso(), updated_at: nowIso() }),
  update: (id: string, patch: Partial<Staff>) =>
    updateOne<Staff>('hms_staff', id, { ...patch, updated_at: nowIso() }),
  remove: (id: string) => deleteOne('hms_staff', id),
}

// ---- Patients ----
export const dbPatients = {
  list: () => list<Patient>('hms_patients'),
  get: (id: string) => getOne<Patient>('hms_patients', id),
  create: (row: Partial<Patient>) =>
    insertOne<Patient>('hms_patients', { id: uid(), ...row, created_at: nowIso(), updated_at: nowIso() }),
  update: (id: string, patch: Partial<Patient>) =>
    updateOne<Patient>('hms_patients', id, { ...patch, updated_at: nowIso() }),
  remove: (id: string) => deleteOne('hms_patients', id),
}

// ---- Appointments ----
export const dbAppointments = {
  list: () => list<Appointment>('hms_appointments'),
  get: (id: string) => getOne<Appointment>('hms_appointments', id),
  create: (row: Partial<Appointment>) =>
    insertOne<Appointment>('hms_appointments', { id: uid(), ...row, created_at: nowIso(), updated_at: nowIso() }),
  update: (id: string, patch: Partial<Appointment>) =>
    updateOne<Appointment>('hms_appointments', id, { ...patch, updated_at: nowIso() }),
  remove: (id: string) => deleteOne('hms_appointments', id),
}

// ---- Bills ----
export const dbBills = {
  list: () => list<Bill>('hms_bills'),
  get: (id: string) => getOne<Bill>('hms_bills', id),
  create: (row: Partial<Bill>) =>
    insertOne<Bill>('hms_bills', { id: uid(), ...row, created_at: nowIso(), updated_at: nowIso() }),
  update: (id: string, patch: Partial<Bill>) =>
    updateOne<Bill>('hms_bills', id, { ...patch, updated_at: nowIso() }),
  remove: (id: string) => deleteOne('hms_bills', id),
}

// ---- Transactions ----
export const dbTransactions = {
  list: () => list<Transaction>('hms_transactions'),
  get: (id: string) => getOne<Transaction>('hms_transactions', id),
  create: (row: Partial<Transaction>) =>
    insertOne<Transaction>('hms_transactions', { id: uid(), ...row, created_at: nowIso(), updated_at: nowIso() }),
  update: (id: string, patch: Partial<Transaction>) =>
    updateOne<Transaction>('hms_transactions', id, { ...patch, updated_at: nowIso() }),
  remove: (id: string) => deleteOne('hms_transactions', id),
}

// ---- Admissions ----
export const dbAdmissions = {
  list: () => list<Admission>('hms_admissions'),
  get: (id: string) => getOne<Admission>('hms_admissions', id),
  create: (row: Partial<Admission>) =>
    insertOne<Admission>('hms_admissions', { id: uid(), ...row, created_at: nowIso(), updated_at: nowIso() }),
  update: (id: string, patch: Partial<Admission>) =>
    updateOne<Admission>('hms_admissions', id, { ...patch, updated_at: nowIso() }),
  remove: (id: string) => deleteOne('hms_admissions', id),
}

// ---- Logs ----
export const dbLogs = {
  list: () => list<LogEntry>('hms_logs'),
  remove: (id: string) => deleteOne('hms_logs', id),
  clearAll: async () => {
    const { error } = await supabase.from('hms_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw error
  },
}

// ---- Dashboard ----
export async function getDashboardStats(): Promise<DashboardStats> {
  const [wards, doctors, staff, patients, bills, txns] = await Promise.all([
    dbWards.list().catch(() => [] as Ward[]),
    dbDoctors.list().catch(() => [] as Doctor[]),
    dbStaff.list().catch(() => [] as Staff[]),
    dbPatients.list().catch(() => [] as Patient[]),
    dbBills.list().catch(() => [] as Bill[]),
    dbTransactions.list().catch(() => [] as Transaction[]),
  ])
  const wardCapacity = wards.reduce((a, w) => a + (w.capacity || 0), 0)
  const wardOccupied = wards.reduce((a, w) => a + (w.occupied || 0), 0)
  const admittedPatients = patients.filter((p) => p.status === 'admitted').length
  const incomeTx = txns.filter((t) => t.type === 'income').reduce((a, t) => a + Number(t.amount || 0), 0)
  const expense = txns.filter((t) => t.type === 'expense').reduce((a, t) => a + Number(t.amount || 0), 0)
  const paidCollected = bills.reduce((a, b) => a + Number(b.paid || 0), 0)
  const outstanding = bills.reduce((a, b) => a + Math.max(0, Number(b.total || 0) - Number(b.paid || 0)), 0)
  return {
    wards: wards.length,
    wardCapacity,
    wardOccupied,
    doctors: doctors.length,
    staff: staff.length,
    patients: patients.length,
    admittedPatients,
    bills: bills.length,
    outstanding,
    paidCollected,
    income: incomeTx + paidCollected,
    expense,
    net: incomeTx + paidCollected - expense,
  }
}
