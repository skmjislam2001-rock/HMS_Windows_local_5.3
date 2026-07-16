import { useMemo, useState } from 'react'
import { dbBills, log, uid, nowIso } from '../lib/db'
import type { Bill, BillItem } from '../lib/types'
import { useResource } from '../components/useResource'
import { ConfirmModal, EmptyState, ErrorBox, Loading, Modal, useUi } from '../components/ui'
import { IconPlus, IconEdit, IconTrash, IconBills, IconDownload } from '../components/icons'
import { triggerDownload } from '../lib/backup'

const emptyBill: Partial<Bill> = {
  patient_name: '', doctor_name: '', date: new Date().toISOString().slice(0, 10),
  items: [], subtotal: 0, discount: 0, discount_type: 'flat', discount_value: 0,
  discount_reason: '', total: 0, paid: 0, status: 'unpaid', notes: '',
}

export default function Bills() {
  const { items, loading, error, create, update, remove } = useResource(dbBills, 'Bill', 'bills')
  const { toast } = useUi()
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Bill | null>(null)
  const [form, setForm] = useState<Partial<Bill>>(emptyBill)
  const [delId, setDelId] = useState<string | null>(null)
  const [view, setView] = useState<Bill | null>(null)

  const openNew = () => { setEdit(null); setForm({ ...emptyBill, items: [], date: new Date().toISOString().slice(0, 10) }); setOpen(true) }
  const openEdit = (b: Bill) => { setEdit(b); setForm({ ...b, items: b.items ? [...b.items] : [] }); setOpen(true) }

  const recompute = (items: BillItem[], discountType: string, discountValue: number, paid: number) => {
    const subtotal = items.reduce((a, i) => a + Number(i.qty || 0) * Number(i.price || 0), 0)
    const discount = discountType === 'percent' ? Math.max(0, Math.min(100, discountValue)) / 100 * subtotal : Math.max(0, discountValue)
    const total = Math.max(0, subtotal - discount)
    const status = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid'
    return { subtotal, discount, total, status }
  }

  const setItem = (idx: number, patch: Partial<BillItem>) => {
    const items = [...(form.items || [])]
    items[idx] = { ...items[idx], ...patch }
    const r = recompute(items, form.discount_type || 'flat', Number(form.discount_value) || 0, Number(form.paid) || 0)
    setForm({ ...form, items, ...r })
  }
  const addItem = () => {
    const items = [...(form.items || []), { desc: '', qty: 1, price: 0 }]
    setForm({ ...form, items })
  }
  const removeItem = (idx: number) => {
    const items = (form.items || []).filter((_, i) => i !== idx)
    const r = recompute(items, form.discount_type || 'flat', Number(form.discount_value) || 0, Number(form.paid) || 0)
    setForm({ ...form, items, ...r })
  }

  const save = async () => {
    if (!form.patient_name?.trim()) return toast('Patient name required', 'err')
    const r = recompute(form.items || [], form.discount_type || 'flat', Number(form.discount_value) || 0, Number(form.paid) || 0)
    const payload = { ...form, ...r }
    try {
      if (edit) { await update(edit.id, payload); await log('bills', 'update', edit.id, `Bill for ${form.patient_name} · Rs ${r.total}`) }
      else { const b = await create({ id: uid(), ...payload, created_at: nowIso() } as any); await log('bills', 'create', b.id, `Bill for ${b.patient_name} · Rs ${r.total}`) }
      setOpen(false)
    } catch {}
  }

  const confirmDelete = async () => {
    if (!delId) return
    const b = items.find((x) => x.id === delId)
    await remove(delId)
    await log('bills', 'delete', delId, b?.patient_name || '')
    setDelId(null)
  }

  const printInvoice = (b: Bill) => {
    const rows = (b.items || []).map((i) => `<tr><td>${i.desc}</td><td>${i.qty}</td><td>Rs ${Number(i.price).toFixed(0)}</td><td>Rs ${(Number(i.qty) * Number(i.price)).toFixed(0)}</td></tr>`).join('')
    const html = `<!doctype html><html><head><title>Invoice ${b.id.slice(0,8)}</title><style>body{font-family:Inter,sans-serif;padding:40px;color:#0f172a}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:left}th{background:#f8fafc;text-transform:uppercase;font-size:.75rem;color:#64748b}.tot{margin-top:16px;text-align:right;font-size:1.1rem}</style></head><body>
      <h1>Invoice</h1><p><b>Patient:</b> ${b.patient_name}<br><b>Date:</b> ${b.date}<br><b>Doctor:</b> ${b.doctor_name || '—'}</p>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="tot"><p>Subtotal: Rs ${Number(b.subtotal).toFixed(0)}</p><p>Discount: −Rs ${Number(b.discount).toFixed(0)}</p><p><b>Total: Rs ${Number(b.total).toFixed(0)}</b></p><p>Paid: Rs ${Number(b.paid).toFixed(0)}</p></div>
      <p style="margin-top:24px;color:#64748b;font-size:.85rem">Bill ID: ${b.id}</p>
      </body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); w.print() }
  }

  const money = (n: number) => `Rs ${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  const sorted = [...items].sort((a, b) => String(b.date || b.created_at || '').localeCompare(String(a.date || a.created_at || '')))
  const statusBadge = (s: string) =>
    s === 'paid' ? <span className="badge badge-green">Paid</span> :
    s === 'partial' ? <span className="badge badge-amber">Partial</span> :
    <span className="badge badge-red">Unpaid</span>

  return (
    <div>
      <div className="flex-between mb-md">
        <div><h1>Bills</h1><p className="muted text-sm">Create and track patient invoices.</p></div>
        <button className="btn btn-primary" onClick={openNew}><IconPlus /> New Bill</button>
      </div>
      <div className="card">
        {loading ? <Loading /> : error ? <div className="card-pad"><ErrorBox message={error} /></div> : sorted.length === 0 ? (
          <EmptyState icon={<IconBills />} message="No bills yet." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Patient</th><th>Total</th><th>Paid</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {sorted.map((b) => (
                  <tr key={b.id}>
                    <td>{b.date || '—'}</td>
                    <td className="fw-600">{b.patient_name}</td>
                    <td>{money(Number(b.total) || 0)}</td>
                    <td>{money(Number(b.paid) || 0)}</td>
                    <td>{statusBadge(b.status)}</td>
                    <td><div className="row-actions">
                      <button className="btn btn-sm" onClick={() => setView(b)} title="View">👁</button>
                      <button className="btn btn-sm" onClick={() => openEdit(b)}><IconEdit /></button>
                      <button className="btn btn-sm" onClick={() => printInvoice(b)} title="Print"><IconDownload /></button>
                      <button className="btn btn-sm" onClick={() => setDelId(b.id)}><IconTrash /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? 'Edit Bill' : 'New Bill'} large
        footer={<><button className="btn" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        <div className="form-grid mb-md">
          <div className="field"><label>Patient Name</label><input className="input" value={form.patient_name || ''} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} /></div>
          <div className="field"><label>Doctor</label><input className="input" value={form.doctor_name || ''} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} /></div>
          <div className="field"><label>Date</label><input className="input" type="date" value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="field"><label>Paid (Rs)</label><input className="input" type="number" min={0} value={form.paid ?? 0} onChange={(e) => { const paid = Number(e.target.value); const r = recompute(form.items || [], form.discount_type || 'flat', Number(form.discount_value) || 0, paid); setForm({ ...form, paid, ...r }) }} /></div>
        </div>

        <div className="section-title">Line Items</div>
        <div className="table-wrap mb-md">
          <table>
            <thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {(form.items || []).map((it, idx) => (
                <tr key={idx}>
                  <td><input className="input" value={it.desc} onChange={(e) => setItem(idx, { desc: e.target.value })} /></td>
                  <td style={{ width: 70 }}><input className="input" type="number" min={1} value={it.qty} onChange={(e) => setItem(idx, { qty: Number(e.target.value) })} /></td>
                  <td style={{ width: 100 }}><input className="input" type="number" min={0} value={it.price} onChange={(e) => setItem(idx, { price: Number(e.target.value) })} /></td>
                  <td>{money(Number(it.qty) * Number(it.price))}</td>
                  <td><button className="btn btn-sm" onClick={() => removeItem(idx)}><IconTrash /></button></td>
                </tr>
              ))}
              {(!form.items || form.items.length === 0) && <tr><td colSpan={5} className="muted text-sm" style={{ textAlign: 'center', padding: 16 }}>No items yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <button className="btn btn-sm" onClick={addItem}><IconPlus /> Add Item</button>

        <div className="divider" />
        <div className="form-grid">
          <div className="field"><label>Discount Type</label><select className="select" value={form.discount_type || 'flat'} onChange={(e) => { const dt = e.target.value; const r = recompute(form.items || [], dt, Number(form.discount_value) || 0, Number(form.paid) || 0); setForm({ ...form, discount_type: dt, ...r }) }}><option value="flat">Flat (Rs)</option><option value="percent">Percent (%)</option></select></div>
          <div className="field"><label>Discount Value</label><input className="input" type="number" min={0} value={form.discount_value ?? 0} onChange={(e) => { const dv = Number(e.target.value); const r = recompute(form.items || [], form.discount_type || 'flat', dv, Number(form.paid) || 0); setForm({ ...form, discount_value: dv, ...r }) }} /></div>
        </div>
        <div className="flex-between mt-md" style={{ fontSize: '1rem' }}>
          <span className="muted">Subtotal: {money(Number(form.subtotal) || 0)}</span>
          <span className="muted">Discount: −{money(Number(form.discount) || 0)}</span>
          <span className="fw-600">Total: {money(Number(form.total) || 0)}</span>
        </div>
      </Modal>

      <Modal open={!!view} onClose={() => setView(null)} title="Bill Details" large
        footer={<><button className="btn" onClick={() => setView(null)}>Close</button><button className="btn btn-primary" onClick={() => view && printInvoice(view)}>Print</button></>}>
        {view && (
          <div>
            <div className="flex-between mb-md">
              <div><div className="fw-600">{view.patient_name}</div><div className="text-sm muted">{view.date} · Dr. {view.doctor_name || '—'}</div></div>
              {statusBadge(view.status)}
            </div>
            <div className="table-wrap mb-md">
              <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead>
                <tbody>{(view.items || []).map((i, idx) => <tr key={idx}><td>{i.desc}</td><td>{i.qty}</td><td>{money(Number(i.price))}</td><td>{money(Number(i.qty) * Number(i.price))}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="flex-between"><span>Subtotal</span><span>{money(Number(view.subtotal))}</span></div>
            <div className="flex-between"><span>Discount</span><span>−{money(Number(view.discount))}</span></div>
            <div className="flex-between fw-600 mt-md" style={{ fontSize: '1.1rem' }}><span>Total</span><span>{money(Number(view.total))}</span></div>
            <div className="flex-between mt-md"><span>Paid</span><span>{money(Number(view.paid))}</span></div>
            {view.notes && <p className="text-sm muted mt-md">{view.notes}</p>}
          </div>
        )}
      </Modal>

      <ConfirmModal open={!!delId} onClose={() => setDelId(null)} onConfirm={confirmDelete} title="Delete Bill" message="Remove this bill?" confirmLabel="Delete" danger />
    </div>
  )
}
