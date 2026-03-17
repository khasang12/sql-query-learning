"use client";

import { useState, useEffect, useMemo } from "react";
import { usePGlite } from "./PGliteProvider";

const SAMPLE_QUERIES = [
  {
    category: "Basic",
    name: "Select all users",
    sql: "SELECT * FROM users ORDER BY id LIMIT 10",
    description: "Simple SELECT with LIMIT clause",
  },
  {
    category: "Basic",
    name: "Find user by email",
    sql: "SELECT * FROM users WHERE email = 'alice@example.com'",
    description: "Uses existing index on email column",
  },
  {
    category: "Basic",
    name: "Join users with orders",
    sql: `SELECT u.name, u.email, o.amount, o.status
          FROM users u
          JOIN orders o ON u.id = o.user_id
          ORDER BY o.created_at DESC`,
    description: "INNER JOIN with foreign key relationship",
  },
  {
    category: "Indexing",
    name: "EXPLAIN with index scan",
    sql: "EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'alice@example.com'",
    description: "Shows query plan using index scan on email",
  },
  {
    category: "Indexing",
    name: "Create composite index",
    sql: "CREATE INDEX IF NOT EXISTS idx_users_name_email ON users(name, email)",
    description: "Creates a composite index on name and email columns",
  },
  {
    category: "Indexing",
    name: "Show all indexes",
    sql: "SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes WHERE tablename NOT LIKE 'pg_%'",
    description: "Lists all user-created indexes in the database",
  },
  {
    category: "Indexing",
    name: "Index-only scan demo",
    sql: "EXPLAIN ANALYZE SELECT email FROM users WHERE email LIKE 'a%'",
    description: "Potential index-only scan if index covers the column",
  },
  {
    category: "Indexing",
    name: "Force sequential scan",
    sql: "EXPLAIN ANALYZE SELECT * FROM users WHERE name LIKE '%a%'",
    description: "Pattern matching with wildcards forces sequential scan",
  },
  {
    category: "Indexing",
    name: "Bitmap index scan",
    sql: "EXPLAIN ANALYZE SELECT * FROM users WHERE id > 2 AND id < 5",
    description: "Range query may use bitmap index scan",
  },
  {
    category: "Performance",
    name: "EXPLAIN with sorting",
    sql: "EXPLAIN ANALYZE SELECT * FROM users ORDER BY name LIMIT 100",
    description: "Shows sorting operation and memory usage",
  },
  {
    category: "Performance",
    name: "Aggregate with GROUP BY",
    sql: "EXPLAIN ANALYZE SELECT user_id, COUNT(*), SUM(amount) FROM orders GROUP BY user_id",
    description: "Shows hash aggregate or group aggregate plan",
  },
  {
    category: "Performance",
    name: "Subquery performance",
    sql: "EXPLAIN ANALYZE SELECT * FROM users WHERE id IN (SELECT user_id FROM orders WHERE amount > 50)",
    description: "Demonstrates subquery execution strategy",
  },
  {
    category: "Performance",
    name: "CTE (Common Table Expression)",
    sql: `WITH user_orders AS (
            SELECT user_id, COUNT(*) as order_count
            FROM orders
            GROUP BY user_id
          )
          SELECT u.name, uo.order_count
          FROM users u
          JOIN user_orders uo ON u.id = uo.user_id
          ORDER BY uo.order_count DESC`,
    description: "CTE usage and materialization strategy",
  },
  {
    category: "Configuration",
    name: "Check current work_mem",
    sql: "SHOW work_mem",
    description: "Shows current work_mem configuration value",
  },
  {
    category: "Configuration",
    name: "Set enable_seqscan off",
    sql: "SET enable_seqscan = off",
    description: "Disables sequential scans to force index usage (for testing)",
  },
  {
    category: "Configuration",
    name: "Test random_page_cost",
    sql: "EXPLAIN ANALYZE SELECT * FROM products ORDER BY price DESC",
    description: "Show effect of random_page_cost on index vs seq scan choice",
  },
  {
    category: "GIN Indexing",
    name: "Full-text search with GIN",
    sql: `EXPLAIN ANALYZE SELECT * FROM documents WHERE to_tsvector('english', content) @@ to_tsquery('english', 'index')`,
    description: "Full-text search using GIN index on tsvector",
  },
  {
    category: "GIN Indexing",
    name: "Array containment with GIN",
    sql: `EXPLAIN ANALYZE SELECT * FROM documents WHERE tags @> '{postgresql, indexing}'`,
    description: "Array containment query using GIN index on tags array",
  },
  {
    category: "GIN Indexing",
    name: "JSONB query with GIN",
    sql: `EXPLAIN ANALYZE SELECT * FROM documents WHERE metadata @> '{"category": "database"}'`,
    description: "JSONB containment query using GIN index on metadata",
  },
  {
    category: "GIN Indexing",
    name: "Create GIN index on tsvector",
    sql: `CREATE INDEX IF NOT EXISTS idx_documents_content_gin ON documents USING GIN (to_tsvector('english', content))`,
    description: "Create a GIN index for full-text search",
  },
  {
    category: "GIN Indexing",
    name: "Compare B-tree vs GIN",
    sql: `EXPLAIN ANALYZE SELECT * FROM documents WHERE metadata->>'category' = 'database'`,
    description:
      "JSONB field access - might use B-tree or GIN depending on index",
  },
];

