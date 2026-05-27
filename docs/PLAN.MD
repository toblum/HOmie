# HOmie - Produkt- und Umsetzungsplan

## Zielbild

HOmie ist eine lokale Desktop-App zur einfachen Planung und Erfassung von Home-Office-, Büro- und Abwesenheitstagen. Die App richtet sich an eine einzelne Person im Team-Kontext und soll vor allem zwei Dinge sehr gut können:

1. **Tage extrem schnell erfassen**
2. **den Monatsstatus verständlich und vertrauenswürdig anzeigen**

Die App speichert **alle Nutzdaten lokal in genau einer Datei** neben der ausgelieferten Anwendung, arbeitet **ohne Cloud und ohne Benutzerkonto** und soll als **portable Desktop-App** zuerst für Windows, später mit derselben Codebasis auch für macOS und Linux baubar sein.

---

## Empfohlene technische Umsetzung

### Primäre Wahl: Electron + React + TypeScript

Ich empfehle für HOmie:

- **Electron** als Desktop-Shell
- **React** für die Oberfläche
- **TypeScript** im gesamten Applikationscode
- **Vite** für schnellen Frontend-Build
- **date-fns** für Datumslogik
- **date-holidays** für gesetzliche Feiertage nach Bundesland
- **Zustand** oder ein ähnlich leichtgewichtiges State-Management
- **JSON-Datei** als einziges lokales Datenspeicherformat

### Warum diese Wahl

- **nahezu vollständig TypeScript-basiert**
- **sehr gute Unterstützung für Tray, Autostart und portable Builds**
- **realistisch von einem Agenten alleine umsetzbar und testbar**
- **Cross-Plattform mit derselben Codebasis**
- **schnelle UI-Iteration für eine stark UX-getriebene Anwendung**

### Bewusst nicht gewählt: Tauri

Tauri wäre bei Dateigröße und Ressourcenverbrauch attraktiver, bringt aber für diese erste Version zusätzlichen Rust-Aufwand in Build, Debugging und OS-Integration. Für ein kleines internes Tool mit Fokus auf schneller Umsetzung, reiner TypeScript-Entwicklung und einfacher Wartung ist **Electron hier der pragmatischere Start**.

---

## Produktprinzipien

- **lokal zuerst**
- **maximal wenige Klicks**
- **Monat sofort erfassbar**
- **klare Ampel-/Fortschrittslogik**
- **portable Datenhaltung**
- **respektvolle, ruhige Oberfläche ohne visuelle Überladung**

---

## Funktionsumfang der ersten Version

### 1. Tageserfassung

Für jeden Kalendertag kann ein Status gesetzt werden:

- **Home Office**
- **Büro**
- **Abwesend**

Abwesend wird in Untertypen geführt:

- Urlaub
- Krankheit
- Sonstiges

Feiertage und Wochenenden werden automatisch erkannt und **nicht in die Berechnung aufgenommen**.

### 2. Kalenderfokus

Die Hauptansicht ist eine **Monatsansicht als Kalenderblatt** mit sehr schneller Eingabe:

- Klick auf einen Tag öffnet eine kompakte Statusauswahl
- Optional: Klick-Zyklus für noch schnellere Erfassung
- Farbcodierte Tageszellen
- sichtbare Legende
- Bearbeitung auch für zukünftige Tage

### 3. Monatsauswertung

Für den aktuellen Monat werden angezeigt:

- relevante Arbeitstage im Monat
- bereits erfasste Home-Office-Tage
- bereits erfasste Bürotage
- Abwesenheitstage
- verbleibende relevante Arbeitstage
- erlaubte Home-Office-Tage laut Quote
- bereits verbrauchter Anteil in Prozent
- Warnung bei Überschreitung des Limits

### 4. Historie und Monatswechsel

- Navigation zu vergangenen und zukünftigen Monaten
- Monatszusammenfassung je Monat
- schneller Vergleich von Nutzung und Quote

### 5. Feiertage nach Bundesland

- Auswahl des Bundeslands in den Einstellungen
- automatische Feiertagsberechnung pro Jahr
- Feiertage werden visuell markiert und aus der Quote herausgenommen

### 6. Export und Reports

Geplante Exportformate:

