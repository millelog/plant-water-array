import React, { useState, useRef, useEffect } from 'react';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  placeholder?: string;
}

const InlineEdit: React.FC<InlineEditProps> = ({ value, onSave, className = '', placeholder = 'Click to edit' }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleSave = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`bg-canvas-100 border border-accent/30 rounded-lg px-2 py-0.5 text-text outline-none focus:border-accent/60 ${className}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-pointer hover:text-accent transition-colors border-b border-dashed border-transparent hover:border-accent/30 ${className}`}
      title="Click to rename"
    >
      {value || <span className="text-text-muted italic">{placeholder}</span>}
    </span>
  );
};

export default InlineEdit;
