# Marketing Website Redesign — Plan & Content

Status: **draft for founder review** (2026-10-10)
Owner: Claude Code (web design + code), founder (approvals, real contact details)

## 1. Goal

Replace the current one-screen landing page (headline + two buttons, ~70% empty) with a full, modern, bilingual marketing site that makes a parent think "this is a real, professional product I can trust with my child" within 10 seconds — and gets them to try it.

Success looks like:
- A parent understands what WonderPath does, who it's for, and why it's safe, without logging in.
- Atlas (the mascot) is the face of the brand and feels alive.
- Google can find it in Indonesian and English.
- It loads fast on a mid-range Android phone on 4G.

## 1b. Audience

**Millennial parents, roughly 28–40 years old**, mostly in Indonesia. The site speaks to the parent, not the child.

What that means for the site:
- **Credible, modern, not childish.** Atlas brings the warmth; the layout, typography and copy should feel like a well-made modern product a parent would trust, not a cartoon kids' page.
- **Mobile first.** Most visits will come from a phone, often from Instagram, TikTok or WhatsApp links.
- **Respect their time.** Short, scannable sections; the value should be clear within 10 seconds.
- **Transparency over hype.** They want to know what the app actually does with their child's time and data.
- **Their real worries:** screen time that isn't wasted, not knowing where their child struggles, and having little time to help with homework themselves. The copy should speak to these directly.

**Grade scope:** WonderPath is positioned as growing with the child, from pre-K to Grade 6, and later Grades 7–10. **The site does not name the grades currently available.** It stays honest by saying levels are added step by step, rather than claiming grades that have no content yet.

## 2. Decisions (confirmed with founder)

| # | Decision |
|---|---|
| 1 | **Indonesian is the default language** at `/`. English at `/en`. |
| 2 | **No prices on the website.** Parents register and try limited content; pricing appears inside the app after the trial period (e.g. 7 days). The website only promises "try free". The trial/paywall itself is a separate app feature, not part of this redesign. |
| 3 | **Staging stays hidden from Google** (`noindex`). Full SEO goes live once the production domain exists. |
| 4 | **No fake testimonials.** Use a "Founding Families" beta program instead (see section 6.10). |
| 5 | **Contact details are placeholders** for now; the founder fills them in later. |

## 3. Reference

Founder's reference: YouTube "Claude Design + New Design Skill = $10,000 3D Animated Websites" (transcript read via its subtitles on 2026-10-10).

