//! Marks mods in the Mods tab that will not work: built for another Minecraft version (from the jar's
//! fabric.mod.json "depends.minecraft"), or doing the same job as an Aero module (the list matches the
//! mod's own ModConflicts, which asks to disable them on start).

use std::cmp::Ordering;
use std::io::Read;
use std::path::Path;

use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct Issue {
    /// "version" (will not load) or "aero" (clashes with an Aero module)
    pub kind: &'static str,
    pub text: String,
}

/// Same ids as dev.aero.client.ModConflicts, normalized (lowercase, no "-" / "_").
const AERO_OVERLAPS: &[(&str, &[&str])] = &[
    ("TierTagger", &["tiertagger", "mctiers", "pvptiers", "tiers"]),
    ("Optimizer", &["marlowcrystal", "marlowscrystaloptimizer", "crystaloptimizer", "anchoroptimizer", "clientsideanchors",
        "herosanchoroptimizer", "heroselytraoptimizer", "maceoptimizer", "pearloptimizer", "totemoptimizer", "shieldoptimizer",
        "crossbowoptimizer"]),
    ("Motion Blur", &["motionblur"]),
    ("Zoom", &["zoomify", "okzoomer", "logicalzoom", "wizoom", "zoom", "simplezoom", "zume"]),
    ("Freelook", &["freelook", "perspective", "perspectivemod", "perspectivemodredux", "pmr", "freecam3p"]),
    ("Toggle Sprint", &["togglesprint", "togglesneak", "sprinttoggle", "autosprint", "bettersprinting"]),
    ("Fullbright", &["fullbright", "gammautils", "brightnessutils", "fullbrightness"]),
    ("Keystrokes", &["keystrokes", "keystrokesmod", "keystrokeshud"]),
    ("CPS", &["cps", "cpsmod", "cpsdisplay", "cpscounter"]),
    ("FPS", &["fpsdisplay", "fpshud", "fpscounter"]),
    ("Coordinates", &["coordinates", "coordinateshud", "coordsdisplay", "coordshud"]),
    ("Armor HUD", &["armorhud", "armorhudmod", "durabilityviewer", "itemdurability", "durabilitytooltip"]),
    ("Potion HUD", &["potionhud", "effecttimerplus", "statuseffectbars", "statuseffecttimer", "potiontimer"]),
    ("Ping", &["betterpingdisplay", "pingdisplay", "numericping"]),
    ("Nametags", &["nametagtweaks", "betternametags"]),
    ("Totem Counter", &["totemcounter", "totempopcounter", "totemcount"]),
    ("Shield Tweaks", &["shieldstatus", "shieldfixes", "shieldindicator"]),
    ("Time Changer", &["timechanger", "clienttime"]),
    ("Weather Changer", &["weatherchanger", "clientweather"]),
    ("Saturation Overlay", &["appleskin"]),
    ("Damage Tint", &["conttshitcolorx", "hitcolor", "hitcolorx", "damagetint"]),
    ("Death Animation", &["nodeathanimation"]),
    ("No Hurtcam", &["nohurtcam", "nohurtcamera"]),
    ("Shulker Tooltips", &["shulkerboxtooltip", "shulkertooltip"]),
    ("Hitboxes", &["hitboxes", "betterhitboxes"]),
    ("Crosshair", &["customcrosshair", "crosshairtweaks"]),
    ("Unfocused CPU", &["dynamicfps"]),
    ("Discord RPC", &["discordrpc", "simplerpc", "customdiscordrpc"]),
    ("Pop Chams", &["walksypopchams", "popchams"]),
    ("Transparent Players", &["transparentplayers"]),
    ("Sky Changer", &["skychanger", "customsky"]),
];

/// The problem with one mod jar, if any. `aero` = the Aero Client mod is on in this instance.
pub fn check(jar: &Path, mc_version: &str, aero: bool) -> Option<Issue> {
    let meta = fabric_meta(jar)?;
    if let Some(spec) = meta.get("depends").and_then(|d| d.get("minecraft")) {
        let specs: Vec<&str> = match spec {
            serde_json::Value::String(s) => vec![s.as_str()],
            serde_json::Value::Array(a) => a.iter().filter_map(|v| v.as_str()).collect(),
            _ => vec![],
        };
        if !specs.is_empty() && !specs.iter().any(|s| matches(s, mc_version)) {
            return Some(Issue { kind: "version", text: format!("Für Minecraft {}", specs.join(" / ")) });
        }
    }
    if aero {
        let id = meta.get("id")?.as_str()?.to_lowercase().replace(['-', '_'], "");
        if id != "aero" {
            if let Some((module, _)) = AERO_OVERLAPS.iter().find(|(_, ids)| ids.contains(&id.as_str())) {
                return Some(Issue { kind: "aero", text: format!("Doppelt mit Aero ({module})") });
            }
        }
    }
    None
}

