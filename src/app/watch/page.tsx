import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Watch" };

export default function WatchIndex() {
  redirect("/watch/messages");
}