- **CSV** für Weiterverarbeitung
- **JSON** als strukturierter Export/Backup
- **druckbarer Monatsreport** als HTML/Print-to-PDF

---

## Zentrale fachliche Regeln

### Berechnungsbasis

Für einen Monat gilt:

- Wochenenden zählen nicht
- gesetzliche Feiertage zählen nicht
- Abwesenheitstage zählen nicht
- nur verbleibende relevante Arbeitstage zählen in die Quote

### Home-Office-Budget

Standardquote:

- **60 % Home Office / mobil**

Die Quote wird als **konfigurierbarer Wert** in den Einstellungen hinterlegt, standardmäßig 60.

### Wichtige fachliche Annahme

Bei Monaten mit nicht ganzzahligem Ergebnis muss gerundet werden. Für die erste Version sollte die App **konservativ abrunden**:

`erlaubte_HO_Tage = floor(relevante_Arbeitstage * Quote)`

Das vermeidet ungewollte Überschreitungen. Falls im Team stattdessen kaufmännisches Runden verlangt wird, ist das als kleine Konfigurationsoption nachrüstbar.

---

## UX-Konzept

### Hauptscreen

Der Hauptscreen kombiniert drei Bereiche:

1. **Monatsheader**
   - Monat/Jahr
   - Quote
   - Bundesland
   - schneller Monatsstatus

2. **Kalender**
   - große klickbare Tageskacheln
   - klare Zustandsfarben
   - Feiertag/Weekend visuell abgesetzt

3. **Summary Panel**
   - HO genutzt / erlaubt
   - Bürotage
   - Abwesenheiten
   - Resttage
   - Prozentanzeige mit Progressbar

### Schnellbedienung

Ziel ist, dass ein Tag in **1-2 Interaktionen** gepflegt werden kann.

Später sinnvoll, aber nicht zwingend für den ersten Schnitt:

- Tastaturkürzel
- Mehrfachauswahl mehrerer Tage
- "Heute als HO/Büro setzen"

---

## Datenhaltung

### Speichermodell

Alle App-Daten werden in **einer einzigen JSON-Datei** gespeichert, zum Beispiel:

`HOmie.data.json`

Speicherort im produktiven Portable-Betrieb:

- **direkt neben der ausführbaren Datei**

Vorteile:

- leicht zu sichern
- leicht zu übertragen
- transparent
- kein zusätzlicher Dienst, keine Datenbankinstallation

### Beispielstruktur

```json
{
  "schemaVersion": 1,
  "settings": {
    "homeOfficeQuota": 0.6,
    "federalState": "BY",
    "roundingMode": "floor",
    "startWithWindows": false,
    "startMinimizedToTray": true
  },
  "entries": {
    "2026-05-04": { "type": "office" },
    "2026-05-05": { "type": "homeOffice" },
    "2026-05-06": { "type": "absence", "reason": "vacation" }
  }
}
```

### Technische Regeln

- atomisches Schreiben der Datei
- Schema-Versionierung für spätere Migrationen
- defensive Validierung beim Laden
- kein Schreiben in versteckte Systemverzeichnisse, solange Portable-Modus aktiv ist

---

## Architektur

### 1. Desktop Shell

**Electron Main Process**

Verantwortlich für:

- Fenster-Lifecycle
- System-Tray
- Autostart-Integration
- Dateizugriff
- native Dialoge für Import/Export

### 2. Renderer/UI

**React + TypeScript**

Verantwortlich für:

- Kalenderdarstellung
- Eingabefluss
- Auswertungsanzeigen
- Einstellungen
- Exportdialog

### 3. Domain Layer

Separater, testbarer TypeScript-Bereich für:

- Monatsberechnung
- Feiertagsfilter
- Quotenberechnung
- Resttage-Logik
- Report-Zusammenfassung

Wichtig: Die eigentliche Fachlogik darf **nicht** in UI-Komponenten verteilt sein.

### 4. Storage Layer

Separater Zugriff auf:

- Laden/Speichern der JSON-Datei
- Migrationslogik
- Pfadauflösung für Portable-Modus
- Exportdateien

### 5. IPC-Grenze

