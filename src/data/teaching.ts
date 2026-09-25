import type { FourWs, Message, Series, Speaker } from "@/lib/types";
import { CCF_STILLS } from "@/lib/ccf-stills";

/**
 * Representative teaching content. Every record here is demo data standing in
 * for what CCF Centris staff will publish through the admin. Nothing in this
 * file should be read as a confirmed schedule or an actual message.
 *
 * Each message is backed by a real CCF video from @CCFmainTV so its card shows
 * the actual YouTube thumbnail and links to a genuine message. The pairing is
 * thematic, not exact — the seed titles are invented — and is replaced with
 * real per-message ids once CCF publishes through the admin.
 */

/** Real CCF video ids to draw message thumbnails from, keyed by seed series. */
const SERIES_VIDEOS: Record<string, string[]> = {
  "ordinary-people-extraordinary-god": [
    CCF_STILLS.shepherd,
    CCF_STILLS.anniversary,
    CCF_STILLS.mission,
    CCF_STILLS.fortyTwoYears,
    CCF_STILLS.runThrough,
  ],
  "first-things": [
    CCF_STILLS.grow,
    CCF_STILLS.faithfulness,
    CCF_STILLS.care,
    CCF_STILLS.mission,
  ],
  "the-long-obedience": [
    CCF_STILLS.faithfulness,
    CCF_STILLS.grow,
    CCF_STILLS.shepherd,
    CCF_STILLS.care,
  ],
  household: [
    CCF_STILLS.care,
    CCF_STILLS.grow,
    CCF_STILLS.faithfulness,
    CCF_STILLS.anniversary,
    CCF_STILLS.mission,
  ],
};

const seriesIndex: Record<string, number> = {};
function videoForSeries(seriesSlug: string): string {
  const pool = SERIES_VIDEOS[seriesSlug] ?? Object.values(CCF_STILLS);
  const n = seriesIndex[seriesSlug] ?? 0;
  seriesIndex[seriesSlug] = n + 1;
  return pool[n % pool.length];
}

export const speakers: Speaker[] = [
  {
    id: "spk-1",
    slug: "peter-tan-chi",
    name: "Peter Tan-Chi",
    role_title: "Founder and Senior Pastor, CCF",
    bio: "Founded Christ's Commission Fellowship in 1984 with a burden for discipleship. Teaches regularly across CCF centers.",
    photo_url: null,
  },
  {
    id: "spk-2",
    slug: "joby-soriano",
    name: "Joby Soriano",
    role_title: "Centris Center Pastor",
    bio: "Leads the pastoral team at CCF Centris and oversees Dgroup multiplication across Quezon City.",
    photo_url: null,
  },
  {
    id: "spk-3",
    slug: "ronnel-de-guzman",
    name: "Ronnel de Guzman",
    role_title: "Elevate Pastor",
    bio: "Shepherds students and young leaders through Elevate at Centris.",
    photo_url: null,
  },
  {
    id: "spk-4",
    slug: "grace-alcantara",
    name: "Grace Alcantara",
    role_title: "Women's Ministry Lead",
    bio: "Teaches and disciples women across life stages at CCF Centris.",
    photo_url: null,
  },
  {
    id: "spk-5",
    slug: "mark-villanueva",
    name: "Mark Villanueva",
    role_title: "B1G Pastor",
    bio: "Leads B1G, the single adults community, and the Centris sports ministry.",
    photo_url: null,
  },
];

export const series: Series[] = [
  {
    id: "ser-1",
    slug: "ordinary-people-extraordinary-god",
    title: "Ordinary People, Extraordinary God",
    subtitle: "CCF's 42nd anniversary series",
    description:
      "The series CCF is teaching through its 42nd anniversary season, and the one CCF Centris opens with. Ordinary people, an extraordinary God, and what he does through them.",
    artwork_url: null,
    starts_on: "2026-08-02",
    ends_on: "2026-09-27",
  },
  {
    id: "ser-2",
    slug: "first-things",
    title: "First Things",
    subtitle: "Building a life in the right order",
    description:
      "What we put first shapes everything after it. A study in priorities, from Haggai to the Sermon on the Mount.",
    artwork_url: null,
    starts_on: "2026-06-07",
    ends_on: "2026-07-26",
  },
  {
    id: "ser-3",
    slug: "the-long-obedience",
    title: "The Long Obedience",
    subtitle: "Psalms of ascent",
    description:
      "Fifteen short psalms sung on the road to Jerusalem, and what they teach about staying faithful over decades.",
    artwork_url: null,
    starts_on: "2026-04-05",
    ends_on: "2026-05-31",
  },
  {
    id: "ser-4",
    slug: "household",
    title: "Household",
    subtitle: "Faith that fits under one roof",
    description:
      "Marriage, parenting, singleness, and the ordinary work of loving the people closest to you.",
    artwork_url: null,
    starts_on: "2026-02-01",
    ends_on: "2026-03-29",
  },
];