export function QueryDetective() {
  const { executeQuery, isLoading, error } = usePGlite();
  const [query, setQuery] = useState(SAMPLE_QUERIES[0].sql);
  const [results, setResults] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = useMemo(() => {
    const cats = ["All", ...new Set(SAMPLE_QUERIES.map((q) => q.category))];
    return cats.filter((cat) => cat !== undefined);
  }, []);

  const filteredQueries = useMemo(() => {
    if (selectedCategory === "All") return SAMPLE_QUERIES;
    return SAMPLE_QUERIES.filter((q) => q.category === selectedCategory);
  }, [selectedCategory]);

  async function runQuery(sql = query) {
    if (!sql.trim()) return;

    setIsExecuting(true);
    setQueryError(null);
    setExecutionTime(null);

    try {
      console.log("QueryDetective: Running query:", sql);
      const startTime = performance.now();
      const rows = await executeQuery(sql);
      const endTime = performance.now();

      console.log("QueryDetective: Received rows:", rows);
      setExecutionTime(endTime - startTime);

      if (rows.length > 0) {
        // Extract column names from first row
        const firstRow = rows[0];
        console.log("QueryDetective: First row:", firstRow);
        const columns = Object.keys(firstRow);
        console.log("QueryDetective: Columns:", columns);
        setColumns(columns);
        setResults(rows);
      } else {
        console.log("QueryDetective: No rows returned");
        setColumns([]);
        setResults([]);
      }
    } catch (err) {
      console.error("QueryDetective: Query error:", err);
      setQueryError(err instanceof Error ? err.message : "Unknown error");
      setColumns([]);
      setResults([]);
    } finally {
      setIsExecuting(false);
    }
  }

  function handleSampleQuery(sql: string) {
    setQuery(sql);
  }

  // Run initial query on mount
  useEffect(() => {
    if (!isLoading) {
      runQuery(SAMPLE_QUERIES[0].sql);
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="glass-panel p-8 text-center">
        <div className="animate-pulse">
          Initializing PostgreSQL in browser...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel p-8">
        <div className="text-accent-pink font-bold mb-2">Database Error</div>
        <div className="text-foreground-secondary">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Sample Queries */}
      <div className="glass-panel p-8">
        <h4 className="text-xl font-bold mb-4">Sample Queries</h4>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === cat
                  ? "bg-accent-cyan text-background-primary font-bold"
                  : "bg-glass-background text-foreground-primary hover:bg-glass-highlight"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredQueries.map((sample, index) => (
            <button
              key={index}
              onClick={() => handleSampleQuery(sample.sql)}
              className="text-left p-4 bg-glass-background hover:bg-glass-highlight rounded-lg border border-glass-border transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="font-bold text-foreground-primary">
                  {sample.name}
                </div>
                <span className="text-xs px-2 py-1 rounded bg-glass-border text-foreground-secondary">
                  {sample.category}
                </span>
              </div>
              <div className="font-mono text-xs text-foreground-secondary truncate mb-2">
                {sample.sql}
              </div>
              {sample.description && (
                <div className="text-xs text-foreground-tertiary">
                  {sample.description}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Query Editor */}
      <div className="glass-panel p-8">
        <h3 className="text-2xl font-bold mb-4 glow-cyan">Query Editor</h3>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-48 font-mono text-sm bg-background-tertiary text-foreground-primary p-4 rounded-lg border border-glass-border focus:border-accent-cyan focus:outline-none resize-none"
          placeholder="Enter your SQL query here..."
        />

        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-3">
            <button
              onClick={() => runQuery()}
              disabled={isExecuting}
              className="button button-primary"
            >
              {isExecuting ? "Running..." : "Run Query"}
            </button>
            <button
              onClick={() => setQuery("")}
              className="button button-secondary"
            >
              Clear
            </button>
          </div>

          {executionTime && (
            <div className="text-foreground-secondary text-sm">
              Executed in {executionTime.toFixed(2)}ms
            </div>
          )}
        </div>

        {queryError && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
            <div className="text-accent-pink font-bold mb-1">Query Error</div>
            <div className="font-mono text-sm text-foreground-secondary">
              {queryError}
            </div>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="glass-panel p-8">
        <h4 className="text-xl font-bold mb-4">Results</h4>

        {results.length === 0 ? (
          <div className="text-center py-12 text-foreground-secondary">
            No results to display. Run a query to see results here.
          </div>
        ) : (
          (() => {
            const isQueryPlan =
              columns.length === 1 && columns[0] === "QUERY PLAN";
            if (isQueryPlan) {
              return (
                <pre className="font-mono text-sm bg-background-tertiary p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                  {results.map((row, i) => (
                    <div
                      key={i}
                      className="font-mono text-sm text-foreground-secondary"
                    >
                      {row["QUERY PLAN"]}
                    </div>
                  ))}
                </pre>
              );
            }
            return (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-glass-border">
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="text-left p-3 font-bold text-foreground-primary"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.slice(0, 100).map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className="border-b border-glass-border hover:bg-glass-highlight transition-colors"
                      >
                        {columns.map((col) => (
                          <td
                            key={col}
                            className="p-3 text-foreground-secondary"
                          >
                            {typeof row[col] === "object"
                              ? JSON.stringify(row[col])
                              : String(row[col] ?? "NULL")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {results.length > 100 && (
                  <div className="mt-4 text-center text-foreground-tertiary text-sm">
                    Showing first 100 of {results.length} rows
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
