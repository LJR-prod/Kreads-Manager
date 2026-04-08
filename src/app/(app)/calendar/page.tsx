export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendarClient from '@/components/calendar/CalendarClient'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: availabilities } = await supabase
    .from('availabilities')
    .select('*')
    .eq('editor_id', user.id)
    .order('date', { ascending: true })

  const { data: holidays } = await supabase
    .from('french_holidays')
    .select('*')

  return (
    <CalendarClient
      profile={profile}
      initialAvailabilities={availabilities || []}
      holidays={holidays || []}
    />
  )
}
