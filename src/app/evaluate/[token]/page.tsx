export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EvaluationFormClient from '@/components/evaluation/EvaluationFormClient'

interface EvaluatePageProps {
  params: Promise<{ token: string }>
}

export default async function EvaluatePage({ params }: EvaluatePageProps) {
  const { token } = await params
  const supabase = await createClient()

  const { data: link } = await supabase
    .from('evaluation_links')
    .select('*')
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (!link) notFound()

  const { data: editors } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('role', 'editor')
    .order('name')

  return (
    <EvaluationFormClient
      link={link}
      editors={editors || []}
    />
  )
}
