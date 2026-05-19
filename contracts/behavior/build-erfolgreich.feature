Feature: TypeScript-Build läuft fehlerfrei durch
  # CON-0002 · SPEC-0001

  Background:
    Given Node >= 18 ist installiert
    And npm-Abhängigkeiten sind installiert (npm install)

  Scenario: TypeScript-Typprüfung ohne Fehler
    Given der Quellcode liegt als TypeScript in src/ vor
    When `tsc --noEmit` ausgeführt wird
    Then ist der Exit-Code 0
    And es werden keine Typfehler ausgegeben

  Scenario: Build erzeugt lauffähiges dist/index.js
    Given der Quellcode liegt als TypeScript in src/ vor
    When `npm run build` ausgeführt wird
    Then ist der Exit-Code 0
    And die Datei dist/index.js existiert
    And dist/index.js kann von Node.js via require() geladen werden ohne Fehler

  Scenario: Build schlägt bei Typfehler fehl
    Given eine TypeScript-Datei in src/ enthält einen Typfehler
    When `npm run build` ausgeführt wird
    Then ist der Exit-Code ungleich 0
    And die Fehlerausgabe enthält den Dateinamen und die Zeilennummer des Typfehlers
