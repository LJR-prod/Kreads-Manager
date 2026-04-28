import { NextResponse } from 'next/server'

const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN
const TEAM_ID = process.env.CLICKUP_TEAM_ID

async function clickupFetch(url: string) {
  const res = await fetch(url, {
    headers: { 'Authorization': CLICKUP_TOKEN!, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`ClickUp API error: ${res.status} - ${await res.text()}`)
  return res.json()
}

export async function GET() {
  try {
    // Cherche les tâches avec statut REVIEW CS
    let page = 0
    let reviewCSTasks: any[] = []

    while (page < 5) {
      const data = await clickupFetch(
        `https://api.clickup.com/api/v2/team/${TEAM_ID}/task?include_closed=true&subtasks=true&page=${page}`
      )
      const tasks = data.tasks || []
      if (tasks.length === 0) break

      const matching = tasks.filter((t: any) =>
        t.status?.status?.toLowerCase() === 'review cs'
      )
      reviewCSTasks = [...reviewCSTasks, ...matching]
      if (tasks.length < 100) break
      page++
    }

    // Prend la première tâche REVIEW CS trouvée et regarde son historique
    const sample = reviewCSTasks.slice(0, 2)
    const results = []

    for (const task of sample) {
      const fields = task.custom_fields || []
      const monteurField = fields.find((f: any) => f.name?.toLowerCase().includes('monteur'))
      const options = monteurField?.type_config?.options || []
      const selected = options.find((o: any) => o.orderindex === monteurField?.value)

      const activityData = await clickupFetch(
        `https://api.clickup.com/api/v2/task/${task.id}/activity`
      )
      const statusHistory = (activityData.history || [])
        .filter((h: any) => h.field === 'status')
        .map((h: any) => ({
          date: new Date(parseInt(h.date)).toISOString(),
          timestamp: parseInt(h.date),
          to: h.after?.status,
        }))

      results.push({
        taskId: task.id,
        taskName: task.name,
        currentStatus: task.status?.status,
        monteurName: selected?.name || null,
        statusHistory,
      })
    }

    return NextResponse.json({
      totalReviewCS: reviewCSTasks.length,
      pagesScanned: page + 1,
      results,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
