import { NextResponse } from 'next/server'

const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN
const TEAM_ID = process.env.CLICKUP_TEAM_ID

async function clickupFetch(url: string) {
  const res = await fetch(url, {
    headers: { 'Authorization': CLICKUP_TOKEN!, 'Content-Type': 'application/json' },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} - ${text}`)
  return JSON.parse(text)
}

export async function GET() {
  try {
    // Récupère les tâches page 0
    const data = await clickupFetch(
      `https://api.clickup.com/api/v2/team/${TEAM_ID}/task?include_closed=true&subtasks=true&page=0`
    )
    const tasks = data.tasks || []

    // Trouve une tâche avec monteur assigné
    const taskWithMonteur = tasks.find((t: any) => {
      const fields = t.custom_fields || []
      const f = fields.find((f: any) => f.name?.toLowerCase().includes('monteur'))
      return f && f.value !== null && f.value !== undefined
    })

    if (!taskWithMonteur) {
      return NextResponse.json({ error: 'No task with monteur found in page 0', total: tasks.length })
    }

    // Essaie différents endpoints pour l'historique
    const taskId = taskWithMonteur.id
    const endpoints = [
      `https://api.clickup.com/api/v2/task/${taskId}/activity`,
      `https://api.clickup.com/api/v2/task/${taskId}?include_subtasks=true`,
    ]

    const endpointResults: any[] = []
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: { 'Authorization': CLICKUP_TOKEN! },
        })
        const text = await res.text()
        endpointResults.push({ url, status: res.status, body: text.slice(0, 500) })
      } catch (e: any) {
        endpointResults.push({ url, error: e.message })
      }
    }

    return NextResponse.json({
      taskId,
      taskName: taskWithMonteur.name,
      taskStatus: taskWithMonteur.status?.status,
      endpointResults,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
