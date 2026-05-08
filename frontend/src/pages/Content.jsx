import { useState } from 'react'
import { Sparkles, Image, Loader2, CheckCircle2, RefreshCw, Share2, ChevronLeft, ChevronRight, X, Eye } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const TONES = [
  { value: 'educativo', label: 'Educativo' },
  { value: 'provocativo', label: 'Provocativo' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'case', label: 'Case / Prova Social' },
]

const SLIDE_COUNTS = [5, 7, 10]

const PROFILE = {
  name: 'Fagner Batista',
  handle: 'fagnerbatista',
  avatar: 'https://instagram.fvix22-1.fna.fbcdn.net/v/t51.82787-19/658981566_17859014457622286_2898541504340235122_n.jpg?efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDI0LmMyIn0&_nc_ht=instagram.fvix22-1.fna.fbcdn.net&_nc_cat=102&_nc_oc=Q6cZ2gFNAwrkHc23tmLByN1jsn7HihtdYLwx57hx3QWeR8-U92mBEbZQDfwMS5zpLQjDfivRa6MTP9fmG6g-Ui29lyVi&_nc_ohc=CaV74OF5_04Q7kNvwHAa3MY&_nc_gid=HbwA9euscWkaax-A0fdr-Q&edm=AP4sbd4BAAAA&ccb=7-5&oh=00_Af2dI4b75E5fD18HL9es-jS9oJKUo6fajbM5cKwVCP9F8A&oe=69F61EA5&_nc_sid=7a9f4b',
}

function SlidePreview({ slide, name = PROFILE.name, handle = PROFILE.handle, avatar = PROFILE.avatar }) {
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-lg flex flex-col"
      style={{ width: 340, height: 425 }}
    >
      <div className="flex items-center gap-3 px-5 pt-4 pb-2 shrink-0">
        <img src={avatar} alt={name} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
        <div>
          <p className="text-sm font-bold text-slate-900 leading-tight">{name}</p>
          <p className="text-xs text-slate-400">@{handle}</p>
        </div>
      </div>
      <div className="px-5 py-2 flex-1 min-h-0">
        <p className="text-base text-slate-800 leading-loose whitespace-pre-line">{slide.text}</p>
      </div>
      <div className="px-5 pb-5 shrink-0" style={{ height: 107 }}>
        {slide.imageUrl ? (
          <img src={slide.imageUrl} alt="slide" className="w-full h-full object-cover rounded-xl" />
        ) : (
          <div className="w-full h-full rounded-xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center">
            <p className="text-xs text-slate-400">Imagem não gerada</p>
          </div>
        )}
      </div>
    </div>
  )
}

