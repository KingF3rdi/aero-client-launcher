import { useEffect, useRef } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useAuthStore } from "../../store/useAuthStore";

interface AddAccountModalProps {
  onClose: () => void;
}

/** Same browser sign-in as the main LoginScreen, in a modal - lets you add a
 * second/third Microsoft account without leaving whatever tab you're on. */
export function AddAccountModal({ onClose }: AddAccountModalProps) {
  const { loggingIn, loginError, login } = useAuthStore();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    login().then(() => {
      if (!useAuthStore.getState().loginError) onClose();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal title="Account hinzufügen" subtitle="Mit Microsoft anmelden" onClose={onClose} width={380}>
      <div className="p-6 flex flex-col items-center gap-4 text-center">
        {loggingIn && <p className="text-sm text-white/50">Browser öffnet sich - schließe die Anmeldung dort ab…</p>}

        {loginError && (
          <>
            <p className="text-sm text-danger">{loginError}</p>
            <Button variant="ghost" onClick={() => login()}>
              Erneut versuchen
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
