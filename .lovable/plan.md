

# Fix Three Issues: Crypto Settings, Statement Generation, Calendar Mobile

## Issue 1: Crypto Settings page shows no configurations

**Root cause**: The `crypto_deposit_config` database table is empty (zero rows). The admin UI only renders existing configs via `.map()` -- there is no way to add a new crypto configuration.

**Fix**: Add an "Add Crypto Configuration" button and form to `AdminDeposits.tsx` that inserts a new row into `crypto_deposit_config` with a crypto type, wallet address, and enabled status. This gives admins the ability to create configs from scratch.

## Issue 2: Custom statement appears to generate but doesn't show in the list

**Root cause**: In `Statements.tsx`, the "Available Statements" list is filtered by `filters.year` (line 157), which defaults to the current year (2026). When a user generates a custom statement with a start date in a past year (e.g., 2000), the `statementDate.getFullYear()` check filters it out because it compares `statement_period_start`'s year against the filter. The statement IS created in the database but is invisible due to the year filter.

**Fix**: Change the year filter to check if the statement period overlaps with the selected year (i.e., the statement should show if any part of its period falls within the selected year), OR remove the year filter from the default view when a custom statement was just generated. The simplest fix: after generating a custom statement, clear the year filter so all statements are visible, and also update the year filter dropdown to include years from all existing statements.

## Issue 3: Calendar overflows on mobile

**Root cause**: The `captionLayout="dropdown-buttons"` combined with the calendar's fixed `w-9` cell widths creates a layout that's too wide for mobile screens. The dropdowns (month + year) plus navigation arrows plus the 7-column day grid exceed the viewport width.

**Fix in `src/components/ui/calendar.tsx`**: Reduce cell sizes and dropdown padding for a more compact calendar. Reduce `w-9` cells to `w-8`, shrink dropdown padding, and ensure the overall calendar fits within ~280px width. Also update `PopoverContent` alignment to `align="end"` in the Statements page to prevent right-side overflow.

## Files to modify

1. **`src/components/admin/AdminDeposits.tsx`** -- Add "Add Crypto" dialog with form fields (crypto type, wallet address, enabled toggle) and insert handler
2. **`src/pages/user/Statements.tsx`** -- Fix year filter logic to show statements whose period overlaps the year; expand year dropdown to include all years from existing statements; after generating, reset filter to show result
3. **`src/components/ui/calendar.tsx`** -- Reduce cell widths from `w-9`/`h-9` to `w-8`/`h-8`, compact dropdown styling, reduce overall padding
4. **`src/components/statements/StatementViewer.tsx`** -- Apply same calendar size fix for consistency

