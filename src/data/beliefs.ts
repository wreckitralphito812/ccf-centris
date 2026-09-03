/**
 * CCF's official mission, vision, core values, and statement of faith,
 * taken verbatim from ccf.org.ph.
 *
 * This is CCF's own doctrinal position, not editorial content. It is quoted
 * rather than paraphrased, and it should not be reworded, softened, or
 * summarised without CCF's approval.
 */

export const MISSION =
  "To honor God and make Christ-committed followers who will make Christ-committed followers.";

export const MISSION_VERSE = {
  text: "Go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit, and teaching them to obey everything I have commanded you.",
  ref: "Matthew 28:19-20",
};

export const VISION =
  "Our vision is to see a movement of millions of committed followers of the Lord Jesus Christ meeting in small groups and transforming lives, families, communities and nations, for the glory of God.";

export const IDENTITY =
  "We are a movement of men and women who have encountered God and committed our lives to the Lord, focused on making an impact through the work of the Holy Spirit in transforming lives, families, communities and nations, for the glory of God.";

/** CCF's core values spell LOVE. */
export interface CoreValue {
  letter: string;
  title: string;
  points: string[];
}

export const CORE_VALUES: CoreValue[] = [
  {
    letter: "L",
    title: "Love God, Love Others",
    points: [
      "Consistent personal devotions, prayer time, and personal study of God's word",
      "Love displayed even for people who are difficult to love; seek to maintain good relationships",
      "No critical spirit or participation in gossip",
      "Private life is in order",
      "Consistent sharing of the gospel and discipleship of others",
    ],
  },
  {
    letter: "O",
    title: "Obey God's Word and Authorities",
    points: [
      "Application of God's word in everyday life",
      "Decisions made and priorities set based on Scripture",
      "Submission to God-given authorities with respect and a positive attitude",
      "Display of consistent humility; willing acceptance of criticism, correction, and suggestions",
    ],
  },
  {
    letter: "V",
    title: "Volunteer",
    points: [
      "Use of God-given gifts and talents to serve others",
      "Encouraging others to serve, and creating opportunities for them",
      "Consistent leadership of, and attendance in, a small group",
      "Serving others even when inconvenient",
      "Tithes and offerings consistently given",
      "Good stewardship of God's resources: time, talents, and treasure",
    ],
  },
  {
    letter: "E",
    title: "Engage the Family",
    points: [
      "Quality time spent and good relationships maintained with family",
      "Temper kept under control, with no physical or verbal abuse",
      "Set a Christ-like example for family members",
      "Family members walk with and serve the Lord",
      "Intentional discipleship of family through regular family devotions",
    ],
  },
];

export interface Belief {
  q: string;
  a: string;
}

/** Quoted from CCF's published statement of faith. */
export const STATEMENT_OF_FAITH: Belief[] = [
  {
    q: "What does CCF believe about the Bible?",
    a: "We believe that the Bible, composed of 39 Old Testament books and 27 New Testament books, is the Word of God, supernaturally inspired, inerrant in its original form, infallible, so that it is our supreme authority in all matters of faith, doctrine and conduct.",
  },
  {
    q: "What does CCF believe about God?",
    a: "We believe that there is only one God eternally existent in three persons, Father, Son and Holy Spirit. He is the Creator of Heaven and Earth.",
  },
  {
    q: "What does CCF believe about Jesus Christ?",
    a: "We believe that Jesus Christ in the flesh is both God and Man, that He was conceived by the Holy Spirit and born of a virgin. He lived a sinless life. He was crucified and He died to pay the penalty of death for our sins. By His shed blood, the Lord Jesus Christ made a perfect sacrifice for sin once and for all time and was raised from the dead on the third day. Later He ascended to the Father's right hand where He is the Head of the Church and intercedes for believers. We believe He is coming again to the Earth bodily and visibly to set up His Kingdom.",
  },
  {
    q: "What does CCF believe about the Holy Spirit?",
    a: "We believe that the Holy Spirit is God and possesses all the Divine attributes. He indwells all believers, baptizes and seals all believers at the moment they trust in Jesus Christ to be their only Savior and Lord. He controls and empowers all true believers to live the Christian life in response to their obedience, confession of sin, and yieldedness to Him.",
  },
  {
    q: "What does CCF believe about how a person is saved?",
    a: "We believe that Salvation, with its forgiveness of sins, impartation of a new nature, and eternal life, is a free gift from God received when a person trusts in Jesus Christ to be their only Savior and Lord. Salvation is given by God's grace and cannot be earned by man through good works, baptism, church membership or any other means (Ephesians 2:8-9).",
  },
  {
    q: "What does CCF teach about the role of good works in a Christian's life?",
    a: "We believe that good works are not the means of salvation but are the expected product in the life of a true believer in Christ. It is every believer's responsibility to pursue a life of good works through the power of the indwelling Holy Spirit.",
  },
  {
    q: "What does CCF teach about every Christian's mission?",
    a: "We believe that it is God's will and command for every Christian to be actively engaged in telling others how to establish a personal relationship with God through faith in Jesus Christ and in discipling those who respond to this good news of salvation, pursuant to Matthew 28:18-20.",
  },
  {
    q: "What does CCF teach about baptism?",
    a: "We believe that water baptism by immersion is an act of obedience to Christ's command. It is a public confession of our personal faith in Jesus Christ (Matthew 28:19).",
  },
  {
    q: "What does CCF teach about what the church is?",
    a: "The universal church is composed of all true believers who have trusted in Christ as their Lord and Savior and are committed to follow Him. The local church is composed of believers in a specific locality who have chosen to abide by that local church's Mission, Vision, Core Values and Statement of Faith.",
  },
];

export const FAITH_NOTE =
  "This statement of faith does not exhaust the extent of our beliefs. We believe that the Bible itself, as the inspired and infallible Word of God that speaks with final authority concerning truth, morality, and the proper conduct of mankind, is the sole and final source of all that we believe. Questions regarding our position about doctrinal issues and church policies are resolved by the CCF Board of Elders, which has the final authority and oversight of the CCF Movement.";

/**
 * CCF publishes further positions on marriage, gender, and the value of human
 * life. Those are doctrinal statements belonging to CCF, and this site links
 * to CCF's own page rather than restating them, so the authoritative wording
 * always comes from CCF directly.
 */
export const POSITION_STATEMENTS_URL = "https://www.ccf.org.ph/who-we-are/";
