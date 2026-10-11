/**
 * Seeds the six hand-written Story Trail sample books shown on the marketing
 * site (3 Indonesian heroes + 3 fiction). Idempotent: re-running replaces them.
 *
 * Usage (against the DB in DATABASE_URL):
 *   pnpm tsx scripts/seed-sample-story-books.ts
 */
import 'dotenv/config';
import './register-prisma';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { BookStatus, Grade, PrismaClient, PreferredLanguage } from '../generated/prisma/client';

const prisma = new PrismaClient();

type SampleBook = {
  id: string;
  title: string;
  summary: string;
  trailStop: number;
  photo?: string;
  /** Page whose illustration doubles as the cover (1-based). */
  coverPage?: number;
  pages: string[];
  quiz: { prompt: string; options: string[]; correctAnswer: string; explanation: string }[];
};

const BOOKS: SampleBook[] = [
  {
    id: 'story-aryan-telur-naga',
    title: 'Aryan dan Telur Naga Merah',
    summary: 'Seekor naga merah kecil, sebuah telur ajaib, dan malam tanpa bintang.',
    trailStop: 1,
    coverPage: 3,
    pages: [
      'Aryan sangat suka naga. Setiap malam ia menggambar naga di buku gambarnya, dan bermimpi suatu hari bisa bertemu naga sungguhan.',
      'Suatu sore, saat bermain di kebun belakang, Aryan menemukan sebuah telur besar berwarna merah di balik semak. Telur itu hangat dan berkilau seperti batu permata.',
      'Krak... krak... Telur itu retak! Keluarlah seekor bayi naga merah yang mungil. Matanya bulat dan ramah. Aryan menamainya Api.',
      'Api cepat tumbuh besar. Dari mulutnya keluar cahaya hangat yang tidak membakar, hanya menerangi malam. Aryan dan Api menjadi sahabat.',
      'Suatu malam, langit menjadi gelap. Naga Hitam yang besar datang dari balik gunung. Ia ingin mengambil semua cahaya bintang supaya dunia selalu gelap.',
      'Api merasa takut. Tetapi Aryan memeluknya dan berkata, "Kita lebih kuat kalau bersama. Ayo kita kembalikan cahaya bintang!"',
      'Aryan naik ke punggung Api, lalu mereka terbang tinggi. Api menyemburkan cahayanya yang paling terang. Naga Hitam silau, lalu terbang kembali ke balik gunung.',
      'Bintang-bintang kembali bersinar dan semua orang bersorak. Aryan mengusap kepala Api. "Pemberani bukan berarti tidak takut," katanya, "tapi tetap berbuat baik walaupun takut."',
    ],
    quiz: [
      { prompt: 'Apa warna telur yang ditemukan Aryan?', options: ['Merah', 'Biru', 'Hitam', 'Putih'], correctAnswer: 'Merah', explanation: 'Aryan menemukan sebuah telur besar berwarna merah di kebun belakang.' },
      { prompt: 'Siapa nama bayi naga merah itu?', options: ['Api', 'Bara', 'Merah', 'Naga'], correctAnswer: 'Api', explanation: 'Aryan menamai bayi naga merah itu Api.' },
      { prompt: 'Apa yang ingin diambil Naga Hitam?', options: ['Telur naga', 'Cahaya bintang', 'Buku gambar Aryan', 'Bulan'], correctAnswer: 'Cahaya bintang', explanation: 'Naga Hitam ingin mengambil semua cahaya bintang supaya dunia selalu gelap.' },
    ],
  },
  {
    id: 'story-misi-planet-merah',
    title: 'Misi ke Planet Merah',
    summary: 'Raka dan robotnya mencari air di Mars.',
    trailStop: 2,
    coverPage: 2,
    pages: [
      'Raka adalah astronaut cilik yang pemberani. Hari ini ia terbang ke Planet Mars bersama robot kecilnya, Boti.',
      'Mars berwarna merah karena tanahnya berkarat. Udaranya dingin, dan tidak ada seorang pun di sana.',
      'Misi Raka sangat penting: mencari air. Tanpa air, manusia tidak bisa tinggal di Mars.',
      'Boti memindai tanah dengan alatnya. Bip-bip-bip! Ada es di bawah pasir dekat kawah besar!',
      'Raka menggali pelan-pelan dan mengambil sedikit es itu. "Kita menemukan air!" serunya gembira.',
      'Raka dan Boti kembali ke pesawat. Mereka melapor ke Bumi, dan semua ilmuwan bertepuk tangan.',
    ],
    quiz: [
      { prompt: 'Siapa nama robot kecil Raka?', options: ['Boti', 'Roby', 'Beno', 'Dodo'], correctAnswer: 'Boti', explanation: 'Raka terbang bersama robot kecilnya yang bernama Boti.' },
      { prompt: 'Apa yang dicari Raka di Mars?', options: ['Emas', 'Air', 'Bunga', 'Teman'], correctAnswer: 'Air', explanation: 'Misi Raka adalah mencari air, karena manusia butuh air untuk tinggal di sana.' },
      { prompt: 'Di mana Boti menemukan es?', options: ['Di dalam pesawat', 'Di atas gunung', 'Di bawah pasir dekat kawah', 'Di tengah laut'], correctAnswer: 'Di bawah pasir dekat kawah', explanation: 'Boti memindai tanah dan menemukan es di bawah pasir dekat kawah besar.' },
    ],
  },
  {
    id: 'story-soekarno',
    title: 'Soekarno: Suara Proklamasi',
    summary: 'Membacakan Proklamasi Kemerdekaan, 17 Agustus 1945.',
    trailStop: 4,
    photo: 'soekarno.webp',
    pages: [
      'Dahulu, Indonesia belum merdeka. Negeri ini dijajah selama bertahun-tahun. Rakyat ingin bebas menentukan nasibnya sendiri.',
      'Soekarno lahir di Surabaya pada 6 Juni 1901. Sejak muda, ia suka belajar dan pandai berpidato. Kata-katanya membuat banyak orang bersemangat.',
      'Pada pagi 17 Agustus 1945, orang-orang berkumpul di rumah Soekarno di Jalan Pegangsaan Timur 56, Jakarta. Semua menunggu dengan hati berdebar.',
      'Soekarno bersama Mohammad Hatta membacakan Proklamasi Kemerdekaan. Suaranya tegas dan jelas: Indonesia telah merdeka!',
      'Lalu bendera Merah Putih dikibarkan. Bendera itu dijahit oleh Ibu Fatmawati. Semua yang hadir menyanyikan Indonesia Raya.',
      'Soekarno kemudian menjadi Presiden pertama Republik Indonesia. Hingga kini, kita mengenang peristiwa itu setiap 17 Agustus.',
    ],
    quiz: [
      { prompt: 'Kapan Proklamasi Kemerdekaan dibacakan?', options: ['17 Agustus 1945', '10 November 1945', '1 Juni 1945', '28 Oktober 1928'], correctAnswer: '17 Agustus 1945', explanation: 'Proklamasi dibacakan pada 17 Agustus 1945.' },
      { prompt: 'Siapa yang membacakan Proklamasi bersama Soekarno?', options: ['Mohammad Hatta', 'Ki Hajar Dewantara', 'Sutan Sjahrir', 'Jenderal Sudirman'], correctAnswer: 'Mohammad Hatta', explanation: 'Soekarno dan Mohammad Hatta bersama-sama memproklamasikan kemerdekaan.' },
      { prompt: 'Siapa yang menjahit bendera Merah Putih saat itu?', options: ['Ibu Kartini', 'Ibu Fatmawati', 'Ibu Dewi Sartika', 'Ibu Cut Nyak Dien'], correctAnswer: 'Ibu Fatmawati', explanation: 'Bendera Merah Putih itu dijahit oleh Ibu Fatmawati.' },
    ],
  },
  {
    id: 'story-pohon-beringin',
    title: 'Rahasia Pohon Beringin Tua',
    summary: 'Pohon berumur ratusan tahun yang menyimpan cerita.',
    trailStop: 1,
    coverPage: 1,
    pages: [
      'Di tengah desa Tiara ada pohon beringin yang sangat tua. Umurnya sudah ratusan tahun.',
      'Suatu pagi, Tiara duduk di bawah pohon itu. Daunnya bergoyang pelan, seolah sedang berbisik.',
      'Kakek bercerita, "Pohon ini sudah ada sebelum Kakek lahir. Banyak burung dan serangga tinggal di sini."',
      'Tiara melihat burung membuat sarang. Semut berjalan di batang, dan kupu-kupu hinggap di daun.',
      '"Pohon besar memberi kita udara bersih dan tempat teduh," kata Kakek. "Karena itu kita harus menjaganya."',
      'Sejak hari itu, Tiara dan teman-temannya rajin menyiram bibit pohon baru. Suatu hari nanti, bibit itu akan tumbuh besar.',
    ],
    quiz: [
      { prompt: 'Berapa umur pohon beringin itu?', options: ['Beberapa bulan', 'Beberapa tahun', 'Ratusan tahun', 'Satu hari'], correctAnswer: 'Ratusan tahun', explanation: 'Pohon beringin itu sudah berumur ratusan tahun.' },
      { prompt: 'Apa yang diberikan pohon besar kepada kita?', options: ['Udara bersih dan tempat teduh', 'Uang', 'Mainan', 'Listrik'], correctAnswer: 'Udara bersih dan tempat teduh', explanation: 'Kakek berkata pohon besar memberi udara bersih dan tempat teduh.' },
      { prompt: 'Apa yang dilakukan Tiara dan teman-temannya?', options: ['Menebang pohon', 'Menyiram bibit pohon baru', 'Membuat rumah', 'Pergi jauh'], correctAnswer: 'Menyiram bibit pohon baru', explanation: 'Mereka rajin menyiram bibit pohon baru agar tumbuh besar.' },
    ],
  },
  {
    id: 'story-kartini',
    title: 'Kartini: Surat untuk Masa Depan',
    summary: 'Memperjuangkan hak perempuan untuk bersekolah.',
    trailStop: 3,
    photo: 'kartini.webp',
    pages: [
      'Raden Ajeng Kartini lahir di Jepara pada 21 April 1879. Ia anak yang cerdas dan sangat suka membaca.',
      'Pada zaman itu, kebanyakan anak perempuan tidak boleh bersekolah tinggi. Kartini ingin sekali terus belajar.',
      'Karena itu Kartini rajin menulis surat kepada sahabat-sahabatnya, termasuk teman di negeri Belanda. Ia menuliskan mimpi-mimpinya di dalam surat.',
      'Ia bermimpi semua anak perempuan bisa bersekolah, pintar, dan mandiri. Ia juga membuka sekolah kecil untuk anak perempuan di Jepara.',
      'Kartini wafat pada usia 25 tahun. Tetapi surat-suratnya dibukukan dengan judul Habis Gelap Terbitlah Terang.',
      'Setiap 21 April, kita merayakan Hari Kartini. Mimpinya mengingatkan kita bahwa belajar adalah hak semua anak.',
    ],
    quiz: [
      { prompt: 'Di kota mana Kartini lahir?', options: ['Jepara', 'Surabaya', 'Bandung', 'Medan'], correctAnswer: 'Jepara', explanation: 'Kartini lahir di Jepara pada 21 April 1879.' },
      { prompt: 'Bagaimana Kartini menyampaikan mimpinya?', options: ['Lewat lagu', 'Lewat surat', 'Lewat lukisan', 'Lewat film'], correctAnswer: 'Lewat surat', explanation: 'Kartini menuliskan mimpinya di dalam surat untuk sahabat-sahabatnya.' },
      { prompt: 'Apa judul buku kumpulan surat Kartini?', options: ['Laskar Pelangi', 'Habis Gelap Terbitlah Terang', 'Bumi Manusia', 'Si Kancil'], correctAnswer: 'Habis Gelap Terbitlah Terang', explanation: 'Surat-surat Kartini dibukukan dengan judul Habis Gelap Terbitlah Terang.' },
    ],
  },
  {
    id: 'story-penjaga-terumbu',
    title: 'Penjaga Terumbu Karang',
    summary: 'Petualangan menyelam di lautan Indonesia.',
    trailStop: 2,
    coverPage: 2,
    pages: [
      'Lumi adalah ikan kecil berwarna jingga. Ia tinggal di terumbu karang yang indah di laut Indonesia.',
      'Terumbu karang adalah rumah bagi ribuan ikan. Warnanya cerah seperti taman bunga di bawah laut.',
      'Suatu hari Lumi melihat plastik menyangkut di karang. Teman-temannya jadi sulit berenang.',
      'Lumi meminta tolong Pak Penyu yang kuat. Bersama-sama, mereka mendorong plastik itu ke permukaan.',
      'Di atas, seorang nelayan melihatnya dan mengambil plastik itu. "Terima kasih sudah menjaga laut," katanya.',
      'Terumbu karang kembali bersih dan ramai. Lumi tersenyum: menjaga laut adalah tugas kita semua.',
    ],
    quiz: [
      { prompt: 'Apa warna Lumi?', options: ['Jingga', 'Biru', 'Hijau', 'Ungu'], correctAnswer: 'Jingga', explanation: 'Lumi adalah ikan kecil berwarna jingga.' },
      { prompt: 'Apa yang menyangkut di karang?', options: ['Batu besar', 'Plastik', 'Jaring emas', 'Perahu'], correctAnswer: 'Plastik', explanation: 'Lumi melihat plastik menyangkut di karang.' },
      { prompt: 'Siapa yang membantu Lumi mendorong plastik?', options: ['Pak Penyu', 'Pak Hiu', 'Bu Paus', 'Si Kepiting'], correctAnswer: 'Pak Penyu', explanation: 'Lumi meminta tolong Pak Penyu yang kuat.' },
    ],
  },
  {
    id: 'story-habibie',
    title: 'B.J. Habibie: Mimpi Terbang Tinggi',
    summary: 'Insinyur pesawat yang jadi Presiden ke-3 RI.',
    trailStop: 4,
    photo: 'habibie.webp',
    pages: [
      'Bacharuddin Jusuf Habibie, atau B.J. Habibie, lahir di Parepare, Sulawesi Selatan, pada 25 Juni 1936. Sejak kecil ia suka mengamati burung dan pesawat terbang.',
      'Ia pandai sekali dalam pelajaran Matematika dan Fisika. Setelah besar, Habibie belajar teknik pesawat terbang di Jerman.',
      'Di sana ia bekerja keras dan menjadi ahli pesawat yang dihormati. Meski jauh dari rumah, ia tidak pernah lupa pada Indonesia.',
      'Habibie pulang dan membantu Indonesia membuat pesawat sendiri. Pada 10 Agustus 1995, pesawat N250 Gatotkaca terbang untuk pertama kalinya.',
      'Kemudian Habibie menjadi Presiden ke-3 Republik Indonesia. Tanggal 10 Agustus kini diperingati sebagai Hari Kebangkitan Teknologi Nasional.',
      'Pesan Habibie untuk anak Indonesia: bermimpilah setinggi langit, belajar sungguh-sungguh, lalu wujudkan mimpimu.',
    ],
    quiz: [
      { prompt: 'Di negara mana Habibie belajar teknik pesawat terbang?', options: ['Jerman', 'Jepang', 'Amerika', 'Australia'], correctAnswer: 'Jerman', explanation: 'Habibie belajar teknik pesawat terbang di Jerman.' },
      { prompt: 'Apa nama pesawat buatan Indonesia yang terbang pertama kali pada 1995?', options: ['N250 Gatotkaca', 'Garuda Super', 'Merpati Jaya', 'Elang Biru'], correctAnswer: 'N250 Gatotkaca', explanation: 'Pesawat N250 Gatotkaca terbang pertama kali pada 10 Agustus 1995.' },
      { prompt: 'Habibie menjadi Presiden Indonesia yang ke berapa?', options: ['Pertama', 'Kedua', 'Ketiga', 'Keempat'], correctAnswer: 'Ketiga', explanation: 'B.J. Habibie adalah Presiden ke-3 Republik Indonesia.' },
    ],
  },
];

