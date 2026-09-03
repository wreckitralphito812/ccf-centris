/**
 * CCF's real YouTube playlists, captured from youtube.com/@CCFmainTV/playlists.
 *
 * Playlist IDs are stable, so these are safe to hold. Titles and thumbnails
 * are refreshed live at request time by lib/youtube.ts, and the admin can add
 * or hide playlists without a code change.
 *
 * CCF names playlists in a consistent pattern:
 *   "2026 Sunday Message: <Series>"  the Sunday teaching itself
 *   "<Series> - Run Through"         the companion walkthrough
 *   "<Series> - Sunday Fast Track"   the short version
 *   "<Series> - Snippets"            clips
 *   "New Series: <Series>"           the trailer
 */

export type PlaylistKind =
  | "series"
  | "run_through"
  | "fast_track"
  | "snippets"
  | "trailer"
  | "podcast"
  | "special";

export interface ChannelPlaylist {
  id: string;
  /** CCF's own playlist title, verbatim. */
  title: string;
  /** The series name with CCF's prefixes stripped, for grouping. */
  series: string;
  kind: PlaylistKind;
  /** First video in the playlist, used for its cover image. */
  thumbVideo: string | null;
}

export const PLAYLIST_KIND_LABEL: Record<PlaylistKind, string> = {
  series: "Sunday series",
  run_through: "Run Through",
  fast_track: "Fast Track",
  snippets: "Snippets",
  trailer: "Trailer",
  podcast: "Podcast",
  special: "Special",
};

