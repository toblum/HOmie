# HOmie - Produkt- und Umsetzungsplan

## Zielbild

HOmie ist eine lokale Webanwendung zur einfachen Planung und Erfassung von Home-Office-, Büro- und Abwesenheitstagen. Die App richtet sich an eine einzelne Person im Team-Kontext und soll vor allem zwei Dinge sehr gut können:

1. **Tage extrem schnell erfassen**
2. **den Monatsstatus verständlich und vertrauenswürdig anzeigen**

Die App speichert **alle Nutzdaten lokal im Browser des Nutzers** (IndexedDB), arbeitet **ohne Cloud und ohne Benutzerkonto** und ist als **statische Webanwendung** auf GitHub Pages deploybar – für jeden Nutzer kostenlos und ohne Server-Betrieb zugänglich.

---

## Empfohlene technische Umsetzung

### Primäre Wahl: React + TypeScript + Vite (statische Web-App)

Für HOmie wird gewählt:

- **React** für die Oberfläche
- **TypeScript** im gesamten Applikationscode
- **Vite** für schnellen Frontend-Build und statischen Output
- **date-fns** für Datumslogik
- **date-holidays** für gesetzliche Feiertage nach Bundesland
- **Zustand** als leichtgewichtiges State-Management
- **idb** als typsicherer IndexedDB-Wrapper für browser-lokale Datenhaltung
- **GitHub Pages** als statischer Hosting-Zielort

### Warum diese Wahl

- **keine native OS-Integration notwendig** – alle Kernfunktionen laufen vollständig im Browser
- **kein Server-Betrieb** – statischer Build, direkt deploybar
- **nahezu vollständig TypeScript-basiert**
- **IndexedDB bietet ausreichend Kapazität** für Jahre an Tageseinträgen
- **einfache Portierung** zwischen Geräten via JSON-Export und Restore

### Bewusst nicht gewählt: Electron/Desktop

Electron ermöglicht Tray, Autostart und OS-Notifications. Da diese Features in v1 nicht benötigt werden und ein Web-Deploy einfacher zu warten und zugänglich ist, wird Electron fallen gelassen. Tauri teilt die gleiche Abwägung.

### Bewusst nicht gewählt: Backend / Cloud-Sync

Single-User, datenschutzfreundlich, keine externe Abhängigkeit. Portabilität über Export und Restore statt Sync (→ ADR-0002).

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

### Rundungsmethode

Bei Monaten mit nicht ganzzahligem Ergebnis muss gerundet werden. Die Rundungsmethode ist pro Policy-Eintrag konfigurierbar:

- **Abrunden** (`Math.floor`): konservativ, vermeidet Überschreitungen
- **Kaufmännisch** (`Math.round`): Standardeinstellung für neue Einträge
- **Aufrunden** (`Math.ceil`): grosszügig, maximales Kontingent

Die Rundungsmethode wird im Regelverlauf (Policy History) gespeichert und kann pro Wirksamkeitsmonat geändert werden.

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

Alle App-Daten werden in der **IndexedDB des Browsers** des Nutzers gespeichert. Es gibt keinen Server, keine Cloud und kein Benutzerkonto.

Datenbankname: `homie-browser-storage`

Stores:
- `meta` — Schema-Version, Persönliche Einstellungen (Sprache, Theme, Warnschwelle), ausgeschlossene Tage
- `entries` — Tageseinträge, Key: ISO-Datum (`YYYY-MM-DD`)
- `policyHistory` — Regelverlauf (Quote, Bundesland, Rundungsmethode), Key: Wirksamkeitsmonat

### Portabilität

Da kein Dateisystem zugänglich ist, erfolgt die Portabilität ausschließlich über:

- **JSON-Export** (vollständiges Backup/Restore-Format)
- **CSV-Export** (maschinenlesbare Tageseinträge)
- **Druckbarer Monatsreport** (HTML/Print-to-PDF)

Ein JSON-Export ist ein gültiger Restore-Quell. Restore ersetzt den gesamten lokalen Stand.

