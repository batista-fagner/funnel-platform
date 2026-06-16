import { useState, useEffect } from 'react'
import {
  Users, MessageCircle, Copy, CheckCircle2, Megaphone, X, Loader2,
  ExternalLink, Clock, MoreVertical, Send, Pencil, ChevronDown,
  FileText, TrendingUp, User, ArrowDown, Trash2, MessageSquare, RefreshCw,
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const STATUS_CONFIG = {
  novo:       { label: 'Novo',       className: 'bg-slate-100 text-slate-600',   header: 'bg-slate-400/20 text-slate-200' },
  contatado:  { label: 'Contatado',  className: 'bg-blue-100 text-blue-700',     header: 'bg-emerald-500 text-white' },
  convertido: { label: 'Convertido', className: 'bg-green-100 text-green-700',   header: 'bg-green-500 text-white' },
  perdido:    { label: 'Perdido',    className: 'bg-red-100 text-red-600',       header: 'bg-red-500/80 text-white' },
}

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
  if (hours < 24) return `há ${hours} hora${hours > 1 ? 's' : ''}`
  const days = Math.floor(hours / 24)
  return `há ${days} dia${days > 1 ? 's' : ''}`
}

function formatPhone(phone) {
  if (!phone || phone.startsWith('ig_')) return null
  const d = phone.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return phone
}

