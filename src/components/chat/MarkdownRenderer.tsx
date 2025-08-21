"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useState } from 'react';
import { CopyIcon } from '@/components/icons/Icons';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          // Custom code block component
          code({ node, className, children, ...props }: any) {
            const inline = props.inline;
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            return !inline && match ? (
              <CodeBlock
                language={language}
                code={String(children).replace(/\n$/, '')}
              />
            ) : (
              <code
                className="bg-gray-800/50 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-700/50"
                {...props}
              >
                {children}
              </code>
            );
          },
          // Custom heading components
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-white mt-6 mb-4 border-b border-gray-700 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-white mt-6 mb-3 border-b border-gray-700/50 pb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-gray-100 mt-5 mb-3">
              {children}
            </h3>
          ),
          // Custom list components
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-4 text-gray-200">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-4 text-gray-200">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-200 leading-relaxed">
              {children}
            </li>
          ),
          // Custom blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-gray-800/30 rounded-r">
              <div className="text-gray-300 italic">
                {children}
              </div>
            </blockquote>
          ),
          // Custom table
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-gray-700 rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-800">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-gray-200 font-semibold border-b border-gray-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-gray-300 border-b border-gray-700/50">
              {children}
            </td>
          ),
          // Custom links
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-400 hover:text-blue-300 underline transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          // Custom paragraph
          p: ({ children }) => (
            <p className="text-gray-200 leading-relaxed mb-4">
              {children}
            </p>
          ),
          // Custom strong/bold
          strong: ({ children }) => (
            <strong className="font-semibold text-white">
              {children}
            </strong>
          ),
          // Custom emphasis/italic
          em: ({ children }) => (
            <em className="italic text-gray-300">
              {children}
            </em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Separate CodeBlock component for better performance
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="relative group my-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-gray-700">
        <span className="text-xs font-mono text-gray-400">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
          title="Copy code"
        >
          <CopyIcon size={12} />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Code content */}
      <div className="bg-gray-900 overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '16px',
            background: 'transparent',
            fontSize: '14px',
            lineHeight: '1.5',
          }}
          wrapLongLines={false}
          showLineNumbers={code.split('\n').length > 5}
          lineNumberStyle={{
            color: '#6b7280',
            fontSize: '12px',
            marginRight: '16px',
            userSelect: 'none',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

// CSS for syntax highlighting (add to globals.css)
export const markdownStyles = `
/* Markdown prose styling */
.prose {
  color: #e5e5e5;
  max-width: none;
}

.prose strong {
  color: #ffffff;
  font-weight: 600;
}

.prose code {
  color: #93c5fd;
  font-size: 0.875em;
}

.prose pre {
  background-color: #111827;
  color: #e5e5e5;
  border-radius: 8px;
  border: 1px solid #374151;
}

.prose pre code {
  background-color: transparent;
  color: inherit;
  font-size: 0.875em;
  font-weight: 400;
}

/* Custom scrollbar for code blocks */
.prose pre::-webkit-scrollbar {
  height: 8px;
}

.prose pre::-webkit-scrollbar-track {
  background: #1f2937;
  border-radius: 4px;
}

.prose pre::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 4px;
}

.prose pre::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
`;
