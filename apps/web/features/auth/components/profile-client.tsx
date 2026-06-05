"use client";

import { useState, useTransition } from "react";
import { Check, Eye, EyeOff, Loader2, Lock, Pencil, Trash2, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateNickname, updatePassword, deleteAccount } from "../server/profile-actions";

// ─── Nickname Form ─────────────────────────────────────────────────────────

export function NicknameForm({ currentNickname }: { currentNickname: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentNickname);
  const [saved, setSaved] = useState(currentNickname);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateNickname(fd);
      if (result?.error) { setError(result.error); return; }
      setSaved(value);
      setEditing(false);
    });
  }

  function handleCancel() {
    setValue(saved);
    setError(null);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{saved}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex size-6 items-center justify-center rounded text-neutral-400 transition hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
          aria-label="닉네임 수정"
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className="relative flex items-center rounded-md border border-neutral-200 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/10 dark:border-neutral-700">
          <span className="pointer-events-none absolute left-2.5 text-neutral-400">
            <User className="size-4" />
          </span>
          <input
            name="nickname"
            type="text"
            maxLength={20}
            autoFocus
            disabled={isPending}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 w-48 bg-transparent pl-8 pr-3 text-sm outline-none placeholder:text-neutral-400 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex size-8 items-center justify-center rounded-md bg-teal-600 text-white transition hover:bg-teal-700 disabled:opacity-50 dark:bg-teal-500 dark:text-neutral-950"
          aria-label="저장"
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex size-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          aria-label="취소"
        >
          <X className="size-3.5" />
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  );
}

// ─── Password Form ─────────────────────────────────────────────────────────

export function PasswordForm() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const rules = [
    { label: "8자 이상", met: newPassword.length >= 8 },
    { label: "영문 포함", met: /[a-zA-Z]/.test(newPassword) },
    { label: "숫자 포함", met: /[0-9]/.test(newPassword) },
    { label: "특수기호 포함", met: /[^a-zA-Z0-9]/.test(newPassword) },
  ];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updatePassword(fd);
      if (result?.error) { setError(result.error); return; }
      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      (event.target as HTMLFormElement).reset();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <PasswordField
        id="currentPassword"
        label="현재 비밀번호"
        name="currentPassword"
        show={showCurrent}
        onToggle={() => setShowCurrent((v) => !v)}
        disabled={isPending}
      />
      <PasswordField
        id="newPassword"
        label="새 비밀번호"
        name="newPassword"
        show={showNew}
        onToggle={() => setShowNew((v) => !v)}
        disabled={isPending}
        value={newPassword}
        onChange={setNewPassword}
      />
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {rules.map(({ label, met }) => (
          <span key={label} className={`text-xs transition-colors ${met ? "text-teal-600 dark:text-teal-400" : "text-neutral-400 dark:text-neutral-500"}`}>
            {met ? "✓" : "○"} {label}
          </span>
        ))}
      </div>
      <PasswordField
        id="confirmPassword"
        label="새 비밀번호 확인"
        name="confirmPassword"
        show={showConfirm}
        onToggle={() => setShowConfirm((v) => !v)}
        disabled={isPending}
        value={confirmPassword}
        onChange={setConfirmPassword}
      />
      {confirmPassword.length > 0 && (
        <p className={`text-xs ${newPassword === confirmPassword ? "text-teal-600 dark:text-teal-400" : "text-red-500 dark:text-red-400"}`}>
          {newPassword === confirmPassword ? "✓ 비밀번호가 일치합니다" : "✗ 비밀번호가 일치하지 않습니다"}
        </p>
      )}
      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
      {success && <p className="text-xs text-teal-600 dark:text-teal-400">✓ 비밀번호가 변경되었습니다.</p>}
      <button
        type="submit"
        disabled={isPending}
        className="mt-1 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-teal-600 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-60 dark:bg-teal-500 dark:text-neutral-950"
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Lock className="size-3.5" />}
        {isPending ? "변경 중…" : "비밀번호 변경"}
      </button>
    </form>
  );
}

function PasswordField({
  id, label, name, show, onToggle, disabled, value, onChange,
}: {
  id: string; label: string; name: string;
  show: boolean; onToggle: () => void; disabled: boolean;
  value?: string; onChange?: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{label}</label>
      <div className="relative flex items-center rounded-md border border-neutral-200 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/10 dark:border-neutral-700 dark:focus-within:border-teal-500/60">
        <span className="pointer-events-none absolute left-2.5 text-neutral-400 dark:text-neutral-500">
          <Lock className="size-4" />
        </span>
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          required
          disabled={disabled}
          autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
          placeholder="••••••••"
          className="h-9 w-full bg-transparent pl-9 pr-10 text-sm outline-none placeholder:text-neutral-400 disabled:opacity-50"
          {...(value !== undefined ? { value, onChange: (e) => onChange?.(e.target.value) } : {})}
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          className="absolute right-1 flex size-7 items-center justify-center rounded text-neutral-400 transition hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
        >
          {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Delete Account Section ────────────────────────────────────────────────

export function DeleteAccountSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccount();
      if (result?.error) { setError(result.error); }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/20"
      >
        <Trash2 className="size-4" />
        탈퇴하기
      </button>

      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 p-4"
          onClick={() => setDialogOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
              <Trash2 className="size-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="mt-3 text-base font-semibold text-neutral-900 dark:text-neutral-50">정말 탈퇴하시겠어요?</h2>
            <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              계정과 저장된 모든 데이터가 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="flex-1 h-9 rounded-md border border-neutral-200 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className={cn(
                  "flex-1 h-9 rounded-md text-sm font-medium text-white transition",
                  "bg-red-600 hover:bg-red-700 disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-700",
                )}
              >
                {isPending ? "탈퇴 중…" : "탈퇴 확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
