import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN
const TEAM_ID = process.env.CLICKUP_TEAM_ID
const TARGET_STATUS = 'review cs'

async function clickupFetch(url: string) {
  const res = await fetch(url, {
    headers: {
      'Authorization': CLICKUP_TOKEN!,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) throw new Error(`ClickUp API error: ${res.status} ${url}`)
  return res.json()
}

// Récupère toutes les tâches d'un team avec pagination
async function getAllTasks(month: number, year: number): Promise<any[]> {
  const startOfMonth = new Date(year, month - 1, 1).getTime()
  const endOfMonth = new Date(year, month, 0, 23, 59, 59).getTime()

  let allTasks: any[] = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const url = `https://api.clickup.com/api/v2/team/${TEAM_ID}/task?` + new URLSearchParams({
      page: String(page),
      include_closed: 'true',
      date_updated_gt: String(startOfMonth),
      date_updated_lt: String(endOfMonth),
      subtasks: 'true',
    })

    const data = await clickupFetch(url)
    const tasks = data.tasks || []
    allTasks = [...allTasks, ...tasks]

    if (tasks.length < 100) {
      hasMore = false
    } else {
      page++
    }
  }

  return allTasks
}

// Vérifie si une tâche a atteint le statut REVIEW CS via son historique
async function taskReachedReviewCS(taskId: string): Promise<boolean> {
  try {
    const url = `https://api.clickup.com/api/v2/task/${taskId}/activity`
    const data = await clickupFetch(url)
    const history = data.history || []

    return history.some((entry: any) =>
      entry.field === 'status' &&
      entry.after?.status?.toLowerCase() === TARGET_STATUS
    )
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Vérifie que c'est un admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { month, year } = await request.json()
    if (!month || !year) return NextResponse.json({ error: 'month and year required' }, { status: 400 })

    // Récupère les monteurs depuis Supabase
    const { data: editors } = await supabase.from('profiles').select('id, name').eq('role', 'editor')
    if (!editors) return NextResponse.json({ error: 'No editors found' }, { status: 404 })

    // Récupère toutes les tâches du mois
    const allTasks = await getAllTasks(month, year)

    // Pour chaque monteur, compte les tâches qui ont atteint REVIEW CS
    const results: Record<string, number> = {}

    for (const editor of editors) {
      const editorName = editor.name.toLowerCase()

      // Filtre les tâches taguées avec le nom du monteur
      const editorTasks = allTasks.filter((task: any) => {
        const tags = task.tags || []
        return tags.some((tag: any) => tag.name?.toLowerCase() === editorName)
      })

      // Déduplique par ID et vérifie l'historique
      const uniqueTaskIds = [...new Set(editorTasks.map((t: any) => t.id))]
      let count = 0

      for (const taskId of uniqueTaskIds) {
        const reached = await taskReachedReviewCS(taskId as string)
        if (reached) count++
      }

      results[editor.id] = count

      // Met à jour actual_concepts dans Supabase
      await supabase
        .from('monthly_objectives')
        .upsert({
          editor_id: editor.id,
          year,
          month,
          actual_concepts: count,
        }, { onConflict: 'editor_id,year,month', ignoreDuplicates: false })
    }

    return NextResponse.json({ success: true, results, month, year })
  } catch (error: any) {
    console.error('ClickUp sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
