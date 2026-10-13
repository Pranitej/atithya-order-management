"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { DEMO_ACCOUNTS } from "@/shared/demo-accounts";
import {
  type RegisterInput,
  loginSchema,
  registerSchema,
} from "@/shared/schemas";
import { useRegister, useSignIn } from "./use-auth";

type AuthFormProps = {
  mode: "login" | "register";
  /** Called once the person is signed in; the page decides where to go next. */
  onSuccess: () => void;
  /** The kitchen demo account is only useful where staff tools are reachable. */
  showStaffDemo?: boolean;
};

export function AuthForm({
  mode,
  onSuccess,
  showStaffDemo = true,
}: AuthFormProps) {
  const isRegister = mode === "register";
  const signIn = useSignIn();
  const registerAccount = useRegister();
  const pending = signIn.isPending || registerAccount.isPending;
  const failure = isRegister ? registerAccount.error : signIn.error;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    // Signing in has no name field, so only its own schema is applied.
    resolver: zodResolver(isRegister ? registerSchema : loginSchema) as never,
    defaultValues: { name: "", email: "", password: "" },
  });

  const submit = handleSubmit((values) => {
    if (isRegister) registerAccount.mutate(values, { onSuccess });
    else signIn.mutate(values, { onSuccess });
  });

  const signInAs = (account: { email: string; password: string }) =>
    signIn.mutate(
      { email: account.email, password: account.password },
      { onSuccess },
    );

  return (
    <div className="flex flex-col gap-6">
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        {isRegister && (
          <TextField
            id="auth-name"
            label="Your name"
            autoComplete="name"
            error={errors.name?.message}
            {...register("name")}
          />
        )}
        <TextField
          id="auth-email"
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          id="auth-password"
          label="Password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          hint={isRegister ? "At least 8 characters." : undefined}
          error={errors.password?.message}
          {...register("password")}
        />

        {failure && (
          <p role="alert" className="text-chili-700">
            {failure.message}
          </p>
        )}

        <Button type="submit" size="lg" block loading={pending}>
          {isRegister ? "Create account" : "Sign in"}
        </Button>
      </form>

      {!isRegister && (
        <div className="flex flex-col gap-3 rounded-2xl bg-mist p-5">
          <p className="text-sm text-muted">
            Just looking around? Use a ready-made account.
          </p>
          <Button
            variant="secondary"
            block
            disabled={pending}
            onClick={() => signInAs(DEMO_ACCOUNTS.customer)}
          >
            Continue as demo customer
          </Button>
          {showStaffDemo && (
            <Button
              variant="secondary"
              block
              disabled={pending}
              onClick={() => signInAs(DEMO_ACCOUNTS.admin)}
            >
              Continue as kitchen staff
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