What the video does: builds a cabin-booking site where scrolling plays a drone fly-through video into the cabin and through each room. Workflow: (1) collect a visual reference (Pinterest/Dribbble/awwwards.com) and give it to the AI; (2) build the static site first, with Higgsfield generating all images and videos; (3) add a scroll-driven hero animation using a free add-on ("Scroll World", per auto-captions; exact name and link unconfirmed); (4) host it (Hostinger, the video's sponsor; not needed here, we have the VPS). Extra sources it mentions: LottieFiles (animated illustrations), 21st.dev (copy-paste sections), awwwards.com (inspiration).

Lessons adopted for WonderPath:
- **Reference first.** Founder supplies 1–2 reference designs before building (awwwards.com has a kids/education category).
- **Storyboard the scroll scene shot by shot** (the video's shots came out in random order without a planned path).
- **Approve stills before generating video.** In the video, one unreviewed image put an unwanted sauna into the final fly-through.
- **Mock up before coding.** A visual mockup is approved first; it's cheaper to change than built code.

Our equivalent of the fly-through is Atlas traveling along the WonderPath trail (section 6.5), built with GSAP scroll-scrubbed frames, so the third-party add-on isn't required.

## 4. Visual Direction

**Keep the brand, turn up the energy.** The current tokens stay (indigo `ink #2E2A5C`, coral `#FF6B4A`, trail green `#3DDC97`, waypoint gold `#FFC857`, fog `#F5F7FF`), plus Fraunces for headings and Inter for body text. What changes is how boldly they're used.

- **Packed, not pale.** Sections alternate between rich color blocks: dark indigo, warm coral tint, fresh green tint, gold tint. No long white-on-white stretches.
- **Soft 3D ("claymorphism") cards** that match Atlas's 3D look: rounded 24px corners, soft double shadows, gentle press feedback.
- **The trail motif** (dotted path + waypoint dots, already in the app) runs through the whole page and is what Atlas travels along.
- **Big, confident type.** Headlines in Fraunces at 48–72px on desktop.
- **Numbers in Inter** with tabular figures (Fraunces digits are hard to scan).
- **SVG icons, not emoji**, on the marketing site.
- **Motion with meaning:** things animate because they explain something (Atlas moving along the steps), not as decoration. Everything respects `prefers-reduced-motion`.

## 5. Site Map & Languages

| Page | Indonesian (default) | English |
|---|---|---|
| Home (one long page) | `/` | `/en` |
| Privacy policy | `/privasi` | `/en/privacy` |
| Terms of use | `/ketentuan` | `/en/terms` |

The app itself (`/login`, `/register`, `/dashboard`, `/learn/...`) stays English-only and unchanged in this project. Translating the app is a later project.

## 6. Home Page — Section by Section

Each section lists purpose, layout, and draft copy in both languages. The Indonesian is written as natural Indonesian for parents (warm, direct, "Anda"), not translated English. Final copy gets one more polish pass during the build.

### 6.1 Top Bar (sticky)
- Logo + "WonderPath"
- Links: Cara Kerja / How it works · Fitur / Features · Untuk Orang Tua / For parents · Tanya Jawab / FAQ
- Language switch **ID | EN**
- "Masuk" / "Log in" (text link) + **"Coba Gratis" / "Try it free"** (coral button)
- Becomes solid with a soft shadow after scrolling; collapses to a menu on mobile.

### 6.2 Hero
**Layout:** text left, Atlas video right (stacked on mobile, Atlas first). Dark indigo background with the dotted trail curving behind Atlas.

| | Indonesian | English |
|---|---|---|
| Eyebrow | Teman belajar yang tumbuh bersama anak | A learning companion that grows with your child |
| Headline | Setiap anak punya jalannya sendiri. Atlas tahu jalannya. | Every child has their own path. Atlas knows the way. |
| Sub | WonderPath menyesuaikan setiap soal dengan cara anak Anda belajar. Saat anak keliru, Atlas menjelaskan dengan suara, pelan-pelan, tanpa menghakimi. Anda melihat perkembangannya setiap minggu, tanpa menebak-nebak. | WonderPath adapts every question to how your child learns. When they get stuck, Atlas explains out loud, patiently, without judgment. You see their progress every week, no guesswork. |
| Primary button | Coba Gratis | Try it free |
| Secondary button | Lihat cara kerjanya ↓ | See how it works ↓ |
| Trust row | IB · Kurikulum Nasional · Matematika & Bahasa Inggris · Tanpa iklan | IB · Kurikulum Nasional · Math & English · No ads |

Alternative headline (if the founder prefers a benefit-led line):
- ID: "Belajar yang menemukan bagian sulitnya, lalu membantunya."
- EN: "Learning that finds the hard part, then helps with it."

Note: no grade ranges anywhere on the site (see 1b). The trust row lists only curricula and subjects, which are true today.

### 6.3 Real Numbers Strip
Gold background, 4 big numbers, counting up when scrolled into view. **Only real numbers.**

| Number | Indonesian | English |
|---|---|---|
| 1.680+ | soal latihan yang sudah diperiksa | practice questions, reviewed |
| 2 | kurikulum: IB & Nasional | curricula: IB & Nasional |
| 2 | bahasa: Indonesia & Inggris | languages: Indonesian & English |
| 0 | iklan, selamanya | ads, ever |

### 6.4 The Problem
Light coral tint. Three short "pain" cards, then a one-line turn.

| | Indonesian | English |
|---|---|---|
| Headline | Satu lembar kerja untuk semua anak? Tidak pernah berhasil. | One worksheet for every child? It never works. |
| Card 1 | Anak yang sudah paham jadi bosan, lalu malas. | Kids who already get it get bored, then tune out. |
| Card 2 | Anak yang tertinggal jadi minder, lalu menyerah. | Kids who are behind lose confidence, then give up. |
| Card 3 | Orang tua tidak tahu bagian mana yang sebenarnya sulit. | Parents can't tell which part is actually the problem. |
| Turn | WonderPath bekerja seperti guru les yang memperhatikan setiap jawaban, bukan hanya nilainya. | WonderPath works like a tutor who pays attention to every answer, not just the score. |

### 6.5 How It Works (signature scroll scene)
Dark indigo. **Atlas travels along the trail** as the parent scrolls, stopping at 3 waypoints. Desktop: scroll-driven video frames. Mobile / reduced motion: three still images stacked.

| Stop | Indonesian | English |
|---|---|---|
| Section headline | Tiga langkah, satu jalan belajar. | Three steps, one learning path. |
| 1 — title | Atlas mengenali | Atlas notices |
| 1 — text | Dari jawaban pertama, Atlas melihat topik mana yang sudah kuat dan mana yang perlu dilatih. Bukan hanya benar atau salah, tapi juga seberapa cepat, apakah pakai petunjuk, dan bagaimana rasanya bagi anak. | From the first answers, Atlas sees which topics are solid and which need work. Not just right or wrong, but how fast, whether a hint was used, and how it felt to your child. |
| 2 — title | Latihan yang menyesuaikan | Practice that adapts |
| 2 — text | Soal jadi lebih menantang saat anak siap, dan lebih ringan disertai penjelasan saat anak kesulitan. Jawab 4 dari 6 soal dengan benar, dan anak naik level. | Questions get harder when your child is ready, and gentler with explanations when they struggle. Get 4 out of 6 right, and they level up. |
| 3 — title | Anda melihat hasilnya | You see the results |
| 3 — text | Setiap minggu, ringkasan yang jelas: berapa hari berlatih, seberapa akurat, topik apa yang sudah dikuasai, dan apa yang sebaiknya dipelajari berikutnya. | Every week, a clear snapshot: days practiced, accuracy, topics mastered, and what to work on next. |

### 6.6 Features (bento grid)
Fresh green tint. One large card + five smaller, two marked "Segera hadir / Coming soon".

| Feature | Indonesian | English |
|---|---|---|
| Adaptive practice (large) | **Latihan yang tahu kapan harus naik level.** Atlas menyesuaikan tingkat kesulitan secara otomatis, topik demi topik. | **Practice that knows when to level up.** Atlas adjusts difficulty automatically, topic by topic. |
| Atlas explains aloud | **Penjelasan dengan suara.** Saat anak keliru, Atlas membacakan penjelasannya, mulutnya bergerak mengikuti suara. | **Explanations out loud.** When your child gets it wrong, Atlas reads the explanation, mouth moving with every word. |
| Choose a topic + grade ahead | **Anak bisa memilih topik.** Atau mencoba topik kelas berikutnya saat merasa siap. | **Kids can choose a topic.** Or try next grade's topics when they're ready. |
| Parent dashboard | **Ringkasan mingguan untuk orang tua.** Hari berlatih, akurasi, dan topik yang dikuasai, dalam satu layar. | **A weekly snapshot for parents.** Practice days, accuracy, and mastered topics on one screen. |
| Child mode + PIN | **Mode anak yang aman.** Area orang tua terkunci PIN, jadi anak tetap di area belajar. | **A safe kid mode.** The parent area is PIN-locked, so kids stay in the learning area. |
| Story Trail — coming soon | **Story Trail.** Perpustakaan buku cerita bertingkat, dibacakan oleh Atlas. | **Story Trail.** A leveled storybook library, read aloud by Atlas. |
| Points & Rewards — coming soon | **Poin & Hadiah.** Anak mengumpulkan poin, orang tua menentukan target dan hadiahnya. | **Points & Rewards.** Kids earn points; parents set the goals and the rewards. |

### 6.7 Meet Atlas
Gold tint, playful. Big interactive Atlas (hover = grin, tap = speaks a greeting in the current language, mouth synced).

| | Indonesian | English |
|---|---|---|
| Headline | Kenalan dengan Atlas. | Meet Atlas. |
| Text | Atlas adalah bola dunia kecil yang menemani setiap sesi belajar. Ia ikut senang saat anak benar, menjelaskan pelan-pelan saat anak keliru, dan tidak pernah membuat anak merasa bodoh. | Atlas is a little globe who joins every learning session. Atlas celebrates when your child gets it right, explains slowly when they don't, and never makes them feel silly. |
| Hint | Ketuk Atlas untuk menyapa 👋 | Tap Atlas to say hello 👋 |
| Greeting audio | "Halo! Aku Atlas. Yuk, kita belajar bareng!" | "Hi! I'm Atlas. Let's learn something new together!" |

The Indonesian greeting needs an Indonesian voice (Google TTS has `id-ID` WaveNet voices); generate once and save.

### 6.8 Parent Dashboard Showcase
White card on indigo. A real screenshot of the new "This week" dashboard, with 3 numbered callouts.

| | Indonesian | English |
|---|---|---|
| Headline | Tahu perkembangan anak dalam 30 detik. | Know how your child is doing in 30 seconds. |
| Callout 1 | Berapa hari anak berlatih minggu ini | How many days they practiced this week |
| Callout 2 | Topik mana yang sudah dikuasai, dan mana yang perlu perhatian | Which topics are mastered, and which need attention |
| Callout 3 | Saran Atlas untuk langkah berikutnya | Atlas's suggestion for what's next |

### 6.9 Safety & Trust
Soft green tint. Four short promises with icons.

| | Indonesian | English |
|---|---|---|
| Headline | Aman untuk anak, tenang untuk orang tua. | Safe for kids. Peace of mind for parents. |
| 1 | **Tanpa iklan.** Tidak ada iklan, tidak ada tautan keluar. | **No ads.** No ads, no links out. |
| 2 | **Area orang tua terkunci.** Pengaturan dilindungi PIN. | **Locked parent area.** Settings are PIN-protected. |
| 3 | **Konten diperiksa.** Setiap soal dan cerita diperiksa sebelum tampil untuk anak. | **Reviewed content.** Every question and story is checked before a child sees it. |
| 4 | **Data anak tidak dijual.** Data hanya dipakai untuk membantu anak belajar. | **Your child's data is never sold.** It's only used to help your child learn. |

Promise 3 holds for the question bank today (reviewed + automated checks). Keep the wording accurate as Story Trail ships.

### 6.10 Founding Families (beta program, in place of testimonials)
Coral background, high energy.

| | Indonesian | English |
|---|---|---|
| Eyebrow | Program Keluarga Perintis | Founding Families Program |
| Headline | Jadilah keluarga pertama yang membentuk WonderPath. | Be one of the first families to shape WonderPath. |
| Text | Kami membuka tempat terbatas untuk keluarga yang ingin mencoba lebih awal dan memberi masukan langsung. | We're opening limited spots for families who want early access and a direct say in what we build. |
| Benefit 1 | Akses gratis selama masa beta | Free access during the beta |
| Benefit 2 | Jalur WhatsApp langsung ke pendiri | A direct WhatsApp line to the founder |
| Benefit 3 | Masukan Anda jadi prioritas fitur | Your feedback shapes what we build next |
| Benefit 4 | Lencana "Keluarga Perintis" di profil anak | A "Founding Family" badge on your child's profile |
| Button | Daftar sebagai Keluarga Perintis | Join as a Founding Family |

**Needs founder decision:** how many spots (suggest 100), and whether to add "founding price locked in for life" (strong motivator, but a real commitment). Once real families give feedback, replace this section's lower half with real quotes, with their permission.

### 6.11 FAQ (also marked up for Google)

| Question (ID) | Answer (ID) |
|---|---|
| Untuk usia berapa WonderPath? | WonderPath dirancang untuk tumbuh bersama anak, dari prasekolah hingga SD, dan nantinya SMP. Kami menambah jenjang secara bertahap. Daftarkan anak Anda, dan kami akan mengabari saat jenjangnya tersedia. |
| Kurikulum apa yang didukung? | IB dan Kurikulum Nasional, untuk Matematika dan Bahasa Inggris. |
| Berapa biayanya? | Anda bisa mencoba gratis. Informasi paket akan muncul di dalam aplikasi setelah masa coba. |
| Berapa lama anak perlu belajar setiap hari? | Sekitar 10–15 menit sehari sudah cukup. Konsistensi lebih penting daripada durasi. |
| Bisa untuk lebih dari satu anak? | Bisa. Satu akun orang tua bisa memiliki beberapa profil anak, masing-masing dengan jalur belajarnya sendiri. |
| Perangkat apa yang bisa dipakai? | Cukup browser di HP, tablet, atau laptop. Tidak perlu install aplikasi. |
| Apakah aman untuk anak? | Ya. Tanpa iklan, area orang tua dikunci PIN, dan semua konten diperiksa sebelum tampil. |

| Question (EN) | Answer (EN) |
|---|---|
| What age is WonderPath for? | WonderPath is built to grow with your child, from pre-K through primary school, and later middle school. We add levels step by step. Sign your child up and we'll let you know when their level is ready. |
| Which curricula are supported? | IB and Kurikulum Nasional, for Math and English. |
| How much does it cost? | You can try it free. Plan details appear inside the app after the trial. |
| How long should my child practice each day? | About 10–15 minutes a day is enough. Consistency matters more than length. |
| Does it work for more than one child? | Yes. One parent account can hold several child profiles, each with their own learning path. |
| What devices does it work on? | Any browser on a phone, tablet, or laptop. Nothing to install. |
| Is it safe for kids? | Yes. No ads, a PIN-locked parent area, and every piece of content is reviewed first. |

### 6.12 Final Call to Action
Dark indigo, Atlas celebrating (video loop).

| | Indonesian | English |
|---|---|---|
| Headline | Jalan belajar anak Anda dimulai hari ini. | Your child's learning path starts today. |
| Text | Daftar dalam satu menit. Coba gratis, tanpa kartu kredit. | Sign up in a minute. Try it free, no credit card. |
| Button | Coba Gratis | Try it free |

"No credit card" must stay true when the trial/paywall is built — flag for that spec.

### 6.13 Footer
- Logo + one-line description (ID: "Teman belajar adaptif yang tumbuh bersama anak." / EN: "An adaptive learning companion that grows with your child.")
- Links: How it works, Features, FAQ, Privacy, Terms
- Contact (**placeholders**): WhatsApp `+62 812-0000-0000`, email `halo@wonderpath.example`, Instagram `@wonderpath.example`
- Language switch
- "© 2026 WonderPath. Dibuat dengan ❤️ di Indonesia." / "Made with ❤️ in Indonesia."

## 7. Atlas Assets (Higgsfield)

Rule: **every Atlas image and video starts from the locked base image** (`apps/web/public/mascot/atlas-base-reference.png`) via image editing / image-to-video. Never generate Atlas fresh from text, or the character drifts.

**Stills** (image edit, ~6):
1. Waving hello (hero poster, Meet Atlas)
2. Holding a magnifying glass (step 1, "Atlas notices")
3. Climbing / stepping up a small staircase (step 2, "levels up")
4. Holding a clipboard with a chart (step 3, parent dashboard)
5. Reading an open book (Story Trail card)
6. Celebrating with confetti (final call to action)

**Videos** (Kling 3.0 image-to-video, 5s each, ~5 clips):
1. Hero loop: Atlas floating and waving, gentle bob, seamless loop
2–4. Journey clips: Atlas moving between the three trail stops (used for the scroll scene)
5. Celebration loop: Atlas jumping with confetti

**Backgrounds:** generate videos on a flat background matching the section color (e.g. indigo `#2E2A5C`), so they blend in without needing transparent video.

**Processing** (ffmpeg): H.264 MP4 + WebM, poster frame as AVIF/WebP, scroll scene cut into ~90 WebP frames. ffmpeg availability on this machine must be checked first.

**Estimated cost:** ~6 stills (cents each) + ~5 clips (a few dollars each, depending on the Higgsfield plan) ≈ under ~$25 total. Get founder approval before generating.

## 8. SEO

**Target keywords (Indonesian first):** aplikasi belajar anak, aplikasi belajar anak SD, latihan soal matematika SD, belajar bahasa Inggris anak, kurikulum nasional, belajar IB anak, les online anak.
**English:** adaptive learning app for kids, IB primary math practice, kids learning app Indonesia.

**On-page:**
- One `h1` per page, sequential headings, descriptive alt text
- Per-language `<title>` and meta description
- `hreflang` alternates (`id`, `en`, `x-default` → `id`) and canonical URLs
- Per-language Open Graph/Twitter share images (Atlas + headline)
- Correct `<html lang>` per language

**Structured data (JSON-LD):** `Organization`, `WebSite`, `EducationalApplication` (or `SoftwareApplication`), `FAQPage` (from 6.11).

**Technical:**
- `sitemap.xml` and `robots.txt` generated by Next.js
- **`noindex` everywhere unless `NEXT_PUBLIC_SITE_ENV=production`**, so staging never gets indexed
- Fast loading counts toward ranking; see the performance budget below

**Draft meta:**
- ID title: "WonderPath — Aplikasi Belajar Adaptif untuk Anak"
- ID description: "Latihan Matematika dan Bahasa Inggris yang menyesuaikan kemampuan anak, dengan Atlas sebagai pemandu belajar. Kurikulum IB & Nasional. Coba gratis."
- EN title: "WonderPath — Adaptive Learning for Kids"
- EN description: "Math and English practice that adapts to your child, guided by Atlas. IB & Kurikulum Nasional. Try it free."

## 9. Technical Architecture

- **Languages:** `next-intl`, locales `id` (default, no URL prefix) and `en` (`/en`). Message files at `apps/web/messages/id.json` and `en.json`.
- **Route structure:** marketing pages move under `app/[locale]/...` with their own root layout (so `<html lang>` follows the language). The existing app routes move into an `app/(app)/` route group with the current root layout, unchanged in behavior. The language middleware only matches marketing paths, never `/dashboard`, `/learn`, `/login`, etc.
- **Animation:** GSAP + ScrollTrigger (free, including plugins) with `@gsap/react`. One animation library only.
- **Components:** `apps/web/components/marketing/*`, one file per section.
- **Atlas on the site:** reuse the existing mouth images, `useTtsAudio`, and the hover-grin logic from the corner widget.
- **SEO:** `app/sitemap.ts`, `app/robots.ts`, `generateMetadata` per locale, `opengraph-image.tsx` per locale, JSON-LD component.

## 10. Performance & Accessibility Budget

- Largest Contentful Paint < 2.5s on mobile 4G; Cumulative Layout Shift < 0.1
- Hero poster ≤ 150 KB; hero video lazy-loads after the poster; scroll-scene frames ≤ ~4 MB total, desktop only
- Lighthouse ≥ 90 for Performance, Accessibility, SEO
- Text contrast ≥ 4.5:1 on every colored section
- Keyboard-reachable everything, visible focus rings, all animations disabled under `prefers-reduced-motion`
- Tested at 375, 768, 1024, 1440 px widths

## 11. Phases

1. **Assets** — check ffmpeg; generate Atlas stills + videos on Higgsfield (after cost approval); compress; cut scroll frames; Indonesian + English greeting audio.
2. **Foundation** — route restructure, `next-intl`, message files, SEO plumbing (metadata, hreflang, sitemap, robots with staging `noindex`, JSON-LD).
3. **Sections** — build 6.1–6.13 with final copy in both languages.
4. **Motion & polish** — scroll scene, count-up numbers, reveal animations, reduced-motion fallbacks.
5. **QA** — Lighthouse, accessibility checks, phone testing, both languages, then founder review.

## 12. Placeholders & Open Items

- [ ] Real contact details (WhatsApp, email, Instagram/TikTok)
- [ ] Founding Families: number of spots; founding-price lock yes/no
- [ ] Production domain (unlocks real SEO)
- [ ] Privacy Policy and Terms text (draft placeholders written during the build; should get a proper review before launch, especially for Indonesia's personal data protection law, UU PDP)
- [ ] Founder's notes on the reference video, if different from the interpretation in section 3

## 13. Out of Scope

- The free-trial limit and in-app pricing/paywall (separate app spec)
- Translating the app itself into Indonesian
- Blog / content marketing pages
- Real testimonials (added later, with permission)
