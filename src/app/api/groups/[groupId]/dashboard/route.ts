import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: { groupId: string } }
) {
  const groupId = params.groupId;

  if (!groupId) {
    return NextResponse.json(null, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("load_group_details", {
    group_id: groupId,
  });

  if (error || !data) {
    console.error("loadGroupDetails error:", error);
    return NextResponse.json(null, { status: 404 });
  }

 return NextResponse.json(data);

}
