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
    const data = await clickupFetch(
      `https://api.clickup.com/api/v2/team/${TEAM_ID}/task?include_closed=true&subtasks=true&page=0`
    )

    const tasks = (data.tasks || []).slice(0, 5)

    const sample = tasks.map((t: any) => ({
      id: t.id,
      name: t.name,
      status: t.status?.status,
      date_updated: new Date(parseInt(t.date_updated)).toISOString(),
      custom_fields: t.custom_fields?.map((f: any) => ({
        name: f.name,
        type: f.type,
        value: f.value,
        type_config: f.type_config,
      })),
      tags: t.tags,
    }))

    return NextResponse.json({ total: data.tasks?.length, sample })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
