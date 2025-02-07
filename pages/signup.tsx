import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'
import styles from '../styles/Auth.module.css'
import { AuthError } from '@supabase/supabase-js'

export default function Signup() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://booru-six.vercel.app/login'
        }
      })
      
      if (error) throw error

      // Show success message and redirect
      setError('Check your email for the confirmation link!')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      const error = err as AuthError
      setError(error.message)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h1>Sign Up</h1>
        <form onSubmit={handleSignup}>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className={error ? styles.error : styles.success}>
            {error}
          </div>
          <button type="submit" className={styles.button}>
            Sign Up
          </button>
        </form>
        <p>
          Already have an account?{' '}
          <a onClick={() => router.push('/login')} style={{ cursor: 'pointer', color: '#0070f3' }}>
            Login
          </a>
        </p>
      </div>
    </div>
  )
}