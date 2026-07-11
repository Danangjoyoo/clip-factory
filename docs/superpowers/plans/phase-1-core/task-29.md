# Task 29: Usage and Provenance Views

> **For agentic workers:** Use superpowers:test-driven-development and create-frontend-components. Money labels must distinguish known actual, allocated estimate, and possible unreported charge.

## Purpose and traceability

Implement design §§13.5, 17, and 28: sortable project, analysis run, API call, clip allocation, render timing, and model metadata views.

## Boundaries and files

- Requires Tasks 16, 17, 22, and 24.
- Create: `apps/web/src/app/usage/page.tsx`
- Create: `apps/web/src/modules/analysis/delivery/ui/UsageView.tsx`
- Create: `apps/web/src/modules/analysis/delivery/ui/UsageTable.tsx`
- Create: `apps/web/src/modules/analysis/delivery/ui/CostSummary.tsx`
- Create: `apps/web/src/modules/analysis/delivery/ui/UsageView.module.css`
- Create: `apps/web/src/modules/analysis/delivery/ui/usage.presentation.ts`
- Create: `apps/web/src/modules/analysis/application/services/get-usage-report.service.ts`
- Create: `apps/web/src/modules/analysis/delivery/http/dto/api/usage-report-api.dto.ts`
- Create: `apps/web/src/modules/analysis/converters/entity-api/usage-report.converter.ts`
- Create: `apps/web/src/modules/analysis/delivery/http/usage-report.controller.ts`
- Create: `apps/web/src/app/api/usage/route.ts`
- Test: `apps/web/src/modules/analysis/delivery/ui/UsageView.test.tsx`
- Test: `apps/web/src/modules/analysis/delivery/ui/UsageTable.test.tsx`
- Test: `apps/web/src/modules/analysis/delivery/ui/CostSummary.test.tsx`
- Test: `apps/web/src/modules/analysis/application/services/get-usage-report.service.test.ts`
- Test: `apps/web/src/modules/analysis/converters/entity-api/usage-report.converter.test.ts`
- Test: `apps/web/src/modules/analysis/delivery/http/usage-report.controller.test.ts`
- Controller uses one `GetUsageReportService`; component uses presentation strings and numeric sort keys.

## RED → GREEN → REFACTOR

- [ ] **RED: cost labels and totals.**

```tsx
it('separates actual, allocation, and uncertain possible spend', () => {
  render(<UsageView report={usageReport({ actual:'$1.20', allocated:'$0.40 allocated estimate — equal share', possible:'Up to $0.09 possible unreported provider charge' })} />);
  expect(screen.getByText('Actual OpenAI spend')).toHaveTextContent('$1.20');
  expect(screen.getByText('$0.40 allocated estimate — equal share')).toBeVisible();
  expect(screen.getByText('Up to $0.09 possible unreported provider charge')).toBeVisible();
  expect(screen.getByText('Possible spend is not included in known actual totals.')).toBeVisible();
});
```

- [ ] Create a typed `UsageView` shell rendering zero totals, verify typecheck passes, then run the test; expect the named project/run/call allocation assertion to FAIL because no rows are rendered.

- [ ] **GREEN:** render three distinct summary rows and six tables: projects, analysis runs, API calls, allocations, renders, model/pricing metadata. API calls show response ID, purpose, all token categories, model/effort, versions, tier, exact cost, UTC/local timestamps. Allocations show method and label.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/analysis/delivery/ui apps/web/src/modules/analysis/application/services/get-usage-report.service.test.ts
# Expected: PASS
```

- [ ] Run `pnpm exec vitest run apps/web/src/modules/analysis/delivery/ui/UsageView.test.tsx`; expect PASS.

- [ ] **RED: sorting and accessibility.** Clicking column header toggles ascending/descending with `aria-sort`; money sorts by micro-USD bigint strings, timestamps by epoch, empty set has scoped message, and tables retain captions.

- [ ] **GREEN:** generic `UsageTable<Row>` accepts typed columns `{id,header,cell,sortValue}` and stable-sorts by value then original index; buttons are header children and preserve focus.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/analysis/delivery/ui apps/web/src/modules/analysis/application/services/get-usage-report.service.test.ts
# Expected: PASS
```

- [ ] **RED/GREEN report service:** aggregate from usage events only for known actual, allocations separately, render timing separately, uncertain reserved separately. Assert Manual projects return actual zero even with local ML timings. Pagination cursor is `(occurredAt,id)`, page size max 100.

- [ ] **REFACTOR:** no raw transcript/path/object key/API key is returned; response uses decimal money strings and timezone-independent ISO timestamps; CSV export uses same presentation-safe fields.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/analysis/delivery/ui apps/web/src/modules/analysis/application/services/get-usage-report.service.test.ts
# Expected: PASS
```

## Verification and commit

```bash
pnpm exec vitest run apps/web/src/modules/analysis/delivery/ui apps/web/src/modules/analysis/application/services/get-usage-report.service.test.ts
pnpm test:architecture
pnpm --filter @clip-factory/web build
git diff --check
```

Expected: provenance is sortable and complete, with known/allocated/possible values never conflated.

**Suggested commit:** `feat: add usage and provenance views`
