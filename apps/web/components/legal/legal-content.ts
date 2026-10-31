// Privacy policy and terms, written from what the app actually stores and
// does (checked against the code; approved by the founder 2026-10-31).
// Update them whenever data handling changes.
export type LegalLocale = "id" | "en";
type Section = { heading: string; paragraphs: string[] };
type LegalDoc = { title: string; updated: string; sections: Section[] };

const WHATSAPP = "+62 812-9999-8014";

export const PRIVACY: Record<LegalLocale, LegalDoc> = {
  id: {
    title: "Kebijakan privasi",
        updated: "Berlaku sejak 31 Oktober 2026",
    sections: [
      {
        heading: "Tentang WonderPath",
        paragraphs: [
          "WonderPath adalah layanan latihan Matematika dan Bahasa Inggris untuk anak. Saat ini WonderPath sedang dalam masa beta.",
          `Kalau ada pertanyaan tentang data anakmu, hubungi kami lewat WhatsApp di ${WHATSAPP}.`,
        ],
      },
      {
        heading: "Data yang kami simpan",
        paragraphs: [
          "Akun orang tua: alamat email, kata sandi, dan PIN orang tua. Kata sandi dan PIN disimpan dalam bentuk acak (hash), jadi kami tidak bisa membacanya.",
          "Profil anak: nama lengkap, nama panggilan, tanggal lahir, jenis kelamin, kelas, kurikulum, bahasa yang dipilih, dan nama sekolah jika kamu mengisinya.",
          "Data belajar: jawaban anakmu, waktu menjawab, penilaian anakmu tentang sulit atau mudahnya soal, sesi latihan, perkembangan tiap topik, poin, target, hadiah yang kamu buat, permintaan hadiah, serta progres membaca dan skor kuis di Story Trail.",
        ],
      },
      {
        heading: "Data yang tidak kami kumpulkan",
        paragraphs: [
          "Kami tidak merekam suara atau kamera anakmu, tidak mengumpulkan lokasi, tidak menampilkan iklan, dan tidak memasang pelacak analitik pihak ketiga.",
        ],
      },
      {
        heading: "Untuk apa data digunakan",
        paragraphs: [
          "Untuk memilih latihan yang sesuai kemampuan anakmu, menyusun ringkasan perkembangan untukmu, menjalankan poin dan hadiah, dan menyimpan progres membaca.",
          "Kami juga melihat statistik soal secara keseluruhan, misalnya soal mana yang sering dijawab salah, untuk memperbaiki kualitas soal.",
          "Data anak tidak dijual dan tidak digunakan untuk iklan.",
        ],
      },
      {
        heading: "Layanan pihak lain yang kami gunakan",
        paragraphs: [
          "Suara Atlas dibuat dengan Google Cloud Text-to-Speech dan ElevenLabs. Layanan ini hanya menerima teks penjelasan soal atau teks cerita, bukan data pribadi anakmu.",
          "Soal, penjelasan, dan cerita dibuat dan diperiksa dengan bantuan model AI (DeepSeek dan OpenAI). Data pribadi anakmu tidak dikirim ke layanan ini.",
        ],
      },
      {
        heading: "Penyimpanan di perangkatmu",
        paragraphs: [
          "Tanda masuk (login) disimpan di browser selama tab terbuka. Pilihan ukuran teks dan penanda buku di Story Trail disimpan di browser perangkatmu. Kami tidak memakai cookie iklan.",
        ],
      },
      {
        heading: "Hakmu sebagai orang tua",
        paragraphs: [
          "Kamu bisa melihat dan mengubah profil anak kapan saja. Kamu juga bisa menghapus profil anak; data belajarnya ikut terhapus.",
          `Untuk menghapus seluruh akunmu, hubungi kami lewat WhatsApp di ${WHATSAPP}.`,
        ],
      },
      {
        heading: "Akun anak",
        paragraphs: [
          "Profil anak dibuat dan dikelola oleh orang tua atau wali. Anak tidak membuat akun sendiri, dan area orang tua dilindungi PIN.",
        ],
      },
      {
        heading: "Keamanan",
        paragraphs: [
          "Data dikirim lewat koneksi terenkripsi (HTTPS). Kata sandi dan PIN disimpan dalam bentuk hash. Kami terus memperbaiki pengamanan selama masa beta.",
        ],
      },
      {
        heading: "Perubahan kebijakan",
        paragraphs: ["Kalau kebijakan ini berubah, kami akan memberi tahu lewat website atau aplikasi."],
      },
    ],
  },
  en: {
    title: "Privacy policy",
        updated: "Effective 31 October 2026",
    sections: [
      {
        heading: "About WonderPath",
        paragraphs: [
          "WonderPath is a Math and English practice service for children. It is currently in beta.",
          `If you have questions about your child's data, contact us on WhatsApp at ${WHATSAPP}.`,
        ],
      },
      {
        heading: "Data we store",
        paragraphs: [
          "Parent account: email address, password and parent PIN. The password and PIN are stored hashed, so we cannot read them.",
          "Child profile: full name, nickname, date of birth, gender, grade, curriculum, chosen language, and school name if you add it.",
          "Learning data: your child's answers, answer time, how hard your child said a question felt, practice sessions, progress per topic, points, goals, rewards you create, reward requests, and Story Trail reading progress and quiz scores.",
        ],
      },
      {
        heading: "Data we don't collect",
        paragraphs: [
          "We don't record your child's voice or camera, collect location, show ads, or use third-party analytics trackers.",
        ],
      },
      {
        heading: "How we use data",
        paragraphs: [
          "To choose practice that matches your child's level, build your progress summary, run points and rewards, and save reading progress.",
          "We also look at overall question statistics, such as which questions are often answered wrong, to improve the questions.",
          "Children's data is not sold and not used for advertising.",
        ],
      },
      {
        heading: "Services we use",
        paragraphs: [
          "Atlas's voice is made with Google Cloud Text-to-Speech and ElevenLabs. They receive only explanation or story text, not your child's personal data.",
          "Questions, explanations and stories are written and checked with help from AI models (DeepSeek and OpenAI). Your child's personal data is not sent to them.",
        ],
      },
      {
        heading: "Storage on your device",
        paragraphs: [
          "Your sign-in is kept in the browser while the tab is open. Text-size and Story Trail bookmark preferences are stored in your browser. We don't use advertising cookies.",
        ],
      },
      {
        heading: "Your rights as a parent",
        paragraphs: [
          "You can view and edit a child's profile at any time. You can also delete a child's profile, which deletes their learning data.",
          `To delete your whole account, contact us on WhatsApp at ${WHATSAPP}.`,
        ],
      },
      {
        heading: "Children's accounts",
        paragraphs: [
          "Child profiles are created and managed by a parent or guardian. Children don't create accounts themselves, and the parent area is protected by a PIN.",
        ],
      },
      {
        heading: "Security",
        paragraphs: [
          "Data travels over an encrypted connection (HTTPS). Passwords and PINs are stored hashed. We keep improving security during the beta.",
        ],
      },
      {
        heading: "Changes",
        paragraphs: ["If this policy changes, we'll let you know on the website or in the app."],
      },
    ],
  },
};

