import { format, getDaysInMonth, getDay, parseISO } from 'date-fns'

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getMonthWorkingDays(
  year: number,
  month: number,
  holidays: string[],
  courseDays: string[]
): number {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1))
  let workingDays = 0

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)
    const dayOfWeek = getDay(date)
    const dateStr = format(date, 'yyyy-MM-dd')

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isHoliday = holidays.includes(dateStr)
    const isCours = courseDays.includes(dateStr)

    if (!isWeekend && !isHoliday && !isCours) {
      workingDays++
    }
  }

  return workingDays
}

export function calculateMonthlyTarget(workingDays: number): number {
  return workingDays * 5
}

export function getQuarterFromMonth(month: number): number {
  return Math.ceil(month / 3)
}

export function getQuarterMonths(quarter: number): number[] {
  return [(quarter - 1) * 3 + 1, (quarter - 1) * 3 + 2, quarter * 3]
}

export function calculateBonusAmount(
  baseBonus: number,
  completionRate: number
): number {
  if (completionRate >= 100) return baseBonus
  if (completionRate >= 90) return baseBonus * 0.9
  if (completionRate >= 75) return baseBonus * 0.75
  if (completionRate >= 50) return baseBonus * 0.5
  return 0
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

export function getCompletionColor(rate: number): string {
  if (rate >= 100) return 'text-emerald-600'
  if (rate >= 75) return 'text-yellow-600'
  if (rate >= 50) return 'text-orange-500'
  return 'text-red-500'
}

export function getCompletionBg(rate: number): string {
  if (rate >= 100) return 'bg-emerald-500'
  if (rate >= 75) return 'bg-yellow-500'
  if (rate >= 50) return 'bg-orange-500'
  return 'bg-red-500'
}

export const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getCurrentQuarter(): number {
  return Math.ceil((new Date().getMonth() + 1) / 3)
}
