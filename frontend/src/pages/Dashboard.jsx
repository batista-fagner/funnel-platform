import { useState, useEffect } from 'react'
import { TrendingUp, Users, Target, ArrowUpRight, Activity, Loader2, RefreshCw } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-cyan-500',
  'bg-blue-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500',
]

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0]
  let hash = 0
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function timeAgo(date) {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  return `há ${Math.floor(hours / 24)}d`
}

const WA_STAGE_LABELS = {
  abertura: 'Abertura',
  escuta: 'Escuta',
  rapport: 'Rapport',
  video: 'Vídeo',
  fechamento: 'Fechamento',
  confirmado: 'Confirmado',
  perdido: 'Perdido',
  encerrado: 'Encerrado',
}

const WA_STAGE_COLORS = {
  abertura: 'bg-slate-400',
  escuta: 'bg-blue-400',
  rapport: 'bg-indigo-400',
  video: 'bg-violet-500',
  fechamento: 'bg-amber-500',
  confirmado: 'bg-emerald-500',
  perdido: 'bg-red-400',
  encerrado: 'bg-slate-300',
}

const CLASS_CONFIG = {
  otimo: 'bg-emerald-100 text-emerald-700',
  bom: 'bg-blue-100 text-blue-700',
  frio: 'bg-slate-100 text-slate-500',
}

const CLASS_LABELS = { otimo: 'Ótimo', bom: 'Bom', frio: 'Frio' }

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/leads/stats`)
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  if (loading) return (
    <div className="h-full flex items-center justify-center text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando...
    </div>
  )

  if (!stats) return null

  const { total, totalMql, byStatus, byWaStage, conversionRate, recent } = stats
  const convertido = byStatus['convertido'] || 0
  const contatado = byStatus['contatado'] || 0
  const novo = byStatus['novo'] || 0

  // Funil baseado nos stages do Efraim
  const stageOrder = ['abertura', 'escuta', 'rapport', 'video', 'fechamento', 'confirmado']
  const funnelSteps = stageOrder
    .map(s => ({ stage: s, count: byWaStage[s] || 0 }))
    .filter(s => s.count > 0)
  const maxCount = Math.max(...funnelSteps.map(s => s.count), 1)

  const metrics = [
    {
      label: 'Leads Totais',
      value: total.toLocaleString('pt-BR'),
      sub: `${novo} novos`,
      icon: Users,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'MQLs',
      value: totalMql.toLocaleString('pt-BR'),
      sub: total > 0 ? `${Math.round((totalMql / total) * 100)}% do total` : '—',
      icon: Target,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Confirmados na Live',
      value: (byWaStage['confirmado'] || 0).toLocaleString('pt-BR'),
      sub: total > 0 ? `${Math.round(((byWaStage['confirmado'] || 0) / total) * 100)}% dos leads` : '—',
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Taxa de Conversão',
      value: `${conversionRate}%`,
      sub: `${convertido} convertidos`,
      icon: Activity,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ]

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Dados em tempo real</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon
          return (
            <div key={m.label} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-500">{m.label}</p>
                <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${m.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{m.value}</p>
              <p className="text-xs mt-1 text-slate-400">{m.sub}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Funil por stage do Efraim */}
        <div className="xl:col-span-3 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-800">Funil de Conversação</h2>
              <p className="text-xs text-slate-400 mt-0.5">Leads por stage do Efraim</p>
            </div>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>

          {funnelSteps.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
              Nenhum lead com stage registrado ainda
            </div>
          ) : (
            <div className="space-y-3">
              {funnelSteps.map((step) => (
                <div key={step.stage} className="flex items-center gap-3">
                  <p className="text-xs text-slate-500 w-24 shrink-0">{WA_STAGE_LABELS[step.stage]}</p>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div
                      className={`${WA_STAGE_COLORS[step.stage]} h-2 rounded-full transition-all`}
                      style={{ width: `${Math.max((step.count / maxCount) * 100, 2)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 w-8 text-right">{step.count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Status geral abaixo */}
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-4 gap-3">
            {[
              { label: 'Novos', value: novo, color: 'text-slate-600' },
              { label: 'Contatados', value: contatado, color: 'text-blue-600' },
              { label: 'Convertidos', value: convertido, color: 'text-emerald-600' },
              { label: 'Perdidos', value: byStatus['perdido'] || 0, color: 'text-red-500' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Leads Recentes */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-800">Leads Recentes</h2>
              <p className="text-xs text-slate-400 mt-0.5">Últimos 5 capturados</p>
            </div>
            <a href="/leads" className="text-xs text-violet-600 hover:underline flex items-center gap-0.5">
              Ver todos <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>

          {recent.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
              Nenhum lead ainda
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-full ${getAvatarColor(lead.name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                      {getInitials(lead.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{lead.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {lead.isMql ? '🎯 MQL · ' : ''}{lead.utmMedium || lead.utmSource || 'Direto'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lead.classification && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${CLASS_CONFIG[lead.classification] || CLASS_CONFIG.frio}`}>
                        {CLASS_LABELS[lead.classification] || lead.classification}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">{timeAgo(lead.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
