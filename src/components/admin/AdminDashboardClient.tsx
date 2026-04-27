'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Users, Target, TrendingUp, Calendar, Star,
  ChevronRight, Edit2, Check, X, Copy, ExternalLink, Link
} from 'lucide-react'
import ClickUpSync from './ClickUpSync'
import { createClient } from '@/lib/supabase/client'
import {
  Profile, MonthlyObjective, Availability, QuarterlyVariable,
  FrenchHoliday, EvaluationLink, Evaluation, AVAILABILITY_CONFIG, MONTH_NAMES
} from '@/types'
import {
  getMonthWorkingDays, calculateMonthlyTarget, getCompletionColor,
  getCompletionBg, calculateBonusAmount, formatCurrency, getInitials,
  getQuarterMonths, cn
} from '@/lib/utils'

interface AdminDashboardClientProps {
  editors: Profile[]
  allObjectives: MonthlyObjective[]
  allAvailabilities: Availability[]
  quarterlyVariables: QuarterlyVariable[]
  holidays: FrenchHoliday[]
  evalLinks: EvaluationLink[]
  evaluations: Evaluation[]
  year: number
  currentQuarter: number
}

export default function AdminDashboardClient({
  editors, allObjectives, allAvailabilities, quarterlyVariables,
  holidays, evalLinks, evaluations, year, currentQuarter
}: AdminDashboardClientProps) {
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'calendar' | 'variables'>('overview')
  const [editingBonus, setEditingBonus] = useState<string | null>(null)
  const [bonusValue, setBonusValue] = useState('')
  const [variables, setVariables] = useState<QuarterlyVariable[]>(quarterlyVariables)
  const [links, setLinks] = useState<EvaluationLink[]>(evalLinks)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  const holidayDates = holidays.map(h => h.date)

  const getEditorQuarterStats = (editorId: string, quarter: number) => {
    const months = getQuarterMonths(quarter)
    const objs = allObjectives.filter(o => o.editor_id === editorId && months.includes(o.month))
    const target = objs.reduce((s, o) => s + o.target_concepts, 0)
    const actual = objs.reduce((s, o) => s + o.actual_concepts, 0)
    const rate = target > 0 ? Math.round((actual / target) * 100) : 0
    return { target, actual, rate }
  }

  const getEditorMonthAvailabilities = (editorId: string) => {
    return allAvailabilities.filter(a => a.editor_id === editorId)
  }

  const getVariable = (editorId: string) => {
    return variables.find(v => v.editor_id === editorId && v.year === year && v.quarter === selectedQuarter)
  }

  const saveBaseBonus = async (editorId: string) => {
    const val = parseFloat(bonusValue)
    if (isNaN(val)) return

    const existing = getVariable(editorId)
    const stats = getEditorQuarterStats(editorId, selectedQuarter)
    const bonus = calculateBonusAmount(val, stats.rate)

    if (existing) {
      const { data } = await supabase
        .from('quarterly_variables')
        .update({ base_bonus: val, bonus_amount: bonus, objective_rate: stats.rate })
        .eq('id', existing.id)
        .select().single()
      if (data) setVariables(prev => prev.map(v => v.id === existing.id ? data : v))
    } else {
      const { data } = await supabase
        .from('quarterly_variables')
        .insert({
          editor_id: editorId, year, quarter: selectedQuarter,
          base_bonus: val, bonus_amount: bonus, objective_rate: stats.rate
        })
        .select().single()
      if (data) setVariables(prev => [...prev, data])
    }
    setEditingBonus(null)
  }

  const generateEvalLink = async () => {
    const existing = links.find(l => l.year === year && l.quarter === selectedQuarter)
    if (existing) return

    const { data } = await supabase
      .from('evaluation_links')
      .insert({ year, quarter: selectedQuarter })
      .select().single()
    if (data) setLinks(prev => [...prev, data])
  }

  const currentLink = links.find(l => l.year === year && l.quarter === selectedQuarter)
  const evalUrl = currentLink
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/evaluate/${currentLink.token}`
    : null

  const copyLink = () => {
    if (evalUrl) {
      navigator.clipboard.writeText(evalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Calendar aggregated view
  const today = new Date()
  const currentMonthStr = format(today, 'yyyy-MM')

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
            Dashboard Admin
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b6860' }}>
            Vue globale de l'équipe montage · {year}
          </p>
        </div>
        {/* Quarter selector */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#ffffff', border: '1px solid #2a2a2a' }}>
          {[1, 2, 3, 4].map(q => (
            <button
              key={q}
              onClick={() => setSelectedQuarter(q)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                fontFamily: 'Syne, sans-serif',
                background: selectedQuarter === q ? '#e63329' : 'transparent',
                color: selectedQuarter === q ? 'white' : '#a09d96',
              }}
            >
              Q{q}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: '#e0ddd6' }}>
        {([
          { id: 'overview', label: 'Vue équipe' },
          { id: 'calendar', label: 'Calendrier global' },
          { id: 'variables', label: 'Variables trimestrielles' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 -mb-px"
            style={{
              fontFamily: 'Syne, sans-serif',
              borderBottomColor: selectedTab === tab.id ? '#e63329' : 'transparent',
              color: selectedTab === tab.id ? '#1a1a1a' : '#a09d96',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-4">
          {editors.map(editor => {
            const stats = getEditorQuarterStats(editor.id, selectedQuarter)
            const avails = getEditorMonthAvailabilities(editor.id)
            const variable = getVariable(editor.id)

            const monthsInQ = getQuarterMonths(selectedQuarter)
            const coursCount = avails.filter(a => a.type === 'cours' && monthsInQ.some(m => a.date.startsWith(`${year}-${String(m).padStart(2, '0')}`))).length
            const tournageCount = avails.filter(a => a.type === 'tournage' && monthsInQ.some(m => a.date.startsWith(`${year}-${String(m).padStart(2, '0')}`))).length
            const congeCount = avails.filter(a => a.type === 'conge' && monthsInQ.some(m => a.date.startsWith(`${year}-${String(m).padStart(2, '0')}`))).length

            return (
              <div key={editor.id} className="card rounded-2xl p-5 card-hover">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                    style={{ background: '#e63329', color: 'white', fontFamily: 'Syne, sans-serif' }}
                  >
                    {getInitials(editor.name)}
                  </div>

                  {/* Name */}
                  <div className="w-32">
                    <p className="font-bold text-sm" style={{ fontFamily: 'Syne, sans-serif', color: '#1a1a1a' }}>
                      {editor.name.split(' ')[0]}
                    </p>
                    <p className="text-xs" style={{ color: '#a09d96' }}>{editor.email.split('@')[0]}</p>
                  </div>

                  {/* Availabilities pills */}
                  <div className="flex gap-2">
                    {coursCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}>
                        🎓 {coursCount}j
                      </span>
                    )}
                    {tournageCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(249,115,22,0.15)', color: '#fdba74' }}>
                        🎬 {tournageCount}j
                      </span>
                    )}
                    {congeCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7' }}>
                        🏖️ {congeCount}j
                      </span>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="flex-1 mx-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs" style={{ color: '#a09d96' }}>
                        {stats.actual} / {stats.target} concepts
                      </span>
                      <span
                        className={cn('text-xs font-bold', getCompletionColor(stats.rate))}
                        style={{ fontFamily: 'Syne, sans-serif' }}
                      >
                        {stats.rate}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={cn('progress-fill', getCompletionBg(stats.rate))}
                        style={{ width: `${Math.min(stats.rate, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Bonus */}
                  <div className="w-28 text-right">
                    {variable ? (
                      <div>
                        <p className="text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#1a1a1a' }}>
                          {formatCurrency(variable.bonus_amount)}
                        </p>
                        <p className="text-xs" style={{ color: '#a09d96' }}>
                          sur {formatCurrency(variable.base_bonus)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: '#ccc9c0' }}>—</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Calendar Tab */}
      {selectedTab === 'calendar' && (
        <div className="space-y-4">
          <div className="card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b" style={{ borderColor: '#e0ddd6' }}>
              <h2 className="font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#1a1a1a' }}>
                Disponibilités — {format(today, 'MMMM yyyy', { locale: fr })}
              </h2>
            </div>
            <div className="p-6">
              {/* Editors x Days grid */}
              <div className="space-y-3">
                {editors.map(editor => {
                  const editorAvails = allAvailabilities.filter(
                    a => a.editor_id === editor.id && a.date.startsWith(currentMonthStr)
                  )
                  // Days of current month
                  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
                  return (
                    <div key={editor.id} className="flex items-center gap-3">
                      <div className="w-20 flex-shrink-0">
                        <p className="text-xs font-medium" style={{ fontFamily: 'Syne, sans-serif', color: '#6b6860' }}>
                          {editor.name.split(' ')[0]}
                        </p>
                      </div>
                      <div className="flex gap-0.5 flex-1">
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const day = i + 1
                          const dateStr = `${currentMonthStr}-${String(day).padStart(2, '0')}`
                          const avail = editorAvails.find(a => a.date === dateStr)
                          const dayOfWeek = new Date(dateStr).getDay()
                          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                          const isHoliday = holidays.some(h => h.date === dateStr)
                          const isToday = dateStr === format(today, 'yyyy-MM-dd')

                          return (
                            <div
                              key={day}
                              className="flex-1 h-7 rounded-sm flex items-center justify-center relative"
                              style={{
                                minWidth: '20px',
                                background: avail
                                  ? avail.type === 'cours' ? 'rgba(59,130,246,0.35)' : avail.type === 'tournage' ? 'rgba(249,115,22,0.35)' : 'rgba(16,185,129,0.35)'
                                  : isWeekend || isHoliday ? '#f9f8f5' : '#edeae3',
                                border: isToday ? '1px solid #e63329' : 'none',
                              }}
                              title={avail ? `${day} — ${AVAILABILITY_CONFIG[avail.type].label}` : `${day}`}
                            >
                              <span className="text-xs" style={{ color: '#ccc9c0', fontSize: '0.6rem' }}>
                                {avail ? AVAILABILITY_CONFIG[avail.type].emoji : ''}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-4 mt-4 pt-4 border-t" style={{ borderColor: '#edeae3' }}>
                {Object.entries(AVAILABILITY_CONFIG).map(([key, config]) => (
                  <div key={key} className="flex items-center gap-1.5 text-xs" style={{ color: '#a09d96' }}>
                    <span>{config.emoji}</span>
                    <span>{config.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 text-xs ml-4" style={{ color: '#a09d96' }}>
                  <div className="w-3 h-3 rounded-sm" style={{ background: '#edeae3' }} />
                  <span>Disponible</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Variables Tab */}
      {selectedTab === 'variables' && (
        <div className="space-y-6">
          {/* ClickUp Sync */}
          <ClickUpSync year={year} currentMonth={new Date().getMonth() + 1} />

          {/* Eval link */}
          <div className="card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#1a1a1a' }}>
                  Lien d'évaluation CS — Q{selectedQuarter} {year}
                </h3>
                <p className="text-xs mt-1" style={{ color: '#a09d96' }}>
                  Envoie ce lien à tes Creative Strategists pour qu'ils évaluent les monteurs
                </p>
              </div>
              {!currentLink && (
                <button onClick={generateEvalLink} className="btn-primary flex items-center gap-2">
                  <Link size={14} />
                  Générer le lien
                </button>
              )}
            </div>

            {evalUrl && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f9f8f5', border: '1px solid #2a2a2a' }}>
                <span className="text-xs flex-1 truncate" style={{ color: '#6b6860', fontFamily: 'monospace' }}>
                  {evalUrl}
                </span>
                <button onClick={copyLink} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5">
                  <Copy size={11} />
                  {copied ? 'Copié !' : 'Copier'}
                </button>
                <a href={evalUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost flex items-center gap-1.5 text-xs py-1.5">
                  <ExternalLink size={11} />
                  Ouvrir
                </a>
              </div>
            )}
          </div>

          {/* Bonus table */}
          <div className="card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b" style={{ borderColor: '#e0ddd6' }}>
              <h3 className="font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#1a1a1a' }}>
                Variables trimestrielles — Q{selectedQuarter} {year}
              </h3>
            </div>

            <div className="divide-y" style={{ borderColor: '#edeae3' }}>
              {editors.map(editor => {
                const stats = getEditorQuarterStats(editor.id, selectedQuarter)
                const variable = getVariable(editor.id)
                const baseBonus = variable?.base_bonus ?? 0
                const bonus = calculateBonusAmount(baseBonus, stats.rate)

                return (
                  <div key={editor.id} className="flex items-center px-6 py-4 gap-4">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs"
                      style={{ background: '#e63329', color: 'white', fontFamily: 'Syne, sans-serif' }}
                    >
                      {getInitials(editor.name)}
                    </div>

                    <div className="w-28">
                      <p className="text-sm font-medium" style={{ fontFamily: 'Syne, sans-serif', color: '#1a1a1a' }}>
                        {editor.name.split(' ')[0]}
                      </p>
                    </div>

                    <div className="w-24">
                      <span
                        className={cn('text-sm font-bold', getCompletionColor(stats.rate))}
                        style={{ fontFamily: 'Syne, sans-serif' }}
                      >
                        {stats.rate}%
                      </span>
                      <p className="text-xs" style={{ color: '#a09d96' }}>taux Q{selectedQuarter}</p>
                    </div>

                    {/* Bonus de base */}
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs" style={{ color: '#a09d96' }}>Bonus base :</span>
                      {editingBonus === editor.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={bonusValue}
                            onChange={e => setBonusValue(e.target.value)}
                            className="input w-24 text-sm py-1 px-2"
                            placeholder="0"
                            autoFocus
                          />
                          <span className="text-xs" style={{ color: '#a09d96' }}>€</span>
                          <button onClick={() => saveBaseBonus(editor.id)} className="p-1" style={{ color: '#10b981' }}>
                            <Check size={12} />
                          </button>
                          <button onClick={() => setEditingBonus(null)} className="p-1" style={{ color: '#ef4444' }}>
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 group">
                          <span className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                            {formatCurrency(baseBonus)}
                          </span>
                          <button
                            onClick={() => {
                              setEditingBonus(editor.id)
                              setBonusValue(String(baseBonus))
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity"
                            style={{ color: '#a09d96' }}
                          >
                            <Edit2 size={10} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Bonus calculé */}
                    <div className="w-36 text-right">
                      <p className="text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#1a1a1a' }}>
                        {formatCurrency(bonus)}
                      </p>
                      <p className="text-xs" style={{ color: '#a09d96' }}>bonus calculé</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Bonus scale legend */}
            <div className="px-6 py-4 border-t" style={{ borderColor: '#edeae3', background: '#f9f8f5' }}>
              <p className="text-xs mb-2" style={{ color: '#a09d96' }}>Barème de la variable :</p>
              <div className="flex gap-4 text-xs" style={{ color: '#a09d96' }}>
                <span>≥ 100% → 100%</span>
                <span>≥ 90% → 90%</span>
                <span>≥ 75% → 75%</span>
                <span>≥ 50% → 50%</span>
                <span>{'<'} 50% → 0%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
