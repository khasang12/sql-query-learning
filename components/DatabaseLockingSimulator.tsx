'use client'

import { useState, useEffect } from 'react'
import { PGlite } from '@electric-sql/pglite'

type TransactionState = {
  id: number
  sql: string
  isolationLevel: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE'
  isActive: boolean
  results: any[]
  error: string | null
  locks: any[]
}

type LockingScenario = {
  name: string
  description: string
  leftTransaction: string
  rightTransaction: string
  leftTitle: string
  rightTitle: string
}

const LOCKING_SCENARIOS: LockingScenario[] = [
  {
    name: 'Deadlock Scenario',
    description: 'Two transactions updating rows in opposite order causing deadlock',
    leftTransaction: `BEGIN;
UPDATE users SET name = 'Transaction 1' WHERE id = 1;
-- Wait for right transaction
UPDATE users SET name = 'Transaction 1 Blocked' WHERE id = 2;
COMMIT;`,
    rightTransaction: `BEGIN;
UPDATE users SET name = 'Transaction 2' WHERE id = 2;
-- Wait for left transaction
UPDATE users SET name = 'Transaction 2 Blocked' WHERE id = 1;
COMMIT;`,
    leftTitle: 'Transaction 1 (updates id 1 then 2)',
    rightTitle: 'Transaction 2 (updates id 2 then 1)',
  },
  {
    name: 'Row Locking',
    description: 'One transaction updates a row, another tries to read it',
    leftTransaction: `BEGIN;
UPDATE users SET email = 'locked@example.com' WHERE id = 1;
-- Holding lock (no pg_sleep in PGlite)
COMMIT;`,
    rightTransaction: `BEGIN;
-- Try to read locked row (will wait in READ COMMITTED)
SELECT * FROM users WHERE id = 1;
COMMIT;`,
    leftTitle: 'Transaction 1 (updates and holds lock)',
    rightTitle: 'Transaction 2 (reads locked row)',
  },
  {
    name: 'Table Lock',
    description: 'Exclusive lock on table blocks other transactions',
    leftTransaction: `BEGIN;
LOCK TABLE users IN EXCLUSIVE MODE;
-- Holding exclusive lock
COMMIT;`,
    rightTransaction: `BEGIN;
-- Try to query locked table
SELECT * FROM users LIMIT 1;
COMMIT;`,
    leftTitle: 'Transaction 1 (exclusive table lock)',
    rightTitle: 'Transaction 2 (tries to query)',
  },
  {
    name: 'Isolation Levels',
    description: 'Compare READ COMMITTED vs REPEATABLE READ behavior',
    leftTransaction: `BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT * FROM users WHERE id = 1;
-- Wait for right transaction to update
SELECT * FROM users WHERE id = 1;
COMMIT;`,
    rightTransaction: `BEGIN;
UPDATE users SET name = 'Updated Value' WHERE id = 1;
COMMIT;`,
    leftTitle: 'REPEATABLE READ (sees consistent snapshot)',
    rightTitle: 'UPDATE (changes data)',
  },
]

