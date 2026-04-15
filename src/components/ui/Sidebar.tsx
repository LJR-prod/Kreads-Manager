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

  const adminNav = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, match: (p: string) => p === '/admin' },
    { href: '/admin/evaluations', label: 'Évaluations CS', icon: Star, match: (p: string) => p.startsWith('/admin/evaluations') },
  ]
  const editorNav = [
    { href: '/calendar', label: 'Calendrier', icon: Calendar, match: (p: string) => p.startsWith('/calendar') },
    { href: '/objectives', label: 'Objectifs', icon: Target, match: (p: string) => p.startsWith('/objectives') },
  ]

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col border-r h-full" style={{ background: '#ffffff', borderColor: '#e0ddd6' }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: '#e0ddd6' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#e63329' }}>
            <span className="text-white font-bold text-xs" style={{ fontFamily: 'Syne, sans-serif' }}>K</span>
          </div>
          <div>
            <p className="text-sm font-bold leading-none" style={{ fontFamily: 'Syne, sans-serif', color: '#1a1a1a' }}>Kreads</p>
            <p className="text-xs mt-0.5" style={{ color: '#a09d96' }}>Manager</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {isAdmin && (
          <>
            <p className="text-xs uppercase tracking-wider px-3 mb-2" style={{ color: '#ccc9c0', fontFamily: 'Syne, sans-serif', fontWeight: 600 }}>Admin</p>
            {adminNav.map(item => <NavLink key={item.href} item={item} pathname={pathname} />)}
            <div className="my-3" style={{ borderTop: '1px solid #e0ddd6' }} />
            <p className="text-xs uppercase tracking-wider px-3 mb-2" style={{ color: '#ccc9c0', fontFamily: 'Syne, sans-serif', fontWeight: 600 }}>Mon espace</p>
          </>
        )}
        {editorNav.map(item => <NavLink key={item.href} item={item} pathname={pathname} />)}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t" style={{ borderColor: '#e0ddd6' }}>
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg mb-1" style={{ background: '#f5f3ee' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: '#e63329', color: 'white', fontFamily: 'Syne, sans-serif' }}>
            {profile ? getInitials(profile.name) : '?'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: '#1a1a1a' }}>{profile?.name}</p>
            {isAdmin && <span className="text-xs font-medium" style={{ color: '#e63329' }}>Admin</span>}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-150"
          style={{ color: '#a09d96' }}
          onMouseEnter={e => { (e.currentTarget).style.background = '#f5f3ee'; (e.currentTarget).style.color = '#1a1a1a' }}
          onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; (e.currentTarget).style.color = '#a09d96' }}
        >
          <LogOut size={12} />
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
    <Link href={item.href} className={cn('nav-link', isActive && 'nav-link-active')}>
      <Icon size={15} />
      {item.label}
    </Link>
  )
}
