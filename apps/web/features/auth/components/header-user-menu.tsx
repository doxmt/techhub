"use client";

import { useState } from "react";
import { LogIn, LogOut, UserRound } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthDialog } from "./auth-dialog";
import { signOut } from "../server/actions";

type Props = {
  user: { nickname: string; email: string } | null;
};

export function HeaderUserMenu({ user }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          aria-label="로그인"
          className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-700/70 dark:text-neutral-100 dark:hover:bg-neutral-700"
        >
          <LogIn className="size-4" aria-hidden="true" />
          로그인
        </button>
        <AuthDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </>
    );
  }

  const fallback = user.nickname.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${user.nickname} 메뉴`}
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30"
        >
          <Avatar className="size-8">
            <AvatarFallback className="text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
              {fallback}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{user.nickname}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/profile" className="cursor-pointer">
            <UserRound className="mr-2 size-4" aria-hidden="true" />
            마이페이지
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
          }}
          className="text-red-600 dark:text-red-400 cursor-pointer"
        >
          <LogOut className="mr-2 size-4" aria-hidden="true" />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
