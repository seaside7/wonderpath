/**
 * Seeds the hand-written Story Trail sample books (fiction + Indonesian
 * heroes). Idempotent: re-running replaces them (and their reading progress).
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

/** [illustration file in web/public/books/pages/<bookId>/, page text] */
type Page = [art: string, text: string];

type SampleBook = {
  id: string;
  title: string;
  summary: string;
  trailStop: number;
  photo?: string;
  /** Illustration that doubles as the cover (fiction books). */
  coverArt?: string;
  pages: Page[];
  quiz: { prompt: string; options: string[]; correctAnswer: string; explanation: string }[];
};

const BOOKS: SampleBook[] = [
  {
    id: 'story-aryan-telur-naga',
    title: 'Aryan dan Telur Naga Merah',
    summary: 'Seekor naga merah kecil, sebuah telur ajaib, dan malam tanpa bintang.',
    trailStop: 1,
    coverArt: 'p3',
    pages: [
      ['p1', 'Di dinding kamar Aryan ada dua puluh tiga gambar naga. Ada naga yang terbang, naga yang tidur, bahkan naga yang makan nasi goreng. "Suatu hari," bisik Aryan sebelum tidur, "aku akan bertemu naga sungguhan."'],
      ['p2', 'Sore itu, bola Aryan menggelinding ke balik semak di kebun belakang. Saat ia mengambilnya, tangannya menyentuh sesuatu yang hangat. Sebuah telur! Telur itu besar, merah, dan berkilau seperti permen stroberi raksasa.'],
      ['p3', 'Tok... tok... krak! Kulit telur retak sedikit demi sedikit. Sebuah kepala mungil menyembul keluar, lalu bersin. "Hacih!" Percikan cahaya kecil terbang ke udara. Aryan tertawa. "Halo, Naga Kecil. Namamu Api, ya?"'],
      ['a1', 'Setiap pagi, Api belajar terbang di kebun. Sayapnya mengepak-ngepak, tubuhnya naik sejengkal... lalu jatuh ke tumpukan daun. Bruk! "Tidak apa-apa," kata Aryan sambil membersihkan daun dari kepala Api. "Kita coba lagi besok."'],
      ['p4', 'Hari demi hari, Api tumbuh besar. Kini ia bisa terbang tinggi. Dari mulutnya keluar cahaya hangat berwarna emas. Cahaya itu tidak membakar. Setiap malam, Api menerangi kebun seperti lampu taman yang paling indah.'],
      ['p5', 'Lalu suatu malam, angin dingin bertiup. Dari balik gunung muncul Naga Hitam yang besar sekali. Matanya ungu dan sayapnya menutupi bulan. Satu per satu, ia menyedot cahaya bintang ke dalam awan gelapnya.'],
      ['p6', 'Api bersembunyi di belakang Aryan. Tubuhnya gemetar. "Aku takut," bisiknya. Aryan memeluk sahabatnya erat-erat. "Aku juga takut," jawabnya jujur. "Tapi kita lebih kuat kalau bersama. Ayo kita kembalikan bintang-bintang itu!"'],
      ['p7', 'Aryan naik ke punggung Api. Wusss! Mereka terbang menembus awan. Api menarik napas dalam-dalam, lalu menyemburkan cahaya paling terang yang pernah ada. Naga Hitam silau. Ia menutup matanya dan terbang pergi ke balik gunung.'],
      ['p8', 'Awan gelap pecah. Bintang-bintang kembali ke langit dan berkelip satu per satu. Di bawah, orang-orang desa keluar rumah dan bersorak. "Lihat! Ada naga merah yang menyelamatkan bintang!"'],
      ['a2', 'Malam itu, Aryan tidur dengan senyum lebar. Api meringkuk di dekat jendela, bersinar lembut seperti lampu tidur. Sebelum terlelap, Aryan berbisik, "Pemberani bukan berarti tidak takut. Pemberani itu tetap berbuat baik walaupun takut."'],
    ],
    quiz: [
      { prompt: 'Apa warna telur yang ditemukan Aryan?', options: ['Merah', 'Biru', 'Hitam', 'Putih'], correctAnswer: 'Merah', explanation: 'Telur itu besar, merah, dan berkilau seperti permen stroberi raksasa.' },
      { prompt: 'Siapa nama naga kecil sahabat Aryan?', options: ['Api', 'Bara', 'Merah', 'Kilat'], correctAnswer: 'Api', explanation: 'Aryan menamai bayi naga merah itu Api.' },
      { prompt: 'Apa yang diambil Naga Hitam dari langit?', options: ['Bulan', 'Awan hujan', 'Cahaya bintang', 'Pelangi'], correctAnswer: 'Cahaya bintang', explanation: 'Naga Hitam menyedot cahaya bintang ke dalam awan gelapnya.' },
    ],
  },
  {
    id: 'story-misi-planet-merah',
    title: 'Misi ke Planet Merah',
    summary: 'Raka dan robotnya, Boti, mencari air di Mars.',
    trailStop: 2,
    coverArt: 'p2',
    pages: [
      ['a1', '"Sepuluh... sembilan... delapan..." Suara hitungan mundur terdengar di seluruh landasan. Raka, astronaut cilik dari Indonesia, menggenggam tangan robot kecilnya, Boti. "Siap, Boti?" Lampu mata Boti berkedip biru. Bip-bip! Artinya: siap sekali!'],
      ['p1', '"...tiga, dua, satu... meluncur!" Roket bergetar hebat, lalu melesat menembus awan. Raka tertekan ke kursinya. Dari jendela, Bumi terlihat makin kecil. Berbulan-bulan kemudian, sebuah planet merah muncul di depan mereka.'],
      ['p2', 'Mars! Tanahnya merah seperti batu bata karena mengandung karat. Udaranya sangat dingin dan tipis, jadi Raka harus selalu memakai helm. Tidak ada pohon, tidak ada sungai, tidak ada seorang pun. Hanya sunyi sejauh mata memandang.'],
      ['p3', 'Misi mereka sangat penting: mencari air. "Kalau ada air di Mars," jelas Raka, "suatu hari manusia bisa tinggal di sini." Boti mengangguk-angguk, lalu menggelinding duluan. Petualangan dimulai!'],
      ['a2', 'Tiba-tiba langit berubah oranye gelap. Badai debu datang! Raka menarik Boti ke balik batu besar. Wuuusss! Pasir beterbangan ke mana-mana. Mereka menunggu sambil berpegangan erat, sampai badai akhirnya reda.'],
      ['a3', 'Setelah badai, roda Boti terjebak di pasir yang dalam. Bip... bip... bunyinya pelan dan sedih. "Tenang, aku di sini," kata Raka. Ia menggali pasir dengan tangannya, lalu menarik Boti keluar. Bip-bip-bip! Boti berputar kegirangan.'],
      ['p4', 'Di pinggir sebuah kawah besar, Boti berhenti. Ia memindai tanah dengan sinar birunya. Bip... bip... BIIIP! Ada sesuatu yang berkilau di bawah pasir merah. Sesuatu yang putih dan bening...'],
      ['p5', 'Raka berlutut dan menggali pelan-pelan. Ternyata itu es! Es adalah air yang membeku. Raka mengangkatnya tinggi-tinggi. "Boti, kita menemukan air di Mars!" Boti mengangkat kedua tangannya dan menari.'],
      ['a4', 'Malam itu, Raka dan Boti duduk di dekat roket. Di langit Mars yang gelap, ada satu titik biru kecil yang bersinar. "Itu Bumi, rumah kita," bisik Raka. Sebentar lagi mereka pulang membawa kabar gembira.'],
      ['p6', 'Dari dalam roket, Raka menyalakan layar. Wajah para ilmuwan di Bumi muncul. Mereka bersorak dan bertepuk tangan. "Kerja bagus, Raka! Kerja bagus, Boti!" Bip-bip! jawab Boti, paling keras dari semuanya.'],
    ],
    quiz: [
      { prompt: 'Siapa nama robot kecil Raka?', options: ['Boti', 'Roby', 'Beno', 'Dodo'], correctAnswer: 'Boti', explanation: 'Raka pergi ke Mars bersama robot kecilnya, Boti.' },
      { prompt: 'Apa yang dicari Raka di Mars?', options: ['Emas', 'Air', 'Bunga', 'Teman'], correctAnswer: 'Air', explanation: 'Kalau ada air di Mars, suatu hari manusia bisa tinggal di sana.' },
      { prompt: 'Apa yang terjadi pada Boti setelah badai debu?', options: ['Boti tertidur', 'Rodanya terjebak di pasir', 'Boti terbang', 'Lampunya mati'], correctAnswer: 'Rodanya terjebak di pasir', explanation: 'Roda Boti terjebak di pasir yang dalam, lalu Raka menariknya keluar.' },
    ],
  },
  {
    id: 'story-soekarno',
    title: 'Soekarno: Suara Proklamasi',
    summary: 'Dari anak bernama Kusno sampai membacakan Proklamasi Kemerdekaan.',
    trailStop: 4,
    photo: 'soekarno.webp',
    pages: [
      ['p1', 'Dahulu, Indonesia belum menjadi negara merdeka. Selama ratusan tahun, negeri kita dijajah bangsa lain. Rakyat bekerja keras di sawah dan ladang, tetapi hasilnya tidak bisa mereka nikmati sendiri. Di dalam hati, banyak orang memimpikan satu hal: Indonesia yang bebas menentukan nasibnya sendiri.'],
      ['a1', 'Pada 6 Juni 1901, di Surabaya, lahirlah seorang bayi laki-laki. Waktu kecil, namanya Kusno. Karena sering sakit, orang tuanya mengganti namanya menjadi Soekarno. Ayahnya seorang guru dari Jawa, dan ibunya berasal dari Bali.'],
      ['a2', 'Saat remaja, Soekarno bersekolah di Surabaya dan tinggal di rumah H.O.S. Tjokroaminoto, seorang tokoh pergerakan. Di sana ia sering mendengarkan para tokoh berdiskusi tentang nasib bangsa. Malam-malam, Soekarno berlatih berpidato di depan cermin. Suaranya lantang dan penuh semangat!'],
      ['p2', 'Soekarno kemudian kuliah teknik di Bandung dan menjadi insinyur. Tetapi mimpinya lebih besar dari sekadar membangun gedung. Ia ingin membangun bangsa. Ia sering berpidato di depan banyak orang, dan kata-katanya membuat rakyat percaya bahwa Indonesia bisa merdeka.'],
      ['a3', 'Pemerintah penjajah tidak suka dengan perjuangan Soekarno. Ia pernah dipenjara, lalu diasingkan jauh dari keluarganya, ke Ende di Pulau Flores dan kemudian ke Bengkulu. Di Ende, ia sering duduk di bawah pohon sukun, merenungkan dasar negara untuk Indonesia kelak.'],
      ['a4', 'Pada 1 Juni 1945, Soekarno berpidato di depan para tokoh bangsa. Ia menyampaikan gagasan tentang lima dasar negara, yang kemudian kita kenal sebagai Pancasila. Dasar itu mempersatukan rakyat Indonesia yang berbeda-beda suku, agama, dan bahasanya.'],
      ['p3', 'Lalu tibalah hari yang bersejarah. Pagi hari, 17 Agustus 1945, orang-orang berkumpul di depan rumah Soekarno di Jalan Pegangsaan Timur 56, Jakarta. Mereka datang dengan hati berdebar. Semua menunggu sesuatu yang sangat penting.'],
      ['p4', 'Sekitar pukul sepuluh pagi, Soekarno berdiri bersama Mohammad Hatta. Dengan suara tegas, ia membacakan teks Proklamasi: "Kami bangsa Indonesia dengan ini menyatakan kemerdekaan Indonesia." Semua yang hadir mendengarkan dengan haru. Indonesia telah merdeka!'],
      ['a5', 'Bendera yang dikibarkan hari itu dijahit sendiri oleh Ibu Fatmawati, istri Soekarno. Bendera itu sederhana, berwarna merah dan putih. Kini bendera bersejarah itu dikenal dengan nama Sang Saka Merah Putih.'],
      ['p5', 'Bendera Merah Putih pun dinaikkan perlahan-lahan. Semua orang berdiri tegak dan menyanyikan Indonesia Raya bersama-sama. Ada yang tersenyum, ada yang meneteskan air mata bahagia. Hari itu, Merah Putih berkibar sebagai bendera negara yang merdeka.'],
      ['p6', 'Keesokan harinya, Soekarno dipilih menjadi Presiden pertama Republik Indonesia, dan Mohammad Hatta menjadi Wakil Presiden. Rakyat menyambut mereka dengan gembira. Sampai sekarang, Soekarno dan Hatta dikenang sebagai Bapak Proklamator Indonesia.'],
      ['a6', 'Kini, setiap 17 Agustus, kita merayakan Hari Kemerdekaan dengan upacara bendera dan lomba tujuh belasan. Saat bendera naik, ingatlah perjuangan Soekarno dan para pahlawan. Kemerdekaan adalah hadiah berharga yang harus kita jaga bersama.'],
    ],
    quiz: [
      { prompt: 'Kapan Proklamasi Kemerdekaan dibacakan?', options: ['17 Agustus 1945', '10 November 1945', '1 Juni 1945', '28 Oktober 1928'], correctAnswer: '17 Agustus 1945', explanation: 'Proklamasi dibacakan pada pagi hari, 17 Agustus 1945.' },
      { prompt: 'Siapa yang membacakan Proklamasi bersama Soekarno?', options: ['Mohammad Hatta', 'Ki Hajar Dewantara', 'Sutan Sjahrir', 'Jenderal Sudirman'], correctAnswer: 'Mohammad Hatta', explanation: 'Soekarno berdiri bersama Mohammad Hatta saat membacakan Proklamasi.' },
      { prompt: 'Apa nama kecil Soekarno?', options: ['Kusno', 'Karno', 'Bung', 'Rudy'], correctAnswer: 'Kusno', explanation: 'Waktu kecil namanya Kusno, lalu diganti menjadi Soekarno.' },
    ],
  },
  {
    id: 'story-pohon-beringin',
    title: 'Rahasia Pohon Beringin Tua',
    summary: 'Tiara menemukan rahasia pohon tua, lalu berani membelanya.',
    trailStop: 1,
    coverArt: 'p1',
    pages: [
      ['p2', 'Setiap pulang sekolah, Tiara duduk di bawah pohon beringin tua di tengah desa. Daunnya berdesir, srek... srek... seperti sedang berbisik. "Pohon, kamu mau bilang apa?" tanya Tiara sambil tertawa.'],
      ['p1', 'Pohon itu besar sekali. Akar-akarnya menjuntai seperti tirai panjang. Kata Kakek, umurnya sudah ratusan tahun, lebih tua dari semua rumah di desa. Bahkan lebih tua dari kakeknya Kakek!'],
      ['p3', '"Pohon ini menyimpan rahasia," kata Kakek suatu sore. Tiara langsung duduk tegak. "Rahasia apa, Kek?" Kakek tersenyum dan menunjuk ke atas. "Coba lihat baik-baik. Siapa saja yang tinggal di sana?"'],
      ['p4', 'Tiara mendongak. Ternyata pohon itu penuh penghuni! Sepasang burung sedang membuat sarang. Semut berbaris naik ke batang. Kupu-kupu kuning hinggap di daun. "Wah, pohon ini seperti rumah susun!" seru Tiara.'],
      ['a1', 'Suatu hari, ada kabar mengejutkan. Pak Kepala Desa berkata pohon beringin akan ditebang untuk membuat jalan baru. Banyak orang mengangguk setuju. Hati Tiara berdebar. Ia mengangkat tangan tinggi-tinggi. "Tunggu! Boleh saya bicara?"'],
      ['a2', 'Tiara mengajak semua orang melihat ke atas pohon. Ia menunjuk sarang burung, barisan semut, dan kupu-kupu. "Kalau pohon ini ditebang, mereka mau tinggal di mana?" tanyanya pelan. Semua orang terdiam dan saling pandang.'],
      ['p5', 'Kakek maju ke depan. "Tiara benar," katanya. "Pohon ini juga memberi kita udara bersih dan tempat berteduh. Waktu kecil, kami bermain di bawahnya setiap hari." Beberapa orang tua ikut tersenyum, mengingat masa kecil mereka.'],
      ['a3', 'Tiba-tiba hujan turun deras. Semua orang berlari dan berteduh di bawah pohon beringin. Daunnya yang lebat seperti payung raksasa. Tidak ada yang basah kuyup. Pak Kepala Desa tertawa. "Baiklah, pohon ini menang!"'],
      ['p6', 'Jalan baru akhirnya dibuat memutar, dan pohon beringin tetap berdiri. Esok harinya, Tiara dan teman-temannya menanam bibit pohon baru di sekeliling desa. Mereka menyiramnya setiap pagi dengan gembor.'],
      ['a4', 'Sore itu, Tiara duduk lagi di bawah pohon beringin bersama Kakek. Daunnya berdesir pelan, srek... srek... "Sekarang aku tahu pohon ini bilang apa," kata Tiara. "Dia bilang, terima kasih."'],
    ],
    quiz: [
      { prompt: 'Siapa saja yang tinggal di pohon beringin?', options: ['Burung, semut, dan kupu-kupu', 'Kucing dan anjing', 'Ikan dan katak', 'Tidak ada'], correctAnswer: 'Burung, semut, dan kupu-kupu', explanation: 'Tiara melihat burung membuat sarang, semut berbaris, dan kupu-kupu hinggap di daun.' },
      { prompt: 'Kenapa pohon beringin akan ditebang?', options: ['Karena sudah mati', 'Untuk membuat jalan baru', 'Untuk kayu bakar', 'Karena terlalu gelap'], correctAnswer: 'Untuk membuat jalan baru', explanation: 'Pak Kepala Desa ingin membuat jalan baru di tempat pohon itu.' },
      { prompt: 'Apa yang terjadi saat hujan turun deras?', options: ['Semua orang pulang', 'Pohon tumbang', 'Semua orang berteduh di bawah pohon', 'Tiara menangis'], correctAnswer: 'Semua orang berteduh di bawah pohon', explanation: 'Daun beringin yang lebat menjadi payung raksasa bagi semua orang.' },
    ],
  },
  {
    id: 'story-kartini',
    title: 'Kartini: Surat untuk Masa Depan',
    summary: 'Gadis dari Jepara yang memperjuangkan hak perempuan untuk bersekolah.',
    trailStop: 3,
    photo: 'kartini.webp',
    pages: [
      ['p1', 'Pada 21 April 1879, di Jepara, Jawa Tengah, lahirlah seorang anak perempuan bernama Kartini. Ayahnya kemudian menjadi bupati, pemimpin daerah Jepara. Sejak kecil, Kartini senang sekali membaca. Ia bisa duduk berjam-jam di beranda dengan sebuah buku, sampai lupa dipanggil makan.'],
      ['a1', 'Kartini beruntung bisa bersekolah di sekolah Belanda. Di sana ia belajar membaca, menulis, berhitung, dan berbahasa Belanda. Kartini murid yang pintar dan suka bertanya, "Kenapa begitu?" dan "Bagaimana caranya?" Gurunya kagum pada semangat belajarnya.'],
      ['a2', 'Tetapi saat berumur dua belas tahun, Kartini harus berhenti sekolah. Menurut adat pada masa itu, anak perempuan bangsawan harus tinggal di rumah sampai menikah. Kartini sedih sekali. Dari balik jendela, ia bertanya dalam hati, "Kenapa anak perempuan tidak boleh terus belajar?"'],
      ['p2', 'Kartini tahu ia tidak sendirian. Pada masa itu, sebagian besar anak perempuan di negeri kita tidak bisa bersekolah. Padahal banyak dari mereka juga ingin pandai membaca dan menulis, sama seperti anak laki-laki.'],
      ['a3', 'Kartini tidak mau menyerah. Di rumah, ia terus belajar sendiri. Ia membaca buku, koran, dan majalah dalam bahasa Belanda. Ia belajar tentang negeri-negeri lain dan tentang cara anak-anak di sana bersekolah. Setiap halaman membuatnya semakin bersemangat.'],
      ['p3', 'Kartini juga rajin menulis surat. Ia bersahabat pena dengan teman-teman di negeri Belanda, seperti Rosa Abendanon dan Stella Zeehandelaar. Dalam suratnya, Kartini menulis tentang mimpinya: semua perempuan Indonesia bisa bersekolah, pintar, dan mandiri.'],
      ['a4', 'Kartini punya dua adik yang selalu mendukungnya, Roekmini dan Kardinah. Mereka bertiga sering membaca, melukis, dan berdiskusi bersama. "Suatu hari, kita akan membuat sekolah untuk anak-anak perempuan," kata Kartini. Kedua adiknya mengangguk penuh semangat.'],
      ['p4', 'Mimpi itu akhirnya terwujud. Pada tahun 1903, Kartini membuka sekolah kecil untuk anak-anak perempuan di Jepara. Murid-muridnya belajar membaca, menulis, menggambar, dan keterampilan tangan. Kartini mengajar dengan sabar dan penuh kasih sayang.'],
      ['a5', 'Sayangnya, Kartini tidak berumur panjang. Ia wafat pada tahun 1904, saat usianya baru 25 tahun. Banyak orang merasa sangat kehilangan. Tetapi mimpi Kartini tidak ikut hilang. Mimpinya tersimpan di dalam surat-surat yang pernah ia tulis.'],
      ['p5', 'Beberapa tahun kemudian, surat-surat Kartini dikumpulkan dan dibukukan. Dalam bahasa Indonesia, buku itu berjudul Habis Gelap Terbitlah Terang. Artinya, setelah masa gelap, datanglah masa yang terang. Banyak orang membacanya dan ikut bersemangat.'],
      ['a6', 'Lalu berdirilah Sekolah Kartini di berbagai kota, dan semakin banyak anak perempuan bisa bersekolah. Kartini kemudian ditetapkan sebagai Pahlawan Nasional. Hari kelahirannya, 21 April, kita rayakan setiap tahun sebagai Hari Kartini.'],
      ['p6', 'Hari ini, anak perempuan dan anak laki-laki bisa belajar bersama di sekolah. Itu berkat perjuangan orang-orang seperti Kartini. Setiap kali kamu membuka buku, ingatlah Kartini, gadis dari Jepara yang tidak pernah berhenti bermimpi dan belajar.'],
    ],
    quiz: [
      { prompt: 'Di kota mana Kartini lahir?', options: ['Jepara', 'Surabaya', 'Bandung', 'Medan'], correctAnswer: 'Jepara', explanation: 'Kartini lahir di Jepara, Jawa Tengah, pada 21 April 1879.' },
      { prompt: 'Bagaimana Kartini menyampaikan mimpinya kepada sahabat-sahabatnya?', options: ['Lewat lagu', 'Lewat surat', 'Lewat lukisan', 'Lewat telepon'], correctAnswer: 'Lewat surat', explanation: 'Kartini rajin menulis surat kepada sahabat penanya di negeri Belanda.' },
      { prompt: 'Apa judul buku kumpulan surat Kartini?', options: ['Laskar Pelangi', 'Habis Gelap Terbitlah Terang', 'Bumi Manusia', 'Si Kancil'], correctAnswer: 'Habis Gelap Terbitlah Terang', explanation: 'Surat-surat Kartini dibukukan dengan judul Habis Gelap Terbitlah Terang.' },
    ],
  },
  {
    id: 'story-penjaga-terumbu',
    title: 'Penjaga Terumbu Karang',
    summary: 'Lumi si ikan kecil dan Pak Penyu menyelamatkan rumah mereka.',
    trailStop: 2,
    coverArt: 'p2',
    pages: [
      ['p1', 'Di laut biru Indonesia, hiduplah ikan kecil berwarna jingga bernama Lumi. Siripnya kecil, tapi berenangnya cepat sekali. Setiap pagi, Lumi menyapa sinar matahari yang menembus air. "Selamat pagi, Laut!"'],
      ['p2', 'Rumah Lumi adalah terumbu karang. Karangnya merah, ungu, kuning, dan biru, seperti taman bunga di bawah air. Ribuan ikan tinggal di sana. Ada yang bersembunyi, ada yang bermain, ada yang sibuk mencari makan.'],
      ['a1', 'Lumi paling suka bermain petak umpet bersama teman-temannya. Ia bersembunyi di balik karang bercabang. "Satu, dua, tiga... ketemu!" seru Kepiting Kecil. Lumi tertawa sampai gelembungnya naik ke atas. Blup, blup, blup!'],
      ['p3', 'Tapi suatu hari, ada sesuatu yang aneh. Sebuah kantong plastik besar menyangkut di karang. Kantong itu melambai-lambai seperti hantu. Ikan-ikan kecil susah lewat, dan karang di bawahnya jadi gelap tertutup.'],
      ['a2', '"Aku terlalu kecil untuk memindahkannya," pikir Lumi. Lalu ia ingat seseorang. Lumi berenang secepat-cepatnya ke gua karang, tempat Pak Penyu sedang tidur siang. "Pak Penyu, bangun! Laut kita butuh bantuan!"'],
      ['p4', 'Pak Penyu membuka matanya pelan-pelan, lalu ikut berenang. Ia menggigit ujung kantong itu. Lumi mendorong dari bawah sekuat tenaga. "Satu, dua, tarik!" Sedikit demi sedikit, kantong plastik itu naik ke permukaan.'],
      ['p5', 'Di atas air, seorang nelayan sedang mendayung perahunya. Ia melihat kantong plastik itu, lalu mengambilnya dengan hati-hati. "Terima kasih, Penyu dan ikan kecil," katanya kagum. "Plastik bisa membuat penyu dan ikan sakit."'],
      ['a3', 'Sore harinya, Pak Nelayan bercerita kepada anak-anak di pantai. "Sampah plastik bisa terbawa sampai ke laut," katanya. Anak-anak berjanji tidak akan membuang sampah sembarangan. Mereka bahkan memungut sampah di pantai bersama-sama.'],
      ['a4', 'Di bawah laut, Lumi mengumpulkan teman-temannya. "Ayo kita jadi Penjaga Terumbu Karang!" Sejak itu, setiap pagi mereka berkeliling. Kalau ada sampah, mereka segera memanggil Pak Penyu atau memberi tanda kepada nelayan.'],
      ['p6', 'Terumbu karang kembali cerah dan ramai. Ikan-ikan bermain, karang-karang tumbuh, dan Pak Penyu bisa tidur siang dengan tenang lagi. Lumi tersenyum lebar. Ternyata ikan sekecil apa pun bisa membuat perubahan besar.'],
    ],
    quiz: [
      { prompt: 'Apa warna Lumi?', options: ['Jingga', 'Biru', 'Hijau', 'Ungu'], correctAnswer: 'Jingga', explanation: 'Lumi adalah ikan kecil berwarna jingga.' },
      { prompt: 'Siapa yang membantu Lumi memindahkan kantong plastik?', options: ['Pak Penyu', 'Pak Hiu', 'Bu Paus', 'Kepiting Kecil'], correctAnswer: 'Pak Penyu', explanation: 'Lumi membangunkan Pak Penyu, lalu mereka mendorong plastik itu bersama-sama.' },
      { prompt: 'Apa janji anak-anak di pantai?', options: ['Tidak membuang sampah sembarangan', 'Berenang setiap hari', 'Menangkap ikan', 'Membuat istana pasir'], correctAnswer: 'Tidak membuang sampah sembarangan', explanation: 'Setelah mendengar cerita Pak Nelayan, anak-anak berjanji tidak membuang sampah sembarangan.' },
    ],
  },
  {
    id: 'story-habibie',
    title: 'B.J. Habibie: Mimpi Terbang Tinggi',
    summary: 'Rudy kecil dari Parepare yang membuat pesawat dan menjadi Presiden ke-3 RI.',
    trailStop: 4,
    photo: 'habibie.webp',
    pages: [
      ['p1', 'Pada 25 Juni 1936, di Parepare, Sulawesi Selatan, lahirlah Bacharuddin Jusuf Habibie. Keluarganya memanggilnya Rudy. Rudy kecil senang duduk di tepi pantai sambil memandangi burung-burung yang terbang. "Bagaimana caranya burung bisa melayang di udara?" tanyanya dalam hati.'],
      ['a1', 'Rudy sangat suka membaca dan merakit sesuatu. Ia membuat pesawat-pesawatan dari kayu dan kertas, lalu menerbangkannya di halaman. Kalau pesawatnya jatuh, ia tidak marah. Ia memperbaikinya dan mencoba lagi. Sejak kecil, Rudy tahu bahwa gagal adalah bagian dari belajar.'],
      ['a2', 'Saat Rudy masih remaja, ayahnya meninggal dunia. Ibunya bekerja keras agar anak-anaknya tetap bisa bersekolah. Rudy tidak mau mengecewakan ibunya. Ia belajar dengan sungguh-sungguh, terutama pelajaran Matematika dan Fisika.'],
      ['p2', 'Setelah lulus SMA, Habibie kuliah di Bandung, lalu berangkat ke Jerman untuk belajar teknik pesawat terbang. Jerman sangat jauh dan dingin. Ia harus belajar bahasa baru dan hidup hemat. Tetapi Habibie tidak menyerah. Ia belajar siang dan malam.'],
      ['a3', 'Di musim dingin, salju menutupi kota. Habibie berjalan kaki ke kampus sambil membawa setumpuk buku. Ia sering rindu rumah. Tetapi setiap kali melihat pesawat melintas di langit, semangatnya menyala lagi. "Suatu hari, Indonesia harus punya pesawat sendiri," katanya.'],
      ['p3', 'Habibie lulus dan menjadi doktor. Ia bekerja di perusahaan pesawat terbang di Jerman. Di sana, ia menemukan cara menghitung retakan kecil pada badan pesawat, supaya pesawat lebih aman. Karena itu, ia dijuluki "Mr. Crack". Dunia pun mengenal namanya.'],
      ['a4', 'Pada tahun 1974, Indonesia memanggil Habibie pulang. Ia diminta membangun industri pesawat terbang di Bandung. Habibie mengumpulkan anak-anak muda Indonesia yang pintar dan mengajari mereka. "Kita bisa membuat pesawat sendiri," katanya penuh keyakinan.'],
      ['a5', 'Pekerjaan itu tidak mudah. Bertahun-tahun mereka merancang, menghitung, dan merakit ribuan bagian pesawat. Kadang ada yang gagal dan harus diulang. Tetapi mereka terus bekerja sama. Sedikit demi sedikit, pesawat buatan anak bangsa mulai terbentuk.'],
      ['p4', 'Lalu tibalah hari yang dinanti. Pada 10 Agustus 1995, pesawat N250 Gatotkaca terbang untuk pertama kalinya. Mesinnya menderu dan rodanya terangkat dari landasan. Semua orang bersorak! Hari itu kini diperingati sebagai Hari Kebangkitan Teknologi Nasional.'],
      ['p5', 'Habibie kemudian menjadi Wakil Presiden, lalu Presiden ke-3 Republik Indonesia pada tahun 1998. Masa itu adalah masa yang sulit bagi Indonesia. Habibie bekerja keras membantu negara melewatinya, dan memberi rakyat kebebasan lebih luas untuk menyampaikan pendapat.'],
      ['a6', 'Sampai tua, Habibie tetap senang bertemu anak-anak muda. Ia selalu mengingatkan mereka untuk rajin belajar, terutama ilmu pengetahuan dan teknologi. Menurutnya, bangsa yang maju adalah bangsa yang menguasai ilmu pengetahuan.'],
      ['p6', 'Habibie wafat pada tahun 2019, tetapi semangatnya tetap terbang tinggi. Setiap kali kamu melihat pesawat melintas, ingatlah Rudy kecil dari Parepare. Ia membuktikan bahwa anak Indonesia bisa bermimpi setinggi langit, lalu mewujudkannya dengan belajar dan bekerja keras.'],
    ],
    quiz: [
      { prompt: 'Di negara mana Habibie belajar teknik pesawat terbang?', options: ['Jerman', 'Jepang', 'Amerika', 'Australia'], correctAnswer: 'Jerman', explanation: 'Habibie berangkat ke Jerman untuk belajar teknik pesawat terbang.' },
      { prompt: 'Apa nama pesawat buatan Indonesia yang terbang pertama kali pada 1995?', options: ['N250 Gatotkaca', 'Garuda Super', 'Merpati Jaya', 'Elang Biru'], correctAnswer: 'N250 Gatotkaca', explanation: 'Pesawat N250 Gatotkaca terbang pertama kali pada 10 Agustus 1995.' },
      { prompt: 'Kenapa Habibie dijuluki "Mr. Crack"?', options: ['Karena suka bercanda', 'Karena menemukan cara menghitung retakan pada pesawat', 'Karena pernah jatuh', 'Karena suka kerupuk'], correctAnswer: 'Karena menemukan cara menghitung retakan pada pesawat', explanation: 'Habibie menemukan cara menghitung retakan kecil pada badan pesawat supaya pesawat lebih aman.' },
    ],
  },
];

