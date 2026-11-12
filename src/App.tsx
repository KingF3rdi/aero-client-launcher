import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginScreen } from "./components/account/LoginScreen";
import { PlayView } from "./components/play/PlayView";
import { AddInstanceModal } from "./components/play/AddInstanceModal";
import { useAuthStore } from "./store/useAuthStore";
import { useInstanceStore } from "./store/useInstanceStore";

// Everything but the home loads on first open: the 3D viewers (three.js) and big pages stay out of the start-up bundle.
const InstancesView = lazy(() => import("./components/play/InstancesView").then((m) => ({ default: m.InstancesView })));
const SettingsView = lazy(() => import("./components/settings/SettingsView").then((m) => ({ default: m.SettingsView })));
const SkinsView = lazy(() => import("./components/settings/SkinsView").then((m) => ({ default: m.SkinsView })));
const DiscoverView = lazy(() => import("./components/discover/DiscoverView").then((m) => ({ default: m.DiscoverView })));
const CosmeticsView = lazy(() => import("./components/cosmetics/CosmeticsView").then((m) => ({ default: m.CosmeticsView })));
const ScreenshotsView = lazy(() => import("./components/screenshots/ScreenshotsView").then((m) => ({ default: m.ScreenshotsView })));
const PresetsView = lazy(() => import("./components/presets/PresetsView").then((m) => ({ default: m.PresetsView })));
const NewsPanel = lazy(() => import("./components/play/NewsPanel").then((m) => ({ default: m.NewsPanel })));

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
  const open = (id: string) => navigate(`/${id}`);

  return (
    <>
      <Toaster position="bottom-right" toastOptions={{ style: { background: "#12121c", color: "#eceaf2" } }} />
      <AppLayout activeTab={activeTab} onNavChange={open}>
        <Suspense fallback={<div className="p-8 text-sm text-white/50">Wird geladen…</div>}>
          <Routes>
            <Route path="/play" element={<PlayView onOpen={open} onAddInstance={() => setAddingInstance(true)} />} />
            <Route path="/instances" element={<InstancesView />} />
            <Route path="/skins" element={<SkinsView />} />
            <Route path="/discover" element={<DiscoverView />} />
            <Route path="/cosmetics" element={<CosmeticsView />} />
            <Route path="/screenshots" element={<ScreenshotsView />} />
            <Route path="/presets" element={<PresetsView />} />
            <Route path="/news" element={<NewsPanel />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="*" element={<Navigate to="/play" replace />} />
          </Routes>
        </Suspense>
      </AppLayout>
      {addingInstance && <AddInstanceModal onClose={() => setAddingInstance(false)} />}
    </>
  );
}
