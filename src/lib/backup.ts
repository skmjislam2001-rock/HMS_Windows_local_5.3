import { supabase } from './supabase'
import type { TableName } from './types'

// Maps a table to a human-friendly, purpose-specific CSV file name segment.
// Each table gets its own clearly-named file so backups are organized by purpose.
const FILE_LABELS: Record<TableName, string> = {
  hms_owner: 'hospital-profile',
  hms_wards: 'wards',
  hms_doctors: 'doctors',
  hms_staff: 'staff',
  hms_patients: 'patients',
  hms_appointments: 'appointments',
  hms_bills: 'bills',
  hms_transactions: 'transactions',
  hms_admissions: 'admissions',
  hms_logs: 'activity-logs',
}

// Ordered column definitions per table so the CSV has a clean, stable
// header row and predictable column order (proper row/column layout).
const COLUMNS: Record<TableName, { key: string; header: string }[]> = {
  hms_owner: [
    { key: 'id', header: 'ID' },
    { key: 'hospital_name', header: 'Hospital Name' },
    { key: 'owner_name', header: 'Owner Name' },
    { key: 'address', header: 'Address' },
    { key: 'phone', header: 'Phone' },
    { key: 'email', header: 'Email' },
    { key: 'tagline', header: 'Tagline' },
    { key: 'logo_url', header: 'Logo URL' },
    { key: 'updated_at', header: 'Updated At' },
  ],
  hms_wards: [
    { key: 'name', header: 'Ward Name' },
    { key: 'type', header: 'Type' },
    { key: 'capacity', header: 'Capacity' },
    { key: 'occupied', header: 'Occupied' },
    { key: 'bed_rate', header: 'Bed Rate (Rs)' },
    { key: 'updated_at', header: 'Updated At' },
  ],
  hms_doctors: [
    { key: 'name', header: 'Doctor Name' },
    { key: 'specialization', header: 'Specialization' },
    { key: 'fees', header: 'Consultation Fee (Rs)' },
    { key: 'phone', header: 'Phone' },
    { key: 'email', header: 'Email' },
    { key: 'updated_at', header: 'Updated At' },
  ],
  hms_staff: [
    { key: 'name', header: 'Staff Name' },
    { key: 'role', header: 'Role' },
    { key: 'phone', header: 'Phone' },
    { key: 'email', header: 'Email' },
    { key: 'updated_at', header: 'Updated At' },
  ],
  hms_patients: [
    { key: 'name', header: 'Patient Name' },
    { key: 'gender', header: 'Gender' },
    { key: 'age', header: 'Age' },
    { key: 'phone', header: 'Phone' },
    { key: 'email', header: 'Email' },
    { key: 'address', header: 'Address' },
    { key: 'status', header: 'Status' },
    { key: 'ward_id', header: 'Ward ID' },
    { key: 'doctor_id', header: 'Doctor ID' },
    { key: 'updated_at', header: 'Updated At' },
  ],
  hms_appointments: [
    { key: 'patient_name', header: 'Patient Name' },
    { key: 'doctor_name', header: 'Doctor Name' },
    { key: 'date', header: 'Date' },
    { key: 'time', header: 'Time' },
    { key: 'reason', header: 'Reason' },
    { key: 'status', header: 'Status' },
    { key: 'updated_at', header: 'Updated At' },
  ],
  hms_bills: [
    { key: 'patient_name', header: 'Patient Name' },
    { key: 'doctor_name', header: 'Doctor Name' },
    { key: 'date', header: 'Bill Date' },
    { key: 'subtotal', header: 'Subtotal (Rs)' },
    { key: 'discount', header: 'Discount (Rs)' },
    { key: 'total', header: 'Total (Rs)' },
    { key: 'paid', header: 'Paid (Rs)' },
    { key: 'status', header: 'Status' },
    { key: 'items', header: 'Line Items' },
    { key: 'notes', header: 'Notes' },
    { key: 'updated_at', header: 'Updated At' },
  ],
  hms_transactions: [
    { key: 'date', header: 'Date' },
    { key: 'type', header: 'Type' },
    { key: 'category', header: 'Category' },
    { key: 'amount', header: 'Amount (Rs)' },
    { key: 'description', header: 'Description' },
    { key: 'updated_at', header: 'Updated At' },
  ],
  hms_admissions: [
    { key: 'patient_name', header: 'Patient Name' },
    { key: 'ward_name', header: 'Ward' },
    { key: 'ward_type', header: 'Ward Type' },
    { key: 'bed_number', header: 'Bed No.' },
    { key: 'doctor_name', header: 'Doctor' },
    { key: 'admission_date', header: 'Admission Date' },
    { key: 'discharge_date', header: 'Discharge Date' },
    { key: 'per_day_rate', header: 'Daily Rate (Rs)' },
    { key: 'diagnosis', header: 'Diagnosis' },
    { key: 'status', header: 'Status' },
    { key: 'discharge_summary', header: 'Discharge Summary' },
    { key: 'updated_at', header: 'Updated At' },
  ],
  hms_logs: [
    { key: 'created_at', header: 'Timestamp' },
    { key: 'entity', header: 'Entity' },
    { key: 'action', header: 'Action' },
    { key: 'summary', header: 'Summary' },
    { key: 'actor', header: 'Actor' },
    { key: 'entity_id', header: 'Entity ID' },
  ],
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return ''
  let s = String(value)
  if (typeof value === 'object') s = JSON.stringify(value)
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"'
  return s
}

