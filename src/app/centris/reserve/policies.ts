import { PRIORITY_MEETINGS } from "@/lib/ministry-rooms";

/** Shown on the request page and accepted with one tick in the form. */
export const ROOM_POLICIES: [string, string][] = [
  ["Approval", "The facilities team checks every request and emails you to confirm. Please wait for that email before announcing your event."],
  ["Free for ministries", "Rooms are free for ministry use."],
  ["Set-up time", "Your time should include setting up and packing up, so the room is ready when people arrive and free for the next group."],
  ["Priority", `When requests clash, these come first: ${PRIORITY_MEETINGS.join("; ")}.`],
  ["Food", "Bringing your own food needs no permit. Catered food does, and the team will tell you how to get one."],
  ["Equipment", "Some equipment is still on its way. We'll tell you if something you asked for won't be ready on your date."],
  ["Leaving the room", "Put chairs and tables back as you found them and take your rubbish with you."],
  ["Changes", `If plans change, cancel from "My reservations" or email us as early as you can, so another ministry can use the room.`],
];
