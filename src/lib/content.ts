// Institutional content, taken from PAHAD's approved public pages.
// Editable copy that changes often (news, events, programmes, documents)
// lives in the database and is managed from /admin.

export type WorkArea = {
  slug: string;
  number: string;
  theme: string;
  title: string;
  short: string;
  long: string;
  focus: string[];
  image: string;
};

export const workAreas: WorkArea[] = [
  {
    slug: "human-development",
    number: "01",
    theme: "People",
    title: "Human Development",
    short: "Learning, skills and leadership.",
    long: "Supporting learning, skills, awareness, personal growth, leadership and the capabilities people need to participate fully in society.",
    focus: ["Learning and awareness", "Health and wellbeing awareness", "Youth leadership", "Skills and personal growth"],
    image: "/images/training-meeting.jpg",
  },
  {
    slug: "livelihood-development",
    number: "02",
    theme: "Opportunity",
    title: "Livelihood Development",
    short: "Enterprise and economic opportunity.",
    long: "Encouraging sustainable livelihoods, local enterprise, practical skills and access to opportunities that can strengthen individual and community well-being.",
    focus: ["Local enterprise", "Practical and vocational skills", "Employment pathways", "Market opportunities"],
    image: "/images/naksha-1.jpg",
  },
  {
    slug: "community-development",
    number: "03",
    theme: "Participation",
    title: "Community Development",
    short: "Participation and community-led action.",
    long: "Promoting participation, cooperation, local initiatives, inclusion and collective responses to shared community needs.",
    focus: ["Community participation", "Local leadership", "Mutual support and care", "Community-led solutions"],
    image: "/images/cloth-donation.jpg",
  },
  {
    slug: "research-innovation",
    number: "04",
    theme: "Knowledge",
    title: "Research & Innovation",
    short: "Evidence, documentation and practical innovation.",
    long: "Developing understanding through research, documentation, evidence, knowledge-sharing and practical innovation.",
    focus: ["Community-based research", "Local knowledge documentation", "Data and evidence", "Practical innovation"],
    image: "/images/first-meet-gdns.jpg",
  },
  {
    slug: "himalayan-sustainability-heritage",
    number: "05",
    theme: "Place",
    title: "Himalayan Sustainability & Heritage",
    short: "Caring for the environment, culture and heritage.",
    long: "Encouraging environmental responsibility and the understanding, care and continuity of the region's cultural and natural heritage.",
    focus: ["Natural resources and biodiversity", "Climate resilience", "Languages and traditions", "Cultural documentation"],
    image: "/images/hills-mural.jpg",
  },
];

export const objectives = [
  { title: "Human development", tag: "Growing people", text: "Support learning, health awareness, skills, leadership and the potential of every person." },
  { title: "Economic development", tag: "Building opportunity", text: "Strengthen livelihoods, local enterprise, employment, industries and market opportunities." },
  { title: "Community development", tag: "Stronger communities", text: "Encourage participation, mutual support, local leadership and community-led solutions." },
  { title: "Knowledge & innovation", tag: "Learning & discovery", text: "Connect research, local knowledge, technology and fresh ideas to solve real problems." },
  { title: "Environmental sustainability", tag: "Protecting our future", text: "Care for natural resources, biodiversity and ecosystems, and strengthen resilience." },
  { title: "Culture & heritage", tag: "Honouring our roots", text: "Value languages, traditions, identity, history and the knowledge carried across generations." },
  { title: "Institutional & regional development", tag: "Working together", text: "Build capable institutions, meaningful partnerships and constructive policy engagement." },
];

export const coreValues = [
  { title: "Unity", text: "Working together." },
  { title: "Knowledge", text: "Learning and informed action." },
  { title: "Empowerment", text: "People participating and leading." },
  { title: "Sustainability", text: "Thinking beyond today." },
];

export const values = [
  { title: "People-centred development", motto: "People first", text: "People are the purpose and the partners of development. We recognise their abilities, experiences, aspirations and right to shape decisions that affect their lives." },
  { title: "Dignity and respect", motto: "Respect every person", text: "We treat every person with fairness and consideration, value different experiences and uphold the dignity of individuals and communities." },
  { title: "Inclusion and equity", motto: "Leave no voice unheard", text: "We seek to widen participation and opportunity, recognise barriers and make room for voices that are often unheard or under-represented." },
  { title: "Knowledge and learning", motto: "Learn continuously", text: "We value research, evidence, lived experience, local wisdom and open learning as foundations for understanding challenges and improving action." },
  { title: "Integrity and accountability", motto: "Be honest · be answerable", text: "We aim to act honestly, use resources responsibly, communicate clearly and accept responsibility for our decisions and commitments." },
  { title: "Participation and collaboration", motto: "Work together", text: "We believe progress is stronger when people contribute, communities take part and institutions work together with mutual respect." },
  { title: "Local knowledge and cultural respect", motto: "Rooted in place", text: "We respect the languages, cultures, histories, identities and place-based knowledge that shape communities and their relationship with the region." },
  { title: "Sustainability and stewardship", motto: "Think beyond today", text: "We consider long-term social, economic, cultural and environmental well-being, and encourage responsible care for shared resources." },
  { title: "Innovation and practical action", motto: "Turn ideas into action", text: "We remain open to new ideas and useful solutions, while focusing on action that responds to real needs and can create lasting value." },
];