const words = (text: string) => text.match(/\S+/g)?.length ?? 0;

async function main() {
  const uploads = process.env.BOOK_UPLOADS_DIR ?? 'uploads/books';
  const heroes = resolve(__dirname, '../../web/public/books/heroes');
  // Page illustrations live in the web app's public folder (committed).
  const pageArt = resolve(__dirname, '../../web/public/books/pages');
  const artFor = (bookId: string, page: number) =>
    existsSync(join(pageArt, bookId, `p${page}.webp`))
      ? `/books/pages/${bookId}/p${page}.webp`
      : null;

  for (const book of BOOKS) {
    await prisma.book.deleteMany({ where: { id: book.id } });

    let coverImageUrl: string | null = book.coverPage ? artFor(book.id, book.coverPage) : null;
    if (book.photo) {
      const source = join(heroes, book.photo);
      if (existsSync(source)) {
        const dir = join(uploads, book.id);
        mkdirSync(dir, { recursive: true });
        copyFileSync(source, join(dir, 'cover.webp'));
        coverImageUrl = `/book-media/${book.id}/cover.webp`;
      }
    }

    await prisma.book.create({
      data: {
        id: book.id,
        title: book.title,
        summary: book.summary,
        grade: Grade.GRADE_5,
        trailStop: book.trailStop,
        language: PreferredLanguage.BAHASA_INDONESIA,
        coverImageUrl,
        status: BookStatus.PUBLISHED,
        publishedAt: new Date(),
        wordCount: words(book.pages.join(' ')),
        readabilityGrade: 3 + book.trailStop * 0.5,
        generationMeta: { source: 'hand-written sample', estimatedCostUsd: 0 },
        pages: {
          create: book.pages.map((text, i) => ({
            pageNumber: i + 1,
            text,
            imageUrl: artFor(book.id, i + 1),
          })),
        },
        quizQuestions: {
          create: book.quiz.map((q, i) => ({ order: i + 1, ...q })),
        },
      },
    });
    console.log(`seeded ${book.id}`);
  }
}

main().finally(() => prisma.$disconnect());
