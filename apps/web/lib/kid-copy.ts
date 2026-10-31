// Interface copy for the kid-facing screens. The UI language follows the
// child's curriculum: Nasional and Merdeka (Indonesian national curricula)
// show Bahasa Indonesia; IB, Cambridge and anything else show English.
// Questions keep their own stored language; this only covers the chrome.
//
// Wording follows WonderPath_Content_Guide.md: short, concrete, supportive,
// sentence case, buttons start with a verb, no judgment after a wrong answer.

export type KidLocale = "id" | "en";

const INDONESIAN_CURRICULA = new Set(["nasional", "merdeka"]);

export function kidLocale(curriculum?: string | null): KidLocale {
  return curriculum && INDONESIAN_CURRICULA.has(curriculum.trim().toLowerCase())
    ? "id"
    : "en";
}

export type GoalPeriod = "DAILY" | "WEEKLY" | "MONTHLY";
export type FunFactCategory = "math" | "science" | "history" | "nature";

// Highest priority first; the first code present picks the line.
const REASON_PRIORITY = [
  "EXAM_TOMORROW",
  "LOW_MASTERY",
  "LONG_TIME_NO_PRACTICE",
  "HIGH_MASTERY",
  "NEW_OBJECTIVE",
  "LOW_CONFIDENCE",
  "REVIEW_RECOMMENDED",
  "QUICK_SESSION",
  "CONTINUE",
] as const;

type ReasonCode = (typeof REASON_PRIORITY)[number];

const EN_PERIOD: Record<GoalPeriod, string> = {
  DAILY: "today",
  WEEKLY: "this week",
  MONTHLY: "this month",
};

const EN_CATEGORY: Record<FunFactCategory, string> = {
  math: "Math",
  science: "Science",
  history: "History",
  nature: "Nature",
};

