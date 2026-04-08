'use client'

import { useState, useEffect } from 'react'
import { format, getDaysInMonth, getDay } from 'date-fns'
import { Target, TrendingUp, CheckCircle, Edit2, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  MonthlyObjective, Availability, FrenchHoliday, Profile,
  MONTH_NAMES
} from '@/types'
import { getMonthWorkingDays, calculateMonthlyTarget, getCompletionColor, getCompletionBg, cn } from '@/lib/utils'

interface ObjectivesClientProps {
  profile: Profile
  initialObjectives: MonthlyObjective[]
  availabilities: Availability[]
  holidays: FrenchHoliday[]
  year: number
  isAdmin: boolean
}

export default function ObjectivesClient({
  profile, initialObjectives, availabilities, holidays, year, isAdmin
}: ObjectivesClientProps) {
  const [objectives, setObjectives] = useState<MonthlyObjective[]>(initialObjectives)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [syncing, setSyncing] = useState(false)
  const supabase = createClient()

  const holidayDates = holidays.map(h => h.date)
  const currentMonth = new Date().getMonth() + 1

  // Calculate and sync objectives for all months
  useEffect(() => {
    syncAllMonthObjectives()
  }, [availabilities, holidays])

  const syncAllMonthObjectives = async () => {
    setSyncing(true)
    for (let month = 1; month <= 12; month++) {
      const courseDays = availabilities
        .filter(a => a.type === 'cours' && a.date.startsWith(`${year}-${String(month).padStart(2, '0')}`))
        .map(a => a.date)

      const workingDays = getMonthWorkingDays(year, month, holidayDates, courseDays)
      const target = calculateMonthlyTarget(workingDays)

      const existing = objectives.find(o => o.month === month)

      if (!existing) {
        const { data } = await supabase
          .from('monthly_objectives')
          .upsert({
            editor_id: profile.id,
            year,
            month,
            target_concepts: target,
            working_days: workingDays,
            actual_concepts: 0,
          }, { onConflict: 'editor_id,year,month' })
          .select()
          .single()
        if (data) {
          setObjectives(prev => {
            const exists = prev.find(o => o.month === month)
            if (exists) return prev.map(o => o.month === month ? data : o)
            return [...prev, data]
          })
        }
      } else if (existing.target_concepts !== target || existing.working_days !== workingDays) {
        const { data } = await supabase
          .from('monthly_objectives')
          .update({ target_concepts: target, working_days: workingDays })
          .eq('id', existing.id)
          .select()
          .single()
        if (data) {
          setObjectives(prev => prev.map(o => o.id === existing.id ? data : o))
        }
      }
    }
    setSyncing(false)
  }

  const startEdit = (obj: MonthlyObjective) => {
    setEditingId(obj.id)
    setEditValue(String(obj.actual_concepts))
  }

  const saveEdit = async (obj: MonthlyObjective) => {
    const val = parseInt(editValue)
    if (isNaN(val) || val < 0) return

    const { data } = await supabase
      .from('monthly_objectives')
      .update({ actual_concepts: val })
      .eq('id', obj.id)
      .select()
      .single()

    if (data) {
      setObjectives(prev => prev.map(o => o.id === obj.id ? data : o))
    }
    setEditingId(null)
  }

  const totalTarget = objectives.reduce((s, o) => s + o.target_concepts, 0)
  const totalActual = objectives.reduce((s, o) => s + o.actual_concepts, 0)
  const globalRate = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0

  // Quarterly summaries
  const quarters = [1, 2, 3, 4].map(q => {
    const months = [(q - 1) * 3 + 1, (q - 1) * 3 + 2, q * 3]
    const qObjs = objectives.filter(o => months.includes(o.month))
    const target = qObjs.reduce((s, o) => s + o.target_concepts, 0)
    const actual = qObjs.reduce((s, o) => s + o.actual_concepts, 0)
    const rate = target > 0 ? Math.round((actual / target) * 100) : 0
    return { q, target, actual, rate }
  })

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
            Objectifs {year}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#a0a0a0' }}>
            5 concepts par jour travaillé · hors WE, fériés et cours
          </p>
        </div>
        {syncing && (
          <div className="flex items-center gap-2 text-xs" style={{ color: '#5a5a5a' }}>
            <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#e63329', borderTopColor: 'transparent' }} />
            Synchronisation...
          </div>
        )}
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<Target size={16} style={{ color: '#e63329' }} />}
          label="Objectif annuel"
          value={totalTarget}
          suffix="concepts"
        />
        <StatCard
          icon={<TrendingUp size={16} style={{ color: '#e63329' }} />}
          label="Réalisé"
          value={totalActual}
          suffix="concepts"
        />
        <StatCard
          icon={<CheckCircle size={16} style={{ color: '#e63329' }} />}
          label="Taux global"
          value={`${globalRate}%`}
          progressRate={globalRate}
        />
      </div>

      {/* Quarters */}
      <div className="grid grid-cols-4 gap-3">
        {quarters.map(({ q, target, actual, rate }) => (
          <div key={q} className="card p-4 rounded-xl">
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ fontFamily: 'Syne, sans-serif', color: '#5a5a5a' }}>
              Q{q}
            </p>
            <div className="flex items-end justify-between mb-2">
              <span className={cn('text-xl font-bold', getCompletionColor(rate))} style={{ fontFamily: 'Syne, sans-serif' }}>
                {rate}%
              </span>
              <span className="text-xs" style={{ color: '#5a5a5a' }}>{actual}/{target}</span>
            </div>
            <div className="progress-bar">
              <div
                className={cn('progress-fill', getCompletionBg(rate))}
                style={{ width: `${Math.min(rate, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Monthly table */}
      <div className="card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#2a2a2a' }}>
          <h2 className="font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#f5f5f5' }}>
            Détail mensuel
          </h2>
          <p className="text-xs" style={{ color: '#5a5a5a' }}>
            Clique ✏️ pour mettre à jour ton réel
          </p>
        </div>

        <div className="divide-y" style={{ borderColor: '#1e1e1e' }}>
          {MONTH_NAMES.map((monthName, idx) => {
            const month = idx + 1
            const obj = objectives.find(o => o.month === month)
            if (!obj) return null

            const rate = obj.target_concepts > 0
              ? Math.round((obj.actual_concepts / obj.target_concepts) * 100)
              : 0
            const isCurrentMonth = month === currentMonth
            const isPast = month < currentMonth

            return (
              <div
                key={month}
                className={cn(
                  'flex items-center px-6 py-4 transition-all duration-150',
                  isCurrentMonth && 'bg-[#161616]'
                )}
              >
                {/* Month name */}
                <div className="w-32 flex items-center gap-2">
                  {isCurrentMonth && (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#e63329' }} />
                  )}
                  <span
                    className="font-medium text-sm"
                    style={{
                      fontFamily: 'Syne, sans-serif',
                      color: isCurrentMonth ? '#f5f5f5' : month > currentMonth ? '#5a5a5a' : '#a0a0a0',
                    }}
                  >
                    {monthName}
                  </span>
                </div>

                {/* Working days */}
                <div className="w-24 text-center">
                  <span className="text-xs" style={{ color: '#5a5a5a' }}>
                    {obj.working_days}j travaillés
                  </span>
                </div>

                {/* Target */}
                <div className="w-28 text-center">
                  <span className="text-sm font-medium" style={{ color: '#a0a0a0' }}>
                    {obj.target_concepts}
                  </span>
                </div>

                {/* Actual */}
                <div className="w-28 text-center">
                  {editingId === obj.id ? (
                    <div className="flex items-center gap-1 justify-center">
                      <input
                        type="number"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="input w-16 text-center text-sm py-1 px-2"
                        min={0}
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit(obj)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                      <button onClick={() => saveEdit(obj)} className="p-1 rounded" style={{ color: '#10b981' }}>
                        <Check size={12} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1 rounded" style={{ color: '#ef4444' }}>
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 justify-center group">
                      <span
                        className={cn('text-sm font-bold', getCompletionColor(rate))}
                        style={{ fontFamily: 'Syne, sans-serif' }}
                      >
                        {obj.actual_concepts}
                      </span>
                      <button
                        onClick={() => startEdit(obj)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity"
                        style={{ color: '#5a5a5a' }}
                      >
                        <Edit2 size={10} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="flex-1 mx-4">
                  <div className="progress-bar">
                    <div
                      className={cn('progress-fill', getCompletionBg(rate))}
                      style={{ width: `${Math.min(rate, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Rate */}
                <div className="w-14 text-right">
                  <span className={cn('text-sm font-bold', getCompletionColor(rate))} style={{ fontFamily: 'Syne, sans-serif' }}>
                    {rate}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, suffix, progressRate }: {
  icon: React.ReactNode
  label: string
  value: string | number
  suffix?: string
  progressRate?: number
}) {
  return (
    <div className="stat-card rounded-2xl">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs uppercase tracking-wider" style={{ fontFamily: 'Syne, sans-serif', color: '#5a5a5a' }}>
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
          {value}
        </span>
        {suffix && <span className="text-xs" style={{ color: '#5a5a5a' }}>{suffix}</span>}
      </div>
      {progressRate !== undefined && (
        <div className="progress-bar mt-1">
          <div
            className={cn('progress-fill', getCompletionBg(progressRate))}
            style={{ width: `${Math.min(progressRate, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
