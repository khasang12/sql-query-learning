# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Data Gravity Web App** - Interactive, premium educational platform for learning PostgreSQL database internals through hands-on query optimization and configuration tuning. The app runs a real PostgreSQL instance in the browser using PGlite (WebAssembly).

## Key Technical Decisions

1. **PGlite over SQLite**: Uses `@electric-sql/pglite` for full PostgreSQL compatibility, enabling realistic SQL queries, `EXPLAIN ANALYZE`, and isolation level testing in-browser.
2. **WASM Configuration**: Next.js webpack configured with `asyncWebAssembly: true` and `syncWebAssembly: true` to support PGlite's WebAssembly requirements. Turbopack disabled via empty config to use webpack.
3. **Premium Dark-Mode Glass UI**: Custom design system with CSS variables for colors, spacing, typography, and glass-morphism effects. Tailwind CSS v3 with extended theme.
4. **Focus on Practical Learning**: Theory sections removed - application focuses solely on Query Detective and Database Configuration modules for hands-on experience.

## Development Commands

```bash
# Development server (uses webpack for WASM support)
npm run dev

# Production build (static export for GitHub Pages)
npm run build

# Start production server
npm start

# Static export for GitHub Pages
npm run export

# Deploy to GitHub Pages (builds and deploys)
npm run deploy

# TypeScript type checking
npx tsc --noEmit
```

**Note**: The development server logs to `/tmp/dev.log`. Check this file for initialization logs, query execution details, and any WASM-related errors.

**Static Export Configuration**: The app is configured for static export (`output: 'export'`) with basePath `/sql-query-learning` for GitHub Pages project site. Update `basePath` in `next.config.ts` for different deployment targets.

## Architecture

### Core Components

- **`app/layout.tsx`**: Root layout with `PGliteProvider` wrapper and dark mode enabled.
- **`app/page.tsx`**: Homepage with navigation links (`#query-detective`, `#database-configuration`) and module cards that link to sections.

#### React Context & Database
- **`components/PGliteProvider.tsx`**: Initializes PGlite database, seeds with 100 users, 500 orders, 20 products (only when tables are empty). Provides `executeQuery` function and context via `usePGlite()` hook.
  - **Note**: Database seeding occurs only when tables are empty. To reset, clear browser storage or use incognito mode.
  - **Debug logging**: Added comprehensive console logging for initialization and query execution.

#### Interactive Modules
- **`components/QueryDetective.tsx`**: Interactive SQL editor with 16+ sample queries categorized (Basic, Indexing, Performance, Configuration). Features:
  - Category filtering
  - Special rendering for `EXPLAIN ANALYZE` output (single column `QUERY PLAN`)
  - Execution time measurement
  - Results table with pagination (first 100 rows)

- **`components/DBConfigPanel.tsx`**: PostgreSQL configuration simulator with:
  - 5 tunable parameters: `work_mem`, `shared_buffers`, `effective_cache_size`, `random_page_cost`, `enable_seqscan`
  - **Test Configuration Impact**: Auto-filled test queries for each parameter with performance comparison (before/after execution times)
  - Educational notes about WASM limitations (some configurations read-only)

### Design System

- **`app/globals.css`**: CSS variables for dark theme with glowing accents (cyan, purple, pink, green), glass effects, fluid typography scale, and custom spacing.
- **`tailwind.config.ts`**: Extends Tailwind with custom colors, shadows, spacing, and animations mapped to CSS variables.
- **UI Patterns**: Glass panels (`glass-panel`), glow text effects (`glow-cyan`, etc.), custom buttons (`button`, `button-primary`, `button-secondary`).

## Data Flow

1. **Initialization**: `PGliteProvider` mounts → creates PGlite instance → seeds database if empty → provides context.
2. **Query Execution**: Components call `usePGlite().executeQuery(sql)` → returns rows array.
3. **Result Processing**: `QueryDetective` extracts column names from first row, handles `EXPLAIN ANALYZE` output specially.
4. **Configuration Testing**: `DBConfigPanel` applies `SET` commands, runs test queries, compares execution times.

## Important Notes

### WASM Limitations
- Some PostgreSQL configuration changes are restricted in WebAssembly environment (noted in UI).
- `max_connections` removed from configuration panel as it cannot be changed in WASM.
- Memory-related configurations may not take effect as expected.

### Query Result Structure
- PGlite query results may vary in structure. `executeQuery` handles multiple formats:
  1. Object with `.rows` property
  2. Direct array of rows
  3. Other common structures (`.data`, `.records`)
- Debug logging shows raw result structure for troubleshooting.

### Navigation
- Page uses anchor links for smooth scrolling: `#query-detective` and `#database-configuration`.
- Header navigation and module cards are linked to these sections.

### Browser Compatibility
- Requires WebAssembly support (all modern browsers).
- Database persists in browser storage (IndexedDB). Clear browser data to reset.

### GitHub Pages Deployment
- Configured for static export with `output: 'export'` and `basePath: '/sql-query-learning'`
- Deployment scripts: `npm run export`, `npm run deploy` (builds and deploys to `gh-pages` branch)
- Includes `.nojekyll` file to disable Jekyll processing
- WebAssembly files are served with correct MIME types for PGlite
- Update `basePath` in `next.config.ts` for different deployment targets (empty for user/organization site)

## Troubleshooting

### No Query Results
1. **Check browser console** for initialization logs (`PGliteProvider:`, `seedDatabase:`).
2. **Verify data seeding**: Logs should show "Users: 100 Orders: 500 Products: 20".
3. **Test simple query**: Run `SELECT 1 as test` to verify basic query execution.
4. **Check `/tmp/dev.log`** for server-side compilation errors.

### WASM Loading Failures
- Ensure `next.config.ts` has proper webpack experiments configuration.
- Check browser console for WebAssembly compilation errors.

### TypeScript Errors
- Run `npx tsc --noEmit` to check for type issues.
- Some PGlite type definitions may cause errors in node_modules (can be ignored).

## Future Development

The current MVP focuses on Query Detective and Database Configuration. Potential extensions mentioned in memory:
- Connection Pooling Visualizer
- Database Locking Simulator
- Interactive Quizzes

When adding features, maintain the premium glass UI aesthetic and focus on practical, interactive learning experiences.