'use client'

import { useState, useEffect } from 'react'
import { usePGlite } from './PGliteProvider'

type QueryResult = {
  rows: any[]
  columns: string[]
  executionTime: number | null
  error: string | null
  isQueryPlan: boolean
}

type ComparisonScenario = {
  name: string
  description: string
  leftQuery: string
  rightQuery: string
  leftTitle: string
  rightTitle: string
}

const COMPARISON_SCENARIOS: ComparisonScenario[] = [
  {
    name: 'B-tree vs GIN - Full-text search',
    description: 'Compare B-tree (LIKE) vs GIN (tsvector) for text search',
    leftQuery: `EXPLAIN ANALYZE SELECT * FROM documents WHERE content LIKE '%index%'`,
    rightQuery: `EXPLAIN ANALYZE SELECT * FROM documents WHERE to_tsvector('english', content) @@ to_tsquery('english', 'index')`,
    leftTitle: 'B-tree (LIKE pattern)',
    rightTitle: 'GIN (Full-text search)',
  },
  {
    name: 'Array operations - = vs @>',
    description: 'Compare equality on array vs array containment with GIN',
    leftQuery: `EXPLAIN ANALYZE SELECT * FROM documents WHERE tags = '{database, postgresql}'`,
    rightQuery: `EXPLAIN ANALYZE SELECT * FROM documents WHERE tags @> '{database}'`,
    leftTitle: 'Array equality',
    rightTitle: 'Array containment (GIN)',
  },
  {
    name: 'JSONB - -> vs @>',
    description: 'Compare JSONB field access vs JSONB containment with GIN',
    leftQuery: `EXPLAIN ANALYZE SELECT * FROM documents WHERE metadata->>'category' = 'database'`,
    rightQuery: `EXPLAIN ANALYZE SELECT * FROM documents WHERE metadata @> '{"category": "database"}'`,
    leftTitle: 'JSONB field access',
    rightTitle: 'JSONB containment (GIN)',
  },
  {
    name: 'Index-only vs Regular Scan',
    description: 'Compare index-only scan (covers column) vs regular index scan',
    leftQuery: `EXPLAIN ANALYZE SELECT email FROM users WHERE email LIKE 'a%'`,
    rightQuery: `EXPLAIN ANALYZE SELECT * FROM users WHERE email LIKE 'a%'`,
    leftTitle: 'Index-only Scan (covers email)',
    rightTitle: 'Regular Index Scan',
  },
  {
    name: 'With vs Without Index',
    description: 'Compare indexed lookup (email) vs sequential scan (name pattern)',
    leftQuery: `EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user1@example.com'`,
    rightQuery: `EXPLAIN ANALYZE SELECT * FROM users WHERE name LIKE '%a%'`,
    leftTitle: 'Index Scan (email has index)',
    rightTitle: 'Sequential Scan (name pattern)',
  },
]

