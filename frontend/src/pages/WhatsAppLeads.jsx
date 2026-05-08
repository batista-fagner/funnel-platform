import { useState, useEffect } from 'react'
import { Send } from 'lucide-react'

export default function WhatsAppLeads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('http://localhost:3001/api/leads?limit=100')
      .then(r => r.json())
      .then(data => {
        setLeads(Array.isArray(data.data) ? data.data : [])
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const handleSend = async () => {
    if (!selectedLead) return alert('Selecione um lead')
    if (!message.trim()) return alert('Digite uma mensagem')

    try {
      const res = await fetch(`http://localhost:3001/api/leads/${selectedLead.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      })
      if (res.ok) {
        alert('Enviado!')
        setMessage('')
      } else {
        alert('Erro ao enviar')
      }
    } catch (err) {
      alert('Erro: ' + err.message)
    }
  }

  if (loading) {
    return <div className="p-6"><p>Carregando...</p></div>
  }

  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center">
          <Send className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-900">WhatsApp & Leads</h1>
          <p className="text-slate-600 text-sm mt-0.5">Gerencie seus leads e envie mensagens diretas</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Lista */}
        <div className="w-3/5 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
            <p className="text-sm font-bold text-slate-800 uppercase tracking-wide">📱 Leads ({leads.length})</p>
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto">
            {leads.length === 0 && (
              <div className="p-8 text-center text-slate-400 flex items-center justify-center h-full">
                <p className="text-sm">Sem leads encontrados</p>
              </div>
            )}
            {leads.length > 0 && leads.map(lead => (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`px-5 py-4 cursor-pointer transition-all border-l-4 duration-200 ${
                  selectedLead?.id === lead.id
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-500 shadow-md'
                    : 'hover:bg-slate-50 border-transparent hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 text-sm">{lead.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{lead.phone}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap ${
                    (lead.score || 0) >= 100 ? 'bg-emerald-100 text-emerald-700' :
                    (lead.score || 0) >= 60 ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {lead.score || 0}pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel */}
        <div className="w-2/5 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
          {selectedLead ? (
            <>
              <div className="px-6 py-5 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 border-b border-green-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-white text-lg">{selectedLead.name}</p>
                    <p className="text-green-100 text-xs mt-0.5">🟢 Ativo agora</p>
                  </div>
                  <div className="bg-white bg-opacity-20 backdrop-blur-sm px-3 py-1 rounded-lg">
                    <p className="text-white font-bold text-lg">{selectedLead.score || 0}</p>
                    <p className="text-green-100 text-xs">pontos</p>
                  </div>
                </div>
                <p className="text-green-50 text-sm mt-2">{selectedLead.phone}</p>
              </div>

              <div className="flex-1 p-6 bg-gradient-to-b from-white to-slate-50 flex flex-col">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-3">Mensagem</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 p-4 border-2 border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-200 transition bg-white"
                />
              </div>

              <div className="px-6 py-4 bg-white border-t-2 border-slate-100">
                <button
                  onClick={handleSend}
                  disabled={!message.trim()}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-slate-300 disabled:to-slate-400 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all transform hover:scale-105 disabled:hover:scale-100 shadow-lg disabled:shadow-none"
                >
                  <Send className="w-5 h-5" />
                  Enviar Mensagem
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <div className="text-5xl mb-4">💬</div>
                <p className="text-slate-700 font-bold text-lg">Selecione um lead</p>
                <p className="text-slate-500 text-sm mt-2">Escolha um lead da lista para começar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
