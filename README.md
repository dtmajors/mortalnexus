# Mortal Nexus

## Free. Open source. Built for Mortal Online 2.

[**Download for Windows**](https://github.com/dtmajors/mortalnexus/releases/latest) | [**Donate to development**](https://www.paypal.com/donate/?hosted_button_id=677CRL426BE9Q) | [**Join Discord**](https://discord.gg/MmV7gNV5ZG)

**Mortal Nexus is now free for everyone. No license keys, accounts, or subscriptions.**

> If Mortal Nexus saves you time, please consider a donation. This is an independent project by Marshal Law, and player support helps make continued work on the maps, tools, and updates possible. Every contribution is appreciated. Donations are optional and never unlock features.

![Mortal Nexus maps and tools](docs/images/app-shell.png)

## Download

Open **[Latest Release](https://github.com/dtmajors/mortalnexus/releases/latest)** and download **MortalNexusSetup.exe** from **Assets**. Run the installer, then open Mortal Nexus. Version **1.18.0** is the free community release.

**Existing customers:** thank you for supporting the project. Your previous key is no longer required in the community release.

Windows x64 is required. The .NET runtime is included. Microsoft Edge WebView2 Runtime is also required; it is already present on many Windows PCs. If the app reports it missing, install it from [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/#download-section).

## Inside the App

| Maps and Reference | Tools and Planning |
| --- | --- |
| Myrland and Sarducaa maps with bundled marker data | Crafting and material tools |
| Creatures, spells, loot, dungeons, fishing, and guides | Character planning |
| Local saved settings and map data | Macros, hotkeys, and second-screen controls |

![Crafting tools](docs/images/app-crafting.png)

![Loot reference](docs/images/app-loot.png)

![Character planning](docs/images/app-character.png)

## Support Mortal Nexus

**[Donate through PayPal](https://www.paypal.com/donate/?hosted_button_id=677CRL426BE9Q)**

Keeping the project useful takes ongoing work: maintaining maps, correcting data, improving tools, and testing updates. If you use Mortal Nexus regularly, please help support that work. Sharing the project, reporting bugs, and contributing improvements also help.

No purchase is required. Nobody needs to buy a key or open a purchase ticket.

## Build From Source

The desktop application source is in **[desktop/](desktop/)**, including its local interface, datasets, native tools, and tests. Large map and image assets are distributed separately as **MortalNexusAssets.zip** on the matching GitHub release to keep this repository manageable.

On Windows, install the [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) and WebView2 Runtime. From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\desktop\tools\Download-Assets.ps1
dotnet run --project .\desktop\MortalNexusDesktop.csproj
```

To create the self-contained Windows installer, install [Inno Setup 6](https://jrsoftware.org/isdl.php) and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\desktop\build-release.ps1
```

Focused local-server checks:

```powershell
dotnet run --project .\desktop\tools\ReleaseSmoke\ReleaseSmoke.csproj -- .\desktop\wwwroot
```

## What Is Local?

The application starts without Railway, KeyAuth, a website account, or Discord sign-in. Maps and reference assets are bundled locally. Some crafting and live character calculations still use independent third-party internet services.

Hosted accounts, market listings, messages, submissions, and shared online builds are retired. This release does not replace those services with a hidden backend.

The original hosted storefront source remains in the repository for history. It is not required to build or run the desktop app. The **[Netlify redirect files](netlify-redirect/)** forward the website to this GitHub page without a build or backend.

## Contribute

Report bugs or suggest improvements in [GitHub Issues](https://github.com/dtmajors/mortalnexus/issues) or [Discord](https://discord.gg/MmV7gNV5ZG). Pull requests are welcome. Never include customer records, license inventories, private credentials, or personal settings in a contribution.

Original Mortal Nexus application code is released under the **MIT License**. Third-party libraries, game artwork, maps, and community datasets retain their own rights and notices; see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). The MIT license does not grant ownership or new reuse rights over those assets.

Mortal Nexus is an independent community companion and is not affiliated with Star Vault.
