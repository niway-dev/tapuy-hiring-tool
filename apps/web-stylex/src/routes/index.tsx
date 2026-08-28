import { createFileRoute, Link } from "@tanstack/react-router";
import { Button, Card, StatusBadge, TapuyMark } from "@interviews-tool/web-ui";
import { useTranslations } from "@interviews-tool/i18n";
import { Star } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const GITHUB_URL = "https://github.com/tapuy/tapuy";
const DOCS_URL = "https://tapuy.dev/docs";

const ALL_STATUSES = [
  "first-contact",
  "ongoing",
  "on-hold",
  "offer-made",
  "offer-accepted",
  "hired",
  "rejected",
  "dropped-out",
] as const;

/* Demo content for the hero mock — screenshot material, intentionally not translated */
const demoTimeline = [
  {
    date: "Aug 18, 2026",
    title: (
      <>
        Offer — <span className="mono">$5,200 / mo · USD</span>
      </>
    ),
    body: "Base $5,200, sign-on bonus possible if I answer this week. Equity refresh at year two — get it in writing before accepting.",
    node: "bg-fuchsia",
  },
  {
    date: "Aug 11, 2026",
    title: <>Technical interview</>,
    body: "Live coding with two seniors. React Native bridge questions, one system design round. Felt solid.",
    node: "bg-text-muted",
  },
  {
    date: "Aug 4, 2026",
    title: <>First call — Ana Torres, Engineering Manager</>,
    body: (
      <>
        Range is <span className="mono">$4,800–5,500</span> depending on seniority. Async-first
        team. She said the budget closes in September.
      </>
    ),
    node: "bg-text-muted",
  },
];

