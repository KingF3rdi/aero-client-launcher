import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

const RELEASES_URL = "https://api.github.com/repos/KingF3rdi/aero-client-launcher/releases?per_page=8";
const CACHE_KEY = "aero-launcher.news";
const CACHE_MS = 30 * 60 * 1000;

interface NewsItem {
  id: number;
  title: string;
  date: string;
  body: string;
  url: string;
  preview: boolean;
}

/** Right-hand "News" column: the latest Aero Client releases and their notes, straight from GitHub. */
export function NewsPanel() {
  const [items, setItems] = useState<NewsItem[] | null>(null);

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
    <aside className="w-80 shrink-0 border-l-2 border-accent/40 bg-black/25 backdrop-blur flex flex-col">
      <div className="label-mc flex items-center gap-2 px-4 h-12 border-b-2 border-accent/30 text-xs">
        <Icon icon="solar:document-text-bold" width={16} height={16} className="text-accent" />
        News
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {items === null && <p className="text-xs text-white/40">Lädt…</p>}
        {items?.length === 0 && <p className="text-xs text-white/40">Keine News verfügbar.</p>}
        {items?.map((n) => (
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
            className="block border-2 border-accent/30 bg-black/30 hover:border-accent/70 hover:bg-accent/10 transition-colors p-3"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="label-mc text-[11px] text-white truncate flex-1">{n.title}</span>
              {n.preview && <span className="label-mc text-[9px] px-1.5 py-0.5 bg-accent/30 text-white shrink-0">Beta</span>}
            </div>
            <div className="text-[10px] text-white/40 mb-1.5">{n.date ? new Date(n.date).toLocaleDateString("de-DE") : ""}</div>
            <p className="text-xs text-white/60 line-clamp-3 whitespace-pre-line">{n.body || "Neue Version verfügbar."}</p>
          </a>
        ))}
      </div>
    </aside>
  );
}
