import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { Card, TapuyMark } from "@interviews-tool/web-ui";
import { useTranslations } from "@interviews-tool/i18n";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/auth/signup")({
  component: SignUpPage,
  beforeLoad: async (ctx) => {
    const { isAuthenticated } = ctx.context;
    if (isAuthenticated) {
      throw redirect({ to: "/hiring-processes" });
    }
  },
});

function SignUpPage() {
  const t = useTranslations("auth");

  return (
    <div className="flex flex-col items-center px-4 pt-16 pb-24 md:pt-24">
      <Link to="/" aria-label="tapuy" className="inline-flex items-center gap-2.5">
        <TapuyMark className="size-6" />
        <span className="text-2xl font-medium tracking-[-0.01em] text-text">tapuy</span>
      </Link>
      <p className="mt-3 text-base text-text-secondary">{t("tagline")}</p>

      <Card className="mt-10 w-full max-w-md px-8 py-8">
        <SignUpForm />
      </Card>

      <p className="mt-6 text-sm text-text-secondary">
        {t("alreadyHaveAccount")}{" "}
        <Link to="/auth/login" className="text-mint hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