export const channelPlaylists: ChannelPlaylist[] = [
  { id: "PLEF9LZiq4G9w", title: "Ordinary People, Extraordinary God - Snippets", series: "Ordinary People, Extraordinary God", kind: "snippets", thumbVideo: "uZEtnrfoTqE" },
  { id: "PLAnVZng9uj5A", title: "Ordinary People, Extraordinary God - Run Through", series: "Ordinary People, Extraordinary God", kind: "run_through", thumbVideo: "NxwgYPWSIvg" },
  { id: "PLT6toul-hCiQ", title: "Ordinary People, Extraordinary God - Sunday Fast Track", series: "Ordinary People, Extraordinary God", kind: "fast_track", thumbVideo: "ruuvz_YsBSo" },
  { id: "PLcVmtEe6nfLo", title: "New Series: Ordinary People, Extraordinary God", series: "Ordinary People, Extraordinary God", kind: "trailer", thumbVideo: "1-jfgnG75is" },
  { id: "PLEDfCJdiGv2I", title: "Live Your Purpose; Go Beyond - Snippets", series: "Live Your Purpose; Go Beyond", kind: "snippets", thumbVideo: "5xboFp_cG1E" },
  { id: "PLV9KSMB0MTzU", title: "Live Your Purpose; Go Beyond - Run Through", series: "Live Your Purpose; Go Beyond", kind: "run_through", thumbVideo: "1ISWq99VT4g" },
  { id: "PLNLfC3Yf6f6c", title: "New Series: Live Your Purpose; Go Beyond", series: "Live Your Purpose; Go Beyond", kind: "trailer", thumbVideo: "hSSB066X_ck" },
  { id: "PLI0qH9R-trDc", title: "Live Your Purpose; Go Beyond - Sunday Fast Track", series: "Live Your Purpose; Go Beyond", kind: "fast_track", thumbVideo: "Kc7G9MivScc" },
  { id: "PLqi5r60EjU3D8GZukb_n4RanuOuiz1fYy", title: "Mid-Year Prayer and Fasting 2026", series: "Mid-Year Prayer and Fasting 2026", kind: "special", thumbVideo: "dghEAX3edDg" },
  { id: "PLe59s-sMyEhg", title: "Heart Songs - Run Through", series: "Heart Songs", kind: "run_through", thumbVideo: "bMaRSu3Vm8E" },
  { id: "PLa7xbj2l2xvk", title: "2026 Sunday Message: Heart Songs - Worship in the Psalms", series: "Heart Songs - Worship in the Psalms", kind: "series", thumbVideo: "BnhqcOfmsPA" },
  { id: "PLqi5r60EjU3DnzuG-mRosmtEeEGhfF4_A", title: "Are You Sure You Are Going to Heaven?", series: "Are You Sure You Are Going to Heaven?", kind: "special", thumbVideo: "ZQpNRDXNZtQ" },
  { id: "PLqi5r60EjU3DXCP3n8NjxrfURcCFdE2-G", title: "10 Commandments - Run Through", series: "10 Commandments", kind: "run_through", thumbVideo: "sDYLLT94U_s" },
  { id: "PLqi5r60EjU3CddDP9lxlSeiQJ6y5vfLm9", title: "2026 Sunday Message: 10 Commandments", series: "10 Commandments", kind: "series", thumbVideo: "DSBLz6tM-XI" },
  { id: "PLqi5r60EjU3B1dtMFFz8HkN-b8ODUKj03", title: "Spirit Comes, Church Goes - Run Through", series: "Spirit Comes, Church Goes", kind: "run_through", thumbVideo: "FcCRjN4gEuc" },
  { id: "PLqi5r60EjU3DGaRsSzlaldr2P1I18xSp0", title: "2026 Special Message - Spirit Comes, Church Goes", series: "Spirit Comes, Church Goes", kind: "special", thumbVideo: "7fSfgnK5Z88" },
  { id: "PLqi5r60EjU3B4ZzfZRVbh_nqFAhzHTadk", title: "2026 Holy Week Special - Run Through", series: "Holy Week Special", kind: "run_through", thumbVideo: "4fBgaN19aPk" },
  { id: "PLqi5r60EjU3Abu-sOd-NJMkbegL4YUO4i", title: "2026 Holy Week Special", series: "Holy Week Special", kind: "special", thumbVideo: "vu3zmjivYZw" },
  { id: "PLqi5r60EjU3Blt5EfV5Tnx41km2jgVK3m", title: "U\u0336n\u0336forgivable: A Story of Healing and Redemption (Holy Week 2026 Special Podcast)", series: "U\u0336n\u0336forgivable: A Story of Healing and Redemption (Holy Week 2026 Special Podcast)", kind: "podcast", thumbVideo: "WJY8xYjbDzM" },
  { id: "PLqi5r60EjU3CGF8_m5WP5u88PFrv1zbrP", title: "Eye Witness - Run Through", series: "Eye Witness", kind: "run_through", thumbVideo: "1emWUOefgMo" },
  { id: "PLqi5r60EjU3BY2p4v1wTOmW9D3si9ShUn", title: "2026 Sunday Message: Eye Witness", series: "Eye Witness", kind: "series", thumbVideo: "7wWM-CXhjg0" },
  { id: "PLqi5r60EjU3ClPk2x-PLUvfIYyHCVmSll", title: "Biblical Foundations", series: "Biblical Foundations", kind: "special", thumbVideo: "CWEFf1qi978" },
  { id: "PLqi5r60EjU3DRnNOfFVN42AU9WCy4xaBJ", title: "IDC 2026 Weekend - Run Through", series: "IDC 2026 Weekend", kind: "run_through", thumbVideo: "ZBp9u6yEZ5w" },
  { id: "PLqi5r60EjU3CJNdz9wazxsqZCZKI49Fvw", title: "2026 IDC 2026 Weekend Special", series: "IDC 2026 Weekend Special", kind: "special", thumbVideo: "hh3Yzmz8GCg" },
  { id: "PLqi5r60EjU3AtR0I_OimtyBs20e6SenXM", title: "Real Faith - Run Through", series: "Real Faith", kind: "run_through", thumbVideo: "haLSu8uepbI" },
  { id: "PLqi5r60EjU3D2ar8rwO_epiUplxcbzT3z", title: "CCF Around The Globe", series: "CCF Around The Globe", kind: "special", thumbVideo: "Ts1tYlQlF3Y" },
  { id: "PLqi5r60EjU3DQZa5xf-yUTLRMLQcrxzIY", title: "Prayer and Fasting 2026", series: "Prayer and Fasting 2026", kind: "special", thumbVideo: "HAYeBHehcfY" },
  { id: "PLqi5r60EjU3AiaPGlAI8alVNHioVj4v2W", title: "2026 Sunday Message: Real Faith", series: "Real Faith", kind: "series", thumbVideo: "8bzEsD0HTUg" },
  { id: "PLqi5r60EjU3C0YFPQzoJbSmMcAfulCYKZ", title: "Live Wisely - Run Through", series: "Live Wisely", kind: "run_through", thumbVideo: "-3bFAA7eu4s" },
  { id: "PLqi5r60EjU3BLIV7QPsFPPQtUdKO6JHSc", title: "2026 Special Message - Live Wisely", series: "Live Wisely", kind: "special", thumbVideo: null },];

/** Playlists grouped by the series they belong to, newest CCF series first. */
export function playlistsBySeries(): { series: string; items: ChannelPlaylist[] }[] {
  const groups = new Map<string, ChannelPlaylist[]>();
  for (const p of channelPlaylists) {
    groups.set(p.series, [...(groups.get(p.series) ?? []), p]);
  }
  return [...groups.entries()].map(([series, items]) => ({ series, items }));
}
