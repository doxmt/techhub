import { redirect } from "next/navigation";
import { ArrowLeft, Bookmark, Code2, Calendar } from "lucide-react";
import { createClient } from "../../lib/supabase/server";
import { getSavedFeed } from "../../features/auth/server/service";
import { NicknameForm, PasswordForm, DeleteAccountSection } from "../../features/auth/components/profile-client";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, email, created_at")
    .eq("user_id", user.id)
    .single();

  const { items: savedItems } = await getSavedFeed({ userId: user.id });
  const recentSaved = savedItems.slice(0, 4);

  const nickname = profile?.nickname || user.email?.split("@")[0] || "";
  const email = profile?.email || user.email || "";
  const joinedAt = profile?.created_at
    ? new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(profile.created_at))
    : null;
  const fallback = nickname.charAt(0).toUpperCase();

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-900 dark:text-neutral-50">
      {/* 헤더 */}
      <header className="border-b border-neutral-200 bg-white/90 dark:border-neutral-700 dark:bg-neutral-800/90">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-5 py-4">
          <a href="/" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md border border-teal-200 bg-teal-600 text-white dark:border-teal-900/60 dark:bg-teal-500 dark:text-neutral-950">
              <Code2 className="size-5" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold">TechHub</p>
          </a>
          <span className="text-neutral-300 dark:text-neutral-600">/</span>
          <p className="text-sm text-neutral-500">마이페이지</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-8 space-y-6">
        {/* 뒤로가기 */}
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <ArrowLeft className="size-4" />
          피드로 돌아가기
        </a>

        {/* 프로필 카드 */}
        <section className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800/60">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xl font-semibold text-teal-800 dark:bg-teal-900 dark:text-teal-200">
              {fallback}
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">닉네임</p>
              <NicknameForm currentNickname={nickname} />
              <div className="mt-3 space-y-1">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{email}</p>
                {joinedAt && (
                  <p className="inline-flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                    <Calendar className="size-3.5" />
                    {joinedAt} 가입
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 저장됨 미리보기 */}
        <section className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800/60">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="size-4 text-teal-600 dark:text-teal-400" />
              <h2 className="text-sm font-semibold">저장된 콘텐츠</h2>
            </div>
            <a
              href="/?section=saved"
              className="text-xs font-medium text-teal-600 hover:underline dark:text-teal-400"
            >
              전체 보기
            </a>
          </div>
          {recentSaved.length === 0 ? (
            <p className="text-sm text-neutral-400 dark:text-neutral-500">아직 저장된 콘텐츠가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
              {recentSaved.map((item) => (
                <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
                  <a
                    href={`/${item.slug}-${item.id}`}
                    className="group flex items-start gap-3"
                  >
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        className="size-12 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="size-12 shrink-0 rounded bg-neutral-100 dark:bg-neutral-700" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium text-neutral-900 group-hover:text-teal-700 dark:text-neutral-100 dark:group-hover:text-teal-300">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                        {item.source ?? item.categories[0]?.name}
                      </p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 비밀번호 변경 */}
        <section className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800/60">
          <h2 className="mb-4 text-sm font-semibold">비밀번호 변경</h2>
          <PasswordForm />
        </section>

        {/* 계정 탈퇴 */}
        <section className="rounded-xl border border-red-100 bg-white p-6 dark:border-red-900/30 dark:bg-neutral-800/60">
          <h2 className="mb-1 text-sm font-semibold text-red-600 dark:text-red-400">위험 영역</h2>
          <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
            계정을 탈퇴하면 모든 데이터가 영구 삭제되며 복구할 수 없습니다.
          </p>
          <DeleteAccountSection />
        </section>
      </div>
    </main>
  );
}
