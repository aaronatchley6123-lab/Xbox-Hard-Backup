import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Columns2,
  FileText,
  Sun,
  Moon,
  Download,
  Brain,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Bookmark,
  FolderSearch,
  List,
  Code2,
  AlignLeft,
  AlertTriangle,
} from 'lucide-react';
import {
  paginateBookContent,
  searchBookPages,
  buildTrainingCorpusClient,
  buildOllamaModelfile,
  TrainingFormat,
  CorpusSourceDocument,
  TrainingCorpusResult,
} from '../utils/bookFormatter';
import {
  VaultItem,
  OrganizedDocData,
  ExtractedPinRow,
  parsePinoutDocDeterministic,
  callBrowserDirectOllamaOrganize,
} from '../utils/localPinoutParser';

export interface BookReaderTarget {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  totalBytes?: number;
  loadedBytes?: number;
  hasMore?: boolean;
  nextOffset?: number;
  sourceKind: 'vault' | 'fs' | 'corpus';
  vaultItem?: VaultItem;
  fsPayload?: {
    source: 'local' | 'wdp' | 'smb';
    filePath: string;
    ip: string;
    wdpPort: number;
    username: string;
    password: string;
    knownFolderId: string;
    packageFullName: string;
    smbShare: string;
    subPath: string;
    filename: string;
  };
  initialLocalDirPath?: string;
}

