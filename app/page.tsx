import { QueryDetective } from "@/components/QueryDetective";
import { DBConfigPanel } from "@/components/DBConfigPanel";

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold glow-cyan">Data Gravity</h1>
          <span className="text-foreground-secondary">PostgreSQL Optimization</span>
        </div>
        <nav>
          <ul className="flex gap-6">
            {['Query Detective', 'Configuration'].map((item) => {
              const href = item === 'Query Detective' ? '#query-detective' : '#database-configuration';
              return (
                <li key={item}>
                  <a
                    href={href}
                    className="text-foreground-secondary hover:text-accent-cyan transition-colors"
                  >
                    {item}
                  </a>
                </li>
              );
            })}
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
            Test SQL queries, analyze execution plans, and tune database configurations
            with real PostgreSQL running in your browser.
          </p>
        </section>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {[
            { title: 'Query Detective', desc: 'Interactive SQL query editor with EXPLAIN ANALYZE', color: 'cyan', href: '#query-detective' },
            { title: 'Database Configuration', desc: 'Tune PostgreSQL parameters and test performance impact', color: 'purple', href: '#database-configuration' },
          ].map((module) => (
            <a
              key={module.title}
              href={module.href}
              className="glass-panel p-8 cursor-pointer transition-transform hover:scale-[1.02] block no-underline"
            >
              <h3 className={`text-2xl font-bold mb-2 glow-${module.color}`}>
                {module.title}
              </h3>
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
            See execution plans, tweak configuration, and understand query performance.
          </p>
          <QueryDetective />
        </section>

        {/* Database Configuration Panel */}
        <section id="database-configuration" className="glass-panel p-8 mt-12">
          <DBConfigPanel />
        </section>
      </main>

      <footer className="mt-16 text-center text-foreground-tertiary text-sm">
        <p>Data Gravity Web App • Interactive PostgreSQL query optimization and configuration testing</p>
      </footer>
    </div>
  );
}
