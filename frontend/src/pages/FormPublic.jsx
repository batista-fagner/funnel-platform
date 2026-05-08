import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const QUESTIONS = [
  {
    id: 'revenue',
    label: 'Qual é o faturamento mensal do seu negócio?',
    options: [
      { label: 'Acima de R$ 30 mil', value: 'above_30k', points: 50 },
      { label: 'Entre R$ 10k e R$ 30k', value: '10k_30k', points: 25 },
      { label: 'Abaixo de R$ 10 mil', value: 'below_10k', points: 0 },
    ],
  },
  {
    id: 'lead_pain',
    label: 'Você tem dificuldade em gerar ou qualificar leads?',
    options: [
      { label: 'Sim, é meu maior gargalo', value: 'yes_big', points: 20 },
      { label: 'Um pouco', value: 'a_bit', points: 10 },
      { label: 'Não, estou bem servido', value: 'no', points: 0 },
    ],
  },
]

const TOTAL_STEPS = 2 // step 0 = dados pessoais, step 1 = perguntas

function classifyLead(score) {
  if (score >= 100) return 'otimo'
  if (score >= 60) return 'bom'
  return 'frio'
}

export default function FormPublic() {
  let { id } = useParams()
  // Map 'default' slug to actual UUID
  if (id === 'default') {
    id = '00000000-0000-0000-0000-000000000001'
  }

  useEffect(() => {
    // Inicializa Meta Pixel apenas no form público
    const script = document.createElement('script')
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '964343959626807');
      fbq('track', 'PageView');
    `
    document.head.appendChild(script)

    const params = new URLSearchParams(window.location.search)
    const fbclid = params.get('fbclid')
    if (fbclid) localStorage.setItem('fbclid', fbclid)
    const utmSource = params.get('utm_source')
    const utmMedium = params.get('utm_medium')
    const utmCampaign = params.get('utm_campaign')
    const utmContent = params.get('utm_content')
    if (utmSource) localStorage.setItem('utm_source', utmSource)
    if (utmMedium) localStorage.setItem('utm_medium', utmMedium)
    if (utmCampaign) localStorage.setItem('utm_campaign', utmCampaign)
    if (utmContent) localStorage.setItem('utm_content', utmContent)
    if (!localStorage.getItem('click_id')) {
      localStorage.setItem('click_id', crypto.randomUUID())
    }
  }, [])

  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [personal, setPersonal] = useState({
    name: '',
    email: '',
    whatsapp: '',
    instagram: '',
  })

  const [answers, setAnswers] = useState({})
  const [errors, setErrors] = useState({})

  function handlePersonalChange(field, value) {
    setPersonal(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  function formatWhatsapp(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  function validatePersonal() {
    const e = {}
    if (!personal.name.trim()) e.name = 'Informe seu nome'
    if (!personal.email.trim() || !/\S+@\S+\.\S+/.test(personal.email)) e.email = 'Email inválido'
    const digits = personal.whatsapp.replace(/\D/g, '')
    if (digits.length < 10) e.whatsapp = 'WhatsApp inválido'
    if (!personal.instagram.trim()) e.instagram = 'Informe seu Instagram'
    return e
  }

  function handleNextStep() {
    if (step === 0) {
      const e = validatePersonal()
      if (Object.keys(e).length > 0) { setErrors(e); return }
    }
    setStep(s => s + 1)
  }

  function handleSelectOption(questionId, value) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  async function handleSubmit() {
    const unanswered = QUESTIONS.find(q => !answers[q.id])
    if (unanswered) return

    setLoading(true)
    setError('')

    const responses = {}
    QUESTIONS.forEach(q => {
      responses[q.id] = answers[q.id]
    })

    const fbclid = localStorage.getItem('fbclid')
    const utmSource = localStorage.getItem('utm_source')
    const utmMedium = localStorage.getItem('utm_medium')
    const utmCampaign = localStorage.getItem('utm_campaign')
    const utmContent = localStorage.getItem('utm_content')
    const clickId = localStorage.getItem('click_id')
    const payload = {
      name: personal.name.trim(),
      email: personal.email.trim(),
      phone: personal.whatsapp.replace(/\D/g, ''),
      instagram: personal.instagram.replace('@', '').trim(),
      responses,
      ...(fbclid ? { fbclid } : {}),
      ...(utmSource ? { utmSource } : {}),
      ...(utmMedium ? { utmMedium } : {}),
      ...(utmCampaign ? { utmCampaign } : {}),
      ...(utmContent ? { utmContent } : {}),
      ...(clickId ? { clickId } : {}),
    }

    try {
      const res = await fetch(`${API}/forms/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error('Erro ao enviar formulário')
      }

      if (window.fbq) window.fbq('track', 'Lead')
      setLoading(false)
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Tudo certo!</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Recebemos suas informações. Em breve entraremos em contato pelo seu WhatsApp.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-violet-500' : 'bg-slate-200'}`}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Etapa {step + 1} de {TOTAL_STEPS}
          </p>
        </div>

        <div className="px-8 py-6">

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Step 0 — Dados Pessoais */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800 mb-0.5">Suas informações</h3>
                <p className="text-sm text-slate-400">Preencha os dados abaixo para continuar</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Primeiro nome</label>
                <input
                  type="text"
                  placeholder="Ex: João"
                  value={personal.name}
                  onChange={e => handlePersonalChange('name', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-400 transition ${errors.name ? 'border-red-400' : 'border-slate-200'}`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="joao@email.com"
                  value={personal.email}
                  onChange={e => handlePersonalChange('email', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-400 transition ${errors.email ? 'border-red-400' : 'border-slate-200'}`}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">WhatsApp</label>
                <input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={personal.whatsapp}
                  onChange={e => handlePersonalChange('whatsapp', formatWhatsapp(e.target.value))}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-400 transition ${errors.whatsapp ? 'border-red-400' : 'border-slate-200'}`}
                />
                {errors.whatsapp && <p className="text-xs text-red-500 mt-1">{errors.whatsapp}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Instagram <span className="text-slate-400">(sem @)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
                  <input
                    type="text"
                    placeholder="seuusuario"
                    value={personal.instagram}
                    onChange={e => handlePersonalChange('instagram', e.target.value.replace('@', ''))}
                    className={`w-full border rounded-lg pl-7 pr-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-400 transition ${errors.instagram ? 'border-red-400' : 'border-slate-200'}`}
                  />
                </div>
                {errors.instagram && <p className="text-xs text-red-500 mt-1">{errors.instagram}</p>}
              </div>
            </div>
          )}

          {/* Step 1 — Perguntas de Scoring */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-slate-800 mb-0.5">Conte um pouco sobre seu negócio</h3>
                <p className="text-sm text-slate-400">Leva menos de 1 minuto</p>
              </div>

              {QUESTIONS.map((q, qi) => (
                <div key={q.id}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {qi + 1}. {q.label}
                  </label>
                  <select
                    value={answers[q.id] ?? ''}
                    onChange={e => handleSelectOption(q.id, e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 bg-white outline-none focus:ring-2 focus:ring-violet-400 transition appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Selecione uma opção...</option>
                    {q.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition"
            >
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
          ) : <div />}

          {step < TOTAL_STEPS - 1 ? (
            <button
              onClick={handleNextStep}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition ml-auto"
            >
              Continuar <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || QUESTIONS.some(q => !answers[q.id])}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition ml-auto"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Enviando...' : 'Enviar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