interface BookReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: BookReaderTarget | null;
  vaultItems?: VaultItem[];
  initialTab?: 'read' | 'plates' | 'train';
  onRefreshVault?: () => Promise<void>;
  llmConfig?: {
    reachable: boolean;
    provider: 'ollama' | 'openai' | null;
    transportMode: 'server' | 'browser_direct';
    baseUrl: string;
    model: string;
  };
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const BookReaderModal: React.FC<BookReaderModalProps> = ({
  isOpen,
  onClose,
  target,
  vaultItems = [],
  initialTab = 'read',
  onRefreshVault,
  llmConfig,
}) => {
  const [activeMode, setActiveMode] = useState<'read' | 'plates' | 'train'>(initialTab);
  const [content, setContent] = useState('');
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [loadingFull, setLoadingFull] = useState(false);
  const [reextracting, setReextracting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reading preferences
  const [spreadMode, setSpreadMode] = useState<'two-page' | 'single-page'>('two-page');
  const [paperTheme, setPaperTheme] = useState<'dark' | 'archival'>('dark');
  const [fontStyle, setFontStyle] = useState<'prose' | 'mono'>('prose');
  const [charsPerPage, setCharsPerPage] = useState<number>(2000);
  const [currentSpreadStart, setCurrentSpreadStart] = useState<number>(1); // 1-indexed page
  const [showTocSidebar, setShowTocSidebar] = useState(true);
  const [bookSearch, setBookSearch] = useState('');
  const [pageJumpInput, setPageJumpInput] = useState('1');
  const [pageBookmarks, setPageBookmarks] = useState<number[]>([]);

  // Batch Full-Book LLM Organize state
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; status: string } | null>(null);
  const [batchResult, setBatchResult] = useState<OrganizedDocData | null>(null);

  // Training Corpus Studio state
  const [trainScope, setTrainScope] = useState<'current' | 'vault' | 'host_dir'>('current');
  const [hostDirPath, setHostDirPath] = useState('');
  const [trainFormat, setTrainFormat] = useState<TrainingFormat>('openai');
  const [chunkChars, setChunkChars] = useState<number>(2400);
  const [overlapChars, setOverlapChars] = useState<number>(250);
  const [systemPrompt, setSystemPrompt] = useState(
    'You are an offline technical hardware & systems specialist trained on the full contents of the user’s manuals, pinouts, schematics, logs, and codebase.'
  );
  const [corpusResult, setCorpusResult] = useState<TrainingCorpusResult | null>(null);
  const [generatingCorpus, setGeneratingCorpus] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !target) return;
    setActiveMode(initialTab);
    setContent(target.content || '');
    setLoadedBytes(target.loadedBytes ?? new Blob([target.content || '']).size);
    setTotalBytes(target.totalBytes ?? new Blob([target.content || '']).size);
    setHasMore(Boolean(target.hasMore));
    setNextOffset(target.nextOffset ?? 0);
    setCurrentSpreadStart(1);
    setPageJumpInput('1');
    setBookSearch('');
    setLoadError(null);
    setBatchProgress(null);
    setBatchResult(target.vaultItem?.organized || null);
    setCorpusResult(null);
    setHostDirPath(target.initialLocalDirPath || '.');
    if (target.sourceKind === 'corpus') {
      setTrainScope(target.initialLocalDirPath ? 'host_dir' : 'vault');
    } else {
      setTrainScope('current');
    }
  }, [isOpen, target, initialTab]);

  const parsedBook = useMemo(
    () => paginateBookContent(content, charsPerPage, target?.title || 'Book'),
    [content, charsPerPage, target?.title]
  );

  const searchHits = useMemo(
    () => searchBookPages(parsedBook.pages, bookSearch),
    [parsedBook.pages, bookSearch]
  );

  const totalPages = parsedBook.pages.length;

  const goToPage = (pageNum: number) => {
    const clamped = Math.max(1, Math.min(totalPages, pageNum));
    const aligned =
      spreadMode === 'two-page' && clamped % 2 === 0 ? Math.max(1, clamped - 1) : clamped;
    setCurrentSpreadStart(aligned);
    setPageJumpInput(String(aligned));
  };

  // Keyboard navigation when modal is open in Read mode
  useEffect(() => {
    if (!isOpen || activeMode !== 'read') return;
    const step = spreadMode === 'two-page' ? 2 : 1;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goToPage(currentSpreadStart + step);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPage(currentSpreadStart - step);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeMode, spreadMode, currentSpreadStart, totalPages]);

  if (!isOpen || !target) return null;

  const loadRemainingChunks = async (loadAll = true) => {
    if (!target.fsPayload || !hasMore || loadingFull) return;
    setLoadingFull(true);
    setLoadError(null);
    let cursor = nextOffset;
    let keepGoing = true;
    let accumulated = content;
    let safetyLoops = 0;

    try {
      while (keepGoing && safetyLoops < 32) {
        safetyLoops++;
        const resp = await fetch('/api/xbox/fs/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...target.fsPayload,
            offset: cursor,
            maxBytes: 2 * 1024 * 1024,
          }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
          throw new Error(data.error || 'Failed streaming next book chunk');
        }
        if (data.content) {
          accumulated = accumulated + '\n' + data.content;
        }
        cursor = Number(data.nextOffset ?? cursor);
        keepGoing = Boolean(data.hasMore) && loadAll;
        setContent(accumulated);
        setLoadedBytes(cursor);
        setTotalBytes(Number(data.sizeBytes ?? totalBytes));
        setHasMore(Boolean(data.hasMore));
        setNextOffset(cursor);
        if (!loadAll) break;
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Error streaming full file');
    } finally {
      setLoadingFull(false);
    }
  };

  const handleReextractVaultPdf = async () => {
    if (!target.vaultItem) return;
    setReextracting(true);
    setLoadError(null);
    try {
      const resp = await fetch(
        `/api/pinout-vault/items/${encodeURIComponent(target.vaultItem.id)}/reextract`,
        { method: 'POST' }
      );
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        throw new Error(data.error || 'Re-extraction failed');
      }
      const nextText = String(data.item?.contentText || '');
      setContent(nextText);
      setLoadedBytes(nextText.length);
      setTotalBytes(data.item?.fileSize || nextText.length);
      setCurrentSpreadStart(1);
      if (onRefreshVault) await onRefreshVault();
    } catch (err: any) {
      setLoadError(err?.message || 'Could not re-extract file');
    } finally {
      setReextracting(false);
    }
  };

  const handleBatchOrganizeFullBook = async () => {
    if (!content.trim() || batchRunning) return;
    setBatchRunning(true);
    setLoadError(null);

    const CHUNK_WINDOW = 22000;
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += CHUNK_WINDOW) {
      chunks.push(content.slice(i, i + CHUNK_WINDOW));
    }
    const totalChunks = Math.max(1, chunks.length);
    const summaries: string[] = [];
    const warnings = new Set<string>();
    const checklists = new Set<string>();
    const pinMap = new Map<string, ExtractedPinRow>();
    const tagSet = new Set<string>();
    let detectedTarget = target.vaultItem?.consoleTarget || 'custom';
    let detectedRev = target.vaultItem?.boardRev || '';
    let analyzerName = 'deterministic-parser';

    try {
      for (let idx = 0; idx < chunks.length; idx++) {
        setBatchProgress({
          current: idx + 1,
          total: totalChunks,
          status: llmConfig?.reachable
            ? `Processing section ${idx + 1} of ${totalChunks} with ${llmConfig.model}...`
            : `Indexing section ${idx + 1} of ${totalChunks} with deterministic parser...`,
        });

        let chunkRes: { organized: OrganizedDocData; suggestedTags: string[] };

        if (llmConfig?.reachable) {
          if (llmConfig.transportMode === 'browser_direct') {
            chunkRes = await callBrowserDirectOllamaOrganize({
              baseUrl: llmConfig.baseUrl,
              model: llmConfig.model,
              title: `${target.title} (Part ${idx + 1}/${totalChunks})`,
              docText: chunks[idx],
              consoleTarget: detectedTarget,
              boardRev: detectedRev,
            });
          } else {
            const resp = await fetch('/api/local-llm/organize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: `${target.title} (Part ${idx + 1}/${totalChunks})`,
                docText: chunks[idx],
                consoleTarget: detectedTarget,
                boardRev: detectedRev,
                baseUrl: llmConfig.baseUrl,
                model: llmConfig.model,
                provider: llmConfig.provider || 'ollama',
                saveToVault: false,
                maxChars: CHUNK_WINDOW + 1000,
              }),
            });
            const data = await resp.json();
            if (resp.ok && data.ok && data.organized) {
              chunkRes = { organized: data.organized, suggestedTags: data.suggestedTags || [] };
            } else {
              chunkRes = parsePinoutDocDeterministic(target.title, chunks[idx], detectedRev);
            }
          }
        } else {
          chunkRes = parsePinoutDocDeterministic(target.title, chunks[idx], detectedRev);
        }

        analyzerName = chunkRes.organized.analyzedBy;
        if (chunkRes.organized.summary) {
          summaries.push(`[Section ${idx + 1}/${totalChunks}] ${chunkRes.organized.summary}`);
        }
        if (chunkRes.organized.detectedTarget && detectedTarget === 'custom') {
          detectedTarget = chunkRes.organized.detectedTarget;
        }
        if (!detectedRev && chunkRes.organized.boardRev) {
          detectedRev = chunkRes.organized.boardRev;
        }
        chunkRes.organized.voltageWarnings.forEach((w) => warnings.add(w));
        (chunkRes.organized.benchChecklist || []).forEach((c) => checklists.add(c));
        chunkRes.suggestedTags.forEach((t) => tagSet.add(t));
        for (const row of chunkRes.organized.extractedPins) {
          const key = `${row.signal.toLowerCase()}|${row.boardPoint.toLowerCase()}|${row.adapterPin.toLowerCase()}`;
          if (!pinMap.has(key)) pinMap.set(key, row);
        }
      }

      const merged: OrganizedDocData = {
        summary: summaries.join('\n\n'),
        detectedTarget,
        boardRev: detectedRev || undefined,
        voltageWarnings: Array.from(warnings),
        extractedPins: Array.from(pinMap.values()),
        benchChecklist: Array.from(checklists),
        analyzedBy: `${analyzerName} (${totalChunks}-part full book)`,
        analyzedAt: new Date().toISOString(),
      };
      setBatchResult(merged);

      if (target.vaultItem) {
        await fetch(`/api/pinout-vault/items/${encodeURIComponent(target.vaultItem.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organized: merged,
            boardRev: target.vaultItem.boardRev || merged.boardRev || '',
            tags: Array.from(new Set([...target.vaultItem.tags, ...Array.from(tagSet)])).slice(0, 20),
          }),
        });
        if (onRefreshVault) await onRefreshVault();
      }

      setBatchProgress({
        current: totalChunks,
        total: totalChunks,
        status: `Completed full-book pass across all ${totalChunks} section(s) · ${merged.extractedPins.length} pinout row(s) extracted.`,
      });
    } catch (err: any) {
      setLoadError(err?.message || 'Batch book organization failed');
    } finally {
      setBatchRunning(false);
    }
  };

  const handleBuildTrainingCorpus = async () => {
    setGeneratingCorpus(true);
    setLoadError(null);
    try {
      if (trainScope === 'current') {
        const docs: CorpusSourceDocument[] = [
          {
            id: target.id,
            title: target.title,
            sourceLabel: target.subtitle || target.title,
            category: target.vaultItem
              ? [target.vaultItem.consoleTarget, target.vaultItem.boardRev, ...target.vaultItem.tags]
                  .filter(Boolean)
                  .join(' · ')
              : target.sourceKind,
            text: content,
            structuredAppendix: batchResult?.extractedPins?.length
              ? JSON.stringify(batchResult.extractedPins, null, 2)
              : undefined,
          },
        ];
        setCorpusResult(
          buildTrainingCorpusClient(docs, {
            format: trainFormat,
            chunkChars,
            overlapChars,
            systemPrompt,
          })
        );
      } else {
        const resp = await fetch('/api/local-llm/export-training', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            includeVault: trainScope === 'vault' || trainScope === 'host_dir' ? trainScope === 'vault' : true,
            localRootPath: trainScope === 'host_dir' ? hostDirPath.trim() : '',
            format: trainFormat,
            chunkChars,
            overlapChars,
            systemPrompt,
          }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
          throw new Error(data.error || 'Training corpus build failed');
        }
        setCorpusResult({
          format: data.format,
          docCount: data.docCount,
          sampleCount: data.sampleCount,
          totalChars: data.totalChars,
          estimatedTokens: data.estimatedTokens,
          previewSamples: data.previewSamples || [],
          jsonl: data.jsonl || '',
        });
      }
    } catch (err: any) {
      // Fallback to client-side vault builder if server route not applicable
      if (trainScope === 'vault' && vaultItems.length > 0) {
        const docs: CorpusSourceDocument[] = vaultItems.map((it) => ({
          id: it.id,
          title: it.title,
          sourceLabel: `vault://${it.consoleTarget}/${it.filename || it.id}`,
          category: [it.consoleTarget, it.boardRev, ...it.tags].filter(Boolean).join(' · '),
          text: it.contentText || it.organized?.summary || '',
          structuredAppendix: it.organized?.extractedPins?.length
            ? JSON.stringify(it.organized.extractedPins, null, 2)
            : undefined,
        }));
        setCorpusResult(
          buildTrainingCorpusClient(docs, {
            format: trainFormat,
            chunkChars,
            overlapChars,
            systemPrompt,
          })
        );
      } else {
        setLoadError(err?.message || 'Failed building training corpus');
      }
    } finally {
      setGeneratingCorpus(false);
    }
  };

  const downloadTextFile = (filename: string, text: string, mime = 'application/jsonl') => {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyText = (txt: string, key: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const leftPage = parsedBook.pages[currentSpreadStart - 1];
  const rightPage =
    spreadMode === 'two-page' && currentSpreadStart < totalPages
      ? parsedBook.pages[currentSpreadStart]
      : undefined;

  const isArchival = paperTheme === 'archival';
  const pageSurfaceClass = isArchival
    ? 'bg-[#f4efe4] text-[#1c2330] border-[#d8cfbe]'
    : 'bg-[#0c111a] text-slate-200 border-[#1b2434]';
  const pageMutedClass = isArchival ? 'text-[#6c6457]' : 'text-slate-400';
  const pageHeaderBorderClass = isArchival ? 'border-[#dfd6c5]' : 'border-[#182131]';

  const safeSlug = target.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'corpus';
  const modelfileText = buildOllamaModelfile(
    llmConfig?.model || 'qwen2.5:3b',
    target.title,
    batchResult?.summary || content.slice(0, 4000)
  );
  const loraTrainCommand = `# Fine-tune Qwen2.5-3B LoRA on your exported JSONL using Unsloth / HuggingFace TRL:\npip install unsloth datasets trl\npython3 -c 'from unsloth import FastLanguageModel; from datasets import load_dataset; ds=load_dataset("json", data_files="${safeSlug}_${trainFormat}.jsonl", split="train"); print("Loaded", len(ds), "full-book training samples")'`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col">
      {/* Top Book Reader Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#090d14] border-b border-[#1c2536]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-blue-600/15 border border-blue-500/35 text-blue-400 shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white truncate">{target.title}</h2>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400 tabular-nums">
              {target.subtitle && <span className="text-blue-300 truncate max-w-xs">{target.subtitle}</span>}
              <span aria-hidden="true">·</span>
              <span>{totalPages} pages</span>
              <span aria-hidden="true">·</span>
              <span>{parsedBook.chapters.length} chapters</span>
              <span aria-hidden="true">·</span>
              <span>{parsedBook.totalWords.toLocaleString()} words</span>
              <span aria-hidden="true">·</span>
              <span>~{parsedBook.estimatedTokens.toLocaleString()} tokens</span>
              {totalBytes > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className={hasMore ? 'text-amber-300' : 'text-emerald-300'}>
                    {hasMore
                      ? `${formatBytes(loadedBytes)} / ${formatBytes(totalBytes)} loaded`
                      : `100% Full (${formatBytes(totalBytes)})`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {/* Primary Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#06080d] p-1 rounded-lg border border-[#1b2434]">
            <button
              type="button"
              onClick={() => setActiveMode('read')}
              className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                activeMode === 'read' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Open Book</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('plates')}
              className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                activeMode === 'plates' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Plates &amp; Pinouts</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('train')}
              className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                activeMode === 'train' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Train Corpus</span>
            </button>
          </div>

          {hasMore && target.fsPayload && (
            <button
              type="button"
              onClick={() => void loadRemainingChunks(true)}
              disabled={loadingFull}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingFull ? 'animate-spin' : ''}`} />
              <span>{loadingFull ? 'Streaming Full File...' : 'Load Full Contents'}</span>
            </button>
          )}

          {target.vaultItem?.assetUrl && (
            <button
              type="button"
              onClick={() => void handleReextractVaultPdf()}
              disabled={reextracting}
              title="Re-parse full disk asset (extracts all PDF/text pages without old truncation)"
              className="px-3 py-1.5 rounded-lg bg-[#121824] border border-[#243045] hover:border-blue-500 text-slate-200 text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reextracting ? 'animate-spin' : ''}`} />
              <span>{reextracting ? 'Extracting...' : 'Re-Extract Full Asset'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#141a25] border border-[#243045] text-slate-300 hover:text-white hover:border-rose-500/60"
            title="Close Book Reader"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {loadError && (
        <div className="px-4 py-2 bg-rose-950/60 border-b border-rose-700/50 text-xs text-rose-200 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{loadError}</span>
          </span>
          <button type="button" onClick={() => setLoadError(null)} className="text-rose-200 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MODE 1: OPEN-BOOK SPREAD VIEW */}
      {activeMode === 'read' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Reader Formatting & Pagination Sub-toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#0c1119] border-b border-[#192232]">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowTocSidebar((v) => !v)}
                className={`px-2.5 py-1 rounded text-xs font-medium border whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  showTocSidebar
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                    : 'bg-[#121824] border-[#222d40] text-slate-300'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Chapters ({parsedBook.chapters.length})</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSpreadMode((m) => (m === 'two-page' ? 'single-page' : 'two-page'))
                }
                className="px-2.5 py-1 rounded text-xs font-medium bg-[#121824] border border-[#222d40] hover:border-blue-500 text-slate-200 whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                {spreadMode === 'two-page' ? (
                  <>
                    <Columns2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Two-Page Book</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>Single Page</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setPaperTheme((t) => (t === 'dark' ? 'archival' : 'dark'))}
                className="px-2.5 py-1 rounded text-xs font-medium bg-[#121824] border border-[#222d40] hover:border-blue-500 text-slate-200 whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                {paperTheme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-300" />
                    <span>Paper Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-blue-300" />
                    <span>Dark Ink</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setFontStyle((f) => (f === 'prose' ? 'mono' : 'prose'))}
                className="px-2.5 py-1 rounded text-xs font-medium bg-[#121824] border border-[#222d40] hover:border-blue-500 text-slate-200 whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                {fontStyle === 'prose' ? (
                  <>
                    <AlignLeft className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Book Prose</span>
                  </>
                ) : (
                  <>
                    <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mono / Code</span>
                  </>
                )}
              </button>

              <select
                value={charsPerPage}
                onChange={(e) => {
                  setCharsPerPage(Number(e.target.value));
                  setCurrentSpreadStart(1);
                }}
                className="px-2 py-1 rounded bg-[#121824] border border-[#222d40] text-xs font-mono text-slate-300"
                title="Page density"
              >
                <option value={1400}>Cozy Page (1.4K)</option>
                <option value={2000}>Standard Book (2.0K)</option>
                <option value={3400}>Dense Manual (3.4K)</option>
              </select>

              <button
                type="button"
                onClick={() =>
                  setPageBookmarks((prev) =>
                    prev.includes(currentSpreadStart)
                      ? prev.filter((p) => p !== currentSpreadStart)
                      : [...prev, currentSpreadStart].sort((a, b) => a - b)
                  )
                }
                className={`px-2.5 py-1 rounded text-xs font-medium border whitespace-nowrap shrink-0 flex items-center gap-1 ${
                  pageBookmarks.includes(currentSpreadStart)
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-[#121824] border-[#222d40] text-slate-300'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{pageBookmarks.includes(currentSpreadStart) ? 'Bookmarked' : 'Bookmark Page'}</span>
              </button>
            </div>

            {/* Page Turn Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => goToPage(currentSpreadStart - (spreadMode === 'two-page' ? 2 : 1))}
                disabled={currentSpreadStart <= 1}
                className="px-2.5 py-1 rounded bg-[#121824] border border-[#222d40] hover:border-blue-500 text-slate-200 text-xs font-semibold disabled:opacity-40 flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = parseInt(pageJumpInput, 10);
                  if (!Number.isNaN(n)) goToPage(n);
                }}
                className="flex items-center gap-1 text-xs font-mono tabular-nums text-slate-300"
              >
                <span>Pg</span>
                <input
                  type="text"
                  value={pageJumpInput}
                  onChange={(e) => setPageJumpInput(e.target.value)}
                  className="w-12 px-1.5 py-1 rounded bg-[#070a0f] border border-[#243045] text-center text-white text-xs font-mono"
                />
                <span className="text-slate-500">/ {totalPages}</span>
              </form>

              <button
                type="button"
                onClick={() => goToPage(currentSpreadStart + (spreadMode === 'two-page' ? 2 : 1))}
                disabled={
                  spreadMode === 'two-page'
                    ? currentSpreadStart + 1 >= totalPages
                    : currentSpreadStart >= totalPages
                }
                className="px-2.5 py-1 rounded bg-[#121824] border border-[#222d40] hover:border-blue-500 text-slate-200 text-xs font-semibold disabled:opacity-40 flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadTextFile(`${safeSlug}_full_contents.txt`, content, 'text/plain')
                }
                className="px-2.5 py-1 rounded bg-[#121824] border border-[#222d40] hover:border-emerald-500 text-slate-200 text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0"
                title="Download full extracted text"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Full Text</span>
              </button>
            </div>
          </div>

          {/* Main Book Body: TOC Sidebar + Open Book Spread */}
          <div className="flex-1 flex min-h-0 overflow-hidden bg-[#06080d]">
            {showTocSidebar && (
              <aside className="w-64 lg:w-72 border-r border-[#1a2232] bg-[#0a0e16] flex flex-col min-h-0 shrink-0">
                <div className="p-3 border-b border-[#182030]">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={bookSearch}
                      onChange={(e) => setBookSearch(e.target.value)}
                      placeholder="Search inside full book..."
                      className="w-full pl-8 pr-3 py-1.5 rounded bg-[#06080d] border border-[#202a3d] text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
                  {bookSearch.trim() ? (
                    <div className="space-y-1.5">
                      <div className="px-1.5 text-[11px] font-mono text-blue-300 tabular-nums">
                        {searchHits.length} matching page(s)
                      </div>
                      {searchHits.length === 0 ? (
                        <div className="px-2 py-4 text-xs text-slate-500">
                          No matches for "{bookSearch}" in loaded pages.
                        </div>
                      ) : (
                        searchHits.map((hit) => (
                          <button
                            key={hit.pageNumber}
                            type="button"
                            onClick={() => goToPage(hit.pageNumber)}
                            className="w-full text-left p-2 rounded-lg bg-[#0d131f] hover:bg-[#131b2b] border border-[#1b2436] transition-colors space-y-1"
                          >
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="text-blue-300 font-semibold">Page {hit.pageNumber}</span>
                              <span className="text-amber-300 tabular-nums">{hit.matchCount} hit(s)</span>
                            </div>
                            <div className="text-[11px] text-slate-300 line-clamp-2">{hit.snippet}</div>
                          </button>
                        ))
                      )}
                    </div>
                  ) : (
                    <>
                      {pageBookmarks.length > 0 && (
                        <div className="space-y-1">
                          <div className="px-1.5 text-[11px] font-semibold text-amber-300">
                            Bookmarked Pages
                          </div>
                          <div className="flex flex-wrap gap-1 px-1">
                            {pageBookmarks.map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => goToPage(p)}
                                className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-amber-200 font-mono text-[11px]"
                              >
                                p.{p}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="px-1.5 text-[11px] font-semibold text-slate-400">
                          Table of Contents
                        </div>
                        {parsedBook.chapters.map((ch, idx) => {
                          const isActive =
                            currentSpreadStart >= ch.startPage && currentSpreadStart <= ch.endPage;
                          return (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => goToPage(ch.startPage)}
                              className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-start justify-between gap-2 ${
                                isActive
                                  ? 'bg-blue-600/20 border border-blue-500/40 text-white font-semibold'
                                  : 'hover:bg-[#111723] text-slate-300 border border-transparent'
                              }`}
                            >
                              <span className="line-clamp-2 leading-snug">
                                {idx + 1}. {ch.title}
                              </span>
                              <span className="font-mono text-[11px] text-slate-500 shrink-0 tabular-nums">
                                p.{ch.startPage}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </aside>
            )}

            {/* Open Book Spread Canvas */}
            <div className="flex-1 flex flex-col min-w-0 p-3 sm:p-5 lg:p-6 overflow-y-auto">
              <div
                className={`flex-1 mx-auto w-full ${
                  spreadMode === 'two-page' && rightPage ? 'max-w-7xl' : 'max-w-4xl'
                } grid ${
                  spreadMode === 'two-page' && rightPage ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
                } rounded-xl overflow-hidden border ${
                  isArchival ? 'border-[#cfc3ae] shadow-2xl' : 'border-[#1d2738] shadow-2xl'
                }`}
              >
                {/* Left / Primary Page */}
                {leftPage && (
                  <article
                    className={`flex flex-col justify-between p-6 sm:p-8 border-b lg:border-b-0 ${
                      spreadMode === 'two-page' && rightPage
                        ? isArchival
                          ? 'lg:border-r lg:border-[#d5cab6] shadow-[inset_-14px_0_24px_-18px_rgba(0,0,0,0.22)]'
                          : 'lg:border-r lg:border-[#1c2638] shadow-[inset_-18px_0_28px_-18px_rgba(0,0,0,0.75)]'
                        : ''
                    } ${pageSurfaceClass}`}
                  >
                    <div>
                      <div
                        className={`flex items-center justify-between pb-3 mb-4 border-b text-[11px] font-mono ${pageHeaderBorderClass} ${pageMutedClass}`}
                      >
                        <span className="truncate max-w-[70%]">{leftPage.chapterTitle}</span>
                        <span className="tabular-nums">{leftPage.wordCount} words</span>
                      </div>

                      <div
                        className={`${
                          fontStyle === 'mono'
                            ? 'font-mono text-[12.5px] leading-relaxed'
                            : 'font-sans text-[14.5px] leading-[1.72]'
                        } whitespace-pre-wrap break-words`}
                      >
                        {leftPage.text}
                      </div>
                    </div>

                    <div
                      className={`flex items-center justify-between pt-4 mt-6 border-t text-[11px] font-mono tabular-nums ${pageHeaderBorderClass} ${pageMutedClass}`}
                    >
                      <span>{target.title}</span>
                      <span>
                        Page {leftPage.pageNumber} of {totalPages}
                      </span>
                    </div>
                  </article>
                )}

                {/* Right Facing Page */}
                {spreadMode === 'two-page' && rightPage && (
                  <article
                    className={`flex flex-col justify-between p-6 sm:p-8 ${
                      isArchival
                        ? 'shadow-[inset_14px_0_24px_-18px_rgba(0,0,0,0.18)]'
                        : 'shadow-[inset_18px_0_28px_-18px_rgba(0,0,0,0.75)]'
                    } ${pageSurfaceClass}`}
                  >
                    <div>
                      <div
                        className={`flex items-center justify-between pb-3 mb-4 border-b text-[11px] font-mono ${pageHeaderBorderClass} ${pageMutedClass}`}
                      >
                        <span className="truncate max-w-[70%]">{rightPage.chapterTitle}</span>
                        <span className="tabular-nums">{rightPage.wordCount} words</span>
                      </div>

                      <div
                        className={`${
                          fontStyle === 'mono'
                            ? 'font-mono text-[12.5px] leading-relaxed'
                            : 'font-sans text-[14.5px] leading-[1.72]'
                        } whitespace-pre-wrap break-words`}
                      >
                        {rightPage.text}
                      </div>
                    </div>

                    <div
                      className={`flex items-center justify-between pt-4 mt-6 border-t text-[11px] font-mono tabular-nums ${pageHeaderBorderClass} ${pageMutedClass}`}
                    >
                      <span>{rightPage.chapterTitle}</span>
                      <span>
                        Page {rightPage.pageNumber} of {totalPages}
                      </span>
                    </div>
                  </article>
                )}
              </div>

              {/* Bottom Progress Scrubber */}
              {totalPages > 1 && (
                <div className="max-w-4xl w-full mx-auto mt-3 flex items-center gap-3 text-xs font-mono text-slate-400 tabular-nums">
                  <span>p.1</span>
                  <input
                    type="range"
                    min={1}
                    max={totalPages}
                    value={currentSpreadStart}
                    onChange={(e) => goToPage(Number(e.target.value))}
                    className="flex-1 accent-blue-500 cursor-pointer"
                  />
                  <span>p.{totalPages}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: PLATES, MACRO IMAGES & EXTRACTED PINOUTS */}
      {activeMode === 'plates' && (
        <div className="flex-1 overflow-y-auto p-6 bg-[#06080d]">
          <div className="max-w-5xl mx-auto space-y-6">
            {target.vaultItem?.assetUrl && target.vaultItem.mimeType?.startsWith('image/') && (
              <div className="bg-[#0b1018] border border-[#1c2536] rounded-xl p-4 space-y-3">
                <div className="text-xs font-semibold text-white">Attached Board Macro Plate</div>
                <img
                  src={target.vaultItem.assetUrl}
                  alt={target.title}
                  referrerPolicy="no-referrer"
                  className="max-h-[460px] mx-auto rounded border border-[#1f293b] object-contain"
                />
              </div>
            )}

            <div className="bg-[#0b1018] border border-[#1c2536] rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Extracted Knowledge &amp; Pinout Index
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Run a full cover-to-cover extraction pass across all sections of this book.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleBatchOrganizeFullBook()}
                  disabled={batchRunning || !content.trim()}
                  className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {batchRunning ? 'Analyzing Full Book...' : 'Index Full Book Cover-to-Cover'}
                  </span>
                </button>
              </div>

              {batchProgress && (
                <div className="bg-[#070a0f] border border-[#1c2638] rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-blue-300 tabular-nums">
                    <span>{batchProgress.status}</span>
                    <span>
                      {batchProgress.current}/{batchProgress.total}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded bg-[#141c2a] overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{
                        width: `${Math.round((batchProgress.current / batchProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {batchResult ? (
                <div className="space-y-4">
                  <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-[#070a0f] border border-[#172030] rounded-lg p-3.5">
                    {batchResult.summary}
                  </div>

                  {batchResult.voltageWarnings.length > 0 && (
                    <div className="space-y-1 text-xs text-amber-300">
                      {batchResult.voltageWarnings.map((w, i) => (
                        <div key={i}>Warning: {w}</div>
                      ))}
                    </div>
                  )}

                  {batchResult.extractedPins.length > 0 && (
                    <div className="overflow-x-auto border border-[#182131] rounded-lg">
                      <table className="w-full text-left font-mono text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#080c12] border-b border-[#182131] text-slate-400">
                            <th className="py-2 px-3">Signal</th>
                            <th className="py-2 px-3">Board Point</th>
                            <th className="py-2 px-3">Adapter / Pin</th>
                            <th className="py-2 px-3">Voltage / Wire</th>
                            <th className="py-2 px-3">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#141b28] text-slate-200 tabular-nums">
                          {batchResult.extractedPins.map((p, idx) => (
                            <tr key={idx} className="hover:bg-[#0f1622]">
                              <td className="py-2 px-3 text-blue-300 font-semibold">{p.signal}</td>
                              <td className="py-2 px-3">{p.boardPoint}</td>
                              <td className="py-2 px-3">{p.adapterPin}</td>
                              <td className="py-2 px-3 text-slate-300">
                                {[p.voltage, p.wireColor].filter(Boolean).join(' · ') || 'Verify'}
                              </td>
                              <td className="py-2 px-3 text-slate-400">{p.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-4">
                  No structured index extracted yet. Click "Index Full Book Cover-to-Cover" above to scan every page.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: TRAINING CORPUS & MODEL BUILDER */}
      {activeMode === 'train' && (
        <div className="flex-1 overflow-y-auto p-6 bg-[#06080d]">
          <div className="max-w-5xl mx-auto space-y-5">
            <div className="bg-[#0b1018] border border-[#1c2536] rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Brain className="w-4 h-4 text-emerald-400" />
                    <span>Full-Contents Training Dataset &amp; Local Model Packager</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Chunks 100% of full documents, PDFs, schematics, or entire host directories into clean training JSONL + Ollama Modelfile packs without truncation.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleBatchOrganizeFullBook()}
                  disabled={batchRunning || !content.trim()}
                  className="px-3.5 py-2 rounded-lg bg-[#131b28] border border-[#243248] hover:border-blue-500 text-slate-200 text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>{batchRunning ? 'Indexing Book...' : 'Batch-Extract Book via Local LLM'}</span>
                </button>
              </div>

              {batchProgress && (
                <div className="bg-[#070a0f] border border-[#1c2638] rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-blue-300 tabular-nums">
                    <span>{batchProgress.status}</span>
                    <span>
                      {batchProgress.current}/{batchProgress.total}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded bg-[#141c2a] overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{
                        width: `${Math.round((batchProgress.current / batchProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Training Corpus Source
                  </label>
                  <select
                    value={trainScope}
                    onChange={(e) => setTrainScope(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070a0f] border border-[#222d42] text-xs text-white"
                  >
                    {target.sourceKind !== 'corpus' && (
                      <option value="current">
                        This Open Book ({formatBytes(content.length)} full text)
                      </option>
                    )}
                    <option value="vault">
                      Full Pinout Vault Archive ({vaultItems.length} item(s))
                    </option>
                    <option value="host_dir">
                      Recursive Host Directory / Folder Scan (PDF + Code + Docs)
                    </option>
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Dataset Schema (.jsonl)
                  </label>
                  <select
                    value={trainFormat}
                    onChange={(e) => setTrainFormat(e.target.value as TrainingFormat)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070a0f] border border-[#222d42] text-xs text-white"
                  >
                    <option value="openai">OpenAI / Unsloth ChatML (messages)</option>
                    <option value="sharegpt">ShareGPT (conversations)</option>
                    <option value="alpaca">Alpaca Instruct (instruction/output)</option>
                    <option value="raw_pretrain">Raw Continued Pretraining (text)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Chunk Chars
                  </label>
                  <select
                    value={chunkChars}
                    onChange={(e) => setChunkChars(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#070a0f] border border-[#222d42] text-xs font-mono text-white"
                  >
                    <option value={1200}>1,200 (~300 tok)</option>
                    <option value={2400}>2,400 (~600 tok)</option>
                    <option value={4800}>4,800 (~1.2K tok)</option>
                    <option value={8000}>8,000 (~2.0K tok)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Overlap Chars
                  </label>
                  <select
                    value={overlapChars}
                    onChange={(e) => setOverlapChars(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#070a0f] border border-[#222d42] text-xs font-mono text-white"
                  >
                    <option value={0}>0 (No overlap)</option>
                    <option value={250}>250 chars</option>
                    <option value={500}>500 chars</option>
                  </select>
                </div>
              </div>

              {trainScope === 'host_dir' && (
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Host Directory or File Path to Read &amp; Train Recursively
                  </label>
                  <div className="flex items-center gap-2">
                    <FolderSearch className="w-4 h-4 text-emerald-400 shrink-0" />
                    <input
                      type="text"
                      value={hostDirPath}
                      onChange={(e) => setHostDirPath(e.target.value)}
                      placeholder="e.g. . or ~/Downloads/XboxDocs or /mnt/xbox"
                      className="flex-1 px-3 py-2 rounded-lg bg-[#070a0f] border border-[#222d42] text-xs font-mono text-emerald-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Training System Persona
                </label>
                <input
                  type="text"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070a0f] border border-[#222d42] text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void handleBuildTrainingCorpus()}
                  disabled={generatingCorpus}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>
                    {generatingCorpus ? 'Building Full JSONL Corpus...' : 'Build Full-Contents Training Corpus (.jsonl)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    downloadTextFile(`Modelfile_${safeSlug}`, modelfileText, 'text/plain')
                  }
                  className="px-3.5 py-2 rounded-lg bg-[#131b28] border border-[#243248] hover:border-blue-500 text-slate-200 text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Download Ollama Modelfile</span>
                </button>
              </div>
            </div>

            {corpusResult && (
              <div className="bg-[#0b1018] border border-emerald-700/40 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-emerald-300">
                      Training Corpus Ready · {corpusResult.sampleCount.toLocaleString()} samples
                    </div>
                    <div className="text-xs font-mono text-slate-400 tabular-nums">
                      {corpusResult.docCount} source doc(s) · {corpusResult.totalChars.toLocaleString()} chars · ~{corpusResult.estimatedTokens.toLocaleString()} tokens · Format: {corpusResult.format}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        downloadTextFile(
                          `${safeSlug}_${corpusResult.format}.jsonl`,
                          corpusResult.jsonl,
                          'application/jsonl'
                        )
                      }
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .jsonl ({formatBytes(corpusResult.jsonl.length)})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => copyText(loraTrainCommand, 'lora')}
                      className="px-3 py-2 rounded-lg bg-[#131b28] border border-[#243248] text-slate-200 text-xs font-mono whitespace-nowrap shrink-0 flex items-center gap-1.5"
                    >
                      {copiedId === 'lora' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>Copy Unsloth LoRA Cmd</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-slate-400">
                    Sample Records Preview (first {corpusResult.previewSamples.length} of {corpusResult.sampleCount}):
                  </div>
                  <pre className="bg-[#06080d] border border-[#182131] rounded-lg p-3.5 font-mono text-[11px] text-slate-200 max-h-72 overflow-auto whitespace-pre-wrap">
                    {corpusResult.previewSamples
                      .map((s) => JSON.stringify(s, null, 2))
                      .join('\n\n')}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
