"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { signUpSchema, signInSchema } from "./schema";

function toKoreanError(message: string): string {
  if (/already registered|already exists|User already/i.test(message))
    return "이미 사용 중인 이메일입니다.";
  if (/invalid.*(login|credentials)|credentials.*invalid/i.test(message))
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (/email not confirmed/i.test(message))
    return "이메일 인증이 필요합니다.";
  if (/too many requests|rate.?limit/i.test(message))
    return "잠시 후 다시 시도해주세요.";
  if (/password/i.test(message))
    return "비밀번호가 올바르지 않습니다.";
  if (/email/i.test(message))
    return "이메일이 올바르지 않습니다.";
  return "오류가 발생했습니다. 다시 시도해주세요.";
}

async function safeRevalidatePath(path: string, type?: "layout" | "page") {
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath(path, type);
  } catch {
    // 테스트 환경에서는 무시
  }
}

export async function signUp(formData: FormData): Promise<{ error: string } | undefined> {
  const raw = {
    email: formData.get("email") as string,
    nickname: formData.get("nickname") as string,
    password: formData.get("password") as string,
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error?.issues?.[0]?.message ?? "입력값이 올바르지 않습니다";
    return { error: firstError };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { nickname: parsed.data.nickname } },
  });

  if (error) {
    return { error: toKoreanError(error.message) };
  }

  await safeRevalidatePath("/", "layout");
  redirect("/");
}

export async function signInWithPassword(formData: FormData): Promise<{ error: string } | undefined> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error?.issues?.[0]?.message ?? "입력값이 올바르지 않습니다";
    return { error: firstError };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: toKoreanError(error.message) };
  }

  await safeRevalidatePath("/", "layout");
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await safeRevalidatePath("/", "layout");
}

export async function toggleBookmark(contentId: number): Promise<{ bookmarked: boolean } | { error: string }> {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    return { error: "로그인이 필요합니다" };
  }

  const { data: existing, error: selectError } = await supabase
    .from("bookmarks")
    .select("user_id, content_id")
    .eq("user_id", user.id)
    .eq("content_id", contentId);

  if (selectError) {
    return { error: selectError.message };
  }

  if (existing && existing.length > 0) {
    const { error: deleteError } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("content_id", contentId);

    if (deleteError) {
      return { error: deleteError.message };
    }
    return { bookmarked: false };
  }

  const { error: insertError } = await supabase
    .from("bookmarks")
    .insert({ user_id: user.id, content_id: contentId });

  if (insertError) {
    return { error: insertError.message };
  }
  return { bookmarked: true };
}

export async function toggleLike(contentId: number): Promise<{ liked: boolean } | { error: string }> {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    return { error: "로그인이 필요합니다" };
  }

  const { data: existing, error: selectError } = await supabase
    .from("likes")
    .select("user_id, content_id")
    .eq("user_id", user.id)
    .eq("content_id", contentId);

  if (selectError) {
    return { error: selectError.message };
  }

  if (existing && existing.length > 0) {
    const { error: deleteError } = await supabase
      .from("likes")
      .delete()
      .eq("user_id", user.id)
      .eq("content_id", contentId);

    if (deleteError) {
      return { error: deleteError.message };
    }
    return { liked: false };
  }

  const { error: insertError } = await supabase
    .from("likes")
    .insert({ user_id: user.id, content_id: contentId });

  if (insertError) {
    return { error: insertError.message };
  }
  return { liked: true };
}
