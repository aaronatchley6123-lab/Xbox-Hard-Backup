import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  X,
  User,
  Sparkles,
  Terminal,
  Trash2,
  Cpu,
  Smartphone,
  Download,
  FolderOpen,
  HardDrive,
  Check,
  Copy,
  Sliders,
  UploadCloud,
  FileCode,
} from 'lucide-react';
import { XboxConnectionConfig } from '../types/xbox';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  engineBadge?: string;
}

type ModelChoice =
  | 'gemini-nano-local'
  | 'huggingface-local'
  | 'gemini-3.1-flash-lite'
  | 'gemini-3.8-flash';

interface HfPreset {
  id: string;
  label: string;
  repo: string;
  file: string;
  size: string;
  quant: string;
}

const DEFAULT_BRAIN_PATH =
  '/home/nitrokali/.gemini/antigravity-cli/brain/dd55b21d-c3d7-4cb6-8d3c-7d872aa4690c';

const HF_MODEL_PRESETS: HfPreset[] = [
  {
    id: 'gemma-3-1b',
    label: 'Gemma-3-1B-IT GGUF (Google Mobile Local Weights)',
    repo: 'ggml-org/gemma-3-1b-it-GGUF',
    file: 'gemma-3-1b-it-Q4_K_M.gguf',
    size: '806 MB',
    quant: 'Q4_K_M',
  },
  {
    id: 'qwen-coder-1.5b',
    label: 'Qwen2.5-Coder-1.5B-Instruct (Best for CLI / Agent)',
    repo: 'Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF',
    file: 'qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
    size: '1.12 GB',
    quant: 'Q4_K_M',
  },
  {
    id: 'llama-3.2-1b',
    label: 'Llama-3.2-1B-Instruct GGUF (Ultra-Fast Mobile)',
    repo: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
    file: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    size: '808 MB',
    quant: 'Q4_K_M',
  },
  {
    id: 'smollm2-360m',
    label: 'SmolLM2-360M-Instruct GGUF (Tiny Pocket Model)',
    repo: 'HuggingFaceTB/SmolLM2-360M-Instruct-GGUF',
    file: 'smollm2-360m-instruct-q8_0.gguf',
    size: '386 MB',
    quant: 'Q8_0',
  },
];

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: XboxConnectionConfig;
}

