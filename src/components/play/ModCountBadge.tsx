import { useEffect, useState } from "react";
import { useInstanceStore } from "../../store/useInstanceStore";

/** Small "N Mods" label fetched from the instance's real content folder, so the
 * install count is visible without opening Settings -> Content. */
export function ModCountBadge({ instanceId }: { instanceId: string }) {
  const fetchContent = useInstanceStore((s) => s.fetchContent);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetchContent(instanceId)
      .then((files) => alive && setCount(files.filter((f) => f.kind === "mod").length))
      .catch(() => alive && setCount(null));
    return () => {
      alive = false;
    };
  }, [instanceId, fetchContent]);

  if (!count) return null;
  return (
    <span className="text-xs text-white/40 shrink-0">
      {count} {count === 1 ? "Mod" : "Mods"}
    </span>
  );
}
