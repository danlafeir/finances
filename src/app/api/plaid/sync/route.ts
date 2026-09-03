import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncConnection, syncAllConnections } from "@/lib/plaid/sync";

export async function POST(request: Request) {
  let connectionId: string | undefined;
  try {
    const body = await request.json();
    connectionId = body?.connectionId;
  } catch {
    // No JSON body — sync everything.
  }

  const summaries = connectionId ? [await syncConnection(connectionId)] : await syncAllConnections();

  revalidatePath("/connections");
  revalidatePath("/accounts");
  revalidatePath("/investments");
  revalidatePath("/dashboard");
  revalidatePath("/spending");

  return NextResponse.json({ summaries });
}