export function IndexComparison() {
  const { executeQuery, isLoading, error } = usePGlite()
  const [leftQuery, setLeftQuery] = useState(COMPARISON_SCENARIOS[0].leftQuery)
  const [rightQuery, setRightQuery] = useState(COMPARISON_SCENARIOS[0].rightQuery)
  const [leftTitle, setLeftTitle] = useState(COMPARISON_SCENARIOS[0].leftTitle)
  const [rightTitle, setRightTitle] = useState(COMPARISON_SCENARIOS[0].rightTitle)
  const [leftResult, setLeftResult] = useState<QueryResult>({
    rows: [], columns: [], executionTime: null, error: null, isQueryPlan: false
  })
  const [rightResult, setRightResult] = useState<QueryResult>({
    rows: [], columns: [], executionTime: null, error: null, isQueryPlan: false
  })
  const [selectedScenario, setSelectedScenario] = useState(0)
  const [isLeftExecuting, setIsLeftExecuting] = useState(false)
  const [isRightExecuting, setIsRightExecuting] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      // Run initial queries
      runLeftQuery(COMPARISON_SCENARIOS[0].leftQuery)
      runRightQuery(COMPARISON_SCENARIOS[0].rightQuery)
    }
  }, [isLoading])

  async function runQuery(sql: string): Promise<QueryResult> {
    try {
      console.log('IndexComparison: Running query:', sql)
      const startTime = performance.now()
      const rows = await executeQuery(sql)
      const endTime = performance.now()

      const executionTime = endTime - startTime
      let columns: string[] = []
      let isQueryPlan = false

      if (rows.length > 0) {
        const firstRow = rows[0]
        columns = Object.keys(firstRow)
        isQueryPlan = columns.length === 1 && columns[0] === 'QUERY PLAN'
      }

      return {
        rows,
        columns,
        executionTime,
        error: null,
        isQueryPlan,
      }
    } catch (err) {
      console.error('IndexComparison: Query error:', err)
      return {
        rows: [],
        columns: [],
        executionTime: null,
        error: err instanceof Error ? err.message : 'Unknown error',
        isQueryPlan: false,
      }
    }
  }

  async function runLeftQuery(sql?: string) {
    const query = sql || leftQuery
    setIsLeftExecuting(true)
    const result = await runQuery(query)
    setLeftResult(result)
    setIsLeftExecuting(false)
  }

  async function runRightQuery(sql?: string) {
    const query = sql || rightQuery
    setIsRightExecuting(true)
    const result = await runQuery(query)
    setRightResult(result)
    setIsRightExecuting(false)
  }

  async function runBothQueries() {
    await Promise.all([runLeftQuery(), runRightQuery()])
  }

  function getScanType(rows: any[]): string {
    if (rows.length === 0) return 'No plan'

    const planText = rows.map(row => row['QUERY PLAN'] || '').join(' ')

    if (planText.includes('Index Scan')) return 'Index Scan'
    if (planText.includes('Seq Scan')) return 'Sequential Scan'
    if (planText.includes('Bitmap Index Scan')) return 'Bitmap Index Scan'
    if (planText.includes('Bitmap Heap Scan')) return 'Bitmap Heap Scan'
    if (planText.includes('Index Only Scan')) return 'Index Only Scan'

    return 'Unknown Scan'
  }

  function selectScenario(index: number) {
    const scenario = COMPARISON_SCENARIOS[index]
    setSelectedScenario(index)
    setLeftQuery(scenario.leftQuery)
    setRightQuery(scenario.rightQuery)
    setLeftTitle(scenario.leftTitle)
    setRightTitle(scenario.rightTitle)
    runLeftQuery(scenario.leftQuery)
    runRightQuery(scenario.rightQuery)
  }

  if (isLoading) {
    return (
      <div className="glass-panel p-8 text-center">
        <div className="animate-pulse">Initializing PostgreSQL in browser...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-panel p-8">
        <div className="text-accent-pink font-bold mb-2">Database Error</div>
        <div className="text-foreground-secondary">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Scenario Selector */}
      <div className="glass-panel p-8">
        <h4 className="text-xl font-bold mb-4">Comparison Scenarios</h4>
        <p className="text-foreground-secondary mb-6">
          Select a scenario to compare different indexing strategies and query approaches.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {COMPARISON_SCENARIOS.map((scenario, index) => (
            <button
              key={index}
              onClick={() => selectScenario(index)}
              className={`p-4 rounded-lg border text-left transition-colors ${
                selectedScenario === index
                  ? 'border-accent-purple bg-purple-500/20'
                  : 'border-glass-border bg-glass-background hover:bg-glass-highlight'
              }`}
            >
              <div className="font-bold text-foreground-primary">{scenario.name}</div>
              <div className="text-sm text-foreground-secondary mt-1">
                {scenario.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-panel p-6 text-center">
          <div className="text-2xl font-bold glow-cyan mb-2">{leftTitle}</div>
          <div className="text-foreground-secondary">Left Query</div>
        </div>
        <div className="glass-panel p-6 text-center">
          <div className="text-2xl font-bold glow-purple mb-2">{rightTitle}</div>
          <div className="text-foreground-secondary">Right Query</div>
        </div>
      </div>

      {/* Query Editors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Query Editor */}
        <div className="glass-panel p-8">
          <h4 className="text-xl font-bold mb-4 glow-cyan">Left Query</h4>
          <textarea
            value={leftQuery}
            onChange={(e) => setLeftQuery(e.target.value)}
            className="w-full h-48 font-mono text-sm bg-background-tertiary text-foreground-primary p-4 rounded-lg border border-glass-border focus:border-accent-cyan focus:outline-none resize-none"
            placeholder="Enter left query..."
          />
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => runLeftQuery()}
              disabled={isLeftExecuting}
              className="button button-primary"
            >
              {isLeftExecuting ? 'Running...' : 'Run Left Query'}
            </button>
            {leftResult.executionTime && (
              <div className="text-foreground-secondary text-sm">
                {leftResult.executionTime.toFixed(2)}ms
              </div>
            )}
          </div>
          {leftResult.error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
              <div className="text-accent-pink font-bold mb-1">Query Error</div>
              <div className="font-mono text-sm text-foreground-secondary">{leftResult.error}</div>
            </div>
          )}
        </div>

        {/* Right Query Editor */}
        <div className="glass-panel p-8">
          <h4 className="text-xl font-bold mb-4 glow-purple">Right Query</h4>
          <textarea
            value={rightQuery}
            onChange={(e) => setRightQuery(e.target.value)}
            className="w-full h-48 font-mono text-sm bg-background-tertiary text-foreground-primary p-4 rounded-lg border border-glass-border focus:border-accent-purple focus:outline-none resize-none"
            placeholder="Enter right query..."
          />
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => runRightQuery()}
              disabled={isRightExecuting}
              className="button button-primary"
            >
              {isRightExecuting ? 'Running...' : 'Run Right Query'}
            </button>
            {rightResult.executionTime && (
              <div className="text-foreground-secondary text-sm">
                {rightResult.executionTime.toFixed(2)}ms
              </div>
            )}
          </div>
          {rightResult.error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
              <div className="text-accent-pink font-bold mb-1">Query Error</div>
              <div className="font-mono text-sm text-foreground-secondary">{rightResult.error}</div>
            </div>
          )}
        </div>
      </div>

      {/* Run Both Button */}
      <div className="text-center">
        <button
          onClick={runBothQueries}
          disabled={isLeftExecuting || isRightExecuting}
          className="button button-primary px-8 py-4 text-lg"
        >
          {isLeftExecuting || isRightExecuting ? 'Running Both...' : 'Run Both Queries'}
        </button>
      </div>

      {/* Results Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Results */}
        <div className="glass-panel p-8">
          <h4 className="text-xl font-bold mb-4 glow-cyan">Left Results</h4>
          {leftResult.rows.length === 0 ? (
            <div className="text-center py-12 text-foreground-secondary">
              No results to display.
            </div>
          ) : leftResult.isQueryPlan ? (
            <div>
              <div className="mb-3">
                <span className="inline-block px-3 py-1 rounded-full text-sm font-bold bg-accent-cyan/20 text-accent-cyan">
                  {getScanType(leftResult.rows)}
                </span>
              </div>
              <pre className="font-mono text-sm bg-background-tertiary p-4 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                {leftResult.rows.map((row, i) => (
                  <div key={i} className="font-mono text-sm text-foreground-secondary">
                    {row['QUERY PLAN']}
                  </div>
                ))}
              </pre>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-glass-border">
                    {leftResult.columns.map((col) => (
                      <th key={col} className="text-left p-3 font-bold text-foreground-primary">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leftResult.rows.slice(0, 50).map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="border-b border-glass-border hover:bg-glass-highlight transition-colors"
                    >
                      {leftResult.columns.map((col) => (
                        <td key={col} className="p-3 text-foreground-secondary">
                          {typeof row[col] === 'object'
                            ? JSON.stringify(row[col])
                            : String(row[col] ?? 'NULL')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {leftResult.rows.length > 50 && (
                <div className="mt-4 text-center text-foreground-tertiary text-sm">
                  Showing first 50 of {leftResult.rows.length} rows
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Results */}
        <div className="glass-panel p-8">
          <h4 className="text-xl font-bold mb-4 glow-purple">Right Results</h4>
          {rightResult.rows.length === 0 ? (
            <div className="text-center py-12 text-foreground-secondary">
              No results to display.
            </div>
          ) : rightResult.isQueryPlan ? (
            <div>
              <div className="mb-3">
                <span className="inline-block px-3 py-1 rounded-full text-sm font-bold bg-accent-purple/20 text-accent-purple">
                  {getScanType(rightResult.rows)}
                </span>
              </div>
              <pre className="font-mono text-sm bg-background-tertiary p-4 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                {rightResult.rows.map((row, i) => (
                  <div key={i} className="font-mono text-sm text-foreground-secondary">
                    {row['QUERY PLAN']}
                  </div>
                ))}
              </pre>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-glass-border">
                    {rightResult.columns.map((col) => (
                      <th key={col} className="text-left p-3 font-bold text-foreground-primary">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rightResult.rows.slice(0, 50).map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="border-b border-glass-border hover:bg-glass-highlight transition-colors"
                    >
                      {rightResult.columns.map((col) => (
                        <td key={col} className="p-3 text-foreground-secondary">
                          {typeof row[col] === 'object'
                            ? JSON.stringify(row[col])
                            : String(row[col] ?? 'NULL')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rightResult.rows.length > 50 && (
                <div className="mt-4 text-center text-foreground-tertiary text-sm">
                  Showing first 50 of {rightResult.rows.length} rows
                </div>
              )}
            </div>
          )}
        </div>
      </div>


    </div>
  )
}