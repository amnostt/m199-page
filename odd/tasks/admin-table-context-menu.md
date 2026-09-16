# Admin Table Context Menu

## Objective

Improve admin table usability by adding Base UI context menus to the mission and publication rows while keeping the existing row dropdowns as the visible and accessible action path.

## Problem / Why

The admin mission and publication tables currently expose row actions only through a three-dot dropdown. A context menu gives pointer and long-press users a faster row-level entry point, but it must remain behaviorally identical to the existing dropdown and preserve valid table markup.

## Scope

- Add `apps/web/src/components/ui/context-menu.tsx` using `@base-ui/react/context-menu` 1.6.0 and the existing shadcn `base-nova` styling pattern.
- Integrate the context menu into `MissionList` in `apps/web/src/admin/MissionsPage.tsx`.
- Integrate the context menu into `PublicationList` in `apps/web/src/admin/PublicationList.tsx`.
- Reuse one action definition/rendering source per row for both dropdown and context menu.
- Add focused tests for context-menu opening, equivalent options/actions, dropdown preservation, and `tbody > tr` markup.

## Constraints

- Do not change `ResponsiblesPage`.
- Keep the three-dot dropdown visible and accessible.
- Do not duplicate action labels or handlers between menu variants.
- Render the context-menu trigger as the `TableRow` itself with Base UI `render={<TableRow />}`; never wrap a table row in a `div`.
- Use Base UI, not Radix UI.
- Preserve unrelated worktree changes.
- Do not commit.

## Authorized Scope

- `apps/web/src/components/ui/context-menu.tsx`
- `apps/web/src/admin/MissionsPage.tsx`
- `apps/web/src/admin/PublicationList.tsx`
- `apps/web/src/admin/MissionsPage.test.tsx`
- `apps/web/src/admin/PublicationList.test.tsx`
- `odd/tasks/admin-table-context-menu.md`

## Acceptance Criteria

- Mission rows open a context menu on `contextmenu` with exactly the same actions as their row dropdown.
- Publication rows open a context menu on `contextmenu` with exactly the same actions as their row dropdown.
- Selecting context-menu actions invokes the same edit, status, and delete callbacks as the dropdown actions.
- The existing three-dot dropdown remains functional and accessible.
- The rendered table structure remains valid: action-bearing rows are direct children of `tbody` and no wrapper element surrounds `tr`.
- The primitive exports align with the existing dropdown-menu component pattern and use Base UI 1.6.0.
- Focused tests and the required type, format, and diff checks pass.

## Applicable Checks

- `pnpm --filter @m199/web test -- MissionsPage.test.tsx PublicationList.test.tsx`
- `pnpm --filter @m199/web typecheck`
- `pnpm format:check`
- `git diff --check`
- Complete diff and scope/secrets/generated-file inspection

## TDD Mode

- Mode: disabled by maintainer decision
- Policy: use ordinary functional tests for the requested behavior
- Runner: Vitest via pnpm in the web package

## Checklist

- [x] T1 Create the Base UI context-menu primitive.
- [x] T2 Integrate shared row actions into mission and publication dropdowns and context menus.
- [x] T3 Add focused tests and complete verification.

## Progress

- Planning complete.
- T1 complete: added the Base UI 1.6.0 context-menu wrapper with Root, Trigger,
  Content, Group, Label, Item, and Separator exports matching the dropdown
  primitive's styling and composition pattern.
- T2 complete: both lists now render each data row as the context-menu trigger,
  keep the existing three-dot dropdown, and feed both variants from one row
  action list and one shared action-item renderer per list.
- T3 complete: added contextmenu/action/markup tests and ran the required
  verification. The direct focused suites pass; the exact required test
  command still runs the full web suite and reports unrelated existing SSR and
  Astro configuration failures, so final status is partial.

## Evidence

- CodeGraph located `MissionList`, `PublicationList`, the existing dropdown primitive, table primitives, and their focused test callers.
- Official Base UI documentation confirms the `Root` / `Trigger` / `Portal` / `Positioner` / `Popup` composition and that `Trigger` accepts `render`.
- T1 source evidence: `apps/web/src/components/ui/context-menu.tsx` imports
  `ContextMenu` from `@base-ui/react/context-menu` and exposes the requested
  shadcn-style wrappers without introducing Radix.
- T2 source evidence: `MissionList` and `PublicationList` use
  `ContextMenuTrigger render={<TableRow />}` and their dropdown/context menus
  both consume the local `RowActionItems` renderer and row action definitions.
- Focused functional evidence: `pnpm --filter @m199/web exec vitest run
src/admin/MissionsPage.test.tsx src/admin/PublicationList.test.tsx` passed 12
  tests across 2 files.
- Required test evidence: `pnpm --filter @m199/web test --
MissionsPage.test.tsx PublicationList.test.tsx` exited 1 after running 53
  files; 486 tests passed and 21 unrelated SSR/Astro configuration tests
  failed. Both requested admin test files passed (12 tests).
- Required typecheck evidence: `pnpm --filter @m199/web typecheck` passed with
  0 errors and 4 existing hints.
- Required format evidence: `pnpm format:check` passed.
- Required diff evidence: `git diff --check` passed.
- Complete diff inspection found only the six authorized paths; no secrets,
  generated files, `ResponsiblesPage` changes, or unrelated source changes.

## Next Step

Hand off the partial verification result; no implementation work remains in this scope.
