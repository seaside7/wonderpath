// Sign-up and sign-in copy in the language the visitor chose on the
// marketing site (Indonesian by default, English via ?lang=en).
export type AuthLocale = "id" | "en";

export function authLocale(lang: string | string[] | undefined): AuthLocale {
  return lang === "en" ? "en" : "id";
}

/** Link to an auth page that keeps the current language. */
export function authHref(path: "/login" | "/register", locale: AuthLocale): string {
  return locale === "en" ? `${path}?lang=en` : path;
}

export const AUTH_COPY = {
  id: {
    registerTitle: "Buat akun",
    registerSub: "Buat akun untuk mulai latihan bersama anakmu.",
    loginTitle: "Selamat datang kembali",
    loginSub: "Masuk untuk melanjutkan.",
    email: "Email",
    password: "Kata sandi",
    emailInvalid: "Masukkan alamat email yang valid.",
    passwordShort: "Kata sandi minimal 8 karakter.",
    createAccount: "Buat akun",
    creating: "Membuat akun…",
    opening: "Menyiapkan dasbor…",
    signIn: "Masuk",
    signingIn: "Sedang masuk…",
    haveAccount: "Sudah punya akun?",
    noAccount: "Belum punya akun?",
    emailTaken: "Email ini sudah terdaftar. Coba masuk.",
    badLogin: "Email atau kata sandi salah.",
    genericError: "Terjadi kesalahan. Coba lagi.",
    celebrateTitle: "Akunmu sudah siap",
    celebrateSub: "Menyiapkan dasbor…",
    celebrateLabel: "Akun berhasil dibuat. Membuka dasbor.",
  },
  en: {
    registerTitle: "Create an account",
    registerSub: "Create an account to start practicing with your child.",
    loginTitle: "Welcome back",
    loginSub: "Sign in to continue.",
    email: "Email",
    password: "Password",
    emailInvalid: "Enter a valid email address.",
    passwordShort: "Password needs at least 8 characters.",
    createAccount: "Create account",
    creating: "Creating account…",
    opening: "Opening your dashboard…",
    signIn: "Sign in",
    signingIn: "Signing in…",
    haveAccount: "Already have an account?",
    noAccount: "New to WonderPath?",
    emailTaken: "This email is already registered. Try signing in instead.",
    badLogin: "Invalid email or password.",
    genericError: "Something went wrong. Please try again.",
    celebrateTitle: "Your account is ready",
    celebrateSub: "Setting up your dashboard…",
    celebrateLabel: "Account created. Taking you to your dashboard.",
  },
} as const;
