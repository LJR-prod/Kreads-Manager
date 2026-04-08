export type Role = 'admin' | 'editor'
export type AvailabilityType = 'cours' | 'tournage' | 'conge'

export interface Profile {
  id: string
  email: string
  name: string
  role: Role
  avatar_url?: string
  created_at: string
}

export interface Availability {
  id: string
  editor_id: string
  date: string
  type: AvailabilityType
  created_at: string
}

export interface MonthlyObjective {
  id: string
  editor_id: string
  year: number
  month: number
  target_concepts: number
  actual_concepts: number
  working_days: number
  created_at: string
  updated_at: string
}

export interface QuarterlyVariable {
  id: string
  editor_id: string
  year: number
  quarter: number
  objective_rate: number
  bonus_amount: number
  base_bonus: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface EvaluationLink {
  id: string
  token: string
  year: number
  quarter: number
  is_active: boolean
  created_at: string
}

export interface Evaluation {
  id: string
  link_id: string
  editor_id: string
  cs_name: string
  year: number
  quarter: number
  quality_score: number
  avoidable_returns_score: number
  communication_score: number
  deadline_score: number
  comment?: string
  submitted_at: string
}

export interface EditorQuarterlySummary {
  editor_id: string
  editor_name: string
  email: string
  year: number
  quarter: number
  total_target: number
  total_actual: number
  completion_rate: number
}

export interface FrenchHoliday {
  date: string
  name: string
}

export const AVAILABILITY_CONFIG = {
  cours: {
    label: 'Cours',
    emoji: '🎓',
    color: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
    dot: 'bg-blue-400',
  },
  tournage: {
    label: 'Tournage',
    emoji: '🎬',
    color: 'bg-orange-500/20 border-orange-500/50 text-orange-300',
    dot: 'bg-orange-400',
  },
  conge: {
    label: 'Congé',
    emoji: '🏖️',
    color: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
    dot: 'bg-emerald-400',
  },
} as const

export const QUARTER_MONTHS: Record<number, number[]> = {
  1: [1, 2, 3],
  2: [4, 5, 6],
  3: [7, 8, 9],
  4: [10, 11, 12],
}

export const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]