const words = (text: string) => text.match(/\S+/g)?.length ?? 0;

async function main() {
  const uploads = process.env.BOOK_UPLOADS_DIR ?? 'uploads/books';
  const heroes = resolve(__dirname, '../../web/public/books/heroes');
  // Page illustrations live in the web app's public folder (committed).
  const pageArt = resolve(__dirname, '../../web/public/books/pages');
  const artUrl = (bookId: string, art: string) =>
    existsSync(join(pageArt, bookId, `${art}.webp`))
      ? `/books/pages/${bookId}/${art}.webp`
      : null;

  for (const book of BOOKS) {
    await prisma.book.deleteMany({ where: { id: book.id } });

    let coverImageUrl: string | null = book.coverArt ? artUrl(book.id, book.coverArt) : null;
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
        wordCount: words(book.pages.map(([, text]) => text).join(' ')),
        readabilityGrade: 3 + book.trailStop * 0.5,
        generationMeta: { source: 'hand-written sample', estimatedCostUsd: 0 },
        pages: {
          create: book.pages.map(([art, text], i) => ({
            pageNumber: i + 1,
            text,
            imageUrl: artUrl(book.id, art),
          })),
        },
        quizQuestions: {
          create: book.quiz.map((q, i) => ({ order: i + 1, ...q })),
        },
      },
    });
    console.log(`seeded ${book.id} (${book.pages.length} pages)`);
  }
}

main().finally(() => prisma.$disconnect());
