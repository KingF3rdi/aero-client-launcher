import { useEffect, useRef } from "react";
import { IdleAnimation, SkinViewer, WaveAnimation } from "skinview3d";

/** Large rotatable 3D model of the account's skin, waving when Skin Animation is on. */
export function SkinStage({ uuid, skinUrl, animate }: { uuid: string; skinUrl: string | null; animate: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

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
    viewer.playerObject.rotation.y = 0.45;
    viewer.animation = animate ? new WaveAnimation() : new IdleAnimation();
    const resize = new ResizeObserver(() => viewer.setSize(box.clientWidth, box.clientHeight));
    resize.observe(box);
    return () => {
      resize.disconnect();
      viewer.dispose();
    };
  }, [uuid, skinUrl, animate]);

  return (
    <div ref={boxRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="cursor-grab active:cursor-grabbing" />
    </div>
  );
}
