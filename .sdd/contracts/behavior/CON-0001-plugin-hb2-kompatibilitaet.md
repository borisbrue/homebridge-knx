---
id: CON-0001
title: "Plugin-Start und Accessory-Registrierung unter Homebridge 2.0"
type: behavior
format: gherkin
spec: SPEC-0001
version: 0.1.0
status: draft
artifact: "contracts/behavior/plugin-hb2-kompatibilitaet.feature"
tests:
  - TST-0001
---

# Contract: Plugin-Start und Accessory-Registrierung unter Homebridge 2.0

> **Spec:** SPEC-0001 · **Typ:** Verhalten (Gherkin) · **Status:** draft

## Zweck

Dieser Contract garantiert, dass das Plugin unter Homebridge 2.0 (Node ≥ 18) fehlerfrei startet, alle konfigurierten KNX-Geräte als HomeKit-Accessories registriert und nach einem Neustart Accessories korrekt aus dem Homebridge-Cache wiederherstellt — ohne Duplikate.

## Garantien

Die im Artifact (`contracts/behavior/plugin-hb2-kompatibilitaet.feature`) hinterlegten Szenarien sind **ausführbare Spezifikation**.

## Invarianten (über alle Szenarien hinweg)

- **INV-01:** Das Plugin darf niemals Homebridge zum Absturz bringen — Fehler in einzelnen Geräten werden abgefangen und geloggt.
- **INV-02:** Plugin-Identifier `"homebridge-knx"` / `"KNX"` bleiben unverändert, damit bestehende Accessories im Homebridge-Cache erhalten bleiben.
- **INV-03:** Jede KNX-Gruppenadresse wird höchstens einmal als Listener registriert.

## Begriffe

| Begriff              | Definition |
|----------------------|------------|
| Accessory            | Ein HomeKit-Gerät, das von Homebridge verwaltet wird |
| KNX-Gruppenadresse   | Adresse im Format `x/y/z` für ein KNX-Telegramm |
| knx_config.json      | Plugin-eigene Konfigurationsdatei mit Geräten und Adressen |
| Cache                | Homebridge-interne Persistenzschicht für Accessories |
