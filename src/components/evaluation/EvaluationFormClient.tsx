'use client'

import { useState } from 'react'
import { Star, Send, CheckCircle, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { EvaluationLink, Profile } from '@/types'
import { cn } from '@/lib/utils'

interface EvaluationFormClientProps {
  link: EvaluationLink
  editors: Pick<Profile, 'id' | 'name'>[]
}

const CRITERIA = [
  { key: 'quality_score', label: 'Qualité des montages', desc: 'Niveau technique et créatif des rendus' },
  { key: 'avoidable_returns_score', label: 'Retours évitables', desc: 'Fautes, inattentions, erreurs récurrentes (5 = peu de retours, 1 = beaucoup)' },
  { key: 'communication_score', label: 'Communication', desc: 'Updates réguliers, fluidité des échanges' },
  { key: 'deadline_score', label: 'Respect des deadlines', desc: 'Rendus dans les temps (5 = toujours à temps)' },
]

interface EditorEval {
  editor_id: string
  quality_score: number
  avoidable_returns_score: number
  communication_score: number
  deadline_score: number
  comment: string
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => {
        const active = s <= (hovered || value)
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform duration-100 hover:scale-110"
          >
            <Star
              size={22}
              fill={active ? '#f59e0b' : 'none'}
              stroke={active ? '#f59e0b' : '#ccc9c0'}
            />
          </button>
        )
      })}
      {value > 0 && (
        <span className="ml-2 text-sm font-bold self-center" style={{ fontFamily: 'Syne, sans-serif', color: '#f59e0b' }}>
          {value}/5
        </span>
      )}
    </div>
  )
}

const emptyEval = (): EditorEval => ({
  editor_id: '',
  quality_score: 0,
  avoidable_returns_score: 0,
  communication_score: 0,
  deadline_score: 0,
  comment: '',
})

export default function EvaluationFormClient({ link, editors }: EvaluationFormClientProps) {
  const [csName, setCsName] = useState('')
  const [evals, setEvals] = useState<EditorEval[]>([emptyEval()])
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const updateEval = (index: number, field: keyof EditorEval, value: string | number) => {
    setEvals(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e))
  }

  const addEditor = () => setEvals(prev => [...prev, emptyEval()])
  const removeEditor = (index: number) => setEvals(prev => prev.filter((_, i) => i !== index))

  const handleSubmit = async () => {
    setError('')
    if (!csName.trim()) { setError('Merci de renseigner ton prénom.'); return }
    for (const ev of evals) {
      if (!ev.editor_id) { setError('Sélectionne un monteur pour chaque évaluation.'); return }
      const scores = [ev.quality_score, ev.avoidable_returns_score, ev.communication_score, ev.deadline_score]
      if (scores.some(s => s === 0)) { setError('Toutes les notes doivent être renseignées.'); return }
    }
    // Check no duplicate editor
    const editorIds = evals.map(e => e.editor_id)
    if (new Set(editorIds).size !== editorIds.length) { setError('Tu ne peux pas évaluer le même monteur deux fois.'); return }

    setLoading(true)
    const rows = evals.map(ev => ({
      link_id: link.id,
      editor_id: ev.editor_id,
      cs_name: csName.trim(),
      year: link.year,
      quarter: link.quarter,
      quality_score: ev.quality_score,
      avoidable_returns_score: ev.avoidable_returns_score,
      communication_score: ev.communication_score,
      deadline_score: ev.deadline_score,
      comment: ev.comment.trim() || null,
    }))

    const { error: err } = await supabase.from('evaluations').insert(rows)
    if (err) {
      setError('Erreur lors de l\'envoi. Réessaie.')
      setLoading(false)
      return
    }
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f3ee' }}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <CheckCircle size={32} style={{ color: '#10b981' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#1a1a1a' }}>
            Merci {csName} !
          </h1>
          <p className="text-sm" style={{ color: '#6b6860' }}>
            Tes évaluations ont bien été envoyées pour le Q{link.quarter} {link.year}.
          </p>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: '#ffffff', color: '#a09d96', border: '1px solid #2a2a2a' }}
          >
            <span style={{ color: '#e63329', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>K</span>
            Kreads Manager
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#f5f3ee' }}>
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#e63329' }}>
              <span className="text-white font-bold text-xs" style={{ fontFamily: 'Syne, sans-serif' }}>K</span>
            </div>
            <span className="font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#1a1a1a' }}>Kreads Manager</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
            Évaluation des monteurs
          </h1>
          <p className="text-sm" style={{ color: '#6b6860' }}>
            Q{link.quarter} {link.year} · Note uniquement les monteurs avec qui tu as travaillé
          </p>
        </div>

        {/* CS name */}
        <div className="card rounded-2xl p-5">
          <label className="label">Ton prénom *</label>
          <input
            type="text"
            className="input"
            placeholder="Ex : Lucas, Sarah, Thomas..."
            value={csName}
            onChange={e => setCsName(e.target.value)}
          />
        </div>

        {/* Editor evaluations */}
        {evals.map((ev, index) => (
          <div key={index} className="card rounded-2xl overflow-hidden">
            {/* Editor selector */}
            <div className="px-5 pt-5 pb-4 border-b flex items-center justify-between" style={{ borderColor: '#e0ddd6' }}>
              <div className="flex-1 mr-4">
                <label className="label">Monteur *</label>
                <select
                  className="input"
                  value={ev.editor_id}
                  onChange={e => updateEval(index, 'editor_id', e.target.value)}
                  style={{ background: '#f9f8f5', cursor: 'pointer' }}
                >
                  <option value="">Sélectionner un monteur</option>
                  {editors.map(e => (
                    <option key={e.id} value={e.id}>{e.name.split(' ')[0]}</option>
                  ))}
                </select>
              </div>
              {evals.length > 1 && (
                <button
                  onClick={() => removeEditor(index)}
                  className="p-2 rounded-lg transition-all mt-5"
                  style={{ color: '#a09d96', background: '#f9f8f5' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#a09d96')}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Criteria */}
            <div className="p-5 space-y-5">
              {CRITERIA.map(c => (
                <div key={c.key}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{c.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#a09d96' }}>{c.desc}</p>
                    </div>
                  </div>
                  <StarRating
                    value={ev[c.key as keyof EditorEval] as number}
                    onChange={v => updateEval(index, c.key as keyof EditorEval, v)}
                  />
                </div>
              ))}

              {/* Comment */}
              <div>
                <label className="label">Commentaire libre</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Points forts, axes d'amélioration, anecdotes..."
                  value={ev.comment}
                  onChange={e => updateEval(index, 'comment', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Add another editor */}
        <button
          onClick={addEditor}
          className="w-full py-3 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-sm transition-all duration-200"
          style={{ borderColor: '#e0ddd6', color: '#a09d96' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#e63329'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#e63329'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a2a'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#a09d96'
          }}
        >
          <Plus size={14} />
          Évaluer un autre monteur
        </button>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm font-bold rounded-2xl"
          style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.9rem' }}
        >
          {loading ? (
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin border-white" />
          ) : (
            <Send size={15} />
          )}
          {loading ? 'Envoi...' : 'Envoyer mes évaluations'}
        </button>

        <p className="text-center text-xs pb-8" style={{ color: '#ccc9c0' }}>
          © {new Date().getFullYear()} Kreads · Formulaire confidentiel
        </p>
      </div>
    </div>
  )
}
