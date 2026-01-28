/// <reference types="@figma/plugin-typings" />

// GENIUS VERSION 4.0 - Variable Mode Injector
// Supports: Hex Codes, Number Values, Variable Aliases, Collections Format, OKLCH/RGBA Colors

console.clear();
console.log("Plugin Logic Loaded: Genius Version 4.0");

// Global cache for variables to speed up alias lookups
let allVariablesCache: Variable[] = [];

// Type Definitions for Collections Format
interface CollectionDefinition {
  name: string;
  description?: string;
  modes: string[];
  variables: Record<string, VariableDefinition>;
}

interface VariableDefinition {
  type: 'color' | 'number' | 'string' | 'boolean' | 'boxShadow';
  description?: string;
  unit?: string;
  [modeName: string]: any; // Mode-specific values
}

interface ProcessingResult {
  collectionsCreated: number;
  collectionsUpdated: number;
  variablesCreated: number;
  variablesUpdated: number;
  errors: string[];
}

// 1. Initialize
async function loadCollections() {
  const collections = figma.variables.getLocalVariableCollections();
  
  // Cache all variables once for efficient lookup later
  // We need this to resolve "{Gray.90}" -> "VariableID:123"
  const allVarIds = await figma.variables.getLocalVariablesAsync(); // Figma API might return IDs or objects depending on version, safe to fetch objects
  allVariablesCache = allVarIds; 

  const simplifiedCollections = collections.map(c => ({
    id: c.id,
    name: c.name,
    modes: c.modes
  }));
  figma.ui.postMessage({ type: 'load-collections', data: simplifiedCollections });
}

figma.showUI(__html__, { width: 380, height: 600 });
loadCollections();

// 2. Handle Messages
figma.ui.onmessage = async (msg) => {
  // NEW: Handle collections format
  if (msg.type === 'create-collections') {
    const { collections } = msg;

    try {
      const graph = buildDependencyGraph(collections);
      const sortedCollections = topologicalSort(graph);

      const result: ProcessingResult = {
        collectionsCreated: 0,
        collectionsUpdated: 0,
        variablesCreated: 0,
        variablesUpdated: 0,
        errors: []
      };

      // First pass: create collections and variables
      console.log(`Processing ${sortedCollections.length} collections...`);
      for (const collectionDef of sortedCollections) {
        console.log(`Processing collection: ${collectionDef.name}`);
        try {
          await processCollection(collectionDef, result);
          console.log(`✓ Completed: ${collectionDef.name}`);
        } catch (error: any) {
          console.error(`✗ Failed: ${collectionDef.name}`, error);
          result.errors.push(`${collectionDef.name}: ${error.message}`);
        }
      }

      // Refresh cache
      allVariablesCache = await figma.variables.getLocalVariablesAsync();

      // Second pass: resolve aliases
      for (const collectionDef of sortedCollections) {
        await resolveAliases(collectionDef, result);
      }

      let message = `Collections Import Complete!\n\n`;
      message += `• Collections Created: ${result.collectionsCreated}\n`;
      message += `• Collections Updated: ${result.collectionsUpdated}\n`;
      message += `• Variables Created: ${result.variablesCreated}\n`;
      message += `• Variables Updated: ${result.variablesUpdated}`;

      if (result.errors.length > 0) {
        message += `\n\n⚠️ Warnings:\n${result.errors.slice(0, 5).join('\n')}`;
        if (result.errors.length > 5) {
          message += `\n...and ${result.errors.length - 5} more`;
        }
      }

      figma.ui.postMessage({ type: 'success', message });

    } catch (error: any) {
      figma.ui.postMessage({ type: 'error', message: error.message });
    }
  }

  // EXISTING: Keep create-mode handler for backward compatibility
  if (msg.type === 'create-mode') {
    const { collectionId, modeName, data } = msg;

    try {
      const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
      if (!collection) throw new Error("Collection not found");

      // Check Pro Plan limitation
      if (collection.modes.length >= 4) {
        throw new Error("Max modes reached. Figma Pro limits collections to 4 modes.");
      }

      // Create the new mode
      const newModeId = collection.addMode(modeName);
      const collectionVariableIds = collection.variableIds;
      
      let updateCount = 0;
      let createCount = 0;

      // Loop through provided JSON data
      for (const [varName, varValue] of Object.entries(data)) {

        // 1. Resolve Value (Is it a raw value or an alias?)
        const resolvedValue = resolveValue(varValue);

        // 2. Find or Create Variable
        let variableId: string | undefined;
        for (const id of collectionVariableIds) {
          const v = await figma.variables.getVariableByIdAsync(id);
          if (v && v.name === varName) {
            variableId = id;
            break;
          }
        }

        let variable: Variable | null = null;

        if (variableId) {
          // Existing Variable
          variable = await figma.variables.getVariableByIdAsync(variableId);
          if (variable) updateCount++;
        } else {
          // New Variable
          // We infer type based on the resolved value. 
          // If resolvedValue is an Alias, we look up the target variable's type.
          const type = inferType(resolvedValue);
          if (type) {
            console.log(`Creating new variable: ${varName} as ${type}`);
            variable = figma.variables.createVariable(varName, collectionId, type);
            createCount++;
          } else {
             console.warn(`Could not infer type for: ${varName}`);
          }
        }

        // 3. Apply Value
        if (variable && resolvedValue !== null) {
          applyValueToMode(variable, newModeId, resolvedValue);
        }
      }

      figma.ui.postMessage({ 
        type: 'success', 
        message: `Genius Update Complete!\n\n• Mode: "${modeName}"\n• Updated: ${updateCount}\n• Created: ${createCount}` 
      });

    } catch (error: any) {
      figma.ui.postMessage({ type: 'error', message: error.message });
    }
  }
};

