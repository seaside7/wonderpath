export type Locale = "id" | "en";

export const LOCALE_PATH: Record<Locale, string> = { id: "/", en: "/en" };

// Contact details are placeholders until the founder supplies real ones.
export const CONTACT = {
  whatsapp: "+62 812-0000-0000",
  whatsappLink: "https://wa.me/6281200000000",
  email: "halo@wonderpath.example",
  instagram: "@wonderpath.example",
};

export type BookTheme = "space" | "tree" | "ocean" | "flag" | "letter" | "plane";

const id = {
  meta: {
    title: "WonderPath — Aplikasi Belajar Adaptif untuk Anak",
    description:
      "Latihan Matematika dan Bahasa Inggris yang menyesuaikan kemampuan anak, ditemani Atlas. Kurikulum IB, Cambridge, Merdeka & Nasional. Coba gratis.",
  },
  nav: {
    how: "Cara Kerja",
    features: "Fitur",
    books: "Story Trail",
    parents: "Untuk Orang Tua",
    faq: "FAQ",
    login: "Masuk",
    cta: "Coba Gratis",
    menu: "Menu",
    close: "Tutup",
    switchLabel: "Ganti bahasa",
  },
  hero: {
    eyebrow: "Teman belajar yang tumbuh bareng Si Kecil",
    titleLead: "Setiap anak itu unik.",
    titleAccent: "Cara belajarnya juga.",
    sub: "WonderPath menyesuaikan setiap soal dengan kemampuan Si Kecil. Kalau jawabannya masih keliru, Atlas bantu jelaskan dengan suara, sabar dan tanpa menghakimi. Kamu pun bisa pantau perkembangannya tiap minggu, tanpa menebak-nebak.",
    primary: "Coba Gratis",
    secondary: "Lihat cara kerjanya",
    trust: ["IB", "Cambridge", "Merdeka", "Nasional", "Matematika", "Bahasa Inggris"],
    atlasAlt: "Atlas, maskot WonderPath berbentuk bola dunia yang melambaikan tangan",
  },
  curricula: {
    title: "Sesuai kurikulum sekolah Si Kecil",
    items: [
      { name: "IB", detail: "International Baccalaureate" },
      { name: "Cambridge", detail: "Cambridge Primary" },
      { name: "Merdeka", detail: "Kurikulum Merdeka" },
      { name: "Nasional", detail: "Kurikulum Nasional" },
    ],
    stats: [
      { value: "1.680+", label: "soal latihan yang sudah dicek" },
      { value: "2", label: "bahasa: Indonesia & Inggris" },
      { value: "0", label: "iklan, selamanya" },
    ],
  },
  problem: {
    title: "Satu lembar soal buat semua anak? Jelas nggak cocok.",
    cards: [
      "Yang sudah paham jadi bosan, lalu malas.",
      "Yang masih tertinggal jadi minder, lalu menyerah.",
      "Kamu pun nggak tahu bagian mana yang sebenarnya bikin Si Kecil kesulitan.",
    ],
    turn: "WonderPath bekerja seperti guru les pribadi yang memperhatikan setiap jawaban, bukan cuma nilainya.",
  },
  why: {
    eyebrow: "Kenapa WonderPath ada",
    title: "Dimulai dari keluarga kami sendiri.",
    text: "WonderPath dibangun oleh orang tua, awalnya untuk anak kami sendiri. Sekarang kami buka untuk keluargamu juga.",
    vision: { label: "Visi", text: "Setiap anak berhak punya perjalanan belajar seunik dirinya." },
    mission: { label: "Misi", text: "Membantu orang tua lebih yakin, dan setiap anak belajar dengan caranya sendiri." },
  },
  how: {
    eyebrow: "Cara kerja",
    title: "Tiga langkah simpel, satu jalan belajar.",
    steps: [
      {
        title: "Atlas kenalan dulu",
        text: "Dari jawaban-jawaban pertama, Atlas melihat topik mana yang sudah dikuasai dan mana yang perlu dilatih. Bukan cuma benar-salah, tapi juga seberapa cepat, pakai petunjuk atau tidak, dan gimana rasanya buat Si Kecil.",
      },
      {
        title: "Latihannya ikut menyesuaikan",
        text: "Soal makin menantang saat Si Kecil siap, dan lebih ringan plus ada penjelasan saat dia kesulitan. Benar 4 dari 6 soal? Langsung naik level!",
      },
      {
        title: "Kamu lihat hasilnya",
        text: "Tiap minggu ada ringkasan yang jelas: berapa hari latihan, seberapa akurat, topik apa yang sudah dikuasai, dan apa yang sebaiknya dipelajari berikutnya.",
      },
    ],
  },
  features: {
    eyebrow: "Fitur",
    title: "Semua yang Si Kecil butuhkan untuk berkembang, dan yang kamu butuhkan supaya tenang.",
    soon: "Segera hadir",
    tryCard: {
      title: "Lebih seru kalau langsung dicoba bareng Si Kecil.",
      cta: "Coba Gratis",
    },
    items: [
      { visual: "adaptive", title: "Latihan yang tahu kapan harus naik level", text: "Tingkat kesulitannya menyesuaikan otomatis, topik demi topik, sesuai cara Si Kecil menjawab." },
      { visual: "voice", title: "Dijelaskan langsung oleh Atlas", text: "Jawabannya keliru? Atlas membacakan penjelasannya, mulutnya ikut bergerak." },
      { visual: "topics", title: "Bebas pilih topik", text: "Atau coba topik kelas berikutnya kalau sudah siap." },
      { visual: "weekly", title: "Ringkasan mingguan", text: "Hari latihan, akurasi, dan topik yang dikuasai, di satu layar." },
      { visual: "pin", title: "Mode anak yang aman", text: "Area orang tua dikunci PIN." },
      { visual: "story", title: "Story Trail", text: "Buku cerita bertingkat, dibacakan Atlas.", soon: true },
      { visual: "points", title: "Poin & Hadiah", text: "Si Kecil kumpulkan poin, kamu yang tentukan hadiahnya." },
    ],
    mini: {
      levelUp: "Naik ke Level 3!",
      streak: "4 dari 6 benar",
      explain: "3/4 lebih besar, karena 3/4 = 9/12 dan 2/3 = 8/12.",
      topics: ["Pecahan", "Desimal", "Geometri", "Waktu"],
      ahead: "Coba kelas berikutnya",
      days: "4/7 hari",
      pin: "PIN orang tua",
      balance: "1.240",
      reward: "Es krim 🍦",
      rewardLeft: "60 poin lagi",
    },
  },
  atlas: {
    eyebrow: "Kenalan sama Atlas",
    title: "Teman belajar yang sabar, seru, dan nggak bikin minder.",
    text: "Atlas si bola dunia kecil menemani Si Kecil di setiap sesi belajar. Ikut senang saat jawabannya benar, dan sabar menjelaskan pelan-pelan saat masih keliru.",
    tap: "Ketuk Atlas buat menyapa",
    speaking: "Atlas lagi menyapa…",
    greeting: "/mascot/greeting-id.mp3",
    bubble: "Halo! Aku Atlas. Yuk, kita belajar bareng!",
  },
  books: {
    eyebrow: "Story Trail",
    soon: "Segera hadir",
    title: "Rak buku yang bikin Si Kecil betah membaca.",
    text: "Buku cerita dan biografi bertingkat, dari petualangan ke luar angkasa sampai kisah tokoh-tokoh Indonesia. Setiap buku bisa dibacakan Atlas, dan ada kuis seru di akhirnya.",
    note: "Contoh judul. Koleksi Story Trail sedang kami siapkan.",
    level: "Level",
    readAlong: "Dibacakan Atlas",
    trueStory: "Kisah nyata",
    items: [
      {
        title: "Misi ke Planet Merah",
        hook: "Raka dan robotnya mencari air di Mars.",
        genre: "Fiksi · Sains",
        level: 2,
        theme: "space" as BookTheme,
        biography: false,
      },
      {
        title: "Soekarno: Suara Proklamasi",
        hook: "Membacakan Proklamasi Kemerdekaan, 17 Agustus 1945.",
        genre: "Biografi · Sejarah",
        level: 4,
        theme: "flag" as BookTheme,
        biography: true,
        photo: "/books/heroes/soekarno.webp",
        credit: "Foto: Wikimedia Commons (domain publik)",
      },
      {
        title: "Rahasia Pohon Beringin Tua",
        hook: "Pohon berumur ratusan tahun yang menyimpan cerita.",
        genre: "Fiksi · Alam",
        level: 1,
        theme: "tree" as BookTheme,
        biography: false,
      },
      {
        title: "Kartini: Surat untuk Masa Depan",
        hook: "Memperjuangkan hak perempuan untuk bersekolah.",
        genre: "Biografi · Sejarah",
        level: 3,
        theme: "letter" as BookTheme,
        biography: true,
        photo: "/books/heroes/kartini.webp",
        credit: "Foto: Tropenmuseum, CC BY-SA 3.0",
      },
      {
        title: "Penjaga Terumbu Karang",
        hook: "Petualangan menyelam di lautan Indonesia.",
        genre: "Fiksi · Laut",
        level: 2,
        theme: "ocean" as BookTheme,
        biography: false,
      },
      {
        title: "B.J. Habibie: Mimpi Terbang Tinggi",
        hook: "Insinyur pesawat yang jadi Presiden ke-3 RI.",
        genre: "Biografi · Teknologi",
        level: 4,
        theme: "plane" as BookTheme,
        biography: true,
        photo: "/books/heroes/habibie.webp",
        credit: "Foto: Wikimedia Commons (domain publik)",
      },
    ],
  },
  dashboard: {
    eyebrow: "Untuk orang tua",
    title: "Pantau perkembangan Si Kecil cuma dalam 30 detik.",
    sample: "Contoh tampilan",
    callouts: [
      "Berapa hari Si Kecil latihan minggu ini",
      "Topik yang sudah dikuasai, dan yang masih perlu perhatian",
      "Catatan Atlas: kekuatannya, bagian yang perlu dilatih, dan langkah berikutnya",
    ],
    mock: {
      headline: "Kirana latihan 4 hari minggu ini",
      sub: "52 soal dijawab, 81% benar.",
      days: "Hari latihan",
      questions: "Soal dijawab",
      accuracy: "Akurasi",
      mastered: "Topik dikuasai",
      progress: "Perkembangan belajar",
      topics: [
        { name: "Pecahan", score: 86, status: "Dikuasai" },
        { name: "Nilai tempat", score: 72, status: "Hampir" },
        { name: "Keliling & luas", score: 48, status: "Perlu latihan" },
      ],
      next: "Catatan Atlas",
      nextTopic: "Keliling & luas",
      insight: "Kirana cepat dan teliti di Pecahan, rata-rata 12 detik per soal. Di Keliling & luas, dia sering tertukar rumus keduanya. Minggu ini Atlas kasih latihan yang lebih pelan, pakai contoh gambar.",
      nextLabel: "Fokus berikutnya",
    },
  },
  safety: {
    eyebrow: "Keamanan",
    title: "Aman buat anak, tenang buat orang tua.",
    items: [
      { title: "Tanpa iklan", text: "Nggak ada iklan, nggak ada tautan keluar." },
      { title: "Area orang tua terkunci", text: "Pengaturan dilindungi PIN." },
      {
        title: "Konten sudah dicek",
        text: "Setiap soal diperiksa dulu sebelum muncul di layar Si Kecil.",
      },
      {
        title: "Data anak nggak dijual",
        text: "Hanya dipakai untuk membantu Si Kecil belajar.",
      },
    ],
  },
  founding: {
    eyebrow: "Program Keluarga Perintis",
    title: "Jadi keluarga pertama yang ikut membentuk WonderPath.",
    text: "Tempatnya terbatas, untuk keluarga yang mau coba lebih awal dan kasih masukan langsung.",
    benefits: [
      "Akses gratis selama masa beta",
      "Jalur WhatsApp langsung ke founder",
      "Masukanmu jadi prioritas fitur berikutnya",
      "Lencana \"Keluarga Perintis\" di profil Si Kecil",
    ],
    cta: "Daftar jadi Keluarga Perintis",
  },
  faq: {
    eyebrow: "FAQ",
    title: "Yang sering ditanyakan orang tua.",
    items: [
      {
        q: "Untuk usia berapa?",
        a: "WonderPath dirancang untuk tumbuh bareng Si Kecil, dari prasekolah sampai SD, dan nantinya SMP. Jenjangnya kami tambah bertahap. Daftarkan Si Kecil, dan kami kabari saat jenjangnya sudah tersedia.",
      },
      {
        q: "Kurikulum apa saja yang didukung?",
        a: "IB, Cambridge, Kurikulum Merdeka, dan Kurikulum Nasional, untuk Matematika dan Bahasa Inggris.",
      },
      {
        q: "Berapa biayanya?",
        a: "Kamu bisa coba gratis dulu. Info paket akan muncul di dalam aplikasi setelah masa coba.",
      },
      {
        q: "Berapa lama Si Kecil perlu belajar tiap hari?",
        a: "Cukup 10–15 menit sehari. Yang penting rutin, bukan lama.",
      },
      {
        q: "Bisa untuk lebih dari satu anak?",
        a: "Bisa. Satu akun orang tua bisa punya beberapa profil anak, masing-masing dengan jalur belajarnya sendiri.",
      },
      {
        q: "Pakai perangkat apa?",
        a: "Cukup browser di HP, tablet, atau laptop. Nggak perlu install aplikasi.",
      },
      {
        q: "Aman nggak buat anak?",
        a: "Aman. Tanpa iklan, area orang tua dikunci PIN, dan semua konten dicek dulu sebelum tampil.",
      },
    ],
  },
  finalCta: {
    title: "Perjalanan belajar Si Kecil dimulai hari ini.",
    text: "Daftar cuma semenit. Coba gratis, tanpa kartu kredit.",
    cta: "Coba Gratis",
  },
  footer: {
    tagline: "Teman belajar adaptif yang tumbuh bareng Si Kecil.",
    explore: "Jelajahi",
    contact: "Kontak",
    madeIn: "Dibuat dengan ❤️ di Indonesia.",
  },
};

