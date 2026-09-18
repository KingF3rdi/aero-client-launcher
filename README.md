# Aero Client Launcher

An open-source Minecraft: Java Edition launcher built with Tauri (Rust) and React.
It manages Fabric instances, installs mods from Modrinth (Sodium is set up automatically),
and ships with the optional Aero Client Fabric mod.

## Features

- Microsoft sign-in in a dedicated app window
- Instance management (Fabric), mod/resource discovery via Modrinth
- Performance-oriented default video settings for new instances
- Skin management

## Authentication and privacy

Sign-in uses Microsoft's official login page (OAuth 2.0 authorization code flow with PKCE,
redirect `http://localhost`, scopes `XboxLive.signin offline_access`), followed by Xbox Live,
XSTS and the Minecraft services API. The launcher never sees or stores your password.
Tokens are kept only on your own machine and are not sent to any server operated by this project.
There is no client secret. The whole flow is in [`src-tauri/src/auth.rs`](src-tauri/src/auth.rs),
so it can be audited.

You need a legitimate copy of Minecraft: Java Edition.

## Build

Requirements: Node.js, Rust, and the [Tauri prerequisites](https://tauri.app/start/prerequisites/).

```bash
npm install
npm run tauri build
```

## License

MIT, see [LICENSE](LICENSE). Not an official Minecraft product and not affiliated with Mojang or Microsoft.
The bundled Monocraft font has its own license in `src/assets/fonts/`.
