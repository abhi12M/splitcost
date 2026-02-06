import { supabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { groupId: string } }
) {
  const { data, error } = await supabaseAdmin
    .from("groups")
    .select(`
      id,
      name,
      currency,
      group_members (
        is_active,
        users ( id, name )
      )
    `)
    .eq("id", params.groupId)
    .eq("group_members.is_active", true)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    currency: data.currency,
    members: data.group_members.map((m: any) => ({
      id: m.users.id,
      name: m.users.name,
    })),
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { groupId: string } }
) {
  const { error } = await supabaseAdmin
    .from("groups")
    .delete()
    .eq("id", params.groupId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
