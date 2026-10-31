// Static fun facts for the between-section break (Stage 1 — no LLM generation).
// Curated for an Indonesian elementary school audience interested in math and science.
// Each fact has an English and a Bahasa Indonesia version; the kid UI language
// (from the child's curriculum) picks which one is shown.

import type { FunFactCategory, KidLocale } from "./kid-copy";

export interface FunFact {
  id: string;
  text: Record<KidLocale, string>;
  category: FunFactCategory;
}

export const FUN_FACTS: FunFact[] = [
  {
    id: "pythagoras",
    category: "math",
    text: {
      en: "People in ancient Babylon were using the idea behind the Pythagorean theorem about 1,000 years before Pythagoras was born.",
      id: "Orang Babilonia kuno sudah memakai gagasan teorema Pythagoras sekitar 1.000 tahun sebelum Pythagoras lahir.",
    },
  },
  {
    id: "octopus",
    category: "science",
    text: {
      en: "An octopus has three hearts and blue blood.",
      id: "Gurita punya tiga jantung dan darahnya berwarna biru.",
    },
  },
  {
    id: "honey",
    category: "nature",
    text: {
      en: "Honey keeps for a very long time. Archaeologists have found honey thousands of years old in Egyptian tombs.",
      id: "Madu bisa awet sangat lama. Para arkeolog pernah menemukan madu berumur ribuan tahun di makam Mesir kuno.",
    },
  },
  {
    id: "banana",
    category: "science",
    text: {
      en: "Bananas are very slightly radioactive. They contain a tiny amount of potassium-40.",
      id: "Pisang sedikit sekali radioaktif. Di dalamnya ada kalium-40 dalam jumlah yang sangat kecil.",
    },
  },
  {
    id: "chess",
    category: "math",
    text: {
      en: "There are more possible games of chess than there are atoms in the observable universe.",
      id: "Jumlah kemungkinan permainan catur lebih banyak daripada jumlah atom di alam semesta yang bisa diamati.",
    },
  },
  {
    id: "sunflower",
    category: "nature",
    text: {
      en: "Young sunflowers turn to follow the sun during the day, guided by an inner clock. Grown sunflowers stay facing east.",
      id: "Bunga matahari yang masih muda berputar mengikuti matahari sepanjang hari, diatur oleh jam di dalam tubuhnya. Setelah dewasa, bunganya tetap menghadap ke timur.",
    },
  },
  {
    id: "zero",
    category: "math",
    text: {
      en: "Mathematicians in India were using zero as a number more than 1,300 years ago. Europe started using it hundreds of years later.",
      id: "Ahli matematika di India sudah memakai nol sebagai angka lebih dari 1.300 tahun lalu. Eropa baru memakainya ratusan tahun kemudian.",
    },
  },
  {
    id: "water",
    category: "science",
    text: {
      en: "Water is found naturally on Earth as a solid, a liquid and a gas: ice, water and water vapor.",
      id: "Di Bumi, air ada secara alami dalam tiga wujud: padat, cair, dan gas. Contohnya es, air, dan uap air.",
    },
  },
  {
    id: "elephant",
    category: "nature",
    text: {
      en: "Elephants can't jump, but they can sense rumbles in the ground through their feet.",
      id: "Gajah tidak bisa melompat, tetapi gajah bisa merasakan getaran di tanah lewat kakinya.",
    },
  },
  {
    id: "archimedes",
    category: "history",
    text: {
      en: "A famous story says Archimedes shouted 'Eureka!' in his bath when he worked out how to measure volume with water.",
      id: "Menurut cerita terkenal, Archimedes berteriak 'Eureka!' saat mandi, ketika ia menemukan cara mengukur volume dengan air.",
    },
  },
  {
    id: "lightning",
    category: "science",
    text: {
      en: "Lightning is about five times hotter than the surface of the sun.",
      id: "Petir sekitar lima kali lebih panas daripada permukaan matahari.",
    },
  },
  {
    id: "venus",
    category: "science",
    text: {
      en: "A day on Venus is longer than a year on Venus. Venus takes 243 Earth days to spin once, but only 225 Earth days to orbit the sun.",
      id: "Satu hari di Venus lebih lama daripada satu tahunnya. Venus butuh 243 hari Bumi untuk berputar sekali, tetapi hanya 225 hari Bumi untuk mengelilingi matahari.",
    },
  },
];

export function getRandomFact(): FunFact {
  return FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
}
