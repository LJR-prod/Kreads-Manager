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

async function getAllTasks(month: number, year: number): Promise<any[]> {
  const startOfMonth = new Date(year, month - 1, 1).getTime()
  const endOfMonth = new Date(year, month, 0, 23, 59, 59).getTime()

  let allTasks: any[] = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const params = new URLSearchParams({
      page: String(page),
      include_closed: 'true',
      subtasks: 'true',
      date_updated_gt: String(startOfMonth),
      date_updated_lt: String(endOfMonth),
    })

    const data = await clickupFetch(
      `https://api.clickup.com/api/v2/team/${TEAM_ID}/task?${params}`
    )
    const tasks = data.tasks || []
    allTasks = [...allTasks, ...tasks]
    hasMore = tasks.length >= 100
    page++
  }

  return allTasks
}

// Récupère le nom du monteur depuis le champ custom dropdown "Monteur"
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

  return null
}

// Vérifie si une tâche a atteint REVIEW CS au moins une fois
async function taskReachedReviewCS(taskId: string): Promise<boolean> {
  try {
    const data = await clickupFetch(
      `https://api.clickup.com/api/v2/task/${taskId}/activity`
    )
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

    // Récupère toutes les tâches du mois
    const allTasks = await getAllTasks(month, year)

    // Initialise le compteur pour chaque monteur
    const countByEditor: Record<string, number> = {}
    for (const editor of editors) {
      countByEditor[editor.id] = 0
    }

    // Déduplique les tâches par ID
    const uniqueTasks = Array.from(
      new Map(allTasks.map((t: any) => [t.id, t])).values()
    )

    // Pour chaque tâche unique, vérifie si elle a atteint REVIEW CS
    for (const task of uniqueTasks) {
      const monteurName = getMonteurFromTask(task)
      if (!monteurName) continue

      // Trouve l'éditeur correspondant (comparaison insensible à la casse)
      const editor = editors.find(e =>
        e.name.toLowerCase().trim() === monteurName.toLowerCase().trim()
      )
      if (!editor) continue

      const reached = await taskReachedReviewCS(task.id)
      if (reached) {
        countByEditor[editor.id] = (countByEditor[editor.id] || 0) + 1
      }
    }

    // Met à jour actual_concepts dans Supabase pour chaque monteur
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

    return NextResponse.json({ success: true, results, month, year })
  } catch (error: any) {
    console.error('ClickUp sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