// --- HELPER TYPES & FUNCTIONS ---

type ResolvedValue = 
  | { type: 'RAW', value: any, dataType: VariableResolvedDataType }
  | { type: 'ALIAS', id: string, dataType: VariableResolvedDataType };

function resolveValue(rawValue: any): ResolvedValue | null {
  // 1. Check for Alias string: "{Gray.90}"
  if (typeof rawValue === 'string' && rawValue.trim().startsWith('{') && rawValue.trim().endsWith('}')) {
    const cleanName = rawValue.trim().slice(1, -1); // Remove { }
    
    // Tokens Studio often uses dots "Gray.90", but Figma uses slashes "Gray/90"
    // We try to find a match for both formats
    const targetVar = allVariablesCache.find(v => 
      v.name === cleanName || 
      v.name === cleanName.replace(/\./g, '/')
    );

    if (targetVar) {
      return { type: 'ALIAS', id: targetVar.id, dataType: targetVar.resolvedType };
    } else {
      console.warn(`Alias target not found: ${cleanName}`);
      return null;
    }
  }

  // 2. Check for Hex Color
  if (typeof rawValue === 'string' && rawValue.startsWith('#')) {
    return { type: 'RAW', value: hexToRgba(rawValue), dataType: 'COLOR' };
  }

  // 3. Check for Number
  if (typeof rawValue === 'number') {
    return { type: 'RAW', value: rawValue, dataType: 'FLOAT' };
  }

  // 4. Check for Boolean
  if (typeof rawValue === 'boolean') {
    return { type: 'RAW', value: rawValue, dataType: 'BOOLEAN' };
  }

  // 5. Fallback to String
  return { type: 'RAW', value: String(rawValue), dataType: 'STRING' };
}

function inferType(resolved: ResolvedValue | null): VariableResolvedDataType | null {
  if (!resolved) return null;
  return resolved.dataType;
}

function applyValueToMode(variable: Variable, modeId: string, resolved: ResolvedValue) {
  try {
    // Safety check: Don't assign a Color value to a String variable, etc.
    if (variable.resolvedType !== resolved.dataType) {
        console.warn(`Type mismatch for ${variable.name}: Variable is ${variable.resolvedType}, value is ${resolved.dataType}`);
        return;
    }

    if (resolved.type === 'ALIAS') {
      // Create the link!
      variable.setValueForMode(modeId, { type: 'VARIABLE_ALIAS', id: resolved.id });
    } else {
      // Set raw value
      variable.setValueForMode(modeId, resolved.value);
    }
  } catch (e) {
    console.warn(`Failed to set value for ${variable.name}`, e);
  }
}

// Convert Hex to Figma RGBA
function hexToRgba(hex: string): RGBA {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0, a: 1 };
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
    a: result[4] ? parseInt(result[4], 16) / 255 : 1
  };
}

