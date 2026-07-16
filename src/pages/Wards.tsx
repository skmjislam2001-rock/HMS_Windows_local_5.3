import { useState } from 'react'
import { dbWards, log } from '../lib/db'
import type { Ward } from '../lib/types'
import { useResource } from '../components/useResource'
import { ConfirmModal, EmptyState, ErrorBox, Loading, Modal, useUi } from '../components/ui'
import { IconPlus, IconEdit, IconTrash, IconWards } from '../components/icons'

const empty: Partial<Ward> = { name: '', type: 'General', capacity: 0, occupied: 0, bed_rate: 0 }

export default function Wards() {
  const { items, loading, error, create, update, remove } = useResource(dbWards, 'Ward', 'wards')
  const { toast } = useUi()
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Ward | null>(null)
  const [form, setForm] = useState<Partial<Ward>>(empty)
  const [delId, setDelId] = useState<string | null>(null)

  const openNew = () => { setEdit(null); setForm(empty); setOpen(true) }
  const openEdit = (w: Ward) => { setEdit(w); setForm(w); setOpen(true) }

  const save = async () => {
    if (!form.name?.trim()) return toast('Ward name required', 'err')
    try {
      if (edit) {
        await update(edit.id, form)
        await log('wards', 'update', edit.id, `Ward ${form.name}`)
      } else {
        const w = await create(form)
        await log('wards', 'create', w.id, `Ward ${w.name}`)
      }
      setOpen(false)
    } catch {}
  }

  const confirmDelete = async () => {
    if (!delId) return
    const w = items.find((x) => x.id === delId)
    await remove(delId)
    await log('wards', 'delete', delId, `Ward ${w?.name || ''}`)
    setDelId(null)
  }

  return (
    <div>
      <div className="flex-between mb-md">
        <div>
          <h1>Wards</h1>
          <p className="muted text-sm">Manage ward types, capacity and bed rates.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}><IconPlus /> Add Ward</button>
      </div>

      <div className="card">
        {loading ? <Loading /> : error ? <div className="card-pad"><ErrorBox message={error} /></div> : items.length === 0 ? (
          <EmptyState icon={<IconWards />} message="No wards yet. Add your first ward." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Type</th><th>Capacity</th><th>Occupied</th><th>Bed Rate</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {items.map((w) => (
                  <tr key={w.id}>
                    <td className="fw-600">{w.name}</td>
                    <td><span className="badge badge-blue">{w.type}</span></td>
                    <td>{w.capacity}</td>
                    <td>
                      {w.occupied >= w.capacity && w.capacity > 0 ? (
                        <span className="badge badge-red">{w.occupied}/{w.capacity} Full</span>
                      ) : w.occupied > 0 ? (
                        <span className="badge badge-amber">{w.occupied}/{w.capacity}</span>
                      ) : (
                        <span className="badge badge-green">0/{w.capacity}</span>
                      )}
                    </td>
                    <td>Rs {Number(w.bed_rate || 0).toFixed(0)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-sm" onClick={() => openEdit(w)}><IconEdit /></button>
                        <button className="btn btn-sm" onClick={() => setDelId(w.id)}><IconTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={edit ? 'Edit Ward' : 'Add Ward'}
        footer={<><button className="btn" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
      >
        <div className="form-grid">
          <div className="field"><label>Ward Name</label><input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. General Ward A" /></div>
          <div className="field"><label>Type</label>
            <select className="select" value={form.type || 'General'} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option>General</option><option>ICU</option><option>Emergency</option><option>Private</option><option>Pediatric</option><option>Maternity</option>
            </select>
          </div>
          <div className="field"><label>Capacity (beds)</label><input className="input" type="number" min={0} value={form.capacity ?? 0} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
          <div className="field"><label>Occupied</label><input className="input" type="number" min={0} value={form.occupied ?? 0} onChange={(e) => setForm({ ...form, occupied: Number(e.target.value) })} /></div>
          <div className="field full"><label>Bed Rate (Rs / day)</label><input className="input" type="number" min={0} value={form.bed_rate ?? 0} onChange={(e) => setForm({ ...form, bed_rate: Number(e.target.value) })} /></div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={confirmDelete}
        title="Delete Ward"
        message="This will permanently remove the ward. Admissions referencing it will keep their stored ward name."
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
