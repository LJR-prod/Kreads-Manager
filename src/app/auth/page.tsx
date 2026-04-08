'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function AuthPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#080808' }}>
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 20% 50%, rgba(230,51,41,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(230,51,41,0.05) 0%, transparent 50%)',
        }}
      />
      {/* Grid lines */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.03,
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-6">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: '#e63329' }}
            >
              <span className="text-white font-bold text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>K</span>
            </div>
            <span className="text-xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#f5f5f5' }}>
              Kreads <span style={{ color: '#e63329' }}>Manager</span>
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Syne, sans-serif', color: '#f5f5f5' }}>
            Bienvenue
          </h1>
          <p className="text-sm" style={{ color: '#a0a0a0' }}>
            Espace de management de l&apos;équipe montage
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 border" style={{ background: '#161616', borderColor: '#2a2a2a' }}>
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border font-medium text-sm transition-all duration-200"
            style={{
              background: '#111111',
              borderColor: '#3a3a3a',
              color: '#f5f5f5',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <div
                className="w-4 h-4 rounded-full border-2 animate-spin"
                style={{ borderColor: '#e63329', borderTopColor: 'transparent' }}
              />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
              </svg>
            )}
            {loading ? 'Connexion...' : 'Continuer avec Google'}
          </button>

          <p className="text-center text-xs mt-6" style={{ color: '#5a5a5a' }}>
            Accès réservé à l&apos;équipe Kreads
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#3a3a3a' }}>
          © {new Date().getFullYear()} Kreads — Tous droits réservés
        </p>
      </div>
    </div>
  )
}
