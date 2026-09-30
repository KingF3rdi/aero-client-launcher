import { useEffect, useRef } from "react";
import { IdleAnimation, SkinViewer, WaveAnimation } from "skinview3d";

interface SkinStageProps {
  uuid: string;
  skinUrl: string | null;
  animate: boolean;
  /** 64x32 cape texture to wear, or null/undefined for none. */
  capeUrl?: string | null;
  /** Show the model from behind (cape view). */
  back?: boolean;
}

/** Large rotatable 3D model of the account's skin, waving when Skin Animation is on. */
export function SkinStage({ uuid, skinUrl, animate, capeUrl, back }: SkinStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;
    const viewer = new SkinViewer({
      canvas,
      width: box.clientWidth,
      height: box.clientHeight,
      skin: skinUrl ?? `https://mc-heads.net/skin/${uuid}`,
    });
    viewer.controls.enableZoom = false;
    viewer.fov = 40;
    viewer.zoom = 0.8;
    viewer.animation = animate ? new WaveAnimation() : new IdleAnimation();
    viewerRef.current = viewer;
    const resize = new ResizeObserver(() => viewer.setSize(box.clientWidth, box.clientHeight));
    resize.observe(box);
    return () => {
      viewerRef.current = null;
      resize.disconnect();
      viewer.dispose();
    };
  }, [uuid, skinUrl, animate]);

  // Runs after the effect above, so it also dresses a freshly created viewer.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.playerObject.rotation.y = back ? Math.PI + 0.45 : 0.45;
    if (capeUrl) {
      Promise.resolve(viewer.loadCape(capeUrl)).catch(() => viewerRef.current?.resetCape());
    } else {
      viewer.resetCape();
    }
  }, [capeUrl, back, uuid, skinUrl, animate]);

  return (
    <div ref={boxRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="cursor-grab active:cursor-grabbing" />
    </div>
  );
}
