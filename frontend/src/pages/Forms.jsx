import { useState } from 'react'
import {
  FileText, Copy, ExternalLink, CheckCircle2,
  Plus, Trash2, ChevronUp, ChevronDown, GripVertical,
  Settings, Eye, Save
} from 'lucide-react'

const FIXED_FIELDS = [
  { id: 'name', label: 'Primeiro nome', type: 'text', required: true },
  { id: 'email', label: 'Email', type: 'email', required: true },
  { id: 'whatsapp', label: 'WhatsApp', type: 'tel', required: true },
  { id: 'instagram', label: 'Instagram', type: 'text', required: true },
]

const DEFAULT_QUESTIONS = [
  {
    id: 'revenue',
    label: 'Qual é o faturamento mensal do seu negócio?',
    options: [
      { label: 'Acima de R$ 30 mil', points: 50 },
      { label: 'Entre R$ 10k e R$ 30k', points: 25 },
      { label: 'Abaixo de R$ 10 mil', points: 0 },
    ],
  },
  {
    id: 'lead_pain',
    label: 'Você tem dificuldade em gerar ou qualificar leads?',
    options: [
      { label: 'Sim, é meu maior gargalo', points: 20 },
      { label: 'Um pouco', points: 10 },
      { label: 'Não, estou bem servido', points: 0 },
    ],
  },
]

function uid() {
  return Math.random().toString(36).slice(2, 8)
}

