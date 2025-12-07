Variable Mode Injector - User Guide (Genius V3.0)

This Figma plugin allows you to inject a new mode into an existing Variable Collection using a JSON dataset. It is optimized for the Figma Pro Plan (limit of 4 modes) and includes advanced logic for linking Semantic Tokens to Base Tokens.

1. Installation & Setup

Open Terminal in your project folder:

cd variable-mode-injector


Install Dependencies:

npm install


Build the Plugin:

npm run build


Check: A dist folder should appear containing code.js.

2. Importing into Figma

Open Figma.

Right-click canvas > Plugins > Development > Import plugin from manifest...

Select the manifest.json file from your project folder.

3. Workflow: Preparing Your Data

Design tokens often come in complex, nested formats. You must convert them into a "Flat JSON" format first.

Using the Converter Tool

Open converter.html in your browser.

Paste your complex JSON (e.g., semantic-2-variables.json).

Click "Step 1: Analyze Structure".

Select the Mode you want to extract (e.g., "Dark Mode").

Click "Step 2: Convert".

Copy the resulting Flat JSON.

4. Workflow: Running the Plugin

Run the Plugin: Right-click > Plugins > Development > Variable Mode Injector.

Select Collection: Choose the collection (e.g., "Semantic Palette").

Mode Name: Enter the name (e.g., "Dark Mode").

Paste JSON: Paste the flat JSON from the converter.

Click "Create Mode".

5. Smart Features (Genius V3.0)

The plugin intelligently detects the type of data you are pasting:

Input Format

Detected Type

Action in Figma

Hex Code



"#0055FF"

Color

Sets the raw hex color value.

Number



8, 16.5

Float

Sets the number value.

Alias/Reference



"{Gray.90}"

Variable Link

Searches your file for a variable named "Gray/90" or "Gray.90".



Links the current variable to that target.



Result: True semantic linking.

6. Troubleshooting

Error: "Manifest error... containsWidget"

Fix: Ensure manifest.json has "editorType": ["figma"].

Aliases appearing as Text?

Check: Ensure the target variable (e.g., "Gray/90") actually exists in the file before you run the plugin for the Semantic collection. The plugin cannot link to a variable that doesn't exist yet.