const seriesBySlug = Object.fromEntries(series.map((s) => [s.slug, s]));
const speakerBySlug = Object.fromEntries(speakers.map((s) => [s.slug, s]));

interface RawMessage {
  slug: string;
  title: string;
  description: string;
  scripture: string;
  preached_on: string;
  duration: number;
  series: string;
  speaker: string;
  topics: string[];
  books: string[];
  video?: string;
}

const raw: RawMessage[] = [
  {
    slug: "the-ground-you-stand-on",
    title: "The Ground You Stand On",
    description:
      "Moses turned aside to look at a bush that would not burn up, and the ground under his feet changed. What makes a place holy is not the place.",
    scripture: "Exodus 3:1-15",
    preached_on: "2026-08-30",
    duration: 2410,
    series: "ordinary-people-extraordinary-god",
    speaker: "joby-soriano",
    topics: ["presence", "calling", "worship"],
    books: ["Exodus"],
  },
  {
    slug: "take-off-your-sandals",
    title: "Take Off Your Sandals",
    description:
      "Reverence is not a mood. It is a posture, and it changes how we come to God and how we treat each other.",
    scripture: "Exodus 3:5, Isaiah 6:1-8",
    preached_on: "2026-08-23",
    duration: 2280,
    series: "ordinary-people-extraordinary-god",
    speaker: "peter-tan-chi",
    topics: ["worship", "reverence", "humility"],
    books: ["Exodus", "Isaiah"],
  },
  {
    slug: "a-place-to-belong",
    title: "A Place to Belong",
    description:
      "The early church met in homes before it met in halls. Why the room matters less than the people in it.",
    scripture: "Acts 2:42-47",
    preached_on: "2026-08-16",
    duration: 2155,
    series: "ordinary-people-extraordinary-god",
    speaker: "joby-soriano",
    topics: ["community", "dgroup", "belonging"],
    books: ["Acts"],
  },
  {
    slug: "when-god-feels-far",
    title: "When God Feels Far",
    description:
      "Anxiety, silence, and the long stretches where nothing seems to move. What the Psalms do with that.",
    scripture: "Psalm 13, Psalm 42",
    preached_on: "2026-08-09",
    duration: 2520,
    series: "ordinary-people-extraordinary-god",
    speaker: "grace-alcantara",
    topics: ["anxiety", "doubt", "prayer", "suffering"],
    books: ["Psalms"],
  },
  {
    slug: "opening-sunday",
    title: "Opening Sunday at Centris",
    description:
      "The first gathering at CCF Centris, and why a new center is really about the people it will send out.",
    scripture: "Matthew 28:18-20",
    preached_on: "2026-08-02",
    duration: 2680,
    series: "ordinary-people-extraordinary-god",
    speaker: "peter-tan-chi",
    topics: ["mission", "discipleship", "commission"],
    books: ["Matthew"],
  },
  {
    slug: "consider-your-ways",
    title: "Consider Your Ways",
    description:
      "Haggai told a distracted people to look honestly at where their effort was going. The question still lands.",
    scripture: "Haggai 1:1-11",
    preached_on: "2026-07-26",
    duration: 2340,
    series: "first-things",
    speaker: "joby-soriano",
    topics: ["priorities", "work", "money"],
    books: ["Haggai"],
  },
  {
    slug: "seek-first",
    title: "Seek First",
    description:
      "Jesus names worry directly, then gives an instruction that reorders everything underneath it.",
    scripture: "Matthew 6:25-34",
    preached_on: "2026-07-19",
    duration: 2260,
    series: "first-things",
    speaker: "peter-tan-chi",
    topics: ["anxiety", "priorities", "trust"],
    books: ["Matthew"],
  },
  {
    slug: "the-cost-of-second-place",
    title: "The Cost of Second Place",
    description:
      "Good things become heavy things when they take first position. A look at what competes for the center.",
    scripture: "Exodus 20:1-6",
    preached_on: "2026-07-12",
    duration: 2190,
    series: "first-things",
    speaker: "mark-villanueva",
    topics: ["idolatry", "priorities"],
    books: ["Exodus"],
  },
  {
    slug: "money-and-the-heart",
    title: "Money and the Heart",
    description:
      "Generosity is not a budgeting technique. It is evidence of where trust actually rests.",
    scripture: "2 Corinthians 9:6-15",
    preached_on: "2026-07-05",
    duration: 2410,
    series: "first-things",
    speaker: "joby-soriano",
    topics: ["generosity", "money", "stewardship"],
    books: ["2 Corinthians"],
  },
  {
    slug: "i-lift-my-eyes",
    title: "I Lift My Eyes",
    description:
      "The pilgrim looks up at hills that could hide bandits, and decides where help comes from anyway.",
    scripture: "Psalm 121",
    preached_on: "2026-05-31",
    duration: 2080,
    series: "the-long-obedience",
    speaker: "grace-alcantara",
    topics: ["trust", "anxiety", "protection"],
    books: ["Psalms"],
  },
  {
    slug: "out-of-the-depths",
    title: "Out of the Depths",
    description:
      "A psalm for people who have run out of explanations. Waiting, and what it does to us.",
    scripture: "Psalm 130",
    preached_on: "2026-05-24",
    duration: 2240,
    series: "the-long-obedience",
    speaker: "peter-tan-chi",
    topics: ["forgiveness", "waiting", "suffering"],
    books: ["Psalms"],
  },
  {
    slug: "unless-the-lord-builds",
    title: "Unless the Lord Builds",
    description:
      "Effort without dependence wears people out. A short psalm about anxious labour and rest.",
    scripture: "Psalm 127",
    preached_on: "2026-05-17",
    duration: 2010,
    series: "the-long-obedience",
    speaker: "mark-villanueva",
    topics: ["work", "rest", "anxiety", "family"],
    books: ["Psalms"],
  },
  {
    slug: "how-good-and-pleasant",
    title: "How Good and Pleasant",
    description:
      "Unity is not agreement about everything. It is a decision to stay at the same table.",
    scripture: "Psalm 133",
    preached_on: "2026-05-10",
    duration: 1980,
    series: "the-long-obedience",
    speaker: "ronnel-de-guzman",
    topics: ["unity", "community", "conflict"],
    books: ["Psalms"],
  },
  {
    slug: "one-roof-many-seasons",
    title: "One Roof, Many Seasons",
    description:
      "Households change shape. What holds across every version of a family.",
    scripture: "Ephesians 5:21-6:4",
    preached_on: "2026-03-29",
    duration: 2470,
    series: "household",
    speaker: "joby-soriano",
    topics: ["marriage", "parenting", "family"],
    books: ["Ephesians"],
  },
  {
    slug: "single-and-whole",
    title: "Single and Whole",
    description:
      "Singleness is not a waiting room. Paul treats it as a full life with its own calling.",
    scripture: "1 Corinthians 7:25-35",
    preached_on: "2026-03-22",
    duration: 2320,
    series: "household",
    speaker: "mark-villanueva",
    topics: ["singleness", "calling", "contentment"],
    books: ["1 Corinthians"],
  },
  {
    slug: "raising-them-to-leave",
    title: "Raising Them to Leave",
    description:
      "Parenting aims at release, not control. What discipleship at home actually looks like.",
    scripture: "Deuteronomy 6:4-9",
    preached_on: "2026-03-15",
    duration: 2390,
    series: "household",
    speaker: "grace-alcantara",
    topics: ["parenting", "family", "discipleship"],
    books: ["Deuteronomy"],
  },
  {
    slug: "the-work-of-forgiving",
    title: "The Work of Forgiving",
    description:
      "Forgiveness inside a family is slower and harder than anywhere else. Why it is still the way through.",
    scripture: "Colossians 3:12-17",
    preached_on: "2026-03-08",
    duration: 2280,
    series: "household",
    speaker: "peter-tan-chi",
    topics: ["forgiveness", "conflict", "family"],
    books: ["Colossians"],
  },
  {
    slug: "when-the-house-is-loud",
    title: "When the House Is Loud",
    description:
      "Practical peace for homes under pressure, from a letter written to a church under pressure.",
    scripture: "Philippians 4:4-9",
    preached_on: "2026-03-01",
    duration: 2150,
    series: "household",
    speaker: "ronnel-de-guzman",
    topics: ["anxiety", "peace", "family"],
    books: ["Philippians"],
  },
];

