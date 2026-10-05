import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

const RELEASES_URL = "https://api.github.com/repos/KingF3rdi/aero-client-launcher/releases?per_page=8";
const CACHE_KEY = "aero-launcher.news";
const CACHE_MS = 30 * 60 * 1000;
const MC_NEWS_URL = "https://launchercontent.mojang.com/v2/news.json";
const MC_CACHE_KEY = "aero-launcher.mcnews";

interface NewsItem {
  id: number;
  title: string;
  date: string;
  body: string;
  url: string;
  preview: boolean;
  image?: string;
}

/** Right-hand "News" column: the latest Aero Client releases and their notes, straight from GitHub. */
export function NewsPanel() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [source, setSource] = useState<"aero" | "mc">("aero");
  const [mcItems, setMcItems] = useState<NewsItem[] | null>(null);

  // Minecraft: Java news from the feed the official launcher shows, loaded the first time the tab opens.
  useEffect(() => {
    if (source !== "mc" || mcItems) return;
    try {
      const cached = JSON.parse(sessionStorage.getItem(MC_CACHE_KEY) ?? "null");
      if (cached && Date.now() - cached.at < CACHE_MS) {
        setMcItems(cached.items);
        return;
      }
    } catch {
      // no cache available
    }
    fetch(MC_NEWS_URL)
      .then((r) => r.json())
      .then((d: { entries: Array<Record<string, any>> }) => {
        const list = d.entries
          .filter((e) => (e.newsType ?? []).includes("Java"))
          .slice(0, 12)
          .map((e, i) => ({
            id: i,
            title: String(e.title),
            date: String(e.date ?? ""),
            body: String(e.text ?? ""),
            url: String(e.readMoreLink ?? "https://www.minecraft.net"),
            preview: false,
            image: e.playPageImage?.url ? `https://launchercontent.mojang.com${e.playPageImage.url}` : undefined,
          }));
        setMcItems(list);
        try {
          sessionStorage.setItem(MC_CACHE_KEY, JSON.stringify({ at: Date.now(), items: list }));
        } catch {
          // storage unavailable
        }
      })
      .catch(() => setMcItems([]));
  }, [source, mcItems]);

  const shown = source === "aero" ? items : mcItems;

  useEffect(() => {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? "null");
      if (cached && Date.now() - cached.at < CACHE_MS) {
        setItems(cached.items);
        return;
      }
    } catch {
      // no cache available
    }
    fetch(RELEASES_URL)
      .then((r) => r.json())
      .then((rels: Array<Record<string, unknown>>) => {
        const list = rels
          .filter((r) => !r.draft)
          .map((r) => ({
            id: Number(r.id),
            title: String(r.name || r.tag_name),
            date: String(r.published_at ?? r.created_at ?? ""),
            body: String(r.body ?? "").trim(),
            url: String(r.html_url),
            preview: Boolean(r.prerelease),
          }));
        setItems(list);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), items: list }));
        } catch {
          // storage unavailable
        }
      })
      .catch(() => setItems([]));
  }, []);

  return (
    <aside className="w-80 shrink-0 border-l border-white/10 bg-black/25 backdrop-blur flex flex-col">
      <div className="label-mc flex items-center gap-2 px-4 h-12 border-b border-white/10 text-xs">
        <Icon icon="solar:document-text-bold" width={16} height={16} className="text-accent" />
        <span className="flex-1">News</span>
        <div className="flex gap-0.5 p-0.5 rounded-lg bg-black/40 border border-white/10 normal-case tracking-normal">
          {(["aero", "mc"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setSource(k)}
              className={
                "px-2 h-6 text-[11px] font-semibold rounded-md cursor-pointer transition-colors " +
                (source === k ? "bg-white/15 text-white" : "text-white/50 hover:text-white")
              }
            >
              {k === "aero" ? "Aero" : "Minecraft"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {shown === null && <p className="text-xs text-white/40">Lädt…</p>}
        {shown?.length === 0 && <p className="text-xs text-white/40">Keine News verfügbar.</p>}
        {shown?.map((n) => (
          <a
            key={n.id}
            href={n.url}
            target="_blank"
            rel="noopener"
            onClick={(e) => {
              if (isTauri()) {
                e.preventDefault();
                openUrl(n.url);
              }
            }}
            className="block rounded-xl border border-white/10 bg-white/[0.04] hover:border-accent/60 hover:bg-accent/10 transition-colors p-3"
          >
            {n.image && <img src={n.image} alt="" loading="lazy" className="w-full aspect-[3/2] object-cover rounded-lg mb-2" />}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[13px] font-semibold text-white truncate flex-1">{n.title}</span>
              {n.preview && <span className="label-mc text-[9px] px-1.5 py-0.5 rounded bg-accent/30 text-white shrink-0">Beta</span>}
            </div>
            <div className="text-[10px] text-white/40 mb-1.5">{n.date ? new Date(n.date).toLocaleDateString("de-DE") : ""}</div>
            <p className="text-xs text-white/60 line-clamp-3 whitespace-pre-line">{n.body || "Neue Version verfügbar."}</p>
          </a>
        ))}
      </div>
    </aside>
  );
}
