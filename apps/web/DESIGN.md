---
name: Misión 1-99 — Kinship & Action
---

# Misión 1-99 Web Design System

Normative visual and interaction contract for `apps/web`. Translates the
brand identity into web interfaces. Brand voice, identity, photography, and
visual personality live in [`docs/brand.md`](../../docs/brand.md); when this
document and brand conflict, brand wins.

The terms **must**, **must not**, **should**, and **may** indicate
requirement, prohibition, recommendation, and permission respectively.

## Brand reference

`docs/brand.md` is the authority for identity, voice, and visual direction.
The web system translates that authority into:

- a dual-theme architecture: public for the documentary editorial experience,
  admin for an efficient workspace;
- a predominantly dark editorial palette grounded in near-black charcoal,
  white, intense red, and restrained campaign accents;
- Archivo Narrow for expressive public typography, Inter for body and admin;
- documentary photography that carries the narrative.

Avoid generic religious imagery, cold corporate presentation, and decorative
effects that compete with content.

## Design system architecture

shadcn/ui is the component foundation for `apps/web`. Public and admin share
component source, semantic tokens, accessibility behavior, Tailwind CSS v4
utilities, spacing, and radius.

Two themes are declared at the document-shell level so portalled dialogs,
selects, menus, tooltips, and popovers inherit the correct values:

```html
<body data-theme="public"></body>
<body data-theme="admin"></body>
```

Responsibilities:

- `[data-theme="public"]` defines public shadcn token values.
- `[data-theme="admin"]` defines administrative shadcn token values.
- `.public-ui` owns public layouts and brand-specific composition.
- `.admin-ui` owns administrative layouts and workspace presentation.

shadcn/ui is exclusive to `apps/web`. `apps/api` and `packages/db` remain
independent of UI implementation. The dependency direction remains
`web → HTTP → API → database`.

Astro renders public pages on the server. React islands hydrate only when
interaction requires it. Static content must not become a hydrated island
solely to reuse a visual component.

## Theme tokens

All shared components consume semantic roles instead of hard-coded brand
colors.

Base roles:

- `background` / `foreground`
- `card` / `card-foreground`
- `popover` / `popover-foreground`
- `primary` / `primary-foreground`
- `secondary` / `secondary-foreground`
- `muted` / `muted-foreground`
- `accent` / `accent-foreground`
- `destructive` / `destructive-foreground`
- `border`
- `input`
- `ring`

Interactive color roles additionally define `primary-hover`,
`secondary-hover`, and `accent-hover`. Hover roles must not be used as the
sole active, selected, focus, or validation indicator.

In both themes, `input` is the default control-border color, not the input
surface color. Control surfaces use `background` or `card` according to their
container. `ring` is reserved for focus indication; it does not communicate
success or selection by itself.

### Public theme

The public experience is predominantly dark. Near-black surfaces establish the
default canvas; white provides clarity and negative space, while red carries
the primary action. Alternate sections use tonal dark layers, photography, or
deliberate contrast rather than turning the page into a sequence of light
panels. Light surfaces are exceptional and must serve a clear editorial or
content need.

```css
[data-theme="public"] {
  --background: #111111;
  --foreground: #fff8f7;
  --card: #1e1b1b;
  --card-foreground: #fff8f7;
  --popover: #171515;
  --popover-foreground: #fff8f7;
  --primary: #bb0004;
  --primary-foreground: #ffffff;
  --primary-hover: #930002;
  --secondary: #fecb00;
  --secondary-foreground: #241a00;
  --secondary-hover: #e5b800;
  --muted: #2a2525;
  --muted-foreground: #cdbfbc;
  --accent: #00855b;
  --accent-foreground: #ffffff;
  --accent-hover: #006947;
  --destructive: #ba1a1a;
  --destructive-foreground: #ffffff;
  --border: #493b39;
  --input: #806b67;
  --ring: #006947;
  --radius: 0.5rem;
}
```

Red is the primary public action color. Amber is a supporting highlight, not
a universal warning. Green is a restrained positive accent and focus color.
Secondary campaign colors never displace the near-black, white, and red core
or fragment the overall page palette.