fn fabric_meta(jar: &Path) -> Option<serde_json::Value> {
    let mut zip = zip::ZipArchive::new(std::fs::File::open(jar).ok()?).ok()?;
    let mut text = String::new();
    zip.by_name("fabric.mod.json").ok()?.read_to_string(&mut text).ok()?;
    // some mods ship raw newlines inside strings, which serde rejects; they don't matter here
    serde_json::from_str(&text).or_else(|_| serde_json::from_str(&text.replace(['\n', '\r', '\t'], " "))).ok()
}

/// Fabric-style version predicate: "||" alternatives of space-separated terms (>=, <=, >, <, =, ~, ^, x / *
/// wildcards). Anything unparseable (snapshots, odd ranges) counts as a match, so we never warn wrongly.
fn matches(spec: &str, version: &str) -> bool {
    let Some(v) = parse(version) else { return true };
    spec.split("||").any(|alt| alt.split_whitespace().all(|term| term_matches(term, &v)))
}

fn term_matches(term: &str, v: &[u32]) -> bool {
    let (op, rest) = ["<=", ">=", "<", ">", "=", "~", "^"]
        .iter()
        .find_map(|op| term.strip_prefix(op).map(|r| (*op, r)))
        .unwrap_or(("", term));
    let rest = rest.split(['-', '+']).next().unwrap_or("");
    if rest.is_empty() || rest == "*" {
        return true;
    }
    let parts: Vec<&str> = rest.split('.').collect();
    if let Some(wild) = parts.iter().position(|p| *p == "x" || *p == "X" || *p == "*") {
        return parts[..wild].iter().enumerate().all(|(i, p)| p.parse::<u32>().ok() == Some(*v.get(i).unwrap_or(&0)));
    }
    let Some(b) = parse(rest) else { return true };
    let c = cmp(v, &b);
    match op {
        ">=" => c != Ordering::Less,
        "<=" => c != Ordering::Greater,
        ">" => c == Ordering::Greater,
        "<" => c == Ordering::Less,
        "~" => {
            // ~1.21.4 = >=1.21.4 <1.22, ~1.21 = >=1.21 <1.22
            let mut upper = b[..b.len().max(2) - 1].to_vec();
            if upper.len() < 2 {
                upper = b.clone();
            }
            *upper.last_mut().unwrap() += 1;
            c != Ordering::Less && cmp(v, &upper) == Ordering::Less
        }
        "^" => c != Ordering::Less && v.first() == b.first(),
        _ => c == Ordering::Equal,
    }
}

fn parse(v: &str) -> Option<Vec<u32>> {
    v.split(['-', '+']).next()?.split('.').map(|p| p.parse().ok()).collect()
}

fn cmp(a: &[u32], b: &[u32]) -> Ordering {
    for i in 0..a.len().max(b.len()) {
        let o = a.get(i).unwrap_or(&0).cmp(b.get(i).unwrap_or(&0));
        if o != Ordering::Equal {
            return o;
        }
    }
    Ordering::Equal
}

#[cfg(test)]
mod tests {
    use super::matches;

    #[test]
    fn version_ranges() {
        assert!(matches("1.21.11", "1.21.11"));
        assert!(!matches("1.21.10", "1.21.11"));
        assert!(matches(">=1.21.9 <1.22", "1.21.11"));
        assert!(!matches(">=1.21.9 <1.21.11", "1.21.11"));
        assert!(matches("~1.21", "1.21.11"));
        assert!(!matches("~1.21.4", "1.22"));
        assert!(matches("1.21.x", "1.21.11"));
        assert!(!matches("1.20.x", "1.21.11"));
        assert!(matches(">=1.21.11-", "1.21.11"));
        assert!(matches("1.20.1 || 1.21.11", "1.21.11"));
        assert!(matches("*", "1.21.11"));
        assert!(matches("23w13a", "1.21.11")); // unparseable: no warning
    }
}
