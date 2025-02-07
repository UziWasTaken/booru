import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import styles from '../styles/Navbar.module.css'

export default function Navbar() {
  const router = useRouter()

  return (
    <div className={styles.navbar}>
      <div className={styles.logo}>
        <Link href="/">Booru Project</Link>
      </div>
      <nav className={styles.nav}>
        <Link href="/posts">Browse All Posts</Link>
        <Link href="/comments">Comments</Link>
        <Link href="/forum">Forum</Link>
        <Link href="/wiki">Wiki</Link>
        <Link href="/account">My Account</Link>
      </nav>
      <div className={styles.upload}>
        <Link href="/upload" className={styles.uploadButton}>Upload</Link>
      </div>
    </div>
  )
} 