function fourWsFor(m: RawMessage, id: string): FourWs {
  return {
    id: `4ws-${id}`,
    message_id: id,
    title: `${m.title}: 4Ws`,
    week_of: m.preached_on,
    welcome_md:
      "Share one place this week where you felt genuinely at ease, and one where you did not.",
    worship_md: `Read ${m.scripture} aloud together. Pause after it. Let someone pray before you discuss.`,
    word_md: [
      `1. What stood out to you in ${m.scripture}?`,
      "2. Where does this passage press against how you actually live?",
      "3. What would change this week if you took it seriously?",
    ].join("\n"),
    works_md:
      "Name one specific step before you leave. Ask someone in the group to check on you on Wednesday.",
    pdf_url: null,
  };
}

export const messages: Message[] = raw.map((m, i) => {
  const id = `msg-${i + 1}`;
  const video = m.video ?? videoForSeries(m.series);
  return {
    id,
    slug: m.slug,
    title: m.title,
    description: m.description,
    scripture: m.scripture,
    preached_on: m.preached_on,
    duration_seconds: m.duration,
    thumbnail_url: `https://i.ytimg.com/vi/${video}/maxresdefault.jpg`,
    full_video_key: video,
    sermon_video_key: video,
    audio_url: null,
    transcript: null,
    notes_md: null,
    topics: m.topics,
    bible_books: m.books,
    series: seriesBySlug[m.series] ?? null,
    speaker: speakerBySlug[m.speaker] ?? null,
    four_ws: fourWsFor(m, id),
  };
});
