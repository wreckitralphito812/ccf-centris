import Link from "next/link";
import { getActiveAnnouncement } from "@/lib/queries";

const TONE = {
  info: "bg-bone text-ink",
  notice: "bg-sky text-paper-bright",
  urgent: "bg-clay text-paper-bright",
} as const;

/** A shape per level, so the three are told apart without relying on colour. */
function LevelIcon({ level }: { level: keyof typeof TONE }) {
  if (level === "urgent") {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 1 1 14h14L8 1Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M8 6v3.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="8" cy="12" r="0.9" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.75" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8 7.25v4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="8" cy="4.75" r="0.9" fill="currentColor" />
    </svg>
  );
}

export async function AnnouncementBar() {
  const a = await getActiveAnnouncement();
  if (!a) return null;

  return (
    <div
      className={TONE[a.level]}
      role={a.level === "urgent" ? "alert" : "status"}
    >
      <div className="mx-auto flex max-w-[110rem] flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 sm:px-8">
        <span className="label flex items-center gap-1.5">
          <LevelIcon level={a.level} />
          {a.title}
        </span>
        {a.body ? <p className="text-[0.85rem]">{a.body}</p> : null}
        {a.link_href ? (
          <Link
            href={a.link_href}
            className="link label ml-auto underline underline-offset-4 hover:opacity-70"
          >
            {a.link_label ?? "Read more"}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