function getLeadOrigin(lead) {
  if (lead.utmSource === 'instagram' && lead.utmMedium === 'dm-automation') return 'Instagram DM'
  if (lead.fbclid || ['facebook', 'meta', 'facebookads', 'leadscomia'].includes(lead.utmSource)) return 'Tráfego Pago'
  return 'Direto'
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [copiedMessage, setCopiedMessage] = useState(false)
  const [converting, setConverting] = useState(false)
  const [convertValue, setConvertValue] = useState(3000)
  const [creativeModal, setCreativeModal] = useState(null)
  const [followupLoading, setFollowupLoading] = useState(false)
  const [followupData, setFollowupData] = useState(null)
  const [followupEdited, setFollowupEdited] = useState('')
  const [followupSending, setFollowupSending] = useState(false)
  const [followupSent, setFollowupSent] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [source, setSource] = useState('all')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const DEMO_LEAD = {
    id: 'demo-lead-1',
    name: 'João Silva',
    phone: '11999998888',
    instagram: 'joaosilva.marketing',
    email: 'joao@empresa.com',
    status: 'contatado',
    score: 125,
    createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
    utmCampaign: 'janeiro-2025',
    utmSource: 'facebook',
    utmMedium: 'publico-frio',
    utmContent: '120243183052410667',
    fbclid: 'IwAR2xK9abc123',
    aiInsight: {
      outreach_message: 'Oi João! Vi que você trabalha com marketing digital e percebi que seu engajamento caiu nos últimos posts. Tenho uma solução de IA que pode triplicar seus resultados. Posso te mostrar em 15 minutos?',
      niche: 'Marketing Digital',
      engagement_level: 'alto',
      audience_profile: 'Empreendedores e profissionais de marketing',
      selling_angle: 'Queda de engajamento orgânico e dependência de tráfego pago',
    },
  }

  const fetchLeads = async (pageNum, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const res = await fetch(`${API}/leads?page=${pageNum}&limit=6&source=${source}`)
      const data = await res.json()
      const newLeads = Array.isArray(data.data) ? data.data : []
      if (append) {
        setLeads(prev => [...prev, ...newLeads])
      } else {
        setLeads([DEMO_LEAD, ...newLeads])
      }
      setTotalPages(data.totalPages || 1)
      setTotal((data.total || 0) + 1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    setPage(1)
    setSelectedLead(null)
    fetchLeads(1)
  }, [source])

  // Enquanto o drawer de conversa está aberto, atualiza as mensagens do lead a cada 4s
  useEffect(() => {
    if (!chatOpen || !selectedLead || selectedLead.id === 'demo-lead-1') return
    const id = selectedLead.id
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/leads/${id}`)
        if (!res.ok) return
        const fresh = await res.json()
        setSelectedLead(prev => (prev && prev.id === fresh.id ? fresh : prev))
        setLeads(prev => prev.map(l => (l.id === fresh.id ? fresh : l)))
      } catch {
        // silencioso — tenta de novo no próximo ciclo
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [chatOpen, selectedLead?.id])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    fetchLeads(next, true)
  }

  const hasMore = page < totalPages

  const copyMessage = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedMessage(true)
    setTimeout(() => setCopiedMessage(false), 2000)
  }

  const openWhatsApp = (phone) => {
    const digits = phone?.replace(/\D/g, '')
    if (digits) window.open(`https://wa.me/55${digits}`, '_blank')
  }

  const markAsConverted = async () => {
    if (!selectedLead) return
    setConverting(true)
    try {
      const res = await fetch(`${API}/leads/${selectedLead.id}/convert`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: convertValue }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
      setSelectedLead(updated)
    } catch {
      alert('Erro ao marcar como convertido')
    } finally {
      setConverting(false)
    }
  }

  const generateFollowup = async () => {
    if (!selectedLead) return
    setFollowupLoading(true)
    setFollowupData(null)
    setFollowupSent(false)
    try {
      const res = await fetch(`${API}/leads/${selectedLead.id}/followup`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setFollowupData(data)
      setFollowupEdited(data.message)
    } catch {
      alert('Erro ao gerar follow-up')
    } finally {
      setFollowupLoading(false)
    }
  }

  const sendFollowup = async () => {
    if (!selectedLead || !followupEdited) return
    setFollowupSending(true)
    try {
      const res = await fetch(`${API}/leads/${selectedLead.id}/send-followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: followupEdited }),
      })
      if (!res.ok) throw new Error()
      setFollowupSent(true)
    } catch {
      alert('Erro ao enviar follow-up')
    } finally {
      setFollowupSending(false)
    }
  }

  const deleteLead = async () => {
    if (!selectedLead || selectedLead.id === 'demo-lead-1') return
    setDeleting(true)
    try {
      const res = await fetch(`${API}/leads/${selectedLead.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setLeads(prev => prev.filter(l => l.id !== selectedLead.id))
      setSelectedLead(null)
      setDeleteConfirm(false)
    } catch {
      alert('Erro ao remover lead')
    } finally {
      setDeleting(false)
    }
  }

  const openCreativeModal = async (adId) => {
    setCreativeModal({ adId, data: null, loading: true, error: null })
    try {
      const res = await fetch(`${API}/facebook/creative/${adId}`)
      if (!res.ok) throw new Error('Erro ao buscar criativo')
      const data = await res.json()
      setCreativeModal({ adId, data, loading: false, error: null })
    } catch {
      setCreativeModal({ adId, data: null, loading: false, error: 'Não foi possível carregar o criativo.' })
    }
  }

  const sel = selectedLead
  const statusCfg = sel ? (STATUS_CONFIG[sel.status] || STATUS_CONFIG.novo) : null

  return (
    <div className="h-full flex flex-col p-6 bg-slate-50">

      {/* Modal de confirmação de remoção */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center">Remover lead?</h3>
            <p className="text-sm text-slate-500 text-center mt-1">
              <span className="font-semibold text-slate-700">{selectedLead?.name}</span> será removido permanentemente.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={deleteLead}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-sm font-bold text-white transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Criativo */}
      {creativeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setCreativeModal(null)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-500 to-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                <p className="font-bold">Criativo do Anúncio</p>
              </div>
              <button onClick={() => setCreativeModal(null)} className="hover:opacity-70 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {creativeModal.loading && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                  <p className="text-slate-500 text-sm">Buscando criativo no Facebook...</p>
                </div>
              )}
              {creativeModal.error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="text-red-600 text-sm font-medium">{creativeModal.error}</p>
                  <p className="text-xs text-slate-400 mt-2">Ad ID: {creativeModal.adId}</p>
                </div>
              )}
              {creativeModal.data && (
                <div className="space-y-4">
                  {(creativeModal.data.creative?.image_url || creativeModal.data.creative?.thumbnail_url) && (
                    <img src={creativeModal.data.creative.image_url || creativeModal.data.creative.thumbnail_url} alt="Criativo" className="w-full rounded-xl border border-slate-200 object-contain max-h-80" />
                  )}
                  {creativeModal.data.name && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-0.5">Nome do anúncio</p>
                      <p className="text-sm font-bold text-slate-800">{creativeModal.data.name}</p>
                    </div>
                  )}
                  {creativeModal.data.creative?.title && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-0.5">Título</p>
                      <p className="text-sm font-bold text-slate-800">{creativeModal.data.creative.title}</p>
                    </div>
                  )}
                  {creativeModal.data.creative?.body && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-0.5">Texto do anúncio</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{creativeModal.data.creative.body}</p>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 text-center">Ad ID: {creativeModal.adId}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grid principal */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 overflow-hidden min-h-0">

        {/* Lista de Leads */}
        <div className="flex flex-col gap-4 min-h-0">

          {/* Título + Filtros */}
          <div className="shrink-0">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                Todos os Leads <span className="text-base font-normal text-slate-400 ml-2">{total}</span>
              </h1>
              <button
                onClick={() => { setPage(1); fetchLeads(1) }}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'ig_dm', label: 'Instagram DM' },
                { id: 'paid', label: 'Tráfego Pago' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => { setSource(f.id); setPage(1) }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    source === f.id
                      ? 'bg-violet-600 text-white shadow'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {/* Container único com divisores */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
                </div>
              ) : leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Users className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">Nenhum lead ainda</p>
                </div>
              ) : (
                leads.map(lead => {
                  const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.novo
                  const phone = formatPhone(lead.phone)
                  const selected = sel?.id === lead.id
                  return (
                    <div
                      key={lead.id}
                      onClick={() => { setSelectedLead(lead); setFollowupData(null); setFollowupSent(false); }}
                      className={`flex items-start gap-3 px-4 py-4 cursor-pointer transition-all border-l-4 ${
                        selected
                          ? 'bg-violet-50 border-l-violet-500'
                          : 'border-l-transparent hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full ${getAvatarColor(lead.name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {getInitials(lead.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-800 text-sm truncate">{lead.name}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            {lead.isMql && (
                              <span className="text-[11px] px-2 py-0.5 rounded whitespace-nowrap font-bold bg-emerald-100 text-emerald-700">
                                🎯 MQL
                              </span>
                            )}
                            <span className={`text-[11px] px-2 py-0.5 rounded whitespace-nowrap font-medium ${sc.className}`}>
                              {sc.label}
                            </span>
                          </div>
                        </div>
                        {lead.email && <p className="text-xs text-slate-500 mt-0.5 truncate">{lead.email}</p>}
                        {phone && <p className="text-xs text-slate-400 mt-0.5">{phone}</p>}
                        <div className="flex items-center justify-between mt-1.5">
                          <div>
                            {lead.aiInsight?.outreach_message ? (
                              <p className="text-xs text-violet-600 font-medium flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" /> Mensagem enviada
                              </p>
                            ) : !lead.utmSource && !lead.fbclid ? (
                              <p className="text-xs text-slate-400">Origem desconhecida</p>
                            ) : null}
                          </div>
                          {lead.createdAt && (
                            <p className="text-[11px] text-slate-400">{timeAgo(lead.createdAt)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Carregar mais */}
            {hasMore && !loading && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="shrink-0 w-full flex items-center justify-center gap-2 py-3 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-t border-slate-200 transition"
              >
                {loadingMore ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</>
                ) : (
                  <><ArrowDown className="w-4 h-4" /> Carregar mais leads</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Painel de Detalhes */}
        <div className="min-h-0 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {sel ? (
            <>
              {/* Header do Lead */}
              <div className="px-6 py-5 bg-gradient-to-r from-slate-800 via-indigo-900 to-violet-900 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-full ${getAvatarColor(sel.name)} flex items-center justify-center text-white text-xl font-bold shrink-0 ring-2 ring-white/20`}>
                      {getInitials(sel.name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold">{sel.name}</h2>
                        {sel.isMql && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-400 text-emerald-950">
                            🎯 MQL
                          </span>
                        )}
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${statusCfg.header}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-300 flex-wrap">
                        {sel.email && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            {sel.email}
                          </span>
                        )}
                        {formatPhone(sel.phone) && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            {formatPhone(sel.phone)}
                          </span>
                        )}
                        {sel.instagram && (
                          <span className="flex items-center gap-1">@{sel.instagram}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-4">
                        {formatPhone(sel.phone) && (
                          <button
                            onClick={() => openWhatsApp(sel.phone)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-medium transition"
                          >
                            <MessageCircle className="w-4 h-4" /> Abrir conversa
                          </button>
                        )}
                        <button
                          onClick={() => setChatOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-medium transition"
                        >
                          <MessageSquare className="w-4 h-4" /> Ver conversa
                        </button>
                        {sel.status !== 'convertido' && (
                          <button
                            onClick={() => document.getElementById('convert-section')?.scrollIntoView({ behavior: 'smooth' })}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-bold transition"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Converter Lead
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {sel.createdAt && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span>Lead recebido há</span>
                      </div>
                    )}
                    {sel.createdAt && (
                      <p className="text-sm font-bold text-white mt-0.5 flex items-center gap-1 justify-end">
                        <Clock className="w-3.5 h-3.5" />
                        {timeAgo(sel.createdAt).replace('há ', '')}
                      </p>
                    )}
                    {sel.id !== 'demo-lead-1' && (
                      <button
                        onClick={() => setDeleteConfirm(true)}
                        className="mt-3 p-1.5 hover:bg-red-500/20 rounded-lg transition group"
                        title="Remover lead"
                      >
                        <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Corpo do detalhe — 2 colunas */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

                  {/* Coluna principal */}
                  <div className="xl:col-span-3 space-y-5">

                    {/* Mensagem Enviada */}
                    {sel.aiInsight?.outreach_message && (
                      <div className="bg-white rounded-lg border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4 text-slate-500" />
                            <h3 className="text-sm font-bold text-slate-700">Mensagem Enviada</h3>
                          </div>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                            Enviada
                          </span>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4 border-l-4 border-emerald-400">
                          <p className="text-sm text-slate-700 leading-relaxed italic">
                            "{sel.aiInsight.outreach_message}"
                          </p>
                        </div>
                        <div className="flex items-center gap-5 mt-4 text-xs">
                          <button
                            onClick={() => copyMessage(sel.aiInsight.outreach_message)}
                            className="flex items-center gap-1.5 text-slate-500 hover:text-violet-600 transition font-medium"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {copiedMessage ? 'Copiado!' : 'Copiar mensagem'}
                          </button>
                          <button className="flex items-center gap-1.5 text-slate-500 hover:text-violet-600 transition font-medium">
                            <Pencil className="w-3.5 h-3.5" /> Editar mensagem
                          </button>
                          {formatPhone(sel.phone) && (
                            <button
                              onClick={() => openWhatsApp(sel.phone)}
                              className="flex items-center gap-1.5 text-slate-500 hover:text-violet-600 transition font-medium"
                            >
                              <Send className="w-3.5 h-3.5" /> Reenviar no WhatsApp
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Follow-up com Stories */}
                    {sel.instagram && (
                      <div className="bg-white rounded-lg border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Send className="w-4 h-4 text-violet-500" />
                            <h3 className="text-sm font-bold text-slate-700">Follow-up com Stories</h3>
                          </div>
                          {followupData && (
                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${followupData.hasStories ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
                              {followupData.hasStories ? `${followupData.storiesCount} stories encontrados` : 'Conta privada'}
                            </span>
                          )}
                        </div>

                        {!followupData && (
                          <p className="text-xs text-slate-500 mb-4">
                            Busca os stories recentes de <span className="font-medium">@{sel.instagram}</span> e gera uma mensagem personalizada. Se o perfil for privado, usa os dados já analisados do lead.
                          </p>
                        )}

                        {followupData && (
                          <div className="mb-4">
                            <textarea
                              value={followupEdited}
                              onChange={e => setFollowupEdited(e.target.value)}
                              rows={4}
                              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                            />
                            <div className="flex items-center gap-4 mt-2 text-xs">
                              <button
                                onClick={() => copyMessage(followupEdited)}
                                className="flex items-center gap-1.5 text-slate-500 hover:text-violet-600 transition font-medium"
                              >
                                <Copy className="w-3.5 h-3.5" /> Copiar
                              </button>
                              <button
                                onClick={generateFollowup}
                                className="flex items-center gap-1.5 text-slate-500 hover:text-violet-600 transition font-medium"
                              >
                                <Loader2 className={`w-3.5 h-3.5 ${followupLoading ? 'animate-spin' : ''}`} /> Regerar
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-3">
                          {!followupData && (
                            <button
                              onClick={generateFollowup}
                              disabled={followupLoading}
                              className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-lg transition"
                            >
                              {followupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              {followupLoading ? 'Buscando stories...' : 'Gerar Follow-up'}
                            </button>
                          )}
                          {followupData && formatPhone(sel.phone) && (
                            <button
                              onClick={sendFollowup}
                              disabled={followupSending || followupSent}
                              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-lg transition"
                            >
                              {followupSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              {followupSent ? 'Enviado!' : followupSending ? 'Enviando...' : 'Enviar via WhatsApp'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Converter Lead */}
                    {sel.status !== 'convertido' && (
                      <div id="convert-section" className="bg-white rounded-lg border border-slate-200 p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                          <h3 className="text-sm font-bold text-slate-700">Converter Lead</h3>
                        </div>
                        <label className="text-xs text-slate-500 mb-1.5 block">Valor da venda (R$)</label>
                        <input
                          type="number"
                          value={convertValue}
                          onChange={e => setConvertValue(Number(e.target.value))}
                          className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300 mb-3"
                        />
                        {sel.fbclid && (
                          <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                            <span>🎯</span> Lead rastreado via anúncio — evento Purchase será enviado ao Facebook
                          </p>
                        )}
                        <button
                          onClick={markAsConverted}
                          disabled={converting}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {converting ? 'Salvando...' : 'Converter Agora'}
                        </button>
                      </div>
                    )}

                    {/* Anotações */}
                    <div className="bg-white rounded-lg border border-slate-200 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <h3 className="text-sm font-bold text-slate-700">Anotações</h3>
                      </div>
                      <textarea
                        placeholder="Adicione observações sobre este lead..."
                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300 resize-none h-20"
                      />
                      <div className="flex justify-end mt-2">
                        <button className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition">
                          Salvar anotação
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar direita */}
                  <div className="xl:col-span-2 space-y-5">

                    {/* Origem do Anúncio */}
                    {(sel.utmCampaign || sel.utmSource || sel.fbclid) && (
                      <div className="bg-white rounded-lg border border-slate-200 p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <Megaphone className="w-4 h-4 text-slate-500" />
                          <h3 className="text-sm font-bold text-slate-700">Origem do Anúncio</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {sel.utmCampaign && (
                            <div>
                              <p className="text-[11px] text-slate-400 mb-0.5">Campanha</p>
                              <p className="text-sm font-semibold text-slate-800">{sel.utmCampaign}</p>
                            </div>
                          )}
                          {sel.utmMedium && (
                            <div>
                              <p className="text-[11px] text-slate-400 mb-0.5">Conjunto</p>
                              <p className="text-sm font-semibold text-slate-800">{sel.utmMedium}</p>
                            </div>
                          )}
                          {sel.utmTerm && (
                            <div>
                              <p className="text-[11px] text-slate-400 mb-0.5">ID do Conjunto</p>
                              <p className="text-sm font-semibold text-slate-800">{sel.utmTerm}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-[11px] text-slate-400 mb-0.5">Canal</p>
                            <p className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                              Meta Ads
                            </p>
                          </div>
                          {sel.utmContent && (
                            <div
                              className="cursor-pointer hover:bg-slate-50 rounded-lg p-1 -m-1 transition"
                              onClick={() => openCreativeModal(sel.utmContent)}
                            >
                              <p className="text-[11px] text-slate-400 mb-0.5">Criativo</p>
                              <p className="text-sm font-semibold text-violet-600 flex items-center gap-1">
                                Ver criativo <ExternalLink className="w-3 h-3" />
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Engajamento */}
                    {sel.aiInsight && (
                      <div className="bg-white rounded-lg border border-slate-200 p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingUp className="w-4 h-4 text-slate-500" />
                          <h3 className="text-sm font-bold text-slate-700">Engajamento</h3>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-600">Nível de engajamento</p>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                              sel.aiInsight.engagement_level === 'alto' ? 'bg-emerald-100 text-emerald-700'
                                : sel.aiInsight.engagement_level === 'medio' ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {sel.aiInsight.engagement_level ? sel.aiInsight.engagement_level.charAt(0).toUpperCase() + sel.aiInsight.engagement_level.slice(1) : '—'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-600">Score</p>
                            <p className="text-sm font-bold text-slate-800">{sel.score || 0} pts</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-600">Nicho</p>
                            <p className="text-sm font-semibold text-slate-700">{sel.aiInsight.niche || '—'}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sobre o Lead */}
                    <div className="bg-white rounded-lg border border-slate-200 p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <User className="w-4 h-4 text-slate-500" />
                        <h3 className="text-sm font-bold text-slate-700">Sobre o Lead</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-600">Primeiro contato</p>
                          <p className="text-sm text-slate-800">{formatDate(sel.createdAt)}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-600">Origem</p>
                          <p className="text-sm font-semibold text-slate-800">{getLeadOrigin(sel)}</p>
                        </div>
                        {sel.revenueRange && (
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-600">Faturamento</p>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                              sel.revenueRange.includes('30 mil') || sel.revenueRange.includes('100k') ? 'bg-emerald-100 text-emerald-700'
                              : sel.revenueRange.includes('10k') || sel.revenueRange.includes('10 mil') ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                            }`}>
                              {sel.revenueRange}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-600">Status atual</p>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusCfg.className}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-600">Responsável</p>
                          <p className="text-sm text-slate-800">Fagner Batista</p>
                        </div>
                        {sel.clickId && (
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-600">Click ID</p>
                            <p className="text-xs font-mono text-slate-500 truncate max-w-[140px]">{sel.clickId}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-slate-600 font-semibold">Selecione um lead</p>
                <p className="text-sm text-slate-400 mt-1">Escolha na lista para ver os detalhes</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop do drawer de conversa */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${chatOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setChatOpen(false)}
      />

      {/* Drawer de conversa (somente leitura) */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-[#efeae2] z-50 shadow-2xl flex flex-col transition-transform duration-300 ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-full ${getAvatarColor(sel?.name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
              {getInitials(sel?.name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">Conversa WhatsApp</p>
              <p className="text-xs text-slate-400 truncate">{sel ? (formatPhone(sel.phone) || sel.name) : ''}</p>
            </div>
          </div>
          <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-slate-700 transition shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo: bolhas */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-2">
          {(() => {
            const messages = (Array.isArray(sel?.aiContext) ? sel.aiContext : [])
              .filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content)
            if (messages.length === 0) {
              return (
                <div className="h-full flex items-center justify-center text-center px-6">
                  <div>
                    <div className="w-14 h-14 bg-slate-200/60 rounded-full flex items-center justify-center mx-auto mb-3">
                      <MessageSquare className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600">Nenhuma conversa ainda</p>
                    <p className="text-xs text-slate-400 mt-1">As mensagens trocadas com o Efraim aparecerão aqui.</p>
                  </div>
                </div>
              )
            }
            return messages.map((m, i) => {
              const isEfraim = m.role === 'assistant'
              return (
                <div key={i} className={`flex ${isEfraim ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] rounded-lg px-3 py-2 shadow-sm text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    isEfraim ? 'bg-[#d9fdd3] text-slate-800' : 'bg-white text-slate-800'
                  }`}>
                    <p className={`text-[10px] font-bold mb-0.5 ${isEfraim ? 'text-emerald-700' : 'text-violet-600'}`}>
                      {isEfraim ? 'Efraim' : (sel?.name || 'Lead')}
                    </p>
                    {String(m.content)}
                  </div>
                </div>
              )
            })
          })()}
        </div>

        {/* Footer: input desabilitado (somente leitura) */}
        <div className="px-4 py-3 bg-white border-t border-slate-200 shrink-0">
          <div className="flex items-center gap-2 opacity-60">
            <input
              type="text"
              disabled
              placeholder="Visualização somente leitura"
              className="flex-1 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-500 cursor-not-allowed"
            />
            <button disabled className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white cursor-not-allowed shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
