# Data Gravity Web App

<div align="center">
  <h3>Interactive PostgreSQL Query Optimization & Configuration Testing</h3>
  <p>Learn database internals through hands-on SQL query analysis and performance tuning with real PostgreSQL running in your browser.</p>
</div>

## 🚀 Overview

**Data Gravity** is an interactive, premium educational platform for learning PostgreSQL database internals through practical, hands-on experience. The application runs a real PostgreSQL instance directly in your browser using PGlite (WebAssembly), allowing you to write SQL queries, analyze execution plans, and tune database configurations without any server setup.

## ✨ Features

### 🔍 **Query Detective**
- **Interactive SQL Editor**: Write and execute PostgreSQL queries against real sample data
- **16+ Sample Queries**: Categorized by topic (Basic, Indexing, Performance, Configuration)
- **EXPLAIN ANALYZE Support**: Special rendering for query plan visualization
- **Execution Timing**: Measure query performance in milliseconds
- **Results Table**: Paginated display with proper formatting

### ⚙️ **Database Configuration Panel**
- **PostgreSQL Parameter Tuning**: Adjust `work_mem`, `shared_buffers`, `effective_cache_size`, `random_page_cost`, `enable_seqscan`
- **Performance Testing**: Auto-filled test queries for each configuration parameter
- **Before/After Comparison**: See execution time improvements in real-time
- **Educational Notes**: Learn about WASM limitations and practical tuning considerations

### 🎨 **Premium User Interface**
- **Dark-Mode Glass Aesthetic**: Modern design with glowing accents (cyan, purple, pink, green)
- **Glass Morphism**: Smooth panels with backdrop blur effects
- **Responsive Design**: Works on desktop and mobile devices
- **Smooth Animations**: Micro-interactions and transition effects

## 🛠️ Technology Stack

