import { useEffect, useState } from 'react'
import { getDashboardStats, dbOwner } from '../lib/db'
import type { DashboardStats, Owner } from '../lib/types'
import { Loading, ErrorBox } from '../components/ui'
import {
  IconWards, IconDoctors, IconStaff, IconPatients, IconBills,
  IconTransactions, IconBed, IconActivity,
} from '../components/icons'

function StatCard({
  label, value, sub, icon, color,
}: { label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="stat">
      <div className="stat-top">
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value}</div>
          {sub && <div className="stat-sub">{sub}</div>}
        </div>
        <div className={`stat-icon ${color}`}>{icon}</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [owner, setOwner] = useState<Owner | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [s, o] = await Promise.all([getDashboardStats(), dbOwner.get()])
        if (!active) return
        setStats(s)
        setOwner(o)
      } catch (e: any) {
        setError(e.message || 'Failed to load dashboard')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  if (!stats) return <ErrorBox message="No data" />

  const money = (n: number) => `Rs ${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  return (
    <div>
      {owner && (
        <div className="card card-pad mb-md" style={{ background: 'linear-gradient(135deg,#0d9488,#0f766e)', color: '#fff', border: 'none' }}>
          <div className="flex-between flex-wrap">
            <div>
              <h1 style={{ color: '#fff' }}>{owner.hospital_name}</h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>{owner.tagline}</p>
            </div>
            <div className="text-sm right" style={{ color: 'rgba(255,255,255,0.85)' }}>
              <div className="fw-600">{owner.owner_name}</div>
              <div>{owner.phone} {owner.email && `· ${owner.email}`}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-4 mb-md">
        <StatCard label="Wards" value={stats.wards} sub={`${stats.wardOccupied}/${stats.wardCapacity} beds occupied`} icon={<IconWards />} color="icon-teal" />
        <StatCard label="Doctors" value={stats.doctors} icon={<IconDoctors />} color="icon-blue" />
        <StatCard label="Staff" value={stats.staff} icon={<IconStaff />} color="icon-green" />
        <StatCard label="Patients" value={stats.patients} sub={`${stats.admittedPatients} admitted`} icon={<IconPatients />} color="icon-amber" />
      </div>

      <div className="grid grid-4 mb-md">
        <StatCard label="Bills" value={stats.bills} sub={`${money(stats.outstanding)} outstanding`} icon={<IconBills />} color="icon-red" />
        <StatCard label="Collected" value={money(stats.paidCollected)} icon={<IconCheck />} color="icon-green" />
        <StatCard label="Income" value={money(stats.income)} icon={<IconTransactions />} color="icon-green" />
        <StatCard label="Net" value={money(stats.net)} sub={`Expense ${money(stats.expense)}`} icon={<IconActivity />} color={stats.net >= 0 ? 'icon-green' : 'icon-red'} />
      </div>

      <div className="grid grid-2">
        <div className="card card-pad">
          <h3 className="mb-sm">Ward Occupancy</h3>
          {stats.wardCapacity > 0 ? (
            <>
              <div className="flex-between mb-sm">
                <span className="text-sm muted">Occupied beds</span>
                <span className="text-sm fw-600">{stats.wardOccupied} / {stats.wardCapacity}</span>
              </div>
              <div style={{ height: 10, background: 'var(--neutral-100)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (stats.wardOccupied / stats.wardCapacity) * 100)}%`,
                  background: 'linear-gradient(90deg,#0d9488,#14b8a6)',
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </>
          ) : (
            <p className="muted text-sm">No ward capacity configured yet.</p>
          )}
        </div>
        <div className="card card-pad">
          <h3 className="mb-sm">Quick Summary</h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li className="flex gap-sm"><IconBed className="icon-teal" /> <span className="text-sm">{stats.admittedPatients} patient(s) currently admitted</span></li>
            <li className="flex gap-sm"><IconBills className="icon-red" /> <span className="text-sm">{money(stats.outstanding)} in outstanding bills</span></li>
            <li className="flex gap-sm"><IconTransactions className="icon-green" /> <span className="text-sm">{money(stats.income)} total income</span></li>
            <li className="flex gap-sm"><IconActivity className="icon-blue" /> <span className="text-sm">{money(stats.net)} net position</span></li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
