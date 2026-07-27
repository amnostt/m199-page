---
name: Misión 1-99 — Kinship & Action
---

# Misión 1-99 Design System

This document defines the target design system for `apps/web`. It is the source
of truth for public and administrative visual decisions, component usage, and
interaction standards.

## Design-system architecture

shadcn/ui is the global component foundation for `apps/web`. Public and
administrative experiences share component source, semantic token names,
accessibility behavior, Tailwind CSS v4 utilities, spacing, and radius
foundations.

The two experiences use separate visual themes:

| Theme | Context | Purpose |
| --- | --- | --- |
| `public` | Public website and content routes | Express the Kinship & Action identity |
| `admin` | Authenticated administration | Provide a clear, efficient workspace |

The active theme is declared at the document-shell level so portalled dialogs,
selects, menus, tooltips, and popovers inherit the correct values:

```html
<body data-theme="public">
```

```html
<body data-theme="admin">
```

Theme context and structural scope have separate responsibilities:

- `[data-theme="public"]` defines public shadcn token values.
- `[data-theme="admin"]` defines administrative shadcn token values.
- `.public-ui` owns public layouts and brand-specific presentation.
- `.admin-ui` owns administrative layouts and workspace presentation.

Destructive shadcn adoption may replace provisional components and styles. It
must preserve observable behavior, routes, accessibility, server-rendering
boundaries, API contracts, authentication, and authorization.

shadcn/ui belongs exclusively to `apps/web`. `apps/api` and `packages/db` remain
independent of UI implementation. The dependency direction remains:

```text
web → HTTP → API → database
```

## Brand and style

Kinship & Action presents Misión 1-99 as a contemporary Christian ministry that
prioritizes active service over religious formality.

The identity is:

| Attribute | Expression |
| --- | --- |
| Warm | Warm backgrounds, human photography, approachable shapes |
| Active | Bold red, condensed headings, dynamic composition |
| Hopeful | Restrained amber and green accents |
| Human | Documentary imagery and authentic stories |
| Contemporary | Clear hierarchy, flat surfaces, responsive layouts |
| Grounded | Charcoal text and restrained decoration |

The visual direction is Editorial / Urban Modern. It combines strong condensed
typography, documentary photography, generous whitespace, and clear calls to
action. Avoid generic religious imagery and cold corporate presentation.

## Brand assets

Only client-supplied or explicitly approved assets are official brand elements.

### Institutional logo

`logo-solo (1).png` is the primary institutional logo for Misión 1-99. Use it in
the public header, footer, and other contexts where institutional identification
is necessary.

Preserve its original proportions, colors, transparency, clear space, and
visual integrity. Do not stretch, rotate, crop, recolor, outline, mask, or apply
decorative effects to it.

### Mission logos

The remaining supplied logos represent individual ministry projects. They are
not alternate versions of the Misión 1-99 identity.

Associate every project logo with its verified mission. Present logos in a
consistent neutral area while preserving their proportions with
`object-fit: contain`. Do not invent project names or associations.

### Mascot status

A character appearing inside an approved logo is not automatically an
independent mascot. Until the client explicitly approves a mascot system and
supplies appropriate assets, the character may only appear as part of its
original asset.

Do not extract, redraw, animate, generate additional poses for, or use the
character independently in success, error, or empty states.

### Asset formats and accessibility

Prefer official SVG assets, then transparent high-resolution PNG assets. Use
optimized raster formats for photography. Do not automatically vectorize a
raster logo without visual and client approval.

Brand assets must maintain sufficient contrast. Alternative text reflects each
asset's function and surrounding context without redundant announcements.

## Theme tokens

All shared components consume semantic roles instead of hard-coded brand
colors:

- `background` / `foreground`;
- `card` / `card-foreground`;
- `popover` / `popover-foreground`;
- `primary` / `primary-foreground`;
- `secondary` / `secondary-foreground`;
- `muted` / `muted-foreground`;
- `accent` / `accent-foreground`;
- `destructive` / `destructive-foreground`;
- `border`;
- `input`;
- `ring`.

### Public theme

