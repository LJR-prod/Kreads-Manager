'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react'
import { MONTH_NAMES } from '@/types'

interface ClickUpSyncProps {
  year: number
  currentMonth: number
}

export default function ClickUpSync({ year, currentMonth }: ClickUpSyncProps) {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  const handleSync = async () => {
    setSyncing(true)
    setResult(null)

    try {
      const res = await fetch('/api/sync-clickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, year }),
      })

      const data = await res.json()

      if (data.success) {
        const total = Object.values(data.results as Record<string, number>).reduce((s, v) => s + v, 0)
        setResult({
          success: true,
          message: `${total} concepts synchronisés pour ${MONTH_NAMES[selectedMonth - 1]} ${year}`,
        })
      } else {
        setResult({ success: false, message: data.error || 'Erreur inconnue' })
      }
    } catch (err) {
      setResult({ success: false, message: 'Erreur de connexion' })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#1a1a1a' }}>
            Sync ClickUp
          </h3>
          <p className="text-xs mt-1" style={{ color: '#a09d96' }}>
            Importe automatiquement les concepts au statut "REVIEW CS" par monteur
          </p>
        </div>

        {/* ClickUp logo */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#7B68EE' }}>
          <span className="text-white font-bold text-xs">CU</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Month selector */}
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="input pr-8 text-sm py-2 appearance-none"
            style={{ width: '140px' }}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>{name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#a09d96' }} />
        </div>

        <span className="text-sm" style={{ color: '#a09d96' }}>{year}</span>

        {/* Sync button */}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn-primary flex items-center gap-2"
          style={{ opacity: syncing ? 0.7 : 1 }}
        >
          <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Synchronisation...' : 'Synchroniser'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div
          className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl text-xs"
          style={{
            background: result.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${result.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: result.success ? '#10b981' : '#ef4444',
          }}
        >
          {result.success
            ? <CheckCircle size={13} />
            : <AlertCircle size={13} />
          }
          {result.message}
        </div>
      )}
    </div>
  )
}
