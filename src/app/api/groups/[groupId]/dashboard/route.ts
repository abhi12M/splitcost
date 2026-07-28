import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/server"
import { reconcileExpenseAttachmentReference } from "@/lib/supabase/attachments"

type DashboardExpenseWithAttachment = {
  id?: string
  attachment_data_url?: string | null
  attachmentDataUrl?: string | null
}

type DashboardPayload = {
  expenses?: DashboardExpenseWithAttachment[]
}

async function cleanMissingAttachmentReferences<T extends DashboardPayload>(
  dashboard: T
) {
  if (!Array.isArray(dashboard.expenses)) {
    return dashboard
  }

  const expenses = await Promise.all(
    dashboard.expenses.map(async (expense) => {
      const attachmentValue =
        expense.attachment_data_url ?? expense.attachmentDataUrl

      if (!expense.id || !attachmentValue) {
        return expense
      }

      const reference = await reconcileExpenseAttachmentReference(
        expense.id,
        attachmentValue
      )

      if (reference.status !== "missing") {
        return expense
      }

      return {
        ...expense,
        attachment_data_url: null,
        attachmentDataUrl: null,
      }
    })
  )

  return {
    ...dashboard,
    expenses,
  }
}

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

  return NextResponse.json(await cleanMissingAttachmentReferences(data))
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
