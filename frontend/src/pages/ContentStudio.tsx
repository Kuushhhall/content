import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Send,
  Save,
  Sparkles,
  Clock,
  FileText,
  ArrowLeft,
  Copy,
  Check,
  Smartphone,
  Pen,
  Calendar as CalendarIcon,
  Trash2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Undo,
  Redo,
  Image,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AnimatePresence, motion } from 'framer-motion'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import UnderlineExtension from '@tiptap/extension-underline'
import ImageExtension from '@tiptap/extension-image'
import PlaceholderExtension from '@tiptap/extension-placeholder'

import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { PlatformIcon, PLATFORMS, getPlatformLabel } from '../components/PlatformIcon'
import { PlatformPreview } from '../components/PlatformPreview'
import { api } from '../lib/api'
import { useUIStore } from '../store/uiStore'

// Derive Platform type from PLATFORMS constant
type Platform = typeof PLATFORMS[number]

// Helper: strip HTML tags for plain text preview
const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '')

// Workaround for TypeScript error: cast EditorContent to any
const EditorContentComponent = EditorContent as any

function EditorToolbar({ editor, isDarkMode }: { editor: any; isDarkMode: boolean }) {
  if (!editor) return null

  const toolbarButtons = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), isActive: editor.isActive('bold'), tooltip: 'Bold' },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), isActive: editor.isActive('italic'), tooltip: 'Italic' },
    { icon: Underline, action: () => editor.chain().focus().toggleUnderline().run(), isActive: editor.isActive('underline'), tooltip: 'Underline' },
    { icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), isActive: editor.isActive('strike'), tooltip: 'Strikethrough' },
    { type: 'divider' },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), isActive: editor.isActive('bulletList'), tooltip: 'Bullet List' },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), isActive: editor.isActive('orderedList'), tooltip: 'Ordered List' },
    { type: 'divider' },
    { icon: Undo, action: () => editor.chain().focus().undo().run(), tooltip: 'Undo' },
    { icon: Redo, action: () => editor.chain().focus().redo().run(), tooltip: 'Redo' },
    { type: 'divider' },
    { icon: Image, action: () => toast('Image upload coming soon!', { icon: '📷' }), tooltip: 'Attach Image (Coming Soon)', disabled: true },
  ]

  return (
    <div className={`flex items-center gap-1 px-4 py-3 border-b flex-wrap ${isDarkMode ? 'border-graphite/40 bg-void/30' : 'border-slate-100 bg-slate-50/50'}`}>
      {toolbarButtons.map((button, index) => {
        if (button.icon) {
          const Icon = button.icon
          return (
            <button
              key={index}
              onClick={button.action}
              disabled={button.disabled}
              title={button.tooltip}
              className={`p-2 rounded-lg transition-all ${
                button.disabled
                  ? 'opacity-30 cursor-not-allowed'
                  : button.isActive
                    ? 'bg-volt text-white'
                    : isDarkMode
                      ? 'text-dim hover:text-silver hover:bg-white/5'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon size={18} />
            </button>
          )
        }
        return <div key={index} className={`w-px h-6 mx-2 ${isDarkMode ? 'bg-graphite/40' : 'bg-slate-200'}`} />
      })}
    </div>
  )
}

export function ContentStudio() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isDarkMode = useUIStore(state => state.isDarkMode)
  const { selectedArticleId, selectedDraftId, setSelectedDraftId } = useUIStore()

  const [platform, setPlatform] = useState<Platform>('linkedin')
  const [draftText, setDraftText] = useState('')
  const [scheduleAt, setScheduleAt] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [copied, setCopied] = useState(false)
  const [draftListCollapsed, setDraftListCollapsed] = useState(false)

  // TipTap Editor with proper extension configuration
  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      ImageExtension,
      PlaceholderExtension.configure({
        placeholder: 'Start writing your content...',
      }),
    ],
    content: draftText,
    onUpdate: ({ editor }) => {
      setDraftText(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: `prose prose-lg max-w-none focus:outline-none min-h-[250px] px-6 py-4 ${isDarkMode ? 'prose-invert' : 'prose-slate'} whitespace-pre-wrap`,
      },
    },
  })

  // Sync editor content when draftText changes externally
  useEffect(() => {
    if (editor && draftText !== editor.getHTML()) {
      editor.commands.setContent(draftText)
    }
  }, [draftText, editor])

  // Clear draft when switching platform
  useEffect(() => {
    setDraftText('')
    setSelectedDraftId(null)
    if (editor) {
      editor.commands.setContent('')
    }
  }, [platform, editor])

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
      if (editor) {
        editor.commands.setContent(draft.body)
      }
      await queryClient.invalidateQueries({ queryKey: ['drafts'] })
      toast.success(`Generated ${getPlatformLabel(platform)} draft`)
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedDraftId && draftText.length === 0) throw new Error('No content to save')
      if (selectedDraftId) {
        return api.updateDraft(selectedDraftId, draftText)
      } else {
        return api.generateDraft(selectedArticleId!, platform)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] })
      toast.success('Draft saved')
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
        toast.success(`Published to ${getPlatformLabel(result.platform)}!`)
        navigate('/analytics')
      } else {
        toast.error(`Publish failed: ${result.message ?? 'Unknown error'}`)
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
      toast.success('Post scheduled!')
      navigate('/scheduler')
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const charCount = stripHtml(draftText).length
  const charLimit = platform === 'x' ? 280 : platform === 'linkedin' ? 3000 : 2000
  const isGenerating = generateMutation.isPending
  const hasContent = draftText.length > 0

  const copyToClipboard = () => {
    const plainText = editor?.getText() || stripHtml(draftText)
    navigator.clipboard.writeText(plainText)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  if (!selectedArticleId || !selectedArticle) {
    return (
      <Card className="animate-fade-in py-24">
        <EmptyState
          icon={FileText}
          title="No Article Selected"
          description="Select an article from the News Feed to start creating content."
          action={
            <button onClick={() => navigate('/news')} className="btn-primary">
              <ArrowLeft size={18} /> Go to News Feed
            </button>
          }
        />
      </Card>
    )
  }

  return (
    <div className="animate-fade-in pb-20">
      {/* Header */}
      <div className={`flex items-center justify-between rounded-2xl border p-4 mb-6 transition-all ${
        isDarkMode ? 'border-graphite/40 bg-stellar/40' : 'border-slate-200 bg-white shadow-sm'
      }`}>
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <button
            onClick={() => navigate('/news')}
            className={`p-2 rounded-xl transition-all shrink-0 ${isDarkMode ? 'text-dim hover:text-silver hover:bg-white/5' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-dim' : 'text-slate-400'}`}>Creating content from</p>
            <h3 className={`truncate text-sm font-bold ${isDarkMode ? 'text-silver' : 'text-slate-900'}`}>{selectedArticle.title}</h3>
          </div>
        </div>
      </div>

      {/* Platform Selector */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p as Platform)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
              platform === p
                ? 'border-volt bg-volt text-white shadow-glow-volt'
                : isDarkMode 
                  ? 'border-graphite/40 bg-stellar/40 text-dim hover:text-silver' 
                  : 'border-slate-200 bg-white text-slate-400 hover:text-slate-900 shadow-sm'
            }`}
          >
            <PlatformIcon platform={p} size={16} />
            <span className="hidden sm:inline">{getPlatformLabel(p)}</span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Editor Section */}
        <div className={`flex-1 min-w-0 ${draftListCollapsed ? 'w-full' : ''}`}>
          <div className={`rounded-2xl border overflow-hidden transition-all ${
            isDarkMode ? 'border-graphite/40 bg-stellar/10' : 'border-slate-200 bg-white shadow-xl'
          }`}>
            {/* View Mode Toggle */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDarkMode ? 'border-graphite/40 bg-void/30' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <PlatformIcon platform={platform} size={18} className={isDarkMode ? 'text-volt' : 'text-teal-600'} />
                <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-dim' : 'text-slate-400'}`}>
                  {getPlatformLabel(platform)} Editor
                </span>
              </div>
              <div className={`flex p-1 rounded-lg border ${isDarkMode ? 'bg-void/80 border-graphite/40' : 'bg-white border-slate-200'}`}>
                <button 
                  onClick={() => setViewMode('edit')}
                  className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                    viewMode === 'edit' ? 'bg-volt text-white' : isDarkMode ? 'text-dim hover:text-silver' : 'text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Pen size={12} /> Edit
                </button>
                <button 
                  onClick={() => setViewMode('preview')}
                  className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                    viewMode === 'preview' ? 'bg-amethyst text-white' : isDarkMode ? 'text-dim hover:text-silver' : 'text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Smartphone size={12} /> Preview
                </button>
              </div>
            </div>

            {/* Editor/Preview Content */}
            <div className="min-h-[350px] max-h-[500px] overflow-hidden flex flex-col">
              <AnimatePresence mode="wait">
                {viewMode === 'edit' ? (
                  <motion.div
                    key="editor"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col overflow-hidden"
                  >
                    <EditorToolbar editor={editor} isDarkMode={isDarkMode} />
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {editor && <EditorContentComponent editor={editor} className="min-h-full" />}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`flex-1 p-6 overflow-y-auto ${isDarkMode ? 'bg-void/20' : 'bg-slate-50/30'}`}
                  >
                    <PlatformPreview platform={platform} content={stripHtml(draftText)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Metrics */}
            <div className={`flex items-center justify-between px-4 py-3 border-t text-[10px] font-bold uppercase tracking-wider ${
              isDarkMode ? 'border-graphite/40 bg-void/30 text-dim' : 'border-slate-100 bg-slate-50 text-slate-400'
            }`}>
              <div className="flex items-center gap-4">
                <span className={`flex items-center gap-2 ${charCount > charLimit ? 'text-danger' : ''}`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${charCount > charLimit ? 'bg-danger' : 'bg-volt'}`} />
                  {charCount}/{charLimit}
                </span>
                {platform === 'x' && (
                  <span className="flex items-center gap-2">
                    {draftText.split('---').length} threads
                  </span>
                )}
              </div>
              <span className={isGenerating ? 'text-volt animate-pulse' : ''}>
                {isGenerating ? 'Generating...' : 'Ready'}
              </span>
            </div>
          </div>

          {/* Action Bar */}
          <div className={`mt-4 p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
            isDarkMode ? 'border-graphite/40 bg-stellar/20' : 'border-slate-200 bg-white shadow-sm'
          }`}>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => generateMutation.mutate()}
                disabled={isGenerating}
                className={`flex items-center gap-2 h-11 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                  isDarkMode 
                    ? 'border-volt/30 text-volt hover:bg-volt hover:text-white' 
                    : 'border-teal-200 text-teal-600 hover:bg-teal-600 hover:text-white'
                }`}
              >
                {isGenerating ? <Spinner size={14} /> : <Sparkles size={14} />}
                {hasContent ? 'Regenerate' : 'Generate'}
              </button>
              <button 
                onClick={copyToClipboard}
                className={`flex items-center gap-2 h-11 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                  isDarkMode ? 'border-graphite/40 text-silver hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                Copy
              </button>
              <button 
                onClick={() => {
                  setDraftText('')
                  if (editor) editor.commands.setContent('')
                }}
                className={`flex items-center h-11 w-11 justify-center rounded-xl border transition-all ${
                  isDarkMode ? 'border-graphite/40 text-dim hover:text-danger' : 'border-slate-200 text-slate-300 hover:text-danger'
                }`}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowSchedule(!showSchedule)}
                className={`h-11 w-11 flex items-center justify-center rounded-xl border transition-all ${
                  showSchedule
                    ? 'bg-amethyst text-white border-amethyst'
                    : isDarkMode ? 'border-graphite/40 text-dim hover:text-amethyst' : 'border-slate-200 text-slate-400'
                }`}
              >
                <Clock size={18} />
              </button>
              <button 
                onClick={() => publishMutation.mutate()}
                disabled={!hasContent || publishMutation.isPending}
                className={`flex items-center gap-2 h-11 px-6 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  !hasContent 
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed dark:bg-void dark:text-dim dark:border-graphite/40 border'
                    : 'bg-volt text-white shadow-glow-volt hover:scale-105 active:scale-95'
                }`}
              >
                {publishMutation.isPending ? <Spinner size={14} /> : <Send size={14} />}
                Publish
              </button>
            </div>
          </div>

          {/* Schedule Interface */}
          <AnimatePresence>
            {showSchedule && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mt-4 p-6 rounded-2xl border ${isDarkMode ? 'border-amethyst/30 bg-amethyst/5' : 'border-violet-100 bg-violet-50/50'}`}
              >
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-amethyst' : 'text-violet-700'}`}>
                      Schedule For
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleAt}
                      onChange={(e) => setScheduleAt(e.target.value)}
                      className={`w-full h-12 px-4 rounded-xl border outline-none font-bold transition-all ${
                        isDarkMode 
                          ? 'bg-void border-amethyst/20 text-silver focus:border-amethyst' 
                          : 'bg-white border-slate-200 text-slate-900 focus:border-violet-500'
                      }`}
                    />
                  </div>
                  <button
                    onClick={() => scheduleMutation.mutate()}
                    disabled={!scheduleAt || scheduleMutation.isPending}
                    className="btn-primary h-12 px-8 bg-amethyst hover:bg-amethyst-light shadow-glow-amethyst/20 rounded-xl"
                  >
                    {scheduleMutation.isPending ? <Spinner size={16} /> : <CalendarIcon size={16} />}
                    Schedule
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Draft List Sidebar */}
        <div className={`transition-all duration-300 ${draftListCollapsed ? 'w-12' : 'w-full lg:w-80'}`}>
          {draftListCollapsed ? (
            <button
              onClick={() => setDraftListCollapsed(false)}
              className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${
                isDarkMode ? 'border-graphite/40 text-dim hover:text-silver hover:bg-white/5' : 'border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ChevronLeft size={20} />
            </button>
          ) : (
            <Card className={`h-[calc(100vh-300px)] flex flex-col p-4 ${isDarkMode ? 'border-graphite/40 bg-stellar/20' : 'border-slate-200 bg-white shadow-xl'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-dim' : 'text-slate-400'}`}>Drafts</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="volt" size="sm">{draftsQuery.data?.items?.length || 0}</Badge>
                  <button
                    onClick={() => setDraftListCollapsed(true)}
                    className={`p-1 rounded-lg transition-all ${isDarkMode ? 'text-dim hover:text-silver' : 'text-slate-400 hover:text-slate-900'}`}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">
                {draftsQuery.data?.items?.map((draft) => (
                  <button
                    key={draft.id}
                    onClick={() => {
                      setSelectedDraftId(draft.id)
                      setDraftText(draft.body)
                      setPlatform(draft.platform as Platform)
                      setViewMode('edit')
                      if (editor) editor.commands.setContent(draft.body)
                    }}
                    className={`group w-full rounded-xl border p-3 text-left transition-all ${
                      selectedDraftId === draft.id
                        ? 'border-volt bg-volt/10'
                        : isDarkMode 
                          ? 'border-graphite/40 bg-void/40 hover:border-volt/30' 
                          : 'border-slate-100 bg-slate-50 hover:bg-white hover:shadow-lg'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <PlatformIcon platform={draft.platform} size={12} className={selectedDraftId === draft.id ? 'text-volt' : 'text-dim'} />
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${selectedDraftId === draft.id ? 'text-volt' : 'text-dim'}`}>
                        {getPlatformLabel(draft.platform)}
                      </span>
                    </div>
                    <p className={`line-clamp-2 text-xs leading-relaxed ${
                      selectedDraftId === draft.id ? 'text-silver font-bold' : 'text-dim group-hover:text-silver'
                    }`}>{stripHtml(draft.body).substring(0, 100)}...</p>
                  </button>
                ))}
              </div>
              
              <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-graphite/20' : 'border-slate-50'}`}>
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={!hasContent || saveMutation.isPending}
                  className={`w-full flex items-center justify-center gap-2 h-12 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                    hasContent 
                      ? 'border-volt/30 text-volt bg-volt/5 hover:bg-volt hover:text-white'
                      : 'border-slate-100 text-slate-300 pointer-events-none'
                  }`}
                >
                  {saveMutation.isPending ? <Spinner size={14} /> : <Save size={14} />}
                  Save Draft
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}