export const principles = [
  { title: "Listen before acting", text: "Understand local needs, priorities and existing efforts before proposing an intervention." },
  { title: "Participation with responsibility", text: "Encourage meaningful involvement, shared ownership and clear responsibilities at every appropriate stage." },
  { title: "Evidence-informed decisions", text: "Use reliable information, research, community knowledge and reflection to inform choices and improve practice." },
  { title: "Transparency in process", text: "Explain objectives, roles, decisions and the use of resources in ways that are understandable and appropriate." },
  { title: "Fairness and non-discrimination", text: "Work respectfully across differences and avoid unfair exclusion based on identity, background, belief or circumstance." },
  { title: "Collaboration, not duplication", text: "Recognise existing community initiatives and institutional efforts, seek practical cooperation and add value where possible." },
  { title: "Responsible use of resources", text: "Use time, funds, knowledge, relationships and natural resources carefully, purposefully and accountably." },
  { title: "Learn, review and improve", text: "Reflect on outcomes, welcome constructive feedback, acknowledge limitations and adapt when better approaches emerge." },
  { title: "Long-term and holistic thinking", text: "Consider how social, human, economic, cultural, institutional and environmental dimensions connect over time." },
];

export const cycle = [
  { title: "Recognise", text: "See people, strengths and possibilities." },
  { title: "Connect", text: "Bring people and ideas together." },
  { title: "Strengthen", text: "Build skills, knowledge and capacity." },
  { title: "Mobilise", text: "Bring resources and partners into action." },
  { title: "Advance", text: "Create solutions and lasting opportunities." },
];

export const ecosystem = [
  { title: "Connect", text: "Bring together people, communities, professionals, institutions and organisations." },
  { title: "Understand", text: "Listen to local realities and identify needs, strengths, challenges and opportunities." },
  { title: "Recognise", text: "Value contributions, experience, skills, knowledge and overlooked potential." },
  { title: "Strengthen", text: "Support learning, capabilities, relationships and the ability to participate." },
  { title: "Mobilise", text: "Connect relevant people, knowledge, resources and partnerships around shared priorities." },
  { title: "Act and grow", text: "Facilitate initiatives, develop solutions and implement meaningful work where PAHAD can contribute." },
];

export const governance = {
  generalAssembly:
    "All recognised members of PAHAD. Voting rights are determined by the Constitution and Rules and Regulations. Elects the Governing Body, which is accountable to the General Assembly.",
  governingBody: ["President", "Vice President", "General Secretary", "Joint Secretary", "Treasurer", "Executive Member One", "Executive Member Two"],
  ced: "Leads institutional implementation, coordinates the six Directorates and oversees the Central Secretariat through the Executive Secretary. Appointed by and reports to the Governing Body.",
  secretariat: ["Executive Secretary", "Institutional Records Officer", "Executive Assistant to the CED", "Coordination Officer"],
  directorates: [
    "Research, Knowledge and Innovation",
    "Civic and Community Development",
    "Economic Development and Enterprise",
    "Media, Communications and Cultural Documentation",
    "Policy, Governance and Public Affairs",
    "Administration, Finance and Institutional Development",
  ],
  memberUnit:
    "An optional Member Development and Resource Facilitation Unit may be established to support member information, learning opportunities, professional development, research participation and resource facilitation.",
};

export const storyMoments = [
  { title: "First meeting at GDNS", text: "Before there were plans or projects, there were people willing to sit together and imagine what might be possible.", image: "/images/first-meet-gdns.jpg" },
  { title: "Busking for an old age home", text: "We used our creativity and music to bring joy and support to elders.", image: "/images/busking-old-age-home.jpg" },
  { title: "Cloth donation drive", text: "Community care in action: showing up and sharing what we could.", image: "/images/cloth-donation.jpg" },
  { title: "NAKSA", text: "An initiative shaped by people who wanted to explore, create and share what they loved.", image: "/images/naksha-1.jpg" },
  { title: "Drawing competition at SVDA School", text: "A space for young creativity.", image: "/images/drawing-svda-1.jpg" },
  { title: "Interview at Radio Salesian", text: "Sharing our voice beyond the community.", image: "/images/radio-salesian.jpg" },
  { title: "Kanchenjunga Gaurav, Chowrasta", text: "A moment at the heart of Darjeeling.", image: "/images/kanchenjunga-gaurav.jpg" },
  { title: "Training meeting", text: "We learned from one another and discovered that teamwork grows when people share knowledge.", image: "/images/training-meeting.jpg" },
];

export const waysToHelp = [
  { title: "Share an idea", text: "Tell PAHAD about a local need, opportunity, research question or practical idea.", kind: "idea" },
  { title: "Volunteer", text: "Offer your time or skills for activities where support is needed and roles are clearly agreed.", kind: "volunteer" },
  { title: "Collaborate", text: "Community groups, institutions, researchers and organisations can explore areas of shared interest.", kind: "collaborate" },
  { title: "Contribute knowledge", text: "Share local experience, documentation, learning resources or expertise that supports community understanding.", kind: "knowledge" },
] as const;
