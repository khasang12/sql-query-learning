import { QueryDetective } from "@/components/QueryDetective";
import { IndexComparison } from "@/components/IndexComparison";
import { DatabaseLockingSimulator } from "@/components/DatabaseLockingSimulator";

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <div className="icon-database pulse-scale"></div>
          <h1 className="text-3xl font-bold glow-cyan">Data Gravity</h1>
          <span className="text-foreground-secondary">PostgreSQL Optimization</span>
        </div>
        <nav>
          <ul className="flex gap-6">
            <li>
              <a
                href="#query-detective"
                className="text-foreground-secondary hover:text-accent-cyan transition-colors"
              >
                Query Detective
              </a>
            </li>
            <li>
              <a
                href="#index-comparison"
                className="text-foreground-secondary hover:text-accent-cyan transition-colors"
              >
                Index Comparison
              </a>
            </li>
            {/* <li>
              <a
                href="#locking-simulator"
                className="text-foreground-secondary hover:text-accent-cyan transition-colors"
              >
                Locking Simulator
              </a>
            </li> */}
          </ul>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="glass-panel p-12 mb-12 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Interactive <span className="glow-cyan">PostgreSQL Query Optimization</span>
          </h2>
          <p className="text-xl text-foreground-secondary max-w-3xl mx-auto">
            Compare execution plans, test indexing strategies (B-tree, GIN), and understand query performance
            with real PostgreSQL running in your browser.
          </p>
        </section>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {[
            { title: 'Query Detective', desc: 'Interactive SQL query editor with EXPLAIN ANALYZE', color: 'cyan', href: '#query-detective', icon: 'query' },
            { title: 'Index Comparison', desc: 'Compare B-tree vs GIN indexes and execution plans', color: 'purple', href: '#index-comparison', icon: 'index' },
            // { title: 'Locking Simulator', desc: 'Explore transaction isolation levels and locking behavior', color: 'green', href: '#locking-simulator', icon: 'lock' },
          ].map((module) => (
            <a
              key={module.title}
              href={module.href}
              className="glass-panel p-8 cursor-pointer transition-transform hover:scale-[1.02] block no-underline"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`icon-${module.icon} bounce`}></div>
                <h3 className={`text-2xl font-bold glow-${module.color}`}>
                  {module.title}
                </h3>
              </div>
              <p className="text-foreground-secondary">{module.desc}</p>
            </a>
          ))}
        </div>


        {/* Query Detective */}
        <section id="query-detective" className="glass-panel p-8">
          <h3 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <span className="glow-cyan">Query Detective</span>
            <span className="text-sm font-normal px-3 py-1 rounded-full bg-glass-background">
              MVP
            </span>
          </h3>
          <p className="mb-6">
            Write any SQL query against a real PostgreSQL instance running in your browser.
            See execution plans, analyze query performance, and test different indexing strategies.
          </p>
          <QueryDetective />
        </section>

        {/* Index Comparison */}
        <section id="index-comparison" className="glass-panel p-8 mt-12">
          <h3 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <span className="glow-purple">Index Comparison</span>
            <span className="text-sm font-normal px-3 py-1 rounded-full bg-glass-background">
              GIN & B-tree
            </span>
          </h3>
          <p className="mb-6">
            Compare execution plans with different index types. Test B-tree indexes for standard lookups
            and GIN indexes for full-text search and array operations.
          </p>
          <IndexComparison />
        </section>

        {/* Locking Simulator */}
        {/* <section id="locking-simulator" className="glass-panel p-8 mt-12">
          <h3 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <span className="glow-green">Locking Simulator</span>
            <span className="text-sm font-normal px-3 py-1 rounded-full bg-glass-background">
              Transactions & Locks
            </span>
          </h3>
          <p className="mb-6">
            Explore database locking behavior, transaction isolation levels, and concurrent access patterns.
            Simulate deadlocks, row-level locking, and table locks with real PostgreSQL transactions.
          </p>
          <DatabaseLockingSimulator />
        </section> */}
      </main>

      <footer className="mt-16 text-center text-foreground-tertiary text-sm">
        <p>Data Gravity Web App • Compare PostgreSQL execution plans, indexing strategies (B-tree vs GIN), and transaction locking behavior</p>
      </footer>
    </div>
  );
}
