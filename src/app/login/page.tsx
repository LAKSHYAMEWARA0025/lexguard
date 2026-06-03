"use client"

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Loader2, Lock, Mail, ShieldAlert, AlertCircle } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const isRedirect = searchParams.get('redirect') === 'true'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        router.push('/')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#111] border border-[#e8530e]/30 shadow-[0_0_30px_rgba(232,83,14,0.15)] mb-6">
          <span className="text-[#e8530e] font-black text-2xl tracking-tighter">V</span>
        </div>
        <h1 className="text-3xl font-light tracking-tight text-white mb-2">LexGuard</h1>
        <p className="text-neutral-500 text-sm">
          {isSignUp ? 'Create your new account' : 'Secure access to your workspace'}
        </p>
      </div>

      {isRedirect && (
        <div className="mb-6 flex items-start space-x-3 text-[#e8530e] bg-[#e8530e]/10 p-4 rounded-xl border border-[#e8530e]/20 text-sm shadow-[0_0_15px_rgba(232,83,14,0.1)]">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>Please log in or sign up to analyze your contract.</p>
        </div>
      )}

      <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 p-8 rounded-3xl shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-2" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-neutral-500" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-neutral-950/50 border border-neutral-800 rounded-xl text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#e8530e]/50 focus:border-transparent transition-all"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-2" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-neutral-500" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-neutral-950/50 border border-neutral-800 rounded-xl text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#e8530e]/50 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start space-x-3 text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-400/20 text-sm">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex flex-col space-y-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#e8530e] hover:bg-[#ff6a20] text-black text-sm font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#e8530e] focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-[0_0_15px_rgba(232,83,14,0.3)] hover:shadow-[0_0_20px_rgba(232,83,14,0.5)] border border-transparent cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
              }}
              className="w-full text-center text-xs text-neutral-400 hover:text-[#e8530e] transition-colors mt-4 cursor-pointer"
            >
              {isSignUp ? (
                <span>Already have an account? <strong>Sign In</strong></span>
              ) : (
                <span>Don't have an account? <strong>Create one</strong></span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-neutral-200 flex items-center justify-center p-4">
      <Suspense fallback={<div className="flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#e8530e] animate-spin" /></div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
