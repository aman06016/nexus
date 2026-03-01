"use client";

import Link from "next/link";
import {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/feedback/ToastProvider";
import { ThemePreference, useTheme } from "@/components/theme/ThemeProvider";
import { emitActivityEvent } from "@/lib/collaboration/activity";

const links = [
  { href: "/", label: "Latest", shortcut: "Alt+1" },
  { href: "/trending", label: "Trending", shortcut: "Alt+2" },
  { href: "/saved", label: "Saved", shortcut: "Alt+3" },
  { href: "/digest", label: "Digest", shortcut: "Alt+4" },
  { href: "/radar", label: "Radar", shortcut: "Alt+5" }
] as const;

type CommandGroupId = "navigation" | "search" | "theme" | "actions";

type CommandGroup = {
  id: CommandGroupId;
  label: string;
};

type PaletteCommand = {
  id: string;
  label: string;
  description: string;
  preview: string;
  group: CommandGroupId;
  run: () => void;
  shortcut?: string;
  keywords?: string[];
};

const commandGroups: CommandGroup[] = [
  { id: "navigation", label: "Navigation" },
  { id: "search", label: "Search" },
  { id: "theme", label: "Theme" },
  { id: "actions", label: "Actions" }
];

const themeOptions: Array<{ value: ThemePreference; label: string; shortLabel: string }> = [
  { value: "light", label: "Light", shortLabel: "L" },
  { value: "dark", label: "Dark", shortLabel: "D" },
  { value: "system", label: "System", shortLabel: "S" }
];

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return (
    element?.tagName === "INPUT" ||
    element?.tagName === "TEXTAREA" ||
    element?.isContentEditable === true
  );
}

function normalizeForMatch(value: string): string {
  return value.trim().toLowerCase();
}

