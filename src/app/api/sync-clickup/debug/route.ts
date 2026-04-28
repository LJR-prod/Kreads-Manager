import { NextResponse } from 'next/server'

const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN
const TEAM_ID = process.env.CLICKUP_TEAM_ID

export async function GET() {
  try {
    // Test 1 : vérifie que le token est valide
    const userRes = await fetch('https://api.clickup.com/api/v2/user', {
      headers: { 'Authorization': CLICKUP_TOKEN! },
    })
    const userData = await userRes.json()

    // Test 2 : liste les teams accessibles
    const teamsRes = await fetch('https://api.clickup.com/api/v2/team', {
      headers: { 'Authorization': CLICKUP_TOKEN! },
    })
    const teamsData = await teamsRes.json()

    return NextResponse.json({
      token_valid: userRes.ok,
      user: userData?.user?.username,
      teams: teamsData?.teams?.map((t: any) => ({ id: t.id, name: t.name })),
      configured_team_id: TEAM_ID,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
