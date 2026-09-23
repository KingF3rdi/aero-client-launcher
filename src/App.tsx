import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginScreen } from "./components/account/LoginScreen";
import { PlayView } from "./components/play/PlayView";
import { InstancesView } from "./components/play/InstancesView";
import { AddInstanceModal } from "./components/play/AddInstanceModal";
import { SettingsView } from "./components/settings/SettingsView";
import { SkinsView } from "./components/settings/SkinsView";
import { DiscoverView } from "./components/discover/DiscoverView";
import { CapesView } from "./components/capes/CapesView";
import { useAuthStore } from "./store/useAuthStore";
import { useInstanceStore } from "./store/useInstanceStore";

export function App() {
  const { account, loading, init } = useAuthStore();
  const { initLaunchListener } = useInstanceStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [addingInstance, setAddingInstance] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    initLaunchListener();
  }, [initLaunchListener]);

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-bg text-muted">Wird geladen…</div>;
  }

  if (!account) {
    return <LoginScreen />;
  }

  const activeTab = location.pathname.substring(1) || "play";

  return (
    <>
      <Toaster position="bottom-right" toastOptions={{ style: { background: "#12121c", color: "#eceaf2" } }} />
      <AppLayout activeTab={activeTab} onNavChange={(id) => navigate(`/${id}`)} onAddInstance={() => setAddingInstance(true)}>
        <Routes>
          <Route path="/play" element={<PlayView />} />
          <Route path="/instances" element={<InstancesView />} />
          <Route path="/skins" element={<SkinsView />} />
          <Route path="/discover" element={<DiscoverView />} />
          <Route path="/capes" element={<CapesView />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="*" element={<Navigate to="/play" replace />} />
        </Routes>
      </AppLayout>
      {addingInstance && <AddInstanceModal onClose={() => setAddingInstance(false)} />}
    </>
  );
}
