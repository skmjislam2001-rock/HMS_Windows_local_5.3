import { useState } from 'react'
import { dbAppointments, log } from '../lib/db'
import type { Appointment } from '../lib/types'
import { useResource } from '../components/useResource'
import { ConfirmModal, EmptyState, ErrorBox, Loading, Modal, useUi } from '../components/ui'
import { IconPlus, IconEdit, IconTrash, IconCalendar } from '../components/icons'

const empty: Partial<Appointment> = { patient_name: '', doctor_name: '', date: '', time: '', reason: '', status: 'scheduled' }

export default function Appointments() {
  const { items, loading, error, create, update, remove } = useResource(dbAppointments, 'Appointment', 'appointments')
  const { toast } = useUi()
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Appointment | null>(null)
  const [form, setForm] = useState<Partial<Appointment>>(empty)
  const [delId, setDelId] = useState<string | null>(null)

  const openNew = () => { setEdit(null); setForm(empty); setOpen(true) }
  const openEdit = (a: Appointment) => { setEdit(a); setForm(a); setOpen(true) }

  const save = async () => {
    if (!form.patient_name?.trim()) return toast('Patient name required', 'err')
    try {
      if (edit) { await update(edit.id, form); await log('appointments', 'update', edit.id, `Appt: ${form.patient_name}`) }
      else { const a = await create(form); await log('appointments', 'create', a.id, `Appt: ${a.patient_name}`) }
      setOpen(false)
    } catch {}
  }

  const confirmDelete = async () => {
    if (!delId) return
    await remove(delId)
    await log('appointments', 'delete', delId, '')
    setDelId(null)
  }

  const sorted = [...items].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
  const statusBadge = (s: string) =>
    s === 'completed' ? <span className="badge badge-green">Completed</span> :
    s === 'cancelled' ? <span className="badge badge-red">Cancelled</span> :
    <span className="badge badge-amber">Scheduled</span>

  return (
    <div>
      <div className="flex-between mb-md">
        <div><h1>Appointments</h1><p className="muted text-sm">Schedule and track patient appointments.</p></div>
        <button className="btn btn-primary" onClick={openNew}><IconPlus /> New Appointment</button>
      </div>
      <div className="card">
        {loading ? <Loading /> : error ? <div className="card-pad"><ErrorBox message={error} /></div> : sorted.length === 0 ? (
          <EmptyState icon={<IconCalendar />} message="No appointments yet." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {sorted.map((a) => (
                  <tr key={a.id}>
                    <td className="fw-600">{a.patient_name}</td>
                    <td>{a.doctor_name || '—'}</td>
                    <td>{a.date || '—'}</td>
                    <td>{a.time || '—'}</td>
                    <td className="text-sm">{a.reason || '—'}</td>
                    <td>{statusBadge(a.status)}</td>
                    <td><div className="row-actions">
                      <button className="btn btn-sm" onClick={() => openEdit(a)}><IconEdit /></button>
                      <button className="btn btn-sm" onClick={() => setDelId(a.id)}><IconTrash /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? 'Edit Appointment' : 'New Appointment'}
        footer={<><button className="btn" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        <div className="form-grid">
          <div className="field"><label>Patient Name</label><input className="input" value={form.patient_name || ''} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} /></div>
          <div className="field"><label>Doctor Name</label><input className="input" value={form.doctor_name || ''} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} /></div>
          <div className="field"><label>Date</label><input className="input" type="date" value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="field"><label>Time</label><input className="input" type="time" value={form.time || ''} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
          <div className="field"><label>Status</label><select className="select" value={form.status || 'scheduled'} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
          <div className="field full"><label>Reason</label><input className="input" value={form.reason || ''} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
        </div>
      </Modal>

      <ConfirmModal open={!!delId} onClose={() => setDelId(null)} onConfirm={confirmDelete} title="Delete Appointment" message="Remove this appointment?" confirmLabel="Delete" danger />
    </div>
  )
}
