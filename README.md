# Variable Mode Injector

> A Figma plugin that lets you test and migrate design tokens without breaking a single link.

**[Install from Figma Community →](https://www.figma.com/community/plugin/1581328658919282285)** | [GitHub](https://github.com/koriigami/variable-mode-injector)

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

### The "One Motion" Workflow

Traditional approach: Export → Open browser → Paste → Select mode → Convert → Copy → Open Figma → Paste → Create (9 steps, ~2 minutes)

**This plugin**: Export → Drag onto Figma plugin → Create (2 steps, ~10 seconds)

**Time saved: ~90 seconds per mode test**

## Features

- **Drag-and-Drop Interface**: Drop your tokens.json file directly onto the plugin (or click to browse)
- **Format Detection**: Recognizes Tokens Studio, Style Dictionary, flat JSON, nested formats, and collections array
- **Batch Import Collections (NEW!)**: Import entire design systems with 15+ collections in one click
- **OKLCH & RGBA Support (NEW!)**: Perceptually uniform colors and transparency values
- **Cross-Collection Aliases (NEW!)**: Semantic tokens that reference primitives work automatically
- **One-Motion Workflow**: No external tools needed - conversion happens in real-time
- **Live Preview**: See what will be created before you commit
- **Auto-Mode Selection**: Single mode? Fills in automatically. Multiple? Pick from dropdown
- **Value Detection**: Handles hex codes, numbers, booleans, strings, box shadows, and variable aliases
- **Semantic Token Linking**: Converts references like `{Gray.90}` into proper Figma variable links
- **Sticky CTA Button (NEW!)**: Action button stays at the bottom while you scroll
- **Pro Plan Optimized**: Respects Figma's 4-mode limit with clear error messages
- **Clean UI**: Uses shadcn design patterns
- **TypeScript**: Type checking catches bugs before they ship

## Installation

### Option 1: Install from Figma Community (Recommended)

If you just want to use it:

1. Visit the [Figma Community page](https://www.figma.com/community/plugin/1581328658919282285)
2. Click **"Try it out"** or **"Install"**
3. Open any Figma file → Right-click → **Plugins** → **Variable Mode Injector**

No build steps required.

### Option 2: Build from Source (For Developers)

Want to contribute or customize? Build it yourself:

**Prerequisites:**
- Node.js installed
- Figma desktop app

**Steps:**

1. **Clone the repository**
   ```bash
   git clone https://github.com/koriigami/variable-mode-injector.git
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

## What's New in v2.0

**Collections Format**
Drop a single JSON file with 15+ collections and they all get created at once. No more one-at-a-time imports.

**OKLCH Colors**
Those weird `oklch(0.985 0 0)` values from modern color pickers? The plugin now handles them.

**Cross-Collection Aliases**
Semantic tokens that reference `{Primitives - Colors.white}` resolve automatically. The plugin sorts out the dependency order.

**UX Tweaks**
The Create/Import button sticks to the bottom now. Less scrolling.

## Usage

### Quick Start (Drag-and-Drop)

The fastest way to inject tokens - no manual conversion needed!

1. **Open the plugin**
   - Right-click in Figma → **Plugins** → **Development** → **Variable Mode Injector**

2. **Select your collection**
   - Choose the target collection from the dropdown (e.g., "Semantic Palette")

3. **Drop your tokens file**
   - Drag your `tokens.json` file onto the drop zone
   - Or click the drop zone to browse for a file

4. **Plugin processes the file**
   - Detects the format (Tokens Studio, Style Dictionary, etc.)
   - Flattens nested structures if needed
   - Shows a preview of what will be created
   - If there's only one mode, fills in the name for you
   - Multiple modes? Pick one from the dropdown

5. **Create the mode**
   - Review the preview
   - Click **"Create Mode"**
   - Done!

**Supported formats:**
- Tokens Studio exports (with `modes` key)
- Style Dictionary output (with `value` keys)
- Already-flat JSON (simple key-value pairs)
- Nested token structures (auto-flattened)
- **Collections array format (NEW!)** - Batch import multiple collections

### Collections Array Format (New!)

Got an entire design system to import? Use the collections format to batch-create everything at once:

```json
{
  "collections": [
    {
      "name": "Primitives - Colors",
      "description": "Base color values",
      "modes": ["Light", "Dark"],
      "variables": {
        "neutral-50": {
          "type": "color",
          "Light": "oklch(0.985 0 0)",
          "Dark": "oklch(0.21 0.006 285.885)",
          "description": "Lightest neutral"
        }
      }
    },
    {
      "name": "Semantic - Layout",
      "modes": ["Light", "Dark"],
      "variables": {
        "background": {
          "type": "color",
          "Light": "{Primitives - Colors.white}",
          "Dark": "{Primitives - Colors.black}"
        }
      }
    }
  ]
}
```

**How it works:**

The plugin sorts collections by dependency (primitives first, then semantics, then components) so cross-collection aliases like `{Primitives - Colors.white}` work correctly. Each variable needs a `type` field (`color`, `number`, `string`, or `boolean`), and you define values for each mode as properties.

Works great for empty Figma files where you're starting fresh. Just drop the file and watch it create everything.

**Color format support:**
- Hex: `#FF0000` or `#FF0000FF`
- RGBA: `rgba(255, 0, 0, 1)`
- OKLCH: `oklch(0.5 0.1 180)` (perceptually uniform - those weird decimals actually mean something!)

### Alternative: Manual Paste

Prefer keyboard-only workflow? You can still paste JSON manually:

1. Open the plugin
2. Select your collection
3. Enter a mode name
4. Scroll to **"Manual JSON Input"**
5. Paste your flat JSON:
   ```json
   {
     "colors/primary": "#0055FF",
     "colors/text": "{Gray.90}",
     "spacing/base": 8,
     "feature/enabled": true
   }
   ```
6. Click **"Create Mode"**

### Test and Decide

1. Select any frame in your design
2. Toggle between modes in the right sidebar
3. See your new values applied instantly

**If they work?** Delete the old mode.
**If they don't?** Delete the new mode. No harm done.

## How the Plugin Handles Values

The plugin detects value types and handles them accordingly:

| Input Example | Type | Action |
|---------------|------|--------|
| `"#0055FF"` | Color | Sets raw hex color value |
| `8`, `16.5` | Number | Sets numeric value |
| `true`, `false` | Boolean | Sets boolean value |
| `"{Gray.90}"` | Alias | Links to variable "Gray/90" or "Gray.90" |
| `"text"` | String | Sets string value |

**Variable Linking**: When you use an alias like `{Gray.90}`, the plugin searches your file for a variable named "Gray/90" or "Gray.90" and creates a proper Figma variable link. Your semantic tokens link to primitives instead of copying values.

**Cross-Collection Aliases**: The collections format lets you reference variables from other collections using `{CollectionName.variableName}` syntax. The plugin figures out the dependency order so everything links up correctly.

For example, `{Primitives - Colors.white}` creates a link to the "white" variable in your "Primitives - Colors" collection. Semantic tokens can reference primitives, component tokens can reference both - the plugin sorts it all out.

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
│   ├── code.ts          # Main plugin logic (TypeScript)
│   └── ui.html          # Plugin UI with drag-and-drop + converter
├── dist/                # Compiled output (generated by build)
├── converter.html       # Standalone converter (legacy, optional)
├── manifest.json        # Figma plugin manifest
├── tsconfig.json        # TypeScript configuration
└── package.json         # Project metadata
```

**Note**: The `converter.html` file is now optional. All conversion logic has been integrated into the plugin UI (`ui.html`), so you no longer need the external tool.

## Troubleshooting

### Error: "Max modes reached"
**Problem**: Figma Pro limits collections to 4 modes.
**Solution**: Delete an unused mode before creating a new one.

### Aliases appearing as text instead of links
**Problem**: The target variable doesn't exist yet.
**Solution**: Ensure base tokens (e.g., "Gray/90") exist in your file before running the plugin for semantic tokens. Run the plugin for base collections first, then semantic collections.

### Error: "File too large"
**Problem**: The JSON file exceeds 5MB.
**Solution**: Split your token file into smaller collections or remove unnecessary metadata.

### Error: "JSON too deeply nested"
**Problem**: The token structure has more than 50 levels of nesting.
**Solution**: Flatten your token structure or simplify the hierarchy.

### No preview showing after dropping file
**Problem**: File format not recognized or invalid JSON.
**Solution**: Check that your file is valid JSON. The plugin supports Tokens Studio, Style Dictionary, and flat formats. If you have a custom format, use the manual paste option with pre-flattened JSON.

### Manifest error about "containsWidget"
**Problem**: Manifest configuration issue.
**Solution**: Ensure `manifest.json` has `"editorType": ["figma"]`.

### Error: "Circular dependency detected"
**What's happening:** Two collections reference each other (Collection A uses variables from B, B uses variables from A).
**Fix:** Rethink your token hierarchy. It should flow one way: Primitives → Semantic → Components. No loops allowed.

### Aliases showing as text instead of links
**What's happening:** You see `{Collection.variable}` as a string value instead of a proper link.
**Fix:** Make sure the collection you're referencing is in the same import file. Also double-check the spelling - it's case-sensitive.

### OKLCH colors look slightly off
**What's happening:** OKLCH conversion uses a simplified algorithm that can be 1-2% off from the spec.
**Fix:** For color-critical work, stick with hex or RGBA. For most UI work, the difference is imperceptible. You can always tweak after import if something looks weird.

## Use Cases

- Testing new color palettes before committing
- Migrating from Tokens Studio, Style Dictionary, or Supernova
- A/B testing design directions with clients
- Quick theme toggling (light/dark, brand variations)
- Updating semantic tokens without breaking links

## Technical Details

- **Language**: TypeScript
- **Figma API Version**: 1.0.0
- **Node Version**: 18+ recommended
- **Dependencies**: Figma Plugin Typings

## Contributing

Pull requests are welcome. This plugin started as a solution to a real migration problem and keeps getting better with community input.

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
