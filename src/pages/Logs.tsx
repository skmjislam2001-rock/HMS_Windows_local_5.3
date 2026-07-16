import { useMemo, useState } from 'react'
import { dbLogs, log } from '../lib/db'
import { ConfirmModal, EmptyState, ErrorBox, Loading, Modal, useUi } from '../components/ui'
import { IconTrash, IconLogs, IconLock, IconShield } from '../components/icons'

// Password that protects log data deletion (per project requirement).
const LOG_DELETE_PASSWORD = 'skmjislam8017'

export default function Logs() {
  const { toast } = useUi()
  const [items, setItems] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [delId, setDelId] = useState<string | null>(null)
  const [clearAll, setClearAll] = useState(false)

  // password gate state (used for both single delete and clear-all)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const data = await dbLogs.list()
      data.sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)))
      setItems(data.slice(0, 2000))
    } catch (e: any) {
      setError(e.message || 'Failed to load logs')
    } finally {
      setLoading(false)
    }
  }

  if (items === null && loading && !error) {
    load()
    return <Loading label="Loading activity logs…" />
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s || !items) return items || []
    return items.filter((l) => `${l.entity} ${l.action} ${l.summary} ${l.actor}`.toLowerCase().includes(s))
  }, [items, q])

  const actionBadge = (action: string) => {
    if (action === 'create') return <span className="badge badge-green">Create</span>
    if (action === 'update') return <span className="badge badge-blue">Update</span>
    if (action === 'delete') return <span className="badge badge-red">Delete</span>
    return <span className="badge badge-neutral">{action}</span>
  }

  // Verify the protection password before performing any destructive action.
  const verifyPassword = (): boolean => {
    if (pw !== LOG_DELETE_PASSWORD) {
      setPwError('Incorrect password. Log deletion is protected.')
      return false
    }
    return true
  }

  const doDeleteOne = async () => {
    if (!delId) return
    if (!verifyPassword()) return
    try {
      await dbLogs.remove(delId)
      setItems((prev) => (prev || []).filter((x) => x.id !== delId))
      toast('Log entry deleted', 'ok')
      setDelId(null)
      setPw(''); setPwError('')
    } catch (e: any) {
      toast(`Failed: ${e.message}`, 'err')
    }
  }

  const doClearAll = async () => {
    if (!verifyPassword()) return
    try {
      await dbLogs.clearAll()
      await log('logs', 'delete', '', 'Cleared all activity logs (authorized)')
      setItems([])
      toast('All logs cleared', 'ok')
      setClearAll(false)
      setPw(''); setPwError('')
      // reload to show the single audit entry we just wrote
      setTimeout(load, 300)
    } catch (e: any) {
      toast(`Failed: ${e.message}`, 'err')
    }
  }

  const closePwModal = () => {
    setDelId(null); setClearAll(false); setPw(''); setPwError('')
  }

  const pwModalOpen = !!delId || clearAll

  return (
    <div>
      <div className="flex-between mb-md flex-wrap">
        <div>
          <h1>Activity Logs</h1>
          <p className="muted text-sm">Audit trail of all create / update / delete actions.</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn" onClick={load}>Refresh</button>
          <button className="btn btn-danger" onClick={() => { setClearAll(true); setPw(''); setPwError('') }} disabled={!items || items.length === 0}>
            <IconTrash /> Clear All
          </button>
        </div>
      </div>

      <div className="callout amber mb-md">
        <div className="flex gap-sm">
          <IconShield style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Log deletion is password protected.</strong> Deleting individual entries or clearing all logs
            requires the protection password. This prevents accidental or unauthorized removal of audit history.
          </div>
        </div>
      </div>

      <div className="flex gap-sm mb-md">
        <input className="input" placeholder="Search logs…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
      </div>

      <div className="card">
        {loading ? <Loading /> : error ? <div className="card-pad"><ErrorBox message={error} /></div> : !filtered || filtered.length === 0 ? (
          <EmptyState icon={<IconLogs />} message={q ? 'No logs match your search.' : 'No activity logged yet.'} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Timestamp</th><th>Entity</th><th>Action</th><th>Summary</th><th>Actor</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id}>
                    <td className="text-sm mono">{String(l.created_at).slice(0, 19).replace('T', ' ')}</td>
                    <td><span className="badge badge-neutral">{l.entity}</span></td>
                    <td>{actionBadge(l.action)}</td>
                    <td className="text-sm">{l.summary || '—'}</td>
                    <td className="text-sm">{l.actor}</td>
                    <td><button className="btn btn-sm" onClick={() => { setDelId(l.id); setPw(''); setPwError('') }}><IconTrash /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Password gate modal — shown for both single delete and clear all */}
      <Modal
        open={pwModalOpen}
        onClose={closePwModal}
        title={clearAll ? 'Clear All Logs — Password Required' : 'Delete Log Entry — Password Required'}
        footer={
          <>
            <button className="btn" onClick={closePwModal}>Cancel</button>
            <button className="btn btn-danger" onClick={clearAll ? doClearAll : doDeleteOne}>
              <IconLock /> {clearAll ? 'Clear All Logs' : 'Delete Entry'}
            </button>
          </>
        }
      >
        <div className="callout red mb-md">
          <div className="flex gap-sm">
            <IconLock style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              {clearAll
                ? 'You are about to permanently delete ALL activity log entries. This cannot be undone.'
                : 'You are about to delete a single log entry. This cannot be undone.'}
            </div>
          </div>
        </div>
        <div className="field">
          <label>Enter protection password</label>
          <input
            className="input"
            type="password"
            value={pw}
            autoFocus
            placeholder="Password"
            onChange={(e) => { setPw(e.target.value); setPwError('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') (clearAll ? doClearAll : doDeleteOne)() }}
          />
          {pwError && <div className="error-box mt-md" style={{ marginTop: 10 }}>{pwError}</div>}
        </div>
      </Modal>
    </div>
  )
}