function PreviewModal({ slides, initialIndex, onClose }) {
  const [current, setCurrent] = useState(initialIndex)
  const slide = slides[current]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex items-center gap-6">
        <button
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
          className="z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="relative z-10">
          <SlidePreview slide={slide} />
          <p className="mt-3 text-center text-xs text-white/60">{current + 1} / {slides.length}</p>
          <div className="mt-2 flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${i === current ? 'w-5 bg-white' : 'w-1.5 bg-white/30'}`}
              />
            ))}
          </div>
        </div>
        <button
          onClick={() => setCurrent(c => Math.min(slides.length - 1, c + 1))}
          disabled={current === slides.length - 1}
          className="z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function Content() {
  const [step, setStep] = useState('form')
  const [form, setForm] = useState({ topic: '', slideCount: 7, tone: 'educativo' })
  const [generating, setGenerating] = useState(false)
  const [carouselId, setCarouselId] = useState(null)
  const [slides, setSlides] = useState([])
  const [publishing, setPublishing] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')

  async function handleGenerateText() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch(`${API}/carousel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: form.topic,
          tone: form.tone,
          slideCount: form.slideCount,
          instagramHandle: PROFILE.handle,
        }),
      })
      if (!res.ok) throw new Error('Erro ao gerar textos')
      const data = await res.json()
      setCarouselId(data.id)
      setSlides(data.slides)
      setStep('slides')
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleTextBlur() {
    if (!carouselId) return
    await fetch(`${API}/carousel/${carouselId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides }),
    })
  }

  async function handleGenerateImage(index) {
    setSlides(prev => prev.map(s => s.index === index ? { ...s, imageStatus: 'generating' } : s))
    try {
      const res = await fetch(`${API}/carousel/${carouselId}/generate-image/${index}`, { method: 'POST' })
      if (!res.ok) throw new Error('Erro ao gerar imagem')
      const data = await res.json()
      setSlides(data.slides)
    } catch (err) {
      setSlides(prev => prev.map(s => s.index === index ? { ...s, imageStatus: 'error' } : s))
      setError(err.message)
    }
  }

  async function handleGenerateAllImages() {
    setError('')
    for (const slide of slides) {
      if (slide.imageStatus !== 'done') {
        await handleGenerateImage(slide.index)
      }
    }
  }

  async function handlePublish() {
    setPublishing(true)
    setError('')
    try {
      const res = await fetch(`${API}/carousel/${carouselId}/publish`, { method: 'POST' })
      if (!res.ok) throw new Error('Erro ao publicar')
      setStep('done')
    } catch (err) {
      setError(err.message)
    } finally {
      setPublishing(false)
    }
  }

  function handleReset() {
    setStep('form')
    setForm({ topic: '', slideCount: 7, tone: 'educativo' })
    setSlides([])
    setCarouselId(null)
    setError('')
  }

  const allImagesReady = slides.length > 0 && slides.every(s => s.imageStatus === 'done')
  const anyGenerating = slides.some(s => s.imageStatus === 'generating')
  const doneCount = slides.filter(s => s.imageStatus === 'done').length
  const canPublish = doneCount >= 2

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {preview !== null && (
        <PreviewModal slides={slides} initialIndex={preview} onClose={() => setPreview(null)} />
      )}

      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800">Criação de Conteúdo</h2>
        <p className="text-sm text-slate-500 mt-1">Gere carrosséis para o Instagram com IA</p>
      </div>

      {/* ESTADO 1 — Formulário */}
      {step === 'form' && (
        <div className="max-w-xl">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tema do carrossel</label>
              <textarea
                rows={3}
                placeholder="Ex: Por que transparência radical vende mais do que perfeição..."
                value={form.topic}
                onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nº de slides</label>
                <select
                  value={form.slideCount}
                  onChange={e => setForm(f => ({ ...f, slideCount: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                >
                  {SLIDE_COUNTS.map(n => (
                    <option key={n} value={n}>{n} slides</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tom de voz</label>
                <select
                  value={form.tone}
                  onChange={e => setForm(f => ({ ...f, tone: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                >
                  {TONES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              onClick={handleGenerateText}
              disabled={!form.topic.trim() || generating}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Gerando textos...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Gerar textos</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ESTADO 2 — Revisão de slides */}
      {step === 'slides' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{slides.length} slides gerados · revise e gere as imagens</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPreview(0)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50 transition"
              >
                <Eye className="w-3.5 h-3.5" /> Ver prévia
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Recomeçar
              </button>
              <button
                onClick={handleGenerateAllImages}
                disabled={anyGenerating || allImagesReady}
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {anyGenerating ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</>
                ) : allImagesReady ? (
                  <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Todas geradas</>
                ) : (
                  <><Image className="w-3.5 h-3.5" /> Gerar todas as imagens</>
                )}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="space-y-4">
            {slides.map((slide) => (
              <div key={slide.index} className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-5">
                <div className="shrink-0 w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">
                  {slide.index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <textarea
                    rows={4}
                    value={slide.text}
                    onChange={e => {
                      const val = e.target.value
                      setSlides(prev => prev.map(s => s.index === slide.index ? { ...s, text: val } : s))
                    }}
                    onBlur={handleTextBlur}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 resize-none"
                  />
                </div>

                <div className="shrink-0 w-32 flex flex-col items-center gap-2">
                  {slide.imageStatus === 'done' && slide.imageUrl ? (
                    <div className="relative w-full">
                      <img
                        src={slide.imageUrl}
                        alt={`Slide ${slide.index + 1}`}
                        className="w-full h-24 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-90 transition"
                        onClick={() => setPreview(slide.index)}
                      />
                      <button
                        onClick={() => handleGenerateImage(slide.index)}
                        className="absolute top-1 right-1 p-1 bg-white/80 rounded-lg text-slate-500 hover:text-violet-600 transition"
                        title="Regerar imagem"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                      <CheckCircle2 className="absolute bottom-1 left-1 w-4 h-4 text-emerald-500" />
                      <button
                        onClick={() => setPreview(slide.index)}
                        className="absolute bottom-1 right-1 p-0.5 bg-white/80 rounded-md text-slate-500 hover:text-violet-600 transition"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    </div>
                  ) : slide.imageStatus === 'generating' ? (
                    <div className="w-full h-24 rounded-xl border border-slate-200 bg-slate-100 flex flex-col items-center justify-center gap-1">
                      <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
                      <span className="text-[10px] text-slate-400">Gerando...</span>
                    </div>
                  ) : slide.imageStatus === 'error' ? (
                    <button
                      onClick={() => handleGenerateImage(slide.index)}
                      className="w-full h-24 rounded-xl border-2 border-dashed border-red-200 bg-red-50 flex flex-col items-center justify-center gap-1.5 text-red-400 hover:bg-red-100 transition text-xs"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Tentar novamente
                    </button>
                  ) : (
                    <button
                      onClick={() => handleGenerateImage(slide.index)}
                      className="w-full h-24 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:border-violet-400 hover:text-violet-500 hover:bg-violet-50 transition text-xs"
                    >
                      <Image className="w-5 h-5" />
                      Gerar imagem
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {step === 'slides' && (
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPreview(0)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                <Eye className="w-4 h-4" /> Ver prévia completa
              </button>
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={handlePublish}
                  disabled={publishing || !canPublish}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publishing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Publicando...</>
                  ) : (
                    <><Share2 className="w-4 h-4" /> Publicar no Instagram</>
                  )}
                </button>
                {!canPublish && (
                  <p className="text-xs text-slate-400">Gere ao menos 2 imagens para publicar ({doneCount}/2)</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ESTADO 3 — Publicado */}
      {step === 'done' && (
        <div className="max-w-md mx-auto text-center py-16">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Carrossel publicado!</h3>
          <p className="text-sm text-slate-500 mb-8">Seu carrossel foi publicado no Instagram com sucesso.</p>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 mx-auto rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700 transition"
          >
            <Sparkles className="w-4 h-4" /> Criar novo carrossel
          </button>
        </div>
      )}
    </div>
  )
}
