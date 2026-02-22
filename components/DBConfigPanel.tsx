'use client'

import { useState, useEffect } from 'react'
import { usePGlite } from './PGliteProvider'

const COMMON_CONFIGS = [
  {
    name: 'work_mem',
    description: 'Amount of memory used for query operations like sorting and hash tables',
    defaultValue: '4MB',
    suggestedValues: ['1MB', '4MB', '16MB', '64MB'],
  },
  {
    name: 'shared_buffers',
    description: 'Amount of memory dedicated for caching data',
    defaultValue: '128MB',
    suggestedValues: ['64MB', '128MB', '256MB', '512MB'],
  },
  {
    name: 'effective_cache_size',
    description: 'Estimate of memory available for disk caching',
    defaultValue: '4GB',
    suggestedValues: ['1GB', '2GB', '4GB', '8GB'],
  },
  {
    name: 'random_page_cost',
    description: 'Cost estimate for non-sequential disk page fetch',
    defaultValue: '4.0',
    suggestedValues: ['1.0', '2.0', '4.0', '8.0'],
  },
  {
    name: 'enable_seqscan',
    description: 'Enable or disable sequential scans (for testing)',
    defaultValue: 'on',
    suggestedValues: ['on', 'off'],
  },
]

const TEST_QUERIES: Record<string, { sql: string; description: string }> = {
  work_mem: {
    sql: 'SELECT * FROM users ORDER BY name LIMIT 100',
    description: 'Sorting operation that uses work_mem for sorting in memory',
  },
  shared_buffers: {
    sql: 'SELECT COUNT(*) FROM orders',
    description: 'Full table scan that may benefit from shared_buffers caching',
  },
  effective_cache_size: {
    sql: "EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'alice@example.com'",
    description: 'Query plan influenced by effective_cache_size estimation',
  },
  random_page_cost: {
    sql: 'EXPLAIN ANALYZE SELECT * FROM products ORDER BY price DESC',
    description: 'Index scan vs sequential scan decision influenced by random_page_cost',
  },
  enable_seqscan: {
    sql: "EXPLAIN ANALYZE SELECT * FROM users WHERE name LIKE 'A%'",
    description: 'Sequential scan forced when enable_seqscan is off',
  },
}

