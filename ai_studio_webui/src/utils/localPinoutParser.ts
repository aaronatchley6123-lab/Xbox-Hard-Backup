export interface ExtractedPinRow {
  signal: string;
  boardPoint: string;
  adapterPin: string;
  wireColor?: string;
  voltage?: string;
  notes?: string;
}

export interface OrganizedDocData {
  summary: string;
  detectedTarget?: string;
  boardRev?: string;
  voltageWarnings: string[];
  extractedPins: ExtractedPinRow[];
  benchChecklist?: string[];
  analyzedBy: string;
  analyzedAt: string;
}

export interface VaultItem {
  id: string;
  title: string;
  consoleTarget: string;
  boardRev: string;
  kind: 'photo' | 'doc' | 'bundle';
  filename?: string;
  mimeType?: string;
  fileSize?: number;
  assetFilename?: string;
  assetUrl?: string | null;
  contentText: string;
  tags: string[];
  pinnedToGuide: boolean;
  organized?: OrganizedDocData | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomConsoleTarget {
  id: string;
  label: string;
  logicVoltage: string;
  busNotes: string;
  createdAt: string;
}

export interface LocalLlmModelInfo {
  name: string;
  sizeBytes: number;
  parameterSize: string;
  quantization: string;
  supportsVision: boolean;
}

export interface LocalLlmStatus {
  reachable: boolean;
  provider: 'ollama' | 'openai' | null;
  baseUrl: string;
  isCloudContainer: boolean;
  binaries: {
    ollama: boolean;
    llamaServer: boolean;
    llamaCli: boolean;
  };
  models: LocalLlmModelInfo[];
  recommendedModels: Array<{ name: string; size: string; role: string }>;
  error: string | null;
}

const KNOWN_REV_REGEX =
  /\b(EDM-0[1-5][0-9]|VSM-01[0-9]|HEG-001|HAC-001-01|HAC-001|HDH-001|CFI-[127]0[0-9]{2}|J4E1|U3C3|CAT6243|AARDVARK|T239|Durango|Scarlett|Anaconda|Mariko|Erista)\b/gi;

const SIGNAL_KEYWORDS = [
  'GND',
  'VCC',
  'VDD',
  'CLK',
  'SCLK',
  'CMD',
  'DAT0',
  'DATA0',
  'RST',
  'SMC_RST_N',
  'TXD',
  'RXD',
  'UART_TX',
  'UART_RX',
  'KER_DBG_TXD',
  'KER_DBG_RXD',
  'SCL',
  'SDA',
  'SMBUS_CLK',
  'SMBUS_DATA',
  'CS0',
  'CS1',
  '~CS',
  'SDO',
  'SDI',
  'MOSI',
  'MISO',
  'TDI',
  'TDO',
  'TMS',
  'TCK',
  'TRST',
  'ADJ',
  'VOUT',
  'SP1',
  'SP2',
  'CPU',
  '~WP',
  '~HOLD',
  'UFS',
  'M-PHY',
];

function inferTargetFromText(combined: string): string {
  const lower = combined.toLowerCase();
  if (/switch\s*2|t239|ufs\s*3\.1/.test(lower)) return 'switch_2';
  if (/heg-001|switch\s*oled|kamikaze|interposer/.test(lower)) return 'switch_oled';
  if (/hac-001|hdh-001|switch\s*(v1|v2|lite)|picofly|erista|mariko|joy-con/.test(lower)) return 'switch_std';
  if (/edm-0|vsm-0|cfi-[127]|ps5|playstation\s*5|errlog|emc\s*uart/.test(lower)) return 'ps5_all';
  if (/series\s*x|scarlett|anaconda|aardvark/.test(lower)) return 'xbox_sx';
  if (/xbox\s*one|durango|j4e1|u3c3|cat6243|smc_rst/.test(lower)) return 'xbox1_phat';
  if (/ch347|waveshare/.test(lower)) return 'ch347_headers';
  return 'custom';
}

function inferWireColor(line: string): string {
  const lower = line.toLowerCase();
  if (/\bdark\s*blue\b/.test(lower) || (/\bgnd\b/.test(lower) && !/\bclk\b/.test(lower))) {
    return 'Dark Blue (GND)';
  }
  if (/\blight\s*blue\b|\bclk\b|\bsclk\b/.test(lower)) return 'Light Blue (CLK)';
  if (/\byellow\b|\bcmd\b/.test(lower)) return 'Yellow (CMD)';
  if (/\bgreen\b|\bdat0\b|\bdata0\b/.test(lower)) return 'Green (DAT0)';
  return '';
}

export function parsePinoutDocDeterministic(
  title: string,
  text: string,
  boardRevHint = ''
): { organized: OrganizedDocData; suggestedTags: string[] } {
  const combined = `${title}\n${boardRevHint}\n${text}`;
  const detectedTarget = inferTargetFromText(combined);

  const revMatches = Array.from(new Set((combined.match(KNOWN_REV_REGEX) || []).map((r) => r.trim())));
  const boardRev = boardRevHint || revMatches.slice(0, 3).join(' · ');

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const extractedPins: ExtractedPinRow[] = [];
  const seenKeys = new Set<string>();

  for (const line of lines) {
    if (line.length > 260) continue;
    const arrowOrSep = /^(?:[-*•]\s*)?(.+?)\s*(?:->|→|<->|=|:|\|)\s*(.+)$/.exec(line);
    const matchedSignal = SIGNAL_KEYWORDS.find((sig) =>
      new RegExp(`(^|[^A-Z0-9_])${sig.replace('~', '\\~')}([^A-Z0-9_]|$)`, 'i').test(line)
    );
    const hasPinRef = /\b(pin\s*\d+|gp\d+|j\d+e?\d*|u\d+[a-z]\d*|tp\d+|sp[12]|pad|via)\b/i.test(line);

    if ((arrowOrSep && (matchedSignal || hasPinRef)) || (matchedSignal && hasPinRef)) {
      const lhs = arrowOrSep ? arrowOrSep[1].trim() : matchedSignal || '';
      const rhs = arrowOrSep ? arrowOrSep[2].trim() : line;
      const vMatch = /\b(1\.1v|1\.2v|1\.8v|3\.3v|5v|12v)\b/i.exec(line);
      const rMatch = /(\d+\s*(?:Ω|ohm|ohms|kΩ|k))\b/i.exec(line);
      const sig = matchedSignal || lhs.slice(0, 28);
      const dedupeKey = `${sig.toLowerCase()}|${lhs.toLowerCase()}|${rhs.toLowerCase()}`;
      if (!seenKeys.has(dedupeKey) && extractedPins.length < 30) {
        seenKeys.add(dedupeKey);
        extractedPins.push({
          signal: sig,
          boardPoint: lhs.slice(0, 64),
          adapterPin: rhs.slice(0, 80),
          wireColor: inferWireColor(line),
          voltage: vMatch ? vMatch[1].toUpperCase() : '',
          notes: rMatch ? `Series/pull resistor noted: ${rMatch[1]}` : '',
        });
      }
    }
  }

  const voltageWarnings: string[] = [];
  if (/1\.8\s*v/i.test(combined)) {
    voltageWarnings.push('1.8V logic referenced — use a 1.8V level shifter on CH347 TXD/RXD (never drive 3.3V directly).');
  }
  if (/3\.3\s*v/i.test(combined) && /5\s*v/i.test(combined)) {
    voltageWarnings.push('Both 3.3V and 5V rails mentioned — keep CH347 switch on 3.3V and leave CH347 VCC disconnected on live targets.');
  }
  if (/ufs/i.test(combined)) {
    voltageWarnings.push('UFS storage uses high-speed differential pairs; incompatible with 1-bit eMMC/SD readers or SPI.');
  }
  if (/diode|0\.00v|short/i.test(combined)) {
    voltageWarnings.push('Document includes diode-mode / continuity checks — verify values before applying standby or battery power.');
  }

  const tagSet = new Set<string>();
  if (/\buart\b|115200|txd|rxd/i.test(combined)) tagSet.add('UART');
  if (/\bemmc\b|dat0|cmd|clk/i.test(combined)) tagSet.add('eMMC');
  if (/\bspi\b|nor\b|flashrom/i.test(combined)) tagSet.add('SPI NOR');
  if (/\bi2c\b|smbus|sda|scl|aardvark/i.test(combined)) tagSet.add('I2C / SMBus');
  if (/\bjtag\b|swd|tdi|tdo|tms|tck/i.test(combined)) tagSet.add('JTAG / SWD');
  if (/1\.8\s*v/i.test(combined)) tagSet.add('1.8V Logic');
  if (/3\.3\s*v/i.test(combined)) tagSet.add('3.3V Logic');
  if (/diode/i.test(combined)) tagSet.add('Diode Readings');
  if (/ufs/i.test(combined)) tagSet.add('UFS 3.1');

  const summaryParts: string[] = [];
  if (revMatches.length > 0) {
    summaryParts.push(`Detected identifiers: ${revMatches.join(', ')}.`);
  }
  if (extractedPins.length > 0) {
    summaryParts.push(`Extracted ${extractedPins.length} candidate pin/wire mapping line(s) from text.`);
  } else {
    summaryParts.push(
      'Indexed doc text locally without a running LLM daemon. Connect Ollama (e.g. qwen2.5:3b / qwen2.5vl:3b) for deep photo OCR & prose organization.'
    );
  }

  return {
    organized: {
      summary: summaryParts.join(' '),
      detectedTarget,
      boardRev,
      voltageWarnings,
      extractedPins,
      benchChecklist: [
        'Verify common GND continuity before connecting UART/SPI/SD leads.',
        'Meter target pad voltage in standby before driving TXD or VCC.',
      ],
      analyzedBy: 'deterministic-parser',
      analyzedAt: new Date().toISOString(),
    },
    suggestedTags: Array.from(tagSet),
  };
}

export function searchVaultDeterministic(
  query: string,
  items: VaultItem[],
  consoleTarget = 'all'
): Array<{ item: VaultItem; score: number; snippet: string }> {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  return items
    .filter((it) => consoleTarget === 'all' || it.consoleTarget === consoleTarget)
    .map((item) => {
      const blob = [
        item.title,
        item.consoleTarget,
        item.boardRev,
        item.tags.join(' '),
        item.contentText,
        item.organized?.summary || '',
        JSON.stringify(item.organized?.extractedPins || []),
      ].join('\n');
      const lower = blob.toLowerCase();
      let score = 0;
      for (const tok of tokens) {
        if (lower.includes(tok)) score += 2;
        if (item.title.toLowerCase().includes(tok) || item.boardRev.toLowerCase().includes(tok)) {
          score += 2;
        }
      }
      if (tokens.length === 0) score = 1;

      const sourceText = item.organized?.summary || item.contentText || item.filename || '';
      const firstHitIdx =
        tokens.length > 0
          ? tokens.reduce((best, tok) => {
              const i = sourceText.toLowerCase().indexOf(tok);
              return i !== -1 && (best === -1 || i < best) ? i : best;
            }, -1)
          : 0;
      const start = Math.max(0, firstHitIdx - 60);
      const snippet = sourceText.slice(start, start + 240).trim();
      return { item, score, snippet };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

export async function probeBrowserDirectOllama(baseUrl: string): Promise<LocalLlmStatus> {
  const cleanUrl = baseUrl.trim().replace(/\/+$/, '') || 'http://127.0.0.1:11434';
  try {
    const resp = await fetch(`${cleanUrl}/api/tags`);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const json = await resp.json();
    const models = Array.isArray(json?.models)
      ? json.models.map((m: any) => ({
          name: String(m.name || m.model || ''),
          sizeBytes: Number(m.size || 0),
          parameterSize: m.details?.parameter_size || '',
          quantization: m.details?.quantization_level || '',
          supportsVision: /(vl|vision|llava|minicpm-v|moondream|gemma3|pixtral)/i.test(
            String(m.name || '')
          ),
        }))
      : [];
    return {
      reachable: true,
      provider: 'ollama',
      baseUrl: cleanUrl,
      isCloudContainer: false,
      binaries: { ollama: true, llamaServer: false, llamaCli: false },
      models,
      recommendedModels: [
        { name: 'qwen2.5:3b', size: '~1.9 GB', role: 'Fast text & pinout JSON structuring' },
        { name: 'gemma3:4b', size: '~3.3 GB', role: 'Text + multimodal board photo vision' },
        { name: 'qwen2.5vl:3b', size: '~3.2 GB', role: 'OCR silkscreen labels & board photos' },
        { name: 'llama3.2:3b', size: '~2.0 GB', role: 'Lightweight bench doc research' },
      ],
      error: null,
    };
  } catch (err: any) {
    return {
      reachable: false,
      provider: null,
      baseUrl: cleanUrl,
      isCloudContainer: false,
      binaries: { ollama: false, llamaServer: false, llamaCli: false },
      models: [],
      recommendedModels: [
        { name: 'qwen2.5:3b', size: '~1.9 GB', role: 'Fast text & pinout JSON structuring' },
        { name: 'gemma3:4b', size: '~3.3 GB', role: 'Text + multimodal board photo vision' },
        { name: 'qwen2.5vl:3b', size: '~3.2 GB', role: 'OCR silkscreen labels & board photos' },
        { name: 'llama3.2:3b', size: '~2.0 GB', role: 'Lightweight bench doc research' },
      ],
      error: `Direct browser fetch to ${cleanUrl} failed (${err?.message || 'blocked/unreachable'}). Set OLLAMA_ORIGINS="*" when running Ollama locally or use Kali Server Proxy mode.`,
    };
  }
}

export async function callBrowserDirectOllamaOrganize(params: {
  baseUrl: string;
  model: string;
  title: string;
  docText: string;
  consoleTarget: string;
  boardRev: string;
  imageBase64s?: string[];
}): Promise<{ organized: OrganizedDocData; suggestedTags: string[] }> {
  const cleanUrl = params.baseUrl.trim().replace(/\/+$/, '') || 'http://127.0.0.1:11434';
  const systemPrompt = [
    'You are an offline hardware engineering assistant organizing console motherboard pinouts and repair docs.',
    'User bench wire colors: Dark Blue=GND, Light Blue=eMMC CLK, Yellow=eMMC CMD, Green=eMMC DAT0.',
    'Waveshare CH347 headers: UART(1:VCC,2:CTS,3:RTS,4:GND,5:TXD,6:RXD), SPI/I2C(1:VCC,2:SCL,3:VCC,4:SDO,5:SCK,6:CS1,7:GND,8:SDA,9:GND,10:SDI,11:CS0,12:NC), JTAG(1:VCC,2:TDI,3:TCK,4:TRST,5:GND,6:TDO,7:TMS,8:NC).',
    'Never fabricate pin numbers or board coordinates not visible in the doc/photo.',
    'Return STRICT JSON ONLY: {"summary":"string","detectedTarget":"string","boardRev":"string","tags":["string"],"voltageWarnings":["string"],"extractedPins":[{"signal":"string","boardPoint":"string","adapterPin":"string","wireColor":"string","voltage":"string","notes":"string"}],"benchChecklist":["string"]}',
  ].join('\n');

  const userMsg: any = {
    role: 'user',
    content: `Title: ${params.title}\nConsole Hint: ${params.consoleTarget}\nBoard Rev Hint: ${params.boardRev || 'unknown'}\n\n${params.docText || 'Inspect attached board image.'}`,
  };
  if (params.imageBase64s && params.imageBase64s.length > 0) {
    userMsg.images = params.imageBase64s.map((s) => s.replace(/^data:[^;]+;base64,/, '').trim());
  }

  const resp = await fetch(`${cleanUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: params.model,
      stream: false,
      format: 'json',
      options: { temperature: 0.15, num_ctx: 4096 },
      messages: [{ role: 'system', content: systemPrompt }, userMsg],
    }),
  });
  if (!resp.ok) {
    throw new Error(`Direct Ollama HTTP ${resp.status}`);
  }
  const data = await resp.json();
  const raw = String(data?.message?.content || '').trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const candidate = fence ? fence[1].trim() : raw;
  let parsed: any = {};
  try {
    parsed = JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end > start) {
      parsed = JSON.parse(candidate.slice(start, end + 1));
    }
  }
  return {
    organized: {
      summary: String(parsed?.summary || raw).trim(),
      detectedTarget: parsed?.detectedTarget ? String(parsed.detectedTarget) : undefined,
      boardRev: parsed?.boardRev ? String(parsed.boardRev) : undefined,
      voltageWarnings: Array.isArray(parsed?.voltageWarnings) ? parsed.voltageWarnings.map(String) : [],
      extractedPins: Array.isArray(parsed?.extractedPins) ? parsed.extractedPins : [],
      benchChecklist: Array.isArray(parsed?.benchChecklist) ? parsed.benchChecklist.map(String) : [],
      analyzedBy: `ollama-direct:${params.model}`,
      analyzedAt: new Date().toISOString(),
    },
    suggestedTags: Array.isArray(parsed?.tags) ? parsed.tags.map(String) : [],
  };
}

export async function callBrowserDirectOllamaResearch(params: {
  baseUrl: string;
  model: string;
  query: string;
  items: VaultItem[];
  consoleTarget: string;
}): Promise<{ answer: string; citations: Array<{ id: string; title: string; boardRev: string; consoleTarget: string }> }> {
  const cleanUrl = params.baseUrl.trim().replace(/\/+$/, '') || 'http://127.0.0.1:11434';
  const topDocs = searchVaultDeterministic(params.query, params.items, params.consoleTarget).slice(0, 6);
  const context =
    topDocs.length > 0
      ? topDocs
          .map(
            (d, i) =>
              `[Doc ${i + 1}: "${d.item.title}" | target=${d.item.consoleTarget} | rev=${d.item.boardRev || 'n/a'}]\n${(d.item.organized?.summary || d.item.contentText).slice(0, 1800)}`
          )
          .join('\n---\n')
      : 'No saved bench docs match yet.';

  const resp = await fetch(`${cleanUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: params.model,
      stream: false,
      options: { temperature: 0.2, num_ctx: 4096 },
      messages: [
        {
          role: 'system',
          content:
            'You are a local bench research assistant for hardware pinouts. Cite [Doc #] titles when referencing uploaded notes/photos. Never invent pin numbers not in context.',
        },
        {
          role: 'user',
          content: `Question: ${params.query}\n\nVault Documents:\n${context}`,
        },
      ],
    }),
  });
  if (!resp.ok) {
    throw new Error(`Direct Ollama HTTP ${resp.status}`);
  }
  const data = await resp.json();
  return {
    answer: String(data?.message?.content || '').trim(),
    citations: topDocs.map((d) => ({
      id: d.item.id,
      title: d.item.title,
      boardRev: d.item.boardRev,
      consoleTarget: d.item.consoleTarget,
    })),
  };
}
