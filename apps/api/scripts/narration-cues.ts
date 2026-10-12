/**
 * Acting cues for ElevenLabs v3 narration. Each cue is inserted just before
 * the first occurrence (after the previous cue) of its anchor text, so the
 * story text itself stays exactly as children read it in the book.
 * Pages without cues are narrated from the plain text.
 */
type Cue = [anchor: string, tag: string];

export const NARRATION_CUES: Record<string, Record<number, Cue[]>> = {
  'story-aryan-telur-naga': {
    1: [['Di dinding', '[warmly]'], ['Ada naga yang terbang', '[playfully]'], ['"Suatu hari,"', '[whispers]']],
    2: [['Sore itu', '[curious]'], ['Sebuah telur!', '[gasps]'], ['Telur itu besar', '[excited]']],
    3: [['Tok...', '[curious]'], ['krak!', '[excited]'], ['Sebuah kepala', '[whispers]'], ['"Hacih!"', '[playfully]'], ['Aryan tertawa', '[laughs]'], ['"Halo, Naga', '[warmly]']],
    4: [['Setiap pagi', '[cheerfully]'], ['Bruk!', '[playfully]'], ['"Tidak apa-apa,"', '[warmly]']],
    5: [['Hari demi hari', '[happily]'], ['Cahaya itu tidak', '[softly]']],
    6: [['Lalu suatu malam', '[mysterious]'], ['Dari balik gunung', '[dramatic]'], ['Satu per satu', '[whispers]']],
    7: [['Api bersembunyi', '[softly]'], ['"Aku takut,"', '[nervous]'], ['Aryan memeluk', '[warmly]'], ['"Tapi kita', '[determined]']],
    8: [['Aryan naik', '[excited]'], ['Naga Hitam silau', '[dramatic]']],
    9: [['Awan gelap pecah', '[amazed]'], ['Di bawah', '[cheerfully]'], ['"Lihat!', '[shouting]']],
    10: [['Malam itu', '[softly]'], ['Sebelum terlelap', '[whispers]']],
  },
  'story-misi-planet-merah': {
    1: [['"Sepuluh', '[slowly, counting down]'], ['"Siap, Pipo?"', '[excited]'], ['Bip-bip!', '[playfully]']],
    2: [['"...tiga', '[building excitement]'], ['Roket bergetar', '[excited]'], ['Berbulan-bulan', '[softly]']],
    3: [['Mars!', '[amazed]'], ['Tidak ada pohon', '[softly]'], ['Hanya sunyi', '[whispers]']],
    4: [['Misi mereka', '[serious]'], ['Pipo mengangguk', '[cheerfully]'], ['Petualangan dimulai!', '[excited]']],
    5: [['Tiba-tiba', '[nervous]'], ['Badai debu datang!', '[dramatic]'], ['Mereka menunggu', '[softly]']],
    6: [['Bip... bip...', '[sadly]'], ['"Tenang, aku di sini,"', '[warmly]'], ['Bip-bip-bip!', '[happily]']],
    7: [['Bip... bip... BIIIP!', '[building excitement]'], ['Ada sesuatu', '[curious]'], ['Sesuatu yang putih', '[whispers]']],
    8: [['Ternyata itu es!', '[gasps]'], ['"Pipo, kita menemukan air', '[excited]']],
    9: [['Malam itu', '[softly]'], ['"Itu Bumi, rumah kita,"', '[whispers]'], ['Sebentar lagi', '[warmly]']],
    10: [['Mereka bersorak', '[cheerfully]'], ['"Kerja bagus, Raka!', '[excited]'], ['Bip-bip! jawab', '[playfully]']],
  },
};

/** The page text with its acting cues inserted (throws if an anchor is missing). */
export function spokenText(bookId: string, pageNumber: number, text: string): string {
  const cues = NARRATION_CUES[bookId]?.[pageNumber];
  if (!cues) return text;
  let out = '';
  let cursor = 0;
  for (const [anchor, tag] of cues) {
    const at = text.indexOf(anchor, cursor);
    if (at < 0) throw new Error(`${bookId} p${pageNumber}: cue anchor not found: ${anchor}`);
    out += text.slice(cursor, at) + `${tag} `;
    cursor = at;
  }
  return out + text.slice(cursor);
}
