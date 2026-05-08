import { Megaphone, Plus } from 'lucide-react'

export default function Campaigns() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Campanhas</h2>
          <p className="text-sm text-slate-400 mt-0.5">Gerencie suas campanhas de anúncios</p>
        </div>
        <button className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          <Plus className="w-4 h-4" /> Nova Campanha
        </button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Nenhuma campanha ainda</p>
        <p className="text-slate-400 text-sm mt-1">Crie sua primeira campanha para começar</p>
      </div>
    </div>
  )
}
