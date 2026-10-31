# WonderPath handoff

Last updated: 31 October 2026. Read this first when continuing work on another PC (with Claude Code or OpenCode). It covers the current state, how to run everything, the founder's standing rules, and what is still open. Deeper history lives in `WonderPath_CLAUDE_CONTEXT.md`, `DISCUSSION_LOG.md`, `daily-update.md` and `TEST_ACCOUNTS.md`.

## 1. What WonderPath is

An Indonesian adaptive-learning app for primary-school children, with Atlas (a globe mascot) as the guide. Parents create child profiles; children practise Math and English, read Story Trail books, and earn points that parents turn into rewards. Currently a free beta.

- Staging (the live demo): https://wonderpath.itsmesaid.id (hidden from Google).
- Content available today: **Grades 5 and 6, IB and Kurikulum Nasional, Math and English**. Cambridge and Merdeka are shown as "Segera hadir" (coming soon).

## 2. Repo layout

pnpm monorepo with Turborepo.

| Path | What |
|---|---|
| `apps/api` | NestJS 11 API, Prisma 6, Postgres 16 |
| `apps/web` | Next.js 16 (React 19, Tailwind v4): marketing site, parent dashboard, kid app, Story Trail |
| `apps/cms` | Internal admin |
| `qa-agent/` | Automated QA agent (Playwright); files findings to Linear |
| `specs/` | Sprint specs (OpenCode builds from these) |
| `WonderPath_Content_Guide.md` | **Editorial rules for ALL copy and content** (see section 6) |

## 3. Running locally

1. Start Docker Desktop. The Postgres container is `wonderpath-postgres` (user `postgres` / `postgres`, port 5432).
2. There are **two local databases**:
   - `wonderpath`: scratch DB. The API e2e tests wipe it. The default `.env` points here.
   - `wonderpath_qa`: **the real content** (about 1,900 questions, books, demo accounts). Use this one for real testing.
