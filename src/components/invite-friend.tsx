"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui";

/**
 * "Invite a friend": copies a ready-made invitation — the service details plus
 * a link to the site — so it can be pasted straight into Messenger, Viber, or
 * a text.
 *
 * Deliberately not the phone's share sheet. The sheet hands the message to one
 * app and closes, which is the wrong shape for an invite people usually send to
 * several friends across several apps; a copied message pastes as many times as
 * they like.
 *
 * Clipboard access can be refused outright (an insecure origin, a locked-down
 * browser). When it is, the message is shown instead, pre-selected, so there is
 * always a way to get the text.
 */
export function InviteFriend({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);
  // Holds the full invitation once it has been built. Built on click rather
  // than during render: it needs `location.origin`, which does not exist when
  // this component is rendered on the server.
  const [manual, setManual] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  async function invite() {
    const text = `${message} ${window.location.origin}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setManual(text);
      // The textarea mounts on this same render, so select it on the next frame.
      requestAnimationFrame(() => box.current?.select());
    }
  }

  return (
    <div>
      <Button type="button" tone="outline" full onClick={invite}>
        {copied ? "Invite copied. Paste it anywhere." : "Invite a friend"}
      </Button>
      {/* Announced without moving focus, so a screen reader hears the result of
          a press that otherwise changes nothing on screen. */}
      <p aria-live="polite" className="sr-only">
        {copied ? "Invitation copied to the clipboard." : ""}
      </p>

      {manual !== null ? (
        <div className="mt-3">
          <label
            htmlFor="invite-message"
            className="label block text-ink-mute"
          >
            Copy this message
          </label>
          <textarea
            id="invite-message"
            ref={box}
            readOnly
            rows={4}
            value={manual}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1.5 w-full resize-none border border-hairline bg-paper p-3 text-[0.85rem] leading-relaxed text-ink-soft"
          />
        </div>
      ) : null}
    </div>
  );
}
