import { Link } from "@tanstack/react-router";

import { useTranslations } from "@interviews-tool/i18n";
import { Button, TapuyLockup } from "@interviews-tool/web-ui";
import { Moon, Star, Sun } from "lucide-react";

import { LocaleSwitcher } from "./locale-switcher";
import UserMenu from "./user-menu";
import type { AuthSession } from "@/lib/auth/types";
import type { Theme } from "@/functions/theme";

interface HeaderProps {
  isAuthenticated: boolean;
  userName: AuthSession["user"]["name"];
  userEmail: AuthSession["user"]["email"];
  theme: Theme;
  onToggleTheme: () => void;
}

export default function Header({
  isAuthenticated,
  userName,
  userEmail,
  theme,
  onToggleTheme,
}: HeaderProps) {
  const t = useTranslations("nav");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b">
      <div className="flex flex-row items-center justify-between px-4 py-2">
        <nav className="flex items-center gap-5">
          <Link to="/" aria-label="tapuy">
            <TapuyLockup />
          </Link>
          {isAuthenticated && (
            <Link
              to="/hiring-processes"
              className="text-sm text-text-secondary hover:text-text transition-colors"
            >
              {t("dashboard")}
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            title={t(theme === "dark" ? "switchToLight" : "switchToDark")}
            aria-label={t(theme === "dark" ? "switchToLight" : "switchToDark")}
            className="flex size-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </button>
          <LocaleSwitcher />
          <UserMenu userName={userName} userEmail={userEmail} isAuthenticated={isAuthenticated} />
          {!isAuthenticated && (
            <a
              href="https://github.com/tapuy/tapuy"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:block"
            >
              <Button variant="secondary" size="sm">
                <Star className="size-3.5" />
                Star on GitHub
              </Button>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