3. API (port 3001), against the real content:
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wonderpath_qa?schema=public" pnpm --filter api start:dev
   ```
4. Web (port 3000): `pnpm --filter web dev`
5. **Every Prisma migration must be applied to both local databases and to the VPS** (missed migrations have crashed the app before).
6. The founder runs the dev servers himself. Don't start or restart his servers or run `next build` while they are running; give him the command instead. Type-check with `npx tsc --noEmit`.

### Environment variables (names only; never copy secret values between machines)

- `apps/api/.env`: `DATABASE_URL JWT_SECRET JWT_EXPIRES_IN PORT ATLAS_CONTENT_PROVIDER ATLAS_DEEPSEEK_API_KEY ATLAS_DEEPSEEK_MODEL ATLAS_OPENAI_API_KEY ATLAS_OPENAI_MODEL GOOGLE_APPLICATION_CREDENTIALS TTS_UPLOADS_DIR TTS_VOICE_NAME HIGGSFIELD_API_KEY ELEVENLABS_API_KEY`
- Repo root `.env` (scripts and qa-agent): `DEEPSEEK_API_KEY OPENAI_API_KEY QA_OPENAI_MODEL QA_OPENAI_REASONING_EFFORT QA_DEEPSEEK_MODEL QA_DATABASE_URL LINEAR_API_KEY LINEAR_TEAM_ID HIGGSFIELD_API_KEY`
- `apps/api/google-tts-credentials.json`: the Google TTS service account (gitignored). The founder copies it to a new PC himself.

### Test accounts

See `TEST_ACCOUNTS.md`. For tests on real data use **`friends-demo@wonderpath.local`** (fake children: Dewi, Rangga IB; Siti, Budi Nasional). **Never use `demo@wonderpath.local` for tests**: it holds the founder's real daughter (Adeeva, Grade 5, IB).

## 4. Deploying to staging (VPS)

VPS: `ubuntu@43.157.241.209`, project at `~/projects/wonderpath`. pm2 processes: `wonderpath-api` (port 4001) and `wonderpath-web` (port 4000). nginx proxies `/api/` to the API with the prefix stripped.

```
ssh ubuntu@43.157.241.209
cd ~/projects/wonderpath && git pull
pnpm install --frozen-lockfile                 # if dependencies changed
cd apps/api && npx prisma migrate deploy && pnpm build    # if API changed
cd ../web && pnpm build                         # if web changed
pm2 restart wonderpath-api wonderpath-web
```

The VPS is shared with the founder's other client projects and has only 2 GB RAM (already using swap). Don't run heavy jobs there (for example the QA agent with a dev server). A RAM upgrade to 4 GB costs about Rp 90k per month and is the founder's call.

**Content moves to the VPS by export/import, never by copying the whole database** (staging has real families' accounts and progress):

| Content | Local export | VPS import |
|---|---|---|
| New IB topics (Ratio, Grade 6) | `scripts/seed-ib-new-topics.ts --export f.json` | `--import f.json` |
| Rewritten explanations | `scripts/enrich-explanations.ts --export f.json` | `--import f.json` |
| True/False rebalance | `scripts/rebalance-true-false.ts --export f.json` | `--import f.json` (skips answered questions) |
| Story Trail books | `scripts/seed-sample-story-books.ts` (re-seeds all 7) | run the same script on the VPS |
| Book narration (ElevenLabs) | `scripts/narrate-books.ts <bookId>` records; copy `uploads/books/<id>/page-*.mp3` and `narration.json` with scp | `scripts/narrate-books.ts --import <bookId>` |

Run the scripts from `apps/api` with `npx tsx` (or `npx ts-node --transpile-only` for `seed-ib-new-topics.ts`), with `DATABASE_URL` pointing at `wonderpath_qa` locally.

## 5. Current state (what exists)

- **Marketing site** (Indonesian default, `/en` English): rewritten to the content guide; sticky WhatsApp button (+62 812-9999-8014); Privacy (`/privacy`) and Terms (`/terms`) published, linked in the footer. Sign-up and login keep the visitor's language (`?lang=en`).
- **Kid app**: UI language follows the child's curriculum. IB and Cambridge get English; Nasional and Merdeka get Indonesian (`apps/web/lib/kid-copy.ts`). Corner Atlas lip-syncs explanations. No emoji in learning copy. The fun fact appears after the explanation. Question text renders tables and line breaks.
- **Content**:
  - IB Grade 5 has 19 learning objectives (now including Ratio & Proportion). IB Grade 6 has 26 (adds Ratio, Negative Numbers, Algebra, Data & Probability).
  - 1,650 of 1,680 older explanations were rewritten and audited.
  - True/False answers are rebalanced to about 50/50.
  - What's available is listed in `apps/web/lib/content-availability.ts`. **Update it when content is added.** It drives the "coming soon" labels in the child form, kid screen and parent card.
- **Story Trail**: 7 books (Aryan dan Telur Naga Merah, Misi ke Planet Merah, Rahasia Pohon Beringin Tua, Penjaga Terumbu Karang, Soekarno, Kartini, B.J. Habibie), 10 to 12 illustrated pages each. Hardcover two-page reader with page-flip sound, bookmark, text size and progress.
  - Narration: Aryan and Planet Merah use **ElevenLabs v3** (voice `d15jrIAARvF899pDoC6T`, acting cues in `scripts/narration-cues.ts`). The other 5 use Google (Indonesian voice `id-ID-Chirp3-HD-Leda`).
  - Books currently show only for Grade 5 children.
- **Voices**: question explanations use Google TTS (`en-US-Wavenet-H`, pitch 5, rate 0.85), generated on first play and cached, never bulk-generated. Indonesian uses `id-ID-Chirp3-HD-Leda`.
- **Points, goals and rewards** (Sprint 22) and the parent dashboard revamp are live.

## 6. The founder's standing rules (follow these)

1. **Content guide**: all website copy, app text, questions, explanations and stories must follow `WonderPath_Content_Guide.md`. Natural Bahasa Indonesia ("kamu/anakmu", not "Si Kecil" everywhere). Describe real behaviour, not slogans. Never shame or label children. Never invent facts, prices or coverage. No placeholders. No emoji decoration.
2. **Story rules**: reader aged 7 to 9; warm adventure tone; magic must make sense in the story; every unusual detail must serve character, setting or plot (no random jokes like "dragon eating nasi goreng"); goal, obstacle, action, resolution. Biographies: only verified facts, no invented quotes. **Content policy: no LGBTQ+ themes, no romance, no pork, alcohol or gambling, no depictions of prophets, no violence or horror.** These rules are coded in `apps/api/src/atlas/books/content-policy.ts`.
3. **Answers**: be concise, put the recommendation first, skip long preambles.
4. **Workflow**: OpenCode implements the bigger sprints; Claude reviews and fixes directly. For deep backend work, write an OpenCode prompt or spec.
5. **Discussion log**: record new ideas, open questions and decisions, dated, in `DISCUSSION_LOG.md`. The founder turns them into Linear tickets.
6. **Issues and hotfixes are tracked in Linear.** The QA agent files findings there automatically.
7. **Secrets**: never commit credentials. Read only variable names from `.env` files. Copying secrets between machines is done by the founder.
8. **Spending**: ask before spending on paid APIs beyond small pilots. Higgsfield and the ElevenLabs free tier are currently used up.
9. **Commits**: commit and push when asked; the founder reviews on staging.

## 7. Open items

**Waiting on the founder**
- FAQ wording: keep "kelas 5 dan 6" and "IB atau Kurikulum Nasional" (honest, per the guide), or revert to not naming grades.
- Aryan's book: Aryan (the founder's son) is 3 and in pre-K Montessori. Books are currently Grade 5 only. Decide on a family-only book or a Level 0 shelf.
- ElevenLabs top-up (about $5 to 10) to record the other 5 books in the v3 voice. Command: `scripts/narrate-books.ts <bookId>`.
- Higgsfield top-up, if he wants the homepage Atlas art (trail, celebration) turned into video loops. The stills are live.
- VPS RAM upgrade (2 GB to 4 GB), to schedule the QA agent nightly on the VPS.

**Next work**
- **Pre-K and Grades 1 to 4** (estimate given 31 Oct):
  - Grades 1 to 4 questions: about $100 to 200 of AI.
  - Grades 1 to 3 also need read-aloud questions and kid UX changes (OpenCode spec).
  - Pre-K needs audio-first picture activities, which is a new product decision.
  - Recommended first step: a "Level 0" picture-book shelf in Story Trail for young children (about $3 to 5 per book; needs a Higgsfield top-up for pictures).
- **QA agent**:
  - Add checks for Story Trail, points and rewards, and content integrity.
  - Schedule it nightly once the VPS has RAM.
  - Linear keys are already in the VPS root `.env`.
- Optional: about 30 explanations still failed the audit and keep their old text.

## 8. Useful scripts (`apps/api/scripts`)

| Script | Purpose |
|---|---|
| `seed-sample-story-books.ts` | Seeds the 7 books (text, quiz, illustrations from `apps/web/public/books/pages`) |
| `narrate-books.ts` | Pre-records ElevenLabs narration with exact word timings |
| `narration-cues.ts` | Acting cues (`[excited]`, `[whispers]`) per page |
| `enrich-explanations.ts` | Rewrites shallow explanations (DeepSeek writer, OpenAI auditor) |
| `seed-ib-new-topics.ts` | Generates audited IB questions for new topics |
| `rebalance-true-false.ts` | Rebalances True/False answers (never touches answered questions) |
| `generate-story-books.ts` | Full AI book pipeline (writer, auditor, Higgsfield images) per spec 23 |
