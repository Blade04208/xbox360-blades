# Xbox 360 Blades

A [Millennium](https://docs.steambrew.app/themes/) theme for Steam Big Picture

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/f3c80742-1882-4a59-b1f3-7d502819aa36" />

## Build

Requires Node.js 22+ and Millennium 3.4.0+

```sh
npm ci
npm run build
```

The build produces:

```text
dist/
├── X360-Blades/             Installable theme folder
└── x360-blades-sounds.star  Compiled plugin
```

### Installation

1. Fully exit Steam.
2. Copy `dist/X360-Blades/` into `<Steam>/steamui/skins/`.
3. Copy `dist/x360-blades-sounds.star` into Millennium's plugin directory: `$XDG_DATA_HOME/millennium/plugins/` (normally `~/.local/share/millennium/plugins/`) on Linux, or `<Steam>/millennium/plugins/` on Windows.
4. Start Steam, enable **Xbox 360 Blades Sounds** in Millennium, and restart Steam so its backend installs the sounds.
5. Select **Xbox 360 Blades**, enable theme JavaScript if prompted, and enter Big Picture.


## Credits

Original theme and sound plugin by **tameranian**
