export const PREP_GAMES = [
  {
    id: "master-the-roads",
    image: "/assets/master-the-roads.png",
    title: "Master the roads:",
    description: "Ace real-life driving scenarios",
    link: "https://staging.d1p2nu8lfeelfo.amplifyapp.com/",
  },
  {
    id: "crush-it",
    image: "/assets/crush-it.jpg",
    title: "Crush it:",
    description: "Know your road signs",
    link: "https://staging.d220l9t4enoyw1.amplifyapp.com/",
  },
  {
    id: "hazard-hero",
    image: "/assets/hazard-hero.png",
    title: "Sharpen your reflexes:",
    description: "Spot hazards while driving",
    link: "https://staging.d2kmwf5a99pa71.amplifyapp.com/",
  },
  {
    id: "speed-test",
    image: "/assets/speed-test.png",
    title: "Speed Test:",
    description: "How fast can you spot road signs",
    link: "https://staging.dho5r9sclfwnb.amplifyapp.com/",
  },
] as const;

export type PrepGameId = (typeof PREP_GAMES)[number]["id"];