```css
[data-theme="public"] {
  --background: #fff8f7;
  --foreground: #1e1b1b;
  --card: #ffffff;
  --card-foreground: #1e1b1b;
  --popover: #ffffff;
  --popover-foreground: #1e1b1b;
  --primary: #bb0004;
  --primary-foreground: #ffffff;
  --primary-hover: #930002;
  --secondary: #fecb00;
  --secondary-foreground: #241a00;
  --secondary-hover: #e5b800;
  --muted: #f4ecec;
  --muted-foreground: #5d3f3b;
  --accent: #00855b;
  --accent-foreground: #ffffff;
  --accent-hover: #006947;
  --destructive: #ba1a1a;
  --destructive-foreground: #ffffff;
  --border: #e7bdb7;
  --input: #926f69;
  --ring: #006947;
  --radius: 0.5rem;
}
```

Red is the primary public action color. Amber is a supporting highlight or
secondary action color, not a universal warning. Green is a restrained positive
accent and focus color. Color must not be the only state indicator.

### Administrative theme

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
  --muted: #f3f4f6;
  --muted-foreground: #4b5563;
  --accent: #dbeafe;
  --accent-foreground: #1e40af;
  --destructive: #b91c1c;
  --destructive-foreground: #ffffff;
  --border: #d1d5db;
  --input: #d1d5db;
  --ring: #2563eb;
  --radius: 0.5rem;
}
```

The administrative theme prioritizes clarity and efficient content management.
It remains related to the product without reproducing the public editorial
layout.

## Typography

Inter is the global interface and body typeface. Archivo Narrow is the public
display typeface.

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

| Role | Family | Size | Weight | Line height |
| --- | --- | --- | ---: | ---: |
| Public display | Archivo Narrow | `clamp(3rem, 7vw, 4.5rem)` | 700 | 1.05 |
| Public heading large | Archivo Narrow | `clamp(2rem, 5vw, 3rem)` | 700 | 1.15 |
| Public heading medium | Archivo Narrow | `clamp(1.5rem, 3vw, 2rem)` | 600 | 1.25 |
| Heading small | Inter | `1.25rem` | 600 | 1.35 |
| Body large | Inter | `1.125rem` | 400 | 1.6 |
| Body medium | Inter | `1rem` | 400 | 1.5 |
| Body small | Inter | `0.875rem` | 400 | 1.5 |
| Label | Inter | `0.875rem` | 600 | 1.4 |

Public calls to action and short editorial labels may use Archivo Narrow and
uppercase treatment. Administrative controls use Inter and sentence case.

Limit long-form text to approximately `65ch`. Load only required font weights
and preserve system fallbacks.

## Layout and spacing

The system uses Tailwind's 4px spacing foundation. Public and administrative
experiences share the scale but apply different density rules.

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

Public editorial compositions may use a 12-column desktop grid. Repeated cards
use simpler responsive grids. Mobile defaults to one primary content column;
tablet may introduce two columns.

Full-width section backgrounds may contain constrained content. Preserve
logical DOM order in asymmetric layouts. Remove decorative overlap when it
compromises readability or creates horizontal overflow.

Administrative screens use the available workspace width. Standard forms stay
near `48rem`; tables may grow or use controlled horizontal scrolling.

## Elevation and depth

Prefer tonal layering, borders, photography, and restrained editorial overlap
over prominent shadows.

| Level | Treatment | Use |
| --- | --- | --- |
| Flat | No shadow | Sections, forms, standard cards, tables |
| Raised | Soft 5% charcoal shadow | Featured content and sticky navigation |
| Overlay | Controlled 12% charcoal shadow | Dialogs, menus, selects, popovers |

```css
:root {
  --shadow-raised: 0 12px 32px rgb(34 31 31 / 5%);
  --shadow-overlay: 0 20px 48px rgb(34 31 31 / 12%);
}
```

Standard Cards have no shadow. Text over photography requires a controlled
contrast layer verified against the final image. Editorial overlap must preserve
reading order, visibility, and viewport containment.

## Shape language

The shape system balances assertive typography with approachable, moderately
rounded surfaces.

| Role | Value | Use |
| --- | ---: | --- |
| Small | 4px | Compact indicators and badges |
| Medium | 8px | Inputs, standard buttons, Cards |
| Large | 16px | Featured actions, dialogs, feature containers |
| Extra large | 24px | Large public media and editorial blocks |
| Full | 9999px | Avatars, chips, deliberate pill controls |

Pill-shaped controls are exceptional rather than default. Full-width imagery
may remain square. Logos are never cropped, masked, or forced into circles; a
logo container may be rounded while the asset remains intact.

## Component ownership

shadcn/ui components are project-owned source code and live in:

```text
apps/web/src/components/ui
```

Project-specific composition lives outside the primitive layer:

```text
apps/web/src/components/public
apps/web/src/components/admin
```

Do not place business rules, API requests, route decisions, or feature-specific
copy inside `components/ui`.

Astro remains responsible for server-rendered public pages. shadcn React
components may render inside Astro, but browser hydration is enabled only when
interaction requires it. Static content must not become a hydrated React island
solely to reuse a visual component.

## Components

### Buttons and actions

Shared Button implementations consume semantic tokens and support:

| Variant | Purpose |
| --- | --- |
| Default | Primary action in the current context |
| Secondary | Important supporting action |
| Outline | Alternative or cancel action |
| Ghost | Low-emphasis and compact controls |
| Destructive | Irreversible or damaging actions |
| Link | Button-aligned textual navigation when necessary |

Use anchors for navigation and buttons for actions. Links may use
`buttonVariants` without losing navigation semantics.

Small buttons support compact controls, default buttons support general actions,
and large buttons support important public calls to action. Touch-oriented
targets should approach at least 44px.

Every applicable variant defines default, hover, active, focus-visible,
disabled, and loading states. Loading controls preserve their width, prevent
duplicate activation, and retain an accessible label.

Public typography, uppercase labels, large sizing, and pill shapes are
composition-level choices, not defaults of the shared Button primitive.

### Cards

The shared Card is a neutral grouping primitive with `card` background,
`card-foreground` text, `border` outline, medium radius, and no shadow.

Cards support media but do not require it. Use Card boundaries only when they
improve grouping. Avoid unnecessary nested Cards.

#### Mission cards

Mission cards may contain a verified project logo, name, short description,
optional documentary image, and navigation when a valid destination exists.
Do not invent missing names, descriptions, states, or destinations.

#### Publication cards

Publication cards consume only fields guaranteed by the product contract:
optional cover image, title, and slug. Do not invent author, date, category,
summary, or reading time.

#### Featured outing

The featured outing appears directly after the hero without an additional
section title. It may contain title, location, optional image, and navigation.
Do not invent date, price, availability, or registration information.

#### Administrative cards

Administrative Cards use moderate spacing and no shadow by default. Prefer
direct section structure for forms or tables when another boundary adds no
value.

### Forms and input fields

Standard fields use a complete outlined container, semantic tokens, and medium
radius. Bottom-border-only fields are not the global default.

A complete field may contain a visible label, optional description, control,
and validation message. Placeholders never replace labels.

Every applicable control defines empty, populated, hover, focus-visible,
disabled, readonly, invalid, and loading states. Invalid controls use
`aria-invalid` and associate textual messages through `aria-describedby`.

Standard text inputs and selects use an approximate minimum height of 40px.
Touch-critical controls approach 44px. Textareas resize vertically.

Prefer native controls when they satisfy the interaction. Rich shadcn controls
must justify their additional keyboard, focus, portal, and accessibility
responsibilities.

Administrative React forms standardize on Zod for client schemas, React Hook
Form for state, and shadcn field components for presentation. API validation
remains authoritative.

The system supports public form controls but does not introduce a contact form
while the product provides only email and telephone contact actions.

### File upload

File upload experiences communicate accepted formats, maximum size, selected
file, progress, success, failure, and available replacement or removal actions.
Drag-and-drop may supplement but never replace keyboard-accessible file
selection.

### Lists, badges, and chips

- Lists structure related content.
- Badges communicate non-interactive metadata or status.
- Chips represent filters, selections, or removable values.

They must represent real product data. Do not invent decorative states such as
"Active Project" or "Urgent Need".

Badge variants include default, secondary, outline, destructive, and accent
when a recurring positive state requires it. Color is never the only status
indicator, and raw enum values are translated into human-readable labels.

Interactive chips use appropriate button, toggle, checkbox, or toggle-group
semantics with selected, hover, focus-visible, and keyboard states.

Prefer open lists with subtle dividers when Card boundaries create unnecessary
noise. Use semantic lists, description lists, or tables according to the
content relationship.

## Photography

Photography provides emotional depth and narrative context.

Prefer real community activity, service, outreach, encounters, ministry
projects in action, natural expressions, and environmental context.

Avoid generic stock photography, staged prayer imagery, artificial light rays,
excessive filters, isolated religious symbols without context, and imagery that
portrays communities without dignity or agency.

Warm grading is acceptable, but skin tones remain natural.

## Public information architecture

The primary navigation follows this order:

1. Inicio;
2. Misiones;
3. Publicaciones;
4. Nosotros;
5. Contacto.

Landing sections use stable anchors:

- `#inicio`;
- `#misiones`;
- `#publicaciones`;
- `#nosotros`;
- `#contacto`.