### Beispielstruktur des JSON-Exports

```json
{
  "schemaVersion": 2,
  "preferences": {
    "language": "de",
    "theme": "system",
    "warningThreshold": 0.8
  },
  "policyHistory": [
    { "effectiveMonth": "2026-01", "quota": 0.6, "federalState": "BY", "roundingMode": "round" }
  ],
  "entries": [
    { "date": "2026-05-04", "status": "office" },
    { "date": "2026-05-05", "status": "remote-work" },
    { "date": "2026-05-06", "status": "vacation" }
  ],
  "excludedDays": [
    "2026-05-21"
  ]
}
```

### Technische Regeln

- Schema-Versionierung für spätere Migrationen
- Defensive Validierung beim Laden aus dem Browser-Storage
- Atomisch schreiben über IndexedDB-Transaktionen
- Exports verwenden stabile englische kebab-case Status-Codes (unabhängig von der UI-Sprache)

---

## Architektur

### 1. Statisches Hosting

**GitHub Pages**

- Vite baut einen vollständig statischen Asset-Bundle (`dist/`)
- Deploy über GitHub Actions auf `gh-pages`-Branch
- `base: './'` in `vite.config.ts` (relative Pfade für statisches Hosting)

### 2. UI-Schicht

**React + TypeScript**

Verantwortlich für:

- Kalenderdarstellung (Monatsübersicht, Jahresübersicht)
- Eingabefluss und Statuszyklus
- Auswertungsanzeigen (Summary Panel, Monatsstand)
- Einstellungsdialog (Quote, Bundesland, Sprache, Theme, Warnschwelle)
- Export- und Restore-Dialog

### 3. Domain Layer

Separater, testbarer TypeScript-Bereich für:

- Monatsberechnung und Quotenlogik
- Feiertagsfilter nach Bundesland
- Regelverlauf-Auswertung (welche Policy gilt in welchem Monat)
- Resttage-Logik, Monatsstand, Warnschwelle
- Report-Zusammenfassung und CSV-Formatierung

Wichtig: Die eigentliche Fachlogik darf **nicht** in UI-Komponenten verteilt sein.

### 4. Storage Layer

Kapselt den gesamten IndexedDB-Zugriff:

- Laden und Schreiben einzelner Tageseinträge
- Laden und Schreiben des Regelverlaufs
- Laden und Schreiben der Persönlichen Einstellungen
- JSON-Export (vollständiger Dump) und Restore (vollständiger Ersatz)
- CSV-Export der Einträge eines Monats
- Schema-Migrationspfad bei `schemaVersion`-Änderung

### 5. State-Management

**Zustand** als schlanker globaler Store:

- Hält den aktuell angezeigten Monat und die geladenen Daten im Speicher
- Änderungen werden synchron in IndexedDB persistiert
- Kein prop-drilling durch tiefe Komponentenbäume

---

## Packaging- und Auslieferungsstrategie

### Ziel

- **Vollständig statischer Build** via `vite build`
- **Deployment auf GitHub Pages** via GitHub Actions (Branch `gh-pages`)
- Jeder Nutzer öffnet die URL im Browser – kein Download, kein Installer, kein Server
- CI/CD: jeder Push auf `main` löst einen neuen Deploy aus

### Build-Artefakt

- `dist/` enthält HTML, JS, CSS und Assets
- Keine Server-Seitigung, kein Node.js-Runtime nötig

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

### Phase 1 – Projektgrundlage

- Vite/React/TypeScript-Projekt aufsetzen
- ESLint, Vitest und Playwright konfigurieren
- Basis-Layout, Theming-Grundlage und i18n-Vorbereitung anlegen
- IndexedDB-Storage-Schicht mit Schema-Version und Validierung aufbauen

### Phase 2 – Fachlogik und Datenmodell

