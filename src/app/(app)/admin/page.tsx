export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboardClient from '@/components/admin/AdminDashboardClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/calendar')

  const currentYear = new Date().getFullYear()
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)

  const { data: editors } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'editor')
    .order('name')

  const { data: allObjectives } = await supabase
    .from('monthly_objectives')
    .select('*')
    .eq('year', currentYear)

  const { data: allAvailabilities } = await supabase
    .from('availabilities')
    .select('*')

  const { data: quarterlyVariables } = await supabase
    .from('quarterly_variables')
    .select('*')
    .eq('year', currentYear)

  const { data: holidays } = await supabase.from('french_holidays').select('*')

  const { data: evalLinks } = await supabase
    .from('evaluation_links')
    .select('*')
    .eq('year', currentYear)

  const { data: evaluations } = await supabase
    .from('evaluations')
    .select('*')
    .eq('year', currentYear)
    .eq('quarter', currentQuarter)

  return (
    <AdminDashboardClient
      editors={editors || []}
      allObjectives={allObjectives || []}
      allAvailabilities={allAvailabilities || []}
      quarterlyVariables={quarterlyVariables || []}
      holidays={holidays || []}
      evalLinks={evalLinks || []}
      evaluations={evaluations || []}
      year={currentYear}
      currentQuarter={currentQuarter}
    />
  )
}
