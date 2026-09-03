import type { Metadata } from "next";
import { AdminHeader, AdminNote, AdminPanel, Stat, Table, Td } from "../admin-ui";

export const metadata: Metadata = { title: "Analytics" };

/**
 * Privacy-conscious analytics.
 *
 * Deliberately excludes anything that would turn spiritual activity into a
 * scoreboard. No per-person attendance, no giving amounts by member, no
 * "engagement scores". What is measured is operational: does the building get
 * used, do people find what they came for, where does a journey break down.
 */
export default function AdminAnalytics() {
  return (
    <div className="space-y-8">
      <AdminHeader
        title="Analytics"
        lead="Operational measures only. Nothing here ranks people or tracks individual spiritual activity."
      />

      <AdminPanel title="Digital">
        <div className="grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Homepage visits" value="8,412" note="Last 30 days" />
          <Stat label="Live viewers, peak" value="1,180" note="Last Sunday" />
          <Stat label="Message views" value="3,905" note="Last 30 days" />
          <Stat label="4Ws downloads" value="642" note="Last 30 days" />
        </div>
      </AdminPanel>

      <AdminPanel title="Where journeys end">
        <Table columns={["Journey", "Started", "Completed", "Rate"]}>
          {[
            ["Plan a visit", "1,204", "486", "40%"],
            ["Dgroup enquiry", "612", "173", "28%"],
            ["Event registration", "988", "731", "74%"],
            ["Court reservation", "1,507", "1,109", "74%"],
            ["Volunteer application", "244", "58", "24%"],
          ].map(([j, s, c, r]) => (
            <tr key={j}>
              <Td className="font-semibold">{j}</Td>
              <Td className="tabular-nums">{s}</Td>
              <Td className="tabular-nums">{c}</Td>
              <Td className="tabular-nums">{r}</Td>
            </tr>
          ))}
        </Table>
      </AdminPanel>

      <AdminPanel title="Facilities">
        <div className="grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Court utilisation" value="63%" note="Weekly average" />
          <Stat label="Peak hours" value="6–9 PM" note="Weeknights" />
          <Stat label="Cancellation rate" value="9%" />
          <Stat label="No-show rate" value="4%" tone="clay" />
        </div>
        <Table columns={["Space", "Hours booked", "Utilisation", "Most requested for"]}>
          {[
            ["Sports Hall, all courts", "412", "63%", "Evening open play"],
            ["Multipurpose Hall 1", "96", "38%", "GLC classes"],
            ["Multipurpose Hall 2", "112", "44%", "Ministry trainings"],
            ["Multipurpose Hall 3", "74", "29%", "Team meetings"],
            ["Multipurpose Hall 4", "51", "20%", "Prayer and counselling"],
            ["Dgroup Lounge", "168", "67%", "Weeknight Dgroups"],
          ].map(([s, h, u, m]) => (
            <tr key={s}>
              <Td className="font-semibold">{s}</Td>
              <Td className="tabular-nums">{h}</Td>
              <Td className="tabular-nums">{u}</Td>
              <Td className="text-ink-soft">{m}</Td>
            </tr>
          ))}
        </Table>
      </AdminPanel>

      <AdminPanel title="Community">
        <div className="grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Dgroup enquiries" value="173" note="Last 30 days" />
          <Stat label="Event attendance" value="2,841" note="Across all events" />
          <Stat label="GLC registrations" value="83" note="This term" />
          <Stat label="Volunteers active" value="147" note="Served in last 60 days" />
        </div>
      </AdminPanel>

      <AdminNote>
        What is deliberately absent: individual attendance records, giving
        amounts by person, engagement scores, and any leaderboard. Those would
        turn discipleship into a metric, which is the opposite of what this
        platform is for. Figures shown here are illustrative.
      </AdminNote>
    </div>
  );
}
