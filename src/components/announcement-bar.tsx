import Link from "next/link";
import { getActiveAnnouncement } from "@/lib/queries";

const TONE = {
  info: "bg-bone text-ink",
  notice: "bg-sky text-paper-bright",
  urgent: "bg-clay text-paper-bright",
} as const;

export async function AnnouncementBar() {
  const a = await getActiveAnnouncement();
  if (!a) return null;

  return (
    <div className={TONE[a.level]} role="status">
      <div className="mx-auto flex max-w-[110rem] flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 sm:px-8">
        <span className="label opacity-70">{a.title}</span>
        {a.body ? <p className="text-[0.85rem]">{a.body}</p> : null}
        {a.link_href ? (
          <Link
            href={a.link_href}
            className="label ml-auto underline underline-offset-4 hover:opacity-70"
          >
            {a.link_label ?? "Read more"}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