- **Frontend**: [Next.js 16](https://nextjs.org) (App Router), [TypeScript](https://www.typescriptlang.org/), [React 19](https://reactjs.org/)
- **Database**: [PGlite](https://github.com/electric-sql/pglite) (PostgreSQL in WebAssembly)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) with custom design tokens
- **Build Tools**: Webpack with WASM support, Turbopack disabled

## 📋 Prerequisites

- Node.js 18+ and npm/yarn/pnpm/bun
- Modern browser with WebAssembly support (Chrome 90+, Firefox 89+, Safari 15+)

## 🚦 Getting Started

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend-database-internals
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

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

### 🚀 Deployment to GitHub Pages

This project is configured for static export and deployment to GitHub Pages.

#### Prerequisites
1. Repository name must match the `basePath` in `next.config.ts` (currently `/sql-query-learning`)
2. GitHub Pages must be enabled in repository settings (Settings → Pages → Source: GitHub Actions)

#### Deployment Steps

1. **Configure basePath** (optional):
   - If deploying to user/organization site (`https://username.github.io`), set `basePath: ''` in `next.config.ts`
   - If deploying to project site (`https://username.github.io/repo-name`), set `basePath: '/repo-name'`

2. **Build and deploy**:
   ```bash
   # One-time setup: install dependencies
   npm install

   # Build static site and deploy to GitHub Pages
   npm run deploy
   ```

   This will:
   - Build the static export (`next build`)
   - Create `.nojekyll` file to disable Jekyll processing
   - Deploy the `out` directory to the `gh-pages` branch

3. **Verify deployment**:
   - Visit `https://username.github.io/repo-name`
   - Check browser console for any loading errors

#### Manual Deployment
```bash
# Build static site
npm run export

# Deploy using gh-pages
npx gh-pages -d out
```

#### Notes
- WebAssembly files are included in the static build for PGlite PostgreSQL
- The database persists in browser storage (IndexedDB) per user session
- Some PostgreSQL configurations are restricted in WASM environment (noted in UI)

## 🏗️ Project Architecture

### Core Components

```
backend-database-internals/
├── app/
│   ├── layout.tsx              # Root layout with PGliteProvider
│   ├── page.tsx               # Homepage with navigation
│   └── globals.css            # Premium dark-mode glass UI design
├── components/
│   ├── PGliteProvider.tsx     # PGlite database context/provider
│   ├── QueryDetective.tsx     # Interactive SQL query editor
│   └── DBConfigPanel.tsx      # Database configuration simulator
├── tailwind.config.ts         # Custom design tokens from CSS variables
└── next.config.ts             # WASM support, turbopack config
```

### Data Flow

1. **Database Initialization**: `PGliteProvider` initializes PostgreSQL in WebAssembly and seeds with sample data (100 users, 500 orders, 20 products)
2. **Query Execution**: Components use `usePGlite().executeQuery(sql)` to run SQL queries
3. **Result Processing**: Results are processed and displayed with special handling for `EXPLAIN ANALYZE` output
4. **Configuration Testing**: PostgreSQL parameters are tuned and performance impact is measured

## 📊 Sample Data

The application comes pre-loaded with realistic sample data for testing:

- **100 users** with unique names and emails
- **500 orders** with random user associations, amounts, and statuses
- **20 products** across 8 categories with varying prices and stock status
- **Multiple indexes** for performance testing:
  - `idx_users_email`, `idx_orders_user_id`, `idx_products_category`
  - `idx_orders_amount`, `idx_orders_status`, `idx_users_name_email`

## 🧪 Using the Application

### Query Detective
1. **Write SQL Queries**: Use the editor to write any PostgreSQL query
2. **Try Sample Queries**: Click on pre-built queries categorized by topic
3. **Analyze Performance**: Use `EXPLAIN ANALYZE` to see query execution plans
4. **View Results**: See formatted results with execution time

### Database Configuration
1. **Select Parameter**: Choose a PostgreSQL configuration to tune
2. **Set Values**: Use suggested values or enter custom values
3. **Apply Changes**: Click "Apply" to set the configuration
4. **Test Impact**: Run the auto-filled test query to see performance changes
5. **Compare Results**: View execution time improvements/slowdowns

## ⚠️ Known Limitations & Troubleshooting

### WebAssembly Limitations
- **Some PostgreSQL configurations are read-only** in WASM environment
- **Memory-related configurations** may not take full effect
- **`max_connections` parameter** is not adjustable (removed from UI)

### Common Issues

#### No Query Results Displayed
1. **Check browser console** (F12 → Console tab) for initialization logs
2. **Verify database seeding**: Look for "Users: 100 Orders: 500 Products: 20" in logs
3. **Try simple query**: Run `SELECT 1 as test` to verify basic execution
4. **Check dev logs**: Server logs are at `/tmp/dev.log`

#### Database Not Initializing
1. **Ensure WebAssembly support**: Use a modern browser (Chrome 90+, Firefox 89+, Safari 15+)
2. **Clear browser data**: Database persists in IndexedDB - clear to reset
3. **Use incognito mode**: For a fresh database instance

#### TypeScript Errors
- Some PGlite type definitions may cause errors in `node_modules` (can be ignored)
- Run `npx tsc --noEmit` to check for actual type issues

## 🎯 Learning Objectives

Through this interactive platform, you'll learn:

- **Query Optimization**: How indexes affect query performance
- **Execution Plans**: Reading and interpreting `EXPLAIN ANALYZE` output
- **Configuration Tuning**: Impact of PostgreSQL parameters on performance
- **Database Design**: Table relationships, foreign keys, and data modeling
- **Performance Analysis**: Measuring and comparing query execution times

## 🔮 Future Development

Potential enhancements for future versions:

- **Connection Pooling Visualizer**: Interactive component showing memory/CPU tradeoffs
- **Database Locking Simulator**: Dual-pane interface for isolation level testing
- **Interactive Quizzes**: Checkpoint quizzes (Easy/Medium/Hard) for each concept
- **Additional Query Types**: Window functions, recursive CTEs, JSON operations
- **Export Results**: Save query results and execution plans

## 📄 License

This project is developed for educational purposes. All code is available under standard open-source licensing.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- [PGlite](https://github.com/electric-sql/pglite) for bringing PostgreSQL to the browser
- [Next.js](https://nextjs.org) for the excellent React framework
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework

---

<div align="center">
  <p>Built with ❤️ for database enthusiasts and developers learning PostgreSQL internals</p>
</div>
