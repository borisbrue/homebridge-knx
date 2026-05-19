---
id: SPEC-0001
title: "Upgrade auf Homebridge 2.0 und TypeScript-Migration"
type: feature
status: implemented
owner: "borisbrue"
created: 2026-05-19
updated: 2026-05-19
version: 0.3.0
priority: high
tags: ["homebridge2", "typescript", "migration"]
depends_on: []
contracts:
  - CON-0001
  - CON-0002
tests:
  - TST-0001
  - TST-0002
adrs: []
patterns:
  - name: Strategy
    status: accepted
    reason: "Handler sind austauschbare Strategien für KNX→HomeKit-Transformation; dynamisch per Config-Name geladen"
  - name: Facade
    status: accepted
    reason: "globs-Objekt wird als typisierte PluginContext-Facade ersetzt; adressiert SOLID-D-Warnung"
  - name: TemplateMethod
    status: accepted
    reason: "HandlerPattern-Lifecycle (onServiceInit → onKNXValueReceived → onHomeKitSet → onHomeKitReady) ist fix; Schritte variieren"
  - name: Registry
    status: accepted
    reason: "Handler-Lookup per String-Name wird zu typisiertem HandlerRegistry statt fragilem require()-Lookup"
---

# Upgrade auf Homebridge 2.0 und TypeScript-Migration

> **Status:** in-progress · **Owner:** borisbrue · **Version:** 0.3.0

## 1. Kontext & Motivation

`homebridge-knx` (v0.3.28) ist ein Homebridge-Plugin, das KNX-Gebäudeautomation mit Apple HomeKit verbindet. Das Plugin wurde zuletzt aktiv entwickelt als Homebridge noch bei Version 1.x war. Homebridge 2.0 hat mehrere Breaking Changes eingeführt, die das Plugin vollständig inkompatibel machen.

Gleichzeitig basiert das Plugin auf reinem JavaScript ohne Typisierung. Das offizielle Homebridge-Plugin-Template verwendet seit geraumer Zeit TypeScript, was Wartbarkeit, IDE-Unterstützung und Fehlererkennung deutlich verbessert.

**Stakeholder:** Heimautomations-Enthusiasten, die KNX-Systeme mit Apple HomeKit betreiben wollen.

## 2. Zielsetzung

**Primärziel:** Das Plugin auf Homebridge 2.0 kompatibel machen und dabei auf TypeScript migrieren, ohne die bestehende Konfigurationsdatei (`knx_config.json`) zu brechen.

**Erfolgskriterien (messbar):**
- [ ] Plugin startet ohne Fehler unter Homebridge 2.0 (Node 18+)
- [ ] Alle bestehenden Accessory-Typen (Switch, Dimmer, Thermostat, Jalousie, etc.) funktionieren korrekt
- [ ] Bestehende `knx_config.json`-Dateien werden ohne Änderung übernommen
- [ ] TypeScript-Kompilierung läuft fehlerfrei durch (`tsc --noEmit`)
- [ ] `npm run build` erzeugt lauffähiges JavaScript in `dist/`
- [ ] Plugin ist in `package.json` korrekt als Homebridge-2.0-Plugin deklariert

**Nicht-Ziele:**
- Keine neuen KNX-Handler/Addins in diesem Scope
- Keine Änderung des Konfigurationsformats
- Kein Web-UI oder Config-UI-X-Integration in diesem Scope
- Keine vollständige Testabdeckung (Basis-Infrastruktur wird vorbereitet)

## 3. User Stories

| ID    | Als ...               | möchte ich ...                                          | um ...                                              |
|-------|-----------------------|---------------------------------------------------------|-----------------------------------------------------|
| US-01 | KNX-Heimautomations-Nutzer | homebridge-knx unter Homebridge 2.0 betreiben   | meine KNX-Geräte weiterhin über HomeKit steuern     |
| US-02 | Plugin-Entwickler     | typisierte Codebasis vorfinden                          | neue Handler sicher und schneller entwickeln können |
| US-03 | Heimautomations-Nutzer | meine bestehende knx_config.json weiterverwenden       | keine manuelle Konfigurationsmigration durchführen  |

## 4. Funktionale Anforderungen

### 4.1 Homebridge 2.0 Breaking Changes beheben

