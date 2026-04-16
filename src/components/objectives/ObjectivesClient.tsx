'use client'

import { useState, useEffect, useCallback } from 'react'
import { Target, TrendingUp, CheckCircle, Edit2, Check, X, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MonthlyObjective, Availability, FrenchHoliday, Profile, MONTH_NAMES } from '@/types'
import { getMonthWorkingDays, calculateMonthlyTarget, getCompletionColor, getCompletionBg, cn } from '@/lib/utils'

interface ObjectivesClientProps {
  profile: Profile
  initialObjectives: MonthlyObjective[]
  availabilities: Availability[]
  holidays: FrenchHoliday[]
  year: number
  isAdmin: boolean
}

export default function ObjectivesClient({ profile, initialObjectives, holidays, year }: ObjectivesClientProps) {
  const [objectives, setObjectives] = useState<MonthlyObjective[]>(initialObjectives)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [syncing, setSyncing] = useState(false)
  const supabase = createClient()

  const holidayDates = holidays.map(h => h.date)
  const currentMonth = new Date().getMonth() + 1

  const recalculate = useCallback(async () => {
    setSyncing(true)
    try {
      const { data: freshAvailabilities } = await supabase
        .from('availabilities')
        .select('*')
        .eq('editor_id', profile.id)

      const avails = freshAvailabilities || []

      const { data: existingObjs } = await supabase
        .from('monthly_objectives')
        .select('*')
        .eq('editor_id', profile.id)
        .eq('year', year)

      const existing = existingObjs || []
      const results: MonthlyObjective[] = []

      for (let month = 1; month <= 12; month++) {
        // Exclut cours + tournage + congé du calcul
        const unavailableDays = avails
          .filter(a => a.date.startsWith(`${year}-${String(month).padStart(2, '0')}`))
          .map(a => a.date)

        const workingDays = getMonthWorkingDays(year, month, holidayDates, unavailableDays)
        const target = calculateMonthlyTarget(workingDays)
        const existingMonth = existing.find(o => o.month === month)
        const actualConcepts = existingMonth?.actual_concepts ?? 0

        const { data } = await supabase
          .from('monthly_objectives')
          .upsert({
            editor_id: profile.id,
            year,
            month,
            target_concepts: target,
            working_days: workingDays,
            actual_concepts: actualConcepts,
          }, { onConflict: 'editor_id,year,month' })
          .select()
          .single()

        if (data) results.push(data)
      }

      setObjectives(results)
    } finally {
      setSyncing(false)
    }
  }, [profile.id, year])

  useEffect(() => { recalculate() }, [])

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
    if (data) setObjectives(prev => prev.map(o => o.id === obj.id ? data : o))
    setEditingId(null)
  }

  const totalTarget = objectives.reduce((s, o) => s + o.target_concepts, 0)
  const totalActual = objectives.reduce((s, o) => s + o.actual_concepts, 0)
  const globalRate = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#1a1a1a' }}>
            Objectifs {year}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b6860' }}>
            5 concepts par jour travaillé · hors WE, fériés, cours, tournages et congés
          </p>
        </div>
        <button
          onClick={recalculate}
          disabled={syncing}
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-all duration-200"
          style={{ color: '#6b6860', borderColor: '#e0ddd6', background: 'white', opacity: syncing ? 0.6 : 1 }}
          onMouseEnter={e => { if (!syncing) { (e.currentTarget).style.borderColor = '#e63329'; (e.currentTarget).style.color = '#e63329' } }}
          onMouseLeave={e => { (e.currentTarget).style.borderColor = '#e0ddd6'; (e.currentTarget).style.color = '#6b6860' }}
        >
          <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Calcul...' : 'Recalculer'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <Target size={16} style={{ color: '#e63329' }} />, label: 'Objectif annuel', value: totalTarget, suffix: 'concepts' },
          { icon: <TrendingUp size={16} style={{ color: '#e63329' }} />, label: 'Réalisé', value: totalActual, suffix: 'concepts' },
          { icon: <CheckCircle size={16} style={{ color: '#e63329' }} />, label: 'Taux global', value: `${globalRate}%`, progressRate: globalRate },
        ].map((stat, i) => (
          <div key={i} className="stat-card rounded-2xl">
            <div className="flex items-center gap-2">
              {stat.icon}
              <span className="text-xs uppercase tracking-wider" style={{ fontFamily: 'Syne, sans-serif', color: '#a09d96' }}>
                {stat.label}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#1a1a1a' }}>
                {stat.value}
              </span>
              {stat.suffix && <span className="text-xs" style={{ color: '#a09d96' }}>{stat.suffix}</span>}
            </div>
            {stat.progressRate !== undefined && (
              <div className="progress-bar mt-1">
                <div className={cn('progress-fill', getCompletionBg(stat.progressRate))} style={{ width: `${Math.min(stat.progressRate, 100)}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {quarters.map(({ q, target, actual, rate }) => (
          <div key={q} className="card p-4 rounded-xl">
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ fontFamily: 'Syne, sans-serif', color: '#a09d96' }}>
              Q{q}
            </p>
            <div className="flex items-end justify-between mb-2">
              <span className={cn('text-xl font-bold', getCompletionColor(rate))} style={{ fontFamily: 'Syne, sans-serif' }}>
                {rate}%
              </span>
              <span className="text-xs" style={{ color: '#a09d96' }}>{actual}/{target}</span>
            </div>
            <div className="progress-bar">
              <div className={cn('progress-fill', getCompletionBg(rate))} style={{ width: `${Math.min(rate, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#e0ddd6' }}>
          <h2 className="font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#1a1a1a' }}>Détail mensuel</h2>
          <p className="text-xs" style={{ color: '#a09d96' }}>Clique ✏️ pour mettre à jour ton réel</p>
        </div>
        <div className="divide-y" style={{ borderColor: '#edeae3' }}>
          {MONTH_NAMES.map((monthName, idx) => {
            const month = idx + 1
            const obj = objectives.find(o => o.month === month)
            if (!obj) return null
            const rate = obj.target_concepts > 0 ? Math.round((obj.actual_concepts / obj.target_concepts) * 100) : 0
            const isCurrentMonth = month === currentMonth

            return (
              <div
                key={month}
                className="flex items-center px-6 py-4 transition-all duration-150"
                style={{ background: isCurrentMonth ? '#faf9f7' : undefined }}
              >
                <div className="w-32 flex items-center gap-2">
                  {isCurrentMonth && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#e63329' }} />}
                  <span className="font-medium text-sm" style={{
                    fontFamily: 'Syne, sans-serif',
                    color: isCurrentMonth ? '#1a1a1a' : month > currentMonth ? '#ccc9c0' : '#6b6860'
                  }}>
                    {monthName}
                  </span>
                </div>

                <div className="w-24 text-center">
                  <span className="text-xs" style={{ color: '#a09d96' }}>{obj.working_days}j travaillés</span>
                </div>

                <div className="w-28 text-center">
                  <span className="text-sm font-medium" style={{ color: '#6b6860' }}>{obj.target_concepts}</span>
                </div>

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
                      <span className={cn('text-sm font-bold', getCompletionColor(rate))} style={{ fontFamily: 'Syne, sans-serif' }}>
                        {obj.actual_concepts}
                      </span>
                      <button
                        onClick={() => startEdit(obj)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity"
                        style={{ color: '#a09d96' }}
                      >
                        <Edit2 size={10} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 mx-4">
                  <div className="progress-bar">
                    <div className={cn('progress-fill', getCompletionBg(rate))} style={{ width: `${Math.min(rate, 100)}%` }} />
                  </div>
                </div>

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