export interface BackupFile {
  filename: string
  label: string
  table: TableName
  rows: number
  size: number
}

// Builds a clean, properly-structured CSV (header row + one row per record,
// consistent column order) for a single table.
export function buildCsv(table: TableName, rows: Record<string, unknown>[]): string {
  const cols = COLUMNS[table]
  const header = cols.map((c) => escapeCsv(c.header)).join(',')
  const lines = rows.map((r) => cols.map((c) => escapeCsv(r[c.key])).join(','))
  return [header, ...lines].join('\r\n')
}

export function labelFor(table: TableName): string {
  return FILE_LABELS[table]
}

export const ALL_TABLES: TableName[] = [
  'hms_owner',
  'hms_wards',
  'hms_doctors',
  'hms_staff',
  'hms_patients',
  'hms_appointments',
  'hms_bills',
  'hms_transactions',
  'hms_admissions',
  'hms_logs',
]

// Generates a timestamp segment: YYYY-MM-DD_HH-MM-SS
export function timestampSeg(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`
}

// Fetches rows for a table from Supabase.
export async function fetchRows(table: TableName): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw error
  return (data ?? []) as Record<string, unknown>[]
}

// Builds a purpose-specific filename for a table backup.
// Format: hms_<purpose>_<timestamp>.csv
export function fileNameFor(table: TableName, stamp = timestampSeg()): string {
  return `hms_${labelFor(table)}_${stamp}.csv`
}

// Exports a single table as a CSV download (proper rows + columns).
export async function exportTableCsv(table: TableName): Promise<BackupFile> {
  const rows = await fetchRows(table)
  const csv = buildCsv(table, rows)
  const stamp = timestampSeg()
  const filename = fileNameFor(table, stamp)
  triggerDownload(filename, csv)
  return { filename, label: labelFor(table), table, rows: rows.length, size: csv.length }
}

// Exports every table as its own purpose-specific CSV file (row/column format).
// Returns metadata for every generated file so the UI can show a manifest.
export async function exportAllTables(): Promise<BackupFile[]> {
  const stamp = timestampSeg()
  const out: BackupFile[] = []
  for (const table of ALL_TABLES) {
    const rows = await fetchRows(table)
    const csv = buildCsv(table, rows)
    const filename = fileNameFor(table, stamp)
    triggerDownload(filename, csv)
    out.push({ filename, label: labelFor(table), table, rows: rows.length, size: csv.length })
  }
  return out
}

// Builds a single combined manifest CSV summarizing all tables (handy for
// quick overview without opening every file).
export async function exportManifest(): Promise<BackupFile> {
  const stamp = timestampSeg()
  const lines: string[] = ['Table,Purpose,Rows,FileName,SizeBytes']
  for (const table of ALL_TABLES) {
    const rows = await fetchRows(table)
    const filename = fileNameFor(table, stamp)
    const size = buildCsv(table, rows).length
    lines.push(`${table},${labelFor(table)},${rows.length},${filename},${size}`)
  }
  const csv = lines.join('\r\n')
  const filename = `hms_backup-manifest_${stamp}.csv`
  triggerDownload(filename, csv)
  return { filename, label: 'backup-manifest', table: 'hms_logs', rows: ALL_TABLES.length, size: csv.length }
}

export function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
