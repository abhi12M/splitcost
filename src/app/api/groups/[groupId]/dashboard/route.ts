import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/server"

async function loadDashboard(groupId: string) {
  if (!groupId) {
    return NextResponse.json(null, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.rpc("load_group_details", {
    group_id: groupId,
  })

  if (error || !data) {
    return NextResponse.json(null, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function GET(
  _req: Request,
  { params }: { params: { groupId: string } }
) {
  return loadDashboard(params.groupId)
}

// Kept for backward compatibility with any clients still issuing POST.
export async function POST(
  _req: Request,
  { params }: { params: { groupId: string } }
) {
  return loadDashboard(params.groupId)
}
