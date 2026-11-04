"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { getCurrentUser } from "../../../lib/current-user";
import { queryAsUser } from "../../../lib/db";
import { headers } from "next/headers";
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

  if (process.env.DATABASE_URL) {
    try {
      const { auth } = await import("../../../lib/auth");
      await auth.api.signUpEmail({
        body: {
          email: parsed.data.email,
          password: parsed.data.password,
          name: parsed.data.nickname,
        },
        headers: await headers(),
      });
    } catch (error) {
      return { error: toKoreanError(error instanceof Error ? error.message : "") };
    }
    await safeRevalidatePath("/", "layout");
    redirect("/");
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

  if (process.env.DATABASE_URL) {
    try {
      const { auth } = await import("../../../lib/auth");
      await auth.api.signInEmail({
        body: { email: parsed.data.email, password: parsed.data.password },
        headers: await headers(),
      });
    } catch {
      return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
    }
    await safeRevalidatePath("/", "layout");
    redirect("/");
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
  if (process.env.DATABASE_URL) {
    const { auth } = await import("../../../lib/auth");
    await auth.api.signOut({ headers: await headers() });
    await safeRevalidatePath("/", "layout");
    return;
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  await safeRevalidatePath("/", "layout");
}

export async function toggleBookmark(contentId: number): Promise<{ bookmarked: boolean } | { error: string }> {
  if (process.env.DATABASE_URL) {
    const user = await getCurrentUser();
    if (!user) return { error: "로그인이 필요합니다" };
    if (!Number.isSafeInteger(contentId) || contentId <= 0) return { error: "잘못된 콘텐츠입니다" };
    try {
      const inserted = await queryAsUser(user.id, `insert into bookmarks (user_id, content_id)
        values ($1::uuid, $2) on conflict do nothing returning content_id`, [user.id, contentId]);
      if (inserted.length) return { bookmarked: true };
      await queryAsUser(user.id, "delete from bookmarks where user_id = $1::uuid and content_id = $2", [user.id, contentId]);
      return { bookmarked: false };
    } catch { return { error: "북마크 변경에 실패했습니다." }; }
  }
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
  if (process.env.DATABASE_URL) {
    const user = await getCurrentUser();
    if (!user) return { error: "로그인이 필요합니다" };
    if (!Number.isSafeInteger(contentId) || contentId <= 0) return { error: "잘못된 콘텐츠입니다" };
    try {
      const inserted = await queryAsUser(user.id, `insert into likes (user_id, content_id)
        values ($1::uuid, $2) on conflict do nothing returning content_id`, [user.id, contentId]);
      if (inserted.length) return { liked: true };
      await queryAsUser(user.id, "delete from likes where user_id = $1::uuid and content_id = $2", [user.id, contentId]);
      return { liked: false };
    } catch { return { error: "좋아요 변경에 실패했습니다." }; }
  }
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
