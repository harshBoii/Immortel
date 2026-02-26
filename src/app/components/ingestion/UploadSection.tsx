'use client';

import React, { useCallback, useState } from 'react';
import { Tooltip } from '../common/Tooltip';

type UploadSectionProps = {
  onFilesSelected?: (files: File[]) => void;
  disabled?: boolean;
};

export function UploadSection({ onFilesSelected, disabled }: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type.startsWith('video/') || f.type.startsWith('image/') || f.type.startsWith('application/pdf')
      );
      if (files.length > 0) onFilesSelected?.(files);
    },
    [onFilesSelected, disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length > 0) onFilesSelected?.(files);
      e.target.value = '';
    },
    [onFilesSelected]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        glass-card p-6 rounded-xl border-2 border-dashed transition-all
        ${isDragging ? 'border-primary/50 bg-primary/5' : 'border-[var(--glass-border)]'}
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <label className="flex flex-col items-center justify-center gap-3 cursor-pointer">
        <input
          type="file"
          multiple
          accept="video/*,image/*,application/pdf"
          onChange={handleInputChange}
          disabled={disabled}
          className="sr-only"
        />
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {isDragging ? 'Drop files here' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Videos, images, or PDFs
          </p>
        </div>
        <Tooltip content="Upload video, image, or document files">
          <span className="text-xs text-primary hover:underline">Supported: MP4, WebM, PNG, JPG, PDF</span>
        </Tooltip>
      </label>
    </div>
  );
}
