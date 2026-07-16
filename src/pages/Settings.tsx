import { useEffect, useState } from 'react'
import { dbOwner, log } from '../lib/db'
import { supabase } from '../lib/supabase'
import type { Owner } from '../lib/types'
import {
  ALL_TABLES, exportAllTables, exportManifest, exportTableCsv,
  labelFor, type BackupFile,
} from '../lib/backup'
import { Loading, ErrorBox, Modal, useUi } from '../components/ui'
import {
  IconBackup, IconDownload, IconDrive, IconFile, IconRefresh,
  IconShield, IconCheck, IconHospital,
} from '../components/icons'

const money = (n: number) => `Rs ${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

export default function Settings() {
  const { toast } = useUi()
  const [owner, setOwner] = useState<Owner | null>(null)
  const [form, setForm] = useState<Partial<Owner>>({})
  const [loadingOwner, setLoadingOwner] = useState(true)
  const [savingOwner, setSavingOwner] = useState(false)

  // backup state
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<BackupFile[] | null>(null)
  const [showResults, setShowResults] = useState(false)
  // table row counts for the per-table backup cards
  const [counts, setCounts] = useState<Record<string, number>>({})

  // google drive (informational — rclone runs on the original desktop app)
  const [gdriveChecked, setGdriveChecked] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const o = await dbOwner.get()
        if (!active) return
        setOwner(o)
        setForm(o || {})
      } catch { /* ignore */ } finally {
        if (active) setLoadingOwner(false)
      }
    })()
    return () => { active = false }
  }, [])

  const refreshCounts = async () => {
    try {
      const next: Record<string, number> = {}
      await Promise.all(ALL_TABLES.map(async (t) => {
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true })
        if (!error) next[t] = count ?? 0
      }))
      setCounts(next)
    } catch { /* ignore */ }
  }

  useEffect(() => { refreshCounts() }, [])

  const saveOwner = async () => {
    setSavingOwner(true)
    try {
      await dbOwner.upsert(form)
      await log('hospital', 'update', 'main', `Updated hospital profile: ${form.hospital_name}`)
      toast('Hospital profile saved', 'ok')
    } catch (e: any) {
      toast(`Failed: ${e.message}`, 'err')
    } finally {
      setSavingOwner(false)
    }
  }

  const doBackupAll = async () => {
    setBusy(true)
    try {
      const files = await exportAllTables()
      setResults(files)
      setShowResults(true)
      await log('backup', 'create', 'all', `Full structured backup · ${files.length} CSV files · ${files.reduce((a, f) => a + f.rows, 0)} rows`)
      toast(`Backed up ${files.length} files`, 'ok')
      refreshCounts()
    } catch (e: any) {
      toast(`Backup failed: ${e.message}`, 'err')
    } finally {
      setBusy(false)
    }
  }

  const doBackupOne = async (table: (typeof ALL_TABLES)[number]) => {
    setBusy(true)
    try {
      const file = await exportTableCsv(table)
      await log('backup', 'create', table, `Backup ${labelFor(table)} · ${file.rows} rows · ${file.filename}`)
      toast(`Exported ${file.filename}`, 'ok')
    } catch (e: any) {
      toast(`Export failed: ${e.message}`, 'err')
    } finally {
      setBusy(false)
    }
  }

  const doManifest = async () => {
    setBusy(true)
    try {
      const m = await exportManifest()
      await log('backup', 'create', 'manifest', `Backup manifest · ${m.filename}`)
      toast(`Manifest downloaded`, 'ok')
    } catch (e: any) {
      toast(`Failed: ${e.message}`, 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="mb-md">Settings</h1>

      {/* ---- Hospital Profile ---- */}
      <div className="card mb-md">
        <div className="card-header">
          <h2><span className="flex gap-sm"><IconHospital /> Hospital Profile</span></h2>
        </div>
        <div className="card-pad">
          {loadingOwner ? <Loading label="Loading profile…" /> : (
            <div className="form-grid">
              <div className="field"><label>Hospital Name</label><input className="input" value={form.hospital_name || ''} onChange={(e) => setForm({ ...form, hospital_name: e.target.value })} /></div>
              <div className="field"><label>Owner Name</label><input className="input" value={form.owner_name || ''} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
              <div className="field"><label>Phone</label><input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="field"><label>Email</label><input className="input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="field"><label>Tagline</label><input className="input" value={form.tagline || ''} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></div>
              <div className="field"><label>Logo URL</label><input className="input" value={form.logo_url || ''} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></div>
              <div className="field full"><label>Address</label><textarea className="textarea" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            </div>
          )}
          <div className="flex mt-md">
            <button className="btn btn-primary" onClick={saveOwner} disabled={savingOwner}>
              {savingOwner ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>

      {/* ---- Local Backups (FIX #1) ---- */}
      <div className="card mb-md">
        <div className="card-header">
          <h2><span className="flex gap-sm"><IconBackup /> Local Backups</span></h2>
          <span className="badge badge-green"><IconCheck /> Structured CSV</span>
        </div>
        <div className="card-pad">
          <div className="callout mb-md">
            <strong>Organized, row &amp; column backups.</strong> Each data type is exported as its own CSV file
            with a clear header row, one record per row, and purpose-specific filenames like
            <span className="mono"> hms_patients_2026-07-16_14-30-00.csv</span>. No more messy single-file dumps.
          </div>

          <div className="flex flex-wrap gap-sm mb-md">
            <button className="btn btn-primary" onClick={doBackupAll} disabled={busy}>
              <IconDownload /> {busy ? 'Backing up…' : 'Backup All (CSV per table)'}
            </button>
            <button className="btn" onClick={doManifest} disabled={busy}>
              <IconFile /> Download Manifest
            </button>
            <button className="btn" onClick={refreshCounts} disabled={busy}>
              <IconRefresh /> Refresh counts
            </button>
          </div>

          <div className="section-title">Export individual data files</div>
          <div className="backup-grid">
            {ALL_TABLES.map((table) => (
              <button key={table} className="backup-tile" onClick={() => doBackupOne(table)} disabled={busy}>
                <div className="tile-icon"><IconFile /></div>
                <div className="tile-title">{labelFor(table)}</div>
                <div className="tile-desc">
                  {table} · {counts[table] ?? '…'} row(s)<br />
                  <span className="mono">hms_{labelFor(table)}_&lt;timestamp&gt;.csv</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Google Drive Sync ---- */}
      <div className="card mb-md">
        <div className="card-header">
          <h2><span className="flex gap-sm"><IconDrive /> Google Drive Sync</span></h2>
        </div>
        <div className="card-pad">
          <div className="callout amber mb-md">
            Google Drive sync uses <strong>rclone</strong> on the desktop build. In this web version the generated
            CSV backups are downloaded to your device — you can then drag them into your Google Drive folder to sync.
          </div>
          <div className="flex flex-wrap gap-sm">
            <button className="btn" onClick={doBackupAll} disabled={busy}>
              <IconDownload /> Generate backup files for Drive
            </button>
            <button className="btn" onClick={() => { setGdriveChecked(true); toast('To enable auto-sync, set up rclone with your Google Drive account on your machine.', 'info') }}>
              <IconDrive /> Sync status
            </button>
          </div>
          {gdriveChecked && (
            <p className="text-sm muted mt-md">
              Manual sync: download the CSV files above, then upload them to your
              <strong> Google Drive → MediCoreHMS-Backups</strong> folder.
            </p>
          )}
        </div>
      </div>

      {/* ---- Security ---- */}
      <div className="card mb-md">
        <div className="card-header">
          <h2><span className="flex gap-sm"><IconShield /> Security</span></h2>
        </div>
        <div className="card-pad">
          <div className="flex gap-sm">
            <IconShield style={{ color: 'var(--primary)' }} />
            <div>
              <div className="fw-600">Log deletion protection</div>
              <p className="text-sm muted">Activity log deletion is protected by a password. Only someone with the
              password can delete individual log entries or clear the entire log history.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Backup results modal ---- */}
      <Modal
        open={showResults}
        onClose={() => setShowResults(false)}
        title="Backup Complete — File Manifest"
        large
        footer={<button className="btn btn-primary" onClick={() => setShowResults(false)}>Done</button>}
      >
        {results && (
          <div>
            <div className="callout mb-md">
              <strong>{results.length} CSV files</strong> were generated and downloaded. Each file has a clean header
              row and one record per line, with a purpose-specific filename.
            </div>
            <div className="backup-file-list">
              {results.map((f) => (
                <div className="backup-file" key={f.filename}>
                  <div className="file-icon"><IconFile /></div>
                  <div className="file-info">
                    <div className="file-name mono">{f.filename}</div>
                    <div className="file-meta">{f.rows} row(s) · {(f.size / 1024).toFixed(1)} KB · {f.label}</div>
                  </div>
                  <span className="badge badge-green"><IconCheck /> saved</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
