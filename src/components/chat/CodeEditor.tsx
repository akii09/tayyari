"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { CopyIcon, ExpandIcon } from "@/components/icons/Icons";

// Dynamically import Monaco Editor to avoid SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-bg-tertiary rounded-lg">
      <div className="text-text-muted">Loading editor...</div>
    </div>
  ),
});

interface CodeEditorProps {
  initialCode?: string;
  language?: string;
  onChange?: (code: string) => void;
  onInsert?: (code: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  readOnly?: boolean;
  className?: string;
}

const SUPPORTED_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'shell', label: 'Shell' },
];

export function CodeEditor({
  initialCode = "",
  language = "javascript",
  onChange,
  onInsert,
  isExpanded = false,
  onToggleExpand,
  readOnly = false,
  className = ""
}: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Configure Monaco theme
    monaco.editor.defineTheme('dark-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '71717A', fontStyle: 'italic' },
        { token: 'keyword', foreground: '0066FF' },
        { token: 'string', foreground: '00FF88' },
        { token: 'number', foreground: '6366F1' },
      ],
      colors: {
        'editor.background': '#161618',
        'editor.foreground': '#FFFFFF',
        'editor.lineHighlightBackground': '#242428',
        'editor.selectionBackground': '#0066FF33',
        'editorCursor.foreground': '#0066FF',
        'editorLineNumber.foreground': '#71717A',
        'editorLineNumber.activeForeground': '#A1A1AA',
      },
    });
    
    monaco.editor.setTheme('dark-theme');
  };

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || "";
    setCode(newCode);
    onChange?.(newCode);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  const handleInsert = () => {
    onInsert?.(code);
  };

  const height = isExpanded ? "80vh" : "300px";

  return (
    <div className={`glass-card rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="bg-bg-tertiary border border-glass-border rounded px-2 py-1 text-xs text-text-primary"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
          {!readOnly && (
            <span className="text-xs text-text-muted">
              {code.length} characters
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onInsert && (
            <button
              onClick={handleInsert}
              disabled={!code.trim()}
              className="px-3 py-1 text-xs bg-electric-blue text-white rounded hover:bg-electric-blue/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Insert
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-1 text-text-muted hover:text-text-secondary transition-colors"
            title="Copy code"
          >
            <CopyIcon size={14} />
          </button>
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1 text-text-muted hover:text-text-secondary transition-colors"
              title={isExpanded ? "Minimize" : "Expand"}
            >
              <ExpandIcon size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="relative">
        <Editor
          height={height}
          language={selectedLanguage}
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            minimap: { enabled: isExpanded },
            lineNumbers: 'on',
            fontSize: 13,
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", monospace',
            lineHeight: 1.5,
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
            contextmenu: true,
            selectOnLineNumbers: true,
            roundedSelection: false,
            scrollbar: {
              useShadows: false,
              verticalHasArrows: false,
              horizontalHasArrows: false,
              vertical: 'auto',
              horizontal: 'auto',
            },
          }}
        />
      </div>
    </div>
  );
}
