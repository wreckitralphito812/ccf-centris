import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLatestMessage } from "@/lib/queries";

/** Live from CCF's channel: refresh hourly so new messages appear
 *  without a redeploy. */
export const revalidate = 3600;


export const metadata: Metadata = {
  title: "Latest message",
  description: "The most recent message from CCF Centris.",
};

export default async function LatestPage() {
  const m = await getLatestMessage();
  redirect(m ? `/watch/messages/${m.slug}` : "/watch/messages");
}
