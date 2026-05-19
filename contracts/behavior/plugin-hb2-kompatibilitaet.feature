Feature: Plugin-Start und Accessory-Registrierung unter Homebridge 2.0
  # CON-0001 · SPEC-0001

  Background:
    Given Homebridge 2.0 ist installiert mit Node >= 18
    And homebridge-knx ist als Plugin registriert

  Scenario: Plugin startet korrekt mit gültiger Konfiguration
    Given eine gültige knx_config.json mit mindestens einem Gerät ist vorhanden
    When Homebridge gestartet wird
    Then startet das Plugin ohne unbehandelte Exceptions
    And alle konfigurierten KNX-Geräte werden als HomeKit-Accessories registriert
    And der Homebridge-Log enthält keinen "FATAL"-Eintrag vom Plugin

  Scenario: Accessories werden nach Neustart aus Cache wiederhergestellt
    Given das Plugin hat Accessories bereits bei einem früheren Start registriert
    When Homebridge neu gestartet wird
    Then werden alle Accessories aus dem Homebridge-Cache wiederhergestellt
    And keine neuen doppelten Accessories entstehen
    And die UUID der wiederhergestellten Accessories ist identisch mit der ursprünglichen

  Scenario: Fehlerhafte Gerätekonfiguration blockiert nicht andere Geräte
    Given eine knx_config.json mit einem Gerät mit unbekanntem Handler-Typ
    And mindestens einem weiteren Gerät mit gültigem Handler-Typ
    When Homebridge gestartet wird
    Then wird das fehlerhafte Gerät übersprungen und ein Fehler geloggt
    And das gültige Gerät wird normal als Accessory registriert

  Scenario: fehlende knx_config.json führt zu gracefulem Fehler
    Given keine knx_config.json ist vorhanden
    When Homebridge gestartet wird
    Then loggt das Plugin einen Fehler
    And Homebridge läuft weiter ohne Absturz
