# AGENTS.md

> Dieses Dokument gibt Code-generierenden Agenten den nötigen Kontext über dieses Repository.

## Service-Zweck

`homebridge-knx` ist ein Homebridge-Plugin, das KNX-Gebäudeautomation mit Apple HomeKit verbindet. Es liest eine eigene Konfigurationsdatei (`knx_config.json`), erstellt daraus HomeKit-Accessories und leitet Steuerbefehle zwischen HomeKit und dem KNX-Bus weiter. Unterstützte KNX-Verbindungen: knxd (via `eibd`-Paket) und KNX IP (via `knx`-Paket).

## Architektur

- **Typ:** Library / Homebridge-Plugin
- **Schichten:** `index.ts` (Platform-Registrierung) → `KNXDevice` (Accessory) → `ServiceKNX` (HomeKit-Service) → `CharacteristicKNX` (einzelne Characteristic) → `KNXAccess` / `KNXMonitor` (Bus-Kommunikation)
- **Handler-System:** Addins in `src/addins/` implementieren `HandlerPattern` (Strategy + Template Method). Werden per Name aus der Konfiguration geladen via `HandlerRegistry`.
- **Externe Systeme:** KNX-Bus via knxd (TCP-Socket) oder KNX IP Routing/Tunneling

## Verzeichnisstruktur

```
/
├── src/                    # TypeScript-Quellcode (nach Migration)
│   ├── index.ts            # Plugin-Einstiegspunkt, Platform-Registrierung
│   ├── types/
│   │   └── plugin-context.ts   # PluginContext-Interface (Facade für globals)
│   ├── registry/
│   │   └── handler-registry.ts # HandlerRegistry (löst Handler per Name auf)
│   ├── lib/                # Kernmodule
│   │   ├── knxdevice.ts    # KNXDevice: ein HomeKit-Accessory
│   │   ├── service-knx.ts  # ServiceKNX: ein HomeKit-Service
│   │   ├── characteristic-knx.ts
│   │   ├── knxaccess.ts    # KNX-Bus-Schreibzugriff
│   │   ├── knxmonitor.ts   # KNX-Bus-Empfang (Subscriptions)
│   │   ├── groupaddress.ts
│   │   ├── user.ts         # Config-Dateiverwaltung
│   │   └── ...
│   ├── addins/             # Handler (Strategy-Pattern)
│   │   ├── handlerpattern.ts   # Abstrakte Basisklasse (Template Method)
│   │   ├── Dimmer.ts
│   │   ├── Thermostat*.ts
│   │   └── ...
│   └── customtypes/
│       └── knxthermostat.ts
├── dist/                   # Kompiliertes JavaScript (Build-Ausgabe, nicht committen)
├── contracts/
│   └── behavior/           # Gherkin-Feature-Dateien (CON-0001, CON-0002)
├── custom/                 # Nutzerseitige Custom-Characteristics
├── .sdd/                   # SDD-Konfiguration (Specs, Contracts, Tests, Holdout)
├── knx_config.json         # Beispiel-Plugin-Konfiguration
└── package.json
```

## Externe Abhängigkeiten

| Service       | Zweck                                         | Konfiguration         |
|---------------|-----------------------------------------------|-----------------------|
| knxd          | KNX-Bus-Daemon (TCP-Socket, Port 6720)        | `knx_config.json`     |
| KNX IP Router | Alternatives KNX-IP-Protokoll                 | `knx_config.json`     |
| Homebridge    | Plugin-Host, HAP-Server (Apple HomeKit)       | Homebridge config.json|

## Build- und Start-Befehle

```bash
# Abhängigkeiten installieren
npm install

# TypeScript-Typprüfung (kein Output)
npx tsc --noEmit

# Produktions-Build (TypeScript → dist/)
npm run build

# Plugin wird von Homebridge gestartet — nicht direkt
# homebridge startet das Plugin über den registry()-Einstieg in dist/index.js
```

## Linting- und Formatierungsregeln

- **Formatter:** (noch nicht konfiguriert — Prettier empfohlen)
- **Linter:** (noch nicht konfiguriert — ESLint mit @typescript-eslint empfohlen)
- **Kritische Regeln:** `strict: true` in tsconfig.json — kein implizites `any`

## Taste Invariants

- **Inline-Disable verboten:** Unterdrücke niemals Typfehler mit `// @ts-ignore` oder `// eslint-disable`. Behebe die Ursache.
- **Plugin-Identifier unveränderlich:** `"homebridge-knx"` und `"KNX"` in `registerPlatform()` und `unregisterPlatformAccessories()` dürfen nicht geändert werden — bestehende Accessories im Homebridge-Cache sind an diese IDs gebunden.
- **knx_config.json-Format:** Das Konfigurationsformat (Schlüsselnamen, Struktur) darf nicht gebrochen werden — Rückwärtskompatibilität ist Pflicht.
- **Kein globaler Mutable State:** Neuer Code nutzt `PluginContext` statt des `globs`-Objekts.

## Konventionen

- **Namenskonventionen:** Klassen PascalCase, Dateien camelCase (legacy) / kebab-case (neu), Interfaces mit `I`-Präfix vermeiden
- **Handler-Addins:** Jeder neue Handler erweitert `HandlerPattern` und wird im `HandlerRegistry` registriert
- **Fehlerbehandlung:** Einzelne Gerätefehler dürfen Homebridge nicht zum Absturz bringen — `try/catch` auf Device-Ebene, Fehler loggen und Gerät überspringen
- **Logging:** Ausschließlich über `PluginContext.log` (`info`, `debug`, `error`) — kein direktes `console.log`

## SDD-Kontext

- Specs: `.sdd/specs/` — definieren WAS gebaut werden soll
- Contracts: `.sdd/contracts/` + `contracts/` — definieren WIE Verhalten aussieht
- Tests: `.sdd/tests/` — Test-Metadokumente
- Holdout: `.sdd/holdout/` — **niemals lesen** (Evaluator-Isolation)

Aktive Specs: SPEC-0001 (Homebridge 2.0 Upgrade + TypeScript-Migration)
