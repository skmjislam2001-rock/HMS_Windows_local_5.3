import { useMemo, useState } from 'react'
import { dbTransactions, log } from '../lib/db'
import type { Transaction } from '../lib/types'
import { useResource } from '../components/useResource'
import { ConfirmModal, EmptyState, ErrorBox, Loading, Modal, useUi } from '../components/ui'
import { IconPlus, IconEdit, IconTrash, IconTransactions, IconSearch } from '../components/icons'

const empty: Partial<Transaction> = { type: 'income', category: 'Other', amount: 0, date: new Date().toISOString().slice(0, 10), description: '' }

export default function Transactions() {
  const { items, loading, error, create, update, remove } = useResource(dbTransactions, 'Transaction', 'transactions')
  const { toast } = useUi()
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Transaction | null>(null)
  const [form, setForm] = useState<Partial<Transaction>>(empty)
  const [delId, setDelId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')

  const openNew = () => { setEdit(null); setForm({ ...empty, date: new Date().toISOString().slice(0, 10) }); setOpen(true) }
  const openEdit = (t: Transaction) => { setEdit(t); setForm(t); setOpen(true) }

  const filtered = useMemo(() => {
    const list = filter === 'all' ? items : items.filter((t) => t.type === filter)
    return [...list].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
  }, [items, filter])

  const totals = useMemo(() => {
    const income = items.filter((t) => t.type === 'income').reduce((a, t) => a + Number(t.amount || 0), 0)
    const expense = items.filter((t) => t.type === 'expense').reduce((a, t) => a + Number(t.amount || 0), 0)
    return { income, expense, net: income - expense }
  }, [items])

  const money = (n: number) => `Rs ${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

  const save = async () => {
    if (form.type !== 'income' && form.type !== 'expense') return toast('Type required', 'err')
    try {
      if (edit) { await update(edit.id, form); await log('transactions', 'update', edit.id, `${form.type} ${money(Number(form.amount) || 0)}`) }
      else { const t = await create(form); await log('transactions', 'create', t.id, `${t.type} ${money(Number(t.amount) || 0)}`) }
      setOpen(false)
    } catch {}
  }

  const confirmDelete = async () => {
    if (!delId) return
    await remove(delId)
    await log('transactions', 'delete', delId, '')
    setDelId(null)
  }

  return (
    <div>
      <div className="flex-between mb-md flex-wrap">
        <div><h1>Transactions</h1><p className="muted text-sm">Income & expense ledger.</p></div>
        <button className="btn btn-primary" onClick={openNew}><IconPlus /> Add Transaction</button>
      </div>

      <div className="grid grid-3 mb-md">
        <div className="card card-pad"><div className="stat-label">Total Income</div><div className="stat-value" style={{ color: 'var(--success)' }}>{money(totals.income)}</div></div>
        <div className="card card-pad"><div className="stat-label">Total Expense</div><div className="stat-value" style={{ color: 'var(--error)' }}>{money(totals.expense)}</div></div>
        <div className="card card-pad"><div className="stat-label">Net</div><div className="stat-value" style={{ color: totals.net >= 0 ? 'var(--success)' : 'var(--error)' }}>{money(totals.net)}</div></div>
      </div>

      <div className="flex gap-sm mb-md">
        <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : ''}`} onClick={() => setFilter('all')}>All</button>
        <button className={`btn btn-sm ${filter === 'income' ? 'btn-primary' : ''}`} onClick={() => setFilter('income')}>Income</button>
        <button className={`btn btn-sm ${filter === 'expense' ? 'btn-primary' : ''}`} onClick={() => setFilter('expense')}>Expense</button>
      </div>

      <div className="card">
        {loading ? <Loading /> : error ? <div className="card-pad"><ErrorBox message={error} /></div> : filtered.length === 0 ? (
          <EmptyState icon={<IconTransactions />} message="No transactions yet." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Description</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td>{t.date || '—'}</td>
                    <td>{t.type === 'income' ? <span className="badge badge-green">Income</span> : <span className="badge badge-red">Expense</span>}</td>
                    <td><span className="badge badge-neutral">{t.category}</span></td>
                    <td className="fw-600">{t.type === 'income' ? '+' : '−'} {money(Number(t.amount) || 0)}</td>
                    <td className="text-sm">{t.description || '—'}</td>
                    <td><div className="row-actions">
                      <button className="btn btn-sm" onClick={() => openEdit(t)}><IconEdit /></button>
                      <button className="btn btn-sm" onClick={() => setDelId(t.id)}><IconTrash /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? 'Edit Transaction' : 'Add Transaction'}
        footer={<><button className="btn" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        <div className="form-grid">
          <div className="field"><label>Type</label><select className="select" value={form.type || 'income'} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="income">Income</option><option value="expense">Expense</option></select></div>
          <div className="field"><label>Category</label><input className="input" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Consultation, Salary, Rent" /></div>
          <div className="field"><label>Amount (Rs)</label><input className="input" type="number" min={0} step="0.01" value={form.amount ?? 0} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
          <div className="field"><label>Date</label><input className="input" type="date" value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="field full"><label>Description</label><input className="input" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
      </Modal>

      <ConfirmModal open={!!delId} onClose={() => setDelId(null)} onConfirm={confirmDelete} title="Delete Transaction" message="Remove this transaction?" confirmLabel="Delete" danger />
    </div>
  )
}
