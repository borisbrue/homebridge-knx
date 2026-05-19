---
id: CON-0002
title: "TypeScript-Build läuft fehlerfrei durch"
type: behavior
format: gherkin
spec: SPEC-0001
version: 0.1.0
status: draft
artifact: "contracts/behavior/build-erfolgreich.feature"
tests:
  - TST-0002
---

# Contract: TypeScript-Build läuft fehlerfrei durch

> **Spec:** SPEC-0001 · **Typ:** Verhalten (Gherkin) · **Status:** draft

## Zweck

Dieser Contract garantiert, dass der TypeScript-Quellcode in `src/` fehlerfrei kompiliert und `npm run build` ein lauffähiges JavaScript-Bundle in `dist/` erzeugt. Damit ist die TypeScript-Migration maschinell prüfbar.

## Garantien

Die im Artifact (`contracts/behavior/build-erfolgreich.feature`) hinterlegten Szenarien sind **ausführbare Spezifikation**.

## Invarianten (über alle Szenarien hinweg)

- **INV-01:** `tsc --noEmit` meldet null Fehler (strict mode aktiv).
- **INV-02:** `dist/index.js` existiert nach erfolgreichem Build und ist von Node require()-bar.
- **INV-03:** Kein Typcast zu `any` außer an dokumentierten Systemgrenzen (externe Bibliotheken ohne Typen).

## Begriffe

| Begriff        | Definition |
|----------------|------------|
| `tsc --noEmit` | TypeScript-Compiler-Lauf ohne Dateiausgabe — reine Typprüfung |
| `dist/`        | Build-Ausgabeverzeichnis mit kompiliertem JavaScript |
| `src/`         | TypeScript-Quellverzeichnis |
