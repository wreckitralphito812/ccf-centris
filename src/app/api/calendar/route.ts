import { eventFromIcsParam, icsFile } from "@/lib/calendar";

/**
 * "Apple or Outlook": the event's .ics as a real file (2026-10-10), so iPhone
 * Safari offers "Add to Calendar" instead of ignoring a data: link. The event
 * comes from the link icsHref built; anything else is refused.
 */
export function GET(request: Request) {
  const ev = eventFromIcsParam(new URL(request.url).searchParams.get("e"));
  if (!ev) return new Response("Not a calendar link from this site.", { status: 400 });
  const stamp = new Date(`${ev.date}T00:00:00+08:00`);
  return new Response(icsFile(ev, stamp), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ccf-centris.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
