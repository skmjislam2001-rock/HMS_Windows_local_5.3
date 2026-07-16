import { useMemo, useState } from 'react'
import { dbAdmissions, dbWards, dbDoctors, dbPatients, log, uid, nowIso } from '../lib/db'
import type { Admission, Ward, Doctor, Patient } from '../lib/types'
import { useResource } from '../components/useResource'
import { ConfirmModal, EmptyState, ErrorBox, Loading, Modal, useUi } from '../components/ui'
import { IconPlus, IconTrash, IconAdmissions, IconBed } from '../components/icons'

const empty: Partial<Admission> = {
  patient_name: '', ward_name: '', ward_type: '', bed_number: 1, doctor_name: '',
  per_day_rate: 0, per_visit_fee: 0, diagnosis: '', admission_notes: '', status: 'active',
  nursing_notes: [], consumables: [], visits: [], extra_charges: [],
}

export default function Admissions() {
  const { items, loading, error, create, update, remove } = useResource(dbAdmissions, 'Admission', 'admissions')
  const { toast } = useUi()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<Admission>>(empty)
  const [wards, setWards] = useState<Ward[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [detail, setDetail] = useState<Admission | null>(null)
  const [delId, setDelId] = useState<string | null>(null)

  const active = useMemo(() => items.filter((a) => a.status === 'active').sort((a, b) => String(b.admission_date || '').localeCompare(String(a.admission_date || ''))), [items])
  const discharged = useMemo(() => items.filter((a) => a.status === 'discharged').sort((a, b) => String(b.discharge_date || '').localeCompare(String(a.discharge_date || ''))), [items])

  const loadOpts = async () => {
    setWards(await dbWards.list().catch(() => []))
    setDoctors(await dbDoctors.list().catch(() => []))
    setPatients(await dbPatients.list().catch(() => []))
  }

  const openNew = async () => {
    await loadOpts()
    setForm({ ...empty, admission_date: nowIso(), status: 'active' })
    setOpen(true)
  }

  const pickPatient = (id: string) => {
    const p = patients.find((x) => x.id === id)
    setForm((f) => ({ ...f, patient_id: id, patient_name: p?.name || f.patient_name, doctor_id: p?.doctor_id || f.doctor_id }))
  }
  const pickWard = (id: string) => {
    const w = wards.find((x) => x.id === id)
    setForm((f) => ({ ...f, ward_id: id, ward_name: w?.name || '', ward_type: w?.type || '', per_day_rate: w?.bed_rate ?? f.per_day_rate }))
  }
  const pickDoctor = (id: string) => {
    const d = doctors.find((x) => x.id === id)
    setForm((f) => ({ ...f, doctor_id: id, doctor_name: d?.name || '', per_visit_fee: d?.fees ?? f.per_visit_fee }))
  }

  const save = async () => {
    if (!form.patient_name?.trim()) return toast('Patient name required', 'err')
    if (!form.ward_id) return toast('Ward required', 'err')
    try {
      const row = { ...form, admission_date: form.admission_date || nowIso(), created_at: nowIso(), updated_at: nowIso() } as Admission
      const created = await create(row)
      await log('admissions', 'create', created.id, `${created.patient_name} → ${created.ward_name} bed ${created.bed_number}`)
      setOpen(false)
    } catch {}
  }

  const confirmDelete = async () => {
    if (!delId) return
    const a = items.find((x) => x.id === delId)
    await remove(delId)
    await log('admissions', 'delete', delId, a?.patient_name || '')
    setDelId(null)
  }

  // nested-note add helpers operating on the detail admission
  const addNote = async (kind: 'nursing_notes' | 'consumables' | 'visits' | 'extra_charges', entry: Record<string, unknown>) => {
    if (!detail) return
    const arr = [...(detail[kind] || []), { id: uid(), created_at: nowIso(), ...entry }]
    const updated = await update(detail.id, { [kind]: arr, updated_at: nowIso() } as any)
    if (updated) setDetail(updated as Admission)
  }
  const delNote = async (kind: 'nursing_notes' | 'consumables' | 'visits' | 'extra_charges', noteId: string) => {
    if (!detail) return
    const arr = (detail[kind] || []).filter((x: any) => x.id !== noteId)
    const updated = await update(detail.id, { [kind]: arr, updated_at: nowIso() } as any)
    if (updated) setDetail(updated as Admission)
  }

  const money = (n: number) => `Rs ${Number(n || 0).toFixed(0)}`

  return (
    <div>
      <div className="flex-between mb-md">
        <div><h1>Admissions</h1><p className="muted text-sm">IPD admissions with nursing notes, consumables and visits.</p></div>
        <button className="btn btn-primary" onClick={openNew}><IconPlus /> New Admission</button>
      </div>

      <div className="grid grid-2 mb-md">
        <div className="card card-pad"><div className="stat-label">Active</div><div className="stat-value" style={{ color: 'var(--primary)' }}>{active.length}</div></div>
        <div className="card card-pad"><div className="stat-label">Discharged</div><div className="stat-value">{discharged.length}</div></div>
      </div>

      <h2 className="mb-sm">Active Admissions</h2>
      <div className="card mb-md">
        {loading ? <Loading /> : error ? <div className="card-pad"><ErrorBox message={error} /></div> : active.length === 0 ? (
          <EmptyState icon={<IconAdmissions />} message="No active admissions." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Patient</th><th>Ward</th><th>Bed</th><th>Doctor</th><th>Admitted</th><th>Actions</th></tr></thead>
              <tbody>
                {active.map((a) => (
                  <tr key={a.id}>
                    <td className="fw-600">{a.patient_name}</td>
                    <td>{a.ward_name} <span className="badge badge-neutral">{a.ward_type}</span></td>
                    <td><span className="badge badge-blue"><IconBed /> {a.bed_number}</span></td>
                    <td>{a.doctor_name || '—'}</td>
                    <td className="text-sm">{a.admission_date?.slice(0, 10)}</td>
                    <td><div className="row-actions">
                      <button className="btn btn-sm" onClick={() => setDetail(a)}>Manage</button>
                      <button className="btn btn-sm" onClick={() => setDelId(a.id)}><IconTrash /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {discharged.length > 0 && (
        <>
          <h2 className="mb-sm">Discharged</h2>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Patient</th><th>Ward</th><th>Doctor</th><th>Discharged</th><th>Actions</th></tr></thead>
                <tbody>
                  {discharged.map((a) => (
                    <tr key={a.id}>
                      <td className="fw-600">{a.patient_name}</td>
                      <td>{a.ward_name}</td>
                      <td>{a.doctor_name || '—'}</td>
                      <td className="text-sm">{a.discharge_date?.slice(0, 10) || '—'}</td>
                      <td><div className="row-actions">
                        <button className="btn btn-sm" onClick={() => setDetail(a)}>View</button>
                        <button className="btn btn-sm" onClick={() => setDelId(a.id)}><IconTrash /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Admission" large
        footer={<><button className="btn" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Admit</button></>}>
        <div className="form-grid">
          <div className="field"><label>Patient</label>
            <select className="select" value={form.patient_id || ''} onChange={(e) => pickPatient(e.target.value)}>
              <option value="">— Select patient —</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Or name</label><input className="input" value={form.patient_name || ''} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} /></div>
          <div className="field"><label>Ward</label>
            <select className="select" value={form.ward_id || ''} onChange={(e) => pickWard(e.target.value)}>
              <option value="">— Select ward —</option>
              {wards.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.type})</option>)}
            </select>
          </div>
          <div className="field"><label>Doctor</label>
            <select className="select" value={form.doctor_id || ''} onChange={(e) => pickDoctor(e.target.value)}>
              <option value="">— Select doctor —</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Bed No.</label><input className="input" type="number" min={1} value={form.bed_number ?? 1} onChange={(e) => setForm({ ...form, bed_number: Number(e.target.value) })} /></div>
          <div className="field"><label>Daily Rate (Rs)</label><input className="input" type="number" min={0} value={form.per_day_rate ?? 0} onChange={(e) => setForm({ ...form, per_day_rate: Number(e.target.value) })} /></div>
          <div className="field full"><label>Diagnosis</label><input className="input" value={form.diagnosis || ''} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} /></div>
          <div className="field full"><label>Admission Notes</label><textarea className="textarea" value={form.admission_notes || ''} onChange={(e) => setForm({ ...form, admission_notes: e.target.value })} /></div>
        </div>
      </Modal>

      {/* Detail / manage modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `Admission · ${detail.patient_name}` : ''} large
        footer={<button className="btn" onClick={() => setDetail(null)}>Close</button>}>
        {detail && <AdmissionDetail a={detail} onAddNote={addNote} onDelNote={delNote} onUpdate={update} onToast={toast} />}
      </Modal>

      <ConfirmModal open={!!delId} onClose={() => setDelId(null)} onConfirm={confirmDelete} title="Delete Admission" message="Remove this admission record?" confirmLabel="Delete" danger />
    </div>
  )
}

function AdmissionDetail({
  a, onAddNote, onDelNote, onUpdate, onToast,
}: {
  a: Admission
  onAddNote: (kind: any, entry: Record<string, unknown>) => Promise<void>
  onDelNote: (kind: any, noteId: string) => Promise<void>
  onUpdate: (id: string, patch: Partial<Admission>) => Promise<Admission | null>
  onToast: (m: string, t?: 'ok' | 'err' | 'info') => void
}) {
  const money = (n: number) => `Rs ${Number(n || 0).toFixed(0)}`
  const [noteForm, setNoteForm] = useState({ temp: '', bp: '', pulse: '', spo2: '', meds_given: '', notes: '', nurse_name: '' })
  const [consForm, setConsForm] = useState({ name: '', qty: 1, price: 0, category: 'drug' })
  const [visitForm, setVisitForm] = useState({ notes: '', fee: a.per_visit_fee || 0 })
  const [extraForm, setExtraForm] = useState({ desc: '', qty: 1, price: 0 })
  const [discharge, setDischarge] = useState({ discharge_diagnosis: '', discharge_summary: '', paid: 0, discount_value: 0, discount_type: 'flat' })

  const dischargePreview = useMemo(() => {
    const days = Math.max(1, Math.ceil(((a.discharge_date ? new Date(a.discharge_date).getTime() : Date.now()) - new Date(a.admission_date).getTime()) / 86400000))
    let items: { desc: string; qty: number; price: number }[] = []
    if (a.per_day_rate > 0) items.push({ desc: `Ward charges × ${days} day(s)`, qty: days, price: a.per_day_rate })
    items = [...items, ...(a.consumables || []).map((c) => ({ desc: c.name, qty: c.qty, price: c.price }))]
    const visitTotal = (a.visits || []).reduce((s, v) => s + Number(v.fee || 0), 0)
    if (visitTotal > 0) items.push({ desc: `Doctor visits × ${a.visits?.length || 0}`, qty: 1, price: visitTotal })
    items = [...items, ...(a.extra_charges || []).map((e) => ({ desc: e.desc, qty: e.qty, price: e.price }))]
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0)
    return { days, items, subtotal }
  }, [a])

  const doDischarge = async () => {
    const disc = discharge.discount_type === 'percent' ? Math.min(100, discharge.discount_value) / 100 * dischargePreview.subtotal : discharge.discount_value
    const total = Math.max(0, dischargePreview.subtotal - disc)
    try {
      await onUpdate(a.id, {
        status: 'discharged', discharge_date: nowIso(),
        discharge_diagnosis: discharge.discharge_diagnosis, discharge_summary: discharge.discharge_summary,
        updated_at: nowIso(),
      } as any)
      onToast('Patient discharged', 'ok')
      await log('admissions', 'update', a.id, `Discharged ${a.patient_name}`)
    } catch (e: any) {
      onToast(`Failed: ${e.message}`, 'err')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-sm mb-md">
        <span className="badge badge-blue">{a.ward_name}</span>
        <span className="badge badge-neutral">Bed {a.bed_number}</span>
        <span className="badge badge-blue">Dr. {a.doctor_name || '—'}</span>
        <span className="badge badge-amber">{a.per_day_rate}/day</span>
        {a.status === 'active' ? <span className="badge badge-red">Active</span> : <span className="badge badge-green">Discharged</span>}
      </div>
      {a.diagnosis && <p className="text-sm mb-md"><b>Diagnosis:</b> {a.diagnosis}</p>}
      {a.admission_notes && <p className="text-sm muted mb-md">{a.admission_notes}</p>}

      <div className="divider" />

      {/* Nursing notes */}
      <h3 className="mb-sm">Nursing Notes</h3>
      <div className="table-wrap mb-md">
        <table>
          <thead><tr><th>Time</th><th>Temp</th><th>BP</th><th>Pulse</th><th>SpO2</th><th>Meds</th><th>Notes</th><th></th></tr></thead>
          <tbody>
            {(a.nursing_notes || []).map((n) => (
              <tr key={n.id}>
                <td className="text-sm">{n.dt?.slice(0, 16).replace('T', ' ')}</td>
                <td>{n.temp || '—'}</td><td>{n.bp || '—'}</td><td>{n.pulse || '—'}</td><td>{n.spo2 || '—'}</td>
                <td className="text-sm">{n.meds_given || '—'}</td><td className="text-sm">{n.notes || '—'}</td>
                <td>{a.status === 'active' && <button className="btn btn-sm" onClick={() => onDelNote('nursing_notes', n.id)}><IconTrash /></button>}</td>
              </tr>
            ))}
            {(a.nursing_notes || []).length === 0 && <tr><td colSpan={8} className="muted text-sm" style={{ textAlign: 'center', padding: 12 }}>No notes.</td></tr>}
          </tbody>
        </table>
      </div>
      {a.status === 'active' && (
        <div className="form-grid mb-md">
          <div className="field"><label>Temp</label><input className="input" value={noteForm.temp} onChange={(e) => setNoteForm({ ...noteForm, temp: e.target.value })} placeholder="98.6°F" /></div>
          <div className="field"><label>BP</label><input className="input" value={noteForm.bp} onChange={(e) => setNoteForm({ ...noteForm, bp: e.target.value })} placeholder="120/80" /></div>
          <div className="field"><label>Pulse</label><input className="input" value={noteForm.pulse} onChange={(e) => setNoteForm({ ...noteForm, pulse: e.target.value })} /></div>
          <div className="field"><label>SpO2</label><input className="input" value={noteForm.spo2} onChange={(e) => setNoteForm({ ...noteForm, spo2: e.target.value })} placeholder="98%" /></div>
          <div className="field"><label>Meds Given</label><input className="input" value={noteForm.meds_given} onChange={(e) => setNoteForm({ ...noteForm, meds_given: e.target.value })} /></div>
          <div className="field"><label>Nurse</label><input className="input" value={noteForm.nurse_name} onChange={(e) => setNoteForm({ ...noteForm, nurse_name: e.target.value })} /></div>
          <div className="field full"><label>Notes</label><input className="input" value={noteForm.notes} onChange={(e) => setNoteForm({ ...noteForm, notes: e.target.value })} /></div>
          <div className="full"><button className="btn btn-sm btn-primary" onClick={() => { onAddNote('nursing_notes', { ...noteForm, dt: nowIso() }); setNoteForm({ temp: '', bp: '', pulse: '', spo2: '', meds_given: '', notes: '', nurse_name: '' }) }}>Add Note</button></div>
        </div>
      )}

      <div className="divider" />
      {/* Consumables */}
      <h3 className="mb-sm">Consumables</h3>
      <div className="table-wrap mb-md">
        <table>
          <thead><tr><th>Name</th><th>Category</th><th>Qty</th><th>Price</th><th>Total</th><th></th></tr></thead>
          <tbody>
            {(a.consumables || []).map((c) => (
              <tr key={c.id}><td>{c.name}</td><td><span className="badge badge-neutral">{c.category}</span></td><td>{c.qty}</td><td>{money(c.price)}</td><td>{money(c.qty * c.price)}</td>
                <td>{a.status === 'active' && <button className="btn btn-sm" onClick={() => onDelNote('consumables', c.id)}><IconTrash /></button>}</td></tr>
            ))}
            {(a.consumables || []).length === 0 && <tr><td colSpan={6} className="muted text-sm" style={{ textAlign: 'center', padding: 12 }}>None.</td></tr>}
          </tbody>
        </table>
      </div>
      {a.status === 'active' && (
        <div className="flex gap-sm mb-md flex-wrap">
          <input className="input" placeholder="Item name" value={consForm.name} onChange={(e) => setConsForm({ ...consForm, name: e.target.value })} />
          <select className="select" value={consForm.category} onChange={(e) => setConsForm({ ...consForm, category: e.target.value })}><option>drug</option><option>supply</option><option>lab</option><option>other</option></select>
          <input className="input" type="number" min={1} placeholder="Qty" value={consForm.qty} onChange={(e) => setConsForm({ ...consForm, qty: Number(e.target.value) })} style={{ width: 90 }} />
          <input className="input" type="number" min={0} placeholder="Price" value={consForm.price} onChange={(e) => setConsForm({ ...consForm, price: Number(e.target.value) })} style={{ width: 110 }} />
          <button className="btn btn-sm btn-primary" onClick={() => { onAddNote('consumables', { ...consForm, dt: nowIso() }); setConsForm({ name: '', qty: 1, price: 0, category: 'drug' }) }}>Add</button>
        </div>
      )}

      <div className="divider" />
      {/* Visits */}
      <h3 className="mb-sm">Doctor Visits</h3>
      <div className="table-wrap mb-md">
        <table>
          <thead><tr><th>Date</th><th>Doctor</th><th>Fee</th><th>Notes</th><th></th></tr></thead>
          <tbody>
            {(a.visits || []).map((v) => (
              <tr key={v.id}><td className="text-sm">{v.dt?.slice(0, 16).replace('T', ' ')}</td><td>{v.doctor_name}</td><td>{money(v.fee)}</td><td className="text-sm">{v.notes}</td>
                <td>{a.status === 'active' && <button className="btn btn-sm" onClick={() => onDelNote('visits', v.id)}><IconTrash /></button>}</td></tr>
            ))}
            {(a.visits || []).length === 0 && <tr><td colSpan={5} className="muted text-sm" style={{ textAlign: 'center', padding: 12 }}>None.</td></tr>}
          </tbody>
        </table>
      </div>
      {a.status === 'active' && (
        <div className="flex gap-sm mb-md flex-wrap">
          <input className="input" placeholder="Visit notes" value={visitForm.notes} onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })} />
          <input className="input" type="number" min={0} placeholder="Fee" value={visitForm.fee} onChange={(e) => setVisitForm({ ...visitForm, fee: Number(e.target.value) })} style={{ width: 110 }} />
          <button className="btn btn-sm btn-primary" onClick={() => { onAddNote('visits', { doctor_id: a.doctor_id, doctor_name: a.doctor_name, fee: visitForm.fee, notes: visitForm.notes, dt: nowIso() }); setVisitForm({ notes: '', fee: a.per_visit_fee || 0 }) }}>Add Visit</button>
        </div>
      )}

      <div className="divider" />
      {/* Extra charges */}
      <h3 className="mb-sm">Extra Charges</h3>
      <div className="table-wrap mb-md">
        <table>
          <thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Total</th><th></th></tr></thead>
          <tbody>
            {(a.extra_charges || []).map((e) => (
              <tr key={e.id}><td>{e.desc}</td><td>{e.qty}</td><td>{money(e.price)}</td><td>{money(e.qty * e.price)}</td>
                <td>{a.status === 'active' && <button className="btn btn-sm" onClick={() => onDelNote('extra_charges', e.id)}><IconTrash /></button>}</td></tr>
            ))}
            {(a.extra_charges || []).length === 0 && <tr><td colSpan={5} className="muted text-sm" style={{ textAlign: 'center', padding: 12 }}>None.</td></tr>}
          </tbody>
        </table>
      </div>
      {a.status === 'active' && (
        <div className="flex gap-sm mb-md flex-wrap">
          <input className="input" placeholder="Description" value={extraForm.desc} onChange={(e) => setExtraForm({ ...extraForm, desc: e.target.value })} />
          <input className="input" type="number" min={1} placeholder="Qty" value={extraForm.qty} onChange={(e) => setExtraForm({ ...extraForm, qty: Number(e.target.value) })} style={{ width: 90 }} />
          <input className="input" type="number" min={0} placeholder="Price" value={extraForm.price} onChange={(e) => setExtraForm({ ...extraForm, price: Number(e.target.value) })} style={{ width: 110 }} />
          <button className="btn btn-sm btn-primary" onClick={() => { onAddNote('extra_charges', { ...extraForm }); setExtraForm({ desc: '', qty: 1, price: 0 }) }}>Add</button>
        </div>
      )}

      {a.status === 'active' && (
        <>
          <div className="divider" />
          <h3 className="mb-sm">Discharge</h3>
          <div className="callout mb-md">
            Estimated bill: <b>{money(dischargePreview.subtotal)}</b> ({dischargePreview.days} day(s) · {dischargePreview.items.length} line items)
          </div>
          <div className="form-grid mb-md">
            <div className="field"><label>Discharge Diagnosis</label><input className="input" value={discharge.discharge_diagnosis} onChange={(e) => setDischarge({ ...discharge, discharge_diagnosis: e.target.value })} /></div>
            <div className="field"><label>Discount Type</label><select className="select" value={discharge.discount_type} onChange={(e) => setDischarge({ ...discharge, discount_type: e.target.value })}><option value="flat">Flat (Rs)</option><option value="percent">Percent (%)</option></select></div>
            <div className="field"><label>Discount Value</label><input className="input" type="number" min={0} value={discharge.discount_value} onChange={(e) => setDischarge({ ...discharge, discount_value: Number(e.target.value) })} /></div>
            <div className="field"><label>Paid (Rs)</label><input className="input" type="number" min={0} value={discharge.paid} onChange={(e) => setDischarge({ ...discharge, paid: Number(e.target.value) })} /></div>
            <div className="field full"><label>Discharge Summary</label><textarea className="textarea" value={discharge.discharge_summary} onChange={(e) => setDischarge({ ...discharge, discharge_summary: e.target.value })} /></div>
          </div>
          <button className="btn btn-danger" onClick={doDischarge}>Discharge Patient</button>
        </>
      )}
    </div>
  )
}