export const TERMS: Record<LegalLocale, LegalDoc> = {
  id: {
    title: "Ketentuan layanan",
        updated: "Berlaku sejak 31 Oktober 2026",
    sections: [
      {
        heading: "Masa beta",
        paragraphs: [
          "WonderPath sedang dalam masa beta dan gratis selama masa ini. Fitur bisa berubah, dan sesekali layanan bisa terganggu.",
          "Sebelum masa beta berakhir, kami akan memberi tahu jika ada perubahan biaya.",
        ],
      },
      {
        heading: "Akun",
        paragraphs: [
          "Akun dibuat oleh orang tua atau wali. Kamu bertanggung jawab menjaga kata sandi dan PIN orang tua, dan mengisi data anak dengan benar.",
          "Gunakan WonderPath untuk keluargamu sendiri, bukan untuk tujuan komersial.",
        ],
      },
      {
        heading: "Soal dan cerita",
        paragraphs: [
          "Soal, penjelasan, dan cerita dibuat dengan bantuan AI lalu diperiksa. Meski begitu, kesalahan masih mungkin ada. Kalau kamu menemukan kesalahan, kabari kami lewat WhatsApp.",
          "WonderPath adalah alat latihan pendamping, bukan pengganti guru atau sekolah.",
        ],
      },
      {
        heading: "Poin dan hadiah",
        paragraphs: [
          "Hadiah ditentukan dan diberikan oleh orang tua. WonderPath tidak menyediakan atau mengirim hadiah.",
        ],
      },
      {
        heading: "Hak cipta",
        paragraphs: [
          "Soal, cerita, ilustrasi, dan karakter Atlas adalah milik WonderPath. Foto tokoh sejarah digunakan sesuai keterangan sumber dan lisensinya.",
        ],
      },
      {
        heading: "Berhenti menggunakan",
        paragraphs: [
          "Kamu bisa berhenti kapan saja dan menghapus profil anak dari dasbor. Kami bisa menutup akun yang disalahgunakan.",
        ],
      },
      {
        heading: "Tanggung jawab",
        paragraphs: [
          "Selama masa beta, layanan diberikan sebagaimana adanya. Kami berusaha menjaga layanan tetap berjalan dan datamu tetap aman, tetapi tidak bisa menjamin layanan selalu tersedia.",
        ],
      },
      {
        heading: "Hukum yang berlaku",
        paragraphs: ["Ketentuan ini mengikuti hukum Republik Indonesia."],
      },
      {
        heading: "Kontak",
        paragraphs: [`Hubungi kami lewat WhatsApp di ${WHATSAPP}.`],
      },
    ],
  },
  en: {
    title: "Terms of service",
        updated: "Effective 31 October 2026",
    sections: [
      {
        heading: "Beta",
        paragraphs: [
          "WonderPath is in beta and free during this period. Features may change, and the service may occasionally be interrupted.",
          "Before the beta ends, we'll tell you about any pricing changes.",
        ],
      },
      {
        heading: "Accounts",
        paragraphs: [
          "Accounts are created by a parent or guardian. You are responsible for keeping your password and parent PIN safe and for entering your child's details correctly.",
          "Use WonderPath for your own family, not for commercial purposes.",
        ],
      },
      {
        heading: "Questions and stories",
        paragraphs: [
          "Questions, explanations and stories are written with help from AI and then checked. Mistakes can still happen. If you find one, let us know on WhatsApp.",
          "WonderPath is a practice tool that supports learning. It doesn't replace teachers or school.",
        ],
      },
      {
        heading: "Points and rewards",
        paragraphs: ["Rewards are chosen and given by parents. WonderPath doesn't provide or send rewards."],
      },
      {
        heading: "Copyright",
        paragraphs: [
          "Questions, stories, illustrations and the Atlas character belong to WonderPath. Photos of historical figures are used according to their stated source and license.",
        ],
      },
      {
        heading: "Stopping",
        paragraphs: [
          "You can stop at any time and delete child profiles from the dashboard. We may close accounts that are misused.",
        ],
      },
      {
        heading: "Liability",
        paragraphs: [
          "During the beta, the service is provided as is. We work to keep it running and your data safe, but we can't guarantee it will always be available.",
        ],
      },
      {
        heading: "Governing law",
        paragraphs: ["These terms follow the laws of the Republic of Indonesia."],
      },
      {
        heading: "Contact",
        paragraphs: [`Contact us on WhatsApp at ${WHATSAPP}.`],
      },
    ],
  },
};
