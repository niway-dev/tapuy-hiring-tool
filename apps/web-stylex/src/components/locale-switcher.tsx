import { ChevronDown } from "lucide-react";

import { useLocale, AVAILABLE_LOCALES } from "@interviews-tool/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@interviews-tool/web-ui";

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors outline-none cursor-pointer" />
        }
      >
        {locale.toUpperCase()}
        <ChevronDown className="size-3 shrink-0 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {AVAILABLE_LOCALES.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => setLocale(l)}
            className={locale === l ? "text-primary font-semibold" : ""}
          >
            {l.toUpperCase()}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
