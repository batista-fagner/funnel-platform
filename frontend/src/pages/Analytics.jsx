import { BarChart3 } from 'lucide-react'

export default function Analytics() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-800">Analytics</h2>
        <p className="text-sm text-slate-400 mt-0.5">Relatórios detalhados de performance do funil</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Relatórios em breve</p>
        <p className="text-slate-400 text-sm mt-1">Conecte campanhas e comece a capturar dados para ver relatórios</p>
      </div>
    </div>
  )
}