Sticky navigation accounts for anchor positioning through scroll margin.

The landing follows this order:

1. Header;
2. Hero / Inicio;
3. Featured outing, when available;
4. Misiones;
5. Publicaciones;
6. Nosotros;
7. Contacto;
8. Current verse, when available;
9. Footer.

Optional sections do not render empty containers when their data is absent.

### Misiones

Misiones presents ministry projects associated with Misión 1-99. It is distinct
from the institutional mission statement shown under Nosotros.

This capability is part of the approved target design. Its data model,
administration, public API, and navigation will be implemented in a subsequent
product change.

Each mission requires a verified identifier, name, logo, and short description.
A mission action appears only when a valid destination exists. Do not invent
status, urgency, metrics, donation, registration, or ownership data.

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
and `tel:` actions. Do not introduce forms, maps, addresses, social networks,
office hours, or donations without corresponding product capabilities.

### Existing routes

Preserve:

- `/`;
- `/posts`;
- `/posts/[slug]`;
- `/outings`;
- `/outings/[slug]`;
- `/admin/*`.

New mission-detail routes require a separate product and technical decision.

## Accessibility

Public and administrative interfaces target WCAG 2.2 AA.

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

Normal text requires at least 4.5:1 contrast. Large text and meaningful
interface boundaries require at least 3:1. Color, position, animation, and
iconography must not be the only way information is communicated.

