import { useState, useEffect } from 'react'
import { Plus, Trash2, ToggleLeft, ToggleRight, ExternalLink, Zap, Image, ChevronRight, X, Loader2, RefreshCw, Users, Pencil } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const EMPTY_FORM = {
  keyword: 'eu quero',
  acceptAny: false,
  replyMessage: '',
  dmButtonLabel: '',
  commentReply: 'Verifica lá na sua DM, já te mandei! 😉',
  captureConfirmation: false,
  confirmationQuestion: '',
  captureEmail: false,
  emailQuestion: '',
}

export default function InstagramAutomation() {
  const [automations, setAutomations] = useState([])
  const [media, setMedia] = useState([])
  const [mediaCursor, setMediaCursor] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [loadingAutos, setLoadingAutos] = useState(true)
  const [showPanel, setShowPanel] = useState(false)
  const [editingId, setEditingId] = useState(null) // null = criando, uuid = editando
  const [selectedPost, setSelectedPost] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Modal de perfis
  const [profilesAuto, setProfilesAuto] = useState(null) // automação selecionada
  const [profiles, setProfiles] = useState([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)

  useEffect(() => { fetchAutomations() }, [])

  async function fetchAutomations() {
    setLoadingAutos(true)
    try {
      const res = await fetch(`${API}/ig-auto`)
      const data = await res.json()
      setAutomations(Array.isArray(data) ? data : [])
    } catch {
      setAutomations([])
    } finally {
      setLoadingAutos(false)
    }
  }

  async function fetchMedia() {
    setLoadingMedia(true)
    setError('')
    try {
      const res = await fetch(`${API}/ig-auto/media`)
      const data = await res.json()
      setMedia(data.data || [])
      setMediaCursor(data.paging?.cursors?.after || null)
    } catch {
      setError('Erro ao carregar posts. Verifique o IG_TOKEN no servidor.')
    } finally {
      setLoadingMedia(false)
    }
  }

  async function fetchMoreMedia() {
    if (!mediaCursor) return
    setLoadingMore(true)
    try {
      const res = await fetch(`${API}/ig-auto/media?after=${mediaCursor}`)
      const data = await res.json()
      setMedia(prev => [...prev, ...(data.data || [])])
      setMediaCursor(data.paging?.cursors?.after || null)
    } catch {}
    finally { setLoadingMore(false) }
  }

  async function openProfiles(auto, e) {
    e.stopPropagation()
    setProfilesAuto(auto)
    setLoadingProfiles(true)
    setProfiles([])
    try {
      const res = await fetch(`${API}/ig-auto/${auto.id}/profiles`)
      const data = await res.json()
      setProfiles(Array.isArray(data) ? data : [])
    } catch {
      setProfiles([])
    } finally {
      setLoadingProfiles(false)
    }
  }

  function openCreate() {
    setEditingId(null)
    setSelectedPost(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowPanel(true)
    fetchMedia()
  }

  function openEdit(auto, e) {
    e.stopPropagation()
    setEditingId(auto.id)
    setSelectedPost({ id: auto.postId, caption: auto.postCaption, permalink: auto.postPermalink, _thumbnail: auto.postThumbnail })
    setForm({
      keyword: auto.keyword || 'eu quero',
      acceptAny: auto.acceptAny || false,
      replyMessage: auto.replyMessage || '',
      dmButtonLabel: auto.dmButtonLabel || '',
      commentReply: auto.commentReply || '',
      captureConfirmation: auto.captureConfirmation || false,
      confirmationQuestion: auto.confirmationQuestion || '',
      captureEmail: auto.captureEmail || false,
      emailQuestion: auto.emailQuestion || '',
    })
    setError('')
    setShowPanel(true)
    fetchMedia()
  }

  function closePanel() {
    setShowPanel(false)
    setSelectedPost(null)
    setEditingId(null)
  }

  async function handleSave() {
    if (!selectedPost) { setError('Selecione um post'); return }
    if (!form.replyMessage.trim()) { setError('Informe a mensagem de resposta'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        postId: selectedPost.id,
        postCaption: selectedPost.caption?.slice(0, 200),
        postThumbnail: selectedPost._thumbnail || thumbnail(selectedPost),
        postPermalink: selectedPost.permalink,
        keyword: form.keyword || 'eu quero',
        acceptAny: form.acceptAny,
        replyMessage: form.replyMessage.trim(),
        dmButtonLabel: form.dmButtonLabel.trim() || null,
        commentReply: form.commentReply.trim() || null,
        captureConfirmation: form.captureConfirmation,
        confirmationQuestion: form.confirmationQuestion.trim() || null,
        captureEmail: form.captureEmail,
        emailQuestion: form.emailQuestion.trim() || null,
      }

      const res = await fetch(`${API}/ig-auto${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      await fetchAutomations()
      closePanel()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(auto, e) {
    e.stopPropagation()
    try {
      await fetch(`${API}/ig-auto/${auto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !auto.isActive }),
      })
      setAutomations(prev => prev.map(a => a.id === auto.id ? { ...a, isActive: !a.isActive } : a))
    } catch {}
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Remover esta automação?')) return
    await fetch(`${API}/ig-auto/${id}`, { method: 'DELETE' })
    setAutomations(prev => prev.filter(a => a.id !== id))
  }

  const thumbnail = (post) => {
    if (!post) return null
    if (post._thumbnail) return post._thumbnail
    if (post.media_type === 'VIDEO') return post.thumbnail_url || null
    if (post.media_type === 'CAROUSEL_ALBUM') return post.children?.data?.[0]?.media_url || null
    return post.media_url || null
  }

  const stepLabel = (step) => {
    if (step === 'completed') return { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700' }
    if (step === 'waiting_email') return { label: 'Aguardando email', color: 'bg-amber-100 text-amber-700' }
    if (step === 'waiting_confirmation') return { label: 'Aguardando confirmação', color: 'bg-blue-100 text-blue-700' }
    return { label: step, color: 'bg-slate-100 text-slate-600' }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Automação de Comentários</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Alguém comenta a palavra-chave → recebe DM automático com seu link
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Nova Automação
          </button>
        </div>
      </div>

      {/* Como funciona */}
      <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Zap className="w-5 h-5 text-violet-500 mt-0.5 shrink-0" />
        <div className="text-sm text-violet-700">
          <p className="font-medium mb-1">Como funciona</p>
          <p className="text-violet-600">
            1. Escolha um post/reel &nbsp;→&nbsp; 2. Defina a palavra-chave (ex: <em>"eu quero"</em>) &nbsp;→&nbsp;
            3. Escreva a mensagem com o link &nbsp;→&nbsp; 4. Qualquer pessoa que comentar recebe o DM automaticamente.
            <br />
            <strong>Opcional:</strong> ative "Pedir confirmação" para o lead clicar Sim antes, e "Capturar email" para salvar como Lead.
          </p>
        </div>
      </div>

      {/* Lista de automações */}
      {loadingAutos ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : automations.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">Nenhuma automação ainda</p>
          <p className="text-slate-400 text-sm mt-1">Crie sua primeira para começar a receber leads pelo Instagram</p>
          <button
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Criar automação
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map(auto => (
            <div
              key={auto.id}
              className={`bg-white rounded-xl border ${auto.isActive ? 'border-slate-200' : 'border-slate-100 opacity-60'} p-4 flex items-center gap-4`}
            >
              {/* Thumbnail */}
              <div className="w-14 h-14 bg-slate-100 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                {auto.postThumbnail ? (
                  <img src={auto.postThumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Image className="w-5 h-5 text-slate-400" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                    "{auto.keyword}"
                  </span>
                  {auto.captureConfirmation && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Confirmação</span>
                  )}
                  {auto.captureEmail && (
                    <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">Captura email</span>
                  )}
                  {auto.postPermalink && (
                    <a href={auto.postPermalink} target="_blank" rel="noopener noreferrer"
                      className="text-slate-400 hover:text-violet-500 transition">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-sm text-slate-700 truncate">{auto.replyMessage}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <button
                    onClick={(e) => openProfiles(auto, e)}
                    className="flex items-center gap-1 text-xs text-emerald-600 font-medium hover:text-emerald-700 transition"
                  >
                    <Users className="w-3.5 h-3.5" />
                    {auto.triggeredCount} disparos
                  </button>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => openEdit(auto, e)}
                  className="text-slate-300 hover:text-violet-500 transition"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => toggleActive(auto, e)}
                  className={`transition ${auto.isActive ? 'text-violet-500' : 'text-slate-300'}`}
                  title={auto.isActive ? 'Desativar' : 'Ativar'}
                >
                  {auto.isActive ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                </button>
                <button
                  onClick={(e) => handleDelete(auto.id, e)}
                  className="text-slate-300 hover:text-red-400 transition"
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de perfis */}
      {profilesAuto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setProfilesAuto(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-800">Perfis que dispararam</h3>
                <p className="text-xs text-slate-400 mt-0.5">"{profilesAuto.keyword}" — {profilesAuto.triggeredCount} disparos</p>
              </div>
              <button onClick={() => setProfilesAuto(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {loadingProfiles ? (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
                </div>
              ) : profiles.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  Nenhum perfil registrado ainda
                </div>
              ) : (
                <div className="space-y-2">
                  {profiles.map(p => {
                    const { label, color } = stepLabel(p.step)
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className="w-9 h-9 bg-gradient-to-br from-violet-400 to-pink-400 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {(p.igUsername || p.senderIgId)?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          {p.igUsername ? (
                            <a
                              href={`https://instagram.com/${p.igUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-violet-600 hover:underline"
                            >
                              @{p.igUsername}
                            </a>
                          ) : (
                            <p className="text-sm text-slate-600 font-mono">{p.senderIgId}</p>
                          )}
                          {p.email && <p className="text-xs text-slate-400 truncate">{p.email}</p>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${color}`}>
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Painel lateral — Nova / Editar Automação */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={closePanel} />
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">{editingId ? 'Editar Automação' : 'Nova Automação'}</h3>
              <button onClick={closePanel} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
              )}

              {/* Selecionar post */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700">Selecionar Post / Reel</label>
                  <button onClick={fetchMedia} className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 transition">
                    <RefreshCw className="w-3.5 h-3.5" /> Atualizar
                  </button>
                </div>

                {/* Post atual ao editar */}
                {editingId && selectedPost && (
                  <div className="mb-3 p-2.5 bg-violet-50 rounded-lg text-xs text-violet-700 flex items-center gap-2">
                    {selectedPost._thumbnail && (
                      <img src={selectedPost._thumbnail} className="w-8 h-8 rounded object-cover" alt="" />
                    )}
                    <div>
                      <p className="font-semibold">Post atual: <span className="font-mono">{selectedPost.id}</span></p>
                      {selectedPost.caption && <p className="text-violet-600 truncate max-w-xs">{selectedPost.caption}</p>}
                    </div>
                  </div>
                )}

                {loadingMedia ? (
                  <div className="flex items-center justify-center py-10 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando posts...
                  </div>
                ) : media.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl text-slate-400 text-sm">
                    Nenhum post encontrado. Verifique o token.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {media.map(post => (
                      <button
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition ${
                          selectedPost?.id === post.id
                            ? 'border-violet-500 ring-2 ring-violet-200'
                            : 'border-transparent hover:border-violet-300'
                        }`}
                      >
                        {thumbnail(post) ? (
                          <img src={thumbnail(post)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                            <Image className="w-6 h-6 text-slate-300" />
                          </div>
                        )}
                        {selectedPost?.id === post.id && (
                          <div className="absolute inset-0 bg-violet-600/20 flex items-center justify-center">
                            <div className="w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center">
                              <ChevronRight className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {mediaCursor && (
                  <div className="flex justify-center mt-2">
                    <button
                      onClick={fetchMoreMedia}
                      disabled={loadingMore}
                      className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 disabled:opacity-50 transition"
                    >
                      {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      {loadingMore ? 'Carregando...' : 'Carregar mais'}
                    </button>
                  </div>
                )}

                {selectedPost && !selectedPost._thumbnail && (
                  <div className="mt-2 p-2.5 bg-violet-50 rounded-lg text-xs text-violet-700">
                    Selecionado: <span className="font-mono font-semibold">{selectedPost.id}</span>
                    {selectedPost.caption && <p className="mt-1 text-violet-600 truncate">{selectedPost.caption}</p>}
                  </div>
                )}
              </div>

              {/* Palavra-chave */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Palavra-chave para disparar</label>
                <input
                  type="text"
                  value={form.keyword}
                  onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))}
                  placeholder="eu quero"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-400 transition"
                />
                <p className="text-xs text-slate-400 mt-1">Aceita maiúsculas, minúsculas e acentos automaticamente</p>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.acceptAny}
                    onChange={e => setForm(f => ({ ...f, acceptAny: e.target.checked }))}
                    className="w-4 h-4 accent-violet-600"
                  />
                  <span className="text-xs text-slate-600">Disparar para <strong>qualquer comentário</strong> (ignorar palavra-chave)</span>
                </label>
              </div>

              {/* Mensagem de resposta */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mensagem que vai no DM</label>
                <textarea
                  value={form.replyMessage}
                  onChange={e => setForm(f => ({ ...f, replyMessage: e.target.value }))}
                  placeholder="Oi! Vi que você se interessou 😊 Aqui está o link exclusivo: https://..."
                  rows={5}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-400 transition resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">Esta mensagem é enviada após o lead confirmar/fornecer email.</p>
              </div>

              {/* Botão no DM */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Label do botão no DM <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={form.dmButtonLabel}
                  onChange={e => setForm(f => ({ ...f, dmButtonLabel: e.target.value }))}
                  placeholder="Ex: Acessar agora →"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-400 transition"
                />
                <p className="text-xs text-slate-400 mt-1">Se preenchido, o link vira um botão clicável com esse texto</p>
              </div>

              {/* Resposta pública */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Resposta pública no comentário <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={form.commentReply}
                  onChange={e => setForm(f => ({ ...f, commentReply: e.target.value }))}
                  placeholder="Verifica lá na sua DM, já te mandei! 😉"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-400 transition"
                />
              </div>

              {/* Confirmação (Yes/No) */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.captureConfirmation}
                    onChange={e => setForm(f => ({ ...f, captureConfirmation: e.target.checked }))}
                    className="w-4 h-4 accent-violet-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700">Pedir confirmação antes</span>
                    <p className="text-xs text-slate-400 mt-0.5">Envia botões "Sim, quero! ✅" e "Não, obrigado" antes de continuar</p>
                  </div>
                </label>
                {form.captureConfirmation && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Mensagem enviada com os botões</label>
                    <input
                      type="text"
                      value={form.confirmationQuestion}
                      onChange={e => setForm(f => ({ ...f, confirmationQuestion: e.target.value }))}
                      placeholder="Quer receber o material gratuito? 👇"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-400 transition"
                    />
                  </div>
                )}
              </div>

              {/* Captura de email */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.captureEmail}
                    onChange={e => setForm(f => ({ ...f, captureEmail: e.target.checked }))}
                    className="w-4 h-4 accent-violet-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700">Capturar email via DM</span>
                    <p className="text-xs text-slate-400 mt-0.5">O bot pede o email antes de enviar o link e salva como Lead</p>
                  </div>
                </label>
                {form.captureEmail && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Pergunta enviada no DM</label>
                    <input
                      type="text"
                      value={form.emailQuestion}
                      onChange={e => setForm(f => ({ ...f, emailQuestion: e.target.value }))}
                      placeholder="Oi! Qual é o seu melhor email para eu te enviar o material? 😊"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-400 transition"
                    />
                    <p className="text-xs text-slate-400 mt-1">Após a pessoa responder, o link acima é enviado automaticamente.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={closePanel} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg transition">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !selectedPost || !form.replyMessage.trim()}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar Automação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