export function DBConfigPanel() {
  const { executeQuery } = usePGlite()
  const [selectedConfig, setSelectedConfig] = useState(COMMON_CONFIGS[0])
  const [customValue, setCustomValue] = useState('')
  const [isApplying, setIsApplying] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [testQuery, setTestQuery] = useState<string>('')
  const [testResults, setTestResults] = useState<any[]>([])
  const [testColumns, setTestColumns] = useState<string[]>([])
  const [testExecutionTime, setTestExecutionTime] = useState<number | null>(null)
  const [previousExecutionTime, setPreviousExecutionTime] = useState<number | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    const testQuery = TEST_QUERIES[selectedConfig.name]?.sql || ''
    setTestQuery(testQuery)
  }, [selectedConfig.name])

  async function applyConfig(configName: string, value: string) {
    setIsApplying(true)
    setMessage(null)

    try {
      // Note: In PGlite (WASM), some configuration changes may be restricted
      // We'll try to apply but handle errors gracefully
      await executeQuery(`SET ${configName} = '${value}'`)
      setMessage({
        type: 'success',
        text: `Set ${configName} = ${value} successfully`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setMessage({
        type: 'error',
        text: `Could not set ${configName}: ${errorMessage}. Some configurations are read-only in WASM mode.`,
      })
    } finally {
      setIsApplying(false)
    }
  }

  async function runTestQuery(sql?: string) {
    const query = sql || testQuery
    if (!query.trim()) return

    setIsTesting(true)
    setTestResults([])
    setTestColumns([])

    try {
      const startTime = performance.now()
      const rows = await executeQuery(query)
      const endTime = performance.now()

      const executionTime = endTime - startTime
      setPreviousExecutionTime(testExecutionTime)
      setTestExecutionTime(executionTime)

      if (rows.length > 0) {
        const firstRow = rows[0]
        setTestColumns(Object.keys(firstRow))
        setTestResults(rows)
      }
    } catch (err) {
      console.error('Test query failed:', err)
      setMessage({
        type: 'error',
        text: `Test query failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    } finally {
      setIsTesting(false)
    }
  }

  async function showCurrentConfig() {
    setIsApplying(true)
    setMessage(null)

    try {
      const result = await executeQuery(`SHOW ${selectedConfig.name}`)
      if (result.length > 0) {
        const currentValue = result[0][selectedConfig.name] || 'unknown'
        setMessage({
          type: 'success',
          text: `Current ${selectedConfig.name} = ${currentValue}`,
        })
        setCustomValue(String(currentValue))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setMessage({
        type: 'error',
        text: `Could not read configuration: ${errorMessage}`,
      })
    } finally {
      setIsApplying(false)
    }
  }

  function handleSuggestedValue(value: string) {
    setCustomValue(value)
    applyConfig(selectedConfig.name, value)
  }

  return (
    <div className="glass-panel p-8">
      <h3 className="text-2xl font-bold mb-6 glow-purple">Database Configuration</h3>
      <p className="text-foreground-secondary mb-8">
        Tune PostgreSQL parameters and see how they affect query performance.
        Note: Some configurations may be restricted in the browser environment.
      </p>

      {/* Config Selector */}
      <div className="mb-8">
        <label className="block text-foreground-primary font-medium mb-3">
          Select Configuration Parameter
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {COMMON_CONFIGS.map((config) => (
            <button
              key={config.name}
              onClick={() => {
                setSelectedConfig(config)
                setCustomValue(config.defaultValue)
              }}
              className={`p-4 rounded-lg border text-left transition-colors ${
                selectedConfig.name === config.name
                  ? 'border-accent-purple bg-purple-500/10'
                  : 'border-glass-border bg-glass-background hover:bg-glass-highlight'
              }`}
            >
              <div className="font-bold text-foreground-primary">{config.name}</div>
              <div className="text-sm text-foreground-secondary mt-1 truncate">
                {config.description}
              </div>
              <div className="text-xs text-foreground-tertiary mt-2">
                Default: {config.defaultValue}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Config Details */}
      <div className="mb-8 p-6 bg-background-tertiary rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-xl font-bold text-foreground-primary">
              {selectedConfig.name}
            </h4>
            <p className="text-foreground-secondary mt-1">
              {selectedConfig.description}
            </p>
          </div>
          <button
            onClick={showCurrentConfig}
            className="button button-secondary"
            disabled={isApplying}
          >
            Show Current
          </button>
        </div>

        {/* Suggested Values */}
        <div className="mb-6">
          <div className="text-foreground-primary font-medium mb-3">
            Suggested Values
          </div>
          <div className="flex flex-wrap gap-3">
            {selectedConfig.suggestedValues.map((value) => (
              <button
                key={value}
                onClick={() => handleSuggestedValue(value)}
                disabled={isApplying}
                className="px-4 py-2 bg-glass-background hover:bg-glass-highlight border border-glass-border rounded-lg transition-colors disabled:opacity-50"
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Value Input */}
        <div>
          <div className="text-foreground-primary font-medium mb-3">
            Custom Value
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              className="flex-1 bg-background-primary border border-glass-border rounded-lg px-4 py-2 text-foreground-primary focus:border-accent-purple focus:outline-none"
              placeholder="Enter custom value..."
            />
            <button
              onClick={() => applyConfig(selectedConfig.name, customValue)}
              disabled={isApplying || !customValue.trim()}
              className="button button-primary"
            >
              {isApplying ? 'Applying...' : 'Apply'}
            </button>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`p-4 rounded-lg mb-6 ${
            message.type === 'success'
              ? 'bg-green-900/20 border border-green-700/50'
              : 'bg-red-900/20 border border-red-700/50'
          }`}
        >
          <div
            className={`font-bold mb-1 ${
              message.type === 'success' ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {message.type === 'success' ? 'Success' : 'Note'}
          </div>
          <div className="text-foreground-secondary">{message.text}</div>
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
        <div className="text-blue-400 font-bold mb-1">Browser Limitations</div>
        <div className="text-foreground-secondary text-sm">
          PGlite runs PostgreSQL in WebAssembly with some restrictions. Memory-related
          configurations may not take effect as expected. This simulation demonstrates
          how DBAs tune production databases.
        </div>
      </div>

      {/* Test Configuration Impact */}
      <div className="mt-8 glass-panel p-8">
        <h4 className="text-xl font-bold mb-4 glow-green">Test Configuration Impact</h4>
        <p className="text-foreground-secondary mb-6">
          Run a test query to see how configuration changes affect performance.
        </p>

        <div className="mb-6">
          <div className="text-foreground-primary font-medium mb-2">Test Query</div>
          <textarea
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            className="w-full h-32 font-mono text-sm bg-background-tertiary text-foreground-primary p-4 rounded-lg border border-glass-border focus:border-accent-green focus:outline-none resize-none"
            placeholder="Test query will be auto-filled based on selected configuration..."
          />
          {TEST_QUERIES[selectedConfig.name]?.description && (
            <div className="mt-2 text-sm text-foreground-tertiary">
              {TEST_QUERIES[selectedConfig.name].description}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => runTestQuery()}
            disabled={isTesting || !testQuery.trim()}
            className="button button-primary"
          >
            {isTesting ? 'Running...' : 'Run Test Query'}
          </button>
          {testExecutionTime !== null && (
            <div className="text-foreground-secondary">
              Execution time: <span className="font-bold">{testExecutionTime.toFixed(2)}ms</span>
              {previousExecutionTime !== null && (
                <span className="ml-4">
                  Previous: <span className="font-bold">{previousExecutionTime.toFixed(2)}ms</span>
                  {testExecutionTime < previousExecutionTime ? (
                    <span className="ml-2 text-green-400">✓ Improved</span>
                  ) : testExecutionTime > previousExecutionTime ? (
                    <span className="ml-2 text-red-400">⏸️ Slower</span>
                  ) : null}
                </span>
              )}
            </div>
          )}
        </div>

        {testResults.length > 0 && (
          <div className="mt-6">
            <div className="text-foreground-primary font-medium mb-2">Test Results</div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-glass-border">
                    {testColumns.map((col) => (
                      <th key={col} className="text-left p-3 font-bold text-foreground-primary">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {testResults.slice(0, 50).map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="border-b border-glass-border hover:bg-glass-highlight transition-colors"
                    >
                      {testColumns.map((col) => (
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
              {testResults.length > 50 && (
                <div className="mt-4 text-center text-foreground-tertiary text-sm">
                  Showing first 50 of {testResults.length} rows
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}