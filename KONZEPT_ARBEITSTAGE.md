# Erweiterungskonzept: Arbeitstage und Fahrtage

## 1. Ziel

Die App erfasst künftig neben Auswärtstätigkeiten auch den beruflichen Status eines Kalendertags. Dadurch zeigt die Jahresübersicht getrennt:

- die Anzahl der erfassten Arbeitstage,
- die Anzahl der Tage, an denen die erste Tätigkeitsstätte tatsächlich aufgesucht wurde,
- die Anzahl und Art der Auswärtstage,
- die bisherige Vorschau der Verpflegungspauschalen.

Die tägliche Erfassung bleibt schnell: Zuerst wird beantwortet, ob der ausgewählte Tag ein Arbeitstag war. Bei einem Arbeitstag folgen die Fahrtangabe und die vorhandene Erfassung der Auswärtstätigkeit.

## 2. Fachliche Korrektur des Nutzerfeedbacks

Die reine Zahl der Arbeitstage ist nicht automatisch die Zahl der steuerlich relevanten Fahrttage. Für die Entfernungspauschale ist grundsätzlich jeder Arbeitstag maßgeblich, an dem die erste Tätigkeitsstätte tatsächlich aufgesucht wurde. Ein Homeoffice- oder reiner Außendiensttag kann deshalb ein Arbeitstag ohne Fahrt zur ersten Tätigkeitsstätte sein. Umgekehrt können an einem Tag sowohl eine Fahrt zur ersten Tätigkeitsstätte als auch eine anschließende Auswärtstätigkeit vorliegen.

Die App erfasst deshalb zwei unabhängige Angaben:

1. `Arbeitstag`: Ja, Nein oder noch nicht erfasst.
2. `Erste Tätigkeitsstätte aufgesucht`: Ja, Nein oder noch offen. Diese Angabe erscheint nur bei einem Arbeitstag.

Auch Arbeitstag und Auswärtstätigkeit bleiben fachlich unabhängig. Ein Anreise-, Abreise- oder 24-Stunden-Abwesenheitstag kann zum Beispiel auf ein Wochenende fallen. Deshalb darf `Kein Arbeitstag` einen bestehenden oder ausdrücklich gewünschten Auswärtseintrag nicht löschen oder verhindern.

Amtliche Grundlage: § 9 EStG nennt die Entfernungspauschale für jeden Arbeitstag, an dem die erste Tätigkeitsstätte aufgesucht wird. Die Lohnsteuer-Hinweise behandeln An-/Abreise- und 24-Stunden-Zwischentage als eigene Kalendertagskategorien.

- https://ao.bundesfinanzministerium.de/lsth/2026/A-Einkommensteuergesetz/II-Einkommen-2-24b/4-Ueberschuss-d-Einnahmen-ueber-die-Werbungsk-8-9a/Paragraf-9/paragraf-9.html
- https://ao.bundesfinanzministerium.de/lsth/2026/B-Anhaenge/Anhang-25/III/inhalt.html

Die App dokumentiert Angaben und ersetzt keine steuerliche Prüfung. Insbesondere entscheidet sie nicht, welcher Ort im Einzelfall die erste Tätigkeitsstätte ist.

## 3. Datenmodell

Die vorhandenen Auswärtseinträge bleiben unverändert in `aussenzeit.entries.v1`. Zusätzlich wird `aussenzeit.dayRecords.v1` eingeführt.

Ein Tagesstatus enthält:

```json
{
  "id": "uuid",
  "date": "2026-08-31",
  "year": 2026,
  "workdayStatus": "WORKDAY",
  "primaryWorkplaceVisited": true,
  "createdAt": "ISO-Zeitstempel",
  "updatedAt": "ISO-Zeitstempel"
}
```

Zulässige Werte:

- `workdayStatus`: `WORKDAY` oder `NON_WORKDAY`. Fehlt ein Datensatz, ist der Status offen.
- `primaryWorkplaceVisited`: `true`, `false` oder `null`. Bei `NON_WORKDAY` ist der Wert immer `null`.

Pro Datum gibt es höchstens einen Tagesstatus und höchstens einen Auswärtseintrag. Beide Datensätze dürfen für dasselbe Datum gleichzeitig existieren.

## 4. Startansicht und Erfassungsablauf

### Schritt 1: Arbeitstag

Direkt unter dem ausgewählten Datum erscheint eine Drei-Wege-Auswahl:

- `Offen`: Es wurde noch keine Angabe gespeichert.
- `Ja`: Ein Arbeitstag wird gespeichert.
- `Nein`: Ein Nicht-Arbeitstag wird gespeichert.

Die Auswahl wird sofort lokal gespeichert. Beim Wechsel auf `Offen` wird nur der Tagesstatus entfernt; ein Auswärtseintrag bleibt bestehen.

### Schritt 2: Fahrt zur ersten Tätigkeitsstätte

Bei `Arbeitstag: Ja` erscheint eine zweite Drei-Wege-Auswahl:

- `Offen`: Fahrtangabe fehlt noch.
- `Ja`: Die erste Tätigkeitsstätte wurde aufgesucht.
- `Nein`: Es gab keine Fahrt zur ersten Tätigkeitsstätte.

Nur `Ja` erhöht den Fahrtage-Zähler. Dadurch werden vergessene Angaben nicht fälschlich als `Nein` interpretiert.

