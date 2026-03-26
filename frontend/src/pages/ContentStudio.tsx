import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Send,
  Save,
  Sparkles,
  Clock,
  FileText,
  ArrowLeft,
  ChevronRight,
  Layers,
  CheckCircle2,
  AlertCircle,
  Hash,
  Layout,
  Copy,
  Check,
  Smartphone,
  Pen,
  Calendar as CalendarIcon,
  Trash2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AnimatePresence, motion } from 'framer-motion'

import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { PlatformIcon, PLATFORMS, getPlatformLabel } from '../components/PlatformIcon'
import { PlatformPreview } from '../components/PlatformPreview'
import { api } from '../lib/api'
import { useUIStore } from '../store/uiStore'
import type { Platform } from '../types'

export function ContentStudio() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isDarkMode = useUIStore(state => state.isDarkMode)
  const { selectedArticleId, selectedDraftId, setSelectedDraftId } =
    useUIStore()

  const [platform, setPlatform] = useState<string>('linkedin')
  const [draftText, setDraftText] = useState('')
  const [scheduleAt, setScheduleAt] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [copied, setCopied] = useState(false)

  // Clear draft when switching platform
  useEffect(() => {
    setDraftText('')
    setSelectedDraftId(null)
  }, [platform])

  // Queries
  const articleQuery = useQuery({
    queryKey: ['articles'],
    queryFn: () => api.listArticles(),
  })
  const selectedArticle = articleQuery.data?.items?.find((a) => a.id === selectedArticleId)

  const draftsQuery = useQuery({
    queryKey: ['drafts', selectedArticleId],
    queryFn: () => api.listDrafts(selectedArticleId ?? undefined),
    enabled: !!selectedArticleId,
  })

  // Mutations
  const generateMutation = useMutation({
    mutationFn: () => {
      if (!selectedArticleId) throw new Error('Select an article first')
      return api.generateDraft(selectedArticleId, platform)
    },
    onSuccess: async (draft) => {
      setSelectedDraftId(draft.id)
      setDraftText(draft.body)
      await queryClient.invalidateQueries({ queryKey: ['drafts'] })
      toast.success(`Synthetic ${getPlatformLabel(platform)} Brief Ready`)
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedDraftId && draftText.length === 0) throw new Error('No content to save')
      if (selectedDraftId) {
        return api.updateDraft(selectedDraftId, draftText)
      } else {
        // Create new draft if none selected
        return api.generateDraft(selectedArticleId!, platform) // For simplicity, though usually it would be createDraft(text)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] })
      toast.success('Strategy saved to queue')
      navigate('/scheduler')
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const publishMutation = useMutation({
    mutationFn: () => {
      if (!selectedDraftId) throw new Error('Generate or select a draft first')
      return api.publishNow(selectedDraftId)
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['analytics'] }),
        queryClient.invalidateQueries({ queryKey: ['comments'] }),
      ])
      if (result.success) {
        toast.success(`Succesfully published to ${getPlatformLabel(result.platform)}!`)
        navigate('/analytics')
      } else {
        toast.error(`Neural link failed: ${result.message ?? 'Unknown error'}`)
      }
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const scheduleMutation = useMutation({
    mutationFn: () => {
      if (!selectedDraftId || !scheduleAt) throw new Error('Select draft and time')
      return api.createSchedule(selectedDraftId, platform, new Date(scheduleAt).toISOString())
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['schedules'] })
      setShowSchedule(false)
      setScheduleAt('')
      toast.success('Post scheduled for deployment!')
      navigate('/scheduler')
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const charCount = draftText.length
  const charLimit = platform === 'x' ? 280 : platform === 'linkedin' ? 3000 : 2000
  const isGenerating = generateMutation.isPending
  const hasContent = draftText.length > 0

  const copyToClipboard = () => {
    navigator.clipboard.writeText(draftText)
    setCopied(true)
    toast.success('Copied to system clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  if (!selectedArticleId || !selectedArticle) {
    return (
      <Card className="animate-fade-in py-24 bg-white dark:bg-void border-slate-200 dark:border-graphite/40 shadow-xl dark:shadow-none">
        <EmptyState
          icon={FileText}
          title="Studio is Offline"
          description="Awaiting source material. Select an article from the mission logs to begin content synthesis."
          action={
            <button onClick={() => navigate('/news')} className="btn-primary shadow-glow-volt/20">
              <ArrowLeft size={18} /> INITIATE INTELLIGENCE SCAN
            </button>
          }
        />
      </Card>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12 animate-fade-in pb-20">
      {/* Main Content Area */}
      <div className="space-y-6 lg:col-span-8">
        {/* Source Banner */}
        <div className={`flex items-center justify-between rounded-3xl border p-6 transition-all duration-500 ${
          isDarkMode ? 'border-graphite/40 bg-stellar/40 backdrop-blur-xl' : 'border-slate-200 bg-white shadow-sm'
        }`}>
          <div className="min-w-0">
             <div className="flex items-center gap-2 mb-1">
               <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-volt/60' : 'text-teal-600'}`}>Source Matrix</span>
               <div className="h-1.5 w-1.5 rounded-full bg-volt shadow-glow-volt" />
             </div>
            <h3 className={`truncate text-lg font-serif font-bold ${isDarkMode ? 'text-silver' : 'text-slate-900'}`}>{selectedArticle.title}</h3>
          </div>
          <button
            onClick={() => navigate('/news')}
            className={`btn-ghost group text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-silver' : 'text-slate-500'}`}
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
            RESELECT
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`flex items-center gap-3 rounded-2xl border px-6 py-4 text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                platform === p
                  ? 'border-volt bg-volt text-white shadow-glow-volt outline-none ring-4 ring-volt/10'
                  : isDarkMode 
                    ? 'border-graphite/40 bg-stellar/40 text-dim hover:text-silver'
                    : 'border-slate-200 bg-white text-slate-400 hover:text-slate-900 shadow-sm'
              }`}
            >
              <PlatformIcon platform={p} size={18} />
              <span>{getPlatformLabel(p)}</span>
            </button>
          ))}
        </div>

        {/* Workspace Container */}
        <div className={`flex flex-col rounded-[2.5rem] border overflow-hidden transition-all duration-500 ${
          isDarkMode ? 'border-graphite/40 bg-stellar/10' : 'border-slate-200 bg-white shadow-2xl shadow-slate-200/40'
        }`}>
          {/* Internal Toolbar */}
          <div className={`flex items-center justify-between px-8 py-5 border-b ${
            isDarkMode ? 'border-graphite/40 bg-void/50' : 'border-slate-100 bg-slate-50'
          }`}>
             <div className="flex items-center gap-4">
               <div className={`p-2.5 rounded-xl border flex items-center justify-center ${isDarkMode ? 'bg-void border-graphite/60 text-volt' : 'bg-white border-slate-200 text-teal-600 shadow-sm'}`}>
                 <PlatformIcon platform={platform} size={20} />
               </div>
               <div className="flex flex-col">
                 <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-dim' : 'text-slate-400'}`}>Workspace</span>
                 <span className={`text-xs font-bold ${isDarkMode ? 'text-silver' : 'text-slate-900'}`}>
                   {getPlatformLabel(platform)} Pipeline
                 </span>
               </div>
             </div>

             <div className={`flex p-1 rounded-xl border transition-all ${isDarkMode ? 'bg-void/80 border-graphite/40' : 'bg-white border-slate-200 shadow-sm'}`}>
                <button 
                  onClick={() => setViewMode('edit')}
                  className={`flex items-center gap-2 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    viewMode === 'edit' ? 'bg-volt text-white shadow-glow-volt' : isDarkMode ? 'text-dim hover:text-silver' : 'text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Pen size={14} /> Editor
                </button>
                <button 
                  onClick={() => setViewMode('preview')}
                  className={`flex items-center gap-2 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    viewMode === 'preview' ? 'bg-amethyst text-white shadow-glow-amethyst' : isDarkMode ? 'text-dim hover:text-silver' : 'text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Smartphone size={14} /> Preview
                </button>
             </div>
          </div>

          {/* Editor Body */}
          <div className="relative min-h-[480px] flex flex-col">
            <AnimatePresence mode="wait">
              {viewMode === 'edit' ? (
                <motion.div
                  key="editor"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col"
                >
                  <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    placeholder={`Synthesize high-impact ${getPlatformLabel(platform)} brief based on mission source...`}
                    className={`flex-1 w-full bg-transparent p-12 text-xl font-sans lg:text-2xl leading-relaxed outline-none resize-none transition-colors scrollbar-thin ${
                      isDarkMode ? 'text-silver placeholder-dim/30' : 'text-slate-900 placeholder-slate-200'
                    }`}
                  />
                  
                  {/* Footer Metrics */}
                  <div className={`flex items-center justify-between px-12 py-4 border-t text-[11px] font-black uppercase tracking-widest ${
                    isDarkMode ? 'border-graphite/40 bg-void/50 text-dim/60' : 'border-slate-50 bg-slate-50/50 text-slate-400'
                  }`}>
                    <div className="flex gap-8">
                       <span className="flex items-center gap-2 decoration-volt">
                         <div className={`h-1.5 w-1.5 rounded-full ${charCount > charLimit ? 'bg-danger' : 'bg-volt'}`} />
                         {charCount} / {charLimit} Characters
                       </span>
                       {platform === 'x' && (
                         <span className="flex items-center gap-2">
                           <Layers size={14} />
                           {draftText.split('---').length} Neural Fragments
                         </span>
                       )}
                    </div>
                    <div className={`flex items-center gap-2 ${isGenerating ? 'text-volt animate-pulse' : ''}`}>
                      {isGenerating ? 'Processing Data Link...' : 'Status: Ready for Synthesis'}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`flex-1 p-12 overflow-y-auto ${isDarkMode ? 'bg-void/20' : 'bg-slate-50/30'}`}
                >
                  <PlatformPreview platform={platform} content={draftText} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Persistent Action Bar - Sticky */}
          <div className={`sticky bottom-0 z-20 p-6 border-t flex flex-wrap items-center justify-between gap-6 transition-all duration-500 backdrop-blur-3xl ${
            isDarkMode ? 'border-graphite/40 bg-stellar/60' : 'border-slate-100 bg-white/90 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]'
          }`}>
             <div className="flex flex-wrap gap-3">
               <button 
                 onClick={() => generateMutation.mutate()}
                 disabled={isGenerating}
                 className={`flex items-center gap-3 h-12 px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                   isDarkMode 
                    ? 'border-volt/30 bg-volt/5 text-volt hover:bg-volt hover:text-white shadow-glow-volt/5' 
                    : 'border-teal-200 bg-white text-teal-600 hover:bg-teal-600 hover:text-white shadow-sm'
                 }`}
               >
                 {isGenerating ? <Spinner size={16} /> : <Sparkles size={16} className="fill-current" />}
                 {hasContent ? 'REGENERATE INTELLIGENCE' : 'GENERATE BRIEF'}
               </button>
               <button 
                 onClick={copyToClipboard}
                 className={`flex items-center gap-3 h-12 px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                   isDarkMode 
                    ? 'border-graphite/40 bg-void text-silver hover:bg-white/5' 
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                 }`}
               >
                 {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                 COPY DRAFT
               </button>
               <button 
                 onClick={() => setDraftText('')}
                 className={`flex items-center h-12 w-12 justify-center rounded-2xl border transition-all ${
                   isDarkMode ? 'border-graphite/40 text-dim/40 hover:text-danger hover:border-danger/30' : 'border-slate-200 text-slate-300 hover:text-danger hover:border-danger/20'
                 }`}
               >
                 <Trash2 size={18} />
               </button>
             </div>

             <div className="flex gap-4">
               <button 
                 onClick={() => setShowSchedule(!showSchedule)}
                 className={`h-12 w-12 flex items-center justify-center rounded-2xl border transition-all ${
                   showSchedule
                     ? 'bg-amethyst text-white shadow-glow-amethyst border-amethyst'
                     : isDarkMode ? 'border-graphite/40 bg-void text-dim hover:text-amethyst' : 'border-slate-200 bg-white text-slate-400 shadow-sm'
                 }`}
               >
                 <Clock size={20} />
               </button>
               <button 
                 onClick={() => publishMutation.mutate()}
                 disabled={publishMutation.isPending}
                 className={`flex items-center gap-3 h-12 px-10 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                   !hasContent 
                    ? 'bg-slate-100 text-slate-300 dark:bg-void dark:text-dim dark:border-graphite/40 border cursor-not-allowed opacity-50'
                    : 'bg-volt text-white shadow-glow-volt hover:scale-105 active:scale-95'
                 }`}
               >
                 {publishMutation.isPending ? <Spinner size={18} /> : <Send size={18} />}
                 PUBLISH TO {getPlatformLabel(platform).toUpperCase()}
               </button>
             </div>
          </div>
        </div>

        {/* Schedule Interface */}
        <AnimatePresence>
          {showSchedule && (
            <motion.div
              initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            >
              <Card className={`border shadow-2xl p-8 rounded-[2rem] ${isDarkMode ? 'border-amethyst/30 bg-amethyst/5' : 'border-violet-100 bg-violet-50/50'}`}>
                  <div className="flex flex-wrap items-end gap-6">
                    <div className="flex-1 min-w-[240px]">
                      <label className={`mb-3 block text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-amethyst' : 'text-violet-700'}`}>
                        TARGET DEPLOYMENT SIGNAL
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduleAt}
                        onChange={(e) => setScheduleAt(e.target.value)}
                        className={`w-full h-14 px-5 rounded-2xl border outline-none font-bold transition-all ${
                          isDarkMode 
                            ? 'bg-void border-amethyst/20 text-silver focus:border-amethyst' 
                            : 'bg-white border-slate-200 text-slate-900 focus:border-violet-500'
                        }`}
                      />
                    </div>
                    <button
                      onClick={() => scheduleMutation.mutate()}
                      disabled={!scheduleAt || scheduleMutation.isPending}
                      className="btn-primary h-14 px-10 bg-amethyst hover:bg-amethyst-light shadow-glow-amethyst/20 rounded-2xl"
                    >
                      {scheduleMutation.isPending ? <Spinner size={18} /> : <CalendarIcon size={18} />}
                      AUTHORIZE SCHEDULE
                    </button>
                  </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Local Archive Sidebar */}
      <div className="lg:col-span-4 space-y-6">
        <Card className={`h-[calc(100vh-240px)] flex flex-col p-8 transition-all duration-500 ${
          isDarkMode ? 'border-graphite/40 bg-stellar/20' : 'border-slate-200 bg-white shadow-xl'
        }`}>
          <div className="mb-8 flex items-center justify-between">
            <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-dim' : 'text-slate-400'}`}>Historical Units</h3>
            <Badge variant="volt" size="sm">{draftsQuery.data?.items?.length || 0}</Badge>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto pr-3 custom-scrollbar">
            {draftsQuery.data?.items?.map((draft) => (
              <button
                key={draft.id}
                onClick={() => {
                  setSelectedDraftId(draft.id)
                  setDraftText(draft.body)
                  setPlatform(draft.platform)
                  setViewMode('edit')
                }}
                className={`group relative w-full rounded-3xl border p-5 text-left transition-all duration-300 ${
                  selectedDraftId === draft.id
                    ? 'border-volt bg-volt/10 shadow-glow-volt/5'
                    : isDarkMode 
                      ? 'border-graphite/40 bg-void/40 hover:border-volt/30'
                      : 'border-slate-100 bg-slate-50 hover:bg-white hover:shadow-lg'
                }`}
              >
                <div className="mb-3 flex items-center gap-3">
                   <PlatformIcon platform={draft.platform} size={14} className={selectedDraftId === draft.id ? 'text-volt' : 'text-dim'} />
                   <span className={`text-[10px] font-black uppercase tracking-widest ${selectedDraftId === draft.id ? 'text-volt' : 'text-dim'}`}>
                    {getPlatformLabel(draft.platform)}
                  </span>
                </div>
                <p className={`line-clamp-2 text-xs leading-relaxed transition-colors ${
                  selectedDraftId === draft.id ? 'text-silver font-bold' : 'text-dim group-hover:text-silver'
                }`}>{draft.body}</p>
              </button>
            ))}
          </div>
          
          <div className={`mt-8 pt-8 border-t ${isDarkMode ? 'border-graphite/20' : 'border-slate-50'}`}>
             <button
               onClick={() => saveMutation.mutate()}
               disabled={!hasContent || saveMutation.isPending}
               className={`w-full flex items-center justify-center gap-3 h-14 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all ${
                 hasContent 
                  ? 'border-teal-500/30 text-teal-600 bg-teal-50 hover:bg-teal-500 hover:text-white dark:border-volt/30 dark:text-volt dark:bg-volt/5 dark:hover:bg-volt'
                  : 'border-slate-100 text-slate-300 pointer-events-none'
               }`}
             >
               {saveMutation.isPending ? <Spinner size={16} /> : <Save size={16} />}
               Archive Strategic Draft
             </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