### Admin theme

```css
[data-theme="admin"] {
  --background: #f7f7f8;
  --foreground: #1f2937;
  --card: #ffffff;
  --card-foreground: #1f2937;
  --popover: #ffffff;
  --popover-foreground: #1f2937;
  --primary: #1d4ed8;
  --primary-foreground: #ffffff;
  --primary-hover: #1e40af;
  --secondary: #e5e7eb;
  --secondary-foreground: #1f2937;
  --secondary-hover: #d1d5db;
  --muted: #f3f4f6;
  --muted-foreground: #4b5563;
  --accent: #dbeafe;
  --accent-foreground: #1e40af;
  --accent-hover: #bfdbfe;
  --destructive: #b91c1c;
  --destructive-foreground: #ffffff;
  --border: #d1d5db;
  --input: #d1d5db;
  --ring: #2563eb;
  --radius: 0.5rem;
}
```

The admin theme prioritizes clarity and efficient content management. It
remains related to the product without reproducing the public editorial
layout.

## Typography

Inter is the global interface and body typeface. Archivo Narrow is the
public display typeface.

```css
[data-theme="public"] {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Archivo Narrow", "Arial Narrow", ui-sans-serif, sans-serif;
}

[data-theme="admin"] {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Inter", ui-sans-serif, system-ui, sans-serif;
}
```

| Role                  | Family         | Size                       | Weight | Line height |
| --------------------- | -------------- | -------------------------- | -----: | ----------: |
| Public display        | Archivo Narrow | `clamp(3rem, 7vw, 4.5rem)` |    700 |        1.05 |
| Public heading large  | Archivo Narrow | `clamp(2rem, 5vw, 3rem)`   |    700 |        1.15 |
| Public heading medium | Archivo Narrow | `clamp(1.5rem, 3vw, 2rem)` |    600 |        1.25 |
| Heading small         | Inter          | `1.25rem`                  |    600 |        1.35 |
| Admin heading large   | Inter          | `1.875rem`                 |    700 |         1.2 |
| Admin heading medium  | Inter          | `1.5rem`                   |    600 |         1.3 |
| Body large            | Inter          | `1.125rem`                 |    400 |         1.6 |
| Body medium           | Inter          | `1rem`                     |    400 |         1.5 |
| Body small            | Inter          | `0.875rem`                 |    400 |         1.5 |
| Label                 | Inter          | `0.875rem`                 |    600 |         1.4 |

Public calls to action and short editorial labels may use Archivo Narrow and
uppercase treatment. Admin controls use Inter and sentence case.

Long-form prose uses `max-width: 65ch`; short labels, controls, tables, and
data grids are exempt. Load only the weights used by the rendered page and
preserve the documented system fallbacks.

## Layout and spacing

The system uses Tailwind's 4px spacing foundation. Public and admin share the
scale but apply different density rules.

```yaml
spacing:
  base-unit: "0.25rem"

layout:
  public:
    container-max: "75rem"
    page-gutter: "clamp(1rem, 5vw, 4rem)"
    section-space: "clamp(4rem, 8vw, 7rem)"
    content-gap: "clamp(1.5rem, 4vw, 3rem)"
    reading-width: "65ch"
  admin:
    container-max: "100%"
    page-gutter: "clamp(1rem, 3vw, 2rem)"
    section-space: "2rem"
    content-gap: "1.5rem"
    form-max: "48rem"
```

Public editorial compositions may use a 12-column desktop grid. Repeated
cards use simpler responsive grids. Mobile defaults to one primary content
column; additional columns may be introduced only when every item remains
readable without horizontal page overflow. Breakpoints follow the configured
Tailwind breakpoints.

Full-width section backgrounds may contain constrained content. Preserve
logical DOM order in asymmetric layouts. Remove decorative overlap when it
compromises readability or creates horizontal overflow.

Admin screens use the available workspace width. Standard forms stay near
`48rem`; tables may grow or use controlled horizontal scrolling.

## Elevation and depth