### Schritt 3: Auswärtstätigkeit

- Bei einem Arbeitstag öffnet sich die bestehende Auswärtserfassung automatisch.
- Bei einem Nicht-Arbeitstag bleibt sie zunächst kompakt verborgen. Über `Abwesenheit trotzdem erfassen` kann sie für Reise-, An-/Abreise- oder 24-Stunden-Tage geöffnet werden.
- Existiert bereits ein Auswärtseintrag, bleibt dieser unabhängig vom Arbeitstag-Status sichtbar und bearbeitbar.
- Bei offenem Arbeitstag-Status wird für neue Tage zuerst die Arbeitstag-Frage verlangt. Historische Auswärtseinträge bleiben dennoch sichtbar.

Die Bezeichnung `>8h` steht weiterhin für die steuerlich relevante Abwesenheit von Wohnung und erster Tätigkeitsstätte, nicht automatisch für acht Arbeitsstunden oder acht Stunden Außendienst.

## 5. Markierungen im Datumsrad

Das Datumsrad erhält zwei unabhängige, kleine Statuspunkte:

- Blau: Arbeitstag gespeichert.
- Gelb: Auswärtseintrag gespeichert.

Ein Nicht-Arbeitstag wird dezent grau gekennzeichnet. Mehrere Zustände können gleichzeitig sichtbar sein, ohne die bestehende Datumsauswahl zu verändern.

## 6. Jahresübersicht

Der Kopf der Jahresübersicht zeigt:

- `Arbeitstage`: Anzahl eindeutiger Tagesstatus-Datensätze mit `WORKDAY`.
- `Fahrtage`: Anzahl Arbeitstage mit `primaryWorkplaceVisited: true`.
- `Auswärtstage`: Anzahl der vorhandenen Auswärtseinträge.
- `Pauschalen`: bisherige unverbindliche Summe.

Darunter bleiben die vier Kategorien `>8h`, `24h`, `Anreise` und `Abreise` sichtbar.

Die Liste erhält zwei Ansichten:

1. `Arbeit & Fahrten`: Tagesstatus mit Filtern für Arbeitstage, Fahrtage, offene Fahrtangaben und Nicht-Arbeitstage.
2. `Auswärtstage`: bisherige Liste mit Inland-/Ausland- und Kategoriefiltern.

Der Auswahlmodus löscht nur Datensätze der aktuell sichtbaren Ansicht. Das Löschen eines Arbeitstag-Status entfernt keinen Auswärtseintrag und umgekehrt. Vor dem Löschen bleibt die Bestätigungsabfrage erhalten.

## 7. Jahres-CSV

Der Export führt Tagesstatus und Auswärtseintrag nach Datum zusammen. Jede Zeile enthält:

- Datum und Wochentag,
- Arbeitstag: Ja, Nein oder Nicht erfasst,
- erste Tätigkeitsstätte aufgesucht: Ja, Nein, Offen oder nicht anwendbar,
- Auswärtskategorie, Inland/Ausland, Land, Ort,
- Pauschbetragsvorschau und Notiz.

Explizit gespeicherte Nicht-Arbeitstage werden exportiert. Nicht erfasste Kalendertage werden nicht künstlich erzeugt.

## 8. Backup und Bestandsdaten

- Neue Backups enthalten `schemaVersion: 2`, `entries`, `dayRecords` und `settings`.
- Alte Backups ohne `dayRecords` bleiben importierbar.
- Bestehende Auswärtseinträge werden nicht automatisch zu Arbeitstagen erklärt. Eine automatische Migration würde insbesondere bei 24-Stunden-Zwischentagen, Wochenenden und historischen Daten falsche Arbeitstage erzeugen.
- Beim Import werden Tagesstatus wie die bisherigen Einträge vollständig aus dem Backup wiederhergestellt.

## 9. Fehlerfälle und Schutzregeln

- `Kein Arbeitstag` setzt eine eventuell gespeicherte Fahrtangabe zurück, löscht aber keine Auswärtstätigkeit.
- Eine Fahrt zur ersten Tätigkeitsstätte kann nur für einen Arbeitstag gespeichert werden.
- Offene Fahrtangaben werden separat gezählt und in der Liste sichtbar gemacht, damit die Jahreszahl überprüfbar bleibt.
- Jahreszählungen verwenden eindeutige Datumswerte und keine bloße Summe von UI-Aktionen.
- Der Mehrtageseinsatz-Assistent erzeugt weiterhin nur Auswärtseinträge. Er markiert nicht automatisch alle Reisetage als Arbeitstage.
- CSV und Backup bleiben lokal; die App sendet keine Steuer- oder Bewegungsdaten an einen Server.

## 10. Spätere Ausbaustufen

Nicht Bestandteil dieser Umsetzung, aber mit dem Datenmodell vereinbar:

- Entfernung zur ersten Tätigkeitsstätte und Verkehrsmittel,
- Homeoffice als eigener Arbeitstag-Untertyp,
- Soll-/Ist-Vergleich und Hinweis auf offene Fahrtangaben,
- Kalenderimport oder Schichtplan-Vorbelegung,
- länderspezifische Pauschalen als jahresgebundene, vollständig gepflegte Tabelle,
- Berücksichtigung von Arbeitgebererstattungen und gestellten Mahlzeiten.
