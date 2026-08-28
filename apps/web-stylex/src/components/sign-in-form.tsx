import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";
import { Button, Input, Label } from "@interviews-tool/web-ui";
import { useTranslations } from "@interviews-tool/i18n";
import { authClient } from "@/lib/auth/auth-client";

export default function SignInForm() {
  const navigate = useNavigate();
  const t = useTranslations("auth");
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            navigate({
              to: "/hiring-processes",
            });
            toast.success(t("signedIn"));
          },
          onError: (error) => {
            setFormError(error.error.message || t("errors.signInFailed"));
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email(t("validation.invalidEmail")),
        password: z.string().min(8, t("validation.passwordMin")),
      }),
    },
  });

  return (
    <>
      <h1 className="mb-6 text-2xl font-medium text-text">{t("signInTitle")}</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-5"
      >
        <form.Field name="email">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>{t("email")}</Label>
              <Input
                id={field.name}
                name={field.name}
                type="email"
                placeholder={t("emailPlaceholder")}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={field.state.meta.errors.length > 0 || undefined}
              />
              {field.state.meta.errors.map((error) => (
                <p key={error?.message} className="text-[13px] text-danger">
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>{t("password")}</Label>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={field.state.meta.errors.length > 0 || undefined}
              />
              {field.state.meta.errors.map((error) => (
                <p key={error?.message} className="text-[13px] text-danger">
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        {formError && <p className="text-sm leading-relaxed text-danger">{formError}</p>}

        <form.Subscribe>
          {(state) => (
            <Button
              type="submit"
              className="w-full"
              disabled={!state.canSubmit || state.isSubmitting}
            >
              {state.isSubmitting ? t("signingIn") : t("signIn")}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </>
  );
}