Prefer tonal layering, borders, photography, and restrained editorial
overlap over prominent shadows.

| Level   | Treatment                      | Use                                     |
| ------- | ------------------------------ | --------------------------------------- |
| Flat    | No shadow                      | Sections, forms, standard cards, tables |
| Raised  | Soft 5% charcoal shadow        | Featured content and sticky navigation  |
| Overlay | Controlled 12% charcoal shadow | Dialogs, menus, selects, popovers       |

```css
:root {
  --shadow-raised: 0 12px 32px rgb(34 31 31 / 5%);
  --shadow-overlay: 0 20px 48px rgb(34 31 31 / 12%);
}
```

Standard cards have no shadow. Text over photography requires a controlled
contrast layer verified against the final image. Editorial overlap must
preserve reading order, visibility, and viewport containment.

## Shape language

The shape system balances assertive typography with approachable, moderately
rounded surfaces.

| Role        |  Value | Use                                           |
| ----------- | -----: | --------------------------------------------- |
| Small       |    4px | Compact indicators and badges                 |
| Medium      |    8px | Inputs, standard buttons, cards               |
| Large       |   16px | Featured actions, dialogs, feature containers |
| Extra large |   24px | Large public media and editorial blocks       |
| Full        | 9999px | Avatars, chips, deliberate pill controls      |

`--radius` represents the medium value (8px). Implementations derive the
other values from explicit radius utilities or aliases; they must not
interpret `--radius` as the radius for every component.

Pill-shaped controls are exceptional rather than default. Full-width imagery
may remain square. Logos are never cropped, masked, or forced into circles; a
logo container may be rounded while the asset remains intact.

## Component ownership

shadcn/ui components are project-owned source code living in:

```text
apps/web/src/components/ui
```

Project composition lives outside the primitive layer:

```text
apps/web/src/components/public
apps/web/src/components/admin
```

Do not place business rules, API requests, route decisions, or
feature-specific copy inside `components/ui`.

## Components

### Buttons and actions

Shared Button implementations consume semantic tokens and support:

| Variant     | Purpose                                          |
| ----------- | ------------------------------------------------ |
| Default     | Primary action in the current context            |
| Secondary   | Important supporting action                      |
| Outline     | Alternative or cancel action                     |
| Ghost       | Low-emphasis and compact controls                |
| Destructive | Irreversible or damaging actions                 |
| Link        | Button-aligned textual navigation when necessary |

Use anchors for navigation and buttons for actions. Links may use
`buttonVariants` without losing navigation semantics.

Small buttons support compact controls, default buttons support general
actions, and large buttons support important public calls to action.
Primary touch targets must provide a hit area of at least 44 by 44 CSS
pixels. Dense admin controls may use a smaller visible control only when
spacing or an expanded hit area prevents overlapping targets and still
satisfies WCAG 2.2 target-size requirements.

Every interactive variant defines default, hover, active, focus-visible, and
disabled states. Controls that initiate asynchronous work also define a
loading state, preserve their width, prevent duplicate activation, expose
the busy state with `aria-busy`, and retain an accessible name.

Public typography, uppercase labels, large sizing, and pill shapes are
composition-level choices, not defaults of the shared Button primitive.

### Cards

The shared Card is a neutral grouping primitive with `card` background,
`card-foreground` text, `border` outline, medium radius, and no shadow.

Cards support media but do not require it. Use Card boundaries only when
they improve grouping. Avoid unnecessary nested cards.

- **Mission cards** may contain a verified project logo, name, short
  description, optional documentary image, and navigation when a valid
  destination exists. Do not invent missing names, descriptions, states, or
  destinations.
- **Publication cards** consume only fields guaranteed by the product
  contract: optional cover image, title, and slug. Do not invent author,
  date, category, summary, or reading time.
- **Featured outing** appears directly after the hero without an additional
  section title. It contains title, location, optional image, and navigation
  when a destination exists. Do not invent date, price, availability, or
  registration information.
- **Admin cards** use moderate spacing and no shadow by default. Prefer
  direct section structure for forms or tables when another boundary adds
  no value.

