import { ImageResponse } from "next/og";

import { SITE_NAME } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

async function getGroupName(groupId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("groups")
    .select("name")
    .eq("id", groupId)
    .maybeSingle();

  return data?.name || "Shared Group";
}

export default async function GroupOpenGraphImage({
  params,
}: {
  params: { groupId: string };
}) {
  const groupName = await getGroupName(params.groupId);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background:
            "linear-gradient(140deg, #0E2F47 0%, #134D75 40%, #1F7EB3 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: 16,
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            G
          </div>
          <div style={{ fontSize: 38, fontWeight: 700 }}>{SITE_NAME}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 30, color: "rgba(255,255,255,0.9)" }}>
            Shared Expense Group
          </div>
          <div
            style={{
              fontSize: 72,
              lineHeight: 1.08,
              fontWeight: 800,
              maxWidth: "95%",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {groupName}
          </div>
          <div
            style={{
              fontSize: 31,
              color: "rgba(255,255,255,0.92)",
              maxWidth: "90%",
            }}
          >
            Open the link to add expenses, track balances, and settle up.
          </div>
        </div>
      </div>
    ),
    size
  );
}
