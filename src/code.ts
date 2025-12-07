/// <reference types="@figma/plugin-typings" />

// GENIUS VERSION 3.0 - Variable Mode Injector
// Supports: Hex Codes, Number Values, AND Variable Aliases (e.g., "{Gray.90}")

console.clear();
console.log("Plugin Logic Loaded: Genius Version 3.0");

// Global cache for variables to speed up alias lookups
let allVariablesCache: Variable[] = [];

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
  if (msg.type === 'create-mode') {
    const { collectionId, modeName, data } = msg;

    try {
      const collection = figma.variables.getVariableCollectionById(collectionId);
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
        let variableId = collectionVariableIds.find(id => {
          const v = figma.variables.getVariableById(id);
          return v && v.name === varName;
        });

        let variable: Variable | null = null;

        if (variableId) {
          // Existing Variable
          variable = figma.variables.getVariableById(variableId);
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