- Typen für Einträge, Regelverlauf und Einstellungen definieren
- Monatsberechnungsmodul bauen (Arbeitstage, Kontingent, Monatsstand)
- Feiertagsintegration nach Bundesland (date-holidays)
- Regelverlauf-Auswertung: welche Policy gilt in welchem Monat
- JSON-Export und Restore implementieren

### Phase 3 – Haupt-UX

- Monatskalender implementieren
- Schnelle Tageseingabe (Statuszyklus per Klick) umsetzen
- Farbliche Statuslogik und Legende einbauen
- Summary Panel mit Quotenstatus ergänzen

### Phase 4 – Einstellungen und Historie

- Einstellungsdialog für Quote, Bundesland, Sprache, Theme, Warnschwelle
- Regelverlauf anzeigen und bearbeiten (Wirksamkeitsmonat)
- Monatsnavigation und Jahresübersicht
- Zukunftseinträge (Planung) sauber unterstützen

### Phase 5 – Export und Reports

- CSV-Export eines Monats
- JSON-Export (vollständiger Dump) und Restore-Dialog
- Druckbaren Monatsreport erstellen (HTML/Print-to-PDF)

### Phase 6 – Deploy-Pipeline

- GitHub Actions Workflow für automatischen Deploy auf GitHub Pages
- `vite build` mit korrektem `base`-Pfad verifizieren

### Phase 7 – Stabilisierung

- Tests vervollständigen
- Fehlerszenarien absichern (korrupte IndexedDB, leerer Store, Schema-Migration)
- Cross-Browser-Verifikation (Chrome, Firefox, Safari)

---

## Sinnvolle Abgrenzung für Version 1

Bewusst **nicht** Teil der ersten Version:

- Cloud-Sync
- Mehrbenutzerbetrieb
- Teamkalender
- Freigaben/Workflows
- Mobile App
- Exchange/Outlook-Integration
- **Überschreibung** (einzelne Nicht-Arbeitstage als Arbeitstag markieren) — Storage und Domänenlogik vorbereitet, aber kein UI
- **Ausschlusstage verwalten** — Storage und Berechnung vorhanden, aber keine UI-Pflege
- **Notizen** zu Tageseinträgen — Datenmodell unterstützt Notizen, aber kein Eingabefeld im UI

So bleibt die erste Version klein, nützlich und schnell lieferbar.

---

## Hauptrisiken und Gegenmaßnahmen

### 1. Unklare Rundungsregel

Risiko:
- Quote wird im Team anders interpretiert

Gegenmaßnahme:
- Rundungsmethode ist pro Policy-Eintrag konfigurierbar (Abrunden/Kaufmännisch/Aufrunden)
- Standardeinstellung ist kaufmännisches Runden
- Status: umgesetzt

### 2. Zu komplexe UI im ersten Wurf

Risiko:
- schöne, aber langsame Bedienung

Gegenmaßnahme:
- Monatssicht priorisieren
- nur die schnellsten Interaktionen zuerst bauen

### 3. Browser-Storage Verlust

Risiko:
- Nutzer löscht Browser-Daten und verliert alle Einträge

Gegenmaßnahme:
- Regelmäßiger JSON-Export als primäre Sicherungsstrategie klar kommunizieren
- Export-Aktion im UI prominent platzieren

### 4. IndexedDB-Kompatibilität

Risiko:
- Unerwartetes Verhalten in bestimmten Browsern oder Private-Mode

Gegenmaßnahme:
- idb-Wrapper abstrahiert Browser-Unterschiede
- Verständliche Fehlermeldung bei nicht verfügbarem Storage

---

## Ergebnis dieses Plans

HOmie wird als **statische, browser-lokale, datenschutzfreundliche Web-App** umgesetzt, technisch auf **React + TypeScript + Vite** basierend, mit **IndexedDB als alleinigem Datenspeicher im Browser des Nutzers**, einer **kalenderzentrierten Schnell-Erfassung**, einer **klaren Monatsquote für Mobiles Arbeiten** und **Export-/Report-Funktionen** für die Weitergabe und Sicherung der Daten. Die App ist als statische Seite auf GitHub Pages deploybar.
