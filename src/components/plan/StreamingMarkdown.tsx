"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MarkdownIt from "markdown-it";
import mk from "markdown-it-katex";
import mermaid from "mermaid";
import hljs from "highlight.js/lib/common";
import mila from "markdown-it-link-attributes";

type Props = {
  content: string;
  speedMs?: number;
};

export function StreamingMarkdown({ content, speedMs = 8 }: Props) {
  const [shown, setShown] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const md = useMemo(() => {
    const engine = new MarkdownIt({
      html: true,
      linkify: true,
      breaks: true,
      highlight: (str, lang) => {
        let html = str;
        if (lang && hljs.getLanguage(lang)) {
          try {
            html = hljs.highlight(str, { language: lang }).value;
          } catch {}
        }
        // Wrap each line for line numbers
        const lines = html.split("\n").map((l) => `<span class=\"line\">${l || "\u200B"}</span>`).join("\n");
        return `<pre class=\"hljs\"><code class=\"code-lines\">${lines}</code></pre>`;
      },
    });
    engine.use(mk);
    engine.use(mila, { attrs: { target: "_blank", rel: "noopener" } });

    const fence = engine.renderer.rules.fence!;
    engine.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const info = token.info.trim();
      const lang = (info.split(/\s+/)[0] || "text").toLowerCase();
      if (lang === "mermaid") {
        const code = token.content;
        const id = `m-${idx}-${Math.random().toString(36).slice(2)}`;
        return `<div class=\"mermaid\" id=\"${id}\">${code}</div>`;
      }
      const rendered = fence(tokens, idx, options, env, self);
      // Add toolbar and collapse toggle; default collapsed for long blocks (>20 lines)
      const lineCount = token.content.split("\n").length;
      const collapsed = lineCount > 20 ? " collapsed" : "";
      return `<div class=\"code-block relative${collapsed}\"><div class=\"code-toolbar\"><span class=\"lang\">${lang}</span><button data-copy=\"true\">Copy</button></div>${rendered}<button class=\"code-toggle\" data-toggle=\"true\">${collapsed ? "Expand" : "Collapse"}</button></div>`;
    };
    return engine;
  }, []);

  useEffect(() => {
    setShown("");
    
    // Use word-based streaming for smoother animation
    const words = content.split(' ');
    let currentWord = 0;
    
    const id = setInterval(() => {
      if (currentWord >= words.length) {
        setShown(content);
        clearInterval(id);
      } else {
        const partial = words.slice(0, currentWord + 1).join(' ') + (currentWord < words.length - 1 ? ' ' : '');
        setShown(partial);
        currentWord++;
      }
    }, speedMs * 3); // Slower for less flickering
    
    return () => clearInterval(id);
  }, [content, speedMs]);

  useEffect(() => {
    try {
      mermaid.initialize({ startOnLoad: true, theme: "dark" });
      mermaid.contentLoaded();
    } catch {}
  }, [shown]);

  const html = useMemo(() => md.render(shown), [md, shown]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const onClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('button[data-copy="true"]') as HTMLButtonElement | null;
      if (btn) {
        const wrapper = btn.closest(".code-block");
        const code = wrapper?.querySelector("pre > code");
        const text = code?.textContent ?? "";
        try {
          await navigator.clipboard.writeText(text);
          const old = btn.textContent;
          btn.textContent = "Copied";
          setTimeout(() => { if (btn) btn.textContent = old || "Copy"; }, 1200);
        } catch {}
        return;
      }
      const toggle = target.closest('button[data-toggle="true"]') as HTMLButtonElement | null;
      if (toggle) {
        const block = toggle.closest('.code-block') as HTMLElement | null;
        if (block) {
          const isCollapsed = block.classList.toggle('collapsed');
          toggle.textContent = isCollapsed ? 'Expand' : 'Collapse';
        }
      }
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [html]);

  return <div ref={containerRef} className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}


