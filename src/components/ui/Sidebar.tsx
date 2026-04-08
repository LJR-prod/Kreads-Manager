'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Calendar, Target, LayoutDashboard, Star, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types'
import { getInitials, cn } from '@/lib/utils'

interface SidebarProps {
  profile: Profile
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const isAdmin = profile?.role === 'admin'

  const navItems = [
    ...(isAdmin ? [
      {
        href: '/admin',
        label: 'Dashboard',
        icon: LayoutDashboard,
        match: (p: string) => p === '/admin',
      },
    ] : []),
    {
      href: '/calendar',
      label: 'Calendrier',
      icon: Calendar,
      match: (p: string) => p.startsWith('/calendar'),
    },
    {
      href: '/objectives',
      label: 'Objectifs',
      icon: Target,
      match: (p: string) => p.startsWith('/objectives'),
    },
    ...(isAdmin ? [
      {
        href: '/admin/evaluations',
        label: 'Évaluations CS',
        icon: Star,
        match: (p: string) => p.startsWith('/admin/evaluations'),
      },
    ] : []),
  ]

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col border-r h-full"
      style={{ background: '#0d0d0d', borderColor: '#1e1e1e' }}
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b" style={{ borderColor: '#1e1e1e' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#e63329' }}
          >
            <span className="text-white font-bold text-xs" style={{ fontFamily: 'Syne, sans-serif' }}>K</span>
          </div>
          <div>
            <p className="text-sm font-bold leading-none" style={{ fontFamily: 'Syne, sans-serif', color: '#f5f5f5' }}>
              Kreads
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#5a5a5a' }}>Manager</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {isAdmin && (
          <p className="text-xs uppercase tracking-wider px-3 mb-2 mt-1" style={{ color: '#3a3a3a', fontFamily: 'Syne, sans-serif' }}>
            Admin
          </p>
        )}
        {navItems.filter(i => i.href === '/admin' || i.href === '/admin/evaluations').map(item => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        {isAdmin && (
          <p className="text-xs uppercase tracking-wider px-3 mb-2 mt-4" style={{ color: '#3a3a3a', fontFamily: 'Syne, sans-serif' }}>
            Mon espace
          </p>
        )}
        {navItems.filter(i => i.href !== '/admin' && i.href !== '/admin/evaluations').map(item => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t" style={{ borderColor: '#1e1e1e' }}>
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg mb-2" style={{ background: '#161616' }}>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{ background: '#e63329', color: 'white', fontFamily: 'Syne, sans-serif' }}
          >
            {profile ? getInitials(profile.name) : '?'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: '#f5f5f5' }}>
              {profile?.name}
            </p>
            {isAdmin && (
              <span className="text-xs" style={{ color: '#e63329' }}>Admin</span>
            )}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200"
          style={{ color: '#5a5a5a' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#1c1c1c'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#f5f5f5'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#5a5a5a'
          }}
        >
          <LogOut size={13} />
          Se déconnecter
        </button>
      </div>
    </aside>
  )
}

function NavLink({ item, pathname }: { item: any; pathname: string }) {
  const isActive = item.match(pathname)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={cn(
        'nav-link',
        isActive && 'nav-link-active'
      )}
      style={isActive ? { color: '#f5f5f5' } : {}}
    >
      <Icon size={15} style={{ color: isActive ? '#e63329' : undefined }} />
      {item.label}
    </Link>
  )
}