// Parse color from multiple formats (hex, rgba, oklch)
function parseColorValue(colorString: string): RGBA | null {
  const trimmed = colorString.trim();

  if (trimmed.startsWith('#')) {
    return hexToRgba(trimmed);
  }

  if (trimmed.startsWith('rgba(')) {
    return parseRgba(trimmed);
  }

  if (trimmed.startsWith('oklch(')) {
    return oklchToRgba(trimmed);
  }

  return null;
}

function parseRgba(rgba: string): RGBA | null {
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(rgba);
  if (!match) return null;

  return {
    r: parseInt(match[1]) / 255,
    g: parseInt(match[2]) / 255,
    b: parseInt(match[3]) / 255,
    a: match[4] ? parseFloat(match[4]) : 1
  };
}

function oklchToRgba(oklch: string): RGBA | null {
  const match = /oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/.exec(oklch);
  if (!match) return null;

  const L = parseFloat(match[1]);
  const C = parseFloat(match[2]);
  const H = parseFloat(match[3]);

  // Convert OKLCH to OKLab
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);

  // OKLab to linear RGB (simplified conversion)
  const l = L + 0.3963377774 * a + 0.2158037573 * b;
  const m = L - 0.1055613458 * a - 0.0638541728 * b;
  const s = L - 0.0894841775 * a - 1.2914855480 * b;

  const r = Math.max(0, Math.min(1, Math.pow(l, 3)));
  const g = Math.max(0, Math.min(1, Math.pow(m, 3)));
  const bVal = Math.max(0, Math.min(1, Math.pow(s, 3)));

  return { r, g, b: bVal, a: 1 };
}