type MarketingCopy = typeof id;

const en: MarketingCopy = {
  meta: {
    title: "WonderPath — Adaptive Learning for Kids",
    description:
      "Math and English practice that adapts to your child, with Atlas as their learning buddy. IB, Cambridge, Merdeka & Nasional. Try it free.",
  },
  nav: {
    how: "How it works",
    features: "Features",
    books: "Story Trail",
    parents: "For parents",
    faq: "FAQ",
    login: "Log in",
    cta: "Try it free",
    menu: "Menu",
    close: "Close",
    switchLabel: "Change language",
  },
  hero: {
    eyebrow: "A learning buddy that grows with your kid",
    titleLead: "Every kid is unique.",
    titleAccent: "So is how they learn.",
    sub: "WonderPath adapts every question to your child's level. When they get it wrong, Atlas explains out loud, patiently and without judgment. And you can check their progress every week, no guesswork.",
    primary: "Try it free",
    secondary: "See how it works",
    trust: ["IB", "Cambridge", "Merdeka", "Nasional", "Math", "English"],
    atlasAlt: "Atlas, the WonderPath mascot, a globe waving hello",
  },
  curricula: {
    title: "Matches your child's school curriculum",
    items: [
      { name: "IB", detail: "International Baccalaureate" },
      { name: "Cambridge", detail: "Cambridge Primary" },
      { name: "Merdeka", detail: "Kurikulum Merdeka" },
      { name: "Nasional", detail: "Kurikulum Nasional" },
    ],
    stats: [
      { value: "1,680+", label: "practice questions, all checked" },
      { value: "2", label: "languages: Indonesian & English" },
      { value: "0", label: "ads, ever" },
    ],
  },
  problem: {
    title: "One worksheet for every kid? That never works.",
    cards: [
      "Kids who already get it get bored, then tune out.",
      "Kids who are behind lose confidence, then give up.",
      "And you can't tell which part is actually tripping them up.",
    ],
    turn: "WonderPath works like a private tutor who pays attention to every answer, not just the score.",
  },
  why: {
    eyebrow: "Why WonderPath exists",
    title: "It started with our own family.",
    text: "WonderPath is built by parents, first for our own kid. Now we're opening it up to yours.",
    vision: { label: "Vision", text: "Every kid deserves a learning journey as unique as they are." },
    mission: { label: "Mission", text: "Give parents confidence, and help every kid learn their own way." },
  },
  how: {
    eyebrow: "How it works",
    title: "Three simple steps, one learning path.",
    steps: [
      {
        title: "Atlas gets to know them",
        text: "From the first few answers, Atlas spots which topics are solid and which need practice. Not just right or wrong, but how fast, whether they used a hint, and how it felt.",
      },
      {
        title: "Practice adapts as they go",
        text: "Questions get harder when your kid is ready, and gentler with explanations when they struggle. 4 out of 6 right? Level up!",
      },
      {
        title: "You see the results",
        text: "Every week, a clear snapshot: days practiced, accuracy, topics mastered, and what to work on next.",
      },
    ],
  },
  features: {
    eyebrow: "Features",
    title: "Everything your kid needs to grow, and everything you need to relax.",
    soon: "Coming soon",
    tryCard: {
      title: "It's even more fun tried together with your kid.",
      cta: "Try it free",
    },
    items: [
      { visual: "adaptive", title: "Practice that knows when to level up", text: "Difficulty adjusts automatically, topic by topic, based on how your kid answers." },
      { visual: "voice", title: "Explained out loud by Atlas", text: "Wrong answer? Atlas reads the explanation, mouth moving as it talks." },
      { visual: "topics", title: "Pick any topic", text: "Or try next grade's topics when they're ready." },
      { visual: "weekly", title: "Weekly snapshot", text: "Practice days, accuracy, and mastered topics on one screen." },
      { visual: "pin", title: "A safe kid mode", text: "The parent area is PIN-locked." },
      { visual: "story", title: "Story Trail", text: "Leveled storybooks, read aloud by Atlas.", soon: true },
      { visual: "points", title: "Points & Rewards", text: "Kids earn points; you choose the rewards." },
    ],
    mini: {
      levelUp: "Up to Level 3!",
      streak: "4 of 6 right",
      explain: "3/4 is bigger, because 3/4 = 9/12 and 2/3 = 8/12.",
      topics: ["Fractions", "Decimals", "Geometry", "Time"],
      ahead: "Try next grade",
      days: "4/7 days",
      pin: "Parent PIN",
      balance: "1,240",
      reward: "Ice cream 🍦",
      rewardLeft: "60 points to go",
    },
  },
  atlas: {
    eyebrow: "Meet Atlas",
    title: "A learning buddy who's patient, fun, and never makes kids feel silly.",
    text: "Atlas, a little globe, joins your kid in every session. Atlas cheers when they get it right, and patiently explains when they don't.",
    tap: "Tap Atlas to say hi",
    speaking: "Atlas is saying hi…",
    greeting: "/mascot/greeting-en.mp3",
    bubble: "Hi! I'm Atlas. Let's learn something new together!",
  },
  books: {
    eyebrow: "Story Trail",
    soon: "Coming soon",
    title: "A bookshelf your kid won't want to leave.",
    text: "Leveled stories and biographies, from space adventures to the heroes of Indonesia. Atlas can read every book aloud, with a fun quiz at the end.",
    note: "Sample titles. The Story Trail collection is on its way.",
    level: "Level",
    readAlong: "Read by Atlas",
    trueStory: "True story",
    items: [
      {
        title: "Mission to the Red Planet",
        hook: "Raka and his robot search for water on Mars.",
        genre: "Fiction · Science",
        level: 2,
        theme: "space",
        biography: false,
      },
      {
        title: "Soekarno: The Voice of Independence",
        hook: "Proclaimed Indonesia's independence on 17 August 1945.",
        genre: "Biography · History",
        level: 4,
        theme: "flag",
        biography: true,
        photo: "/books/heroes/soekarno.webp",
        credit: "Photo: Wikimedia Commons (public domain)",
      },
      {
        title: "The Secret of the Old Banyan Tree",
        hook: "A tree hundreds of years old, full of stories.",
        genre: "Fiction · Nature",
        level: 1,
        theme: "tree",
        biography: false,
      },
      {
        title: "Kartini: Letters for the Future",
        hook: "Fought for girls' right to go to school.",
        genre: "Biography · History",
        level: 3,
        theme: "letter",
        biography: true,
        photo: "/books/heroes/kartini.webp",
        credit: "Photo: Tropenmuseum, CC BY-SA 3.0",
      },
      {
        title: "Guardians of the Coral Reef",
        hook: "A diving adventure in Indonesia's seas.",
        genre: "Fiction · Ocean",
        level: 2,
        theme: "ocean",
        biography: false,
      },
      {
        title: "B.J. Habibie: Dreaming of Flight",
        hook: "The aircraft engineer who became Indonesia's 3rd President.",
        genre: "Biography · Technology",
        level: 4,
        theme: "plane",
        biography: true,
        photo: "/books/heroes/habibie.webp",
        credit: "Photo: Wikimedia Commons (public domain)",
      },
    ],
  },
  dashboard: {
    eyebrow: "For parents",
    title: "Know how your kid is doing in 30 seconds.",
    sample: "Sample view",
    callouts: [
      "How many days they practiced this week",
      "Which topics are mastered, and which need attention",
      "Atlas's note: their strengths, what needs practice, and what's next",
    ],
    mock: {
      headline: "Kirana practiced on 4 days this week",
      sub: "52 questions answered, 81% correct.",
      days: "Practice days",
      questions: "Questions",
      accuracy: "Accuracy",
      mastered: "Topics mastered",
      progress: "Learning progress",
      topics: [
        { name: "Fractions", score: 86, status: "Mastered" },
        { name: "Place value", score: 72, status: "Getting there" },
        { name: "Perimeter & area", score: 48, status: "Needs practice" },
      ],
      next: "Atlas's note",
      nextTopic: "Perimeter & area",
      insight: "Kirana is quick and careful with Fractions, about 12 seconds per question. In Perimeter & area she keeps mixing up the two formulas, so this week Atlas is slowing things down with picture examples.",
      nextLabel: "Next focus",
    },
  },
  safety: {
    eyebrow: "Safety",
    title: "Safe for kids. Peace of mind for you.",
    items: [
      { title: "No ads", text: "No ads, no links out." },
      { title: "Locked parent area", text: "Settings are PIN-protected." },
      {
        title: "Checked content",
        text: "Every question is reviewed before it reaches your kid's screen.",
      },
      {
        title: "Your kid's data is never sold",
        text: "It's only used to help them learn.",
      },
    ],
  },
  founding: {
    eyebrow: "Founding Families Program",
    title: "Be one of the first families to shape WonderPath.",
    text: "Limited spots for families who want early access and a direct say in what we build.",
    benefits: [
      "Free access during the beta",
      "A direct WhatsApp line to the founder",
      "Your feedback shapes what we build next",
      "A \"Founding Family\" badge on your kid's profile",
    ],
    cta: "Join as a Founding Family",
  },
  faq: {
    eyebrow: "FAQ",
    title: "Questions parents often ask.",
    items: [
      {
        q: "What age is it for?",
        a: "WonderPath is built to grow with your kid, from pre-K through primary school, and later middle school. We add levels step by step. Sign your kid up and we'll let you know when their level is ready.",
      },
      {
        q: "Which curricula are supported?",
        a: "IB, Cambridge, Kurikulum Merdeka, and Kurikulum Nasional, for Math and English.",
      },
      {
        q: "How much does it cost?",
        a: "You can try it free first. Plan details appear inside the app after the trial.",
      },
      {
        q: "How long should my kid practice each day?",
        a: "Just 10–15 minutes a day. Consistency beats length.",
      },
      {
        q: "Does it work for more than one kid?",
        a: "Yes. One parent account can hold several child profiles, each with their own learning path.",
      },
      {
        q: "What devices does it work on?",
        a: "Any browser on a phone, tablet, or laptop. Nothing to install.",
      },
      {
        q: "Is it safe for kids?",
        a: "Yes. No ads, a PIN-locked parent area, and every piece of content is checked first.",
      },
    ],
  },
  finalCta: {
    title: "Your kid's learning journey starts today.",
    text: "Sign up in a minute. Try it free, no credit card.",
    cta: "Try it free",
  },
  footer: {
    tagline: "An adaptive learning buddy that grows with your kid.",
    explore: "Explore",
    contact: "Contact",
    madeIn: "Made with ❤️ in Indonesia.",
  },
};

export const CONTENT: Record<Locale, MarketingCopy> = { id, en };
export type { MarketingCopy };