function runLocalMobileNanoInference(
  prompt: string,
  config: XboxConnectionConfig,
  modelLabel = 'Gemini Nano Local'
): string {
  const q = prompt.toLowerCase();
  const ip = config.ip || '192.168.1.50';
  const port = config.port || 11443;
  const user = config.username || 'DevToolsUser';
  const pass = config.password || 'password';

  if (
    q.includes('dd55b21d') ||
    q.includes('antigravity') ||
    q.includes('nitrokali') ||
    q.includes('brain') ||
    q.includes('deploy') ||
    q.includes('fix')
  ) {
    return [
      `### [${modelLabel}] Restore \`dd55b21d-c3d7-4cb6-8d3c-7d872aa4690c\` + Local Model to Xbox Over SMB`,
      ``,
      `Since \`${DEFAULT_BRAIN_PATH}\` is on your \`nitrokali\` machine and **SMB (\`:445\`) works** on your Xbox (\`${ip}\`), you can bundle a local Hugging Face mobile model into that folder and push the whole restored directory back onto the Xbox:`,
      ``,
      `1. **Put the Local Mobile Model (GGUF) Inside Your Brain Folder on \`nitrokali\`**:`,
      `   \`\`\`bash`,
      `   BRAIN_DIR="${DEFAULT_BRAIN_PATH}"`,
      `   mkdir -p "$BRAIN_DIR/models"`,
      `   wget -c "https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf" \\`,
      `     -O "$BRAIN_DIR/models/gemma-3-1b-it-Q4_K_M.gguf"`,
      `   \`\`\``,
      ``,
      `2. **Push the Entire \`dd55b21d-c3d7-4cb6-8d3c-7d872aa4690c\` Folder + Model to the Xbox via SMB3**:`,
      `   \`\`\`bash`,
      `   cd "${DEFAULT_BRAIN_PATH}"`,
      `   smbclient //${ip}/DevelopmentFiles -U "${user}%${pass}" -m SMB3 \\`,
      `     -c "mkdir antigravity-brain; cd antigravity-brain; mkdir dd55b21d-c3d7-4cb6-8d3c-7d872aa4690c; cd dd55b21d-c3d7-4cb6-8d3c-7d872aa4690c; prompt OFF; recurse ON; mput *"`,
      `   \`\`\``,
    ].join('\n');
  }

  if (q.includes('ssh') && q.includes('smb')) {
    return [
      `### [${modelLabel}] SMB (:445) Working vs. SSH (:22) Closed on ${ip}`,
      ``,
      `1. **Why SMB Works While SSH Fails**:`,
      `   - Xbox OS enables \`LanmanServer\` (SMB3 on TCP 445) automatically as soon as the **Developer Folder** is configured.`,
      `   - However, the OpenSSH daemon (\`sshd\` on TCP 22) is disabled by default or restricted solely to \`DevToolsUser\` / \`SshUser\` until explicitly toggled in Windows Device Portal (\`:${port}\`).`,
      ``,
      `2. **Deploy Over Working SMB (No SSH Needed)**:`,
      `   \`\`\`bash`,
      `   smbclient //${ip}/DevelopmentFiles -U "${user}%${pass}" -m SMB3`,
      `   \`\`\``,
    ].join('\n');
  }

  if (q.includes('nt_status_logon_failure') || q.includes('logon') || q.includes('auth') || q.includes('password')) {
    return [
      `### [${modelLabel}] Fixing NT_STATUS_LOGON_FAILURE on ${ip}`,
      ``,
      `- **Force bare username + SMB3 + NTLMv2**:`,
      `  \`\`\`bash`,
      `  smbclient //${ip}/DevelopmentFiles -U "${user}%${pass}" -W WORKGROUP -m SMB3 --option="client ntlmv2 auth=yes"`,
      `  \`\`\``,
    ].join('\n');
  }

  return [
    `### [${modelLabel} — Offline Edge Inference]`,
    `Target Console: **${config.machineName}** (\`${ip}\` | SMB \`:445\` Active | WDP \`:${port}\`)`,
    `Local Brain Path: \`${DEFAULT_BRAIN_PATH}\``,
    ``,
    `Click **Push \`nitrokali\` Brain + Model to Xbox (SMB)** above or download the automated \`.sh\` script to stage the Hugging Face mobile model and restore \`dd55b21d-c3d7-4cb6-8d3c-7d872aa4690c\` directly onto \`//${ip}/DevelopmentFiles\`.`,
  ].join('\n');
}

