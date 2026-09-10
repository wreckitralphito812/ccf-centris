"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

/**
 * "Invite a friend": opens the phone's share sheet with the service details and
 * a link to the site. Where there is no share sheet (most desktop browsers), it
 * copies the same text instead.
 */
export function InviteFriend({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

  async function invite() {
    const url = window.location.origin;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "CCF Centris", text: message, url });
        return;
      }
      await navigator.clipboard.writeText(`${message} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The share sheet was dismissed or clipboard access refused. Nothing to undo.
    }
  }

  return (
    <Button type="button" tone="outline" full onClick={invite} aria-live="polite">
      {copied ? "Invite copied" : "Invite a friend"}
    </Button>
  );
}
