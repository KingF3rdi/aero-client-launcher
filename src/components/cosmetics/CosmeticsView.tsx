import { useEffect, useState } from "react";
import clsx from "clsx";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import { invoke } from "../../lib/tauri";
import { COSMETICS, RARITY, capeTexture, type Cosmetic, type CosmeticKind } from "../../lib/cosmetics";
import { useAuthStore } from "../../store/useAuthStore";
import { useInstanceStore } from "../../store/useInstanceStore";
import { SkinStage } from "../play/SkinStage";
import { CapesView } from "../capes/CapesView";

type Tab = CosmeticKind | "custom";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "cape", label: "Capes", icon: "solar:magic-stick-3-bold" },
  { id: "wings", label: "Wings", icon: "solar:leaf-bold" },
  { id: "trail", label: "Trails", icon: "solar:stars-bold" },
  { id: "head", label: "Headwear", icon: "solar:crown-bold" },
  { id: "pet", label: "Pets", icon: "solar:cat-bold" },
  { id: "custom", label: "Custom Capes", icon: "solar:upload-minimalistic-bold" },
];

const NONE: Record<CosmeticKind, string> = { cape: "none", wings: "none", trail: "none", head: "none", pet: "none" };

/**
 * Wardrobe for the Aero Client mod: pick cape, wings, trail, headwear and pet for a profile. Like
 * the Custom Capes page it writes into that profile's mod config, so it applies on the next start.
 */
export function CosmeticsView() {
  const { account } = useAuthStore();
  const { instances, selectedId, select } = useInstanceStore();
  const [tab, setTab] = useState<Tab>("cape");
  const [equipped, setEquipped] = useState(NONE);

  const modInstances = instances.filter((i) => i.mcVersion === "1.21.11" && i.modEnabled);
  const target = modInstances.find((i) => i.id === selectedId) ?? modInstances[0] ?? null;

  const load = () => {
    if (!target) return;
    invoke<Record<CosmeticKind, string>>("get_cosmetics", { instanceId: target.id })
      .then((e) => setEquipped({ ...NONE, ...e }))
      .catch(() => setEquipped(NONE));
  };
  useEffect(load, [target?.id]);

  const equip = async (kind: CosmeticKind, id: string) => {
    if (!target) return;
    const next = equipped[kind] === id ? "none" : id; // clicking the equipped one takes it off
    try {
      await invoke("equip_cosmetic", { instanceId: target.id, kind, id: next });
      setEquipped((e) => ({ ...e, [kind]: next }));
    } catch (e) {
      toast.error(String(e));
    }
  };

  const nameOf = (kind: CosmeticKind) => {
    const id = equipped[kind];
    if (id === "none") return "–";
    return COSMETICS[kind].find((i) => i.id === id)?.name ?? (id.startsWith("custom_") ? "Custom" : id);
  };

  return (
    <div className="flex h-full">
      <aside className="w-72 shrink-0 border-r border-white/10 bg-black/20 flex flex-col">
        <div className="relative flex-1 min-h-0">
          {account && (
            <SkinStage
              uuid={account.uuid}
              skinUrl={account.skinUrl ?? null}
              animate={false}
              capeUrl={capeTexture(equipped.cape)}
              back={tab === "cape" || tab === "custom"}
            />
          )}
        </div>
        <div className="p-4 border-t border-white/10 flex flex-col gap-1.5 text-xs">
          {TABS.filter((t) => t.id !== "custom").map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-white/50">
              <Icon icon={t.icon} width={14} height={14} className="text-accent" />
              <span className="flex-1">{t.label}</span>
              <span className="text-white">{nameOf(t.id as CosmeticKind)}</span>
            </div>
          ))}
          <p className="text-[11px] text-white/35 mt-2">Wings, Trails, Headwear und Pets siehst du im Spiel (F5) und in der Garderobe des Clients.</p>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-2 px-8 pt-6 pb-4 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                "label-mc h-9 px-3.5 flex items-center gap-2 text-[11px] border transition-colors cursor-pointer",
                tab === t.id ? "bg-accent border-accent text-white" : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-accent/50",
              )}
            >
              <Icon icon={t.icon} width={15} height={15} />
              {t.label}
            </button>
          ))}
          {modInstances.length > 0 && tab !== "custom" && (
            <select
              value={target?.id ?? ""}
              onChange={(e) => select(e.target.value)}
              title="Profil"
              className="ml-auto h-9 bg-black/40 border border-white/15 px-2 text-xs focus:outline-none focus:border-accent/60"
            >
              {modInstances.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {tab === "custom" ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <CapesView onEquipped={load} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-8">
            {!target && (
              <p className="text-xs text-white/40 mb-4">
                Kein Profil mit aktiviertem Aero Client (Fabric 1.21.11) – aktiviere ihn in einem Profil, um Cosmetics auszurüsten.
              </p>
            )}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
              {COSMETICS[tab].map((item) => (
                <Card key={item.id} kind={tab} item={item} icon={TABS.find((t) => t.id === tab)!.icon} on={equipped[tab] === item.id} disabled={!target} onClick={() => equip(tab, item.id)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ kind, item, icon, on, disabled, onClick }: { kind: CosmeticKind; item: Cosmetic; icon: string; on: boolean; disabled: boolean; onClick: () => void }) {
  const rarity = RARITY[item.rarity];
  const tex = kind === "cape" ? capeTexture(item.id) : null;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "relative flex flex-col items-center gap-2 p-3 border text-left transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
        on ? "border-accent bg-accent/15 shadow-glow" : "border-white/10 bg-white/[0.04] hover:border-accent/50 hover:-translate-y-0.5",
      )}
    >
      {item.fresh && <span className="label-mc absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded bg-accent text-white">Neu</span>}
      {on && <Icon icon="solar:check-circle-bold" width={18} height={18} className="absolute top-2 right-2 text-accent" />}
      <div className="h-24 w-full flex items-center justify-center rounded-lg" style={{ background: `radial-gradient(circle at 50% 40%, ${item.color}40, transparent 70%)` }}>
        {tex ? (
          // A cape PNG is 64x32; its front panel is the 10x16 block at (1,1).
          <div
            style={{
              width: 50,
              height: 80,
              backgroundImage: `url(${tex})`,
              backgroundSize: "320px 160px",
              backgroundPosition: "-5px -5px",
              imageRendering: "pixelated",
            }}
          />
        ) : (
          <Icon icon={icon} width={44} height={44} style={{ color: item.color, filter: `drop-shadow(0 0 10px ${item.color}90)` }} />
        )}
      </div>
      <div className="w-full">
        <div className="text-sm text-white truncate">{item.name}</div>
        <div className="text-[11px]" style={{ color: rarity.color }}>
          {rarity.label}
        </div>
      </div>
    </button>
  );
}