Accessibility behavior provided by shadcn components must be preserved when
their styles or composition are customized.

## Motion

Motion reinforces hierarchy and state; it does not decorate every interaction.

- Use transitions between 150ms and 250ms.
- Prefer opacity and transform.
- Avoid large parallax effects and continuous decorative animation.
- Do not delay access to content through entrance sequences.
- Limit administrative motion to state and hierarchy feedback.
- Preserve focus expectations of interactive components.
- Disable nonessential motion under `prefers-reduced-motion`.

Content and controls remain understandable when animation is unavailable.

## Design acceptance checklist

- [ ] shadcn/ui is the shared component foundation for `apps/web`.
- [ ] Public and administrative interfaces use separate theme contexts.
- [ ] Public presentation follows the Kinship & Action identity.
- [ ] Administrative presentation remains clear and operational.
- [ ] `logo-solo (1).png` is the institutional logo.
- [ ] Mission logos are treated as independent project identities.
- [ ] Misiones and the institutional mission statement remain distinct.
- [ ] Archivo Narrow is reserved for expressive public typography.
- [ ] Inter is the global interface and body typeface.
- [ ] Components consume semantic tokens instead of hard-coded colors.
- [ ] Cards have no shadow by default.
- [ ] Buttons and links preserve correct HTML semantics.
- [ ] Forms provide visible labels and accessible validation.
- [ ] Optional public sections do not render empty containers.
- [ ] No content fields, statuses, routes, or capabilities are invented.
- [ ] Keyboard focus remains visible.
- [ ] Color contrast meets WCAG 2.2 AA.
- [ ] Layouts remain usable from 320px without page overflow.
- [ ] Nonessential motion respects `prefers-reduced-motion`.
- [ ] Existing routes, API contracts, and authentication boundaries remain intact.
