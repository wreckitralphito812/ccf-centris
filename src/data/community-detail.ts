/**
 * Per-community page content.
 *
 * Ministry names, taglines and purpose statements come from CCF's own
 * communities page. Schedules, room names and programme specifics are
 * representative placeholders for the CCF Centris team to replace.
 */

export interface CommunityDetail {
  /** What someone actually experiences if they turn up. */
  experience: { title: string; body: string }[];
  /** Age bands or sub-groups, where the ministry has them. */
  bands?: { label: string; note: string; body: string }[];
  /** Questions specific to this community. */
  faqs: { q: string; a: string }[];
  /** Ministry slugs that map to volunteer roles for this community. */
  serveMinistry?: string;
  /** An extra editorial block, used where a ministry needs one. */
  callout?: { title: string; body: string; href: string; cta: string };
}

export const communityDetail: Record<string, CommunityDetail> = {
  nxtgen: {
    experience: [
      {
        title: "Check in on the same floor",
        body: "Check-in opens 30 minutes before each service, just outside the NXTGEN rooms. You get a code, your child gets a matching tag, and only that code collects them.",
      },
      {
        title: "The same message, their size",
        body: "Each room teaches the passage the adults are hearing, built for that age. Children leave able to tell you what it was about.",
      },
      {
        title: "Small groups, not just a big room",
        body: "After the teaching, children break into small groups with the same leader each week. It is a Dgroup in everything but name.",
      },
      {
        title: "Collected the way you left them",
        body: "Same room, same code, a few minutes after the service ends. If your child needs you during the service, your number appears on the worship hall screen.",
      },
    ],
    bands: [
      { label: "Nursery", note: "0 to 2 years", body: "Care, play, and a quiet corner. Parents paged if needed." },
      { label: "Preschool", note: "3 to 5 years", body: "Songs, a short Bible story, and craft. High energy, high supervision." },
      { label: "Kids", note: "Grades 1 to 3", body: "Teaching, small groups, and games built around the week's passage." },
      { label: "Preteen", note: "Grades 4 to 6", body: "Real discussion, real questions, and their first taste of a Dgroup." },
    ],
    faqs: [
      { q: "Do I have to leave my child in NXTGEN?", a: "No. Children are welcome in the main worship hall for the whole service. Plenty of families do that and nobody minds the noise." },
      { q: "Can I see the room first?", a: "Yes, always. Ask at check-in and someone will walk you in before you decide." },
      { q: "What about allergies or additional needs?", a: "Tell us at check-in. It goes on your child's tag and the room lead is briefed before the service starts." },
      { q: "Are the volunteers checked?", a: "Every NXTGEN volunteer completes a background check and child safety training before their first Sunday, and no volunteer is ever alone with a child." },
    ],
    serveMinistry: "NXTGEN",
    callout: {
      title: "Coming with children for the first time?",
      body: "The families page walks through check-in, nursing and changing facilities, stroller access, and what happens if you arrive late.",
      href: "/visit/families",
      cta: "Read the families guide",
    },
  },

  elevate: {
    experience: [
      {
        title: "Friday nights at Centris",
        body: "Worship, a short message aimed squarely at students, and then Dgroups. Doors open at 6:00 and someone will meet you if you are new.",
      },
      {
        title: "Dgroups by year level",
        body: "Senior high meets right after Elevate night in the same building. College groups meet nearer campus, some in person and some online.",
      },
      {
        title: "Camps and retreats",
        body: "Elevate runs camps through the year. They are usually where students who were unsure at the start of term decide they are staying.",
      },
      {
        title: "Somewhere to serve",
        body: "Students run a lot of Elevate: worship, production, welcome, and social. Most leaders started as someone who turned up alone.",
      },
    ],
    bands: [
      { label: "Junior high", note: "Grades 7 to 10", body: "Games, teaching, and small groups with leaders who stay with them for the year." },
      { label: "Senior high", note: "Grades 11 and 12", body: "Deeper discussion, and the point where many students start leading." },
      { label: "College", note: "18 to 23", body: "Campus-based Dgroups around Quezon City, meeting in person twice a month." },
    ],
    faqs: [
      { q: "Can I come alone?", a: "Most people do the first time. Arrive at 6:00 and the welcome team will introduce you before it starts." },
      { q: "Do my parents need to come?", a: "No, though they are welcome. If you are under 18 we will ask for a guardian contact for camps and trips." },
      { q: "What if I'm not a Christian?", a: "Come anyway. A lot of Elevate students would say the same, and nobody will corner you about it." },
    ],
    serveMinistry: "Elevate",
  },

  b1g: {
    experience: [
      {
        title: "Thursday gatherings",
        body: "Worship and teaching aimed at the questions single adults actually have: work, purpose, family expectations, loneliness, and what to do with your twenties and thirties.",
      },
      {
        title: "Dgroups that stick",
        body: "B1G Dgroups are where most of the friendships form. Young professionals, students who have graduated, and anyone single and looking for people.",
      },
      {
        title: "Retreats",
        body: "A weekend away each year with teaching, rest, and a lot of unstructured time. It is the fastest way into the community.",
      },
      {
        title: "Sport, constantly",
        body: "B1G effectively runs on the Sports Hall. Basketball, badminton, and pickleball most weeknights, open to anyone who turns up.",
      },
    ],
    faqs: [
      { q: "Is this a dating thing?", a: "No. It is a community for single adults to know Jesus and life's real purpose. People do meet their spouse here, but that is not what it is for." },
      { q: "How old is everyone?", a: "Broadly early twenties to late thirties, though nobody checks. Dgroups tend to cluster by life stage rather than age." },
      { q: "What if I'm single again rather than never married?", a: "You are welcome. Say so when you come and we will point you to a group where that is understood." },
    ],
    serveMinistry: "Sports",
  },

  families: {
    experience: [
      {
        title: "Marriage courses each term",
        body: "Eight weeks on communication, conflict, money, and intimacy. Couples sit at their own table and nothing is shared with the group unless you choose to.",
      },
      {
        title: "Parenting workshops",
        body: "Practical sessions by age band, from toddlers through to teenagers, run by parents a few years ahead of you rather than by theorists.",
      },
      {
        title: "Dgroups with kids in the room",
        body: "Several groups meet with children present and take turns watching them. Nobody has to find a sitter to grow.",
      },
      {
        title: "Family Sundays",
        body: "Once a term the children stay in the main service and the message is built for the whole household, followed by lunch together.",
      },
    ],
    faqs: [
      { q: "Do both partners have to come?", a: "For the marriage course, yes, it is built around couples working through it together. Everything else is open to one of you alone." },
      { q: "What if our marriage is in trouble?", a: "Come, and also talk to someone directly. The pastoral team handles that privately and it never goes on a list." },
      { q: "Is there childcare?", a: "NXTGEN runs alongside Sunday services, and most weekday courses arrange childcare. Ask when you register." },
    ],
    serveMinistry: "NXTGEN",
    callout: {
      title: "Need to talk to someone about your marriage?",
      body: "Pastoral conversations are private, handled by the pastoral team, and never shared with anyone else at the center.",
      href: "/care/talk",
      cta: "Talk to someone",
    },
  },

  women: {
    experience: [
      {
        title: "Tuesday mornings",
        body: "Bible study while the children are at school. Coffee first, then a passage, then honest conversation. Childcare available for preschoolers.",
      },
      {
        title: "Wednesday evenings",
        body: "The same study, run after work for women who cannot make a weekday morning.",
      },
      {
        title: "Mentoring",
        body: "Women a season ahead walking with women a season behind. Ask at the Welcome Center and someone will pair you up.",
      },
      {
        title: "Dgroups across every stage",
        body: "Students, young professionals, mothers, single mothers, and grandmothers. There is a group for the season you are actually in.",
      },
    ],
    faqs: [
      { q: "I work full time. Is there anything for me?", a: "The Wednesday evening study and several evening Dgroups exist specifically for that." },
      { q: "Can I bring my baby?", a: "Yes. Childcare is available at the morning study, and nobody minds a baby in the room at any of it." },
      { q: "I don't know anyone.", a: "Most women arrive that way. Tell whoever meets you at the door and they will sit with you." },
    ],
    serveMinistry: "Welcome",
  },

  men: {
    experience: [
      {
        title: "Saturday breakfast",
        body: "Early, before the day gets away from anyone. Food, a passage, and the questions men mostly avoid asking each other.",
      },
      {
        title: "Dgroups built on honesty",
        body: "Movement Dgroups work on brokenness and brotherhood rather than performance. What is said in the room stays there.",
      },
      {
        title: "Fathers and sons",
        body: "Sessions through the year for men raising boys, plus events where sons come along.",
      },
      {
        title: "Sport, obviously",
        body: "Basketball nights in the Sports Hall. A lot of men who would never come to a breakfast come to those first.",
      },
    ],
    faqs: [
      { q: "How early is early?", a: "Breakfast starts at 7:00 on Saturday and finishes by 9:00, so the rest of the day is intact." },
      { q: "I'm not religious. Would I be out of place?", a: "No. A fair number of the men there started out coming for the basketball." },
      { q: "Do I have to talk?", a: "No. Listening for a few months is a completely normal way to start." },
    ],
    serveMinistry: "Facilities",
  },

  ignite: {
    experience: [
      {
        title: "Monthly gatherings",
        body: "Business owners, entrepreneurs, and professionals meeting over dinner. A short talk, then real conversation about running something well and honestly.",
      },
      {
        title: "Business as a platform",
        body: "The premise is that work is not separate from faith. Ignite exists to help people use business as a platform representing Christ.",
      },
      {
        title: "Peer Dgroups",
        body: "Small groups of people carrying similar pressure: payroll, partners, staff, and the decisions nobody else in your life understands.",
      },
      {
        title: "Mentoring and advice",
        body: "Informal, between members. Most of the value people report comes from a conversation after the formal part ended.",
      },
    ],
    faqs: [
      { q: "Is this networking?", a: "Business relationships form, but that is a by-product. It is a community for growing as a follower of Jesus who happens to run something." },
      { q: "Do I need to own a business?", a: "No. Professionals and people employed in leadership roles are just as welcome." },
      { q: "Is there a cost?", a: "Gatherings usually cover food at cost. Nothing beyond that." },
    ],
    serveMinistry: "Events",
  },

  sports: {
    experience: [
      {
        title: "Open play most weeknights",
        body: "Basketball, badminton, and pickleball in the Sports Hall. Show up, get matched, play. Equipment available if you do not own any.",
      },
      {
        title: "Leagues each season",
        body: "Eight-week leagues open to the community, not just to CCF. Teams are paired with a sports ministry volunteer who prays with them before games.",
      },
      {
        title: "Clinics for beginners",
        body: "Four-week coaching blocks for people starting a sport from nothing. Most participants have never held a racket.",
      },
      {
        title: "Play, then stay",
        body: "There is a Dgroup that meets on the court after playing. It is the least intimidating entry point in the whole center.",
      },
    ],
    faqs: [
      { q: "Do I have to be a CCF member?", a: "No. The Sports Hall is open to the community, and most people at open play are not CCF members." },
      { q: "What do I need to bring?", a: "Non-marking indoor shoes are required on the sport floor. Paddles, rackets, and balls can be rented at the desk." },
      { q: "Will someone try to convert me?", a: "No. You will be invited to things, and you can say no and keep playing. That happens all the time." },
    ],
    serveMinistry: "Sports",
    callout: {
      title: "Want to book a court instead?",
      body: "Reserve basketball, badminton, or pickleball courts directly. Open to everyone, member or not.",
      href: "/centris/reserve",
      cta: "Reserve a court",
    },
  },
};
