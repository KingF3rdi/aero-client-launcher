/**
 * The Aero Client cosmetics the launcher can equip. Mirrors the mod's catalog
 * (liteclient: dev/aero/client/cosmetic/Cosmetics.java) - add new ids there first, then here.
 * Kill effects and mace skins are still locked in the mod, rank capes are given by rank.
 */
export type CosmeticKind = "cape" | "wings" | "trail" | "head" | "pet";
export type Rarity = "common" | "uncommon" | "rare" | "legendary";

export interface Cosmetic {
  id: string;
  name: string;
  color: string;
  rarity: Rarity;
  /** Added in the newest wave. */
  fresh?: boolean;
}

export const RARITY: Record<Rarity, { label: string; color: string }> = {
  common: { label: "Common", color: "#8a94a6" },
  uncommon: { label: "Uncommon", color: "#22c55e" },
  rare: { label: "Rare", color: "#3b82f6" },
  legendary: { label: "Legendary", color: "#f59e0b" },
};

const c = (id: string, name: string, color: string, rarity: Rarity, fresh = false): Cosmetic => ({ id, name, color, rarity, fresh });

export const COSMETICS: Record<CosmeticKind, Cosmetic[]> = {
  cape: [
    c("frost", "Frost", "#9fd8f5", "common"),
    c("ember", "Ember", "#e8633a", "common"),
    c("tide", "Tide", "#2e7fd1", "common"),
    c("checker", "Checker", "#2b2f3a", "common"),
    c("verdant", "Verdant", "#3fa66b", "uncommon"),
    c("nightfall", "Nightfall", "#2a2f5e", "uncommon"),
    c("sunset", "Sunset", "#f08a4b", "uncommon"),
    c("katana", "Katana", "#1f2937", "uncommon"),
    c("circuit", "Circuit", "#14b8a6", "rare"),
    c("aero", "Aero", "#3b82f6", "rare"),
    c("kitsune", "Kitsune", "#f97316", "rare"),
    c("dragon", "Dragon", "#b91c1c", "rare"),
    c("galaxy", "Galaxy", "#6d28d9", "legendary"),
    c("samurai", "Samurai", "#dc2626", "legendary"),
    c("blossom", "Blossom", "#f9a8d4", "legendary"),
  ],
  wings: [
    c("feather", "Feather", "#e8e0d0", "common"),
    c("bat", "Bat", "#3a2e40", "common", true),
    c("angel", "Angel", "#f6f2fc", "uncommon"),
    c("fairy", "Fairy", "#ff9bd0", "uncommon"),
    c("butterfly", "Butterfly", "#4fa8ff", "uncommon", true),
    c("aurora", "Aurora", "#4fc8d8", "rare"),
    c("aegis", "Aegis", "#b8bcc8", "rare"),
    c("phantom", "Phantom", "#5a6a9a", "rare", true),
    c("mech", "Mech", "#4fe8ff", "rare", true),
    c("crystal", "Crystal", "#9fd8f5", "rare", true),
    c("neon", "Neon", "#b060ff", "rare", true),
    c("dragon", "Dragon", "#b03828", "legendary", true),
    c("phoenix", "Phoenix", "#ff7a2a", "legendary", true),
    c("seraph", "Seraph", "#f8f6ff", "legendary", true),
  ],
  trail: [
    c("spark", "Spark", "#4f8eff", "common"),
    c("heart", "Heart", "#ff7baa", "common"),
    c("snow", "Snow", "#e8f0f8", "common"),
    c("steps", "Footsteps", "#8ce0ff", "common", true),
    c("gold", "Gold", "#ffc94d", "uncommon"),
    c("magma", "Magma", "#ff6a2a", "uncommon"),
    c("sakura", "Sakura", "#f9a8d4", "uncommon", true),
    c("void", "Void", "#9b5bff", "rare"),
    c("plasma", "Plasma", "#d060ff", "rare"),
    c("spirit", "Spirit", "#b8e8f0", "rare"),
    c("helix", "Helix", "#4f8eff", "rare", true),
    c("stars", "Stars", "#ffe08a", "rare", true),
    c("rainbow", "Rainbow", "#ff6b9b", "legendary", true),
    c("aura", "Aura", "#7fe8ff", "rare", true),
    c("rings", "Jump rings", "#4f8eff", "uncommon", true),
  ],
  head: [
    c("halo", "Halo", "#ffd86b", "common"),
    c("horns", "Horns", "#b04050", "common"),
    c("crown", "Crown", "#ffc94d", "common"),
    c("cat", "Cat ears", "#d8a070", "common"),
    c("kasa", "Rice hat", "#e6dcc2", "rare", true),
    c("tophat", "Top hat", "#24242c", "uncommon", true),
    c("wizard", "Wizard hat", "#5b4bc8", "rare", true),
    c("cowboy", "Cowboy hat", "#9a6a3c", "uncommon", true),
    c("santa", "Santa hat", "#d8323c", "uncommon", true),
    c("party", "Party hat", "#ff6b9b", "common", true),
    c("beanie", "Beanie", "#3e7bd6", "common", true),
    c("cap", "Cap", "#e0453a", "common", true),
    c("headphones", "Headphones", "#4f8eff", "rare", true),
    c("flower", "Flower crown", "#ff9bc8", "uncommon", true),
    c("bunny", "Bunny ears", "#f6f3fb", "common", true),
    c("shades", "Shades", "#16181e", "common", true),
  ],
  pet: [
    c("axolotl", "Axolotl", "#f4a0b8", "common"),
    c("bee", "Bee", "#ffd040", "common"),
    c("fox", "Fox", "#e8802a", "common"),
  ],
};

const CAPE_IMAGES = import.meta.glob("../assets/capes/*.png", { eager: true, import: "default" }) as Record<string, string>;

/** Texture URL (64x32) for an equipped cape id: built-in, community ("custom_17"), or null for none. */
export function capeTexture(id: string): string | null {
  if (!id || id === "none") return null;
  if (id.startsWith("custom_")) return `https://aero.gamekni9ht.workers.dev/api/capes/${id.slice(7)}.png`;
  return CAPE_IMAGES[`../assets/capes/${id}.png`] ?? null;
}
