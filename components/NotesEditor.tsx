import React from 'react';

interface NotesEditorProps {
  notes: string;
  onChange: (notes: string) => void;
}

const NotesEditor: React.FC<NotesEditorProps> = ({ notes, onChange }) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0A0A0A]">
      <div className="flex-1 p-6">
        <textarea
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your notes here... agents can see them if you mention @notes."
          className="w-full h-full bg-transparent border-none outline-none resize-none text-[15px] text-white/90 placeholder:text-white/30 leading-relaxed font-sans"
          autoFocus
        />
      </div>
    </div>
  );
};

export default NotesEditor;
