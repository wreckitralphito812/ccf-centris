# Homepage restructure, nav simplification, and copy rewrite

**Date:** 2026-09-03
**Status:** Implemented, pending review

## Problem

Two complaints about the CCF Centris landing experience:

1. **The homepage had too many repetitive sections** (12). Several pairs said
   the same thing: two "watch a video" sections, two "find your people"
   sections, two "look at the building" sections, plus a standalone service
   band that duplicated state already in the hero.
2. **The nav had too many top-level groups** (7: Visit, Watch, Grow,
   Communities, Events, Serve, Centris) with overlapping contents — Grow vs
   Communities, Communities vs Visit (NXTGEN/Families in both), Serve vs
   Centris. A first-time visitor could not tell which door to open.

Separately, the user asked to **rewrite the site copy to be more appropriate**,
and supplied the real ccf.org.ph "Welcome to the family" page as a tone
reference.

## Audience decision

Optimize for the **first-time visitor**. The homepage's job is to get someone
who has never been to CCF Centris to either plan an in-person visit or worship
online, and to show them the shape of church life beyond Sunday. Regular-member
dashboards are explicitly out of scope (consistent with the earlier "no My CCF"
decision).

## Tone analysis (from ccf.org.ph)

CCF's real voice, observed from their "Welcome to the family" page:

- **Direct second-person address, present tense.** "You are more than welcome
  here." Speaks *to* a person, not about a demographic.
