# Color Palette — Conference2 (home.ejs)

All colors originate from CSS custom properties defined in `color-overrides.css` and inline styles in the EJS templates.

---

## Core Palette (CSS Custom Properties)

Defined in `/public/assets/shared/inline/css/color-overrides.css` under `:root`.

| Name            | Variable                                  | Hex       | Swatch | Usage                                       |
|-----------------|-------------------------------------------|-----------|--------|----------------------------------------------|
| **Clay**        | `--_primitives---colors--clay`            | `#6e3527` | 🟫     | Primary headings, hero heading text          |
| **Dark Brown**  | `--_primitives---colors--dark-brown`      | `#3d2b27` | ⬛     | Deep backgrounds, dark UI surfaces           |
| **Earth**       | `--_primitives---colors--earth`           | `#8f6248` | 🟤     | Secondary text, about-section labels         |
| **Pop (Gold)**  | `--_primitives---colors--pop`             | `#cb9635` | 🟡     | Accent labels ("Agenda at a glance"), tags   |
| **Cream**       | `--_primitives---colors--cream`           | `#f4ece4` | 🟠     | Section headings (Featured Insight)          |
| **Light Orange**| `--_primitives---colors--light-orange`    | `#f8efe6` | 🍑     | Light backgrounds, subtle fills              |
| **Middle Cream**| `--_primitives---colors--middle-cream`    | `#ddd4cc` | 🩶     | Value card accent lines                      |
| **White**       | `--_primitives---colors--white`           | `#ffffff` | ⬜     | Body text on dark backgrounds, agenda lists  |
| **Seafoam**     | `--_primitives---colors--seafoam`         | `#b7dcc2` | 🟢     | Value card accent lines                      |
| **Lines on Brown** | `--_primitives---colors--lines-on-brown` | `#5a413b` | 🟫     | Dividers/borders on dark-brown surfaces      |

---

## Inline Colors (hardcoded in home.ejs)

These appear directly as `style="..."` attributes in the HTML.

| Color              | Value              | Where Used                                           |
|--------------------|--------------------|------------------------------------------------------|
| **Burnt Sienna**   | `rgb(123, 61, 44)` | Featured Insight card background                     |
| **Warm Orange**    | `rgb(231, 135, 69)`| Featured Insight label/tag text                      |
| **White**          | `rgb(255, 255, 255)`| Featured Insight content text                        |

---

## CSS Utility Classes → Color Mapping

Used throughout the EJS templates as semantic class names:

| Class                 | Maps To          | Hex       |
|-----------------------|------------------|-----------|
| `.text-color-clay`    | Clay             | `#6e3527` |
| `.text-color-pop`     | Pop (Gold)       | `#cb9635` |
| `.text-color-cream`   | Cream            | `#f4ece4` |
| `.text-color-earth`   | Earth            | `#8f6248` |
| `.text-color-white`   | White            | `#ffffff` |

---

## Accent Line Classes

Used on value-card left-borders (currently in a commented-out section):

| Class              | Maps To       | Hex       |
|--------------------|---------------|-----------|
| `.left-line.pop`   | Pop (Gold)    | `#cb9635` |
| `.left-line.seafoam` | Seafoam     | `#b7dcc2` |
| `.left-line.earth` | Earth         | `#8f6248` |
| `.left-line.middle-cream` | Middle Cream | `#ddd4cc` |

---

## UI/Scrollbar Colors (utility CSS files)

| Color        | Hex       | Where Used                     |
|--------------|-----------|--------------------------------|
| Border Beige | `#e6dfda` | Left/right column borders      |
| Focus Blue   | `#4d65ff` | Focus outline ring             |
| Light Gray   | `#f1f1f1` | Scrollbar track, thumb border  |
| Black        | `#000000` | Scrollbar thumb                |

---

## Visual Summary

```
Dark ◀━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━▶ Light

#3d2b27  #5a413b  #6e3527  #8f6248  #cb9635  #ddd4cc  #f4ece4  #f8efe6  #ffffff
Dark     Lines    Clay     Earth    Pop/Gold Mid-Cream Cream   Lt-Orange White
Brown    on Brown                                                         

Accent: #b7dcc2 (Seafoam)
Inline:  rgb(123,61,44) (Burnt Sienna)  |  rgb(231,135,69) (Warm Orange)
```