export const AssistantDrawer: React.FC<AssistantDrawerProps> = ({
  isOpen,
  onClose,
  config,
}) => {
  const [selectedModel, setSelectedModel] = useState<ModelChoice>('gemini-nano-local');
  const [nanoStatus, setNanoStatus] = useState<'checking' | 'native-aicore' | 'local-embedded'>('checking');

  // Local Brain Path & Hugging Face Local GGUF Loader State
  const [showHfConfig, setShowHfConfig] = useState<boolean>(true);
  const [localBrainPath, setLocalBrainPath] = useState<string>(DEFAULT_BRAIN_PATH);
  const [selectedHfPresetId, setSelectedHfPresetId] = useState<string>(HF_MODEL_PRESETS[0].id);
  const [customHfRepo, setCustomHfRepo] = useState<string>('ggml-org/gemma-3-1b-it-GGUF');
  const [customHfFilename, setCustomHfFilename] = useState<string>('gemma-3-1b-it-Q4_K_M.gguf');
  const [localRuntimeUrl] = useState<string>('http://127.0.0.1:8080/v1/chat/completions');
  const [loadedLocalFile, setLoadedLocalFile] = useState<{ name: string; sizeMb: string } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      engineBadge: 'Gemini Nano Local + Brain SMB Sync',
      text: `Linked local \`nitrokali\` path:\n\`${DEFAULT_BRAIN_PATH}\`\n\nSince that is the build/brain that was on your Xbox before the files were deleted—and your **Xbox SMB (\`//${config.ip}/DevelopmentFiles\`) is working**—you can:\n1. **Download the Local Mobile Model (\`Gemma-3-1B-IT GGUF\`)** from Hugging Face straight into that \`dd55b21d-c3d7-4cb6-8d3c-7d872aa4690c\` folder on \`nitrokali\`.\n2. **Recursively Push the Whole Folder + Model Back to the Xbox Over SMB (\`:445\`)** in one command using the panel above!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    async function detectMobileNano() {
      try {
        const win = window as any;
        const lm = win.ai?.languageModel || win.LanguageModel;
        if (lm) {
          const caps = lm.capabilities ? await lm.capabilities() : { available: 'readily' };
          if (mounted && caps?.available && caps.available !== 'no') {
            setNanoStatus('native-aicore');
            return;
          }
        }
      } catch {
        // Fallback to embedded local inference
      }
      if (mounted) {
        setNanoStatus('local-embedded');
      }
    }
    detectMobileNano();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSelectPreset = (presetId: string) => {
    setSelectedHfPresetId(presetId);
    const found = HF_MODEL_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setCustomHfRepo(found.repo);
      setCustomHfFilename(found.file);
    }
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setLoadedLocalFile({ name: file.name, sizeMb });
    setCustomHfFilename(file.name);
    setSelectedModel('huggingface-local');
    setMessages((prev) => [
      ...prev,
      {
        id: `hf-load-${Date.now()}`,
        role: 'model',
        engineBadge: `Local GGUF: ${file.name}`,
        text: `Selected local model file **\`${file.name}\`** (${sizeMb} MB). Click **Push Brain + Model to Xbox (SMB)** above to copy it into \`${localBrainPath}\` and upload to \`//${config.ip}/DevelopmentFiles\`.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 1800);
  };

  const hfDownloadUrl = `https://huggingface.co/${customHfRepo.trim()}/resolve/main/${customHfFilename.trim()}`;
  const trimmedBrainPath = localBrainPath.trim() || DEFAULT_BRAIN_PATH;
  const brainFolderId =
    trimmedBrainPath.split('/').filter(Boolean).pop() || 'dd55b21d-c3d7-4cb6-8d3c-7d872aa4690c';

  const restoreAndPushOneLiner = `mkdir -p "${trimmedBrainPath}/models" && wget -c "${hfDownloadUrl}" -O "${trimmedBrainPath}/models/${customHfFilename.trim()}" && cd "${trimmedBrainPath}" && smbclient //${config.ip}/DevelopmentFiles -U "${config.username}%${config.password}" -m SMB3 -c 'mkdir "${brainFolderId}"; cd "${brainFolderId}"; prompt OFF; recurse ON; mput *; ls'`;

  const handleGenerateBrainRestore = () => {
    const localModelCfg = JSON.stringify(
      {
        provider: 'local-gguf-mobile',
        offline: true,
        hf_repo: customHfRepo.trim(),
        model_file: customHfFilename.trim(),
        xbox_smb_path: `D:\\DevelopmentFiles\\${brainFolderId}\\models\\${customHfFilename.trim()}`,
        nitrokali_source_path: `${trimmedBrainPath}/models/${customHfFilename.trim()}`,
      },
      null,
      2
    );

    setMessages((prev) => [
      ...prev,
      {
        id: `brain-restore-${Date.now()}`,
        role: 'model',
        engineBadge: `Brain Restore -> //${config.ip}/DevelopmentFiles`,
        text: [
          `### Restore \`${brainFolderId}\` + Local Hugging Face Model to Xbox Over SMB`,
          ``,
          `Run this in your **\`nitrokali\`** terminal to download **\`${customHfFilename.trim()}\`** from Hugging Face into \`${trimmedBrainPath}/models/\` and push the entire folder back onto your Xbox over **SMB (\`:445\`)**:`,
          ``,
          `\`\`\`bash`,
          restoreAndPushOneLiner,
          `\`\`\``,
          ``,
          `#### Generated Offline Model Config (\`model_config.json\`)`,
          `\`\`\`json`,
          localModelCfg,
          `\`\`\``,
        ].join('\n'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleDownloadBrainRestoreScript = () => {
    const script = [
      `#!/usr/bin/env bash`,
      `# ==============================================================================`,
      `# Restore nitrokali Antigravity Brain + Local Hugging Face Model to Xbox SMB`,
      `# Source Path: ${trimmedBrainPath}`,
      `# Target Xbox: //${config.ip}/DevelopmentFiles/${brainFolderId}`,
      `# ==============================================================================`,
      `set -e`,
      ``,
      `BRAIN_DIR="${trimmedBrainPath}"`,
      `BRAIN_ID="${brainFolderId}"`,
      `XBOX_IP="${config.ip}"`,
      `SMB_USER="${config.username}"`,
      `SMB_PASS="${config.password}"`,
      `HF_URL="${hfDownloadUrl}"`,
      `MODEL_FILE="${customHfFilename.trim()}"`,
      ``,
      `echo "[1/4] Preparing local brain directory: $BRAIN_DIR ..."`,
      `mkdir -p "$BRAIN_DIR/models"`,
      ``,
      `echo "[2/4] Downloading local mobile/edge GGUF model from Hugging Face ..."`,
      `if [ ! -f "$BRAIN_DIR/models/$MODEL_FILE" ]; then`,
      `  wget -c "$HF_URL" -O "$BRAIN_DIR/models/$MODEL_FILE"`,
      `else`,
      `  echo "      Model $MODEL_FILE already exists in $BRAIN_DIR/models/"`,
      `fi`,
      ``,
      `echo "[3/4] Writing offline local model_config.json into $BRAIN_DIR ..."`,
      `cat << 'EOF' > "$BRAIN_DIR/model_config.json"`,
      JSON.stringify(
        {
          provider: 'local-gguf-mobile',
          offline: true,
          hf_repo: customHfRepo.trim(),
          model_file: customHfFilename.trim(),
          xbox_smb_path: `D:\\DevelopmentFiles\\${brainFolderId}\\models\\${customHfFilename.trim()}`,
          nitrokali_source_path: `${trimmedBrainPath}/models/${customHfFilename.trim()}`,
        },
        null,
        2
      ),
      `EOF`,
      ``,
      `echo "[4/4] Recursively uploading $BRAIN_DIR to //$XBOX_IP/DevelopmentFiles/$BRAIN_ID over SMB3 ..."`,
      `cd "$BRAIN_DIR"`,
      `smbclient //$XBOX_IP/DevelopmentFiles -U "$SMB_USER%$SMB_PASS" -m SMB3 \\`,
      `  -c "mkdir $BRAIN_ID; cd $BRAIN_ID; prompt OFF; recurse ON; mput *; ls"`,
      ``,
      `echo "[+] Done! Restored $BRAIN_ID + $MODEL_FILE to Xbox at D:\\\\DevelopmentFiles\\\\$BRAIN_ID"`,
    ].join('\n');

    const blob = new Blob([script], { type: 'text/x-shellscript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restore_${brainFolderId}_to_xbox.sh`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (!customPrompt) setInput('');
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (selectedModel === 'huggingface-local') {
        const activeLabel = loadedLocalFile
          ? `HF Local (${loadedLocalFile.name})`
          : `HF Local (${customHfFilename})`;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1800);
          const localRes = await fetch(localRuntimeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              model: customHfFilename,
              messages: [
                {
                  role: 'system',
                  content: `You are an offline local Hugging Face assistant for Xbox DevKit (${config.ip}:${config.port}, SMB :445, user ${config.username}). Give concise Linux & SMB3 commands.`,
                },
                ...nextMessages.map((m) => ({
                  role: m.role === 'model' ? 'assistant' : 'user',
                  content: m.text,
                })),
              ],
              temperature: 0.3,
            }),
          });
          clearTimeout(timeoutId);

          if (localRes.ok) {
            const localData = await localRes.json();
            const replyText =
              localData?.choices?.[0]?.message?.content ||
              localData?.message?.content ||
              localData?.response;
            if (replyText) {
              setMessages((prev) => [
                ...prev,
                {
                  id: `model-${Date.now()}`,
                  role: 'model',
                  engineBadge: `${activeLabel} @ ${localRuntimeUrl}`,
                  text: replyText,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ]);
              setIsLoading(false);
              return;
            }
          }
        } catch {
          // Use embedded offline engine
        }

        const localReply = runLocalMobileNanoInference(textToSend, config, activeLabel);
        setMessages((prev) => [
          ...prev,
          {
            id: `model-${Date.now()}`,
            role: 'model',
            engineBadge: activeLabel,
            text: localReply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setIsLoading(false);
        return;
      }

      if (selectedModel === 'gemini-nano-local') {
        const win = window as any;
        const lm = win.ai?.languageModel || win.LanguageModel;

        if (lm) {
          try {
            const session = await lm.create({
              systemPrompt: `You are an on-device mobile Xbox DevKit assistant. Target IP: ${config.ip}, WDP Port: ${config.port}, SMB Port: 445, User: ${config.username}. Explain SMB vs SSH and Linux GDK commands concisely.`,
            });
            const nanoReply = await session.prompt(textToSend);
            if (session.destroy) session.destroy();

            setMessages((prev) => [
              ...prev,
              {
                id: `model-${Date.now()}`,
                role: 'model',
                engineBadge: 'Gemini Nano (Android AICore / window.ai)',
                text: nanoReply,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
            setIsLoading(false);
            return;
          } catch {
            // Fall through
          }
        }

        const localReply = runLocalMobileNanoInference(textToSend, config, 'Gemini Nano (Mobile Local)');
        setMessages((prev) => [
          ...prev,
          {
            id: `model-${Date.now()}`,
            role: 'model',
            engineBadge: 'Gemini Nano (On-Device Mobile Local)',
            text: localReply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          consoleContext: `Console: ${config.machineName}, IP: ${config.ip}, WDP Port: ${config.port}, SMB Port: ${config.smbPort}, SSH Port: 22, User: ${config.username}, Mode: ${config.hexCode} (${config.hardwareMode})`,
          messages: nextMessages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const botMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        engineBadge: selectedModel,
        text: data.reply || 'No response received.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const fallbackReply = runLocalMobileNanoInference(
        textToSend,
        config,
        'Offline Local Fallback'
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: 'model',
          engineBadge: 'Offline Local Fallback',
          text: fallbackReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setErrorMsg(null);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Push dd55b21d-c3d7-4cb6-8d3c-7d872aa4690c + model to Xbox SMB',
    'Why can I connect via SMB but not SSH?',
    'Fix NT_STATUS_LOGON_FAILURE on SMB',
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0b0e14] border-l border-[#1e293b] shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c2434] bg-[#0f141e]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-400">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Gemini Nano Mobile Local</span>
              <Sparkles className="w-3 h-3 text-emerald-400" />
            </h3>
            <p className="text-[10px] text-emerald-400/90 font-mono flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              <span>
                {selectedModel === 'gemini-nano-local'
                  ? nanoStatus === 'native-aicore'
                    ? 'On-Device AICore (window.ai) Active'
                    : 'On-Device Mobile Local Engine Active'
                  : selectedModel === 'huggingface-local'
                  ? `HF GGUF: ${loadedLocalFile ? loadedLocalFile.name : customHfFilename}`
                  : `Cloud: ${selectedModel}`}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowHfConfig((prev) => !prev)}
            className={`p-1.5 rounded border text-xs transition-colors ${
              showHfConfig
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-[#141b27] border-[#26334a] text-slate-400 hover:text-white'
            }`}
            title="Toggle Brain & Hugging Face SMB Sync Panel"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() =>
              setMessages([
                {
                  id: `welcome-${Date.now()}`,
                  role: 'model',
                  engineBadge: 'Gemini Nano (On-Device Mobile Local)',
                  text: `Local session reset for **${config.machineName}** (${config.ip}).`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ])
            }
            className="p-1.5 rounded bg-[#141b27] border border-[#26334a] text-slate-400 hover:text-white"
            title="Clear Conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded bg-[#141b27] border border-[#26334a] text-slate-400 hover:text-white"
            title="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Engine Mode Selector Bar */}
      <div className="px-4 py-2 bg-[#0d121b] border-b border-[#1a2333] flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
          Model:
        </span>
        <select
          value={selectedModel}
          onChange={(e) => {
            const val = e.target.value as ModelChoice;
            setSelectedModel(val);
            if (val === 'huggingface-local') setShowHfConfig(true);
          }}
          className="flex-1 bg-[#141b27] border border-emerald-500/40 rounded px-2 py-1 text-[11px] font-mono text-emerald-200 focus:outline-none focus:border-emerald-400"
        >
          <option value="gemini-nano-local">gemini-nano (Mobile On-Device Local)</option>
          <option value="huggingface-local">Hugging Face Local (.gguf / Ollama / llama.cpp)</option>
          <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Cloud Lite)</option>
          <option value="gemini-3.8-flash">gemini-3.8-flash (Cloud Standard)</option>
        </select>
      </div>

      {/* Brain Directory + Hugging Face Local GGUF SMB Deployer */}
      {showHfConfig && (
        <div className="p-3.5 bg-[#0e1420] border-b border-[#1f2b3f] space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Sync Brain + HF Model to Xbox (SMB :445)</span>
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".gguf,.bin,.onnx,.safetensors"
              onChange={handleLocalFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 rounded bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-200 text-[10px] font-semibold flex items-center gap-1 transition-colors"
            >
              <FolderOpen className="w-3 h-3" />
              <span>{loadedLocalFile ? 'Change .GGUF' : 'Pick Local .GGUF'}</span>
            </button>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-emerald-300 mb-0.5">
              Source Brain Folder on nitrokali:
            </label>
            <input
              type="text"
              value={localBrainPath}
              onChange={(e) => setLocalBrainPath(e.target.value)}
              className="w-full bg-[#141b27] border border-emerald-500/40 rounded px-2 py-1 text-[10px] font-mono text-emerald-100 focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-0.5">
              Local Mobile / Hugging Face Model (.GGUF):
            </label>
            <select
              value={selectedHfPresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="w-full bg-[#141b27] border border-[#26334a] rounded px-2 py-1 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-amber-400"
            >
              {HF_MODEL_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label} [{preset.size}]
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={customHfRepo}
              onChange={(e) => setCustomHfRepo(e.target.value)}
              placeholder="user/repo-GGUF"
              className="w-full bg-[#141b27] border border-[#26334a] rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-amber-400"
            />
            <input
              type="text"
              value={customHfFilename}
              onChange={(e) => setCustomHfFilename(e.target.value)}
              placeholder="model.gguf"
              className="w-full bg-[#141b27] border border-[#26334a] rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={handleGenerateBrainRestore}
              className="px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Push Brain + Model to Xbox (SMB)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadBrainRestoreScript}
              className="px-2.5 py-1.5 rounded bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 text-blue-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Download Restore Script (.sh)</span>
            </button>

            <button
              type="button"
              onClick={() => copyText(restoreAndPushOneLiner, 'restorecmd')}
              className="px-2 py-1 rounded bg-[#161f2e] hover:bg-[#1f2b40] border border-[#2a3952] text-[10px] font-mono text-slate-200 flex items-center gap-1"
            >
              {copiedCmd === 'restorecmd' ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              <span>Copy 1-Line SMB Push</span>
            </button>

            <a
              href={hfDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded bg-[#161f2e] hover:bg-[#1f2b40] border border-[#2a3952] text-[10px] font-mono text-amber-300 flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>Direct .GGUF</span>
            </a>
          </div>
        </div>
      )}

      {/* Quick Prompts */}
      <div className="px-4 py-2 border-b border-[#161d2a] bg-[#0d1118] flex items-center gap-1.5 overflow-x-auto">
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            onClick={() => handleSend(qp)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded bg-[#141b26] hover:bg-emerald-950/60 border border-[#232f42] hover:border-emerald-500/50 text-[11px] text-slate-300 hover:text-emerald-200 whitespace-nowrap transition-colors"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Scrollable Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-slate-500">
              {msg.role === 'model' ? (
                <>
                  <Terminal className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">
                    {msg.engineBadge || 'Gemini Nano Local'}
                  </span>
                </>
              ) : (
                <>
                  <User className="w-3 h-3 text-slate-400" />
                  <span>You</span>
                </>
              )}
              <span>·</span>
              <span>{msg.timestamp}</span>
            </div>

            <div
              className={`max-w-[90%] rounded-lg px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap font-sans ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#121824] border border-[#1f293d] text-slate-200'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-[#121824] border border-[#1f293d] rounded-lg px-3.5 py-2.5 w-fit">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Running local mobile model inference...</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-xs text-rose-200 font-mono">
            Error: {errorMsg}
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-[#1c2434] bg-[#0f141e] flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Gemini Nano (local mobile model) about SMB, SSH, or Stage 5..."
          className="flex-1 bg-[#141b27] border border-[#26334a] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