function DemoTimelineCard() {
  return (
    <Card className="mx-auto mt-20 w-full max-w-3xl gap-0 py-0 text-left">
      <div className="flex items-start justify-between border-b border-border px-6 py-5">
        <div>
          <p className="text-base font-medium text-text">Acme Corp</p>
          <p className="mt-0.5 text-sm text-text-secondary">React Native Developer</p>
        </div>
        <StatusBadge status="offer-made" />
      </div>
      <div className="px-6 py-6">
        <div className="relative pl-8">
          <div className="absolute top-2 bottom-2 left-[3px] w-px bg-border-strong" />
          <div className="space-y-8">
            {demoTimeline.map((entry) => (
              <div key={entry.date} className="relative">
                <span
                  className={`absolute top-1.5 -left-8 ml-[-0.5px] size-2 rounded-full ${entry.node}`}
                />
                <p className="mono text-xs text-text-muted">{entry.date}</p>
                <p className="mt-1 text-sm font-medium text-text">{entry.title}</p>
                <p className="mt-2 max-w-prose text-base leading-[1.7] text-text">{entry.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* Static mock of the live-note mode — screenshot material, not translated */
function LiveNoteShowcase() {
  return (
    <Card className="w-full gap-0 overflow-hidden py-0 text-left">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="size-[7px] shrink-0 rounded-full bg-fuchsia" />
        <span className="mono text-[13px] text-text">28:14</span>
        <span className="truncate text-sm font-medium text-text">Acme Corp</span>
        <span className="mono ml-auto shrink-0 text-xs text-text-muted">Draft saved 9:41 AM</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_180px]">
        <div className="mono px-5 py-5 text-[13px] leading-[1.9] text-text">
          <p>
            <span className="font-medium">9:36 AM</span> Ana, EM. Four on mobile.
          </p>
          <p>
            <span className="font-medium">Q:</span> How is comp reviewed?
          </p>
          <p className="text-text-secondary">once a year, band-based</p>
          <p>
            <span className="font-medium">9:41 AM</span> range{" "}
            <span className="rounded bg-surface-2 px-1.5">$4,800–5,500</span>
          </p>
          <p>
            <span className="font-medium">Next step:</span> CTO chat
          </p>
          <span className="mt-1 inline-block h-4 w-[2px] bg-mint" />
        </div>
        <div className="hidden border-l border-border px-4 py-5 sm:block">
          <p className="text-[11px] font-medium tracking-[0.08em] text-text-muted uppercase">
            Questions
          </p>
          <div className="mt-3 space-y-3 text-[12px] leading-snug">
            <p className="flex gap-2 text-text-muted">
              <span className="text-mint">✓</span>
              <span className="line-through">How is comp reviewed?</span>
            </p>
            <p className="flex gap-2 text-text-secondary">
              <span className="text-text-muted">▢</span>
              What does the week look like?
            </p>
            <p className="flex gap-2 text-text-secondary">
              <span className="text-text-muted">▢</span>
              Who signs off?
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PipelinePanel() {
  return (
    <Card className="mt-6 px-4 py-4">
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((status) => (
          <StatusBadge key={status} status={status} />
        ))}
      </div>
    </Card>
  );
}

function NumbersPanel() {
  const rows = [
    { label: "base", value: "$5,200 / mo · USD" },
    { label: "contract", value: "$28 / hr · USD" },
    { label: "stage", value: "3 of 5" },
    { label: "interactions", value: "12 logged" },
  ];
  return (
    <Card className="mt-6 gap-0 px-5 py-4">
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="mono flex items-baseline justify-between text-[13px]">
            <span className="text-text-muted">{row.label}</span>
            <span className="text-text">{row.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MarkdownPanel() {
  return (
    <Card className="mt-6 px-5 py-4">
      <pre className="mono text-[13px] leading-relaxed whitespace-pre-wrap text-text-secondary">
        {
          "## Second call\n**They can't move on base**,\nbut there's a sign-on bonus\non the table. In writing, please."
        }
      </pre>
    </Card>
  );
}

function HomePage() {
  const context = Route.useRouteContext();
  const { isAuthenticated } = context;
  const t = useTranslations("landing");

  const features = [
    { key: "pipeline", panel: <PipelinePanel /> },
    { key: "numbers", panel: <NumbersPanel /> },
    { key: "timeline", panel: <MarkdownPanel /> },
  ] as const;

  const principles = ["one", "two", "three", "four", "five"] as const;

  const primaryCta = isAuthenticated ? (
    <Link to="/hiring-processes">
      <Button>{t("hero.openPipeline")}</Button>
    </Link>
  ) : (
    <Link to="/auth/signup">
      <Button>{t("hero.createAccount")}</Button>
    </Link>
  );

  return (
    <div className="bg-bg text-text">
      {/* Hero — the one surface where the three neons may coexist */}
      <section className="container mx-auto px-4 pt-24 pb-8 text-center md:pt-36">
        <p className="mono text-sm tracking-[0.35em] text-violet">{t("hero.kicker")}</p>
        <h1 className="display mx-auto mt-8 max-w-4xl text-[clamp(2.75rem,7vw,5.25rem)] leading-[1.05]">
          {t("hero.titlePlain")} <em>{t("hero.titleEmphasis")}</em>
        </h1>
        <p className="mt-8 text-xl text-text-secondary md:text-2xl">{t("hero.subtitle")}</p>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-text-muted">
          {t("hero.description")}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {primaryCta}
          {!isAuthenticated && (
            <Link to="/auth/login">
              <Button variant="secondary">{t("hero.signIn")}</Button>
            </Link>
          )}
        </div>

        <DemoTimelineCard />
      </section>

      {/* Live note — write during the call, not after */}
      <section className="container mx-auto max-w-6xl px-4 pt-28 text-left">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="flex items-center gap-2.5">
              <span className="size-[7px] shrink-0 rounded-full bg-fuchsia" />
              <span className="mono text-sm tracking-[0.3em] text-fuchsia uppercase">
                {t("liveNote.kicker")}
              </span>
            </p>
            <h2 className="display mt-6 text-4xl md:text-5xl">{t("liveNote.title")}</h2>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-text-secondary">
              {t("liveNote.body")}
            </p>
            <ul className="mt-8 max-w-lg space-y-4 text-base leading-relaxed text-text">
              <li>{t("liveNote.point1")}</li>
              <li>{t("liveNote.point2")}</li>
              <li>{t("liveNote.point3")}</li>
            </ul>
          </div>
          <LiveNoteShowcase />
        </div>
      </section>

      {/* Three features — one per principle */}
      <section className="container mx-auto max-w-6xl px-4 pt-28">
        <div className="grid gap-14 md:grid-cols-3 md:gap-10">
          {features.map((feature, index) => (
            <div key={feature.key}>
              <p className="mono text-sm text-text-muted">0{index + 1}</p>
              <h2 className="display mt-4 text-3xl md:text-4xl">
                {t(`features.${feature.key}.title`)}
              </h2>
              <p className="mt-4 max-w-sm text-base leading-relaxed text-text-secondary">
                {t(`features.${feature.key}.description`)}
              </p>
              {feature.panel}
            </div>
          ))}
        </div>
      </section>

      {/* Five principles */}
      <section className="container mx-auto max-w-3xl px-4 pt-32">
        <h2 className="display text-4xl md:text-5xl">{t("principles.heading")}</h2>
        <div className="mt-12 space-y-10">
          {principles.map((key, index) => (
            <div key={key} className="grid grid-cols-[3rem_1fr] gap-2">
              <p className="mono pt-0.5 text-sm text-violet">0{index + 1}</p>
              <div>
                <h3 className="text-base font-medium text-text">{t(`principles.${key}.title`)}</h3>
                <p className="mt-2 max-w-2xl text-base leading-relaxed text-text-secondary">
                  {t(`principles.${key}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Yours to run */}
      <section className="container mx-auto max-w-3xl px-4 pt-32">
        <h2 className="display text-4xl md:text-5xl">{t("yoursToRun.heading")}</h2>
        <p className="mt-5 max-w-md text-base leading-relaxed text-text-secondary">
          {t("yoursToRun.description")}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <code className="mono inline-flex h-9 items-center rounded-md border border-border bg-surface-2 px-4 text-[13px] text-text-secondary">
            git clone github.com/tapuy/tapuy
          </code>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary">
              <Star className="size-4" />
              {t("yoursToRun.starOnGitHub")}
            </Button>
          </a>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 pt-32 pb-24 text-center">
        <h2 className="display text-4xl md:text-5xl">{t("finalCta.heading")}</h2>
        <p className="mt-5 text-base text-text-secondary">{t("finalCta.description")}</p>
        <div className="mt-8 flex justify-center">
          {isAuthenticated ? (
            <Link to="/hiring-processes">
              <Button>{t("finalCta.openPipeline")}</Button>
            </Link>
          ) : (
            <Link to="/auth/signup">
              <Button>{t("finalCta.createAccount")}</Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-8 sm:flex-row">
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <TapuyMark className="size-4" />
            {t("footer.tagline")}
          </p>
          <div className="flex items-center gap-6 text-sm">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary transition-colors hover:text-text"
            >
              {t("footer.github")}
            </a>
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary transition-colors hover:text-text"
            >
              {t("footer.docs")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
