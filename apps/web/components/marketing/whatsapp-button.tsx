import { CONTACT, Locale } from "./content";

const LABEL: Record<Locale, { aria: string; text: string; message: string }> = {
  id: {
    aria: "Chat dengan WonderPath lewat WhatsApp",
    text: "Tanya lewat WhatsApp",
    message: "Halo, saya ingin tahu lebih lanjut tentang WonderPath.",
  },
  en: {
    aria: "Chat with WonderPath on WhatsApp",
    text: "Ask on WhatsApp",
    message: "Hi, I'd like to know more about WonderPath.",
  },
};

/** Floating WhatsApp button on the marketing site. */
export default function WhatsAppButton({ locale }: { locale: Locale }) {
  const t = LABEL[locale];
  const href = `${CONTACT.whatsappLink}?text=${encodeURIComponent(t.message)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.aria}
      className="btn-tactile fixed bottom-5 right-5 z-50 inline-flex items-center gap-2.5 rounded-full bg-[#25D366] py-3 pl-3 pr-3 font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] sm:pr-5"
    >
      <svg aria-hidden="true" viewBox="0 0 32 32" width="28" height="28" fill="currentColor">
        <path d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.9-1.6l-.4-.3-3.8 1.2 1.2-3.7-.3-.4c-1.1-1.8-1.7-3.8-1.7-5.8C5.1 9.9 10 5.2 16 5.2s10.9 4.7 10.9 10.6S22 26.4 16 26.4zm6-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1c-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.2 1.1-1.2 2.7 1.2 3.2 1.4 3.4c.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z" />
      </svg>
      <span className="hidden sm:inline">{t.text}</span>
    </a>
  );
}
