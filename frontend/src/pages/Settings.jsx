import { Settings as SettingsIcon, Key, Webhook, MessageCircle, Share2 } from 'lucide-react'

const integrations = [
  { icon: Key, label: 'Meta Ads API', description: 'Conecte sua conta do Meta para puxar métricas de campanhas', color: 'bg-blue-50 text-blue-600', status: 'Não conectado' },
  { icon: MessageCircle, label: 'uazapi (WhatsApp)', description: 'Envio automático de WhatsApp para follow-up de leads', color: 'bg-emerald-50 text-emerald-600', status: 'Não conectado' },
  { icon: Webhook, label: 'Resend (Email)', description: 'API de email para disparo de sequências automáticas', color: 'bg-violet-50 text-violet-600', status: 'Não conectado' },
  { icon: Share2, label: 'RapidAPI (Instagram)', description: 'Enriquecimento de leads via análise de perfil Instagram', color: 'bg-orange-50 text-orange-600', status: 'Não conectado' },
]

export default function Settings() {
  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-800">Configurações</h2>
        <p className="text-sm text-slate-400 mt-0.5">Integrações e configurações da plataforma</p>
      </div>

      <div className="space-y-3">
        {integrations.map(({ icon: Icon, label, description, color, status }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 text-sm">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{description}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-slate-400">{status}</span>
              <button className="text-xs font-medium text-violet-600 hover:text-violet-700 border border-violet-200 hover:border-violet-400 px-3 py-1.5 rounded-lg transition">
                Conectar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
