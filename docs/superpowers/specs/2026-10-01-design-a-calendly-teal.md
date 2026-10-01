# Design A: Calendly, in CCF teal, with colour glows

Date: 2026-10-01. Ralph's pick from three directions (mockups in
`.superpowers/brainstorm/`, not committed): "A plus colour glows". He asked
for a look patterned on Calendly, sharper and less soft and bland, and
allowed moving away from the CCF Brand Book as long as the CCF DNA (the
teal) stays.

## Type

- **Manrope** replaces Montserrat site-wide. It's the closest free match to
  Calendly's Gilroy. Weights 400–800.
- Headings are bold (700); the hero is 800. Body is 400–500.

## Colour (CCF teal is the primary)

| Token | Value | Role |
|---|---|---|
| `ink` | `#0d2b3a` | Text and headings: deep navy-teal, not black (Calendly's navy move) |
| `ink-soft` | `#2b4654` | Body copy |
| `ink-mute` | `#4d6878` | Secondary text |
| `clay` | `#007a87` | Primary actions and links: a brighter CCF teal (5.1:1 on white, 4.6:1 on `mist`) |
| `clay-deep` | `#006a76` | Hover |
| `brand-teal` | `#00a6b6` | Glows and large shapes |
| `paper` | `#f8fafb` | Page canvas |
| `hairline` / `edge` | `#dbe5ea` | Card, input and choice borders |
| `mist` | `#f1f5f7` | Input fills |
| `clay-wash` | `#e2f3f5` | Badges, open days |
| `night` | `#0b2532` | The dark footer, navy-teal |
| `sky` | `#7d1235` | CCF maroon: the second glow, errors, Awaiting approval |

## Shape

- **Buttons:** 8px corners, not pills. Icon buttons (−/+, arrows) stay round.
- **Inputs and choices:** 8px corners.
- **Cards:** 16px corners, a crisp 1px `hairline` border, and a soft three-layer
  shadow.
- **Badges and date circles:** stay round.

## Texture

- **Faint dot grid** on the page canvas, behind sections. White cards cover it.
- The old paper grain goes: it softened everything.
- **Colour glows:** blurred teal and maroon shapes behind the home welcome
  frame and in the page headers, in place of the teal wash.

## Unchanged

- Page structure and flows.
- The dark footer.
- The logo files (the brand book forbids recolouring them).

## Delivery

One PR. Ralph previews locally (phone and laptop) before it merges.
