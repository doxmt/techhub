"use client";

import { useState, useTransition } from "react";
import { Code2, ArrowRight, Loader2, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { signInWithPassword, signUp, toggleBookmark } from "../server/actions";

type Tab = "login" | "signup";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingBookmarkId?: number | null;
  defaultTab?: Tab;
};

export function AuthDialog({
  open,
  onOpenChange,
  pendingBookmarkId,
  defaultTab = "login",
}: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [showSignupConfirmPw, setShowSignupConfirmPw] = useState(false);
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupNickname, setSignupNickname] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function touch(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function handleTabChange(next: Tab) {
    setTab(next);
    setError(null);
    setSignupPassword("");
    setSignupConfirmPassword("");
    setSignupEmail("");
    setSignupNickname("");
    setTouched({});
  }

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await signInWithPassword(formData);
      if (result?.error) { setError(result.error); return; }
      onOpenChange(false);
      if (pendingBookmarkId != null) await toggleBookmark(pendingBookmarkId);
    });
  }

  async function handleSignupSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setTouched({ email: true, nickname: true, password: true, confirmPassword: true });
    const formData = new FormData(event.currentTarget);
    if (formData.get("password") !== formData.get("confirmPassword")) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    startTransition(async () => {
      const result = await signUp(formData);
      if (result?.error) { setError(result.error); return; }
      onOpenChange(false);
      if (pendingBookmarkId != null) await toggleBookmark(pendingBookmarkId);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[420px]">

        {/* 브랜딩 */}
        <div className="flex items-center gap-2.5 px-7 pb-4 pt-6">
          <div className="flex size-7 shrink-0 items-center justify-center rounded bg-teal-600 text-white dark:bg-teal-500 dark:text-neutral-950">
            <Code2 className="size-3.5" />
          </div>
          <DialogTitle className="text-sm font-semibold tracking-tight">
            TechHub
          </DialogTitle>
        </div>

        {/* 탭 */}
        <div className="px-7 pb-4">
          <div className="flex rounded-lg bg-neutral-100 p-0.5 dark:bg-neutral-950/80">
            {(["login", "signup"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTabChange(t)}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${
                  tab === t
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-50"
                    : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300"
                }`}
              >
                {t === "login" ? "로그인" : "회원가입"}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-neutral-100 dark:bg-white/[0.06]" />

        {/* 폼 */}
        <div className="px-7 py-6">
          {tab === "login" ? (
            <form key="login" onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <IconField id="login-email" label="이메일" icon={<Mail className="size-4" />}>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  disabled={isPending}
                  className={inputClass}
                />
              </IconField>

              <IconField
                id="login-password"
                label="비밀번호"
                icon={<Lock className="size-4" />}
                suffix={
                  <TogglePasswordButton
                    show={showLoginPw}
                    onToggle={() => setShowLoginPw((v) => !v)}
                  />
                }
              >
                <input
                  id="login-password"
                  name="password"
                  type={showLoginPw ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={isPending}
                  className={inputClass}
                />
              </IconField>

              {error && <ErrorBox>{error}</ErrorBox>}

              <SubmitButton isPending={isPending} label="로그인" pendingLabel="로그인 중" />

              <p className="text-center text-xs text-neutral-400 dark:text-neutral-500">
                계정이 없으신가요?{" "}
                <button type="button" onClick={() => handleTabChange("signup")}
                  className="font-medium text-teal-600 hover:underline dark:text-teal-400">
                  가입하기
                </button>
              </p>
            </form>
          ) : (
            <form key="signup" onSubmit={handleSignupSubmit} className="flex flex-col gap-4">
              <IconField
                id="signup-email"
                label="이메일"
                icon={<Mail className="size-4" />}
                description="로그인 및 계정 관리에 사용됩니다."
                errorMessage={
                  touched.email && !signupEmail ? "이메일을 입력해주세요." :
                  touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail) ? "올바른 이메일 형식이 아닙니다." :
                  undefined
                }
              >
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  disabled={isPending}
                  className={inputClass}
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  onBlur={() => touch("email")}
                />
              </IconField>

              <IconField
                id="signup-nickname"
                label="닉네임"
                hint="최대 20자"
                icon={<User className="size-4" />}
                description="커뮤니티에서 표시될 이름입니다."
                errorMessage={touched.nickname && !signupNickname ? "닉네임을 입력해주세요." : undefined}
              >
                <input
                  id="signup-nickname"
                  name="nickname"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="devuser"
                  maxLength={20}
                  disabled={isPending}
                  className={inputClass}
                  value={signupNickname}
                  onChange={(e) => setSignupNickname(e.target.value)}
                  onBlur={() => touch("nickname")}
                />
              </IconField>

              <IconField
                id="signup-password"
                label="비밀번호"
                icon={<Lock className="size-4" />}
                suffix={
                  <TogglePasswordButton
                    show={showSignupPw}
                    onToggle={() => setShowSignupPw((v) => !v)}
                  />
                }
              >
                <input
                  id="signup-password"
                  name="password"
                  type={showSignupPw ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  disabled={isPending}
                  className={inputClass}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                />
              </IconField>
              <PasswordRequirements password={signupPassword} />

              <IconField
                id="signup-confirm-password"
                label="비밀번호 확인"
                icon={<Lock className="size-4" />}
                suffix={
                  <TogglePasswordButton
                    show={showSignupConfirmPw}
                    onToggle={() => setShowSignupConfirmPw((v) => !v)}
                  />
                }
              >
                <input
                  id="signup-confirm-password"
                  name="confirmPassword"
                  type={showSignupConfirmPw ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  disabled={isPending}
                  className={inputClass}
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                />
              </IconField>
              {signupConfirmPassword.length > 0 && (
                <p className={`text-xs transition-colors ${
                  signupPassword === signupConfirmPassword
                    ? "text-teal-600 dark:text-teal-400"
                    : "text-red-500 dark:text-red-400"
                }`}>
                  {signupPassword === signupConfirmPassword ? "✓ 비밀번호가 일치합니다" : "✗ 비밀번호가 일치하지 않습니다"}
                </p>
              )}

              {error && <ErrorBox>{error}</ErrorBox>}

              <SubmitButton isPending={isPending} label="회원가입" pendingLabel="가입 중" />

              <p className="text-center text-xs text-neutral-400 dark:text-neutral-500">
                이미 계정이 있으신가요?{" "}
                <button type="button" onClick={() => handleTabChange("login")}
                  className="font-medium text-teal-600 hover:underline dark:text-teal-400">
                  로그인
                </button>
              </p>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 아이콘 + suffix(비밀번호 토글)를 감싸는 input 래퍼
const inputClass =
  "h-9 w-full bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-600 disabled:opacity-50 [&:-webkit-autofill]:![transition:background-color_9999s] [&:-webkit-autofill]:![-webkit-text-fill-color:inherit]";

function IconField({
  id,
  label,
  hint,
  description,
  errorMessage,
  icon,
  suffix,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  description?: string;
  errorMessage?: string;
  icon: React.ReactNode;
  suffix?: React.ReactNode;
  children: React.ReactNode;
}) {
  const descText = errorMessage ?? description;
  const isError = !!errorMessage;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
        {hint && (
          <span className="text-xs text-neutral-400 dark:text-neutral-500">{hint}</span>
        )}
      </div>
      <div className={`relative flex items-center rounded-md border transition-colors focus-within:ring-2 ${
        isError
          ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/10 dark:border-red-500/60"
          : "border-neutral-200 focus-within:border-teal-500 focus-within:ring-teal-500/10 dark:border-neutral-700 dark:focus-within:border-teal-500/60"
      }`}>
        <span className={`pointer-events-none absolute left-2.5 ${isError ? "text-red-400 dark:text-red-500" : "text-neutral-400 dark:text-neutral-500"}`}>
          {icon}
        </span>
        {children}
        {suffix && (
          <span className="absolute right-1">
            {suffix}
          </span>
        )}
      </div>
      {descText && (
        <p className={`text-xs transition-colors ${isError ? "text-red-500 dark:text-red-400" : "text-neutral-400 dark:text-neutral-500"}`}>
          {descText}
        </p>
      )}
    </div>
  );
}

function TogglePasswordButton({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      className="flex size-7 items-center justify-center rounded text-neutral-400 transition hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
      aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"}
    >
      {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
    </button>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/40 dark:bg-red-950/20">
      <p className="text-xs text-red-600 dark:text-red-400">{children}</p>
    </div>
  );
}

function PasswordRequirements({ password }: { password: string }) {
  const rules = [
    { label: "8자 이상", met: password.length >= 8 },
    { label: "영문 포함", met: /[a-zA-Z]/.test(password) },
    { label: "숫자 포함", met: /[0-9]/.test(password) },
    { label: "특수기호 포함", met: /[^a-zA-Z0-9]/.test(password) },
  ];
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {rules.map(({ label, met }) => (
        <span
          key={label}
          className={`text-xs transition-colors ${
            met
              ? "text-teal-600 dark:text-teal-400"
              : "text-neutral-400 dark:text-neutral-500"
          }`}
        >
          {met ? "✓" : "○"} {label}
        </span>
      ))}
    </div>
  );
}

function SubmitButton({
  isPending,
  label,
  pendingLabel,
}: {
  isPending: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="mt-1 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-teal-600 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-60 dark:bg-teal-500 dark:text-neutral-950 dark:hover:bg-teal-400"
    >
      {isPending ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          {pendingLabel}…
        </>
      ) : (
        <>
          {label}
          <ArrowRight className="size-3.5" />
        </>
      )}
    </button>
  );
}
