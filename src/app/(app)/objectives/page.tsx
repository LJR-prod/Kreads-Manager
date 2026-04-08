export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ObjectivesClient from '@/components/objectives/ObjectivesClient'

export default async function ObjectivesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const currentYear = new Date().getFullYear()

  const { data: objectives } = await supabase
    .from('monthly_objectives')
    .select('*')
    .eq('editor_id', user.id)
    .eq('year', currentYear)
    .order('month', { ascending: true })

  const { data: availabilities } = await supabase
    .from('availabilities')
    .select('*')
    .eq('editor_id', user.id)

  const { data: holidays } = await supabase
    .from('french_holidays')
    .select('*')

  return (
    <ObjectivesClient
      profile={profile}
      initialObjectives={objectives || []}
      availabilities={availabilities || []}
      holidays={holidays || []}
      year={currentYear}
      isAdmin={profile?.role === 'admin'}
    />
  )
}
