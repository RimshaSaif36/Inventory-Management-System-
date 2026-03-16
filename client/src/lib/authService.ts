"use client";

import { supabase } from "./supabase";

export async function login(email: string, password: string) {
  const resp = await supabase.auth.signInWithPassword({ email, password });
  return resp;
}

export async function signUpAccountant(email: string, password: string, name?: string, storeId?: string) {
  const resp = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role: "accountant", name, storeId },
    },
  });
  return resp;
}

export async function logout() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (_) {
    // ignore sign-out network errors
  }
  return null;
}

export async function resetPassword(email: string) {
  // Sends reset password email
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/auth/login",
  });
}

const readSessionFromStorage = () => {
  if (typeof window === "undefined") return null;

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const session = parsed?.currentSession || parsed?.session || parsed;

      if (session?.access_token) return session;
    }
  } catch (_) {
    return null;
  }

  return null;
};

export async function getSession() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session || readSessionFromStorage();
  } catch (err) {
    // If the refresh token is missing/invalid, supabase throws an AuthApiError
    // with code 'refresh_token_not_found'. In that case, clear any stored
    // session data and return null so the app can redirect to login.
    const e: any = err;
    if (e?.name === "AuthApiError" && e?.code === "refresh_token_not_found") {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (_) {
        // ignore signOut errors
      }
      return null;
    }
    return readSessionFromStorage();
  }
}

export async function getUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
