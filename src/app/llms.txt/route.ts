import { CONTACT, GIVE_URL, MAPS_PLACE, PARKING, SERVICE_TIMES_TEXT, SITE, SOCIALS, YOUTUBE } from "@/lib/site";
import { getUpcomingEvents } from "@/lib/queries";

/** Upcoming events are listed, so it is rebuilt hourly. */
export const revalidate = 3600;

/**
 * /llms.txt (2026-11-14): a plain-text summary of the church for AI
 * assistants (ChatGPT, Claude, Perplexity and the like), following
 * llmstxt.org. They answer "what time is the service" from short, plain
 * facts far more reliably than from a styled page. Everything here is read
 * from lib/site.ts and the events list, so it can't drift from the site.
 */
export async function GET() {
  const base = SITE.url.replace(/\/$/, "");
  const events = await getUpcomingEvents(10).catch(() => []);
  const date = new Intl.DateTimeFormat("en-PH", {
    timeZone: SITE.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const socials = [
    SOCIALS.facebook && `- Facebook: ${SOCIALS.facebook}`,
    SOCIALS.instagram && `- Instagram: ${SOCIALS.instagram}`,
    `- YouTube (CCF-wide channel): ${YOUTUBE.channelUrl}`,
  ].filter(Boolean);

  const text = `# ${SITE.name}

> ${SITE.name} is a Christian church in Quezon City, Philippines: a satellite of ${SITE.parent} (CCF). Sunday worship services are at ${SERVICE_TIMES_TEXT} (Philippine time). Everyone is welcome; there is no registration and no dress code.

## Key facts

- Address: ${SITE.addressLines.join(", ")}, Metro Manila, Philippines
- Map pin: ${MAPS_PLACE}
- Sunday services: ${SERVICE_TIMES_TEXT}, every Sunday, in the Main Worship Hall
- Nearest train: MRT-3 Quezon Avenue station, connected to Eton Centris by a walkway
- Parking: ${PARKING.name} (rates are set by the mall)
${CONTACT.officeHours ? `- Office hours: ${CONTACT.officeHours}\n` : ""}- Contact: Facebook Messenger at ${CONTACT.messenger}
- Parent church: ${SITE.parent}, https://www.ccf.org.ph

## Pages

- [Visit](${base}/visit): service times, directions by car and by train, and where to park
- [Watch](${base}/watch): last Sunday's message and this week's 4Ws discussion guide
- [4Ws guides](${base}/watch/4ws): CCF's weekly small-group discussion guides (Welcome, Worship, Word, Works)
- [Events](${base}/events): upcoming events, classes and sports fellowships
- [Join a Dgroup](${base}/grow/join-a-dgroup): what a Dgroup (CCF's weekly small group) is and how to join one
- [Connect](${base}/connect): join a Dgroup, volunteer, and social accounts
- [Prayer Wall](${base}/prayer-wall): post a prayer request and pray for others
- [Reserve](${base}/reserve): book a Dgroup table, request a ministry room, or rent a court
- [Give](${base}/give): tithes and offerings, through CCF's giving page (${GIVE_URL})
- [About](${base}/about): what CCF believes and how CCF Centris fits in
- [Contact](${base}/contact): how to reach the team
${
  events.length
    ? `\n## Upcoming events\n\n${events
        .map((e) => `- [${e.title}](${base}/events/${e.slug}): ${date.format(new Date(e.starts_at))}${e.location_note ? `, ${e.location_note}` : ""}`)
        .join("\n")}\n`
    : ""
}
## Social

${socials.join("\n")}
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
