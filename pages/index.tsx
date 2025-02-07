import { useEffect, useState } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'
import styles from '../styles/Home.module.css'
import { User } from '@supabase/supabase-js'

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
    } else {
      setUser(session.user)
    }
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Booru Project</title>
        <meta name="description" content="Booru Project Gallery" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Booru Project</h1>
        <p className={styles.description}>Welcome to the gallery</p>
        
        {user && (
          <button 
            className={styles.button}
            onClick={() => {
              supabase.auth.signOut()
              router.push('/login')
            }}
          >
            Sign Out
          </button>
        )}
      </main>
    </div>
  )
} 