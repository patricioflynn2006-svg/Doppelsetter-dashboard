const FALLBACK_CLERK_PUBLISHABLE_KEY = "pk_test_doppelsetter_placeholder";
const FALLBACK_CLERK_SECRET_KEY = "sk_test_doppelsetter_placeholder";

if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = FALLBACK_CLERK_PUBLISHABLE_KEY;
}

if (!process.env.CLERK_SECRET_KEY) {
  process.env.CLERK_SECRET_KEY = FALLBACK_CLERK_SECRET_KEY;
}
