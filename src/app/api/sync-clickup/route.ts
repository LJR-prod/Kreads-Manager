import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN
const TEAM_ID = process.env.CLICKUP_TEAM_ID

async function clickupFetch(url: string) {
  const res = await fetch(url, {
    headers: {
      'Authorization': CLICKUP_TOKEN!,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) throw new Error(`ClickUp API error: ${res.status}`)
  return res.json()
}

async function getAllTasks(): Promise<any[]> {
  let allTasks: any[] = []
  let page = 0

  while (page < 20) {
    const data = await clickupFetch(
      `https://api.clickup.com/api/v2/team/${TEAM_ID}/task?include_closed=true&subtasks=true&page=${page}`
    )
    const tasks = data.tasks || []
    allTasks = [...allTasks, ...tasks]
    if (tasks.length < 100) break
    page++
  }

  return allTasks
}

function getMonteurFromTask(task: any): string | null {
  const customFields = task.custom_fields || []
  const monteurField = customFields.find((f: any) =>
    f.name?.toLowerCase().includes('monteur')
  )
  if (!monteurField || monteurField.value === null || monteurField.value === undefined) {
    return null
  }
  const options = monteurField.type_config?.options || []
  const selected = options.find((o: any) => o.orderindex === monteurField.value)
  return selected?.name || null
}

function isInMonth(timestamp: string | number, month: number, year: number): boolean {
  const date = new Date(parseInt(String(timestamp)))
  return date.getMonth() + 1 === month && date.getFullYear() === year
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { month, year } = await request.json()
    if (!month || !year) return NextResponse.json({ error: 'month and year required' }, { status: 400 })

    const { data: editors } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'editor')

    if (!editors) return NextResponse.json({ error: 'No editors found' }, { status: 404 })

    const allTasks = await getAllTasks()

    const countByEditor: Record<string, number> = {}
    for (const editor of editors) countByEditor[editor.id] = 0

    const uniqueTasks = Array.from(
      new Map(allTasks.map((t: any) => [t.id, t])).values()
    )

    for (const task of uniqueTasks) {
      const monteurName = getMonteurFromTask(task)
      if (!monteurName) continue

      const editor = editors.find(e =>
        e.name.toLowerCase().trim() === monteurName.toLowerCase().trim()
      )
      if (!editor) continue

      const status = task.status?.status?.toLowerCase()

      // Compte si le statut actuel est "review cs"
      // OU si la tâche a été mise à jour ce mois-ci et a eu "review cs" comme statut
      const isReviewCS = status === 'review cs'
      const updatedThisMonth = task.date_updated && isInMonth(task.date_updated, month, year)
      const doneThisMonth = task.date_done && isInMonth(task.date_done, month, year)

      if (isReviewCS && (updatedThisMonth || doneThisMonth)) {
        countByEditor[editor.id] = (countByEditor[editor.id] || 0) + 1
      }
    }

    const results: Record<string, number> = {}
    for (const editor of editors) {
      const count = countByEditor[editor.id] || 0
      results[editor.name] = count

      await supabase
        .from('monthly_objectives')
        .upsert({
          editor_id: editor.id,
          year,
          month,
          actual_concepts: count,
        }, { onConflict: 'editor_id,year,month', ignoreDuplicates: false })
    }

    return NextResponse.json({ success: true, results, month, year, tasksScanned: uniqueTasks.length })
  } catch (error: any) {
    console.error('ClickUp sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
