import { useState, useEffect } from 'react'
import {
  ChevronRight, Copy, CheckCircle, ExternalLink, MessageCircle,
  FileText, Clock, Zap, Users,
} from 'lucide-react'

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

function formatFollowers(n) {
  if (!n) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function timeLabel(date) {
  if (!date) return ''
  const d = new Date(date)
  return `Hoje, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

function getActivityItems(lead) {
  const items = []
  const base = lead.createdAt ? new Date(lead.createdAt) : new Date()
  if (lead.aiInsight?.outreach_message) {
    const t = new Date(base.getTime() + 2 * 60000)
    items.push({ label: 'Mensagem enviada via Instagram', time: timeLabel(t) })
  }
  if (lead.status === 'contatado' || lead.status === 'convertido') {
    const t = new Date(base.getTime() + 1 * 60000)
    items.push({ label: 'Lead marcado como contatado', time: timeLabel(t) })
  }
  items.push({ label: 'Lead recebido do Instagram DM', time: timeLabel(base) })
  return items
}

const STATUS_CONFIG = {
  novo:       { label: 'Novo',       className: 'bg-slate-100 text-slate-600' },
  contatado:  { label: 'Contatado',  className: 'bg-amber-100 text-amber-700' },
  convertido: { label: 'Convertido', className: 'bg-green-100 text-green-700' },
  perdido:    { label: 'Perdido',    className: 'bg-red-100 text-red-600' },
}

export default function InstagramLeads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState(null)
  const [copiedMessage, setCopiedMessage] = useState(false)

  const copyMessage = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedMessage(true)
    setTimeout(() => setCopiedMessage(false), 2000)
  }

  useEffect(() => {
    fetch(`${API}/leads?limit=100`)
      .then(r => r.json())
      .then(data => {
        const all = Array.isArray(data.data) ? data.data : []
        setLeads(all.filter(l => l.enrichmentData?.followers))
        setLoading(false)
      })
      .catch(err => { console.error(err); setLoading(false) })
  }, [])

  const sel = selectedLead

  return (
    <div className="p-6 bg-slate-50 min-h-full">

      {/* Page header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-lg">IG</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Instagram Leads</h1>
          <p className="text-slate-500 text-sm">Leads com dados enriquecidos do Instagram</p>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex gap-6 items-start">

        {/* Left: lead list */}
        <div className="w-[340px] shrink-0 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Leads Enriquecidos ({leads.length})
            </p>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Carregando...</div>
          ) : leads.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <div className="text-3xl mb-2">📸</div>
              <p className="text-sm">Nenhum lead com Instagram ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {leads.map(lead => {
                const selected = sel?.id === lead.id
                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={`flex items-center gap-3 px-4 py-4 cursor-pointer transition-all border-l-4 ${
                      selected ? 'bg-rose-50 border-l-rose-500' : 'border-l-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full ${getAvatarColor(lead.name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                      {getInitials(lead.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{lead.name}</p>
                      <p className="text-xs text-slate-400 truncate">@{lead.instagram}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-rose-500">{formatFollowers(lead.enrichmentData?.followers)}</p>
                      <p className="text-[11px] text-slate-400">seguidores</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </div>
                )
              })}
            </div>
          )}

          <div className="border-t border-slate-100">
            <button className="w-full py-3 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-2">
              <span className="text-slate-400">+</span> Carregar mais leads
            </button>
          </div>
        </div>

        {/* Right: detail */}
        {sel ? (
          <div className="flex-1 flex flex-col gap-5 min-w-0">

            {/* Lead header card - pink gradient */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-lg p-6 flex items-center gap-5">
              <div className={`w-16 h-16 rounded-full ${getAvatarColor(sel.name)} flex items-center justify-center text-white text-xl font-bold shrink-0 ring-4 ring-white/20`}>
                {getInitials(sel.name)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white">{sel.name}</h2>
                <p className="text-pink-100 text-sm">@{sel.instagram}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span className="text-xs text-pink-100">Ativo agora</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-3xl font-bold text-white">{formatFollowers(sel.enrichmentData?.followers)}</p>
                <p className="text-pink-200 text-xs mt-0.5">seguidores</p>
              </div>
            </div>

            {/* Middle: AI Analysis + Resumo */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

              {/* AI Analysis */}
              <div className="xl:col-span-3 bg-white rounded-lg border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-violet-500" /> AI Analysis
                  </p>
                  {sel.aiInsight?.confidence_score && (
                    <span className="text-xs font-bold bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded">
                      {sel.aiInsight.confidence_score}% confiança
                    </span>
                  )}
                </div>

                {sel.aiInsight ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nicho</p>
                      <p className="text-sm font-semibold text-slate-800">{sel.aiInsight.niche}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Engajamento</p>
                        <p className="text-sm font-semibold text-slate-800 capitalize">{sel.aiInsight.engagement_level}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tipo</p>
                        <p className="text-sm text-slate-700">{sel.aiInsight.content_pattern}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Público-alvo</p>
                      <p className="text-sm text-slate-700">{sel.aiInsight.audience_profile}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ângulo de Venda</p>
                      <p className="text-sm font-semibold text-slate-800">{sel.aiInsight.selling_angle}</p>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Mensagem Pronta</p>
                      <p className="text-sm text-slate-600 italic leading-relaxed">
                        "{sel.aiInsight.outreach_message}"
                      </p>
                      <button
                        onClick={() => copyMessage(sel.aiInsight.outreach_message)}
                        className="mt-4 w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        {copiedMessage ? 'Copiado!' : 'Copiar mensagem'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6">Análise IA não disponível</p>
                )}
              </div>

              {/* Sidebar: Resumo + Bio + Contato */}
              <div className="xl:col-span-2 flex flex-col gap-5">

                {/* Resumo do Lead */}
                <div className="bg-white rounded-lg border border-slate-200 p-5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-violet-500" /> Resumo do Lead
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Score</span>
                      <span className="text-sm font-bold text-slate-800">{sel.score || 0} pts</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Status</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded font-semibold ${STATUS_CONFIG[sel.status]?.className || STATUS_CONFIG.novo.className}`}>
                        {STATUS_CONFIG[sel.status]?.label || 'Novo'}
                      </span>
                    </div>
                    {sel.enrichmentData?.engagement_rate > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Engajamento</span>
                        <span className="text-sm font-bold text-violet-600">
                          {(sel.enrichmentData.engagement_rate * 100).toFixed(2)}%
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Última interação</span>
                      <span className="text-sm text-violet-600">{timeLabel(sel.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {sel.enrichmentData?.content_type && (
                  <div className="bg-white rounded-lg border border-slate-200 p-5">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-violet-500" /> Bio
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">{sel.enrichmentData.content_type}</p>
                  </div>
                )}

                {/* Contato */}
                <div className="bg-white rounded-lg border border-slate-200 p-5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-violet-500" /> Contato
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm text-slate-500">Email</span>
                      <span className="text-sm font-semibold text-slate-800 text-right">{sel.email || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-500">Telefone</span>
                      <span className="text-sm font-semibold text-slate-800">{sel.phone || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-500">Origem</span>
                      <span className="text-sm font-semibold text-slate-800">Instagram DM</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-500">Primeiro contato</span>
                      <span className="text-sm font-semibold text-slate-800">{formatDate(sel.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: Atividade Recente + Ações Rápidas */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

              {/* Atividade Recente */}
              <div className="bg-white rounded-lg border border-slate-200 p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-violet-500" /> Atividade Recente
                </p>
                <div className="space-y-3">
                  {getActivityItems(sel).map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <Clock className="w-3 h-3 text-slate-400" />
                        </div>
                        <span className="text-sm text-slate-700">{item.label}</span>
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ações Rápidas */}
              <div className="bg-white rounded-lg border border-slate-200 p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-violet-500" /> Ações Rápidas
                </p>
                <div className="space-y-1">
                  <button
                    onClick={() => sel.instagram && window.open(`https://www.instagram.com/${sel.instagram}/`, '_blank')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Abrir perfil no Instagram</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition text-left">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Adicionar anotação</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-12 text-center">
            <div>
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📸</span>
              </div>
              <p className="text-slate-600 font-semibold">Selecione um lead</p>
              <p className="text-sm text-slate-400 mt-1">Escolha na lista para ver os detalhes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