- **FR-01:** `accessory.updateReachability()` muss aus `index.ts` (Z. 163) und `lib/knxdevice.ts` (Z. 130) entfernt werden — die API existiert in HB2 nicht mehr.
- **FR-02:** `homebridgeAPI.registerPlatform("homebridge-knx", "KNX", KNXPlatform, true)` — der 4. Parameter (`dynamic`) muss entfernt werden; in HB2 sind alle Plattformen dynamisch.
- **FR-03:** `globs.newAPI.unregisterPlatformAccessories(undefined, undefined, [...])` — die ersten zwei Parameter müssen den Plugin-Namen und Platform-Namen übergeben: `("homebridge-knx", "KNX", [...])`.
- **FR-04:** `globs.API.hap.Accessory.Categories[...]` — Pfad auf `globs.API.hap.Categories[...]` anpassen (Pfad-Änderung in HB2).
- **FR-05:** `engines.homebridge` in `package.json` muss auf `"^2.0.0"` gesetzt werden.
- **FR-06:** `engines.node` in `package.json` muss auf `">=18.0.0"` gesetzt werden.
- **FR-07:** `eibd`-Dependency evaluieren: Falls das Paket nicht mehr gepflegt wird und im aktuellen Code nicht aktiv genutzt, entfernen.

### 4.2 TypeScript-Migration

- **FR-08:** `tsconfig.json` mit strikten Einstellungen anlegen (target ES2020, module CommonJS, strict: true, outDir: `dist/`).
- **FR-09:** Alle Dateien in `lib/` und `index.js` nach TypeScript konvertieren (Endung `.ts`, Typ-Annotationen ergänzen).
- **FR-10:** Alle Addins in `lib/addins/` nach TypeScript konvertieren.
- **FR-11:** `package.json` anpassen: `main` auf `dist/index.js`, `types` auf `dist/index.d.ts`, Build-Script `tsc`.
- **FR-12:** `homebridge` als `peerDependency` und `devDependency` ergänzen (Version `^2.0.0`).
- **FR-13:** `.gitignore` um `dist/` und `node_modules/` ergänzen.
- **FR-14:** Handler-Pattern (`lib/addins/handlerpattern.ts`) als **abstrakte TypeScript-Klasse** definieren (Template Method). Die Basisklasse liefert Default-Implementierungen für alle Lifecycle-Hooks (`onServiceInit`, `onKNXValueReceived`, `onHomeKitSet`, `onHomeKitReady`); konkrete Handler überschreiben nur was sie brauchen. → *Pattern: Template Method + Strategy*
- **FR-15:** Das `globs`-Objekt wird durch ein typisiertes `PluginContext`-Interface ersetzt. Alle Module erhalten `PluginContext` per Parameter statt globaler Mutation. → *Pattern: Facade* (adressiert SOLID-D-Warnung)
- **FR-16:** Handler-Laden per String-Name (`require(handlerName)`) wird durch einen `HandlerRegistry` ersetzt: `register(name, constructor)` / `resolve(name): HandlerConstructor`. Unbekannte Handler-Namen werfen eine aussagekräftige Fehlermeldung. → *Pattern: Registry*

### 4.3 Implementierungs-Strategie (SOLID-S-Warnung)

Die Implementierung erfolgt in **zwei unabhängigen Branches/PRs**, um das Risiko zu minimieren:
- **Branch 1 – HB2-Fix:** Nur FR-01..FR-07 in JavaScript. Schnell deploybar, kein TS-Risiko.
- **Branch 2 – TS-Migration:** FR-08..FR-16 auf Basis von Branch 1. Kann länger dauern ohne Branch 1 zu blockieren.

## 5. Nicht-funktionale Anforderungen

| Kategorie       | Anforderung                                                          |
|-----------------|----------------------------------------------------------------------|
| Kompatibilität  | Bestehende `knx_config.json` ohne Anpassung lauffähig               |
| Node-Version    | Node.js >= 18.0.0 (LTS)                                             |
| Homebridge      | Homebridge >= 2.0.0                                                  |
| Build           | `npm run build` läuft ohne Fehler durch                             |
| Typsicherheit   | `tsc --noEmit` ohne Fehler; `strict: true` aktiv                    |
| Rückwärtskomp.  | Plugin-Identifier "homebridge-knx" / "KNX" bleibt gleich (gespeicherte Accessories bleiben erhalten) |

## 6. Akzeptanzkriterien (Gherkin)

```gherkin
Feature: Homebridge 2.0 Kompatibilität

  Scenario: Plugin startet korrekt unter Homebridge 2.0
    Given Homebridge 2.0 ist installiert (Node 18+)
    And eine gültige knx_config.json ist vorhanden
    When Homebridge gestartet wird
    Then startet das Plugin ohne Fehler
    And alle konfigurierten KNX-Geräte werden als HomeKit-Accessories registriert

  Scenario: Bestehende Accessories werden nach Neustart wiederhergestellt
    Given das Plugin hat Accessories bereits registriert
    When Homebridge neu gestartet wird
    Then werden die Accessories aus dem Homebridge-Cache wiederhergestellt
    And keine doppelten Accessories entstehen

  Scenario: TypeScript-Build ist erfolgreich
    Given der Quellcode liegt als TypeScript vor
    When `npm run build` ausgeführt wird
    Then existiert `dist/index.js` ohne Build-Fehler
    And `tsc --noEmit` meldet keine Typfehler
```

