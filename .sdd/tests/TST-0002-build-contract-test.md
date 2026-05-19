---
id: TST-0002
title: "Contract-Test: TypeScript-Build fehlerfrei"
level: contract
spec: SPEC-0001
contract: CON-0002
status: passing
framework: "npm scripts / tsc"
artifact: "contracts/behavior/build-erfolgreich.feature"
tags: ["build", "typescript", "ci"]
---

# Test: Contract-Test: TypeScript-Build fehlerfrei

> **Level:** contract · **Spec:** SPEC-0001 · **Contract:** CON-0002 · **Status:** planned

## Was wird geprüft?

Verifiziert, dass `npm run build` und `tsc --noEmit` mit Exit-Code 0 durchlaufen und `dist/index.js` erzeugbar und lauffähig ist.

## Vorbedingungen

- Node >= 18 installiert
- `npm install` erfolgreich durchgeführt
- TypeScript-Quellcode in `src/` vollständig migriert

## Ablauf

1. `npm install` ausführen
2. `npx tsc --noEmit` ausführen → Exit-Code und Ausgabe prüfen
3. `npm run build` ausführen → Exit-Code und `dist/index.js` prüfen
4. `node -e "require('./dist/index.js')"` → kein Fehler

## Erwartetes Ergebnis

- Alle drei Befehle terminieren mit Exit-Code 0
- `dist/index.js` existiert und ist require()-bar
- Keine Typfehler in der `tsc`-Ausgabe

## Negativfälle / Edge Cases

- Absichtlicher Typfehler in einer `src/`-Datei → Build schlägt fehl (Exit-Code ≠ 0)

## Verknüpfung mit Contract

Dieser Test prüft konkret folgende Punkte aus CON-0002:

- [x] Scenario: TypeScript-Typprüfung ohne Fehler
- [x] Scenario: Build erzeugt lauffähiges dist/index.js
- [ ] Scenario: Build schlägt bei Typfehler fehl

## Hinweise zur Implementierung

Kann als CI-Schritt in GitHub Actions integriert werden:
```yaml
- run: npm ci
- run: npx tsc --noEmit
- run: npm run build
- run: node -e "require('./dist/index.js')"
```