### Forms and input fields

Standard fields use a complete outlined container, semantic tokens, and
medium radius. Bottom-border-only fields are not the global default.

A complete field may contain a visible label, optional description, control,
and validation message. Placeholders never replace labels.

Every control defines the states supported by its semantics: empty or
populated, hover when pointer-interactive, focus-visible, disabled, readonly
when supported, and invalid when validation applies. Controls involved in
asynchronous work also define a loading or busy state. Invalid controls use
`aria-invalid` and associate textual messages through `aria-describedby`.

Standard text inputs and selects have a minimum visible height of 40px and
obey the target-size rule for actions. Textareas resize vertically unless a
specific interaction requires a fixed editor viewport.

Prefer native controls when they satisfy the interaction. Rich shadcn
controls must justify their additional keyboard, focus, portal, and
accessibility responsibilities.

Admin React forms standardize on Zod for client schemas, React Hook Form
for state, and shadcn field components for presentation. API validation
remains authoritative.

The system supports public form controls but does not introduce a contact
form when the product provides only email and telephone contact actions.

### File upload

File upload experiences communicate accepted formats and maximum size before
selection, then the selected file, submission state, success or failure, and
available replacement or removal actions. Determinate progress is shown
only when the upload implementation reports measurable progress; otherwise
use an indeterminate busy state. Drag-and-drop may supplement but never
replace keyboard-accessible file selection.

### Lists, badges, and chips

- Lists structure related content.
- Badges communicate non-interactive metadata or status.
- Chips represent filters, selections, or removable values.

They must represent real product data. Do not invent decorative states such
as "Active Project" or "Urgent Need".

Badge variants include default, secondary, outline, destructive, and accent
when a recurring positive state requires it. Color is never the only status
indicator, and raw enum values are translated into human-readable labels.

Interactive chips use appropriate button, toggle, checkbox, or toggle-group
semantics with selected, hover, focus-visible, and keyboard states.

Prefer open lists with subtle dividers when card boundaries create
unnecessary noise. Use semantic lists, description lists, or tables according
to the content relationship.

## Brand assets

Only client-supplied or explicitly approved assets are official brand
elements.

### Institutional logo

The client-supplied institutional logo is the primary mark for Misión 1-99.
Use it in the public header, footer, and other contexts where institutional
identification is necessary.

Preserve its original proportions, colors, transparency, clear space, and
visual integrity. Do not stretch, rotate, crop, recolor, outline, mask, or
apply decorative effects.

### Mission logos

Supplied mission logos represent individual ministry projects. They are not
alternate versions of the Misión 1-99 identity.

Associate every project logo with its verified mission. Present logos in a
consistent neutral area while preserving proportions with
`object-fit: contain`. Do not invent project names or associations.

### Mascot

The Lamb (`El Cordero`) is the official character described in
`docs/brand.md`. Until the client explicitly approves an independent mascot
system and supplies appropriate assets, the character may only appear as
part of its original asset. Do not extract, redraw, animate, generate
additional poses for, or use the character independently in success, error,
or empty states.

### Asset formats and accessibility

Prefer official SVG assets, then transparent high-resolution PNG assets. Use
optimized raster formats for photography. Do not automatically vectorize a
raster logo without visual and client approval.

Brand assets must maintain sufficient contrast. Alternative text reflects
each asset's function and surrounding context without redundant
announcements.

## Photography

Photography carries narrative weight and emotional depth. Apply the
photography direction in `docs/brand.md`: real, unposed, non-artificial
imagery of streets, conversations, prayer, service, public transport,
plazas, universities, neighborhoods, communities, and smiles. People must
feel authentic.

Avoid generic stock photography, staged prayer imagery, artificial light
rays, excessive filters, isolated religious symbols without context, and
imagery that portrays communities without dignity or agency. Warm grading is
acceptable, but skin tones remain natural.

## Public information architecture

The target primary navigation is ordered:

1. Inicio
2. Misiones
3. Publicaciones
4. Nosotros
5. Contacto

The landing composes in this order; relative order is preserved when
optional sections are absent:

