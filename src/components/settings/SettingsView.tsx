import { useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Icon } from "@iconify/react";
import { useAuthStore } from "../../store/useAuthStore";
import { useInstanceStore } from "../../store/useInstanceStore";
import { ACCENT_PRESETS, useThemeStore, type BackgroundEffect } from "../../store/useThemeStore";
import { Button } from "../ui/Button";
import { Toggle } from "../ui/Toggle";

interface Row {
  label: string;
  desc?: string;
  control: ReactNode;
  wide?: boolean;
}

interface Section {
  id: string;
  group: string;
  title: string;
  icon: string;
  desc: string;
  rows: Row[];
}

const GROUPS = [
  { id: "general", label: "Allgemein", icon: "solar:settings-bold" },
  { id: "background", label: "Hintergrund", icon: "solar:pallete-2-bold" },
  { id: "account", label: "Account", icon: "solar:user-id-bold" },
];

const EFFECTS: { id: BackgroundEffect; label: string; icon: string }[] = [
  { id: "particles", label: "Partikel", icon: "solar:stars-bold" },
  { id: "grid", label: "Raster", icon: "solar:widget-bold" },
  { id: "plain", label: "Einfarbig", icon: "solar:pallete-2-bold" },
];

/** Settings: grouped sub-navigation with search on the left, sections of labelled rows on the right. */
export function SettingsView() {
  const theme = useThemeStore();
  const { account, logout } = useAuthStore();
  const { ramGb, setRam } = useInstanceStore();
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("general");
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const sections: Section[] = [
    {
      id: "accent",
      group: "general",
      title: "Akzentfarbe",
      icon: "solar:pallete-2-bold",
      desc: "Farbe für Rahmen, Buttons und Effekte im Launcher.",
      rows: [
        {
          label: "",
          wide: true,
          control: (
            <div className="flex items-start gap-6">
              <div className="grid grid-cols-7 gap-2">
                {ACCENT_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => theme.set({ accent: c })}
                    title={c}
                    className={clsx(
                      "w-12 h-12 border-2 flex items-center justify-center cursor-pointer transition-transform hover:scale-105",
                      theme.accent.toLowerCase() === c ? "border-white" : "border-transparent",
                    )}
                    style={{ background: c }}
                  >
                    {theme.accent.toLowerCase() === c && <Icon icon="solar:check-read-linear" width={22} height={22} className="text-white" />}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-3 border-2 border-dashed border-accent/50 p-3 cursor-pointer">
                <input
                  type="color"
                  value={theme.accent}
                  onChange={(e) => theme.set({ accent: e.target.value })}
                  className="w-10 h-10 bg-transparent border-0 p-0 cursor-pointer"
                />
                <span className="flex flex-col">
                  <span className="label-mc text-xs">Eigene</span>
                  <span className="font-mc text-[11px] text-white/50">{theme.accent}</span>
                </span>
              </label>
            </div>
          ),
        },
      ],
    },
    {
      id: "behaviour",
      group: "general",
      title: "Verhalten",
      icon: "solar:tuning-2-bold",
      desc: "Wie der Launcher Minecraft startet.",
      rows: [
        {
          label: "Standard-RAM",
          desc: "Arbeitsspeicher für Profile ohne eigene RAM-Einstellung.",
          control: (
            <div className="flex items-center gap-3 w-64">
              <input type="range" min={2} max={16} value={ramGb} onChange={(e) => setRam(Number(e.target.value))} className="flex-1 accent-accent" />
              <span className="font-mc text-xs w-12 text-right">{ramGb} GB</span>
            </div>
          ),
        },
      ],
    },
    {
      id: "effect",
      group: "background",
      title: "Hintergrund-Effekt",
      icon: "solar:stars-bold",
      desc: "Wähle den Hintergrund des Launchers.",
      rows: [
        { label: "Animationen", desc: "Bewegte Hintergrund-Effekte.", control: <Toggle on={theme.animations} onChange={(v) => theme.set({ animations: v })} /> },
        { label: "Skin-Animation", desc: "Dein Skin winkt auf der Play-Seite.", control: <Toggle on={theme.skinAnimation} onChange={(v) => theme.set({ skinAnimation: v })} /> },
        { label: "Sidebar-Beschriftung", desc: "Text unter den Icons in der Seitenleiste.", control: <Toggle on={theme.sidebarLabels} onChange={(v) => theme.set({ sidebarLabels: v })} /> },
        {
          label: "",
          wide: true,
          control: (
            <div className="grid grid-cols-3 gap-3">
              {EFFECTS.map((fx) => {
                const on = theme.background === fx.id;
                return (
                  <button
                    key={fx.id}
                    onClick={() => theme.set({ background: fx.id })}
                    className={clsx(
                      "relative h-36 border-2 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
                      on ? "border-accent bg-accent/20 border-b-4" : "border-accent/30 bg-black/30 hover:border-accent/60",
                    )}
                  >
                    {on && <Icon icon="solar:check-circle-bold" width={18} height={18} className="absolute top-2 right-2 text-accent" />}
                    <Icon icon={fx.icon} width={36} height={36} />
                    <span className="label-mc text-[11px]">{fx.label}</span>
                  </button>
                );
              })}
            </div>
          ),
        },
      ],
    },
    {
      id: "account",
      group: "account",
      title: "Account",
      icon: "solar:user-id-bold",
      desc: "Der Microsoft-Account, mit dem du spielst.",
      rows: [
        {
          label: account?.name ?? "Nicht angemeldet",
          desc: "Weitere Accounts fügst du oben rechts über deinen Namen hinzu.",
          control: account ? (
            <Button variant="danger" size="sm" onClick={() => logout()}>
              Abmelden
            </Button>
          ) : null,
        },
      ],
    },
  ];

  const q = query.trim().toLowerCase();
  const visible = sections
    .map((s) => ({
      ...s,
      rows: q && !s.title.toLowerCase().includes(q) ? s.rows.filter((r) => `${r.label} ${r.desc ?? ""}`.toLowerCase().includes(q)) : s.rows,
    }))
    .filter((s) => s.rows.length > 0);

  const jump = (id: string, group: string) => {
    setActiveGroup(group);
    refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="h-full p-6">
      <div className="h-full flex flex-col border-2 border-accent/40 bg-black/30 backdrop-blur">
        <div className="h-14 shrink-0 flex items-center gap-3 px-5 border-b-2 border-accent/40 bg-accent/10">
          <Icon icon="solar:settings-bold" width={22} height={22} />
          <span className="label-mc text-sm">Optionen</span>
        </div>

        <div className="flex-1 flex min-h-0">
          <nav className="w-60 shrink-0 border-r-2 border-accent/20 p-4 flex flex-col gap-1 overflow-y-auto">
            <div className="relative mb-3">
              <Icon icon="solar:magnifer-linear" width={14} height={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Suchen…"
                className="font-mc w-full h-9 bg-black/40 border-2 border-white/10 pl-8 pr-2 text-[11px] outline-none focus:border-accent/60"
              />
            </div>
            {GROUPS.map((g) => (
              <div key={g.id}>
                <button
                  onClick={() => {
                    const first = sections.find((s) => s.group === g.id);
                    if (first) jump(first.id, g.id);
                  }}
                  className={clsx(
                    "label-mc w-full flex items-center gap-3 px-3 h-10 text-xs cursor-pointer transition-colors",
                    activeGroup === g.id ? "bg-accent/20 text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon icon={g.icon} width={18} height={18} className={activeGroup === g.id ? "text-accent" : ""} />
                  {g.label}
                </button>
                {activeGroup === g.id && (
                  <div className="ml-5 my-1 border-l-2 border-accent/30">
                    {sections
                      .filter((s) => s.group === g.id)
                      .map((s) => (
                        <button
                          key={s.id}
                          onClick={() => jump(s.id, g.id)}
                          className="label-mc block w-full text-left pl-4 py-1.5 text-[10px] text-white/50 hover:text-white cursor-pointer"
                        >
                          {s.title}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto px-8 py-6">
            {visible.length === 0 && <p className="text-sm text-white/40">Keine Treffer für "{query}".</p>}
            {visible.map((s) => (
              <section key={s.id} ref={(el) => {
                  refs.current[s.id] = el;
                }} className="mb-10">
                <h3 className="label-mc flex items-center gap-2.5 text-sm text-accent pb-2 border-b-2 border-white/10">
                  <Icon icon={s.icon} width={20} height={20} />
                  {s.title}
                </h3>
                <p className="text-xs text-white/40 mt-2 mb-3">{s.desc}</p>
                {s.rows.map((r, i) =>
                  r.wide ? (
                    <div key={i} className="py-3">
                      {r.control}
                    </div>
                  ) : (
                    <div key={i} className="flex items-center gap-6 py-3.5 border-b border-white/5">
                      <div className="flex-1">
                        <div className="font-mc text-sm">{r.label}</div>
                        {r.desc && <div className="text-xs text-white/40 mt-0.5">{r.desc}</div>}
                      </div>
                      {r.control}
                    </div>
                  ),
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
