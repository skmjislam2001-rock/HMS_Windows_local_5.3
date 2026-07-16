import { useState } from 'react'
import { dbStaff, log } from '../lib/db'
import type { Staff } from '../lib/types'
import { useResource } from '../components/useResource'
import { ConfirmModal, EmptyState, ErrorBox, Loading, Modal, useUi } from '../components/ui'
import { IconPlus, IconEdit, IconTrash, IconStaff } from '../components/icons'

const empty: Partial<Staff> = { name: '', role: 'Nurse', phone: '', email: '' }

export default function StaffPage() {
  const { items, loading, error, create, update, remove } = useResource(dbStaff, 'Staff', 'staff')
  const { toast } = useUi()
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Staff | null>(null)
  const [form, setForm] = useState<Partial<Staff>>(empty)
  const [delId, setDelId] = useState<string | null>(null)

  const openNew = () => { setEdit(null); setForm(empty); setOpen(true) }
  const openEdit = (s: Staff) => { setEdit(s); setForm(s); setOpen(true) }

  const save = async () => {
    if (!form.name?.trim()) return toast('Staff name required', 'err')
    try {
      if (edit) { await update(edit.id, form); await log('staff', 'update', edit.id, `${form.name} (${form.role})`) }
      else { const s = await create(form); await log('staff', 'create', s.id, `${s.name} (${s.role})`) }
      setOpen(false)
    } catch {}
  }

  const confirmDelete = async () => {
    if (!delId) return
    const s = items.find((x) => x.id === delId)
    await remove(delId)
    await log('staff', 'delete', delId, s?.name || '')
    setDelId(null)
  }

  return (
    <div>
      <div className="flex-between mb-md">
        <div><h1>Staff</h1><p className="muted text-sm">Nurses, reception, support staff.</p></div>
        <button className="btn btn-primary" onClick={openNew}><IconPlus /> Add Staff</button>
      </div>
      <div className="card">
        {loading ? <Loading /> : error ? <div className="card-pad"><ErrorBox message={error} /></div> : items.length === 0 ? (
          <EmptyState icon={<IconStaff />} message="No staff yet." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Email</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id}>
                    <td className="fw-600">{s.name}</td>
                    <td><span className="badge badge-neutral">{s.role}</span></td>
                    <td>{s.phone || '—'}</td>
                    <td className="text-sm">{s.email || '—'}</td>
                    <td><div className="row-actions">
                      <button className="btn btn-sm" onClick={() => openEdit(s)}><IconEdit /></button>
                      <button className="btn btn-sm" onClick={() => setDelId(s.id)}><IconTrash /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? 'Edit Staff' : 'Add Staff'}
        footer={<><button className="btn" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        <div className="form-grid">
          <div className="field"><label>Name</label><input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Role</label>
            <select className="select" value={form.role || 'Nurse'} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option>Nurse</option><option>Receptionist</option><option>Cleaner</option><option>Security</option><option>Pharmacist</option><option>Lab Technician</option><option>Accountant</option><option>Other</option>
            </select>
          </div>
          <div className="field"><label>Phone</label><input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="field"><label>Email</label><input className="input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        </div>
      </Modal>

      <ConfirmModal open={!!delId} onClose={() => setDelId(null)} onConfirm={confirmDelete} title="Delete Staff" message="Remove this staff member?" confirmLabel="Delete" danger />
    </div>
  )
}