export function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { notify } = useToast();
  const { preference, resolvedTheme, setPreference } = useTheme();
  const [query, setQuery] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isCondensed, setIsCondensed] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const paletteTriggerRef = useRef<HTMLButtonElement>(null);
  const palettePanelRef = useRef<HTMLDivElement>(null);
  const paletteInputRef = useRef<HTMLInputElement>(null);
  const commandButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lastScrollYRef = useRef(0);
  const routeQuery = pathname === "/search" ? searchParams.get("q") ?? "" : "";

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
    setPaletteQuery("");
    setActiveCommandIndex(0);
    window.requestAnimationFrame(() => paletteTriggerRef.current?.focus());
  }, []);

  const openPalette = useCallback(() => {
    setPaletteOpen(true);
    setPaletteQuery("");
    setActiveCommandIndex(0);
  }, []);

  const pushSearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        notify("Search query cannot be empty", "error");
        return;
      }
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [notify, router]
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    if (pathname === "/search") {
      router.push("/search");
    }
  }, [pathname, router]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    pushSearch(query);
  };

  const cycleTheme = () => {
    const order: ThemePreference[] = ["light", "dark", "system"];
    const currentIndex = order.indexOf(preference);
    const nextPreference = order[(currentIndex + 1) % order.length];
    setPreference(nextPreference);
    notify(`Theme set to ${nextPreference}`, "info");
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setQuery(pathname === "/search" ? routeQuery : "");
  }, [pathname, routeQuery]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const maxScrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(100, Math.max(0, (y / maxScrollable) * 100));

      setScrollProgress(progress);
      setIsCondensed(y > 26);
      lastScrollYRef.current = y;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const commandK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (commandK) {
        event.preventDefault();
        if (paletteOpen) {
          closePalette();
        } else {
          openPalette();
        }
        return;
      }

      if (event.key === "Escape" && paletteOpen) {
        event.preventDefault();
        closePalette();
        return;
      }

      if (
        !paletteOpen &&
        event.altKey &&
        !isTypingTarget(event.target) &&
        ["1", "2", "3", "4", "5"].includes(event.key)
      ) {
        event.preventDefault();
        const destination = links[Number(event.key) - 1];
        if (destination) {
          router.push(destination.href);
          notify(`Navigated to ${destination.label}`, "info");
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closePalette, notify, openPalette, paletteOpen, router]);

  useEffect(() => {
    if (!paletteOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const main = document.querySelector("main");
    document.body.style.overflow = "hidden";
    main?.setAttribute("inert", "");
    main?.setAttribute("aria-hidden", "true");
    window.setTimeout(() => paletteInputRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      main?.removeAttribute("inert");
      main?.removeAttribute("aria-hidden");
    };
  }, [paletteOpen]);

  const commands = useMemo<PaletteCommand[]>(() => {
    const scopedQuery = (query.trim() || routeQuery.trim()).trim();

    const navigationCommands = links.map((link) => ({
      id: `nav:${link.href}`,
      label: `Go to ${link.label}`,
      description: `Open the ${link.label} page.`,
      preview: `Navigates to ${link.href}`,
      group: "navigation" as const,
      run: () => router.push(link.href),
      shortcut: link.shortcut,
      keywords: [link.label, link.href]
    }));

    const searchCommands: PaletteCommand[] = [
      {
        id: "search:open",
        label: "Open Search",
        description: "Jump to the search workspace.",
        preview: "Navigates to /search",
        group: "search",
        run: () => router.push("/search"),
        keywords: ["search", "filters", "query"]
      }
    ];

    if (scopedQuery) {
      searchCommands.unshift({
        id: "search:run-current",
        label: `Search for "${scopedQuery}"`,
        description: "Run search using the current typed query.",
        preview: `Executes /search?q=${encodeURIComponent(scopedQuery)}`,
        group: "search",
        run: () => router.push(`/search?q=${encodeURIComponent(scopedQuery)}`),
        shortcut: "Enter",
        keywords: ["run", "execute", "find"]
      });
    }

    if (query.trim() || pathname === "/search") {
      searchCommands.push({
        id: "search:clear",
        label: "Clear Search",
        description: "Reset the current search input and filters.",
        preview: pathname === "/search" ? "Resets to /search" : "Clears local query input",
        group: "search",
        run: clearSearch,
        keywords: ["reset", "empty", "remove"]
      });
    }

    const themeCommands: PaletteCommand[] = themeOptions.map((option) => ({
      id: `theme:${option.value}`,
      label: `Theme: ${option.label}`,
      description: `Switch interface theme to ${option.label.toLowerCase()}.`,
      preview: `Sets persisted theme preference to "${option.value}"`,
      group: "theme",
      run: () => {
        setPreference(option.value);
        notify(`Theme set to ${option.label}`, "info");
      },
      keywords: ["appearance", "dark", "light", "system"]
    }));

    const actionCommands: PaletteCommand[] = [
      {
        id: "action:refresh",
        label: "Refresh Current Page",
        description: "Refetch server data for the active route.",
        preview: "Calls router.refresh()",
        group: "actions",
        run: () => {
          router.refresh();
          notify("Refreshing feed", "info");
          emitActivityEvent("page-refresh", "Route refreshed from command palette");
        },
        keywords: ["reload", "update", "fetch"]
      },
      {
        id: "action:trending-scan",
        label: "Open Trending Scanner",
        description: "Jump to highest-signal stories right now.",
        preview: "Navigates to /trending",
        group: "actions",
        run: () => router.push("/trending"),
        keywords: ["ranking", "hot", "top"]
      },
      {
        id: "action:incident-radar",
        label: "Open Incident Radar",
        description: "Build monitoring rules and alert workflows.",
        preview: "Navigates to /radar",
        group: "actions",
        run: () => router.push("/radar"),
        keywords: ["alerts", "rules", "incident", "monitoring"]
      },
      {
        id: "action:admin",
        label: "Open Admin Controls",
        description: "Run scrape cycles and recompute ranking.",
        preview: "Navigates to /admin",
        group: "actions",
        run: () => router.push("/admin"),
        keywords: ["scrape", "recompute", "pipeline"]
      }
    ];

    return [...navigationCommands, ...searchCommands, ...themeCommands, ...actionCommands];
  }, [clearSearch, notify, pathname, query, routeQuery, router, setPreference]);

  const groupedCommands = useMemo(() => {
    const normalizedQuery = normalizeForMatch(paletteQuery);
    let nextIndex = 0;

    return commandGroups
      .map((group) => {
        const groupCommands = commands
          .filter((command) => command.group === group.id)
          .filter((command) => {
            if (!normalizedQuery) {
              return true;
            }

            const haystack = normalizeForMatch(
              [
                command.label,
                command.description,
                command.preview,
                group.label,
                ...(command.keywords ?? [])
              ].join(" ")
            );
            return haystack.includes(normalizedQuery);
          })
          .map((command) => ({ ...command, index: nextIndex++ }));

        return {
          ...group,
          commands: groupCommands
        };
      })
      .filter((group) => group.commands.length > 0);
  }, [commands, paletteQuery]);

  const visibleCommands = useMemo(
    () =>
      groupedCommands.flatMap((group) =>
        group.commands.map((command) => ({
          ...command,
          groupLabel: group.label
        }))
      ),
    [groupedCommands]
  );

  const activeCommand = activeCommandIndex >= 0 ? visibleCommands[activeCommandIndex] : undefined;

  useEffect(() => {
    if (!paletteOpen) {
      return;
    }

    if (visibleCommands.length === 0) {
      setActiveCommandIndex(-1);
      return;
    }

    setActiveCommandIndex((current) =>
      current >= 0 && current < visibleCommands.length ? current : 0
    );
  }, [paletteOpen, visibleCommands.length]);

  const executeCommand = useCallback(
    (index: number) => {
      const command = visibleCommands[index];
      if (!command) {
        return;
      }
      command.run();
      closePalette();
    },
    [closePalette, visibleCommands]
  );

  const handlePaletteKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closePalette();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (visibleCommands.length === 0) {
        return;
      }

      setActiveCommandIndex((current) => {
        const start = current < 0 ? 0 : current;
        const next =
          event.key === "ArrowDown"
            ? (start + 1) % visibleCommands.length
            : (start - 1 + visibleCommands.length) % visibleCommands.length;
        window.requestAnimationFrame(() => commandButtonRefs.current[next]?.focus());
        return next;
      });
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      if (visibleCommands.length === 0) {
        return;
      }
      setActiveCommandIndex(0);
      window.requestAnimationFrame(() => commandButtonRefs.current[0]?.focus());
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      if (visibleCommands.length === 0) {
        return;
      }
      const lastIndex = visibleCommands.length - 1;
      setActiveCommandIndex(lastIndex);
      window.requestAnimationFrame(() => commandButtonRefs.current[lastIndex]?.focus());
      return;
    }

    if (event.key === "Enter") {
      if (activeCommandIndex >= 0) {
        event.preventDefault();
        executeCommand(activeCommandIndex);
        return;
      }

      if (paletteQuery.trim()) {
        event.preventDefault();
        setPaletteQuery("");
        setActiveCommandIndex(0);
        notify("No matches found. Showing all commands.", "info");
        window.requestAnimationFrame(() => paletteInputRef.current?.focus());
        return;
      }
    }

    if (event.key === "Tab") {
      const panel = palettePanelRef.current;
      if (!panel) {
        return;
      }

      const focusable = panel.querySelectorAll<HTMLElement>(
        "button,[href],input,select,textarea,[tabindex]:not([tabindex='-1'])"
      );
      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 border-b border-borderSoft backdrop-blur transition ${
        isCondensed ? "bg-bgPrimary/95 shadow-glow" : "bg-bgPrimary/85"
      }`}
    >
      <div className={`mx-auto flex w-full max-w-7xl items-center gap-4 px-4 transition ${isCondensed ? "py-2" : "py-3"}`}>
        <Link href="/" className="font-semibold tracking-wide text-accentSecondary">
          NEXUS AI
        </Link>

        <nav className="flex items-center gap-2 text-sm text-textSecondary">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`motion-lift rounded-md px-3 py-1.5 transition ${
                  isActive
                    ? "bg-bgSecondary text-textPrimary"
                    : "hover:bg-bgSecondary hover:text-textPrimary"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-1 rounded-md border border-borderSoft bg-bgSecondary/80 p-1 md:flex">
          {themeOptions.map((option) => {
            const active = preference === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPreference(option.value)}
                className={`motion-press min-h-8 rounded px-2 py-1 text-xs font-medium transition ${
                  active
                    ? "bg-bgTertiary text-textPrimary"
                    : "text-textSecondary hover:bg-bgTertiary hover:text-textPrimary"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <form
          className={`ml-auto flex w-full flex-wrap items-center gap-2 transition md:flex-nowrap ${
            isCondensed ? "max-w-2xl" : "max-w-xl"
          }`}
          onSubmit={handleSearchSubmit}
        >
          <input
            aria-label="Search articles"
            placeholder={isCondensed ? "Search..." : "Search AI news, models, companies..."}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-10 w-full rounded-lg border border-borderSoft bg-bgSecondary px-3 py-2 text-sm text-textPrimary outline-none ring-accentPrimary transition focus:ring"
          />
          {query ? (
            <button
              type="button"
              onClick={clearSearch}
              className="motion-press min-h-10 rounded-md border border-borderSoft bg-bgSecondary px-3 py-2 text-sm font-medium text-textSecondary transition hover:bg-bgTertiary hover:text-textPrimary"
            >
              Clear
            </button>
          ) : null}
          <button
            type="submit"
            className="motion-press min-h-10 rounded-md border border-borderSoft bg-bgSecondary px-3 py-2 text-sm font-medium text-textSecondary transition hover:bg-bgTertiary hover:text-textPrimary"
          >
            Search
          </button>
          <button
            type="button"
            onClick={cycleTheme}
            className="motion-press min-h-10 rounded-md border border-borderSoft bg-bgSecondary px-3 py-2 text-sm font-medium text-textSecondary transition hover:bg-bgTertiary hover:text-textPrimary md:hidden"
            title={`Theme: ${preference} (resolved ${resolvedTheme})`}
          >
            Theme {themeOptions.find((option) => option.value === preference)?.shortLabel}
          </button>
          <button
            ref={paletteTriggerRef}
            type="button"
            onClick={openPalette}
            className="motion-press min-h-10 rounded-md border border-borderSoft bg-bgSecondary px-3 py-2 text-sm font-medium text-textSecondary transition hover:bg-bgTertiary hover:text-textPrimary"
            title="Command palette (Cmd/Ctrl+K)"
            aria-haspopup="dialog"
            aria-expanded={paletteOpen}
          >
            Cmd/Ctrl+K
          </button>
        </form>
      </div>

      <div className="h-[2px] w-full bg-bgTertiary/70">
        <div
          className="h-full bg-accentPrimary transition-[width] duration-150"
          style={{ width: `${scrollProgress}%` }}
          aria-hidden="true"
        />
      </div>

      {mounted && paletteOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[60] flex items-start justify-center bg-bgPrimary/80 px-4 pt-16 md:pt-20"
              onMouseDown={closePalette}
            >
              <div
                ref={palettePanelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Command palette"
                className="motion-fade-up w-full max-w-3xl rounded-xl border border-borderSoft bg-bgSecondary p-3 shadow-glow"
                onMouseDown={(event) => event.stopPropagation()}
                onKeyDown={handlePaletteKeyDown}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-textSecondary">Command Palette</p>
                  <button
                    type="button"
                    onClick={closePalette}
                    className="motion-press rounded border border-borderSoft bg-bgTertiary px-2 py-1 text-xs text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
                  >
                    Esc
                  </button>
                </div>

                <input
                  ref={paletteInputRef}
                  value={paletteQuery}
                  onChange={(event) => setPaletteQuery(event.target.value)}
                  placeholder="Type a command, page, or action..."
                  className="w-full rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm outline-none ring-accentPrimary transition focus:ring"
                />
                <p className="mt-1 text-[11px] text-textTertiary">
                  Enter runs selected command. If no match, Enter clears query.
                </p>

                <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {groupedCommands.length === 0 ? (
                      <div className="space-y-2 rounded-md border border-borderSoft bg-bgTertiary px-3 py-3 text-sm text-textSecondary">
                        <p>No matching commands for &quot;{paletteQuery}&quot;.</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPaletteQuery("");
                              setActiveCommandIndex(0);
                              window.requestAnimationFrame(() => paletteInputRef.current?.focus());
                            }}
                            className="motion-press rounded border border-borderSoft bg-bgPrimary px-2 py-1 text-xs text-textSecondary transition hover:text-textPrimary"
                          >
                            Clear Query
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPaletteQuery("");
                              setActiveCommandIndex(0);
                              notify("Showing all commands", "info");
                            }}
                            className="motion-press rounded border border-borderSoft bg-bgPrimary px-2 py-1 text-xs text-textSecondary transition hover:text-textPrimary"
                          >
                            Show All Commands
                          </button>
                        </div>
                        <p className="text-xs text-textTertiary">Press Enter to clear and recover.</p>
                      </div>
                    ) : (
                      groupedCommands.map((group) => (
                        <section key={group.id} aria-label={group.label} className="space-y-1">
                          <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-textTertiary">
                            {group.label}
                          </p>
                          <div role="listbox" aria-label={`${group.label} commands`} className="space-y-1">
                            {group.commands.map((command) => {
                              const selected = command.index === activeCommandIndex;
                              return (
                                <button
                                  key={command.id}
                                  ref={(element) => {
                                    commandButtonRefs.current[command.index] = element;
                                  }}
                                  type="button"
                                  role="option"
                                  aria-selected={selected}
                                  onMouseEnter={() => setActiveCommandIndex(command.index)}
                                  onFocus={() => setActiveCommandIndex(command.index)}
                                  onClick={() => executeCommand(command.index)}
                                  className={`motion-press w-full rounded-md border px-3 py-2 text-left transition ${
                                    selected
                                      ? "border-accentPrimary/50 bg-bgPrimary text-textPrimary"
                                      : "border-borderSoft bg-bgTertiary text-textSecondary hover:bg-bgPrimary hover:text-textPrimary"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-medium">{command.label}</span>
                                    {command.shortcut ? (
                                      <span className="rounded border border-borderSoft px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-textTertiary">
                                        {command.shortcut}
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="mt-1 text-xs text-textTertiary">{command.description}</p>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      ))
                    )}
                  </div>

                  <aside className="rounded-md border border-borderSoft bg-bgTertiary p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-textTertiary">Preview</p>
                    {activeCommand ? (
                      <div className="mt-2 space-y-2">
                        <p className="text-sm font-semibold text-textPrimary">{activeCommand.label}</p>
                        <p className="text-xs text-textSecondary">{activeCommand.description}</p>
                        <p className="rounded border border-borderSoft bg-bgPrimary px-2 py-1 text-xs text-textSecondary">
                          {activeCommand.preview}
                        </p>
                        <p className="text-[11px] uppercase tracking-wide text-textTertiary">
                          Group: {activeCommand.groupLabel}
                        </p>
                        {activeCommand.shortcut ? (
                          <p className="text-[11px] uppercase tracking-wide text-textTertiary">
                            Shortcut: {activeCommand.shortcut}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-textSecondary">
                        Select a command to inspect what it will do before execution.
                      </p>
                    )}
                  </aside>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </header>
  );
}