Renderer greift **nicht direkt** auf Node/Electron APIs zu, sondern über einen klaren **Preload-/IPC-Layer**. Das hält die App sicherer und wartbarer.

---

## Packaging- und Auslieferungsstrategie

### Ziel für Windows

- **portable EXE**
- möglichst ohne Installer
- Datenfile liegt neben der EXE

### Perspektive für macOS/Linux

- gleiche Codebasis
- spätere Builds als ZIP/AppImage/dmg möglich
- plattformspezifische Tray- und Autostart-Funktionen kapseln

---

## Test- und Qualitätsstrategie

Die App soll so aufgebaut werden, dass sie von einem Agenten weitgehend selbst geprüft werden kann.

### Automatisierte Tests

- **Unit-Tests** für Berechnungslogik
- **Unit-Tests** für Feiertags- und Quotenregeln
- **Integrationstests** für Laden/Speichern/Migration
- **Playwright-E2E** für zentrale Klickpfade in der Desktop-App

### Manuelle Smoke-Szenarien

- Monat mit Feiertagen
- Monat mit vielen Abwesenheiten
- Grenzfall genau an 60 %
- Grenzfall knapp über Quote
- Einträge für Zukunft
- Export eines Monatsreports

---

## Geplanter Umsetzungsablauf

### Phase 1 - Projektgrundlage

- Electron/React/TypeScript-Projekt aufsetzen
- Build, Dev-Start und Packaging vorbereiten
- App-Layout und Theming-Grundlage anlegen
- portable Pfadauflösung für Datendatei definieren

### Phase 2 - Fachlogik und Datenmodell

- Typen für Einträge und Einstellungen definieren
- Monatsberechnungsmodul bauen
- Feiertagsintegration nach Bundesland umsetzen
- JSON-Storage mit Schema-Version und Validierung bauen

### Phase 3 - Haupt-UX

- Monatskalender implementieren
- schnelle Tageseingabe umsetzen
- farbliche Statuslogik und Legende einbauen
- Summary Panel mit Quotenstatus ergänzen

### Phase 4 - Einstellungen und Historie

- Einstellungsdialog für Quote, Bundesland, Startverhalten
- Monatsnavigation und historische Übersichten
- Zukunftseinträge sauber unterstützen

### Phase 5 - Export und Reports

- CSV-Export
- JSON-Export
- druckbaren Monatsreport erstellen

### Phase 6 - Desktop-Integration und Feinschliff

- System-Tray
- Autostart
- Start minimiert
- UX-Polish, Shortcuts, leise Animationen

### Phase 7 - Stabilisierung

- Tests vervollständigen
- Fehlerszenarien absichern
- Windows-Portable-Build verifizieren

---

## Sinnvolle Abgrenzung für Version 1

Bewusst **nicht** Teil der ersten Version:

- Cloud-Sync
- Mehrbenutzerbetrieb
- Teamkalender
- Freigaben/Workflows
- Mobile App
- Exchange/Outlook-Integration

So bleibt die erste Version klein, nützlich und schnell lieferbar.

---

## Hauptrisiken und Gegenmaßnahmen

### 1. Unklare Rundungsregel

Risiko:
- Quote wird im Team anders interpretiert

Gegenmaßnahme:
- Rundungsregel zentral kapseln
- später leicht konfigurierbar machen

### 2. Zu komplexe UI im ersten Wurf

Risiko:
- schöne, aber langsame Bedienung

Gegenmaßnahme:
- Monatssicht priorisieren
- nur die schnellsten Interaktionen zuerst bauen

### 3. Dateipfad im Portable-Betrieb

Risiko:
- Schreibrechte oder unerwartete Pfade

Gegenmaßnahme:
- Pfadstrategie früh testen
- klarer Fallback und verständliche Fehlermeldung

---

## Ergebnis dieses Plans

HOmie sollte als **portable, lokale, datenschutzfreundliche Desktop-App** umgesetzt werden, technisch auf **Electron + React + TypeScript** basierend, mit **einer JSON-Datei als alleiniger Datenspeicher**, einer **kalenderzentrierten Schnell-Erfassung**, einer **klaren Monatsquote für Home Office** und **Export-/Report-Funktionen** für die Weitergabe der Daten.