- **Sincere, never ironic.** No winking asides, no defensiveness ("no sign-up
  sheet" repeated three times in the old copy is off-voice).
- **Scripture is load-bearing** — claims are followed by verses.
- **Invitational imperatives** as calls to action: "Grow." "Join A Community."
  "Find a group that you can share life with."
- **House phrases:** "Christ-committed followers," "share life with," "grow more
  and more in Christ together," community framed as *not walking the road
  alone*.
- **Gentle and plain**, sentence-case headings, not terse editorial fragments.

The rewrite adopts this: removes every ironic/defensive line, leads sections
with invitational imperatives, keeps CCF's welcome line verbatim, and echoes
"never meant to walk this road alone" in the Dgroups copy.

## Navigation: 7 groups -> 4

New top level: **Visit - Watch - Get Involved - Centris**

| Group | href | Items |
|---|---|---|
| **Visit** | `/visit` | New here - Service times - Plan your visit - Getting here & parking - Coming with kids - Common questions |
| **Watch** | `/watch` | Watch live - Latest message - Messages & series - 4Ws guides |
| **Get Involved** | `/grow` | Find a Dgroup - How Dgroups work - NXTGEN - Elevate - B1G - Women - Men - Sports - Discipleship journey - GLC classes - Know Jesus - Serve & volunteer - Missions |
| **Centris** | `/centris` | Explore the center - Facilities - Play sports - Court availability - Reserve a space - Upcoming events |

Changes:

- **Communities** and **Serve** stop being top-level; they fold into **Get
  Involved** ("everything after your first Sunday").
- **Events** stops being top-level; it moves under **Centris** as "this
  location's calendar".
- **Visit** trimmed 7 -> 6: standalone "NXTGEN" removed ("Coming with kids"
  links there); "Directions" -> "Getting here & parking"; "FAQs" -> "Common
  questions".
- **Watch** trimmed 7 -> 4: "Sunday archive", "Series", "Speakers" roll into
  "Messages & series" (the pages still exist, reachable from `/watch` and
  `/watch/messages`).
- Mega-menu blurbs rewritten in CCF's voice. The Get Involved menu has 13
  items; the existing `sm:grid-cols-2 xl:grid-cols-3` panel handles this.
- Mobile sheet renders the same 4 `<details>` groups; no structural change.

Persistent CTAs (Watch live, Plan your visit) and search are unchanged.

## Homepage: 12 sections -> 8

New sequence:

1. **Welcome** (hero) — who we are + how to come. Absorbs the live / next
   service state as one line under the buttons (`ServiceLine`), replacing the
   standalone `NextUp` band.
2. **New here** — what your first Sunday is like. Three steps, rewritten warm.
3. **This week** — events at Centris. Copy touched only.
4. **Sunday's message** — the latest seeded teaching, **with the live
   CCF-channel upload folded in** as a small rail on the right (was the
   separate `FromTheChannel` section).
5. **Find your people** — **Dgroups (was `Together`) + life-stage communities
   (was `Communities`) merged.** Dgroups lead; communities are the grid below.
6. **The center** — **"Explore the center" + sports courts (was
   `PlayAtCentris`) merged.** Facilities grid, then a compact court-availability
   strip.
7. **Serve** — short teaser, rewritten.
8. **Where we are** — map + directions. Copy touched only.

Removed as standalone: `NextUp`, `FromTheChannel`, `Together`/`Communities`
split, `PlayAtCentris`. No page or route deleted — only homepage composition
changed.

## Copy rewrite highlights

| Location | Before | After |
|---|---|---|
| Hero body | "...right off the MRT." | Keeps CCF's verbatim welcome line, adds "Come as you are — we'd love to meet you this Sunday..." |
| New here lead | "...leave with as many questions as you arrived with." | "Come as you are — we'll take care of the rest, and someone will be glad to walk you in." |
| New here step 3 | "No pressure, no sign-up sheet." | "The prayer team is at the front if you'd like someone to pray with you, and there's a table where you can ask about joining a Dgroup..." |
| Dgroups heading | "Life is better together." | "We were never meant to walk this road alone." |
| Dgroups body | "...the centre of how CCF disciples people, not an add-on to Sunday." | "...real friendships with people committed to following Christ." |
| The center title | "3,200 square metres, built to be used" | "Room to gather, to learn, and to play" |
| Serve heading | "There's a place for you to serve." | "There's a place for you on a team." |

## Imagery

The user directed hotlinking real CCF imagery, accepting the
copyright/fragility trade-off for this pitch piece.

Findings: ccf.org.ph's WordPress media library holds mostly graphics and PDFs,
not photography. Web/Google image results for CCF worship photos live on
Instagram, Facebook, and Flickr — all of which block cross-origin hotlinking
and would render broken.

**What was done:** CCF's own YouTube channel (`@CCFmainTV`) thumbnails at
`https://i.ytimg.com/vi/<id>/maxresdefault.jpg` hotlink cleanly (permissive
CORS, already used elsewhere in this codebase). Eight real video IDs were
captured from the channel RSS feed (2026-09-03) into `src/lib/ccf-stills.ts` —
worship gatherings, Peter Tan-Chi teaching, the 42nd-anniversary piece.

- New `src/components/ccf-photo.tsx` — `<CcfPhoto>`, a client component that
  renders the hotlinked `<img>` and swaps to `MessageArt` on `onError`, so a
  rotated-out URL never shows a broken frame.
- `src/lib/ccf-stills.ts` — plain (non-client) module holding `CCF_STILLS` IDs
  and `ytThumb()`, importable from the server homepage.
- Wired into: hero collage (2 stills), "The center" facilities grid (one still
  per featured space). The seeded "Sunday's message" art stays `MessageArt`
  (it represents a specific seeded message, not a real upload).

All eight thumbnail URLs verified HTTP 200 at build time.

**Standing caveat:** these are CCF's content used without explicit permission;
they should be replaced with a CCF-supplied photo library before this is
anything more than a leadership pitch.

## Non-goals

- No route or page deletions.
- No member dashboard / personalization.
- No schema or query changes.
- No dark mode (system is light-only by design).

## Verification

`npm run build` — compiled successfully, TypeScript passed, 138/138 static
pages generated. The pre-existing `[youtube] playlists failed: 400` warning in
the archive builder is unrelated (missing API key) and does not affect the
homepage.