const en = {
  // Shared
  loading: "Loading…",
  somethingWrong: "Something went wrong.",
  tryAgain: "Try again",
  back: "Back",
  backToToday: "Back to today",
  starting: "Starting…",
  storyTrail: "Story Trail",

  // Header and parent lock
  stories: "Stories",
  parent: "Parent",
  parentLock: "Parent lock",
  parentPin: "Parent PIN",
  pinLabel: "Enter your 4-digit PIN",
  pinDigit: (n: number) => `PIN digit ${n}`,
  pinMismatch: "That PIN didn't match. Try again.",
  pinCheckFailed: "Could not check the PIN. Please try again.",
  cancel: "Cancel",

  // Rewards
  rewardsEyebrow: "Your rewards",
  rewardsTitle: "Save points for a reward",
  rewardsLoadError: "Could not load rewards right now. Please try again later.",
  rewardRequestError: "Could not send the request. Please try again.",
  noRewards: "Your parent hasn't added a reward yet.",
  waitingForParent: "Waiting for parent…",
  askForIt: "Ask for it",
  needMore: (n: number) => `Need ${n} more ⭐`,
  confirmReward: (cost: number, name: string) => `Use ${cost} ⭐ for ${name}?`,
  confirmRewardNote: "Your parent will be asked to approve it.",
  notYet: "Not yet",

  // Today
  greeting: (name: string) => `Hi ${name}!`,
  loadPageError: "Could not load your page. Please try again.",
  startError: "Could not start. Please try again.",
  openPracticeError: "Could not open the practice. Please try again.",
  backToTodaysPick: "Back to today's pick",
  pickerIntro: "Pick what you'd like to practice today.",
  pickerIntroAfterSkip: "No problem. Pick what you'd like to practice.",
  readyToStart: "Ready to start",
  startPractice: "Start practice",
  changeTopic: "Change topic",
  goalProgress: (progress: number, target: number, period: GoalPeriod) =>
    `${progress} / ${target} ⭐ ${EN_PERIOD[period]}`,
  pointsSaved: (n: number) => `${n} ⭐ saved`,
  about: (duration: string) => `About ${duration}.`,
  duration: (minutes: number) => {
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    const hourPart = `${hours} hour${hours === 1 ? "" : "s"}`;
    return rest === 0 ? hourPart : `${hourPart} ${rest} minutes`;
  },
  startLearning: "Start learning",
  chooseSomethingElse: "Choose something else",
  storyTrailHint: "read and listen",
  reasons: {
    EXAM_TOMORROW: "There's an exam coming up. Let's get ready together.",
    LOW_MASTERY: "This one still needs some practice. Let's work on it together.",
    LONG_TIME_NO_PRACTICE: "It's been a while since you practiced this. Let's go over it again.",
    HIGH_MASTERY: "You've answered a lot of these correctly. Let's take it a little further.",
    NEW_OBJECTIVE: "Something new to try today.",
    LOW_CONFIDENCE: "Let's practice this one until it feels easier.",
    REVIEW_RECOMMENDED: "A quick review helps you remember this.",
    QUICK_SESSION: "A short practice for today.",
    CONTINUE: "Let's keep going with this one.",
  } satisfies Record<ReasonCode, string>,
  reasonDefault: "Atlas picked this one for you today.",

  // Topic picker
  chooseCurriculum: "Choose a curriculum",
  whatToPractice: "What do you want to practice?",
  subjectName: (subject: string) => subject,
  gradeName: (grade: string) => grade,
  chooseTopic: "Choose a topic",
  practiceAheadOn: "Practicing a grade ahead",
  practiceAheadOff: "Practice a grade ahead",
  practiceAheadOnHint: (grade: string) => `Showing ${grade} topics · tap to go back`,
  practiceAheadOffHint: "Try harder topics from the next grade",
  highestGrade: "Grade 6 is the highest grade with topics right now.",
  findingTopics: "Finding topics…",
  topicsLoadError: "Could not load topics. Please try again.",
  noTopics: (subject: string, curriculum: string, grade: string) =>
    `Atlas is still preparing ${subject} for ${curriculum} ${grade}. It's coming soon. For now, try another subject, or ask a grown-up to check again later.`,
  startTopicError: "Could not start this topic. Please try again.",
  practiceTopic: (subtopic: string, objective: string) => `Practice ${subtopic}: ${objective}`,
  newTopic: "New topic",

  // Practice session
  feelingEasy: "Easy",
  feelingJustRight: "Just right",
  feelingTricky: "Tricky",
  howDidThatFeel: "How did that feel?",
  summaryScore: (correct: number, answered: number) =>
    `You answered ${correct} of ${answered} questions correctly.`,
  summaryNoQuestions: "There were no questions to practice this time. Try another topic.",
  summaryThanks: "Thanks for practicing today.",
  loadQuestionError: "Could not load your question. Please try again.",
  sendAnswerError: "Could not send your answer. Please try again.",
  finishError: "Could not finish. Please try again.",
  leaveTitle: "Finish this practice?",
  leaveBody: "Your answers so far are saved.",
  keepPracticing: "Keep practicing",
  finishNow: "Finish now",
  summaryTitle: (name: string) => (name ? `Practice done, ${name}!` : "Practice done!"),
  introTitle: (topic: string) => `Ready to practice ${topic}?`,
  introLevelUp: "Answer 4 of 6 questions correctly to level up.",
  introTakeYourTime: "Take your time.",
  notNow: "Not now",
  funFactLabel: (category: FunFactCategory) => `Fun fact · ${EN_CATEGORY[category]}`,
  finishForToday: "Finish for today",
  levelUp: "Level up!",
  levelUpLine: (subject: string, level: number) => `${subject} is now Level ${level}`,
  correct: "Correct!",
  notQuite: "Not quite yet. Let's look at the explanation.",
  goalReached: (period: GoalPeriod) => `You reached your goal for ${EN_PERIOD[period]}!`,
  pointsEarned: (n: number, correct: boolean) =>
    correct ? `+${n} ⭐` : `+${n} ⭐ for trying`,
  stopAtlas: "Stop Atlas",
  hearAtlas: "Hear Atlas explain",
  nextQuestion: "Next question",
  finishing: "Finishing…",
  questionNumber: (n: number) => `Question ${n}`,
  chooseYourAnswer: "Choose your answer",
  continue: "Continue",
  sending: "Sending…",
  sendAnswer: "Send answer",

  // Story shelf
  pickAStory: "Pick a story",
  shelfIntro: "Read on your own, or let Atlas read it to you.",
  booksLoadError: "Could not load the stories right now. Please try again later.",
  noBooks: "There are no stories here yet.",
  trailLevel: (n: number) => `Level ${n}`,
  bookFinished: "Finished",
  bookFinishedScore: (score: number) => `Finished · ${score}/3 ⭐`,
  bookContinue: (page: number) => `Continue · page ${page}`,
  allStories: "All stories",
  bookOpenError: "Could not open this story. Please try again.",
};

export type KidCopy = typeof en;

