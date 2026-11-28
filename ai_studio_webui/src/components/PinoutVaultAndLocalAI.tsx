import React, { useState, useEffect, useRef } from 'react';
import {
  ImagePlus,
  FileText,
  Brain,
  Search,
  RefreshCw,
  Trash2,
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Check,
  Copy,
  Pin,
  Upload,
  AlertTriangle,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import {
  VaultItem,
  CustomConsoleTarget,
  LocalLlmStatus,
  OrganizedDocData,
  parsePinoutDocDeterministic,
  searchVaultDeterministic,
  probeBrowserDirectOllama,
  callBrowserDirectOllamaOrganize,
  callBrowserDirectOllamaResearch,
} from '../utils/localPinoutParser';
import { BookReaderModal, BookReaderTarget } from './BookReaderModal';

export interface ConsoleTargetOption {
  id: string;
  label: string;
  isCustom?: boolean;
}

interface PinoutVaultAndLocalAIProps {
  activeTarget: string;
  builtInTargets: ConsoleTargetOption[];
  customTargets: CustomConsoleTarget[];
  items: VaultItem[];
  loading: boolean;
  onRefreshVault: () => Promise<void>;
  onSelectTarget: (targetId: string) => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Failed reading ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Failed reading ${file.name}`));
    reader.readAsText(file);
  });
}

export const PinoutVaultAndLocalAI: React.FC<PinoutVaultAndLocalAIProps> = ({
  activeTarget,
  builtInTargets,
  customTargets,
  items,
  loading,
  onRefreshVault,
  onSelectTarget,
}) => {
  const [vaultView, setVaultView] = useState<'library' | 'upload' | 'research'>('library');
  const [filterTarget, setFilterTarget] = useState<string>('active');
  const [librarySearch, setLibrarySearch] = useState('');

  // Upload / Add Photo & Doc Form State
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState<string>(activeTarget);
  const [newBoardRev, setNewBoardRev] = useState('');
  const [newTagsText, setNewTagsText] = useState('');
  const [newDocText, setNewDocText] = useState('');
  const [pendingFiles, setPendingFiles] = useState<
    Array<{ file: File; previewUrl?: string; dataUrl: string; extractedText: string }>
  >([]);
  const [runAutoOrganizeOnSave, setRunAutoOrganizeOnSave] = useState(true);
  const [savingItem, setSavingItem] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Add Custom Console Target
  const [showAddTarget, setShowAddTarget] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customVoltage, setCustomVoltage] = useState('Verify 1.8V / 3.3V');
  const [customNotes, setCustomNotes] = useState('');
  const [addingTarget, setAddingTarget] = useState(false);

  // Local Small Model State
  const [transportMode, setTransportMode] = useState<'server' | 'browser_direct'>('server');
  const [llmBaseUrl, setLlmBaseUrl] = useState('http://127.0.0.1:11434');
  const [llmStatus, setLlmStatus] = useState<LocalLlmStatus | null>(null);
  const [selectedModel, setSelectedModel] = useState('qwen2.5:3b');
  const [checkingLlm, setCheckingLlm] = useState(false);
  const [analyzingItemId, setAnalyzingItemId] = useState<string | null>(null);
  const [copiedCmdId, setCopiedCmdId] = useState<string | null>(null);

  // Research Query State
  const [researchQuery, setResearchQuery] = useState('');
  const [researchScope, setResearchScope] = useState<string>('all');
  const [researchBusy, setResearchBusy] = useState(false);
  const [researchAnswer, setResearchAnswer] = useState<{
    mode: 'llm' | 'deterministic';
    modelUsed: string;
    answer: string;
    citations: Array<{ id: string; title: string; consoleTarget: string; boardRev: string; snippet?: string }>;
  } | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);

  // Macro Photo Lightbox Zoom State
  const [lightboxItem, setLightboxItem] = useState<VaultItem | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  // Full-Contents Open-Book Reader & Training Corpus Modal State
  const [bookTarget, setBookTarget] = useState<BookReaderTarget | null>(null);
  const [bookInitialTab, setBookInitialTab] = useState<'read' | 'plates' | 'train'>('read');

  useEffect(() => {
    setNewTarget(activeTarget);
  }, [activeTarget]);

  const allTargets: ConsoleTargetOption[] = [
    ...builtInTargets,
    ...customTargets.map((c) => ({ id: c.id, label: c.label, isCustom: true })),
  ];

  const probeLocalLlm = async (overrideMode?: 'server' | 'browser_direct') => {
    const mode = overrideMode || transportMode;
    setCheckingLlm(true);
    try {
      if (mode === 'browser_direct') {
        const directStatus = await probeBrowserDirectOllama(llmBaseUrl);
        setLlmStatus(directStatus);
        if (directStatus.models.length > 0 && !directStatus.models.some((m) => m.name === selectedModel)) {
          setSelectedModel(directStatus.models[0].name);
        }
      } else {
        const resp = await fetch(`/api/local-llm/status?baseUrl=${encodeURIComponent(llmBaseUrl)}`);
        const data = await resp.json();
        setLlmStatus(data);
        if (Array.isArray(data.models) && data.models.length > 0) {
          const hasCur = data.models.some((m: any) => m.name === selectedModel);
          if (!hasCur) setSelectedModel(data.models[0].name);
        }
      }
    } catch (err: any) {
      setLlmStatus({
        reachable: false,
        provider: null,
        baseUrl: llmBaseUrl,
        isCloudContainer: false,
        binaries: { ollama: false, llamaServer: false, llamaCli: false },
        models: [],
        recommendedModels: [],
        error: err?.message || 'Status probe failed',
      });
    } finally {
      setCheckingLlm(false);
    }
  };

  useEffect(() => {
    probeLocalLlm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);
    const loaded: Array<{ file: File; previewUrl?: string; dataUrl: string; extractedText: string }> = [];

    for (const file of Array.from(fileList)) {
      try {
        const dataUrl = await fileToDataUrl(file);
        const isImg = file.type.startsWith('image/');
        const isText =
          file.type.startsWith('text/') ||
          /\.(md|txt|json|csv|tsv|log|ini|yaml|yml|c|h|cpp|py|ts|xml)$/i.test(file.name);
        const extractedText = isText ? (await fileToText(file)).slice(0, 2500000) : '';
        loaded.push({
          file,
          previewUrl: isImg ? dataUrl : undefined,
          dataUrl,
          extractedText,
        });
      } catch (err: any) {
        setUploadError(err?.message || `Could not read ${file.name}`);
      }
    }

    setPendingFiles((prev) => [...prev, ...loaded]);
    if (!newTitle.trim() && loaded.length === 1) {
      setNewTitle(loaded[0].file.name.replace(/\.[^.]+$/, ''));
    }
  };

  const organizeViaConfiguredEngine = async (params: {
    itemId?: string;
    title: string;
    docText: string;
    consoleTarget: string;
    boardRev: string;
    imageBase64s?: string[];
  }): Promise<{ organized: OrganizedDocData; suggestedTags: string[] }> => {
    if (llmStatus?.reachable) {
      if (transportMode === 'browser_direct') {
        return await callBrowserDirectOllamaOrganize({
          baseUrl: llmBaseUrl,
          model: selectedModel,
          title: params.title,
          docText: params.docText,
          consoleTarget: params.consoleTarget,
          boardRev: params.boardRev,
          imageBase64s: params.imageBase64s,
        });
      }
      const resp = await fetch('/api/local-llm/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: params.itemId,
          title: params.title,
          docText: params.docText,
          consoleTarget: params.consoleTarget,
          boardRev: params.boardRev,
          baseUrl: llmBaseUrl,
          model: selectedModel,
          provider: llmStatus.provider || 'ollama',
          saveToVault: Boolean(params.itemId),
          imageBase64s: params.imageBase64s,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.ok && data.organized) {
        return { organized: data.organized, suggestedTags: data.suggestedTags || [] };
      }
    }

    // Honest deterministic fallback when no local LLM server is active
    return parsePinoutDocDeterministic(params.title, params.docText, params.boardRev);
  };

  const handleSaveToVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadNotice(null);

    if (pendingFiles.length === 0 && !newDocText.trim()) {
      setUploadError('Attach at least one board photo/doc file or paste pinout notes.');
      return;
    }

    setSavingItem(true);
    try {
      const manualTags = newTagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (pendingFiles.length > 0) {
        let savedCount = 0;
        for (const pf of pendingFiles) {
          const combinedText = [newDocText.trim(), pf.extractedText.trim()].filter(Boolean).join('\n\n');
          const itemTitle =
            pendingFiles.length === 1 && newTitle.trim()
              ? newTitle.trim()
              : `${newTitle.trim() ? `${newTitle.trim()} · ` : ''}${pf.file.name}`;

          let organized: OrganizedDocData | null = null;
          let extraTags: string[] = [];

          if (runAutoOrganizeOnSave) {
            const res = await organizeViaConfiguredEngine({
              title: itemTitle,
              docText: combinedText,
              consoleTarget: newTarget,
              boardRev: newBoardRev,
              imageBase64s: pf.previewUrl ? [pf.dataUrl] : [],
            });
            organized = res.organized;
            extraTags = res.suggestedTags;
          }

          const resp = await fetch('/api/pinout-vault/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: itemTitle,
              consoleTarget: newTarget,
              boardRev: newBoardRev || organized?.boardRev || '',
              filename: pf.file.name,
              mimeType: pf.file.type || undefined,
              dataBase64: pf.dataUrl,
              contentText: combinedText,
              tags: Array.from(new Set([...manualTags, ...extraTags])),
              pinnedToGuide: true,
              organized,
            }),
          });
          const data = await resp.json();
          if (!resp.ok || !data.ok) {
            throw new Error(data.error || `Failed saving ${pf.file.name}`);
          }
          savedCount++;
        }
        setUploadNotice(`Saved ${savedCount} item(s) to Pinout Vault.`);
      } else {
        let organized: OrganizedDocData | null = null;
        let extraTags: string[] = [];
        const docTitle = newTitle.trim() || 'Bench Pinout Note';

        if (runAutoOrganizeOnSave) {
          const res = await organizeViaConfiguredEngine({
            title: docTitle,
            docText: newDocText.trim(),
            consoleTarget: newTarget,
            boardRev: newBoardRev,
          });
          organized = res.organized;
          extraTags = res.suggestedTags;
        }

        const resp = await fetch('/api/pinout-vault/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: docTitle,
            consoleTarget: newTarget,
            boardRev: newBoardRev || organized?.boardRev || '',
            kind: 'doc',
            contentText: newDocText.trim(),
            tags: Array.from(new Set([...manualTags, ...extraTags])),
            pinnedToGuide: true,
            organized,
          }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
          throw new Error(data.error || 'Failed saving note');
        }
        setUploadNotice(`Saved "${data.item.title}" to Pinout Vault.`);
      }

      setNewTitle('');
      setNewBoardRev('');
      setNewTagsText('');
      setNewDocText('');
      setPendingFiles([]);
      await onRefreshVault();
      setVaultView('library');
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed');
    } finally {
      setSavingItem(false);
    }
  };

  const handleAnalyzeExistingItem = async (item: VaultItem) => {
    setAnalyzingItemId(item.id);
    try {
      let imageBase64s: string[] = [];
      if (transportMode === 'browser_direct' && item.assetUrl && item.mimeType?.startsWith('image/')) {
        const imgResp = await fetch(item.assetUrl);
        const blob = await imgResp.blob();
        const b64 = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result || ''));
          r.readAsDataURL(blob);
        });
        if (b64) imageBase64s = [b64];
      }

      const res = await organizeViaConfiguredEngine({
        itemId: transportMode === 'server' ? item.id : undefined,
        title: item.title,
        docText: item.contentText,
        consoleTarget: item.consoleTarget,
        boardRev: item.boardRev,
        imageBase64s,
      });

      // Persist client/direct or deterministic results back to vault
      if (transportMode !== 'server' || !llmStatus?.reachable) {
        await fetch(`/api/pinout-vault/items/${encodeURIComponent(item.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organized: res.organized,
            boardRev: item.boardRev || res.organized.boardRev || '',
            tags: Array.from(new Set([...item.tags, ...res.suggestedTags])),
          }),
        });
      }
      await onRefreshVault();
    } catch (err: any) {
      setUploadError(err?.message || 'Analysis failed');
    } finally {
      setAnalyzingItemId(null);
    }
  };

  const handleTogglePin = async (item: VaultItem) => {
    await fetch(`/api/pinout-vault/items/${encodeURIComponent(item.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinnedToGuide: !item.pinnedToGuide }),
    });
    await onRefreshVault();
  };

  const handleDeleteItem = async (item: VaultItem) => {
    await fetch(`/api/pinout-vault/items/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
    if (lightboxItem?.id === item.id) setLightboxItem(null);
    await onRefreshVault();
  };

  const handleCreateCustomTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLabel.trim()) return;
    setAddingTarget(true);
    try {
      const resp = await fetch('/api/pinout-vault/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: customLabel.trim(),
          logicVoltage: customVoltage.trim(),
          busNotes: customNotes.trim(),
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.ok && data.target) {
        setCustomLabel('');
        setCustomNotes('');
        setShowAddTarget(false);
        await onRefreshVault();
        onSelectTarget(data.target.id);
        setNewTarget(data.target.id);
      }
    } finally {
      setAddingTarget(false);
    }
  };

  const handleRunResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!researchQuery.trim()) return;
    setResearchBusy(true);
    setResearchError(null);
    try {
      if (llmStatus?.reachable) {
        if (transportMode === 'browser_direct') {
          const directRes = await callBrowserDirectOllamaResearch({
            baseUrl: llmBaseUrl,
            model: selectedModel,
            query: researchQuery.trim(),
            items,
            consoleTarget: researchScope,
          });
          setResearchAnswer({
            mode: 'llm',
            modelUsed: `ollama-direct:${selectedModel}`,
            answer: directRes.answer,
            citations: directRes.citations,
          });
          return;
        }

        const resp = await fetch('/api/local-llm/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: researchQuery.trim(),
            consoleTarget: researchScope,
            baseUrl: llmBaseUrl,
            model: selectedModel,
            provider: llmStatus.provider || 'ollama',
          }),
        });
        const data = await resp.json();
        if (resp.ok && data.ok) {
          setResearchAnswer({
            mode: 'llm',
            modelUsed: data.modelUsed,
            answer: data.answer,
            citations: data.citations || [],
          });
          return;
        }
        setResearchError(data.error || 'Local model query failed; showing deterministic vault search results.');
      }

      // Honest deterministic vault search when no LLM daemon is running
      const hits = searchVaultDeterministic(researchQuery.trim(), items, researchScope);
      setResearchAnswer({
        mode: 'deterministic',
        modelUsed: 'deterministic-bm25-indexer (no LLM daemon)',
        answer:
          hits.length > 0
            ? `Found ${hits.length} matching bench doc(s)/photo(s) in your Vault. Start Ollama locally (ollama serve && ollama pull ${selectedModel}) to synthesize cross-doc comparisons and read macro photos.`
            : 'No matching saved docs or notes in your Vault for that query yet. Upload board photos or pinout docs first.',
        citations: hits.slice(0, 6).map((h) => ({
          id: h.item.id,
          title: h.item.title,
          consoleTarget: h.item.consoleTarget,
          boardRev: h.item.boardRev,
          snippet: h.snippet,
        })),
      });
    } catch (err: any) {
      setResearchError(err?.message || 'Research failed');
    } finally {
      setResearchBusy(false);
    }
  };

  const copyCommand = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmdId(id);
    setTimeout(() => setCopiedCmdId(null), 1500);
  };

  const filteredItems = items.filter((item) => {
    if (filterTarget === 'active' && item.consoleTarget !== activeTarget) return false;
    if (filterTarget !== 'active' && filterTarget !== 'all' && item.consoleTarget !== filterTarget) return false;
    if (!librarySearch.trim()) return true;
    const q = librarySearch.toLowerCase();
    const hay = [
      item.title,
      item.boardRev,
      item.consoleTarget,
      item.tags.join(' '),
      item.contentText,
      item.organized?.summary || '',
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });

  const targetLabelFor = (id: string) => allTargets.find((t) => t.id === id)?.label || id;

  return (
    <div className="space-y-4 pt-4 border-t border-[#1b2332]">
      {/* Section Header + Vault View Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-400" />
            <span>Bench Photos, Docs Vault &amp; Small Local Model Organizer</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Attach macro board photos, schematics, and notes for any console revision. Connect Ollama or llama.cpp locally to extract structured pinouts and search across your bench archive.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 bg-[#07090e] p-1 rounded-lg border border-[#1b2332]">
            <button
              type="button"
              onClick={() => setVaultView('library')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                vaultView === 'library' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Photos &amp; Docs ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setVaultView('upload')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
                vaultView === 'upload' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Add Photo / Doc</span>
            </button>
            <button
              type="button"
              onClick={() => setVaultView('research')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
                vaultView === 'research' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Research &amp; Organize</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              const compiled = items
                .map(
                  (it, idx) =>
                    `# Chapter ${idx + 1}: ${it.title}\nTarget: ${targetLabelFor(it.consoleTarget)}${
                      it.boardRev ? ` · Rev: ${it.boardRev}` : ''
                    }\n\n${it.contentText || it.organized?.summary || '(No text content)'}`
                )
                .join('\n\n\f\n\n');
              setBookInitialTab('read');
              setBookTarget({
                id: 'vault-archive-book',
                title: 'Pinout Vault & Bench Archive Compendium',
                subtitle: `${items.length} saved doc(s) & photo(s)`,
                content: compiled,
                sourceKind: 'corpus',
              });
            }}
            className="px-3 py-1.5 rounded-lg bg-[#07090e] border border-[#232d40] hover:border-blue-500 text-blue-300 text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Open All as Book</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const compiled = items
                .map(
                  (it, idx) =>
                    `# ${idx + 1}. ${it.title}\n\n${it.contentText || it.organized?.summary || ''}`
                )
                .join('\n\n');
              setBookInitialTab('train');
              setBookTarget({
                id: 'vault-train-corpus',
                title: 'Vault & Host Corpus Trainer',
                subtitle: `${items.length} vault doc(s) indexed`,
                content: compiled,
                sourceKind: 'corpus',
              });
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Train Corpus (.jsonl)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddTarget((v) => !v)}
            className="px-3 py-1.5 rounded-lg bg-[#07090e] border border-[#232d40] hover:border-blue-500 text-slate-200 text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Console Target</span>
          </button>
        </div>
      </div>

      {/* Add Custom Console Target Drawer */}
      {showAddTarget && (
        <form
          onSubmit={handleCreateCustomTarget}
          className="bg-[#07090e] border border-[#1b2332] rounded-lg p-3.5 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end"
        >
          <div className="md:col-span-4">
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Console / Board Name
            </label>
            <input
              type="text"
              required
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g. Xbox 360 Trinity / Steam Deck OLED"
              className="w-full px-2.5 py-1.5 rounded bg-[#0d1117] border border-[#232d40] text-slate-100 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Logic Voltage Domain
            </label>
            <input
              type="text"
              value={customVoltage}
              onChange={(e) => setCustomVoltage(e.target.value)}
              placeholder="1.8V UART / 3.3V SPI"
              className="w-full px-2.5 py-1.5 rounded bg-[#0d1117] border border-[#232d40] text-slate-100 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Short Bus / Adapter Note
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="e.g. RP2040 PicoFlasher + CH347"
              className="w-full px-2.5 py-1.5 rounded bg-[#0d1117] border border-[#232d40] text-slate-100 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="md:col-span-2 flex gap-1.5">
            <button
              type="submit"
              disabled={addingTarget}
              className="flex-1 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {addingTarget ? 'Adding...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddTarget(false)}
              className="px-2.5 py-1.5 rounded bg-[#141a25] border border-[#232d40] text-slate-300 text-xs whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Local Small Model Status & Connection Bar */}
      <div className="bg-[#07090e] border border-[#1b2332] rounded-lg px-3.5 py-2.5 space-y-2">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`font-semibold ${
                llmStatus?.reachable ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {llmStatus?.reachable
                ? `Local Model Active · ${llmStatus.provider === 'openai' ? 'OpenAI-Compatible' : 'Ollama'}`
                : 'No Local LLM Running · Deterministic Pinout Parser Active'}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="font-mono text-[11px] text-slate-400">
              {llmStatus?.reachable
                ? `${llmStatus.models.length} model(s) loaded`
                : 'Regex/BM25 indexer works offline; connect Ollama for vision + summarization'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <select
              value={transportMode}
              onChange={(e) => {
                const next = e.target.value as 'server' | 'browser_direct';
                setTransportMode(next);
                probeLocalLlm(next);
              }}
              className="px-2 py-1 rounded bg-[#0d1117] border border-[#232d40] text-slate-200 font-mono text-[11px]"
              title="Server Proxy works on Kali localhost:3000; Browser Direct talks to 127.0.0.1:11434 from your browser"
            >
              <option value="server">Kali Server Proxy</option>
              <option value="browser_direct">Browser Direct (CORS)</option>
            </select>

            <input
              type="text"
              value={llmBaseUrl}
              onChange={(e) => setLlmBaseUrl(e.target.value)}
              placeholder="http://127.0.0.1:11434"
              className="w-44 px-2 py-1 rounded bg-[#0d1117] border border-[#232d40] text-slate-200 font-mono text-[11px]"
            />

            {llmStatus?.models && llmStatus.models.length > 0 ? (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="px-2 py-1 rounded bg-[#0d1117] border border-[#232d40] text-blue-300 font-mono text-[11px]"
              >
                {llmStatus.models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name} {m.supportsVision ? '(Vision)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                placeholder="qwen2.5:3b"
                className="w-32 px-2 py-1 rounded bg-[#0d1117] border border-[#232d40] text-slate-300 font-mono text-[11px]"
              />
            )}

            <button
              type="button"
              onClick={() => probeLocalLlm()}
              disabled={checkingLlm}
              className="px-2.5 py-1 rounded bg-[#141a25] border border-[#232d40] hover:border-blue-500 text-slate-200 text-[11px] font-semibold whitespace-nowrap shrink-0 flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${checkingLlm ? 'animate-spin' : ''}`} />
              <span>Probe Model</span>
            </button>
          </div>
        </div>

        {llmStatus && !llmStatus.reachable && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pt-1.5 border-t border-[#141b28] text-[11px] text-slate-400">
            <span>{llmStatus.error}</span>
            <button
              type="button"
              onClick={() =>
                copyCommand(
                  'curl -fsSL https://ollama.com/install.sh | sh && OLLAMA_ORIGINS="*" ollama serve & ollama pull qwen2.5:3b && ollama pull qwen2.5vl:3b',
                  'ollama_setup'
                )
              }
              className="px-2.5 py-1 rounded bg-[#0d1117] border border-[#232d40] hover:border-emerald-500 text-emerald-300 font-mono whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              {copiedCmdId === 'ollama_setup' ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              <span>Copy Kali Ollama + 3B Vision Setup</span>
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: UPLOAD PHOTO / DOC */}
      {vaultView === 'upload' && (
        <form onSubmit={handleSaveToVault} className="bg-[#07090e] border border-[#1b2332] rounded-lg p-4 space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Title / Description</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. PS5 EDM-040 Southbridge UART Macro"
                className="w-full px-2.5 py-1.5 rounded bg-[#0d1117] border border-[#232d40] text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Console Target</label>
              <select
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-[#0d1117] border border-[#232d40] text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              >
                {allTargets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
                <option value="custom">General / Unassigned</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Board Revision</label>
              <input
                type="text"
                value={newBoardRev}
                onChange={(e) => setNewBoardRev(e.target.value)}
                placeholder="e.g. EDM-040"
                className="w-full px-2.5 py-1.5 rounded bg-[#0d1117] border border-[#232d40] text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={newTagsText}
                onChange={(e) => setNewTagsText(e.target.value)}
                placeholder="UART, 1.8V, Diode Readings"
                className="w-full px-2.5 py-1.5 rounded bg-[#0d1117] border border-[#232d40] text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Drag & Drop / File Picker */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFilesSelected(e.dataTransfer.files);
            }}
            className="border border-dashed border-[#2b374f] rounded-lg p-4 bg-[#0a0e16] flex flex-col sm:flex-row items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <ImagePlus className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <div className="font-semibold text-slate-200">
                  Drop board photos (.png, .jpg, .webp) or reference docs (.md, .txt, .pdf, .json, .csv)
                </div>
                <div className="text-[11px] text-slate-400">
                  Stored persistently in <code className="font-mono text-slate-300">.bench-vault/</code> on your workstation disk (up to 28 MB per file).
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.md,.txt,.pdf,.json,.csv,.tsv,.log,.ini,.yaml,.yml"
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded bg-[#141a25] border border-[#232d40] hover:border-blue-500 text-slate-200 text-xs font-semibold whitespace-nowrap shrink-0"
              >
                Choose Files
              </button>
            </div>
          </div>

          {pendingFiles.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {pendingFiles.map((pf, idx) => (
                <div
                  key={`${pf.file.name}-${idx}`}
                  className="bg-[#0d1117] border border-[#1b2332] rounded-lg p-2.5 flex items-center gap-2.5"
                >
                  {pf.previewUrl ? (
                    <img
                      src={pf.previewUrl}
                      alt={pf.file.name}
                      className="w-12 h-12 rounded object-cover border border-[#232d40] shrink-0"
                    />
                  ) : (
                    <FileText className="w-8 h-8 text-blue-300 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-200 truncate">{pf.file.name}</div>
                    <div className="font-mono text-[11px] text-slate-400">
                      {formatBytes(pf.file.size)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-1 text-slate-400 hover:text-rose-400 shrink-0"
                    title="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Bench Notes / Pasted Schematic Pinout / Diode Readings
            </label>
            <textarea
              rows={4}
              value={newDocText}
              onChange={(e) => setNewDocText(e.target.value)}
              placeholder="Example:&#10;J4E1 Pin 17 -> CH347 RXD (1.8V KER_DBG_TXD)&#10;CLK -> Light Blue -> SD Pin 5&#10;DAT0 diode reading = 0.54V"
              className="w-full px-3 py-2 rounded bg-[#0d1117] border border-[#232d40] text-slate-100 font-mono text-[11px] focus:outline-none focus:border-blue-500"
            />
          </div>

          {uploadError && (
            <div className="text-rose-300 text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={runAutoOrganizeOnSave}
                onChange={(e) => setRunAutoOrganizeOnSave(e.target.checked)}
                className="rounded border-[#232d40] bg-[#0d1117]"
              />
              <span>
                Auto-organize &amp; extract pinout table on save ({llmStatus?.reachable ? selectedModel : 'Deterministic Parser'})
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVaultView('library')}
                className="px-3 py-1.5 rounded bg-[#141a25] border border-[#232d40] text-slate-300 text-xs font-semibold whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingItem}
                className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                {savingItem ? 'Saving & Organizing...' : 'Save to Pinout Vault'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* VIEW 2: PHOTO & DOC LIBRARY */}
      {vaultView === 'library' && (
        <div className="space-y-3">
          {uploadNotice && (
            <div className="bg-emerald-950/40 border border-emerald-700/50 rounded-lg px-3 py-2 text-emerald-200 text-xs flex items-center justify-between">
              <span>{uploadNotice}</span>
              <button type="button" onClick={() => setUploadNotice(null)} className="text-emerald-300 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Filter & Search Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1 bg-[#07090e] p-1 rounded-lg border border-[#1b2332]">
              <button
                type="button"
                onClick={() => setFilterTarget('active')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                  filterTarget === 'active' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Current Tab ({targetLabelFor(activeTarget)})
              </button>
              <button
                type="button"
                onClick={() => setFilterTarget('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                  filterTarget === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All Consoles ({items.length})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Search board revs, pins, signals..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#07090e] border border-[#1b2332] text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="bg-[#07090e] border border-[#1b2332] rounded-lg p-6 text-center text-slate-400">
              Loading saved bench photos &amp; docs...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-[#07090e] border border-[#1b2332] rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-slate-400">
                No saved board photos or docs for <strong className="text-slate-200">{filterTarget === 'active' ? targetLabelFor(activeTarget) : 'this filter'}</strong> yet.
              </div>
              <button
                type="button"
                onClick={() => setVaultView('upload')}
                className="px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>Add Photo or Doc</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {filteredItems.map((item) => {
                const isImage = Boolean(item.mimeType?.startsWith('image/') && item.assetUrl);
                return (
                  <div
                    key={item.id}
                    className="bg-[#07090e] border border-[#1b2332] rounded-lg p-3.5 space-y-2.5 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-white text-xs truncate">{item.title}</div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5 tabular-nums">
                            <span className="text-blue-300">{targetLabelFor(item.consoleTarget)}</span>
                            {item.boardRev && (
                              <>
                                <span className="text-slate-600" aria-hidden="true">·</span>
                                <span className="text-emerald-300">{item.boardRev}</span>
                              </>
                            )}
                            {item.fileSize ? (
                              <>
                                <span className="text-slate-600" aria-hidden="true">·</span>
                                <span>{formatBytes(item.fileSize)}</span>
                              </>
                            ) : null}
                            {item.tags.length > 0 && (
                              <>
                                <span className="text-slate-600" aria-hidden="true">·</span>
                                <span className="text-slate-300">{item.tags.join(' / ')}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setBookInitialTab('read');
                              setBookTarget({
                                id: item.id,
                                title: item.title,
                                subtitle: [targetLabelFor(item.consoleTarget), item.boardRev]
                                  .filter(Boolean)
                                  .join(' · '),
                                content: item.contentText || item.organized?.summary || '',
                                loadedBytes: (item.contentText || '').length,
                                totalBytes: item.fileSize || (item.contentText || '').length,
                                sourceKind: 'vault',
                                vaultItem: item,
                              });
                            }}
                            title="Open full contents like a book + train model"
                            className="px-2 py-1 rounded bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/35 text-blue-200 text-[11px] font-semibold whitespace-nowrap shrink-0 flex items-center gap-1"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>Book</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTogglePin(item)}
                            title={item.pinnedToGuide ? 'Pinned to console tab' : 'Pin to console tab'}
                            className={`p-1.5 rounded border text-xs ${
                              item.pinnedToGuide
                                ? 'bg-blue-950/50 border-blue-600/60 text-blue-300'
                                : 'bg-[#0d1117] border-[#232d40] text-slate-400 hover:text-white'
                            }`}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAnalyzeExistingItem(item)}
                            disabled={analyzingItemId === item.id}
                            title="Re-organize & extract pinouts"
                            className="px-2 py-1 rounded bg-[#141a25] border border-[#232d40] hover:border-blue-500 text-slate-200 text-[11px] font-semibold whitespace-nowrap shrink-0 flex items-center gap-1 disabled:opacity-50"
                          >
                            <Sparkles className="w-3 h-3 text-blue-400" />
                            <span>{analyzingItemId === item.id ? 'Organizing...' : 'Organize'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            title="Delete from Vault"
                            className="p-1.5 rounded bg-[#0d1117] border border-[#232d40] text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isImage && item.assetUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setLightboxItem(item);
                            setZoomScale(1);
                          }}
                          className="group relative block w-full overflow-hidden rounded border border-[#1b2332] bg-[#04060a]"
                        >
                          <img
                            src={item.assetUrl}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-44 object-cover group-hover:opacity-90 transition-opacity"
                          />
                          <span className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-white font-mono text-[11px] flex items-center gap-1">
                            <ZoomIn className="w-3 h-3" />
                            <span>Inspect Macro</span>
                          </span>
                        </button>
                      )}

                      {item.organized && (
                        <div className="space-y-2 border-t border-[#141b28] pt-2">
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                            <span className="text-emerald-300 font-semibold">Organized Summary</span>
                            <span>{item.organized.analyzedBy}</span>
                          </div>
                          <p className="text-slate-300 leading-relaxed">{item.organized.summary}</p>

                          {item.organized.voltageWarnings.length > 0 && (
                            <div className="text-[11px] text-amber-300 space-y-0.5">
                              {item.organized.voltageWarnings.map((w, i) => (
                                <div key={i}>Warning: {w}</div>
                              ))}
                            </div>
                          )}

                          {item.organized.extractedPins.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left font-mono text-[11px] border-collapse">
                                <thead>
                                  <tr className="border-b border-[#1b2332] text-slate-400">
                                    <th className="py-1 pr-2">Signal</th>
                                    <th className="py-1 pr-2">Board Point</th>
                                    <th className="py-1 pr-2">Adapter / Pin</th>
                                    <th className="py-1">V / Wire</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#141b28] text-slate-200 tabular-nums">
                                  {item.organized.extractedPins.slice(0, 10).map((p, idx) => (
                                    <tr key={idx}>
                                      <td className="py-1 pr-2 text-blue-300 font-semibold">{p.signal}</td>
                                      <td className="py-1 pr-2">{p.boardPoint}</td>
                                      <td className="py-1 pr-2">{p.adapterPin}</td>
                                      <td className="py-1 text-slate-400">
                                        {[p.voltage, p.wireColor].filter(Boolean).join(' · ') || 'Verify'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {!item.organized && item.contentText && (
                        <div className="space-y-1.5">
                          <pre className="bg-[#0d1117] border border-[#141b28] rounded p-2.5 font-mono text-[11px] text-slate-300 max-h-28 overflow-auto whitespace-pre-wrap">
                            {item.contentText.slice(0, 900)}
                          </pre>
                          {item.contentText.length > 900 && (
                            <button
                              type="button"
                              onClick={() => {
                                setBookInitialTab('read');
                                setBookTarget({
                                  id: item.id,
                                  title: item.title,
                                  subtitle: [targetLabelFor(item.consoleTarget), item.boardRev]
                                    .filter(Boolean)
                                    .join(' · '),
                                  content: item.contentText,
                                  loadedBytes: item.contentText.length,
                                  totalBytes: item.fileSize || item.contentText.length,
                                  sourceKind: 'vault',
                                  vaultItem: item,
                                });
                              }}
                              className="text-[11px] font-mono text-blue-300 hover:text-blue-200 flex items-center gap-1"
                            >
                              <BookOpen className="w-3 h-3" />
                              <span>
                                Read all {item.contentText.length.toLocaleString()} chars in Open-Book Spread
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: LOCAL MODEL RESEARCH & CROSS-DOC SEARCH */}
      {vaultView === 'research' && (
        <div className="bg-[#07090e] border border-[#1b2332] rounded-lg p-4 space-y-3.5">
          <form onSubmit={handleRunResearch} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
            <div className="md:col-span-7">
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Ask Local Model to Research &amp; Cross-Check Saved Docs ({items.length} docs indexed)
              </label>
              <input
                type="text"
                value={researchQuery}
                onChange={(e) => setResearchQuery(e.target.value)}
                placeholder="e.g. Summarize all PS5 Slim UART notes or check Switch OLED diode readings"
                className="w-full px-3 py-1.5 rounded bg-[#0d1117] border border-[#232d40] text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Target Scope</label>
              <select
                value={researchScope}
                onChange={(e) => setResearchScope(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-[#0d1117] border border-[#232d40] text-slate-100 text-xs"
              >
                <option value="all">All Saved Consoles</option>
                {allTargets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={researchBusy || !researchQuery.trim()}
                className="w-full px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                {researchBusy ? 'Researching...' : llmStatus?.reachable ? 'Ask Local Model' : 'Search Vault'}
              </button>
            </div>
          </form>

          {researchError && (
            <div className="text-xs text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{researchError}</span>
            </div>
          )}

          {researchAnswer && (
            <div className="border-t border-[#1b2332] pt-3 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="text-blue-300 font-semibold">
                  {researchAnswer.mode === 'llm' ? 'Local Model Synthesis' : 'Deterministic Vault Search'}
                </span>
                <span>{researchAnswer.modelUsed}</span>
              </div>
              <pre className="bg-[#0d1117] border border-[#1b2332] rounded-lg p-3 font-sans text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                {researchAnswer.answer}
              </pre>
              {researchAnswer.citations.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono text-slate-400">Matched Sources:</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {researchAnswer.citations.map((c) => (
                      <div key={c.id} className="bg-[#0d1117] border border-[#141b28] rounded p-2 text-[11px]">
                        <div className="font-semibold text-white">{c.title}</div>
                        <div className="font-mono text-slate-400">
                          {targetLabelFor(c.consoleTarget)}
                          {c.boardRev ? ` · ${c.boardRev}` : ''}
                        </div>
                        {c.snippet && <p className="text-slate-400 mt-1 line-clamp-2">{c.snippet}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Macro Photo Zoom Lightbox */}
      {lightboxItem && lightboxItem.assetUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1b2332] bg-[#0d1117]">
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{lightboxItem.title}</div>
              <div className="text-xs font-mono text-slate-400">
                {targetLabelFor(lightboxItem.consoleTarget)}
                {lightboxItem.boardRev ? ` · ${lightboxItem.boardRev}` : ''} · Zoom {Math.round(zoomScale * 100)}%
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.max(0.5, Number((z - 0.5).toFixed(1))))}
                className="p-1.5 rounded bg-[#141a25] border border-[#232d40] text-slate-200 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(1)}
                className="p-1.5 rounded bg-[#141a25] border border-[#232d40] text-slate-200 hover:text-white"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.min(5, Number((z + 0.5).toFixed(1))))}
                className="p-1.5 rounded bg-[#141a25] border border-[#232d40] text-slate-200 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLightboxItem(null)}
                className="ml-2 p-1.5 rounded bg-rose-950/60 border border-rose-700/60 text-rose-200 hover:text-white"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-6">
            <img
              src={lightboxItem.assetUrl}
              alt={lightboxItem.title}
              referrerPolicy="no-referrer"
              style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
              className="max-w-full max-h-full transition-transform duration-150 rounded border border-[#1b2332]"
            />
          </div>
        </div>
      )}
      <BookReaderModal
        isOpen={Boolean(bookTarget)}
        onClose={() => setBookTarget(null)}
        target={bookTarget}
        vaultItems={items}
        initialTab={bookInitialTab}
        onRefreshVault={onRefreshVault}
        llmConfig={{
          reachable: Boolean(llmStatus?.reachable),
          provider: llmStatus?.provider || null,
          transportMode,
          baseUrl: llmBaseUrl,
          model: selectedModel,
        }}
      />
    </div>
  );
};