// Dependency resolution for collections
function buildDependencyGraph(collections: CollectionDefinition[]) {
  const graph = collections.map(collection => {
    const deps = new Set<string>();

    // Scan variables for cross-collection references
    for (const varDef of Object.values(collection.variables)) {
      for (const value of Object.values(varDef)) {
        if (typeof value === 'string' && value.startsWith('{')) {
          const match = value.match(/^\{([^.]+)\./);
          if (match && match[1] !== collection.name) {
            deps.add(match[1]);
          }
        }
      }
    }

    return { collection, dependencies: deps };
  });

  return graph;
}

function topologicalSort(graph: any[]): CollectionDefinition[] {
  const sorted: CollectionDefinition[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(node: any) {
    if (visited.has(node.collection.name)) return;
    if (visiting.has(node.collection.name)) {
      throw new Error(`Circular dependency detected: ${node.collection.name}`);
    }

    visiting.add(node.collection.name);

    for (const depName of node.dependencies) {
      const depNode = graph.find(n => n.collection.name === depName);
      if (depNode) visit(depNode);
    }

    visiting.delete(node.collection.name);
    visited.add(node.collection.name);
    sorted.push(node.collection);
  }

  graph.forEach(node => visit(node));
  return sorted;
}

// Process a single collection
async function processCollection(
  collectionDef: CollectionDefinition,
  result: ProcessingResult
): Promise<void> {
  const existingCollections = figma.variables.getLocalVariableCollections();
  let collection = existingCollections.find(c => c.name === collectionDef.name);

  if (collection) {
    result.collectionsUpdated++;
  } else {
    collection = figma.variables.createVariableCollection(collectionDef.name);
    result.collectionsCreated++;
  }

  // Create modes
  const existingModeNames = collection.modes.map(m => m.name);

  // Rename default mode first to avoid conflicts
  if (collection.modes[0].name !== collectionDef.modes[0]) {
    collection.renameMode(collection.modes[0].modeId, collectionDef.modes[0]);
  }

  // Add remaining modes (skip the first one since we already renamed it)
  const modesToCreate = collectionDef.modes.slice(1).filter(m => !existingModeNames.includes(m));

  for (const modeName of modesToCreate) {
    if (collection.modes.length >= 4) {
      throw new Error(`Cannot add mode "${modeName}": Max 4 modes (Figma Pro limit)`);
    }
    collection.addMode(modeName);
  }

  // Create/update variables
  for (const [varName, varDef] of Object.entries(collectionDef.variables)) {
    await processVariable(collection, varName, varDef, result);
  }
}

// Process a single variable
async function processVariable(
  collection: VariableCollection,
  varName: string,
  varDef: VariableDefinition,
  result: ProcessingResult
): Promise<void> {
  let variable: Variable | null = null;
  for (const id of collection.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id);
    if (v && v.name === varName) {
      variable = v;
      break;
    }
  }

  const typeMap: Record<string, VariableResolvedDataType> = {
    'color': 'COLOR',
    'number': 'FLOAT',
    'string': 'STRING',
    'boolean': 'BOOLEAN',
    'boxShadow': 'STRING' // Figma doesn't have native boxShadow type, store as string
  };

  if (variable) {
    result.variablesUpdated++;
  } else {
    const figmaType = typeMap[varDef.type] || 'STRING';
    variable = figma.variables.createVariable(varName, collection.id, figmaType);
    result.variablesCreated++;
    console.log(`  Created variable: ${varName} (${figmaType})`);
  }

  // Set values for each mode (skip metadata fields)
  const metadataFields = ['type', 'description', 'unit'];

  for (const mode of collection.modes) {
    const modeValue = varDef[mode.name];

    if (modeValue !== undefined && !metadataFields.includes(mode.name)) {
      const resolved = resolveValueFirstPass(modeValue, varDef.type);

      if (resolved && resolved.type === 'RAW') {
        try {
          variable.setValueForMode(mode.modeId, resolved.value);
        } catch (e) {
          console.warn(`Failed to set value for ${varName}[${mode.name}]`, e);
        }
      }
    }
  }
}

// Resolve value in first pass (skip aliases)
function resolveValueFirstPass(rawValue: any, varType: string): ResolvedValue | null {
  // Skip aliases in first pass
  if (typeof rawValue === 'string' && rawValue.startsWith('{')) {
    return null;
  }

  // Handle colors
  if (varType === 'color' && typeof rawValue === 'string') {
    const rgba = parseColorValue(rawValue);
    if (rgba) {
      return { type: 'RAW', value: rgba, dataType: 'COLOR' };
    }
  }

  // Handle numbers
  if (varType === 'number') {
    const num = typeof rawValue === 'string' ? parseFloat(rawValue) : rawValue;
    if (!isNaN(num)) {
      return { type: 'RAW', value: num, dataType: 'FLOAT' };
    }
  }

  // Handle boolean
  if (typeof rawValue === 'boolean') {
    return { type: 'RAW', value: rawValue, dataType: 'BOOLEAN' };
  }

  // Handle boxShadow and other string types
  if (varType === 'boxShadow' || typeof rawValue === 'string') {
    return { type: 'RAW', value: String(rawValue), dataType: 'STRING' };
  }

  return { type: 'RAW', value: String(rawValue), dataType: 'STRING' };
}

// Resolve aliases in second pass
async function resolveAliases(
  collectionDef: CollectionDefinition,
  result: ProcessingResult
): Promise<void> {
  const collection = figma.variables.getLocalVariableCollections()
    .find(c => c.name === collectionDef.name);

  if (!collection) return;

  for (const [varName, varDef] of Object.entries(collectionDef.variables)) {
    let variable: Variable | null = null;
    for (const id of collection.variableIds) {
      const v = await figma.variables.getVariableByIdAsync(id);
      if (v && v.name === varName) {
        variable = v;
        break;
      }
    }

    if (!variable) continue;

    for (const mode of collection.modes) {
      const modeValue = varDef[mode.name];

      if (typeof modeValue === 'string' && modeValue.startsWith('{') && modeValue.endsWith('}')) {
        const aliasTarget = await resolveAliasReference(modeValue);

        if (aliasTarget) {
          try {
            variable.setValueForMode(mode.modeId, {
              type: 'VARIABLE_ALIAS',
              id: aliasTarget.id
            });
          } catch (e) {
            result.errors.push(`Failed to link ${varName}[${mode.name}] to ${modeValue}`);
          }
        } else {
          result.errors.push(`Alias target not found: ${modeValue}`);
        }
      }
    }
  }
}

// Resolve alias reference to variable
async function resolveAliasReference(aliasString: string): Promise<Variable | null> {
  const cleanRef = aliasString.slice(1, -1); // Remove braces
  const firstDotIndex = cleanRef.indexOf('.');
  if (firstDotIndex === -1) return null;

  const collectionName = cleanRef.substring(0, firstDotIndex);
  const variableName = cleanRef.substring(firstDotIndex + 1);

  const collections = figma.variables.getLocalVariableCollections();
  const targetCollection = collections.find(c => c.name === collectionName);

  if (!targetCollection) return null;

  for (const id of targetCollection.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id);
    if (v && v.name === variableName) {
      return v;
    }
  }

  return null;
}