const ID_PERIOD: Record<GoalPeriod, string> = {
  DAILY: "hari ini",
  WEEKLY: "minggu ini",
  MONTHLY: "bulan ini",
};

const ID_CATEGORY: Record<FunFactCategory, string> = {
  math: "Matematika",
  science: "Sains",
  history: "Sejarah",
  nature: "Alam",
};

const ID_SUBJECTS: Record<string, string> = {
  Mathematics: "Matematika",
  English: "Bahasa Inggris",
  Science: "Sains",
};

const id: KidCopy = {
  loading: "Memuat…",
  somethingWrong: "Terjadi kesalahan.",
  tryAgain: "Coba lagi",
  back: "Kembali",
  backToToday: "Kembali ke beranda",
  starting: "Memulai…",
  storyTrail: "Story Trail",

  stories: "Cerita",
  parent: "Orang tua",
  parentLock: "Kunci orang tua",
  parentPin: "PIN orang tua",
  pinLabel: "Masukkan PIN 4 digit",
  pinDigit: (n) => `Digit PIN ke-${n}`,
  pinMismatch: "PIN tidak cocok. Coba lagi.",
  pinCheckFailed: "PIN belum bisa diperiksa. Coba lagi.",
  cancel: "Batal",

  rewardsEyebrow: "Hadiahmu",
  rewardsTitle: "Kumpulkan poin untuk hadiah",
  rewardsLoadError: "Hadiah belum bisa dimuat. Coba lagi nanti.",
  rewardRequestError: "Permintaan belum terkirim. Coba lagi.",
  noRewards: "Orang tuamu belum menambahkan hadiah.",
  waitingForParent: "Menunggu orang tua…",
  askForIt: "Minta hadiah",
  needMore: (n) => `Kurang ${n} ⭐`,
  confirmReward: (cost, name) => `Pakai ${cost} ⭐ untuk ${name}?`,
  confirmRewardNote: "Orang tuamu akan diminta menyetujuinya.",
  notYet: "Nanti saja",

  greeting: (name) => `Halo, ${name}!`,
  loadPageError: "Halaman ini belum bisa dimuat. Coba lagi.",
  startError: "Latihan belum bisa dimulai. Coba lagi.",
  openPracticeError: "Latihan belum bisa dibuka. Coba lagi.",
  backToTodaysPick: "Kembali ke pilihan hari ini",
  pickerIntro: "Yuk, pilih latihan untuk hari ini.",
  pickerIntroAfterSkip: "Tidak apa-apa. Pilih yang ingin kamu latih.",
  readyToStart: "Siap mulai",
  startPractice: "Mulai latihan",
  changeTopic: "Ganti topik",
  goalProgress: (progress, target, period) =>
    `${progress} / ${target} ⭐ ${ID_PERIOD[period]}`,
  pointsSaved: (n) => `${n} ⭐ terkumpul`,
  about: (duration) => `Sekitar ${duration}.`,
  duration: (minutes) => {
    if (minutes < 60) return `${minutes} menit`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? `${hours} jam` : `${hours} jam ${rest} menit`;
  },
  startLearning: "Mulai belajar",
  chooseSomethingElse: "Pilih yang lain",
  storyTrailHint: "baca dan dengarkan",
  reasons: {
    EXAM_TOMORROW: "Sebentar lagi ada ujian. Yuk, kita bersiap bersama.",
    LOW_MASTERY: "Topik ini masih perlu latihan. Yuk, kita latih bersama.",
    LONG_TIME_NO_PRACTICE: "Sudah lama kamu tidak berlatih topik ini. Yuk, kita ulang lagi.",
    HIGH_MASTERY: "Banyak jawabanmu di topik ini sudah benar. Yuk, lanjut sedikit lebih jauh.",
    NEW_OBJECTIVE: "Ada hal baru untuk dicoba hari ini.",
    LOW_CONFIDENCE: "Yuk, latih lagi sampai terasa lebih mudah.",
    REVIEW_RECOMMENDED: "Mengulang sebentar membantumu tetap ingat.",
    QUICK_SESSION: "Latihan singkat untuk hari ini.",
    CONTINUE: "Yuk, lanjutkan topik ini.",
  },
  reasonDefault: "Atlas memilihkan topik ini untukmu hari ini.",

  chooseCurriculum: "Pilih kurikulum",
  whatToPractice: "Kamu mau latihan apa?",
  subjectName: (subject) => ID_SUBJECTS[subject] ?? subject,
  gradeName: (grade) => grade.replace(/^Grade\s+/i, "Kelas "),
  chooseTopic: "Pilih topik",
  practiceAheadOn: "Latihan satu kelas di atas",
  practiceAheadOff: "Coba satu kelas di atas",
  practiceAheadOnHint: (grade) => `Menampilkan topik ${grade} · ketuk untuk kembali`,
  practiceAheadOffHint: "Coba topik yang lebih sulit dari kelas berikutnya",
  highestGrade: "Saat ini topik tersedia sampai Kelas 6.",
  findingTopics: "Mencari topik…",
  topicsLoadError: "Topik belum bisa dimuat. Coba lagi.",
  noTopics: (subject, curriculum, grade) =>
    `Atlas masih menyiapkan ${subject} untuk ${curriculum} ${grade}. Segera hadir. Sementara itu, coba mata pelajaran lain atau minta orang tuamu mengecek lagi nanti.`,
  startTopicError: "Topik ini belum bisa dimulai. Coba lagi.",
  practiceTopic: (subtopic, objective) => `Latih ${subtopic}: ${objective}`,
  newTopic: "Topik baru",

  feelingEasy: "Mudah",
  feelingJustRight: "Pas",
  feelingTricky: "Sulit",
  howDidThatFeel: "Soal ini terasa bagaimana?",
  summaryScore: (correct, answered) =>
    `Kamu menjawab benar ${correct} dari ${answered} soal.`,
  summaryNoQuestions: "Belum ada soal untuk latihan kali ini. Coba topik lain.",
  summaryThanks: "Terima kasih sudah berlatih hari ini.",
  loadQuestionError: "Soal belum bisa dimuat. Coba lagi.",
  sendAnswerError: "Jawabanmu belum terkirim. Coba lagi.",
  finishError: "Latihan belum bisa diselesaikan. Coba lagi.",
  leaveTitle: "Selesaikan latihan ini?",
  leaveBody: "Jawabanmu sejauh ini sudah tersimpan.",
  keepPracticing: "Lanjut latihan",
  finishNow: "Selesai sekarang",
  summaryTitle: (name) => (name ? `Latihan selesai, ${name}!` : "Latihan selesai!"),
  introTitle: (topic) => `Siap berlatih ${topic}?`,
  introLevelUp: "Jawab benar 4 dari 6 soal untuk naik level.",
  introTakeYourTime: "Tidak perlu buru-buru.",
  notNow: "Nanti saja",
  funFactLabel: (category) => `Fakta menarik · ${ID_CATEGORY[category]}`,
  finishForToday: "Selesai untuk hari ini",
  levelUp: "Naik level!",
  levelUpLine: (subject, level) => `${subject} sekarang Level ${level}`,
  correct: "Benar!",
  notQuite: "Belum tepat. Yuk, lihat penjelasannya.",
  goalReached: (period) => `Target ${ID_PERIOD[period]} tercapai!`,
  pointsEarned: (n, correct) =>
    correct ? `+${n} ⭐` : `+${n} ⭐ karena sudah mencoba`,
  stopAtlas: "Hentikan Atlas",
  hearAtlas: "Dengarkan penjelasan Atlas",
  nextQuestion: "Soal berikutnya",
  finishing: "Menyelesaikan…",
  questionNumber: (n) => `Soal ${n}`,
  chooseYourAnswer: "Pilih jawabanmu",
  continue: "Lanjut",
  sending: "Mengirim…",
  sendAnswer: "Kirim jawaban",

  pickAStory: "Pilih cerita",
  shelfIntro: "Baca sendiri, atau dengarkan Atlas membacakannya.",
  booksLoadError: "Cerita belum bisa dimuat. Coba lagi nanti.",
  noBooks: "Belum ada cerita di sini.",
  trailLevel: (n) => `Level ${n}`,
  bookFinished: "Selesai",
  bookFinishedScore: (score) => `Selesai · ${score}/3 ⭐`,
  bookContinue: (page) => `Lanjut · halaman ${page}`,
  allStories: "Semua cerita",
  bookOpenError: "Cerita ini belum bisa dibuka. Coba lagi.",
};

export const KID_COPY: Record<KidLocale, KidCopy> = { en, id };

export function kidCopy(locale: KidLocale): KidCopy {
  return KID_COPY[locale];
}

export function kidReasonLine(reasonCodes: string[], copy: KidCopy): string {
  const codes = new Set(reasonCodes);
  for (const code of REASON_PRIORITY) {
    if (codes.has(code)) return copy.reasons[code];
  }
  return copy.reasonDefault;
}