function FormBuilder({ fields, onFieldsChange, questions, onChange }) {
  function updateField(id, field, value) {
    onFieldsChange(fields.map(f => f.id === id ? { ...f, [field]: value } : f))
  }

  function updateQuestion(id, field, value) {
    onChange(questions.map(q => q.id === id ? { ...q, [field]: value } : q))
  }

  function updateOption(qId, idx, field, value) {
    onChange(questions.map(q => {
      if (q.id !== qId) return q
      const options = q.options.map((o, i) => i === idx ? { ...o, [field]: value } : o)
      return { ...q, options }
    }))
  }

  function addOption(qId) {
    onChange(questions.map(q => {
      if (q.id !== qId) return q
      return { ...q, options: [...q.options, { label: '', points: 0 }] }
    }))
  }

  function removeOption(qId, idx) {
    onChange(questions.map(q => {
      if (q.id !== qId) return q
      return { ...q, options: q.options.filter((_, i) => i !== idx) }
    }))
  }

  function addQuestion() {
    onChange([...questions, { id: uid(), label: '', options: [{ label: '', points: 0 }] }])
  }

  function removeQuestion(id) {
    onChange(questions.filter(q => q.id !== id))
  }

  function moveQuestion(id, dir) {
    const idx = questions.findIndex(q => q.id === id)
    const next = idx + dir
    if (next < 0 || next >= questions.length) return
    const arr = [...questions]
    ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
    onChange(arr)
  }

  return (
    <div className="space-y-4">
      {/* Campos obrigatórios editáveis */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Campos do formulário</p>
        <div className="space-y-2">
          {fields.map(f => (
            <div key={f.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
              <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
              <input
                type="text"
                value={f.label}
                onChange={e => updateField(f.id, 'label', e.target.value)}
                className="flex-1 text-sm text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-violet-400 transition"
              />
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded shrink-0">{f.type}</span>
              <label className="flex items-center gap-1.5 shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={e => updateField(f.id, 'required', e.target.checked)}
                  className="accent-violet-600 w-3.5 h-3.5"
                />
                <span className="text-xs text-slate-500">Obrigatório</span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Perguntas de scoring */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Perguntas de scoring</p>
          <button
            onClick={addQuestion}
            className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar pergunta
          </button>
        </div>

        {questions.length === 0 && (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
            Nenhuma pergunta ainda. Clique em "Adicionar pergunta".
          </div>
        )}

        <div className="space-y-3">
          {questions.map((q, qi) => (
            <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-4">
              {/* Header da pergunta */}
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {qi + 1}
                </span>
                <input
                  type="text"
                  value={q.label}
                  onChange={e => updateQuestion(q.id, 'label', e.target.value)}
                  placeholder="Digite a pergunta..."
                  className="flex-1 text-sm text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-violet-400 transition"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => moveQuestion(q.id, -1)}
                    disabled={qi === 0}
                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveQuestion(q.id, 1)}
                    disabled={qi === questions.length - 1}
                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeQuestion(q.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Opções */}
              <div className="space-y-2 pl-7">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt.label}
                      onChange={e => updateOption(q.id, oi, 'label', e.target.value)}
                      placeholder={`Opção ${oi + 1}`}
                      className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-violet-400 transition text-slate-700"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        value={opt.points}
                        onChange={e => updateOption(q.id, oi, 'points', Number(e.target.value))}
                        className="w-16 text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-400 text-center text-slate-700 transition"
                        min={0}
                      />
                      <span className="text-xs text-slate-400">pts</span>
                      <button
                        onClick={() => removeOption(q.id, oi)}
                        disabled={q.options.length <= 1}
                        className="p-1 text-slate-300 hover:text-red-400 disabled:opacity-30 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => addOption(q.id)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-600 transition mt-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar opção
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Regras de scoring */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-amber-700 mb-2">Classificação de leads</p>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-600">100+ pts → <strong>Ótimo</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-slate-600">60–99 pts → <strong>Bom</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span className="text-slate-600">{'<'} 60 pts → <strong>Frio</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Forms() {
  const [view, setView] = useState('list') // 'list' | 'builder'
  const [fields, setFields] = useState(FIXED_FIELDS)
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const publicUrl = `${window.location.origin}/f/default`

  function handleCopy() {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSave() {
    // TODO: POST /forms/default
    console.log('Saving:', questions)
    setSaved(true)
    setTimeout(() => { setSaved(false); setView('list') }, 1500)
  }

  if (view === 'builder') {
    return (
      <div className="p-6 max-w-2xl">
        {/* Topbar builder */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => setView('list')}
              className="text-xs text-slate-400 hover:text-slate-600 transition mb-1"
            >
              ← Voltar
            </button>
            <h2 className="text-lg font-semibold text-slate-800">Builder de Formulário</h2>
            <p className="text-sm text-slate-400 mt-0.5">Edite campos e perguntas de qualificação</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/f/default"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 px-3 py-2 rounded-lg transition"
            >
              <Eye className="w-4 h-4" /> Preview
            </a>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              {saved
                ? <><CheckCircle2 className="w-4 h-4" /> Salvo!</>
                : <><Save className="w-4 h-4" /> Salvar</>
              }
            </button>
          </div>
        </div>

        <FormBuilder fields={fields} onFieldsChange={setFields} questions={questions} onChange={setQuestions} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Formulários</h2>
          <p className="text-sm text-slate-400 mt-0.5">Formulários qualificadores das suas campanhas</p>
        </div>
      </div>

      {/* Card do formulário padrão */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-slate-800 text-sm">Formulário de Qualificação</p>
              <span className="text-xs bg-emerald-50 text-emerald-600 font-medium px-2 py-0.5 rounded-full">ativo</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {fields.map(f => (
                <span key={f.id} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{f.label}</span>
              ))}
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                {questions.length} pergunta{questions.length !== 1 ? 's' : ''} de scoring
              </span>
            </div>

            {/* Link público */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <p className="text-xs text-slate-400 flex-1 truncate">{publicUrl}</p>
              <button
                onClick={handleCopy}
                className="shrink-0 flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 transition"
              >
                {copied
                  ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Copiado</>
                  : <><Copy className="w-3.5 h-3.5" /> Copiar</>
                }
              </button>
              <a
                href="/f/default"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-slate-400 hover:text-slate-600 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <button
            onClick={() => setView('builder')}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-violet-600 border border-slate-200 hover:border-violet-300 px-3 py-2 rounded-lg transition shrink-0"
          >
            <Settings className="w-3.5 h-3.5" /> Editar
          </button>
        </div>
      </div>
    </div>
  )
}
