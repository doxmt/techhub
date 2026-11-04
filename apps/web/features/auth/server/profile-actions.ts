"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { createAdminClient } from "../../../lib/supabase/admin";
import { signUpSchema } from "./schema";
import { getCurrentUser } from "../../../lib/current-user";
import { queryAsUser, deleteAuthenticatedUser } from "../../../lib/db";
import { headers } from "next/headers";

async function safeRevalidatePath(path: string) {
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath(path);
  } catch {
    // 테스트 환경에서는 무시
  }
}

export async function updateNickname(
  formData: FormData,
): Promise<{ error?: string }> {
  const nickname = (formData.get("nickname") as string | null)?.trim() ?? "";

  if (!nickname) return { error: "닉네임을 입력해주세요." };
  if (nickname.length > 20) return { error: "닉네임은 20자 이하여야 합니다." };

  if (process.env.DATABASE_URL) {
    const user = await getCurrentUser();
    if (!user) return { error: "로그인이 필요합니다." };
    try {
      await queryAsUser(user.id, "update profiles set nickname = $1 where user_id = $2::uuid", [nickname, user.id]);
      await safeRevalidatePath("/profile");
      return {};
    } catch { return { error: "닉네임 변경에 실패했습니다." }; }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("profiles")
    .update({ nickname })
    .eq("user_id", user.id);

  if (error) return { error: "닉네임 변경에 실패했습니다." };

  await safeRevalidatePath("/profile");
  return {};
}

export async function updatePassword(
  formData: FormData,
): Promise<{ error?: string }> {
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (newPassword !== confirmPassword)
    return { error: "새 비밀번호가 일치하지 않습니다." };

  const parsed = signUpSchema.shape.password.safeParse(newPassword);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "비밀번호가 올바르지 않습니다." };

  if (process.env.DATABASE_URL) {
    if (!await getCurrentUser()) return { error: "로그인이 필요합니다." };
    try {
      const { auth } = await import("../../../lib/auth");
      await auth.api.changePassword({
        body: { currentPassword, newPassword },
        headers: await headers(),
      });
      return {};
    } catch { return { error: "현재 비밀번호가 올바르지 않거나 변경에 실패했습니다." }; }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: "로그인이 필요합니다." };

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) return { error: "현재 비밀번호가 올바르지 않습니다." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: "비밀번호 변경에 실패했습니다." };

  return {};
}

export async function deleteAccount(): Promise<{ error?: string } | undefined> {
  if (process.env.DATABASE_URL) {
    const user = await getCurrentUser();
    if (!user) return { error: "로그인이 필요합니다." };
    try {
      await deleteAuthenticatedUser(user.id);
      const { auth } = await import("../../../lib/auth");
      await auth.api.signOut({ headers: await headers() }).catch(() => {});
    } catch { return { error: "계정 탈퇴에 실패했습니다." }; }
    redirect("/");
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(user.id);
  if (error) return { error: "계정 탈퇴에 실패했습니다." };

  await supabase.auth.signOut();
  redirect("/");
}
