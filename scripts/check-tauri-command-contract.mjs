import { existsSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const COMMANDS_TS = join(ROOT, "src/lib/tauri/commands.ts");
const RUST_HANDLER_FILE = join(ROOT, "src-tauri/src/lib.rs");
const RUST_COMMAND_FILES = [
  "src-tauri/src/activity.rs",
  "src-tauri/src/lib.rs",
  "src-tauri/src/local_db.rs",
  "src-tauri/src/local_files.rs",
  "src-tauri/src/widget_usage.rs",
].map((path) => join(ROOT, path));

const failures = [];

const commandsText = readRequiredFile(COMMANDS_TS);
const handlerText = readRequiredFile(RUST_HANDLER_FILE);

const tauriCommands = parseFlatStringObject(commandsText, "TAURI_COMMANDS");
const contractCommands = parseContractKeys(commandsText, "TauriCommandContract");
const wrapperCommands = parseWrapperCommands(commandsText, "tauriCommands");
const wrapperReferences = new Set([...wrapperCommands.values()].flatMap((entry) => [...entry.references]));
const registeredCommands = parseGenerateHandlerCommands(handlerText);
const rustCommandFunctions = parseRustCommandFunctions();

compareSets({
  leftName: "TAURI_COMMANDS values",
  left: new Set(tauriCommands.values()),
  rightName: "Rust generate_handler commands",
  right: registeredCommands,
});

compareSets({
  leftName: "TAURI_COMMANDS values",
  left: new Set(tauriCommands.values()),
  rightName: "TauriCommandContract keys",
  right: contractCommands,
});

compareSets({
  leftName: "TAURI_COMMANDS keys",
  left: new Set(tauriCommands.keys()),
  rightName: "tauriCommands wrapper methods",
  right: new Set(wrapperCommands.keys()),
});

compareSets({
  leftName: "Rust #[tauri::command] functions",
  left: rustCommandFunctions,
  rightName: "Rust generate_handler commands",
  right: registeredCommands,
});

for (const key of tauriCommands.keys()) {
  const wrapper = wrapperCommands.get(key);
  if (!wrapper) continue;
  if (!wrapper.references.has(key)) {
    failures.push(`${key}: wrapper method does not call TAURI_COMMANDS.${key}`);
  }
  for (const reference of wrapper.references) {
    if (reference !== key) {
      failures.push(
        `${key}: wrapper method references TAURI_COMMANDS.${reference} instead of only TAURI_COMMANDS.${key}`,
      );
    }
  }
}

for (const reference of wrapperReferences) {
  if (!tauriCommands.has(reference)) {
    failures.push(`${reference}: wrapper references unknown TAURI_COMMANDS key`);
  }
}

assertContains(
  commandsText,
  /export type WidgetWindowModeInput = \{[\s\S]*clearSelectedRoomId\?: boolean;[\s\S]*selectedRoomId\?: string \| null;/,
  "WidgetWindowModeInput must expose clearSelectedRoomId so explicit personal mode can clear stale native room context.",
);
assertContains(
  commandsText,
  /export type WidgetWindowOpenInput = \{[\s\S]*clearSelectedRoomId\?: boolean;[\s\S]*selectedRoomId\?: string \| null;/,
  "WidgetWindowOpenInput must expose clearSelectedRoomId so explicit personal mode can clear stale native room context.",
);
assertContains(
  handlerText,
  /struct WidgetWindowModeInput \{[\s\S]*clear_selected_room_id: Option<bool>,[\s\S]*selected_room_id: Option<String>,/,
  "Rust WidgetWindowModeInput must deserialize clearSelectedRoomId separately from omitted selectedRoomId.",
);
assertContains(
  handlerText,
  /struct WidgetWindowOpenInput \{[\s\S]*clear_selected_room_id: Option<bool>,[\s\S]*selected_room_id: Option<String>,/,
  "Rust WidgetWindowOpenInput must deserialize clearSelectedRoomId separately from omitted selectedRoomId.",
);
assertContains(
  handlerText,
  /if let Some\(selected_room_id\) = selected_room_id \{[\s\S]*widget\.selected_room_id = Some\(selected_room_id\);[\s\S]*\} else if clear_selected_room_id \{[\s\S]*widget\.selected_room_id = None;/,
  "Native widget room context updates must preserve omitted room ids and clear only when clearSelectedRoomId is explicit.",
);

if (failures.length > 0) {
  console.error("Tauri command contract check failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Tauri command contract check passed (${tauriCommands.size} commands).`);

function readRequiredFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing file: ${toRepoPath(filePath)}`);
  }
  return readFileSync(filePath, "utf8");
}

function assertContains(source, pattern, message) {
  if (!pattern.test(source)) {
    failures.push(message);
  }
}

function parseFlatStringObject(text, objectName) {
  const objectText = extractBetween(
    text,
    `export const ${objectName} = {`,
    "} as const;",
    objectName,
  );
  const entries = new Map();
  const seenValues = new Map();
  const entryPattern = /^\s*([A-Za-z_$][\w$]*)\s*:\s*"([a-z][a-z0-9_]*)"\s*,?\s*$/gm;

  for (const match of objectText.matchAll(entryPattern)) {
    const key = match[1];
    const value = match[2];
    if (entries.has(key)) {
      failures.push(`${objectName}: duplicate key ${key}`);
    }
    if (seenValues.has(value)) {
      failures.push(`${objectName}: duplicate value ${value} for ${seenValues.get(value)} and ${key}`);
    }
    entries.set(key, value);
    seenValues.set(value, key);
  }

  if (entries.size === 0) {
    failures.push(`${objectName}: no command entries parsed`);
  }

  return entries;
}

function parseContractKeys(text, typeName) {
  const contractText = extractBetween(
    text,
    `export type ${typeName} = {`,
    "};\n\nexport type PlannedTauriCommandContract",
    typeName,
  );
  const keys = new Set();
  const keyPattern = /^\s{2}([a-z][a-z0-9_]*)\s*:\s*\{/gm;

  for (const match of contractText.matchAll(keyPattern)) {
    const key = match[1];
    if (keys.has(key)) {
      failures.push(`${typeName}: duplicate key ${key}`);
    }
    keys.add(key);
  }

  if (keys.size === 0) {
    failures.push(`${typeName}: no contract keys parsed`);
  }

  return keys;
}

function parseWrapperCommands(text, objectName) {
  const wrapperText = extractBetween(
    text,
    `export const ${objectName} = {`,
    "} as const;\n\nexport const plannedTauriCommands",
    objectName,
  );
  const wrappers = new Map();
  const methodStartPattern = /^  ([A-Za-z_$][\w$]*)\s*\(/gm;
  const referencePattern = /TAURI_COMMANDS\.([A-Za-z_$][\w$]*)/g;
  const starts = [...wrapperText.matchAll(methodStartPattern)].map((match) => ({
    index: match.index,
    key: match[1],
  }));

  for (let index = 0; index < starts.length; index += 1) {
    const current = starts[index];
    const next = starts[index + 1];
    const methodText = wrapperText.slice(current.index, next?.index ?? wrapperText.length);
    const references = new Set();
    for (const match of methodText.matchAll(referencePattern)) {
      references.add(match[1]);
    }
    if (wrappers.has(current.key)) {
      failures.push(`${objectName}: duplicate wrapper method ${current.key}`);
    }
    wrappers.set(current.key, { references });
  }

  if (wrappers.size === 0) {
    failures.push(`${objectName}: no wrapper methods parsed`);
  }

  return wrappers;
}

function parseGenerateHandlerCommands(text) {
  const handlerText = extractBetween(
    text,
    ".invoke_handler(tauri::generate_handler![",
    "])\n        .build",
    "tauri::generate_handler",
  );
  const withoutLineComments = handlerText
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, "").trim())
    .join("\n");
  const commands = new Set();

  for (const rawEntry of withoutLineComments.split(",")) {
    const entry = rawEntry.trim();
    if (!entry) continue;
    const commandName = entry.split("::").pop()?.trim();
    if (commandName && /^[a-z][a-z0-9_]*$/.test(commandName)) {
      if (commands.has(commandName)) {
        failures.push(`tauri::generate_handler: duplicate command ${commandName}`);
      }
      commands.add(commandName);
    } else {
      failures.push(`tauri::generate_handler: could not parse entry "${entry}"`);
    }
  }

  if (commands.size === 0) {
    failures.push("tauri::generate_handler: no commands parsed");
  }

  return commands;
}

function parseRustCommandFunctions() {
  const commands = new Set();

  for (const filePath of RUST_COMMAND_FILES) {
    const text = readRequiredFile(filePath);
    const commandPattern = /#\s*\[\s*tauri::command\s*\]\s*(?:pub\s+)?(?:async\s+)?fn\s+([a-z][a-z0-9_]*)\s*\(/g;

    for (const match of text.matchAll(commandPattern)) {
      const commandName = match[1];
      if (commands.has(commandName)) {
        failures.push(`Rust command files: duplicate #[tauri::command] function ${commandName}`);
      }
      commands.add(commandName);
    }
  }

  if (commands.size === 0) {
    failures.push("Rust command files: no #[tauri::command] functions parsed");
  }

  return commands;
}

function compareSets({ leftName, left, rightName, right }) {
  for (const value of sortedDifference(left, right)) {
    failures.push(`${value}: present in ${leftName}, missing from ${rightName}`);
  }
  for (const value of sortedDifference(right, left)) {
    failures.push(`${value}: present in ${rightName}, missing from ${leftName}`);
  }
}

function sortedDifference(left, right) {
  return [...left].filter((value) => !right.has(value)).sort();
}

function extractBetween(text, startMarker, endMarker, label) {
  const start = text.indexOf(startMarker);
  if (start === -1) {
    failures.push(`${label}: start marker not found`);
    return "";
  }
  const bodyStart = start + startMarker.length;
  const end = text.indexOf(endMarker, bodyStart);
  if (end === -1) {
    failures.push(`${label}: end marker not found`);
    return "";
  }
  return text.slice(bodyStart, end);
}

function toRepoPath(filePath) {
  return relative(ROOT, filePath).split(sep).join("/");
}
