# MoonWeb

**A simple, privacy-focused web browser for Windows.**

MoonWeb is designed to give you a clean browsing experience with privacy controls built in, without making you configure a dozen settings first.

## Install MoonWeb

1. Download the **MoonWeb Windows installer** (`MoonWeb-Setup-*.exe`).
2. Double-click the installer.
3. Follow the Windows installation wizard.
4. Launch **MoonWeb** from your Desktop or Start Menu.

You do **not** need Linux, Node.js, or Microsoft Edge to use the installed browser. MoonWeb includes its own Chromium runtime.

## Features

- **Clean, minimal interface** — browsing first, settings when you need them.
- **Choose your search provider** — select MoonWeb or another supported provider.
- **Privacy information** — MoonWeb shows privacy notes for supported search providers so you can make an informed choice.
- **Ad and tracker protection** — blocks known advertising and tracking hosts.
- **Privacy protections** — reduces common referrer and browser-identification data and limits unnecessary website permissions.
- **Chromium-based browsing** — modern website compatibility without depending on Microsoft Edge.
- **Extension support** — MoonWeb can load supported unpacked Chromium extensions.

## Search providers

MoonWeb is built to let you choose how you search. Providers can have different privacy practices, so MoonWeb displays privacy information rather than pretending every provider offers the same level of privacy.

## Privacy

MoonWeb includes privacy protections, but no browser can guarantee complete anonymity or prevent every form of tracking.

For example, websites can still collect information you voluntarily provide, and the privacy practices of the search provider you choose still apply to searches made through that provider.

MoonWeb also does **not** claim that every piece of upstream Chromium code or every third-party service has been removed. It is an Electron/Chromium browser shell with additional privacy protections.

## VPN

A VPN requires a real VPN service and network backend. MoonWeb should only show a VPN as connected when an actual VPN connection has been established; it does not pretend that a VPN is active when it isn't.

## Extensions

MoonWeb supports loading compatible Chromium extensions from a local folder. Opening the Chrome Web Store does not automatically guarantee that every Chrome extension can be installed directly, because Electron does not provide the same extension-installation system as Google Chrome.

## Uninstall

On Windows:

**Settings → Apps → Installed apps → MoonWeb → Uninstall**

You can also use the MoonWeb uninstall entry from the Windows Start Menu if available.

## Project

MoonWeb is a Windows desktop browser project built with Electron and Chromium.
