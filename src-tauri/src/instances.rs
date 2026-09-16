use serde::Serialize;

#[derive(Serialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub struct Instance {
    pub id: &'static str,
    pub name: &'static str,
    pub mc_version: &'static str,
    pub loader: &'static str,
}

/// Same version list as the Python prototype's runtime.py INSTANCES, so
/// switching launchers doesn't change what's offered to players.
pub const INSTANCES: &[Instance] = &[
    Instance { id: "fabric-1.21.11", name: "Fabric 1.21.11", mc_version: "1.21.11", loader: "fabric" },
    Instance { id: "fabric-1.21.8", name: "Fabric 1.21.8", mc_version: "1.21.8", loader: "fabric" },
    Instance { id: "fabric-1.21.4", name: "Fabric 1.21.4", mc_version: "1.21.4", loader: "fabric" },
    Instance { id: "fabric-1.21.1", name: "Fabric 1.21.1", mc_version: "1.21.1", loader: "fabric" },
    Instance { id: "fabric-1.21", name: "Fabric 1.21", mc_version: "1.21", loader: "fabric" },
];

#[tauri::command]
pub fn get_instances() -> Vec<Instance> {
    INSTANCES.to_vec()
}

pub fn find(id: &str) -> Option<Instance> {
    INSTANCES.iter().find(|i| i.id == id).copied()
}
