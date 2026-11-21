# Xbox 360 Blades

A [Millennium](https://docs.steambrew.app/themes/) theme for Steam Big Picture

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
└── x360-blades-sounds.star  Compiled plugin, including all ten WAVs
```

## Install

1. Fully exit Steam.
2. Copy `dist/X360-Blades/` into `<Steam>/steamui/skins/`.
3. Copy `dist/x360-blades-sounds.star` into Millennium's plugin directory: `$XDG_DATA_HOME/millennium/plugins/` (normally `~/.local/share/millennium/plugins/`) on Linux, or `<Steam>/millennium/plugins/` on Windows.
4. Start Steam, enable **Xbox 360 Blades Sounds** in Millennium, and restart Steam so its backend installs the sounds.
5. Select **Xbox 360 Blades**, enable theme JavaScript if prompted, and enter Big Picture.


## Credits

Original theme and sound plugin by **tameranian**
