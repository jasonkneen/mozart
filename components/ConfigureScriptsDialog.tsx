import React, { useState, useEffect } from 'react';
import { Play, Plus, Trash2, Settings, X, Save, Folder } from 'lucide-react';

export interface Script {
  name: string;
  command: string;
  cwd?: string;
  env?: Record<string, string>;
}

interface ConfigureScriptsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (scripts: Script[]) => void;
  initialScripts: Script[];
}

export const ConfigureScriptsDialog: React.FC<ConfigureScriptsDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialScripts
}) => {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      setScripts(JSON.parse(JSON.stringify(initialScripts)));
      if (initialScripts.length > 0) {
        setSelectedIdx(0);
        updateEnvVarsFromScript(initialScripts[0]);
      } else {
        createNewScript();
      }
    }
  }, [isOpen, initialScripts]);

  const updateEnvVarsFromScript = (script: Script) => {
    const env = script.env || {};
    setEnvVars(Object.entries(env).map(([key, value]) => ({ key, value })));
  };

  const createNewScript = () => {
    const newScript: Script = { name: 'New Script', command: '', cwd: '', env: {} };
    setScripts(prev => {
      const updated = [...prev, newScript];
      setSelectedIdx(updated.length - 1);
      setEnvVars([]); 
      return updated;
    });
  };

  const updateScript = (index: number, updates: Partial<Script>) => {
    setScripts(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const deleteScript = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const newScripts = scripts.filter((_, i) => i !== index);
    setScripts(newScripts);
    
    if (selectedIdx === index) {
      setSelectedIdx(null);
      setEnvVars([]);
    } else if (selectedIdx !== null && index < selectedIdx) {
      setSelectedIdx(selectedIdx - 1);
    }
  };

  const handleEnvChange = (index: number, field: 'key' | 'value', value: string) => {
    if (selectedIdx === null) return;

    const newEnvVars = [...envVars];
    newEnvVars[index] = { ...newEnvVars[index], [field]: value };
    setEnvVars(newEnvVars);

    const envObj: Record<string, string> = {};
    newEnvVars.forEach(item => {
      if (item.key) envObj[item.key] = item.value;
    });
    
    setScripts(prev => {
      const next = [...prev];
      next[selectedIdx] = { ...next[selectedIdx], env: envObj };
      return next;
    });
  };

  const addEnvVar = () => {
    if (selectedIdx === null) return;
    setEnvVars(prev => [...prev, { key: '', value: '' }]);
  };

  const removeEnvVar = (index: number) => {
    if (selectedIdx === null) return;
    
    const newEnvVars = envVars.filter((_, i) => i !== index);
    setEnvVars(newEnvVars);
    
    const envObj: Record<string, string> = {};
    newEnvVars.forEach(item => {
      if (item.key) envObj[item.key] = item.value;
    });
    
    setScripts(prev => {
      const next = [...prev];
      next[selectedIdx] = { ...next[selectedIdx], env: envObj };
      return next;
    });
  };

  const handleSaveAll = () => {
    onSave(scripts);
    onClose();
  };

  const handleScriptSelect = (idx: number) => {
    setSelectedIdx(idx);
    if (scripts[idx]) {
      updateEnvVarsFromScript(scripts[idx]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl w-[800px] h-[600px] flex flex-col overflow-hidden text-zinc-100 font-sans">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-zinc-400" />
            <h2 className="text-lg font-medium text-zinc-100">Configure Scripts</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-zinc-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-900/30">
            <div className="p-2 border-b border-zinc-800 flex justify-between items-center">
              <span className="text-xs font-medium text-zinc-500 uppercase px-2">Scripts</span>
              <button 
                onClick={createNewScript}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
                title="Add Script"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {scripts.map((script, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleScriptSelect(idx)}
                  className={`
                    group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm transition-all
                    ${selectedIdx === idx 
                      ? 'bg-zinc-800 text-zinc-100 font-medium' 
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}
                  `}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Play className="w-3 h-3 opacity-50" />
                    <span className="truncate">{script.name || 'Untitled'}</span>
                  </div>
                  <button
                    onClick={(e) => deleteScript(e, idx)}
                    className={`
                      opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-red-400 transition-all
                      ${selectedIdx === idx ? 'opacity-100' : ''}
                    `}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              
              {scripts.length === 0 && (
                <div className="px-4 py-8 text-center text-zinc-600 text-sm italic">
                  No scripts configured
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-zinc-950/30">
            {selectedIdx !== null && scripts[selectedIdx] ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase">Name</label>
                  <input
                    type="text"
                    value={scripts[selectedIdx].name}
                    onChange={(e) => updateScript(selectedIdx, { name: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-colors placeholder-zinc-700"
                    placeholder="e.g. Build Production"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase">Command</label>
                  <div className="relative">
                    <div className="absolute top-2.5 left-3 text-zinc-600">
                      <Play className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={scripts[selectedIdx].command}
                      onChange={(e) => updateScript(selectedIdx, { command: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded pl-10 pr-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-colors placeholder-zinc-700"
                      placeholder="npm run build"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase">Working Directory</label>
                  <div className="relative">
                    <div className="absolute top-2.5 left-3 text-zinc-600">
                      <Folder className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={scripts[selectedIdx].cwd || ''}
                      onChange={(e) => updateScript(selectedIdx, { cwd: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded pl-10 pr-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-colors placeholder-zinc-700"
                      placeholder="${workspaceFolder}"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-500 uppercase">Environment Variables</label>
                    <button 
                      onClick={addEnvVar}
                      className="text-xs flex items-center gap-1 text-zinc-400 hover:text-zinc-100 transition-colors px-2 py-1 rounded hover:bg-zinc-800"
                    >
                      <Plus className="w-3 h-3" /> Add Variable
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {envVars.length === 0 ? (
                      <div className="text-center py-4 border border-dashed border-zinc-800 rounded text-zinc-600 text-sm">
                        No environment variables set
                      </div>
                    ) : (
                      envVars.map((env, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={env.key}
                            onChange={(e) => handleEnvChange(i, 'key', e.target.value)}
                            placeholder="KEY"
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-zinc-700 placeholder-zinc-700"
                          />
                          <span className="text-zinc-600">=</span>
                          <input
                            type="text"
                            value={env.value}
                            onChange={(e) => handleEnvChange(i, 'value', e.target.value)}
                            placeholder="VALUE"
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-zinc-700 placeholder-zinc-700"
                          />
                          <button
                            onClick={() => removeEnvVar(i)}
                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
                <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                  <Settings className="w-8 h-8 opacity-50" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-zinc-400">No Script Selected</p>
                  <p className="text-sm">Select a script from the sidebar or create a new one.</p>
                </div>
                <button
                  onClick={createNewScript}
                  className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Create Script
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors rounded hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAll}
            className="px-4 py-2 bg-zinc-100 text-zinc-900 text-sm font-medium rounded hover:bg-zinc-200 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
