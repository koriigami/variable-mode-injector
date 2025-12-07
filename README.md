# Variable Mode Injector

> A Figma plugin that lets you test and migrate design tokens without breaking a single link.

## The Problem

You've updated your design system's tokens. New colors, refined spacing, better semantics. They're perfect.

But here's the catch: if you import them as a new Variable Collection, Figma treats them like strangers. Every button, input field, and background layer in your design files will still reference the old collection.

**The result?** Thousands of manual re-links. One. By. One.

## The Solution

This plugin uses a "Trojan Horse" approach: instead of creating a new collection, it injects your new values as a **testing mode** inside your existing collection.

### How It Works

1. **Inject** your new token values as a mode (e.g., "Dark Mode V2")
2. **Toggle** between modes to instantly preview changes
3. **Keep or Delete** the mode based on results

**Zero broken links. Zero manual labor.**

The IDs stay the same. Your layers stay connected. You just switch modes and see the magic happen.

## Features

- **Smart Value Detection**: Automatically handles hex codes, numbers, booleans, strings, and variable aliases
- **Semantic Token Linking**: Converts references like `{Gray.90}` into proper Figma variable links
- **Pro Plan Optimized**: Respects Figma's 4-mode limit with helpful error messages
- **JSON Converter Included**: Transforms complex nested token formats into plugin-ready flat JSON
- **Type-Safe**: Built with TypeScript for reliability

## Installation

### Prerequisites

- Node.js installed
- Figma desktop app

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/variable-mode-injector.git
   cd variable-mode-injector
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the plugin**
   ```bash
   npm run build
   ```

   A `dist` folder will be created containing `code.js`.

4. **Import into Figma**
   - Open Figma
   - Right-click canvas → **Plugins** → **Development** → **Import plugin from manifest...**
   - Select the `manifest.json` file from your project folder

## Usage

### Step 1: Prepare Your Data

Design tokens often come in complex nested formats. Use the included converter tool to flatten them.

1. Open `converter.html` in your browser
2. Paste your complex JSON (e.g., from Tokens Studio)
3. Click **"Step 1: Analyze Structure"**
4. Select the mode you want to extract (e.g., "Dark Mode")
5. Click **"Step 2: Convert"**
6. Copy the resulting flat JSON

**Expected Format:**
```json
{
  "colors/primary": "#0055FF",
  "colors/text": "{Gray.90}",
  "spacing/base": 8,
  "feature/enabled": true
}
```

### Step 2: Run the Plugin

1. Right-click in Figma → **Plugins** → **Development** → **Variable Mode Injector**
2. **Select Collection**: Choose your target collection (e.g., "Semantic Palette")
3. **Mode Name**: Enter a name (e.g., "Dark Mode V2")
4. **Paste JSON**: Paste the flat JSON from the converter
5. Click **"Create Mode"**

### Step 3: Test and Decide

1. Select any frame in your design
2. Toggle between modes in the right sidebar
3. See your new values applied instantly

**If they work?** Delete the old mode.
**If they don't?** Delete the new mode. No harm done.

## How the Plugin Handles Values

The plugin intelligently detects and processes different value types:

| Input Example | Type | Action |
|---------------|------|--------|
| `"#0055FF"` | Color | Sets raw hex color value |
| `8`, `16.5` | Number | Sets numeric value |
| `true`, `false` | Boolean | Sets boolean value |
| `"{Gray.90}"` | Alias | Links to variable "Gray/90" or "Gray.90" |
| `"text"` | String | Sets string value |

**Variable Linking**: When you use an alias like `{Gray.90}`, the plugin searches your file for a variable named "Gray/90" or "Gray.90" and creates a proper Figma variable link. This enables true semantic token relationships.

## Development

### Build Commands

```bash
# Build once
npm run build

# Watch mode (rebuilds on file changes)
npm run watch
```

### Project Structure

```
variable-mode-injector/
├── src/
│   ├── code.ts          # Main plugin logic
│   └── ui.html          # Plugin UI
├── dist/                # Compiled output
├── converter.html       # JSON conversion tool
├── manifest.json        # Figma plugin manifest
├── tsconfig.json        # TypeScript configuration
└── package.json         # Project metadata
```

## Troubleshooting

### Error: "Max modes reached"
**Problem**: Figma Pro limits collections to 4 modes.
**Solution**: Delete an unused mode before creating a new one.

### Aliases appearing as text instead of links
**Problem**: The target variable doesn't exist yet.
**Solution**: Ensure base tokens (e.g., "Gray/90") exist in your file before running the plugin for semantic tokens. Run the plugin for base collections first, then semantic collections.

### Manifest error about "containsWidget"
**Problem**: Manifest configuration issue.
**Solution**: Ensure `manifest.json` has `"editorType": ["figma"]`.

## Use Cases

- **Testing new color palettes** before committing to changes
- **Migrating design tokens** from tools like Tokens Studio, Style Dictionary, or Supernova
- **A/B testing** different design directions with clients
- **Seasonal themes** that need quick toggling (light/dark, brand variations)
- **Updating semantic tokens** without breaking existing designs

## Technical Details

- **Language**: TypeScript
- **Figma API Version**: 1.0.0
- **Node Version**: 18+ recommended
- **Dependencies**: Figma Plugin Typings

## Contributing

Contributions are welcome! This is an open-source project built to solve a real problem in design systems workflows.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this in your projects, commercial or otherwise.

## Author

Created by Ketan to solve the migration nightmare of updating design system tokens.

## Acknowledgments

Built with frustration-driven development after one too many manual re-linking sessions.

---

**Found this useful?** Give it a star ⭐ and share it with other design system maintainers who deserve better tools.
