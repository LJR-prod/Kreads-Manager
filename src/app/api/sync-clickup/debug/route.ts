import { NextResponse } from 'next/server'

const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN
const TEAM_ID = process.env.CLICKUP_TEAM_ID

async function clickupFetch(url: string) {
  const res = await fetch(url, {
    headers: { 'Authorization': CLICKUP_TOKEN!, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`ClickUp API error: ${res.status}`)
  return res.json()
}

export async function GET() {
  try {
    // 1. Récupère quelques tâches avec un monteur assigné
    const data = await clickupFetch(
      `https://api.clickup.com/api/v2/team/${TEAM_ID}/task?include_closed=true&subtasks=true&page=0`
    )

    const tasks = (data.tasks || [])

    // Filtre les tâches qui ont un monteur assigné
    const tasksWithMonteur = tasks.filter((t: any) => {
      const fields = t.custom_fields || []
      const monteurField = fields.find((f: any) => f.name?.toLowerCase().includes('monteur'))
      return monteurField && monteurField.value !== null && monteurField.value !== undefined
    }).slice(0, 3)

    // Pour chaque tâche avec monteur, regarde l'historique
    const results = []
    for (const task of tasksWithMonteur) {
      const fields = task.custom_fields || []
      const monteurField = fields.find((f: any) => f.name?.toLowerCase().includes('monteur'))
      const options = monteurField?.type_config?.options || []
      const selected = options.find((o: any) => o.orderindex === monteurField?.value)

      // Récupère l'historique
      const activityData = await clickupFetch(
        `https://api.clickup.com/api/v2/task/${task.id}/activity`
      )
      const history = activityData.history || []
      const statusHistory = history
        .filter((h: any) => h.field === 'status')
        .map((h: any) => ({
          date: new Date(parseInt(h.date)).toISOString(),
          from: h.before?.status,
          to: h.after?.status,
        }))

      results.push({
        taskId: task.id,
        taskName: task.name,
        status: task.status?.status,
        monteurValue: monteurField?.value,
        monteurName: selected?.name,
        statusHistory,
      })
    }

    return NextResponse.json({ tasksTotal: tasks.length, tasksWithMonteur: tasksWithMonteur.length, results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
