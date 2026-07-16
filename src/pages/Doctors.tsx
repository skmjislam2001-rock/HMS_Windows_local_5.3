import { useState } from 'react'
import { dbDoctors, log } from '../lib/db'
import type { Doctor } from '../lib/types'
import { useResource } from '../components/useResource'
import { ConfirmModal, EmptyState, ErrorBox, Loading, Modal, useUi } from '../components/ui'
import { IconPlus, IconEdit, IconTrash, IconDoctors } from '../components/icons'

const empty: Partial<Doctor> = { name: '', specialization: 'General', fees: 0, phone: '', email: '' }

export default function Doctors() {
  const { items, loading, error, create, update, remove } = useResource(dbDoctors, 'Doctor', 'doctors')
  const { toast } = useUi()
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Doctor | null>(null)
  const [form, setForm] = useState<Partial<Doctor>>(empty)
  const [delId, setDelId] = useState<string | null>(null)

  const openNew = () => { setEdit(null); setForm(empty); setOpen(true) }
  const openEdit = (d: Doctor) => { setEdit(d); setForm(d); setOpen(true) }

  const save = async () => {
    if (!form.name?.trim()) return toast('Doctor name required', 'err')
    try {
      if (edit) { await update(edit.id, form); await log('doctors', 'update', edit.id, `Dr. ${form.name}`) }
      else { const d = await create(form); await log('doctors', 'create', d.id, `Dr. ${d.name}`) }
      setOpen(false)
    } catch {}
  }

  const confirmDelete = async () => {
    if (!delId) return
    const d = items.find((x) => x.id === delId)
    await remove(delId)
    await log('doctors', 'delete', delId, `Dr. ${d?.name || ''}`)
    setDelId(null)
  }

  return (
    <div>
      <div className="flex-between mb-md">
        <div><h1>Doctors</h1><p className="muted text-sm">Doctor directory with specialization and fees.</p></div>
        <button className="btn btn-primary" onClick={openNew}><IconPlus /> Add Doctor</button>
      </div>
      <div className="card">
        {loading ? <Loading /> : error ? <div className="card-pad"><ErrorBox message={error} /></div> : items.length === 0 ? (
          <EmptyState icon={<IconDoctors />} message="No doctors yet." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Specialization</th><th>Fee</th><th>Phone</th><th>Email</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id}>
                    <td className="fw-600">Dr. {d.name}</td>
                    <td><span className="badge badge-blue">{d.specialization}</span></td>
                    <td>Rs {Number(d.fees || 0).toFixed(0)}</td>
                    <td>{d.phone || '—'}</td>
                    <td className="text-sm">{d.email || '—'}</td>
                    <td><div className="row-actions">
                      <button className="btn btn-sm" onClick={() => openEdit(d)}><IconEdit /></button>
                      <button className="btn btn-sm" onClick={() => setDelId(d.id)}><IconTrash /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? 'Edit Doctor' : 'Add Doctor'}
        footer={<><button className="btn" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        <div className="form-grid">
          <div className="field"><label>Doctor Name</label><input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Specialization</label><input className="input" value={form.specialization || ''} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="e.g. Cardiologist" /></div>
          <div className="field"><label>Consultation Fee (Rs)</label><input className="input" type="number" min={0} value={form.fees ?? 0} onChange={(e) => setForm({ ...form, fees: Number(e.target.value) })} /></div>
          <div className="field"><label>Phone</label><input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="field full"><label>Email</label><input className="input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        </div>
      </Modal>

      <ConfirmModal open={!!delId} onClose={() => setDelId(null)} onConfirm={confirmDelete} title="Delete Doctor" message="Remove this doctor from the directory?" confirmLabel="Delete" danger />
    </div>
  )
}
