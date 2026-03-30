import { 
  Heart, MessageCircle, Share2, MoreHorizontal, 
  Repeat, BarChart2, Bookmark, Eye, 
  ThumbsUp, MessageSquare, Send, ArrowUp, ArrowDown,
  Plus, ExternalLink, Clapperboard
} from 'lucide-react'
import { PlatformIcon } from './PlatformIcon'
import { Badge } from './Badge'

interface PlatformPreviewProps {
  platform: string
  content: string
}

export function PlatformPreview({ platform, content }: PlatformPreviewProps) {
  const renderPreview = () => {
    switch (platform.toLowerCase()) {
      case 'x':
        return <XPreview content={content} />
      case 'linkedin':
        return <LinkedInPreview content={content} />
      case 'reddit':
        return <RedditPreview content={content} />
      case 'instagram':
        return <InstagramPreview content={content} />
      case 'medium':
        return <MediumPreview content={content} />
      case 'framer':
        return <FramerPreview content={content} />
      default:
        return <GenericPreview content={content} />
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-void/40 p-1 backdrop-blur-2xl transition-all duration-500 hover:border-volt/20 min-h-[500px]">
      <div className="absolute inset-0 bg-gradient-to-br from-volt/5 via-transparent to-amethyst/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      <div className="relative overflow-hidden rounded-[2.25rem] bg-stellar/20 p-6 sm:p-8 flex flex-col h-full">
        <div className="mb-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
             <div className="flex items-center justify-center p-2 rounded-xl bg-volt/10 text-volt shadow-glow-volt/10 group-hover:shadow-glow-volt/20 transition-all">
               <PlatformIcon platform={platform} size={16} />
             </div>
             <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-silver/80">Native Render</span>
               <span className="text-[9px] font-bold text-dim/60 italic lowercase">Simulating {platform} context...</span>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-volt shadow-glow-volt animate-pulse" />
            <div className="h-1.5 w-1.5 rounded-full bg-volt/30 animate-pulse delay-150" />
            <div className="h-1.5 w-1.5 rounded-full bg-volt/10 animate-pulse delay-300" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar max-h-[650px]">
          {renderPreview()}
        </div>
      </div>
    </div>
  )
}

function XPreview({ content }: { content: string }) {
  const tweets = content.split('---').filter(t => t.trim()).map(t => {
    // Strip LLM labels like "TWEET 1: NEWS HOOK" or "**TWEET 1**"
    return t.replace(/^(\*\*?TWEET\s*\d+:?\s*[^**]*\*\*?|TWEET\s*\d+:?\s*[^\\n]*)/gi, '').trim()
  })
  
  return (
    <div className="w-full max-w-2xl mx-auto space-y-0.5 font-sans bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {tweets.map((tweet, i) => (
        <div key={i} className="p-4 flex gap-3 relative hover:bg-white/[0.02] transition-colors overflow-hidden">
          {i < tweets.length - 1 && (
            <div className="absolute left-9 top-14 bottom-0 w-0.5 bg-white/20" />
          )}
          <div className="flex-shrink-0">
             <div className="h-10 w-10 rounded-full bg-gradient-to-br from-volt to-amethyst p-0.5">
               <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-volt font-black text-xs italic">LX</div>
             </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-silver truncate leading-none">Lawxy Times</span>
                <span className="text-dim text-sm truncate leading-none">@lawxy_os • Just now</span>
              </div>
              <MoreHorizontal size={14} className="text-dim/40" />
            </div>
            <p className="mt-1 text-sm leading-normal text-silver/90 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{tweet}</p>
            <div className="mt-3 flex items-center justify-between text-dim/50 max-w-[90%]">
              <div className="flex items-center gap-1 hover:text-sky-400 transition-colors group/x">
                <MessageCircle size={15} className="group-hover/x:-translate-x-0.5 transition-transform" />
                <span className="text-[10px]">12</span>
              </div>
              <div className="flex items-center gap-1 hover:text-green-400 transition-colors">
                <Repeat size={15} />
                <span className="text-[10px]">4</span>
              </div>
              <div className="flex items-center gap-1 hover:text-pink-500 transition-colors">
                <Heart size={15} />
                <span className="text-[10px]">128</span>
              </div>
              <div className="flex items-center gap-1 hover:text-volt transition-colors">
                <BarChart2 size={15} />
                <span className="text-[10px]">2k</span>
              </div>
              <div className="flex items-center gap-4">
                <Bookmark size={15} className="hover:text-volt" />
                <Share2 size={15} className="hover:text-volt" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function LinkedInPreview({ content }: { content: string }) {
  return (
    <div className="w-full max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl overflow-hidden font-sans shadow-xl text-slate-900 leading-normal">
      <div className="p-4">
        <div className="flex items-start gap-2 mb-3">
           <div className="h-12 w-12 rounded-full overflow-hidden border border-slate-100 flex-shrink-0 bg-slate-100 flex items-center justify-center">
             <div className="w-10 h-10 bg-[#FFDE42] rounded-full flex items-center justify-center text-[#1B0C0C] font-black text-xs italic">LX</div>
           </div>
           <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-sm font-bold truncate">Lawxy Times Reporter</p>
                <span className="text-xs text-slate-500">• 1st</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate leading-tight">Elite Legal Analysis & Content Intelligence OS</p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                Just now • <Eye size={10} />
              </p>
           </div>
           <MoreHorizontal size={20} className="text-slate-400" />
        </div>
        
        <p className="text-sm leading-relaxed whitespace-pre-wrap mb-4 font-normal break-words [overflow-wrap:anywhere] text-slate-800">
          {content}
        </p>
        
        <div className="flex items-center justify-between py-2 border-t border-slate-100">
           <div className="flex items-center -space-x-1">
              <div className="h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center text-white ring-2 ring-white"><ThumbsUp size={8} /></div>
              <div className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-white ring-2 ring-white"><Heart size={8} /></div>
              <div className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center text-white ring-2 ring-white"><Plus size={8} /></div>
              <span className="text-[11px] text-slate-500 ml-4 font-bold">242 Reactions</span>
           </div>
           <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
             <span>42 comments</span>
             <span>•</span>
             <span>12 reposts</span>
           </div>
        </div>
        
        <div className="mt-1 grid grid-cols-4 gap-1 pt-1 border-t border-slate-100 text-slate-500">
           {['Like', 'Comment', 'Repost', 'Send'].map(action => (
             <div key={action} className="flex items-center justify-center gap-2 py-2.5 hover:bg-slate-100 rounded-md transition-colors cursor-pointer font-semibold text-xs">
               {action === 'Like' && <ThumbsUp size={18} />}
               {action === 'Comment' && <MessageSquare size={18} />}
               {action === 'Repost' && <Repeat size={18} />}
               {action === 'Send' && <Send size={18} />}
               <span>{action}</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  )
}

function RedditPreview({ content }: { content: string }) {
  const parts = content.split('\n')
  const titleLine = parts.find(p => p.toUpperCase().startsWith('TITLE:'))
  const title = titleLine ? titleLine.split(':', 2)[1].trim() : 'Legal Development Brief'
  const body = parts.filter(p => !p.toUpperCase().startsWith('TITLE:')).join('\n').trim()

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#1a1a1b] border border-white/10 rounded-2xl overflow-hidden font-sans shadow-2xl flex">
      <div className="w-10 bg-[#151516] flex flex-col items-center py-4 gap-4 text-dim/40 border-r border-white/5">
         <ArrowUp size={18} className="hover:text-orange-500 cursor-pointer" />
         <span className="text-xs font-black text-silver">42</span>
         <ArrowDown size={18} className="hover:text-blue-500 cursor-pointer" />
      </div>
      
      <div className="flex-1 p-4 bg-void/40">
        <div className="flex items-center gap-2 mb-2">
           <div className="h-5 w-5 rounded-full bg-orange-600 flex items-center justify-center text-[10px] font-black">L</div>
           <span className="text-[10px] font-black text-silver">r/law</span>
           <span className="text-[10px] text-dim/40">• Posted by u/lawxy_ai 2h ago</span>
        </div>
        
        <h3 className="text-base font-bold text-silver leading-tight mb-3 break-words">
          {title}
        </h3>
        
        <div className="text-sm leading-relaxed text-silver/80 whitespace-pre-wrap mb-4 font-normal prose prose-invert prose-sm max-w-none break-words [overflow-wrap:anywhere]">
          {body}
        </div>
        
        <div className="flex items-center gap-6 text-dim/40 pt-4 border-t border-white/5">
           <div className="flex items-center gap-2 hover:bg-white/5 px-2 py-1 rounded transition-colors cursor-pointer">
              <MessageSquare size={16} />
              <span className="text-[10px] font-black tracking-tight">12 Comments</span>
           </div>
           <div className="flex items-center gap-2 hover:bg-white/5 px-2 py-1 rounded transition-colors cursor-pointer">
              <Share2 size={16} />
              <span className="text-[10px] font-black tracking-tight">Share</span>
           </div>
           <div className="flex items-center gap-2 hover:bg-white/5 px-2 py-1 rounded transition-colors cursor-pointer">
              <Bookmark size={16} />
              <span className="text-[10px] font-black tracking-tight">Save</span>
           </div>
        </div>
      </div>
    </div>
  )
}

function MediumPreview({ content }: { content: string }) {
  return (
    <div className="w-full max-w-3xl mx-auto bg-void border border-white/10 rounded-2xl p-8 sm:p-12 font-serif shadow-2xl relative">
       <div className="absolute top-4 right-8 h-4 w-4 text-volt animate-pulse"><Bookmark size={16} fill="currentColor" /></div>
       
       <div className="flex items-center gap-3 mb-8">
          <div className="h-6 w-6 rounded-full bg-silver flex items-center justify-center text-void font-bold text-[10px]">L</div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-silver uppercase tracking-tight">Lawxy Times Reporter</span>
            <span className="text-[10px] text-dim/60">4 min read • Nov 12</span>
          </div>
       </div>

       <div className="prose prose-invert max-w-none prose-sm leading-8 break-words [overflow-wrap:anywhere]">
          <p className="text-silver/90 whitespace-pre-wrap">{content}</p>
       </div>

       <div className="mt-12 flex items-center justify-between pt-6 border-t border-white/5 text-dim/40">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5 hover:text-success transition-colors cursor-pointer">
                <Clapperboard size={18} />
                <span className="text-xs font-black">422</span>
             </div>
             <div className="flex items-center gap-1.5 hover:text-volt transition-colors cursor-pointer">
                <MessageCircle size={18} />
                <span className="text-xs font-black">12</span>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <Share2 size={18} className="hover:text-volt transition-colors cursor-pointer" />
             <MoreHorizontal size={18} className="hover:text-volt transition-colors cursor-pointer" />
          </div>
       </div>
    </div>
  )
}

function InstagramPreview({ content }: { content: string }) {
  return (
    <div className="w-full max-w-sm mx-auto bg-black border border-white/10 rounded-3xl overflow-hidden font-sans shadow-2xl">
      {/* Header */}
      <div className="p-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-volt via-amethyst to-danger p-[2px]">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[10px] font-black italic">LX</div>
          </div>
          <div className="flex flex-col -space-y-0.5">
            <span className="text-[11px] font-bold text-silver">lawxy_os</span>
            <span className="text-[9px] text-dim/60">Intelligence Hub</span>
          </div>
        </div>
        <MoreHorizontal size={16} className="text-silver/60" />
      </div>

      {/* Visual Mock (Placeholder/Aura) */}
      <div className="aspect-square relative bg-stellar/40 overflow-hidden flex items-center justify-center bg-gradient-to-br from-void to-graphite">
         <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
         <div className="relative z-10 p-8 text-center space-y-4">
            <div className="h-1 w-8 bg-volt mx-auto rounded-full" />
            <h4 className="text-xl font-black text-silver leading-tight tracking-tighter">Strategic<br />Brief</h4>
            <div className="flex items-center justify-center gap-1">
               {[1,2,3,4,5].map(i => <div key={i} className="h-0.5 w-4 bg-volt/30 rounded-full" />)}
            </div>
         </div>
      </div>

      {/* Action Bar */}
      <div className="p-3 flex items-center justify-between text-silver">
        <div className="flex items-center gap-4">
          <Heart size={22} className="hover:text-danger hover:fill-danger transition-colors cursor-pointer" />
          <MessageCircle size={22} className="hover:text-volt transition-colors cursor-pointer" />
          <Send size={22} className="hover:text-volt transition-colors cursor-pointer" />
        </div>
        <Bookmark size={22} className="hover:text-volt transition-colors cursor-pointer" />
      </div>

      {/* Caption */}
      <div className="px-3 pb-6 space-y-1.5">
        <p className="text-[11px] text-silver font-bold">1,242 likes</p>
        <div className="text-[12px] leading-relaxed text-silver/90">
          <span className="font-bold mr-1.5">lawxy_os</span>
          <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{content}</span>
        </div>
        <p className="text-[10px] text-dim/60 mt-2 uppercase tracking-tight font-bold">View all 42 comments</p>
        <p className="text-[8px] text-dim/40 uppercase tracking-widest mt-1">2 hours ago</p>
      </div>
    </div>
  )
}

function MarkdownText({ text }: { text: string }) {
  const parts = text.split('\n')
  return (
    <div className="space-y-4">
      {parts.map((part, i) => {
        if (part.startsWith('## ')) {
          return <h2 key={i} className="text-2xl font-black text-white mt-8 mb-4 tracking-tight">{part.replace('## ', '')}</h2>
        }
        if (part.startsWith('### ')) {
          return <h3 key={i} className="text-xl font-bold text-white mt-6 mb-3 tracking-tight">{part.replace('### ', '')}</h3>
        }
        if (part.startsWith('#### ')) {
          return <h4 key={i} className="text-lg font-bold text-volt mt-4 mb-2 tracking-tight uppercase tracking-widest">{part.replace('#### ', '')}</h4>
        }
        if (part.startsWith('- ') || part.startsWith('* ')) {
          return <li key={i} className="ml-4 list-disc text-[#E6E2D3]/80 mb-2">{part.substring(2)}</li>
        }
        if (!part.trim()) return <div key={i} className="h-4" />
        
        // Simple bold/italic parsing
        const formattedPart = part
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')

        return (
          <p 
            key={i} 
            className="text-lg leading-relaxed text-[#E6E2D3]/90 font-sans"
            dangerouslySetInnerHTML={{ __html: formattedPart }}
          />
        )
      })}
    </div>
  )
}

function FramerPreview({ content }: { content: string }) {
  let data = null
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      data = JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.error("Framer parse error", e)
  }

  if (!data) {
    return (
      <div className="p-8 border-2 border-dashed border-white/10 rounded-2xl text-center">
        <p className="text-dim text-sm italic">Input valid Framer JSON to see structured preview...</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-[#0a0a0c] text-[#E6E2D3] font-serif shadow-2xl overflow-hidden rounded-2xl border border-white/10">
       <div className="h-10 bg-[#16161a] flex items-center px-4 gap-2 border-b border-white/10">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-sm" />
            <div className="h-3 w-3 rounded-full bg-[#febc2e] shadow-sm" />
            <div className="h-3 w-3 rounded-full bg-[#28c840] shadow-sm" />
          </div>
          <div className="flex-1 mx-4 h-6 bg-white/5 rounded-md flex items-center px-3 border border-white/5">
            <span className="text-[10px] text-white/40 font-sans truncate">lawxy-times.framer.wiki/{data.slug_slug || 'preview'}</span>
          </div>
       </div>

       <div className="p-12 md:p-20 space-y-16">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-px w-8 bg-volt" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-volt">Legislation Intelligence</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-[0.9] text-white max-w-4xl">
               {data.title || 'Untitled Report'}
            </h1>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-16">
             <div className="lg:col-span-3 space-y-12">
                <div className="relative">
                  <div className="absolute -left-8 top-0 bottom-0 w-1 bg-volt rounded-full opacity-50" />
                  <p className="text-2xl font-medium leading-relaxed italic text-white/90">
                    {data.excerpt || 'No excerpt provided.'}
                  </p>
                </div>
                
                <div className="prose-custom">
                   <MarkdownText text={data.body_md || 'No body content.'} />
                </div>
             </div>
             
             <div className="space-y-10 pt-4">
                <div className="p-8 bg-white/5 rounded-3xl border border-white/10 space-y-6 backdrop-blur-md">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-silver/60">Intelligence Data</h4>
                   <div className="space-y-5">
                      <div className="flex flex-col gap-1">
                         <span className="text-[9px] text-white/30 uppercase font-bold">Signal Strength</span>
                         <div className="flex gap-1">
                           {[1,2,3,4,5].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${i <= 4 ? 'bg-volt' : 'bg-white/10'}`} />)}
                         </div>
                      </div>
                      <div className="flex flex-col gap-0.5">
                         <span className="text-[9px] text-white/30 uppercase font-bold">Reading Complexity</span>
                         <span className="text-xs font-bold text-silver">High-Level Strategic</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                         <span className="text-[9px] text-white/30 uppercase font-bold">Publishing Status</span>
                         <Badge variant="success" className="w-fit mt-1">Ready for CMS</Badge>
                      </div>
                   </div>
                </div>

                <div className="flex flex-col gap-2 p-4 border border-white/5 rounded-2xl">
                   <span className="text-[8px] text-white/20 uppercase font-black">Source Authentication</span>
                   <div className="flex items-center gap-2 text-[10px] text-volt truncate font-medium">
                      <ExternalLink size={10} />
                      <span className="truncate">Verified Legal Database</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="pt-16 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-8">
             <div className="flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-volt to-amethyst p-0.5 shadow-glow-volt/20">
                  <div className="w-full h-full rounded-[0.9rem] bg-black flex items-center justify-center text-volt font-black text-xl italic">LX</div>
                </div>
                <div className="flex flex-col">
                   <span className="text-lg font-black text-white tracking-tight">Lawxy Reporter</span>
                   <span className="text-xs text-white/40 font-medium font-sans">Surgical Analytics Division • AI Integrated</span>
                </div>
             </div>
             <div className="flex items-center gap-4">
               <button className="px-5 py-3 rounded-xl border border-white/10 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all">
                 Download JSON
               </button>
               <button className="px-10 py-4 bg-volt text-void font-black rounded-xl text-[11px] uppercase tracking-[0.2em] shadow-glow-volt/30 hover:scale-[1.02] active:scale-[0.98] transition-all">
                 Deploy to Framer
               </button>
             </div>
          </div>
       </div>
    </div>
  )
}

function GenericPreview({ content }: { content: string }) {
  return (
    <div className="w-full max-w-2xl mx-auto rounded-xl border border-white/10 bg-void/20 p-6 font-mono text-xs text-dim shadow-xl">
       <div className="mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
          <div className="h-2 w-2 rounded-full bg-dim/40 animate-pulse" />
          <span className="uppercase tracking-widest text-[10px] font-black">Data Buffer</span>
       </div>
       <p className="whitespace-pre-wrap leading-relaxed opacity-60">
         {content || 'Enter valid protocol content to see preview...'}
       </p>
    </div>
  )
}
