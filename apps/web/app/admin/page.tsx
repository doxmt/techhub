import { LockKeyhole } from "lucide-react";

export const metadata = {
  title: "Admin"
};

export default function AdminPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-5 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <section className="w-full max-w-sm rounded-md border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">
            <LockKeyhole className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">TechHub Admin</h1>
            <p className="text-sm text-neutral-500">관리자 전용 콘텐츠 등록 화면</p>
          </div>
        </div>
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
          type="button"
        >
          <LockKeyhole className="size-4" aria-hidden="true" />
          GitHub로 로그인
        </button>
      </section>
    </main>
  );
}
