import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Megaphone,
  Users,
  FileText,
  BarChart3,
  Mail,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  TrendingUp,
  Zap,
  MessageCircle,
  Sparkles,
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Visão Geral',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    ],
  },
  {
    label: 'Funil',
    items: [
      { icon: Megaphone, label: 'Campanhas', path: '/campaigns' },
      { icon: FileText, label: 'Formulários', path: '/forms' },
      { icon: Users, label: 'Leads', path: '/leads' },
    ],
  },
  {
    label: 'Automação',
    items: [
      { icon: Mail, label: 'Email Sequences', path: '/email-sequences' },
      { icon: MessageCircle, label: 'WhatsApp', path: '/whatsapp' },
    ],
  },
  {
    label: 'Integrações',
    items: [
      { icon: MessageCircle, label: 'Instagram Leads', path: '/instagram' },
      { icon: Zap, label: 'IG Automação', path: '/instagram-auto' },
    ],
  },
  {
    label: 'Conteúdo',
    items: [
      { icon: Sparkles, label: 'Carrossel IG', path: '/content' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { icon: Settings, label: 'Configurações', path: '/settings' },
    ],
  },
]

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/campaigns': 'Campanhas',
  '/leads': 'Leads',
  '/forms': 'Formulários',
  '/analytics': 'Analytics',
  '/email-sequences': 'Email Sequences',
  '/whatsapp': 'WhatsApp & Leads',
  '/instagram': 'Instagram Leads',
  '/instagram-auto': 'IG Automação',
  '/content': 'Carrossel IG',
  '/settings': 'Configurações',
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  const pageTitle = PAGE_TITLES[location.pathname] || 'Funnel Platform'
  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname === path

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-60'} bg-slate-900 flex flex-col transition-all duration-200 shrink-0`}>

        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700/50">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-violet-500 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-sm tracking-wide">FunnelCRM</span>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 bg-violet-500 rounded-lg flex items-center justify-center mx-auto">
              <Zap className="w-4 h-4 text-white" />
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-2 mb-1.5">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ icon: Icon, label, path }) => (
                  <Link
                    key={path}
                    to={path}
                    title={collapsed ? label : ''}
                    className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-all text-sm ${
                      isActive(path)
                        ? 'bg-violet-600 text-white font-medium'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapsed toggle */}
        {collapsed && (
          <div className="p-2 border-t border-slate-700/50">
            <button
              onClick={() => setCollapsed(false)}
              className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* User info */}
        {!collapsed && (
          <div className="p-3 border-t border-slate-700/50">
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                F
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">Fagner Batista</p>
                <p className="text-[10px] text-slate-400 truncate">Admin</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">

          {/* Esquerda: título da página */}
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-slate-800">{pageTitle}</h1>
          </div>

          {/* Centro: busca */}
          <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 w-64">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar leads, campanhas..."
              className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none w-full"
            />
          </div>

          {/* Direita: stats rápidas + notificações */}
          <div className="flex items-center gap-4">

            {/* Stats rápidas */}
            <div className="hidden lg:flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>3 campanhas ativas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-violet-500" />
                <span>24 leads hoje</span>
              </div>
            </div>

            {/* Notificações */}
            <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full" />
            </button>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-bold cursor-pointer">
              F
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
