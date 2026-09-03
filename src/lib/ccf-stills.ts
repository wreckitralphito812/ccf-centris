/**
 * Real CCF YouTube video IDs, pulled from the @CCFmainTV channel feed
 * (2026-09-03). These are CCF's own worship, teaching, and anniversary stills,
 * used as stand-in photography until CCF supplies a photo library for CCF
 * Centris. Thumbnail URL shape:
 *
 *   https://i.ytimg.com/vi/<id>/maxresdefault.jpg
 *
 * i.ytimg.com serves these with permissive CORS, so they hotlink cleanly.
 */
export const CCF_STILLS = {
  anniversary: "AhX9vzr5rZQ", // Ordinary People, Extraordinary God | CCF 42nd Anniversary
  shepherd: "1-jfgnG75is", // Our Extraordinary God Is Our Shepherd | Peter Tan-Chi | Aug 30 2026
  runThrough: "NxwgYPWSIvg", // Our Extraordinary God Is Our Shepherd | Run Through
  mission: "-unSNWc5C_4", // God Has A Mission For You
  care: "AtTthJEGWHY", // Do You Want To Experience God's Care? | Sunday Fast Track
  fortyTwoYears: "-mVdTxnLA5M", // How has God shepherded CCF through 42 years?
  faithfulness: "cxe_O-FLPlU", // Your Faithfulness Won't Be Wasted
  grow: "POxCmsqUtJ8", // How can we grow in knowing and trusting Jesus?
} as const;

export function ytThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
}
