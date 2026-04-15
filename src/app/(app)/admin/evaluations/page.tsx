export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminEvaluationsClient from '@/components/admin/AdminEvaluationsClient'

export default async function AdminEvaluationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/calendar')

  const currentYear = new Date().getFullYear()
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)

  const { data: editors } = await supabase
    .from('profiles').select('*').eq('role', 'editor').order('name')

  const { data: evaluations } = await supabase
    .from('evaluations').select('*').order('submitted_at', { ascending: false })

  return (
    <AdminEvaluationsClient
      editors={editors || []}
      evaluations={evaluations || []}
      year={currentYear}
      currentQuarter={currentQuarter}
    />
  )
}
