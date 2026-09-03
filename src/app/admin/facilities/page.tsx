import type { Metadata } from "next";
import {
  AdminHeader,
  AdminNote,
  AdminPanel,
  RowActions,
  Stat,
  Status,
  Table,
  Td,
} from "../admin-ui";
import { getAddons, getFacilities } from "@/lib/queries";
import { fmtPeso } from "@/lib/format";

export const metadata: Metadata = { title: "Facilities" };

export default async function AdminFacilities() {
  const [facilities, addons] = await Promise.all([
    getFacilities(),
    getAddons(),
  ]);

  const courts = facilities.flatMap((f) => f.courts);
  const reservable = facilities.filter((f) => f.is_reservable);

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Facilities"
        lead="Spaces, courts, rates, hours, and the extras people can add to a booking."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Spaces" value={facilities.length} />
        <Stat label="Reservable" value={reservable.length} tone="moss" />
        <Stat label="Courts" value={courts.length} />
        <Stat label="Add-ons" value={addons.length} />
      </div>

      <AdminPanel title="Spaces">
        <Table
          columns={["Space", "Kind", "Capacity", "Hours", "Rate", "Booking", "Actions"]}
        >
          {facilities.map((f) => (
            <tr key={f.id}>
              <Td>
                <span className="font-semibold">{f.name}</span>
                {f.courts.length ? (
                  <span className="mt-0.5 block text-[0.82rem] text-ink-mute">
                    {f.courts.length} courts
                  </span>
                ) : null}
              </Td>
              <Td className="capitalize">{f.kind.replace(/_/g, " ")}</Td>
              <Td className="tabular-nums">{f.capacity ?? "—"}</Td>
              <Td className="tabular-nums">
                {f.open_time.slice(0, 5)}–{f.close_time.slice(0, 5)}
              </Td>
              <Td className="tabular-nums">
                {f.hourly_rate_cents === null
                  ? "—"
                  : f.hourly_rate_cents === 0
                    ? "Free"
                    : `${fmtPeso(f.hourly_rate_cents)}/hr`}
              </Td>
              <Td>
                <Status
                  value={
                    !f.is_reservable
                      ? "closed"
                      : f.requires_approval
                        ? "pending"
                        : "open"
                  }
                />
              </Td>
              <Td>
                <RowActions actions={["Edit", "Blackout", "Rates"]} />
              </Td>
            </tr>
          ))}
        </Table>
      </AdminPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Courts">
          <Table columns={["Court", "Sport", "Status"]}>
            {courts.map((c) => (
              <tr key={c.id}>
                <Td className="font-semibold">{c.name}</Td>
                <Td className="capitalize">{c.sport}</Td>
                <Td>
                  <Status value={c.is_active ? "open" : "closed"} />
                </Td>
              </tr>
            ))}
          </Table>
        </AdminPanel>

        <AdminPanel title="Booking add-ons">
          <Table columns={["Item", "Unit", "Price"]}>
            {addons.map((a) => (
              <tr key={a.id}>
                <Td className="font-semibold">{a.name}</Td>
                <Td className="text-ink-mute">{a.unit ?? "—"}</Td>
                <Td className="tabular-nums">{fmtPeso(a.price_cents)}</Td>
              </tr>
            ))}
          </Table>
        </AdminPanel>
      </div>

      <AdminNote>
        Blackout periods block inventory without creating a booking, so
        maintenance windows, CCF-wide events, and holidays keep the calendar
        honest rather than being managed by memory.
      </AdminNote>
    </div>
  );
}
