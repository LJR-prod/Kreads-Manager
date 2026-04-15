'use client'

import { useState, useCallback } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, getDay, addMonths, subMonths,
  isSameDay, parseISO
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Trash2, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Availability, AvailabilityType, Profile, FrenchHoliday, AVAILABILITY_CONFIG } from '@/types'
import { cn } from '@/lib/utils'

interface CalendarClientProps {
  profile: Profile
  initialAvailabilities: Availability[]
  holidays: FrenchHoliday[]
}

const AVAILABILITY_TYPES: AvailabilityType[] = ['cours', 'tournage', 'conge']

export default function CalendarClient({ profile, initialAvailabilities, holidays }: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [availabilities, setAvailabilities] = useState<Availability[]>(initialAvailabilities)
  const [selectedType, setSelectedType] = useState<AvailabilityType>('cours')
  const [loading, setLoading] = useState<string | null>(null)
  const supabase = createClient()

  const holidayDates = new Set(holidays.map(h => h.date))

  const getDayAvailability = useCallback((date: Date): Availability | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return availabilities.find(a => a.date === dateStr)
  }, [availabilities])

  const handleDayClick = async (date: Date) => {
    if (!isSameMonth(date, currentDate)) return
    const dayOfWeek = getDay(date)
    if (dayOfWeek === 0 || dayOfWeek === 6) return
    const dateStr = format(date, 'yyyy-MM-dd')
    if (holidayDates.has(dateStr)) return

    setLoading(dateStr)
    const existing = getDayAvailability(date)

    try {
      if (existing) {
        if (existing.type === selectedType) {
          // Delete
          const { error } = await supabase
            .from('availabilities')
            .delete()
            .eq('id', existing.id)
          if (!error) {
            setAvailabilities(prev => prev.filter(a => a.id !== existing.id))
          }
        } else {
          // Update type
          const { data, error } = await supabase
            .from('availabilities')
            .update({ type: selectedType })
            .eq('id', existing.id)
            .select()
            .single()
          if (!error && data) {
            setAvailabilities(prev => prev.map(a => a.id === existing.id ? data : a))
          }
        }
      } else {
        // Insert
        const { data, error } = await supabase
          .from('availabilities')
          .insert({ editor_id: profile.id, date: dateStr, type: selectedType })
          .select()
          .single()
        if (!error && data) {
          setAvailabilities(prev => [...prev, data])
        }
      }
    } finally {
      setLoading(null)
    }
  }

  const clearMonth = async () => {
    const monthStr = format(currentDate, 'yyyy-MM')
    const monthAvailabilities = availabilities.filter(a => a.date.startsWith(monthStr))
    if (monthAvailabilities.length === 0) return

    const ids = monthAvailabilities.map(a => a.id)
    const { error } = await supabase
      .from('availabilities')
      .delete()
      .in('id', ids)

    if (!error) {
      setAvailabilities(prev => prev.filter(a => !a.date.startsWith(monthStr)))
    }
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad start
  const startPad = (getDay(monthStart) + 6) % 7 // Monday first
  const paddedDays = [...Array(startPad).fill(null), ...days]

  // Stats for current month
  const monthStr = format(currentDate, 'yyyy-MM')
  const monthAvails = availabilities.filter(a => a.date.startsWith(monthStr))
  const stats = AVAILABILITY_TYPES.reduce((acc, type) => {
    acc[type] = monthAvails.filter(a => a.type === type).length
    return acc
  }, {} as Record<AvailabilityType, number>)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
            Mes disponibilités
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b6860' }}>
            Clique sur un jour pour marquer ta disponibilité
          </p>
        </div>
        <button
          onClick={clearMonth}
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-all duration-200"
          style={{ color: '#a09d96', borderColor: '#e0ddd6', background: 'transparent' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#ef4444'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.color = '#a09d96'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#e0ddd6'
          }}
        >
          <Trash2 size={12} />
          Vider le mois
        </button>
      </div>

      {/* Type selector */}
      <div className="flex gap-2">
        {AVAILABILITY_TYPES.map(type => {
          const config = AVAILABILITY_CONFIG[type]
          const isSelected = selectedType === type
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-200',
                isSelected
                  ? 'border-transparent'
                  : 'border-transparent'
              )}
              style={{
                background: isSelected
                  ? type === 'cours' ? 'rgba(59,130,246,0.2)' : type === 'tournage' ? 'rgba(249,115,22,0.2)' : 'rgba(16,185,129,0.2)'
                  : '#ffffff',
                borderColor: isSelected
                  ? type === 'cours' ? 'rgba(59,130,246,0.5)' : type === 'tournage' ? 'rgba(249,115,22,0.5)' : 'rgba(16,185,129,0.5)'
                  : '#e0ddd6',
                color: isSelected
                  ? type === 'cours' ? '#93c5fd' : type === 'tournage' ? '#fdba74' : '#6ee7b7'
                  : '#6b6860',
              }}
            >
              <span>{config.emoji}</span>
              <span>{config.label}</span>
              {stats[type] > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    background: type === 'cours' ? 'rgba(59,130,246,0.3)' : type === 'tournage' ? 'rgba(249,115,22,0.3)' : 'rgba(16,185,129,0.3)',
                    color: type === 'cours' ? '#93c5fd' : type === 'tournage' ? '#fdba74' : '#6ee7b7',
                  }}
                >
                  {stats[type]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Calendar */}
      <div className="card rounded-2xl overflow-hidden">
        {/* Nav */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e0ddd6' }}>
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 rounded-lg transition-all duration-200 hover:bg-[#1c1c1c]"
            style={{ color: '#6b6860' }}
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="font-bold capitalize" style={{ fontFamily: 'Syne, sans-serif', color: '#1a1a1a' }}>
            {format(currentDate, 'MMMM yyyy', { locale: fr })}
          </h2>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 rounded-lg transition-all duration-200 hover:bg-[#1c1c1c]"
            style={{ color: '#6b6860' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor: '#e0ddd6' }}>
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <div
              key={day}
              className="text-center py-3 text-xs font-medium uppercase tracking-wider"
              style={{ color: '#a09d96', fontFamily: 'Syne, sans-serif' }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {paddedDays.map((day, idx) => {
            if (!day) {
              return <div key={`pad-${idx}`} className="aspect-square border-b border-r" style={{ borderColor: '#e0ddd6' }} />
            }

            const dateStr = format(day, 'yyyy-MM-dd')
            const avail = getDayAvailability(day)
            const isHoliday = holidayDates.has(dateStr)
            const dayOfWeek = getDay(day)
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
            const isTodayDay = isToday(day)
            const isLoading = loading === dateStr
            const isDisabled = isWeekend || isHoliday
            const holiday = holidays.find(h => h.date === dateStr)

            return (
              <div
                key={dateStr}
                onClick={() => !isDisabled && handleDayClick(day)}
                className={cn(
                  'aspect-square border-b border-r relative flex flex-col items-center justify-center transition-all duration-150',
                  !isDisabled && 'cursor-pointer',
                  isDisabled && 'opacity-30',
                )}
                style={{
                  borderColor: '#e0ddd6',
                  background: avail
                    ? avail.type === 'cours' ? 'rgba(59,130,246,0.12)' : avail.type === 'tournage' ? 'rgba(249,115,22,0.12)' : 'rgba(16,185,129,0.12)'
                    : undefined,
                }}
                title={holiday ? holiday.name : undefined}
              >
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <div
                      className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: '#e63329', borderTopColor: 'transparent' }}
                    />
                  </div>
                )}

                {/* Today indicator */}
                {isTodayDay && (
                  <div
                    className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                    style={{ background: '#e63329' }}
                  />
                )}

                <span
                  className="text-sm font-medium"
                  style={{
                    fontFamily: 'Syne, sans-serif',
                    color: isTodayDay ? '#e63329' : isDisabled ? '#ccc9c0' : '#1a1a1a',
                  }}
                >
                  {format(day, 'd')}
                </span>

                {avail && (
                  <span className="text-xs mt-0.5" style={{ fontSize: '0.65rem' }}>
                    {AVAILABILITY_CONFIG[avail.type].emoji}
                  </span>
                )}

                {isHoliday && (
                  <span style={{ fontSize: '0.55rem', color: '#a09d96', marginTop: 2 }}>férié</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend + info */}
      <div className="flex items-center gap-6 text-xs" style={{ color: '#a09d96' }}>
        <div className="flex items-center gap-1.5">
          <Info size={11} />
          <span>Cliquer sur un jour marqué avec le même type le supprime</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {AVAILABILITY_TYPES.map(type => (
            <div key={type} className="flex items-center gap-1.5">
              <span>{AVAILABILITY_CONFIG[type].emoji}</span>
              <span>{AVAILABILITY_CONFIG[type].label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
