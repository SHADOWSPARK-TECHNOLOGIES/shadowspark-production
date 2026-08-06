"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@ai-sdk/react";

export default function AssistantBubble({ slug }: { slug?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    // Attempt to fetch the appropriate greeting based on browser language on load
    const userLang = navigator.language || navigator.languages?.[0] || 'en';
    if (userLang.toLowerCase().startsWith('yo')) {
      setGreeting("Ẹ káàbọ̀");
    } else if (userLang.toLowerCase().startsWith('ha')) {
      setGreeting("Sannu");
    } else if (userLang.toLowerCase().startsWith('ig')) {
      setGreeting("Nnọọ");
    } else {
      // Defaulting to "Ẹ káàbọ̀" as requested by user override for demonstration
      setGreeting("Ẹ káàbọ̀"); 
    }
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/assistant",
    body: { slug },
  } as any) as any;

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-[380px] h-[550px] bg-[#0A0A0A] border border-zinc-800 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl"
          >
            <div className="p-6 border-b border-zinc-900 flex justify-between items-center bg-zinc-950/50">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-cyan-300 animate-ping' : 'bg-cyan-500'}`} />
                <div>
                  <span className="font-mono text-xs tracking-widest uppercase text-cyan-400 font-bold block">System Assistant</span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Online · Ready</span>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 scroll-smooth">
              {messages.length === 0 && (
                <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 text-sm text-zinc-300 leading-relaxed">
                  {greeting}, I'm the ShadowSpark System Assistant. Ask me about deployment, pricing, or how our infrastructure works.
                </div>
              )}
              {messages.map((m: any) => (
                <div 
                  key={m.id} 
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed border ${
                    m.role === 'user' 
                      ? 'bg-cyan-500/10 border-cyan-500/20 text-white rounded-tr-none' 
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 rounded-tl-none'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex items-center gap-2 justify-start text-zinc-500 text-xs animate-pulse">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  </span>
                  Infrastructure AI is reasoning...
                </div>
              )}
              {error && (
                <div className="text-red-500 text-xs p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  System Error: Neural link interrupted. Please try again.
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-4 bg-zinc-950 border-t border-zinc-900">
              <div className="relative flex items-center">
                <input 
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask about deployment, pricing, or infrastructure..." 
                  className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors pr-12"
                />
                <button 
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-3 text-cyan-500 disabled:text-zinc-700 transition-colors"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 rounded-2xl bg-cyan-500 flex items-center justify-center text-black shadow-[0_0_30px_rgba(0,255,255,0.3)] hover:scale-105 transition-transform active:scale-95 z-[101]"
      >
        {isOpen ? <X className="w-8 h-8" /> : <MessageSquare className="w-8 h-8" />}
      </button>
    </div>
  );
}
