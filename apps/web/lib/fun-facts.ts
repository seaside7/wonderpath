// Static fun facts for the between-section break (Stage 1 — no LLM generation).
// Curated for an Indonesian elementary school audience interested in math and science.

export interface FunFact {
  id: string;
  text: string;
  category: "math" | "science" | "history" | "nature";
}

export const FUN_FACTS: FunFact[] = [
  {
    id: "pythagoras",
    category: "math",
    text: "The Pythagorean theorem was used by ancient Babylonians 1,000 years before Pythagoras was born!",
  },
  {
    id: "octopus",
    category: "science",
    text: "An octopus has three hearts and blue blood.",
  },
  {
    id: "honey",
    category: "nature",
    text: "Honey never spoils. Archaeologists have found 3,000-year-old honey in Egyptian tombs that was still edible.",
  },
  {
    id: "banana",
    category: "science",
    text: "Bananas are slightly radioactive. They contain potassium-40, a radioactive isotope.",
  },
  {
    id: "chess",
    category: "math",
    text: "There are more ways to arrange a chess board than there are atoms on Earth.",
  },
  {
    id: "sunflower",
    category: "nature",
    text: "Sunflowers follow the sun across the sky because of tiny motors in their stems guided by their internal clock.",
  },
  {
    id: "zero",
    category: "math",
    text: "The concept of zero was developed in India around 458 AD. It took over 1,000 years for Europe to adopt it!",
  },
  {
    id: "water",
    category: "science",
    text: "Water is the only substance on Earth that exists naturally in all three states: solid, liquid, and gas.",
  },
  {
    id: "elephant",
    category: "nature",
    text: "Elephants are the only animals that can't jump — but they can hear sounds through their feet!",
  },
  {
    id: "archimedes",
    category: "history",
    text: "Archimedes once said 'Eureka!' when he discovered how to measure volume using water displacement — while taking a bath!",
  },
  {
    id: "lightning",
    category: "science",
    text: "Lightning is five times hotter than the surface of the sun.",
  },
  {
    id: "venus",
    category: "science",
    text: "A day on Venus is longer than a year on Venus. Venus takes 243 Earth days to spin once, but only 225 Earth days to orbit the sun.",
  },
];

export function getRandomFact(): FunFact {
  return FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
}
