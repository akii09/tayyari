"use client";

import { useState, useRef, useCallback } from "react";
import { UploadIcon, FileIcon, ImageIcon } from "@/components/icons/Icons";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  className?: string;
}

interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
}

export function FileUpload({
  onFilesSelected,
  maxFiles = 5,
  maxFileSize = 10,
  acceptedTypes = ['image/*', '.pdf', '.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.py', '.json'],
  className = ""
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File ${file.name} is too large. Maximum size is ${maxFileSize}MB.`;
    }
    
    const isTypeAccepted = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      } else if (type.includes('/*')) {
        return file.type.startsWith(type.replace('/*', ''));
      } else {
        return file.type === type;
      }
    });

    if (!isTypeAccepted) {
      return `File type ${file.type || 'unknown'} is not supported.`;
    }

    return null;
  };

  const processFiles = useCallback((files: FileList) => {
    setError(null);
    const newFiles: UploadedFile[] = [];
    const validFiles: File[] = [];

    Array.from(files).forEach(file => {
      if (uploadedFiles.length + newFiles.length >= maxFiles) {
        setError(`Maximum ${maxFiles} files allowed.`);
        return;
      }

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      const id = Math.random().toString(36).substr(2, 9);
      const uploadedFile: UploadedFile = { file, id };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          uploadedFile.preview = e.target?.result as string;
          setUploadedFiles(prev => 
            prev.map(f => f.id === id ? uploadedFile : f)
          );
        };
        reader.readAsDataURL(file);
      }

      newFiles.push(uploadedFile);
      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...newFiles]);
      onFilesSelected(validFiles);
    }
  }, [uploadedFiles.length, maxFiles, maxFileSize, acceptedTypes, onFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
    setError(null);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon size={16} className="text-blue-400" />;
    }
    return <FileIcon size={16} className="text-text-secondary" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        className={`
          relative glass-card border border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-all duration-200 hover:border-electric-blue/50
          ${isDragging ? 'border-electric-blue bg-electric-blue/5' : 'border-white/10'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          accept={acceptedTypes.join(',')}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-3">
          <div className={`
            p-3 rounded-full transition-colors
            ${isDragging ? 'bg-electric-blue/20' : 'bg-white/5'}
          `}>
            <UploadIcon 
              size={24} 
              className={isDragging ? 'text-electric-blue' : 'text-text-secondary'} 
            />
          </div>
          
          <div>
            <p className="text-sm font-medium text-text-primary">
              {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-text-muted mt-1">
              Up to {maxFiles} files, max {maxFileSize}MB each
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-card border-red-500/20 bg-red-500/5 p-3 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-text-secondary">
            Uploaded Files ({uploadedFiles.length})
          </h4>
          <div className="space-y-2">
            {uploadedFiles.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="glass-card p-3 rounded-lg flex items-center gap-3"
              >
                {uploadedFile.preview ? (
                  <img
                    src={uploadedFile.preview}
                    alt={uploadedFile.file.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                ) : (
                  <div className="w-10 h-10 glass-card rounded flex items-center justify-center">
                    {getFileIcon(uploadedFile.file)}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>
                </div>
                
                <button
                  onClick={() => removeFile(uploadedFile.id)}
                  className="text-text-muted hover:text-red-400 transition-colors p-1"
                  title="Remove file"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
