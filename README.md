# 🌼 Garten der Freunde

Ein gemütliches Sammel- und Pflegespiel für den Browser: Züchte einzigartige
Pflanzenfreunde, kümmere dich liebevoll um sie und lass deinen Garten Tag für
Tag schöner blühen.

## Spielen

Einfach `index.html` im Browser öffnen – fertig. Kein Build, keine
Abhängigkeiten. Alternativ mit einem lokalen Server:

```bash
npx serve .
```

Der Spielstand wird automatisch im Browser gespeichert (localStorage).

## So funktioniert's

- 🌱 **Pflanzen & Gießen** – Kaufe Samen im Gartenladen, pflanze sie in ein
  Beet und gieße sie nach jeder Wachstumsstufe. Aus jeder Blüte erwacht ein
  Freund.
- 🌸 **Einzigartige Freunde** – Jeder Freund wird prozedural erzeugt: Form,
  Farbe, Muster, Augen, Mund und Accessoire ergeben tausende Kombinationen.
  Es gibt vier Seltenheitsstufen: Gewöhnlich, Selten, Episch und **Legendär**.
- 💗 **Freundschaft pflegen** – Gießen, Streicheln und Geschenke stärken die
  Freundschaft. Mit jedem Level produziert ein Freund mehr Sonnenschein –
  bis ihr auf Level 10 **beste Freunde für immer** seid.
- ☀️ **Sonnenschein** – Glückliche Freunde erzeugen Sonnenschein, die Währung
  für neue Samen, Beete und Gartendeko. Wer seine Freunde vernachlässigt,
  findet sie durstig oder schlafend vor (keine Sorge: Freunde sterben nie).
- ⭐ **Tagesziele & Serie** – Jeden Tag warten drei neue Ziele und ein
  Tagesgeschenk. Wer an aufeinanderfolgenden Tagen wiederkommt, verlängert
  seine 🔥-Serie und bekommt an Tag 3 und 7 besondere Samen.
- 📖 **Freundealbum** – Alle erweckten Freunde mit Persönlichkeit, Level und
  Seltenheit auf einen Blick.
- 🦋 **Überraschungen** – Ab und zu flattert Besuch durch den Garten …

## Technik

- Reines HTML/CSS/JavaScript ohne Framework und ohne Build-Schritt
- Freunde werden als SVG zur Laufzeit aus ihrer „DNA" gerendert
- Wachstum und Sonnenschein laufen über Zeitstempel weiter, auch wenn das
  Spiel geschlossen ist – ideal zum Wiederkommen
- Spielstand in `localStorage` (`gardenoffriends_save_v1`)
