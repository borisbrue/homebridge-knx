# AGENTS.md — src/

> Vollständiger Kontext: siehe [`/AGENTS.md`](../AGENTS.md) im Projekt-Root.

## Dieses Verzeichnis

TypeScript-Quellcode des `homebridge-knx` Plugins. Kompiliert nach `dist/` via `npm run build` (`tsc`).

### Einstiegspunkt

`src/index.ts` → registriert `KNXPlatform` bei Homebridge.

### Wichtige Konventionen für Agenten

- **Keine** `globs.Characteristic.Formats/Perms/Units` — stattdessen direkt aus `homebridge` importieren: `import { Formats, Perms, Units } from 'homebridge'`
- **Kein** `globs.log(...)` als Funktion — `Logger` ist nicht callable; stattdessen `globs.info(...)`, `globs.errorlog(...)`, oder `globs.log.warn(...)`
- **Kein** `getServiceByUUIDAndSubType` — in HB2 entfernt; `platformAccessory.services.find(...)` verwenden
- `PluginContext` (aus `types/plugin-context.ts`) ersetzt das informelle `globs`-Objekt
- Handler-Addins in `src/addins/` implementieren `HandlerPattern`; Legacy-JS-Handler in `lib/addins/` funktionieren weiterhin via Fallback in `customServiceAPI.ts`
