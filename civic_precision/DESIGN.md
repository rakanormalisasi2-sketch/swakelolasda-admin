# Design System Specification: Engineering Precision & Editorial Elegance

## 1. Overview & Creative North Star: "The Architectural Blueprint"

The North Star for this design system is **"The Architectural Blueprint."** In the context of government engineering (Dinas PU), the UI must mirror the precision of a technical drawing while maintaining the prestige of a high-end editorial publication. 

We move beyond "government software" tropes by embracing **Intentional Asymmetry** and **Tonal Depth**. The interface is not a collection of boxes; it is a series of layered, translucent planes that organize complex technical data into a legible, authoritative hierarchy. By utilizing glassmorphism and eliminating harsh borders, we create a digital environment that feels breathable, modern, and profoundly professional.

---

## 2. Colors & Surface Logic

The palette uses deep Slates (`primary`), professional Blues (`secondary`), and functional Emeralds (`tertiary`). 

### The "No-Line" Rule
Traditional 1px solid borders are strictly prohibited for sectioning. Structural boundaries must be defined through:
1.  **Background Color Shifts:** Placing a `surface-container-lowest` card on a `surface-container-low` background.
2.  **Tonal Transitions:** Utilizing subtle shifts between `surface` and `surface-dim`.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of frosted glass sheets.
- **Base Level:** `surface` (#f8f9ff)
- **Sectioning:** `surface-container-low` (#eff4ff)
- **Interactive Elements/Cards:** `surface-container-lowest` (#ffffff)
- **Overlays/Modals:** `surface-container-highest` (#d3e4fe) with 80% opacity and `backdrop-filter: blur(12px)`.

### Glass & Gradient Signature
To elevate the "Dinas PU" brand, use a **Linear Polish Gradient** on primary actions:
- **CTA Gradient:** `primary` (#00346f) to `primary-container` (#004a99) at a 135-degree angle.
- **Glassmorphism:** For sidebars or floating data panels, use `surface_container_low` at 70% opacity with a 16px blur to allow map or telemetry data to bleed through subtly.

---

## 3. Typography: Technical Authority

We pair the neutrality of **Inter** with the precision of a monospaced font for data.

- **Display & Headlines:** Use `Inter` with tight letter-spacing (-0.02em) and "SemiBold" weights to convey stability.
- **Technical Data:** Any numerical value, coordinate, or engineering metric must be rendered in **Roboto Mono** (or Inter with `font-variant-numeric: tabular-nums`) to ensure vertical alignment in data-heavy tables.
- **Hierarchy:** 
    - `display-lg`: For high-level KPI dashboards.
    - `label-md/sm`: For metadata, using `on-surface-variant` (#424751) to reduce visual noise.

---

## 4. Elevation & Depth: The Layering Principle

### Tonal Layering
Depth is achieved by "stacking" tokens. Never use a shadow where a color shift can work.
- **Example:** A map legend should be `surface-container-highest` sitting atop a map view, creating natural separation without artificial "boxiness."

### Ambient Shadows
For floating elements (modals, dropdowns), use "Atmospheric Shadows":
- **Value:** `box-shadow: 0 12px 32px -4px rgba(11, 28, 48, 0.08);`
- **Logic:** The shadow color is a tinted version of `on-surface` (#0b1c30), creating a more natural, integrated look than neutral grey.

### The "Ghost Border"
When accessibility requires a border (e.g., in high-glare environments), use the **Ghost Border**:
- **Token:** `outline-variant` (#c2c6d3) at **15% opacity**. This provides a "crisp" edge without breaking the fluid glass aesthetic.

---

## 5. Components

### Buttons: The Precision Triggers
- **Primary:** Gradient fill (`primary` to `primary-container`), `md` (0.375rem) corner radius. Subtle inner-glow on hover.
- **Secondary:** Transparent background with a `Ghost Border`. Text in `primary`.
- **Tertiary (Emerald):** Used exclusively for "Success" or "Authorized" engineering states. Uses `tertiary-container`.

### Data Cards & Lists
- **Prohibition:** No horizontal dividers (`<hr>`).
- **Execution:** Use vertical white space from the 8px grid scale. Group related data points using a `surface-container-low` background "pill" to encapsulate information.
- **Micro-interaction:** On hover, a card should shift from `surface-container-lowest` to `surface-bright` with a 2px vertical lift.

### Input Fields: Technical Entry
- **State:** Default fields use `surface-container-low` with no border. 
- **Active:** Transition to `surface-container-lowest` with a 1px `primary` bottom-border only, mimicking a blueprint signature line.

### Engineering-Specific Components
- **The "Telemetry Strip":** A high-density, horizontal glass bar at the bottom of the viewport using `surface-container-highest` (60% opacity) to display real-time status updates without obscuring the main canvas.
- **Status Monoliths:** Large, bold typography labels for "Project Status" using `tertiary-fixed` (#6ffbbe) backgrounds for positive engineering milestones.

---

## 6. Do's and Don'ts

### Do
- **Do** use `Roboto Mono` for all coordinate and budget figures to ensure legibility.
- **Do** utilize `surface-dim` for "inactive" or "historical" data sections.
- **Do** maximize white space; let the technical data "breathe" to avoid user fatigue in high-stress engineering environments.

### Don't
- **Don't** use 100% black (#000000). Always use `on-surface` (#0b1c30) for text to maintain the Slate/Blue tonal harmony.
- **Don't** use standard "Drop Shadows." Only use Ambient Shadows or Tonal Layering.
- **Don't** use rounded corners larger than `xl` (0.75rem). Engineering requires "crispness"—overly rounded "bubble" UI feels too consumer-grade and lacks authority.