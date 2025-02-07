import Head from 'next/head'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  useEffect(() => {
    // Test Supabase connection
    const testConnection = async () => {
      const { data, error } = await supabase.from('your_table').select('*').limit(1)
      console.log('Supabase test:', { data, error })
    }
    testConnection()
  }, [])

  return (
    <>
      <Head>
        <title>Booru Project</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Booru Project Gallery" />
      </Head>
      <div className="container">
        <h1>Booru Project</h1>
        <p>Welcome to the gallery</p>
      </div>
    </>
  )
} 