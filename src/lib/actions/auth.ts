"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ActionError, actionFailure } from "@/src/lib/actions/errors";
import {
  bootstrapUserProfile,
  getSessionUser,
} from "@/src/lib/rbac";
import { createClient } from "@/src/lib/supabase/server";

export type AuthActionState = {
  error?: string;
};

function sanitiseRedirectPath(path: string | null | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/";
  }
  return path;
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = sanitiseRedirectPath(
    String(formData.get("redirectTo") ?? "/"),
  );

  if (!email) {
    return { error: "Please enter your email address." };
  }
  if (!password) {
    return { error: "Please enter your password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.toLowerCase().includes("invalid login credentials")) {
      return { error: "Incorrect email or password. Please try again." };
    }
    return { error: "Unable to sign in. Please try again." };
  }

  if (!data.user?.email) {
    return { error: "Unable to sign in. Please try again." };
  }

  const metadataName =
    typeof data.user.user_metadata?.name === "string"
      ? data.user.user_metadata.name.trim()
      : "";
  const fallbackName = metadataName || data.user.email.split("@")[0] || "User";

  await bootstrapUserProfile({
    id: data.user.id,
    email: data.user.email,
    name: fallbackName,
  });

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!name) {
    return { error: "Please enter your name." };
  }
  if (!email) {
    return { error: "Please enter your email address." };
  }
  if (!password) {
    return { error: "Please enter your password." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("user already registered")) {
      return {
        error: "An account with this email already exists. Try signing in instead.",
      };
    }
    return { error: "Unable to create your account. Please try again." };
  }

  if (!data.user?.email) {
    return {
      error:
        "Account created. Please check your email to confirm your address, then sign in.",
    };
  }

  await bootstrapUserProfile({
    id: data.user.id,
    email: data.user.email,
    name,
  });

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  return {
    error:
      "Account created. Please check your email to confirm your address, then sign in.",
  };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function getCurrentSessionUser() {
  try {
    return await getSessionUser();
  } catch {
    return null;
  }
}

export async function ensureAuthenticatedProfile(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    throw new ActionError("Please sign in to continue.", "UNAUTHORISED");
  }

  const metadataName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name.trim()
      : "";
  const fallbackName = metadataName || user.email.split("@")[0] || "User";

  await bootstrapUserProfile({
    id: user.id,
    email: user.email,
    name: fallbackName,
  });
}
