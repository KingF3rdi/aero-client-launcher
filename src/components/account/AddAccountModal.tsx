import { useEffect, useRef } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "@tauri-apps/api/core";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useAuthStore } from "../../store/useAuthStore";

interface AddAccountModalProps {
  onClose: () => void;
}

/** Same device-code flow as the main LoginScreen, in a modal - lets you add a
 * second/third Microsoft account without leaving whatever tab you're on. */
export function AddAccountModal({ onClose }: AddAccountModalProps) {
  const { deviceCode, loginError, beginLogin, cancelLogin } = useAuthStore();
  // account/deviceCode can already be non-null from a prior session before this
  // modal's own beginLogin() resolves, so success is only "we saw a code, then
  // it cleared without an error" - not just "there happens to be an account".
  const sawCode = useRef(false);

  useEffect(() => {
    beginLogin();
    return () => cancelLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (deviceCode) {
      sawCode.current = true;
      return;
    }
    if (sawCode.current && !loginError) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceCode, loginError]);

  return (
    <Modal title="Account hinzufügen" subtitle="Mit Microsoft anmelden" onClose={onClose} width={380}>
      <div className="p-6 flex flex-col items-center gap-4 text-center">
        {!deviceCode && !loginError && <p className="text-sm text-white/50">Code wird angefordert…</p>}

        {deviceCode && (
          <>
            <p className="text-sm text-white/50">Code auf microsoft.com/link eingeben:</p>
            <div className="text-3xl font-bold tracking-[0.3em] text-accent">{deviceCode.userCode}</div>
            <Button
              variant="ghost"
              onClick={() =>
                isTauri() ? openUrl(deviceCode.verificationUri) : window.open(deviceCode.verificationUri, "_blank")
              }
            >
              Browser öffnen
            </Button>
            <p className="text-xs text-white/40">Wird automatisch erkannt, sobald du dich angemeldet hast…</p>
          </>
        )}

        {loginError && (
          <>
            <p className="text-sm text-danger">{loginError}</p>
            <Button variant="ghost" onClick={() => beginLogin()}>
              Erneut versuchen
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
