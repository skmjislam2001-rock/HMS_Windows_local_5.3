import { useMemo, useState } from 'react'
import { dbPatients, dbWards, dbDoctors, log } from '../lib/db'
import type { Patient, Ward, Doctor } from '../lib/types'
import { useResource } from '../components/useResource'
import { ConfirmModal, EmptyState, ErrorBox, Loading, Modal, useUi } from '../components/ui'
import { IconPlus, IconEdit, IconTrash, IconPatients, IconSearch } from '../components/icons'

const empty: Partial<Patient> = { name: '', gender: '', age: 0, phone: '', email: '', address: '', status: 'active', ward_id: null, doctor_id: null }

export default function Patients() {
  const { items, loading, error, create, update, remove } = useResource(dbPatients, 'Patient', 'patients')
  const { toast } = useUi()
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Patient | null>(null)
  const [form, setForm] = useState<Partial<Patient>>(empty)
  const [delId, setDelId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [wards, setWards] = useState<Ward[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])

  const loadOpts = async () => {
    if (wards.length === 0) setWards(await dbWards.list().catch(() => []))
    if (doctors.length === 0) setDoctors(await dbDoctors.list().catch(() => []))
  }

  const openNew = () => { setEdit(null); setForm(empty); loadOpts(); setOpen(true) }
  const openEdit = (p: Patient) => { setEdit(p); setForm(p); loadOpts(); setOpen(true) }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter((p) => `${p.name} ${p.phone} ${p.email} ${p.status}`.toLowerCase().includes(s))
  }, [items, q])

  const save = async () => {
    if (!form.name?.trim()) return toast('Patient name required', 'err')
    try {
      if (edit) { await update(edit.id, form); await log('patients', 'update', edit.id, form.name || '') }
      else { const p = await create(form); await log('patients', 'create', p.id, p.name) }
      setOpen(false)
    } catch {}
  }

  const confirmDelete = async () => {
    if (!delId) return
    const p = items.find((x) => x.id === delId)
    await remove(delId)
    await log('patients', 'delete', delId, p?.name || '')
    setDelId(null)
  }

  const statusBadge = (s: string) =>
    s === 'admitted' ? <span className="badge badge-red">Admitted</span> :
    s === 'discharged' ? <span className="badge badge-blue">Discharged</span> :
    <span className="badge badge-green">Active</span>

  return (
    <div>
      <div className="flex-between mb-md flex-wrap">
        <div><h1>Patients</h1><p className="muted text-sm">Patient registry with status tracking.</p></div>
        <div className="flex gap-sm">
          <div style={{ position: 'relative' }}>
            <IconSearch style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-muted)' }} />
            <input className="input" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 32 }} />
          </div>
          <button className="btn btn-primary" onClick={openNew}><IconPlus /> Add Patient</button>
        </div>
      </div>

      <div className="card">
        {loading ? <Loading /> : error ? <div className="card-pad"><ErrorBox message={error} /></div> : filtered.length === 0 ? (
          <EmptyState icon={<IconPatients />} message={q ? 'No patients match your search.' : 'No patients yet.'} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Age</th><th>Gender</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td className="fw-600">{p.name}</td>
                    <td>{p.age || '—'}</td>
                    <td>{p.gender || '—'}</td>
                    <td>{p.phone || '—'}</td>
                    <td>{statusBadge(p.status)}</td>
                    <td><div className="row-actions">
                      <button className="btn btn-sm" onClick={() => openEdit(p)}><IconEdit /></button>
                      <button className="btn btn-sm" onClick={() => setDelId(p.id)}><IconTrash /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? 'Edit Patient' : 'Add Patient'} large
        footer={<><button className="btn" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        <div className="form-grid">
          <div className="field"><label>Full Name</label><input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Age</label><input className="input" type="number" min={0} value={form.age ?? 0} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} /></div>
          <div className="field"><label>Gender</label><select className="select" value={form.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">—</option><option>Male</option><option>Female</option><option>Other</option></select></div>
          <div className="field"><label>Phone</label><input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="field"><label>Email</label><input className="input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="field"><label>Status</label><select className="select" value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="admitted">Admitted</option><option value="discharged">Discharged</option></select></div>
          <div className="field"><label>Ward</label><select className="select" value={form.ward_id || ''} onChange={(e) => setForm({ ...form, ward_id: e.target.value || null })}><option value="">—</option>{wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
          <div className="field"><label>Doctor</label><select className="select" value={form.doctor_id || ''} onChange={(e) => setForm({ ...form, doctor_id: e.target.value || null })}><option value="">—</option>{doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}</select></div>
          <div className="field full"><label>Address</label><textarea className="textarea" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        </div>
      </Modal>

      <ConfirmModal open={!!delId} onClose={() => setDelId(null)} onConfirm={confirmDelete} title="Delete Patient" message="Remove this patient record?" confirmLabel="Delete" danger />
    </div>
  )
}
