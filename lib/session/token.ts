import { randomUUID } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "icards_session";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function getOrCreateSessionToken(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;
  if (existing) {
    return existing;
  }

  const token = randomUUID();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });

  return token;
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}
