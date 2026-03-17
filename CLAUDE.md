# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Data Gravity Web App** - Interactive, educational platform for learning PostgreSQL database internals through hands-on query optimization, indexing strategy comparison, and transaction locking behavior. The app runs a real PostgreSQL instance in the browser using PGlite (WebAssembly).

## Key Technical Decisions

1. **PGlite over SQLite**: Uses `@electric-sql/pglite` for full PostgreSQL compatibility, enabling realistic SQL queries, `EXPLAIN ANALYZE`, and isolation level testing in-browser.
2. **WASM Configuration**: Next.js webpack configured with `asyncWebAssembly: true` and `syncWebAssembly: true` to support PGlite's WebAssembly requirements. Turbopack disabled via empty config to use webpack.
3. **Pastel Theme with Animated Icons**: Custom design system with CSS variables for soft pastel colors, spacing, typography, glass-morphism effects, and animated icons. Tailwind CSS v3 with extended theme.
4. **Focus on Indexing Strategies and Transaction Locking**: Database Configuration panel removed - application focuses on comparing execution plans, indexing strategies (including GIN), and transaction locking behavior for educational purposes.

## Development Commands

```bash
# Development server (uses webpack for WASM support)
npm run dev

# Production build
npm run build

# Start production server
npm start

# TypeScript type checking
npx tsc --noEmit
```

**Note**: The development server logs to `/tmp/dev.log`. Check this file for initialization logs, query execution details, and any WASM-related errors.

## Architecture

### Core Components

- **`app/layout.tsx`**: Root layout with `PGliteProvider` wrapper and dark mode enabled.
- **`app/page.tsx`**: Homepage with navigation links (`#query-detective`, `#index-comparison`, `#locking-simulator`) and module cards that link to sections.

#### React Context & Database
- **`components/PGliteProvider.tsx`**: Initializes PGlite database, seeds with 100 users, 500 orders, 20 products, 50 documents (with JSONB, arrays, full-text) (only when tables are empty). Provides `executeQuery` function and context via `usePGlite()` hook.
  - **Note**: Database seeding occurs only when tables are empty. To reset, clear browser storage or use incognito mode.
  - **Debug logging**: Added comprehensive console logging for initialization and query execution.

#### Interactive Modules
- **`components/QueryDetective.tsx`**: Interactive SQL editor with 20+ sample queries categorized (Basic, Indexing, Performance, Configuration, GIN Indexing). Features:
  - Category filtering
  - Special rendering for `EXPLAIN ANALYZE` output (single column `QUERY PLAN`)
  - Execution time measurement
  - Results table with pagination (first 100 rows)

- **`components/IndexComparison.tsx`**: Side-by-side comparison of execution plans and indexing strategies (B-tree vs GIN). Features:
  - Pre-built comparison scenarios (full-text search, array operations, JSONB queries)
  - Dual query editors with independent execution
  - Performance comparison with visual progress bars
  - GIN index demonstrations on documents table (JSONB, array, full-text)

- **`components/DatabaseLockingSimulator.tsx`**: Interactive exploration of transaction isolation levels and locking behavior. Features:
  - Pre-built scenarios (deadlock simulation, row locking, table locking, isolation level comparison)
  - Dual transaction editors with separate database connections
  - Lock information display showing current locks held
  - Isolation level testing (READ COMMITTED, REPEATABLE READ, SERIALIZABLE)

### Design System

- **`app/globals.css`**: CSS variables for pastel theme with soft accents (cyan, purple, pink, green), glass effects, fluid typography scale, custom spacing, and animated icons.
- **`tailwind.config.ts`**: Extends Tailwind with custom colors, shadows, spacing, and animations mapped to CSS variables.
- **UI Patterns**: Glass panels (`glass-panel`), glow text effects (`glow-cyan`, etc.), custom buttons (`button`, `button-primary`, `button-secondary`).

## Data Flow

1. **Initialization**: `PGliteProvider` mounts → creates PGlite instance → seeds database if empty → provides context.
2. **Query Execution**: Components call `usePGlite().executeQuery(sql)` → returns rows array.
3. **Result Processing**: `QueryDetective` extracts column names from first row, handles `EXPLAIN ANALYZE` output specially.
4. **Index Comparison**: `IndexComparison` runs two queries side-by-side, compares execution plans and performance metrics.
5. **Database Locking**: `DatabaseLockingSimulator` creates two separate database instances, runs concurrent transactions, and displays lock information and isolation level effects.

## Important Notes

### WASM Limitations
- Some PostgreSQL configuration changes are restricted in WebAssembly environment.
- Database Configuration panel removed to focus on indexing strategies which work well in WASM.
- GIN indexes for full-text search, arrays, and JSONB are fully supported in PGlite.

### Query Result Structure
- PGlite query results may vary in structure. `executeQuery` handles multiple formats:
  1. Object with `.rows` property
  2. Direct array of rows
  3. Other common structures (`.data`, `.records`)
- Debug logging shows raw result structure for troubleshooting.

### Navigation
- Page uses anchor links for smooth scrolling: `#query-detective`, `#index-comparison`, and `#locking-simulator`.
- Header navigation and module cards are linked to these sections.

### Browser Compatibility
- Requires WebAssembly support (all modern browsers).
- Database persists in browser storage (IndexedDB). Clear browser data to reset.

## Troubleshooting

### No Query Results
1. **Check browser console** for initialization logs (`PGliteProvider:`, `seedDatabase:`).
2. **Verify data seeding**: Logs should show "Users: 100 Orders: 500 Products: 20 Documents: 50".
3. **Test simple query**: Run `SELECT 1 as test` to verify basic query execution.
4. **Check `/tmp/dev.log`** for server-side compilation errors.

### WASM Loading Failures
- Ensure `next.config.ts` has proper webpack experiments configuration.
- Check browser console for WebAssembly compilation errors.

### TypeScript Errors
- Run `npx tsc --noEmit` to check for type issues.
- Some PGlite type definitions may cause errors in node_modules (can be ignored).

## Future Development

The current MVP focuses on Query Detective, Index Comparison, and Database Locking Simulator. Potential extensions mentioned in memory:
- Connection Pooling Visualizer
- Interactive Quizzes

When adding features, maintain the premium glass UI aesthetic and focus on practical, interactive learning experiences.