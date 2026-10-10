import type { DgroupInitial } from "./dgroup-form";
import type { RegisteredDgroup } from "@/lib/queries";

/** A registered Dgroup as the form's starting values. */
export function initialFrom(d: RegisteredDgroup): DgroupInitial {
  return {
    id: d.id,
    name: d.name,
    audience: d.audience,
    dayOfWeek: d.day_of_week,
    startTime: d.start_time,
    frequency: d.frequency,
    meetsWhere: d.meets_where,
    generalArea: d.general_area,
    currentSize: d.current_size,
    isOpen: d.is_open,
    leaderName: d.leader_name,
    leaderMobile: d.leader_mobile,
    coLeaderName: d.co_leader_name,
    uplineName: d.upline_name,
    uplineMobile: d.upline_mobile,
    description: d.description,
    status: d.status,
  };
}
