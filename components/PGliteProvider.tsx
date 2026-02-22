'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { PGlite } from '@electric-sql/pglite'

interface PGliteContextType {
  db: PGlite | null
  isLoading: boolean
  error: string | null
  executeQuery: (sql: string) => Promise<any[]>
}

const PGliteContext = createContext<PGliteContextType | undefined>(undefined)

export function usePGlite() {
  const context = useContext(PGliteContext)
  if (!context) {
    throw new Error('usePGlite must be used within a PGliteProvider')
  }
  return context
}

interface PGliteProviderProps {
  children: ReactNode
}

export function PGliteProvider({ children }: PGliteProviderProps) {
  const [db, setDb] = useState<PGlite | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function initDatabase() {
      try {
        console.log('PGliteProvider: Initializing database...')
        // Initialize PGlite
        const database = new PGlite()
        await database.waitReady
        console.log('PGliteProvider: Database ready')

        // Seed with sample data
        console.log('PGliteProvider: Seeding database...')
        await seedDatabase(database)
        console.log('PGliteProvider: Database seeded')

        // Test that data was inserted correctly
        console.log('PGliteProvider: Testing data insertion...')
        try {
          const testUsers = await database.query('SELECT COUNT(*) as count FROM users') as { rows: { count: string }[] }
          const testOrders = await database.query('SELECT COUNT(*) as count FROM orders') as { rows: { count: string }[] }
          const testProducts = await database.query('SELECT COUNT(*) as count FROM products') as { rows: { count: string }[] }
          console.log('PGliteProvider: Test results - Users:', testUsers.rows[0]?.count, 'Orders:', testOrders.rows[0]?.count, 'Products:', testProducts.rows[0]?.count)
        } catch (testErr) {
          console.error('PGliteProvider: Test query failed:', testErr)
        }

        if (mounted) {
          setDb(database)
          setIsLoading(false)
          console.log('PGliteProvider: Database initialized successfully')
        }
      } catch (err) {
        console.error('Failed to initialize PGlite:', err)
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error'
          setError(errorMessage)
          setIsLoading(false)
        }
      }
    }

    initDatabase()

    return () => {
      mounted = false
    }
  }, [])

  async function executeQuery(sql: string): Promise<any[]> {
    if (!db) {
      throw new Error('Database not initialized')
    }

    try {
      console.log('Executing query:', sql)
      const result = await db.query(sql)
      console.log('Raw query result:', result)
      console.log('Result type:', typeof result)
      console.log('Result keys:', Object.keys(result))

      // Try different ways to extract rows
      let rows: any[] = []

      // Method 1: Check if result has rows property
      if (result && typeof result === 'object' && 'rows' in result) {
        rows = (result as any).rows || []
        console.log('Extracted rows via .rows property:', rows)
      }
      // Method 2: Check if result is an array
      else if (Array.isArray(result)) {
        rows = result
        console.log('Result is directly an array:', rows)
      }
      // Method 3: Check for other common properties
      else if (result && typeof result === 'object') {
        // Check for common result structures
        if ('data' in result && Array.isArray((result as any).data)) {
          rows = (result as any).data
          console.log('Extracted rows via .data property:', rows)
        } else if ('records' in result && Array.isArray((result as any).records)) {
          rows = (result as any).records
          console.log('Extracted rows via .records property:', rows)
        } else {
          // Try to convert object to array
          rows = Object.values(result)
          console.log('Converted object values to array:', rows)
        }
      }

      console.log('Final rows to return:', rows)
      return rows
    } catch (err) {
      console.error('Query execution error:', err)
      if (err instanceof Error) {
        throw err
      }
      throw new Error('Query execution failed')
    }
  }

  const value = {
    db,
    isLoading,
    error,
    executeQuery,
  }

  return (
    <PGliteContext.Provider value={value}>
      {children}
    </PGliteContext.Provider>
  )
}

async function seedDatabase(db: PGlite) {
  console.log('seedDatabase: Starting database seeding...')
  // Create sample tables
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log('seedDatabase: Created users table')

  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      amount DECIMAL(10, 2),
      status VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log('seedDatabase: Created orders table')

  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200),
      price DECIMAL(10, 2),
      category VARCHAR(100),
      in_stock BOOLEAN DEFAULT true
    )
  `)
  console.log('seedDatabase: Created products table')

  // Insert sample data if tables are empty
  const userCount = await db.query('SELECT COUNT(*) as count FROM users') as { rows: { count: string }[] }
  console.log('seedDatabase: User count query result:', userCount)
  const userCountValue = userCount.rows[0]?.count || '0'
  console.log('seedDatabase: User count value:', userCountValue)
  if (userCountValue === '0' || userCountValue.toString() === '0') {
    try {
      // Generate 100 users
      const userValues = []
      for (let i = 1; i <= 100; i++) {
        userValues.push(`('User ${i}', 'user${i}@example.com')`)
      }
      console.log('seedDatabase: Inserting users...')
      await db.query(`INSERT INTO users (name, email) VALUES ${userValues.join(',')}`)
      console.log('seedDatabase: Users inserted')

      // Generate 500 orders with random user associations
      console.log('seedDatabase: Generating orders...')
      const orderValues = []
      const statuses = ['completed', 'pending', 'cancelled']
      for (let i = 1; i <= 500; i++) {
        const userId = Math.floor(Math.random() * 100) + 1
        const amount = (Math.random() * 1000).toFixed(2)
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        orderValues.push(`(${userId}, ${amount}, '${status}')`)
      }
      await db.query(`INSERT INTO orders (user_id, amount, status) VALUES ${orderValues.join(',')}`)
      console.log('seedDatabase: Orders inserted')

      // Generate 20 products across different categories
      console.log('seedDatabase: Generating products...')
      const productValues = []
      const categories = ['Electronics', 'Furniture', 'Home', 'Office', 'Clothing', 'Books', 'Sports', 'Toys']
      for (let i = 1; i <= 20; i++) {
        const name = `Product ${i}`
        const price = (Math.random() * 500 + 10).toFixed(2)
        const category = categories[Math.floor(Math.random() * categories.length)]
        const inStock = Math.random() > 0.3
        productValues.push(`('${name}', ${price}, '${category}', ${inStock})`)
      }
      await db.query(`INSERT INTO products (name, price, category, in_stock) VALUES ${productValues.join(',')}`)
      console.log('seedDatabase: Products inserted')
    } catch (insertErr) {
      console.error('seedDatabase: Failed to insert sample data:', insertErr)
      throw insertErr // Re-throw to be caught by initDatabase
    }
  }

  // Create indexes for demonstration
  console.log('seedDatabase: Creating indexes...')
  await db.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
  await db.query('CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)')
  await db.query('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)')
  await db.query('CREATE INDEX IF NOT EXISTS idx_orders_amount ON orders(amount)')
  await db.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)')
  await db.query('CREATE INDEX IF NOT EXISTS idx_users_name_email ON users(name, email)')
  console.log('seedDatabase: Indexes created')
  console.log('seedDatabase: Database seeding complete')
}