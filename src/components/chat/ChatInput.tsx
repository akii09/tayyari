"use client";

import { useState, useRef, useCallback } from "react";
import { SendIcon, AttachIcon, CodeIcon, MicIcon } from "@/components/icons/Icons";
import { FileUpload } from "./FileUpload";
import { CodeEditor } from "./CodeEditor";

interface ChatInputProps {
  onSendMessage?: (message: string, files?: File[], code?: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({ 
  onSendMessage, 
  isLoading = false,
  placeholder = "Type your request…" 
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [editorCode, setEditorCode] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileUploadRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!message.trim() && selectedFiles.length === 0 && !editorCode.trim()) return;
    
    onSendMessage?.(
      message.trim(), 
      selectedFiles.length > 0 ? selectedFiles : undefined,
      editorCode.trim() || undefined
    );
    
    // Reset form
    setMessage("");
    setSelectedFiles([]);
    setEditorCode("");
    setShowFileUpload(false);
    setShowCodeEditor(false);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleCodeChange = (code: string) => {
    setEditorCode(code);
  };

  const handleCodeInsert = (code: string) => {
    const insertText = `\n\`\`\`\n${code}\n\`\`\`\n`;
    setMessage(prev => prev + insertText);
    setShowCodeEditor(false);
    setEditorCode("");
    textareaRef.current?.focus();
    adjustTextareaHeight();
  };

  const toggleVoiceRecording = () => {
    setIsRecording(!isRecording);
    // Voice recording implementation would go here
  };

  const canSubmit = message.trim() || selectedFiles.length > 0 || editorCode.trim();

  return (
    <div className="sticky bottom-0 bg-bg-primary/95 backdrop-blur-sm p-4">
      <div className="mx-auto max-w-4xl space-y-4">
        {/* File Upload Section */}
        {showFileUpload && (
          <div ref={fileUploadRef}>
            <FileUpload
              onFilesSelected={handleFilesSelected}
              maxFiles={10}
              maxFileSize={25}
            />
          </div>
        )}

        {/* Code Editor Section */}
        {showCodeEditor && (
          <CodeEditor
            initialCode={editorCode}
            onChange={handleCodeChange}
            onInsert={handleCodeInsert}
          />
        )}

        {/* Main Input Area */}
        <div className="glass-card">
          <div className="flex items-end gap-3 p-3">
            {/* Textarea */}
            <div className="flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={1}
                disabled={isLoading}
                className="w-full resize-none bg-transparent outline-none placeholder:text-text-muted text-text-primary text-sm leading-relaxed max-h-40 min-h-[20px]"
              />
              
              {/* File/Code Attachments Preview */}
              {(selectedFiles.length > 0 || editorCode.trim()) && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                  {selectedFiles.length > 0 && (
                    <span className="text-xs text-text-muted bg-electric-blue/10 px-2 py-1 rounded">
                      {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} attached
                    </span>
                  )}
                  {editorCode.trim() && (
                    <span className="text-xs text-text-muted bg-neon-green/10 px-2 py-1 rounded">
                      Code snippet ready
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowFileUpload(!showFileUpload)}
                className={`interactive glass-card p-2 rounded-lg transition-colors ${
                  showFileUpload ? 'bg-electric-blue/20 text-electric-blue' : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Attach files"
                disabled={isLoading}
              >
                <AttachIcon size={18} />
              </button>

              <button
                type="button"
                onClick={() => setShowCodeEditor(!showCodeEditor)}
                className={`interactive glass-card p-2 rounded-lg transition-colors ${
                  showCodeEditor ? 'bg-neon-green/20 text-neon-green' : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Code editor"
                disabled={isLoading}
              >
                <CodeIcon size={18} />
              </button>

              <button
                type="button"
                onClick={toggleVoiceRecording}
                className={`interactive glass-card p-2 rounded-lg transition-colors ${
                  isRecording ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-text-secondary hover:text-text-primary'
                }`}
                title={isRecording ? "Stop recording" : "Voice input"}
                disabled={isLoading}
              >
                <MicIcon size={18} />
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || isLoading}
                className={`p-2 rounded-lg font-medium transition-all ${
                  canSubmit && !isLoading
                    ? 'gradient-primary text-white hover:scale-105 active:scale-95'
                    : 'bg-bg-tertiary text-text-muted cursor-not-allowed'
                }`}
                title="Send message"
              >
                {isLoading ? (
                  <div className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <SendIcon size={18} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>Quick actions:</span>
          <button 
            className="hover:text-text-secondary transition-colors"
            onClick={() => setMessage("/help")}
          >
            /help
          </button>
          <button 
            className="hover:text-text-secondary transition-colors"
            onClick={() => setMessage("/explain ")}
          >
            /explain
          </button>
          <button 
            className="hover:text-text-secondary transition-colors"
            onClick={() => setMessage("/review ")}
          >
            /review
          </button>
          <span className="text-text-muted/50">•</span>
          <span>Press ⌘ + Enter to send</span>
        </div>
      </div>
    </div>
  );
}