1. Header
2. Hero / Inicio
3. Featured outing
4. Misiones
5. Publicaciones
6. Nosotros
7. Contacto
8. Current verse
9. Footer

Implemented landing anchors are stable:

- `#inicio`
- `#misiones`
- `#publicaciones`
- `#nosotros`
- `#contacto`

Sticky navigation accounts for anchor positioning through scroll margin.

Optional sections omit themselves when their data is absent; they must not
render empty containers.

### Misiones

Misiones presents ministry projects associated with Misión 1-99. It is
distinct from the institutional mission statement shown under Nosotros.

Each mission requires a verified identifier, name, logo, and short
description. A mission action appears only when a valid destination exists.
Do not invent status, urgency, metrics, donation, registration, or
ownership data.

### Publicaciones

The landing presents selected publications using available title, optional
cover image, and slug data.

- "Ver todas las publicaciones" navigates to `/posts`.
- Publication actions navigate to `/posts/[slug]`.

### Nosotros

Nosotros contains the institutional description or manifesto, mission
statement, vision statement, and optional featured video. Unless a dedicated
manifesto field is introduced, the current description field supplies the
institutional narrative.

### Contacto

Contacto uses available email and telephone values and may provide `mailto:`
and `tel:` actions. Do not introduce forms, maps, addresses, social
networks, office hours, or donations without corresponding product
capabilities.

## Accessibility

Public and admin interfaces target WCAG 2.2 AA.

All experiences provide:

- complete keyboard operation;
- visible focus using the active theme's `ring` token;
- semantic HTML and logical heading order;
- persistent labels for controls;
- contextual text alternatives;
- textual validation and status feedback;
- touch-friendly interactive targets;
- readable layouts from 320px without page overflow;
- support for `prefers-reduced-motion`.

Normal text requires a contrast ratio of at least 4.5:1. Large text requires
at least 3:1, using the WCAG definition of at least 18pt regular or 14pt
bold. Visual information required to identify user-interface components and
their states requires at least 3:1 against adjacent colors. Color, position,
animation, and iconography must not be the only way information is
communicated.

Accessibility behavior provided by shadcn components must be preserved when
their styles or composition are customized.

## Motion

Motion reinforces hierarchy and state; it does not decorate every
interaction.

- Use transitions between 150ms and 250ms.
- Prefer opacity and transform.
- Avoid large parallax effects and continuous decorative animation.
- Do not delay access to content through entrance sequences.
- Limit admin motion to state and hierarchy feedback.
- Preserve focus expectations of interactive components.
- Disable nonessential motion under `prefers-reduced-motion`.

Content and controls remain understandable when animation is unavailable.

## Design acceptance checklist

- [ ] shadcn/ui is the shared component foundation for `apps/web`.
- [ ] Public and admin interfaces use separate theme contexts.
- [ ] Public presentation follows the brand identity in `docs/brand.md`.
- [ ] The public canvas is predominantly near-black; light surfaces remain
      intentional exceptions.
- [ ] Admin presentation remains clear and operational.
- [ ] Mission logos are treated as independent project identities.
- [ ] Misiones and the institutional mission statement remain distinct.
- [ ] Archivo Narrow is reserved for expressive public typography.
- [ ] Inter is the global interface and body typeface.
- [ ] Components consume semantic tokens instead of hard-coded colors.
- [ ] Hover roles exist for every interactive color role in both themes.
- [ ] `input` is used as a control-border role and `ring` as a focus role.
- [ ] Cards have no shadow by default.
- [ ] Buttons and links preserve correct HTML semantics.
- [ ] Forms provide visible labels and accessible validation.
- [ ] Primary touch targets provide a hit area of at least 44 by 44 CSS pixels.
- [ ] Optional public sections do not render empty containers.
- [ ] No content fields, statuses, or capabilities are invented.
- [ ] Keyboard focus remains visible.
- [ ] Color contrast meets WCAG 2.2 AA.
- [ ] Layouts remain usable from 320px without page overflow.
- [ ] Nonessential motion respects `prefers-reduced-motion`.
