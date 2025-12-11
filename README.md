# ULC + LVC Stream Deck Plugin

> ⚠️ **WORK IN PROGRESS** - This plugin is currently under development.


![ULC Preview](.github/ulc_preview.gif)
<sup><sub>In this preview the LVC integration was not working properly</sub></sup>

Elgato Stream Deck plugin for controlling [ULC (Ultimate Lighting Controller)](https://github.com/Flohhhhh/ultimate-lighting-controller) and [LVC (Luxart Vehicle Control)](https://github.com/TrevorBarns/luxart-vehicle-control) in FiveM.

## Features

### ULC (Ultimate Lighting Controller)
- **Stage Buttons** - Control lighting stages
- **Real-time Sync** - Buttons show current state and labels from vehicle config
- **Color-coded** - Button colors match your ULC configuration

### LVC (Luxart Vehicle Control)
- **Lights Toggle** - Turn emergency lights on/off (tap) or manual siren (hold)
- **Tone Buttons** - Single-click for main siren, double-click for aux/dual siren
- **Dynamic Labels** - Shows tone names from vehicle siren profile

## Installation

### Option 1: Download Release (Recommended)
1. Download the latest `.streamDeckPlugin` file from [Releases](https://github.com/sratzel/lvc-ulc-streamdeck-plugin/releases)
2. Double-click the file to install
3. The plugin will appear in Stream Deck app

### Option 2: Build from Source
See [Building from Source](#building-from-source) below.

## Setup

### For ULC
1. Install the [ULC Stream Deck integration](https://github.com/sratzel/ultimate-lighting-controller-streamdeck)
2. Add **ULC Button** actions to your Stream Deck
3. Enter a ULC-configured vehicle
4. Buttons auto-configure based on vehicle

### For LVC
1. Install the [LVC Stream Deck plugin files](https://github.com/sratzel/luxart-vehicle-control-streamdeck) to your LVC resource
2. Add **LVC Lights Toggle** and **LVC Tone Button** actions to your Stream Deck
3. Enter an emergency vehicle
4. Buttons show available tones

## Ports

| Resource | Port |
|----------|------|
| ULC | 8765 |
| LVC | 8766 |

Make sure these ports are not blocked by your firewall.

---

## Building from Source

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later
- [Stream Deck SDK](https://developer.elgato.com/documentation/stream-deck/sdk/overview/)

### Build Steps

```bash
# Clone the repository
git clone https://github.com/sratzel/lvc-ulc-streamdeck-plugin.git
cd lvc-ulc-streamdeck-plugin

# Install dependencies
npm install

# Build TypeScript
npm run build

# Create distributable .streamDeckPlugin file
npm run bundle
```

The `.streamDeckPlugin` file will be in the `dist/` folder.

### Development

```bash
# Link plugin for development (requires Stream Deck CLI)
npm run link

# Watch for changes and rebuild
npm run watch

# Or use Stream Deck dev mode
npm run dev
```

---

## Available Actions

| Action | UUID | Description |
|--------|------|-------------|
| ULC Button | `dev.sratzel.ulc-streamdeck-plugin.ulcbutton` | Stage control button |
| LVC Lights Toggle | `dev.sratzel.ulc-streamdeck-plugin.lvcsiren` | Master switch (tap) / MANU (hold) |
| LVC Tone Button | `dev.sratzel.ulc-streamdeck-plugin.lvctone` | Siren tone control |

---

## Troubleshooting

### Plugin not connecting
- Check that the game is running with ULC/LVC
- Verify ports 8765/8766 are not blocked
- Check Stream Deck app logs

### Buttons not updating
- Make sure you're in a configured vehicle
- Open ULC settings (`/ulc`) to check connection status
- Try the "Reconnect" button

### Build errors
- Make sure Node.js v18+ is installed
- Delete `node_modules` and run `npm install` again
- Check TypeScript errors with `npm run build`

### Log Locations
- **Windows**: `%appdata%\Elgato\StreamDeck\logs\`
- **Mac**: `~/Library/Logs/ElgatoStreamDeck/`

---
## Credits

- **ULC** by [Flohhhhh / dwnstr](https://github.com/Flohhhhh/ultimate-lighting-controller)
- **LVC** by [TrevorBarns](https://github.com/TrevorBarns/luxart-vehicle-control)
- **Stream Deck Plugin** by [sratzel](https://github.com/sratzel)

## License

MIT License