## 7. Edge Cases & Fehlerfälle

- **EC-01:** `knx_config.json` fehlt → Plugin loggt Fehler und beendet sich graceful (kein Absturz von Homebridge).
- **EC-02:** KNX-Bus nicht erreichbar beim Start → Plugin registriert Accessories trotzdem, KNX-Verbindung wird im Hintergrund retry-ed.
- **EC-03:** Unbekannter Handler-Typ in Konfiguration → Fehler wird geloggt, betroffenes Gerät übersprungen, andere Geräte laufen normal.
- **EC-04:** Accessory aus Cache entspricht nicht der Konfiguration → Altes Accessory wird deregistriert und neues erstellt.

## 8. Contracts (was wird garantiert)

Diese Spec wird durch folgende Contracts maschinell prüfbar gemacht:

| Contract-ID | Typ       | Was wird garantiert?                                                  |
|-------------|-----------|-----------------------------------------------------------------------|
| (offen)     | behavior  | Plugin registriert sich korrekt unter HB2 (Gherkin aus Sektion 6)   |
| (offen)     | build     | `npm run build` terminiert mit Exit-Code 0                           |

## 9. Tests (wie wird verifiziert)

| Test-ID | Level     | Was prüft der Test?                                       |
|---------|-----------|-----------------------------------------------------------|
| (offen) | build     | `npm run build` läuft durch                               |
| (offen) | typecheck | `tsc --noEmit` meldet keine Fehler                        |
| (offen) | manual    | Plugin-Start unter Homebridge 2.0 mit Beispielkonfiguration |

## 10. Implementierungsplan (Reihenfolge)

### Branch 1 – HB2-Fix (JavaScript, sofort deploybar)
1. `package.json`: `engines.homebridge` → `^2.0.0`, `engines.node` → `>=18.0.0`
2. `index.js`: `updateReachability()` entfernen (FR-01), `registerPlatform`-Signatur fixen (FR-02), `unregisterPlatformAccessories`-Parameter fixen (FR-03)
3. `lib/knxdevice.js`: `updateReachability()` entfernen (FR-01), `hap.Accessory.Categories` → `hap.Categories` (FR-04)
4. `eibd`-Dependency prüfen und ggf. entfernen (FR-07)
5. Manueller Test: Plugin-Start unter Homebridge 2.0

### Branch 2 – TypeScript-Migration (auf Branch 1 basierend)
6. `package.json`: `main`, `types`, Build-Scripts, `homebridge` als peer/devDependency (FR-11, FR-12)
7. `tsconfig.json` anlegen (FR-08)
8. `.gitignore` aktualisieren (FR-13)
9. `PluginContext`-Interface definieren (FR-15, Facade)
10. `HandlerRegistry` implementieren (FR-16, Registry)
11. `lib/addins/handlerpattern.ts` als abstrakte Klasse (FR-14, Template Method + Strategy)
12. `index.js` → `index.ts` (PluginContext einbinden)
13. `lib/*.js` → `lib/*.ts` schichtweise (FR-09)
14. `lib/addins/*.js` → `lib/addins/*.ts` (FR-10)
15. `lib/customtypes/knxthermostat.js` → `.ts`
16. `tsc --noEmit` fehlerfrei, dann `npm run build` verifizieren

## 11. Offene Fragen

- [ ] Wird `eibd`-Paket aktiv genutzt oder nur als Fallback? → Code-Analyse nötig
- [ ] Soll `knxd`-Verbindung (eibd) als optionaler Build-Zweig erhalten bleiben?
- [ ] Soll Config-UI-X (`homebridge-config-ui-x`) Schema in einem Follow-up ergänzt werden?

## 12. Änderungshistorie

| Datum      | Version | Autor      | Änderung                                              |
|------------|---------|------------|-------------------------------------------------------|
| 2026-05-19 | 0.1.0   | (Template) | Initiale Erstellung (leer)                            |
| 2026-05-19 | 0.2.0   | borisbrue  | Inhalt ergänzt: HB2 Breaking Changes + TS-Migration   |
| 2026-05-19 | 0.3.0   | borisbrue  | Review: 4 Patterns angenommen, SOLID-Warnungen adressiert, FR-15/16 ergänzt, 2-Branch-Strategie |
