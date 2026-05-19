---
id: TST-0001
title: "Acceptance-Test: Plugin-Start und Accessory-Registrierung unter HB2"
level: acceptance
spec: SPEC-0001
contract: CON-0001
status: planned
framework: "manual / cucumber (geplant)"
artifact: "contracts/behavior/plugin-hb2-kompatibilitaet.feature"
tags: ["homebridge2", "acceptance", "manual"]
---

# Test: Acceptance-Test: Plugin-Start und Accessory-Registrierung unter HB2

> **Level:** acceptance · **Spec:** SPEC-0001 · **Contract:** CON-0001 · **Status:** planned

## Was wird geprüft?

Die Gherkin-Szenarien aus CON-0001 werden gegen eine laufende Homebridge-2.0-Instanz verifiziert:
- Plugin startet ohne Exceptions
- Accessories werden korrekt registriert
- Accessories werden nach Neustart aus Cache wiederhergestellt (keine Duplikate)
- Fehlerhafte Gerätekonfigurationen blockieren nicht andere Geräte
- Fehlende knx_config.json → gracefuler Fehler

## Vorbedingungen

- Homebridge 2.0 installiert (Node >= 18)
- `npm run build` (Branch 2) oder direkter JS-Einsatz (Branch 1) erfolgreich
- Eine `knx_config.json` mit Testgeräten vorhanden
- KNX-Bus oder Simulator erreichbar (optional für Volltests)

## Ablauf

1. Homebridge mit aktiviertem `homebridge-knx`-Plugin starten
2. Homebridge-Log auf Fehler/Warnungen prüfen
3. In der Home-App prüfen, ob alle konfigurierten Geräte erscheinen
4. Homebridge neu starten → Cache-Wiederherstellung verifizieren
5. `knx_config.json` mit ungültigem Handler anlegen → Start prüfen

## Erwartetes Ergebnis

- Exit-Code 0 beim Start
- Keine unbehandelten Exceptions im Log
- Alle konfigurierten Geräte sichtbar in HomeKit
- Nach Neustart keine doppelten Accessories

## Negativfälle / Edge Cases

- Ungültiger Handler-Typ → EC-03 (Gerät übersprungen, andere laufen)
- Fehlende `knx_config.json` → EC-01 (graceful error)

## Verknüpfung mit Contract

Dieser Test prüft konkret folgende Punkte aus CON-0001:

- [ ] Scenario: Plugin startet korrekt mit gültiger Konfiguration
- [ ] Scenario: Accessories werden nach Neustart aus Cache wiederhergestellt
- [ ] Scenario: Fehlerhafte Gerätekonfiguration blockiert nicht andere Geräte
- [ ] Scenario: fehlende knx_config.json führt zu gracefulem Fehler

## Hinweise zur Implementierung

Manueller Test in Phase 1 (Branch 1). Automatisierung via Cucumber/behave in einem Follow-up möglich, sobald eine Homebridge-Test-Instanz als Docker-Container verfügbar ist.
