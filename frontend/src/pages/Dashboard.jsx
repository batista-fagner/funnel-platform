import { TrendingUp, Users, MousePointerClick, DollarSign, ArrowUpRight, Activity } from 'lucide-react'

const metrics = [
  { label: 'Leads Totais', value: '1.248', change: '+12%', up: true, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
  { label: 'Taxa de Conversão', value: '4.8%', change: '+0.6%', up: true, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Cliques nos Anúncios', value: '8.340', change: '+23%', up: true, icon: MousePointerClick, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Custo por Lead', value: 'R$ 18,40', change: '-8%', up: false, icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-50' },
]

const funnelSteps = [
  { label: 'Impressões', value: 10000, pct: 100, color: 'bg-violet-500' },
  { label: 'Cliques', value: 500, pct: 5, color: 'bg-violet-400' },
  { label: 'VSL (75%+)', value: 250, pct: 2.5, color: 'bg-blue-500' },
  { label: 'Form Aberto', value: 150, pct: 1.5, color: 'bg-blue-400' },
  { label: 'Form Enviado', value: 80, pct: 0.8, color: 'bg-emerald-500' },
  { label: 'Convertido', value: 12, pct: 0.12, color: 'bg-emerald-400' },
]

const recentLeads = [
  { name: 'Ana Souza', campaign: 'Fisio RS', score: 110, classification: 'otimo', time: '2 min' },
  { name: 'Carlos Melo', campaign: 'Ortopedia SP', score: 75, classification: 'bom', time: '14 min' },
  { name: 'Maria Lima', campaign: 'Fisio RS', score: 40, classification: 'frio', time: '32 min' },
  { name: 'João Ferreira', campaign: 'Fisio RS', score: 95, classification: 'bom', time: '1h' },
]

const classConfig = {
  otimo: 'bg-emerald-100 text-emerald-700',
  bom: 'bg-blue-100 text-blue-700',
  frio: 'bg-slate-100 text-slate-500',
}

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">

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
              <p className={`text-xs mt-1 font-medium ${m.up ? 'text-emerald-600' : 'text-red-500'}`}>
                {m.change} vs. último mês
              </p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Funil Visual */}
        <div className="xl:col-span-3 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-800">Funil de Conversão</h2>
              <p className="text-xs text-slate-400 mt-0.5">Últimos 30 dias — todas as campanhas</p>
            </div>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-3">
            {funnelSteps.map((step, i) => (
              <div key={step.label} className="flex items-center gap-3">
                <p className="text-xs text-slate-500 w-28 shrink-0">{step.label}</p>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div
                    className={`${step.color} h-2 rounded-full transition-all`}
                    style={{ width: `${Math.max(step.pct, 1)}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 w-24 justify-end">
                  <span className="text-sm font-semibold text-slate-700">
                    {step.value.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] text-slate-400">{step.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leads Recentes */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-800">Leads Recentes</h2>
              <p className="text-xs text-slate-400 mt-0.5">Últimos leads capturados</p>
            </div>
            <a href="/leads" className="text-xs text-violet-600 hover:underline flex items-center gap-0.5">
              Ver todos <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="space-y-3">
            {recentLeads.map((lead) => (
              <div key={lead.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-xs font-bold shrink-0">
                    {lead.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{lead.name}</p>
                    <p className="text-[11px] text-slate-400">{lead.campaign}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${classConfig[lead.classification]}`}>
                    {lead.classification === 'otimo' ? 'Ótimo' : lead.classification === 'bom' ? 'Bom' : 'Frio'}
                  </span>
                  <span className="text-[10px] text-slate-400">{lead.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
