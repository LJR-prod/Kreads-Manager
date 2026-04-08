'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Star, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import { Profile, Evaluation } from '@/types'
import { getInitials, cn } from '@/lib/utils'

interface AdminEvaluationsClientProps {
  editors: Profile[]
  evaluations: Evaluation[]
  year: number
  currentQuarter: number
}

const SCORE_LABELS = {
  quality_score: 'Qualité des montages',
  avoidable_returns_score: 'Retours évitables',
  communication_score: 'Communication',
  deadline_score: 'Respect des deadlines',
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 4 ? '#10b981' : score >= 3 ? '#f59e0b' : '#ef4444'
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs" style={{ color: '#a0a0a0' }}>{label}</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(s => (
            <Star
              key={s}
              size={11}
              fill={s <= score ? color : 'none'}
              stroke={s <= score ? color : '#3a3a3a'}
            />
          ))}
          <span className="text-xs ml-1 font-bold" style={{ color, fontFamily: 'Syne, sans-serif' }}>
            {score}/5
          </span>
        </div>
      </div>
    </div>
  )
}

export default function AdminEvaluationsClient({
  editors, evaluations, year, currentQuarter
}: AdminEvaluationsClientProps) {
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter)
  const [expandedEditor, setExpandedEditor] = useState<string | null>(null)

  const quarterEvals = evaluations.filter(e => e.year === year && e.quarter === selectedQuarter)

  const getEditorEvals = (editorId: string) =>
    quarterEvals.filter(e => e.editor_id === editorId)

  const getAvgScore = (evals: Evaluation[], key: keyof typeof SCORE_LABELS) => {
    if (evals.length === 0) return null
    return (evals.reduce((s, e) => s + (e[key] as number), 0) / evals.length).toFixed(1)
  }

  const globalAvg = (evals: Evaluation[]) => {
    if (evals.length === 0) return null
    const keys = Object.keys(SCORE_LABELS) as Array<keyof typeof SCORE_LABELS>
    const total = evals.reduce((s, e) => {
      return s + keys.reduce((ks, k) => ks + (e[k] as number), 0) / keys.length
    }, 0)
    return (total / evals.length).toFixed(1)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
            Évaluations Creative Strategists
          </h1>
          <p className="text-sm mt-1" style={{ color: '#a0a0a0' }}>
            Notes par quarter · {quarterEvals.length} évaluation{quarterEvals.length > 1 ? 's' : ''} reçue{quarterEvals.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#161616', border: '1px solid #2a2a2a' }}>
          {[1, 2, 3, 4].map(q => (
            <button
              key={q}
              onClick={() => setSelectedQuarter(q)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                fontFamily: 'Syne, sans-serif',
                background: selectedQuarter === q ? '#e63329' : 'transparent',
                color: selectedQuarter === q ? 'white' : '#5a5a5a',
              }}
            >
              Q{q}
            </button>
          ))}
        </div>
      </div>

      {/* Per editor */}
      <div className="space-y-3">
        {editors.map(editor => {
          const evals = getEditorEvals(editor.id)
          const avg = globalAvg(evals)
          const avgNum = avg ? parseFloat(avg) : 0
          const isExpanded = expandedEditor === editor.id
          const avgColor = avgNum >= 4 ? '#10b981' : avgNum >= 3 ? '#f59e0b' : avgNum > 0 ? '#ef4444' : '#5a5a5a'

          return (
            <div key={editor.id} className="card rounded-2xl overflow-hidden">
              {/* Editor header */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer card-hover"
                onClick={() => setExpandedEditor(isExpanded ? null : editor.id)}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                  style={{ background: '#e63329', color: 'white', fontFamily: 'Syne, sans-serif' }}
                >
                  {getInitials(editor.name)}
                </div>

                <div className="flex-1">
                  <p className="font-bold text-sm" style={{ fontFamily: 'Syne, sans-serif', color: '#f5f5f5' }}>
                    {editor.name.split(' ')[0]}
                  </p>
                  <p className="text-xs" style={{ color: '#5a5a5a' }}>
                    {evals.length} évaluation{evals.length > 1 ? 's' : ''} ce quarter
                  </p>
                </div>

                {/* Scores summary */}
                {evals.length > 0 && (
                  <div className="flex gap-6">
                    {(Object.keys(SCORE_LABELS) as Array<keyof typeof SCORE_LABELS>).map(key => {
                      const score = parseFloat(getAvgScore(evals, key) || '0')
                      const c = score >= 4 ? '#10b981' : score >= 3 ? '#f59e0b' : '#ef4444'
                      return (
                        <div key={key} className="text-center">
                          <p className="text-xs font-bold" style={{ fontFamily: 'Syne, sans-serif', color: c }}>
                            {getAvgScore(evals, key) ?? '—'}
                          </p>
                          <p className="text-xs" style={{ color: '#3a3a3a', fontSize: '0.6rem' }}>
                            {key === 'quality_score' ? 'Qualité' : key === 'avoidable_returns_score' ? 'Retours' : key === 'communication_score' ? 'Commu.' : 'Deadlines'}
                          </p>
                        </div>
                      )
                    })}
                    <div className="text-center border-l pl-4" style={{ borderColor: '#2a2a2a' }}>
                      <p className="text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif', color: avgColor }}>
                        {avg ?? '—'}
                      </p>
                      <p className="text-xs" style={{ color: '#3a3a3a', fontSize: '0.6rem' }}>Moy.</p>
                    </div>
                  </div>
                )}

                {evals.length === 0 && (
                  <span className="text-xs" style={{ color: '#3a3a3a' }}>Aucune évaluation</span>
                )}

                <div style={{ color: '#5a5a5a' }}>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>

              {/* Expanded evaluations */}
              {isExpanded && evals.length > 0 && (
                <div className="border-t divide-y" style={{ borderColor: '#1e1e1e' }}>
                  {evals.map(ev => (
                    <div key={ev.id} className="px-5 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#f5f5f5' }}>
                            {ev.cs_name}
                          </p>
                          <p className="text-xs" style={{ color: '#5a5a5a' }}>
                            {format(new Date(ev.submitted_at), 'd MMMM yyyy à HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {(Object.entries(SCORE_LABELS) as [keyof typeof SCORE_LABELS, string][]).map(([key, label]) => (
                          <ScoreBar key={key} score={ev[key] as number} label={label} />
                        ))}
                      </div>

                      {ev.comment && (
                        <div className="p-3 rounded-xl" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <MessageSquare size={11} style={{ color: '#5a5a5a' }} />
                            <span className="text-xs uppercase tracking-wider" style={{ color: '#5a5a5a', fontFamily: 'Syne, sans-serif' }}>
                              Commentaire
                            </span>
                          </div>
                          <p className="text-sm" style={{ color: '#a0a0a0', lineHeight: 1.6 }}>
                            {ev.comment}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
