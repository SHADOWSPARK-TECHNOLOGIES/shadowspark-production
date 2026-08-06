import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-12 border-t border-white/10 pt-10 text-2xl font-black tracking-tight text-cyan-100 sm:text-3xl">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 text-xl font-bold tracking-tight text-white">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mt-5 text-base leading-8 text-slate-300 sm:text-[1.05rem]">{children}</p>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-6 rounded-r-2xl border-l-2 border-cyan-300/50 bg-cyan-300/6 px-5 py-4 text-sm leading-7 text-cyan-50">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => <ul className="mt-5 space-y-3 text-slate-300">{children}</ul>,
  ol: ({ children }) => <ol className="mt-5 list-decimal space-y-3 pl-6 text-slate-300">{children}</ol>,
  li: ({ children }) => <li className="ml-5 list-disc pl-2 leading-7 marker:text-cyan-300">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-cyan-300 underline decoration-cyan-300/40 underline-offset-4"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-10 border-white/10" />,
  code: ({
    inline,
    children,
    className,
  }: ComponentPropsWithoutRef<"code"> & { inline?: boolean }) => {
    if (inline) {
      return (
        <code className="rounded-md border border-white/10 bg-slate-900/80 px-1.5 py-1 font-mono text-[0.9em] text-cyan-200">
          {children}
        </code>
      );
    }

    return (
      <code
        className={cn(
          "hljs block overflow-x-auto rounded-[1.4rem] border border-slate-700/60 bg-[#161b22] px-5 py-4 font-mono text-sm leading-7 text-slate-100",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_18px_60px_rgba(2,6,23,0.35)]",
          className
        )}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre className="mt-6 overflow-x-auto">{children}</pre>,
  table: ({ children }) => (
    <div className="mt-8 overflow-x-auto rounded-[1.4rem] border border-white/10 bg-slate-950/50 shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
      <table className="w-full text-left text-sm text-slate-300">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] text-cyan-200">
      {children}
    </thead>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-white/10">{children}</tbody>,
  tr: ({ children }) => <tr className="transition-colors hover:bg-white/2">{children}</tr>,
  th: ({ children }) => (
    <th className="px-5 py-4 font-mono text-[11px] uppercase tracking-[0.2em]">{children}</th>
  ),
  td: ({ children }) => <td className="px-5 py-4 leading-7">{children}</td>,
};

export function BrowserWindowMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="sovereign-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

export default BrowserWindowMarkdown;
