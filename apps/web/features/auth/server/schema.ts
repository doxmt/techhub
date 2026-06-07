import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  nickname: z.string().min(1, "닉네임을 입력해주세요.").max(20, "닉네임은 20자 이하여야 합니다."),
  password: z
    .string()
    .min(8, "8자 이상이어야 합니다.")
    .regex(/[a-zA-Z]/, "영문을 포함해야 합니다.")
    .regex(/[0-9]/, "숫자를 포함해야 합니다.")
    .regex(/[^a-zA-Z0-9]/, "특수기호를 포함해야 합니다."),
});

export const signInSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});