export function DatabaseLockingSimulator() {
  const [leftDb, setLeftDb] = useState<PGlite | null>(null)
  const [rightDb, setRightDb] = useState<PGlite | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [leftTransaction, setLeftTransaction] = useState<TransactionState>({
    id: 1,
    sql: LOCKING_SCENARIOS[0].leftTransaction,
    isolationLevel: 'READ COMMITTED',
    isActive: false,
    results: [],
    error: null,
    locks: [],
  })

  const [rightTransaction, setRightTransaction] = useState<TransactionState>({
    id: 2,
    sql: LOCKING_SCENARIOS[0].rightTransaction,
    isolationLevel: 'READ COMMITTED',
    isActive: false,
    results: [],
    error: null,
    locks: [],
  })

  const [selectedScenario, setSelectedScenario] = useState(0)
  const [isLeftExecuting, setIsLeftExecuting] = useState(false)
  const [isRightExecuting, setIsRightExecuting] = useState(false)

  // Initialize databases
  useEffect(() => {
    let mounted = true
    let initializationTimeout: NodeJS.Timeout

    async function initializeDatabases() {
      try {
        console.log('DatabaseLockingSimulator: Initializing databases...')

        // Create two separate database instances
        const left = new PGlite()
        const right = new PGlite()

        // Wait for databases to be ready with timeout
        console.log('DatabaseLockingSimulator: Waiting for databases to be ready (up to 30s)...')
        await Promise.race([
          Promise.all([left.waitReady, right.waitReady]),
          new Promise((_, reject) => {
            initializationTimeout = setTimeout(() => {
              reject(new Error('Database initialization timeout after 30 seconds. This can happen on slower devices or initial WASM loading.'))
            }, 30000)
          })
        ])
        clearTimeout(initializationTimeout)
        console.log('DatabaseLockingSimulator: Databases are ready')

        // Seed both databases with sample data
        console.log('DatabaseLockingSimulator: Seeding left database...')
        await seedDatabase(left)
        console.log('DatabaseLockingSimulator: Seeding right database...')
        await seedDatabase(right)
        console.log('DatabaseLockingSimulator: Databases seeded')

        if (mounted) {
          setLeftDb(left)
          setRightDb(right)
          setIsLoading(false)
          console.log('DatabaseLockingSimulator: All databases initialized and seeded successfully')
        }
      } catch (err) {
        console.error('DatabaseLockingSimulator: Failed to initialize:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error')
          setIsLoading(false)
        }
      }
    }

    initializeDatabases()

    return () => {
      mounted = false
      if (initializationTimeout) clearTimeout(initializationTimeout)
    }
  }, [])

  async function seedDatabase(db: PGlite) {
    console.log('DatabaseLockingSimulator: Starting database seeding...')

    // Create tables if they don't exist (simplified version matching PGliteProvider)
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100),
          email VARCHAR(100) UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('DatabaseLockingSimulator: Created users table')

      await db.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          amount DECIMAL(10, 2),
          status VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('DatabaseLockingSimulator: Created orders table')

      // Insert sample data if empty
      const userCount = await db.query('SELECT COUNT(*) as count FROM users') as { rows: { count: string }[] }
      console.log('DatabaseLockingSimulator: User count:', userCount.rows[0]?.count)

      if (userCount.rows[0]?.count === '0' || userCount.rows[0]?.count.toString() === '0') {
        // Insert 20 sample users (enough for locking scenarios)
        const userValues = []
        for (let i = 1; i <= 20; i++) {
          userValues.push(`('User ${i}', 'user${i}@example.com')`)
        }
        console.log('DatabaseLockingSimulator: Inserting users...')
        await db.query(`INSERT INTO users (name, email) VALUES ${userValues.join(',')}`)
        console.log('DatabaseLockingSimulator: Users inserted')

        // Insert 50 sample orders with random user associations
        console.log('DatabaseLockingSimulator: Generating orders...')
        const orderValues = []
        const statuses = ['completed', 'pending', 'cancelled']
        for (let i = 1; i <= 50; i++) {
          const userId = Math.floor(Math.random() * 20) + 1
          const amount = (Math.random() * 1000).toFixed(2)
          const status = statuses[Math.floor(Math.random() * statuses.length)]
          orderValues.push(`(${userId}, ${amount}, '${status}')`)
        }
        await db.query(`INSERT INTO orders (user_id, amount, status) VALUES ${orderValues.join(',')}`)
        console.log('DatabaseLockingSimulator: Orders inserted')
      }

      // Create indexes
      console.log('DatabaseLockingSimulator: Creating indexes...')
      await db.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
      await db.query('CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)')
      console.log('DatabaseLockingSimulator: Indexes created')
    } catch (err) {
      console.error('DatabaseLockingSimulator: Seeding error:', err)
      throw err
    }

    console.log('DatabaseLockingSimulator: Database seeding complete')
  }

  async function executeTransaction(db: PGlite, transaction: TransactionState): Promise<{ results: any[], error: string | null, locks: any[] }> {
    const results = []
    let error = null
    const locks = []

    try {
      // Split SQL by semicolons
      const statements = transaction.sql.split(';').filter(stmt => stmt.trim())

      for (const stmt of statements) {
        const trimmed = stmt.trim()
        if (!trimmed) continue

        console.log(`Executing: ${trimmed}`)
        const result = await db.query(trimmed)

        // Try to extract rows from result
        let rows: any[] = []
        if (result && typeof result === 'object' && 'rows' in result) {
          rows = (result as any).rows || []
        } else if (Array.isArray(result)) {
          rows = result
        }

        results.push({ statement: trimmed, rows })
      }

      // Try to query lock information
      try {
        const lockResult = await db.query(`
          SELECT locktype, relation::regclass, mode, granted, pid
          FROM pg_locks
          WHERE relation IS NOT NULL
          ORDER BY relation, mode
        `) as { rows: any[] }
        locks.push(...lockResult.rows)
      } catch (lockErr) {
        console.log('Could not query pg_locks:', lockErr)
      }

    } catch (err) {
      console.error('Transaction execution error:', err)
      error = err instanceof Error ? err.message : 'Unknown error'
    }

    return { results, error, locks }
  }

  async function runLeftTransaction() {
    if (!leftDb) return

    setIsLeftExecuting(true)
    setLeftTransaction(prev => ({ ...prev, error: null, results: [], locks: [] }))

    const { results, error, locks } = await executeTransaction(leftDb, leftTransaction)

    setLeftTransaction(prev => ({
      ...prev,
      results,
      error,
      locks,
      isActive: true
    }))
    setIsLeftExecuting(false)
  }

  async function runRightTransaction() {
    if (!rightDb) return

    setIsRightExecuting(true)
    setRightTransaction(prev => ({ ...prev, error: null, results: [], locks: [] }))

    const { results, error, locks } = await executeTransaction(rightDb, rightTransaction)

    setRightTransaction(prev => ({
      ...prev,
      results,
      error,
      locks,
      isActive: true
    }))
    setIsRightExecuting(false)
  }

  async function runBothTransactions() {
    await Promise.all([runLeftTransaction(), runRightTransaction()])
  }

  function selectScenario(index: number) {
    const scenario = LOCKING_SCENARIOS[index]
    setSelectedScenario(index)
    setLeftTransaction(prev => ({ ...prev, sql: scenario.leftTransaction }))
    setRightTransaction(prev => ({ ...prev, sql: scenario.rightTransaction }))
  }

  function resetDatabases() {
    // Reload the component to reset databases
    window.location.reload()
  }

  if (isLoading) {
    return (
      <div className="glass-panel p-8 text-center">
        <div className="animate-pulse mb-4">Initializing locking simulator databases...</div>
        <div className="text-sm text-foreground-secondary">
          This may take a few seconds. Creating two separate PostgreSQL instances in your browser.
        </div>
        {error && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
            <div className="text-accent-pink font-bold mb-1">Initialization Error</div>
            <div className="font-mono text-sm text-foreground-secondary">{error}</div>
          </div>
        )}
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
        <h4 className="text-xl font-bold mb-4">Locking Scenarios</h4>
        <p className="text-foreground-secondary mb-6">
          Select a scenario to explore different database locking behaviors and isolation levels.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {LOCKING_SCENARIOS.map((scenario, index) => (
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

      {/* Transaction Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-panel p-6 text-center">
          <div className="text-2xl font-bold glow-cyan mb-2">Transaction 1</div>
          <div className="text-foreground-secondary">Left Transaction</div>
        </div>
        <div className="glass-panel p-6 text-center">
          <div className="text-2xl font-bold glow-purple mb-2">Transaction 2</div>
          <div className="text-foreground-secondary">Right Transaction</div>
        </div>
      </div>

      {/* Transaction Editors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Transaction Editor */}
        <div className="glass-panel p-8">
          <h4 className="text-xl font-bold mb-4 glow-cyan">Transaction 1</h4>

          <div className="mb-4">
            <label className="block text-foreground-secondary mb-2">Isolation Level</label>
            <select
              value={leftTransaction.isolationLevel}
              onChange={(e) => setLeftTransaction(prev => ({ ...prev, isolationLevel: e.target.value as any }))}
              className="w-full bg-glass-background border border-glass-border rounded-lg p-3 text-foreground-primary"
            >
              <option value="READ COMMITTED">READ COMMITTED</option>
              <option value="REPEATABLE READ">REPEATABLE READ</option>
              <option value="SERIALIZABLE">SERIALIZABLE</option>
            </select>
          </div>

          <textarea
            value={leftTransaction.sql}
            onChange={(e) => setLeftTransaction(prev => ({ ...prev, sql: e.target.value }))}
            className="w-full h-64 font-mono text-sm bg-background-tertiary text-foreground-primary p-4 rounded-lg border border-glass-border focus:border-accent-cyan focus:outline-none resize-none"
            placeholder="BEGIN;... COMMIT;"
          />

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={runLeftTransaction}
              disabled={isLeftExecuting}
              className="button button-primary"
            >
              {isLeftExecuting ? 'Running...' : 'Run Transaction 1'}
            </button>
          </div>

          {leftTransaction.error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
              <div className="text-accent-pink font-bold mb-1">Transaction Error</div>
              <div className="font-mono text-sm text-foreground-secondary">{leftTransaction.error}</div>
            </div>
          )}
        </div>

        {/* Right Transaction Editor */}
        <div className="glass-panel p-8">
          <h4 className="text-xl font-bold mb-4 glow-purple">Transaction 2</h4>

          <div className="mb-4">
            <label className="block text-foreground-secondary mb-2">Isolation Level</label>
            <select
              value={rightTransaction.isolationLevel}
              onChange={(e) => setRightTransaction(prev => ({ ...prev, isolationLevel: e.target.value as any }))}
              className="w-full bg-glass-background border border-glass-border rounded-lg p-3 text-foreground-primary"
            >
              <option value="READ COMMITTED">READ COMMITTED</option>
              <option value="REPEATABLE READ">REPEATABLE READ</option>
              <option value="SERIALIZABLE">SERIALIZABLE</option>
            </select>
          </div>

          <textarea
            value={rightTransaction.sql}
            onChange={(e) => setRightTransaction(prev => ({ ...prev, sql: e.target.value }))}
            className="w-full h-64 font-mono text-sm bg-background-tertiary text-foreground-primary p-4 rounded-lg border border-glass-border focus:border-accent-purple focus:outline-none resize-none"
            placeholder="BEGIN;... COMMIT;"
          />

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={runRightTransaction}
              disabled={isRightExecuting}
              className="button button-primary"
            >
              {isRightExecuting ? 'Running...' : 'Run Transaction 2'}
            </button>
          </div>

          {rightTransaction.error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
              <div className="text-accent-pink font-bold mb-1">Transaction Error</div>
              <div className="font-mono text-sm text-foreground-secondary">{rightTransaction.error}</div>
            </div>
          )}
        </div>
      </div>

      {/* Run Both Button */}
      <div className="text-center">
        <button
          onClick={runBothTransactions}
          disabled={isLeftExecuting || isRightExecuting}
          className="button button-primary px-8 py-4 text-lg"
        >
          {isLeftExecuting || isRightExecuting ? 'Running Both...' : 'Run Both Transactions'}
        </button>

        <button
          onClick={resetDatabases}
          className="button button-secondary ml-4 px-8 py-4 text-lg"
        >
          Reset Databases
        </button>
      </div>

      {/* Results Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Results */}
        <div className="glass-panel p-8">
          <h4 className="text-xl font-bold mb-4 glow-cyan">Transaction 1 Results</h4>
          {leftTransaction.results.length === 0 ? (
            <div className="text-center py-12 text-foreground-secondary">
              No results to display. Run a transaction to see results.
            </div>
          ) : (
            <div className="space-y-4">
              {leftTransaction.results.map((result: Record<string, any>, i: number) => (
                <div key={i} className="border border-glass-border rounded-lg p-4">
                  <div className="font-mono text-sm text-foreground-secondary mb-2">
                    {result.statement}
                  </div>
                  {result.rows.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-foreground-tertiary mb-1">Rows affected: {result.rows.length}</div>
                      {typeof result.rows[0] === 'object' && result.rows[0] !== null && Object.keys(result.rows[0]).length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-glass-border">
                                {Object.keys(result.rows[0]).map((col) => (
                                  <th key={col} className="text-left p-2 font-bold text-foreground-primary">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {result.rows.slice(0, 10).map((row: Record<string, any>, idx: number) => (
                                <tr key={idx} className="border-b border-glass-border hover:bg-glass-highlight">
                                  {Object.keys(result.rows[0]).map((col) => (
                                    <td key={col} className="p-2 text-foreground-secondary">
                                      {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? 'NULL')}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {result.rows.length > 10 && (
                            <div className="mt-2 text-center text-foreground-tertiary text-xs">
                              Showing first 10 of {result.rows.length} rows
                            </div>
                          )}
                        </div>
                      ) : (
                        <pre className="text-xs bg-background-tertiary p-2 rounded overflow-x-auto">
                          {JSON.stringify(result.rows, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Lock Information */}
          {leftTransaction.locks.length > 0 && (
            <div className="mt-8">
              <h5 className="font-bold text-foreground-primary mb-2">Locks Held</h5>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-glass-border">
                      <th className="text-left p-2 font-bold text-foreground-primary">Type</th>
                      <th className="text-left p-2 font-bold text-foreground-primary">Relation</th>
                      <th className="text-left p-2 font-bold text-foreground-primary">Mode</th>
                      <th className="text-left p-2 font-bold text-foreground-primary">Granted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leftTransaction.locks.slice(0, 10).map((lock: Record<string, any>, i: number) => (
                      <tr key={i} className="border-b border-glass-border hover:bg-glass-highlight">
                        <td className="p-2 text-foreground-secondary">{lock.locktype}</td>
                        <td className="p-2 text-foreground-secondary">{lock.relation}</td>
                        <td className="p-2 text-foreground-secondary">{lock.mode}</td>
                        <td className="p-2 text-foreground-secondary">{lock.granted ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Results */}
        <div className="glass-panel p-8">
          <h4 className="text-xl font-bold mb-4 glow-purple">Transaction 2 Results</h4>
          {rightTransaction.results.length === 0 ? (
            <div className="text-center py-12 text-foreground-secondary">
              No results to display. Run a transaction to see results.
            </div>
          ) : (
            <div className="space-y-4">
              {rightTransaction.results.map((result: Record<string, any>, i: number) => (
                <div key={i} className="border border-glass-border rounded-lg p-4">
                  <div className="font-mono text-sm text-foreground-secondary mb-2">
                    {result.statement}
                  </div>
                  {result.rows.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-foreground-tertiary mb-1">Rows affected: {result.rows.length}</div>
                      {typeof result.rows[0] === 'object' && result.rows[0] !== null && Object.keys(result.rows[0]).length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-glass-border">
                                {Object.keys(result.rows[0]).map((col) => (
                                  <th key={col} className="text-left p-2 font-bold text-foreground-primary">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {result.rows.slice(0, 10).map((row: Record<string, any>, idx: number) => (
                                <tr key={idx} className="border-b border-glass-border hover:bg-glass-highlight">
                                  {Object.keys(result.rows[0]).map((col) => (
                                    <td key={col} className="p-2 text-foreground-secondary">
                                      {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? 'NULL')}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {result.rows.length > 10 && (
                            <div className="mt-2 text-center text-foreground-tertiary text-xs">
                              Showing first 10 of {result.rows.length} rows
                            </div>
                          )}
                        </div>
                      ) : (
                        <pre className="text-xs bg-background-tertiary p-2 rounded overflow-x-auto">
                          {JSON.stringify(result.rows, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Lock Information */}
          {rightTransaction.locks.length > 0 && (
            <div className="mt-8">
              <h5 className="font-bold text-foreground-primary mb-2">Locks Held</h5>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-glass-border">
                      <th className="text-left p-2 font-bold text-foreground-primary">Type</th>
                      <th className="text-left p-2 font-bold text-foreground-primary">Relation</th>
                      <th className="text-left p-2 font-bold text-foreground-primary">Mode</th>
                      <th className="text-left p-2 font-bold text-foreground-primary">Granted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rightTransaction.locks.slice(0, 10).map((lock: Record<string, any>, i: number) => (
                      <tr key={i} className="border-b border-glass-border hover:bg-glass-highlight">
                        <td className="p-2 text-foreground-secondary">{lock.locktype}</td>
                        <td className="p-2 text-foreground-secondary">{lock.relation}</td>
                        <td className="p-2 text-foreground-secondary">{lock.mode}</td>
                        <td className="p-2 text-foreground-secondary">{lock.granted ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Educational Notes */}
      <div className="glass-panel p-8">
        <h4 className="text-xl font-bold mb-4">About Database Locking</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h5 className="font-bold text-accent-cyan">Lock Types</h5>
            <ul className="text-foreground-secondary text-sm space-y-1">
              <li>• <strong>Row-level locks</strong>: Lock individual rows</li>
              <li>• <strong>Table locks</strong>: Lock entire tables</li>
              <li>• <strong>Advisory locks</strong>: Application-defined locks</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h5 className="font-bold text-accent-purple">Isolation Levels</h5>
            <ul className="text-foreground-secondary text-sm space-y-1">
              <li>• <strong>READ COMMITTED</strong>: See only committed changes</li>
              <li>• <strong>REPEATABLE READ</strong>: Consistent snapshot</li>
              <li>• <strong>SERIALIZABLE</strong>: Serializable transactions</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h5 className="font-bold text-accent-pink">Common Issues</h5>
            <ul className="text-foreground-secondary text-sm space-y-1">
              <li>• <strong>Deadlocks</strong>: Circular wait dependencies</li>
              <li>• <strong>Lock contention</strong>: High wait times</li>
              <li>• <strong>Lock escalation</strong>: Row to table locks</li>
            </ul>
          </div>
        </div>
        <div className="mt-6 p-4 bg-glass-background rounded-lg border border-glass-border">
          <h5 className="font-bold text-foreground-primary mb-2">Note on Simulation</h5>
          <p className="text-sm text-foreground-secondary">
            This simulator uses separate PostgreSQL instances for each transaction to demonstrate locking concepts.
            In a real database, transactions would share the same database instance and locks would actually block concurrent access.
            The SQL shown is educational - run transactions sequentially to see expected behavior.
          </p>
        </div>
      </div>
    </div>
  )
}