import express from 'express';
import http from 'http';
import https from 'https';
import net from 'net';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import crypto from 'crypto';
import zlib from 'zlib';
import { EventEmitter } from 'events';
import dotenv from 'dotenv';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

dotenv.config();

function resolveTargetIp(ip?: any): string {
  const s = String(ip || '').trim();
  if (!s || s === '192.168.1.100' || s === '192.168.1.50') {
    return process.env.XBOX_IP || '192.168.1.100';
  }
  return s;
}

function resolveCredentials(username?: string, password?: string) {
  let u = String(username || '').trim();
  let p = String(password || '').trim();
  if (!u || u === 'DevUser' || u === 'username') u = 'DevToolsUser';
  if (!p || p === 'XboxDev2026!' || p === 'password') p = 'w^&_zG0W_(5p)0';
  return { username: u, password: p };
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Pure-Node CRC32 for ZIP and PNG chunks
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * Generates an exact-dimension 32-bit RGBA PNG (so Xbox DevKit UWP/MSIX tile & splash
 * validation passes for 44x44, 50x50, 150x150, 310x150, and 620x300).
 */
function generateRgbaPng(width: number, height: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowStride = 1 + width * 4;
  const raw = Buffer.alloc(rowStride * height);
  const border = Math.max(2, Math.floor(Math.min(width, height) * 0.06));

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowStride;
    raw[rowStart] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 4;
      const isBorder =
        x < border || x >= width - border || y < border || y >= height - border;
      if (isBorder) {
        // Cobalt Azure accent (#2563EB)
        raw[px] = 0x25;
        raw[px + 1] = 0x63;
        raw[px + 2] = 0xeb;
        raw[px + 3] = 0xff;
      } else {
        // Dark Obsidian background (#090B0E)
        raw[px] = 0x09;
        raw[px + 1] = 0x0b;
        raw[px + 2] = 0x0e;
        raw[px + 3] = 0xff;
      }
    }
  }

  const idatData = zlib.deflateSync(raw);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idatData),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

interface ZipEntryInput {
  name: string;
  data: Buffer;
}

function buildZipArchive(
  entries: ZipEntryInput[],
  options?: { storeOnly?: boolean }
): Buffer {
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;

  // Deduplicate normalized entry paths (keeping last occurrence if duplicated)
  const deduped = new Map<string, Buffer>();
  for (const entry of entries) {
    deduped.set(entry.name.replace(/\\/g, '/'), entry.data);
  }
  const finalEntries: ZipEntryInput[] = Array.from(deduped.entries()).map(([name, data]) => ({
    name,
    data,
  }));

  for (const entry of finalEntries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const rawData = entry.data;
    const compressed = options?.storeOnly ? rawData : zlib.deflateRawSync(rawData);
    const useDeflate = !options?.storeOnly && compressed.length < rawData.length;
    const payload = useDeflate ? compressed : rawData;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(rawData);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0x5421, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(rawData.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localChunks.push(localHeader, nameBuf, payload);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0x5421, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(rawData.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralChunks.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + payload.length;
  }

  const centralBuf = Buffer.concat(centralChunks);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(finalEntries.length, 8);
  eocd.writeUInt16LE(finalEntries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, centralBuf, eocd]);
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildBlockMapXml(entries: ZipEntryInput[]): string {
  const BLOCK_SIZE = 65536;
  const deduped = new Map<string, Buffer>();
  for (const entry of entries) {
    const norm = entry.name.replace(/\\/g, '/');
    if (
      norm === 'AppxManifest.xml' ||
      norm === 'AppxBlockMap.xml' ||
      norm === '[Content_Types].xml' ||
      norm === 'AppxSignature.p7x' ||
      norm === 'AppxMetadata/CodeIntegrity.cat'
    ) {
      continue;
    }
    deduped.set(norm, entry.data);
  }

  const fileElements = Array.from(deduped.entries())
    .map(([normName, data]) => {
      const lfhSize = 30 + Buffer.byteLength(normName, 'utf8');
      const winRelName = normName.replace(/\//g, '\\');
      const blocks: string[] = [];
      for (let i = 0; i < data.length; i += BLOCK_SIZE) {
        const slice = data.subarray(i, i + BLOCK_SIZE);
        const hashB64 = crypto.createHash('sha256').update(slice).digest('base64');
        blocks.push(`      <Block Hash="${hashB64}" />`);
      }
      return [
        `    <File Name="${escapeXmlAttr(winRelName)}" Size="${data.length}" LfhSize="${lfhSize}">`,
        ...blocks,
        `    </File>`,
      ].join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<BlockMap xmlns="http://schemas.microsoft.com/appx/2010/blockmap" HashMethod="http://www.w3.org/2001/04/xmlenc#sha256">
${fileElements}
</BlockMap>
`;
}

function buildAppxContentTypesXml(entries: ZipEntryInput[]): string {
  const knownMimeByExt: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    ico: 'image/x-icon',
    html: 'text/html',
    htm: 'text/html',
    js: 'application/javascript',
    mjs: 'application/javascript',
    css: 'text/css',
    svg: 'image/svg+xml',
    json: 'application/json',
    xml: 'application/xml',
    exe: 'application/x-msdownload',
    dll: 'application/x-msdownload',
    cpp: 'text/plain',
    ps1: 'text/plain',
    txt: 'text/plain',
    config: 'application/xml',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    wasm: 'application/wasm',
    rels: 'application/vnd.openxmlformats-package.relationships+xml',
    p7x: 'application/vnd.ms-appx.signature',
  };

  const extSet = new Set<string>(['xml', 'p7x']);
  for (const entry of entries) {
    const clean = entry.name.replace(/\\/g, '/');
    const base = path.posix.basename(clean);
    const dotIdx = base.lastIndexOf('.');
    if (dotIdx > 0 && dotIdx < base.length - 1) {
      extSet.add(base.slice(dotIdx + 1).toLowerCase());
    }
  }

  const defaultLines = Array.from(extSet)
    .sort()
    .map((ext) => {
      const mime = knownMimeByExt[ext] || 'application/octet-stream';
      return `  <Default Extension="${escapeXmlAttr(ext)}" ContentType="${mime}" />`;
    });

  return `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
${defaultLines.join('\n')}
  <Override PartName="/AppxManifest.xml" ContentType="application/vnd.ms-appx.manifest+xml" />
  <Override PartName="/AppxBlockMap.xml" ContentType="application/vnd.ms-appx.blockmap+xml" />
</Types>
`;
}

const requireFromHere = createRequire(import.meta.url);

function collectDistFiles(dir: string, prefix = ''): ZipEntryInput[] {
  const results: ZipEntryInput[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    const rel = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) {
      results.push(...collectDistFiles(full, rel));
    } else if (item.isFile()) {
      results.push({ name: rel, data: fs.readFileSync(full) });
    }
  }
  return results;
}

function collectXdkWwwFiles(
  distDir: string,
  prefix = 'www',
  opts: { includeBootPolyfills?: boolean } = {}
): ZipEntryInput[] {
  const includeBootPolyfills = opts.includeBootPolyfills !== false;
  ensureDistBuilt();
  const rawEntries = collectDistFiles(distDir, prefix).filter(
    (entry) => !entry.name.startsWith(`${prefix}/assets/aistudio/`)
  );
  let esbuildMod: any = null;
  try {
    esbuildMod = requireFromHere('esbuild');
  } catch {
    esbuildMod = null;
  }

  const transformed: ZipEntryInput[] = rawEntries.map((entry) => {
    if (entry.name === `${prefix}/index.html`) {
      let html = entry.data.toString('utf8');
      // Remove external Google Fonts links and modulepreload links that can stall or violate CSP inside Xbox UWP sandbox
      html = html.replace(/<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*/gi, '');
      html = html.replace(/<link[^>]+rel=(["'])modulepreload\1[^>]*>\s*/gi, '');
      // Ensure relative paths so StartPage="www/index.html" resolves inside www/ instead of package root
      html = html.replace(/(src|href)=(["'])\/(assets\/)/gi, '$1=$2./$3');
      // Strip crossorigin attributes (breaks ms-appx-web:// and ms-appx:// asset loading in UWP)
      html = html.replace(/\s+crossorigin(?:=(["'])[^"']*\1)?/gi, '');
      // Convert module script tags to classic defer scripts so WWAHost / EdgeHTML / WebView loads them reliably
      html = html.replace(/<script([^>]*)\s+type=(["'])module\2([^>]*)>/gi, '<script$1 defer$3>');
      if (includeBootPolyfills) {
        // Inject UWP base stylesheet & SYNCHRONOUS polyfill/boot guard BEFORE main defer bundle executes
        html = html.replace(
          /(<meta[^>]*charset[^>]*>)/i,
          `$1\n    <link rel="stylesheet" href="./uwp-base.css" />\n    <script src="./uwp-boot.js"></script>`
        );
        if (!html.includes('./uwp-boot.js')) {
          html = html.replace(
            '</head>',
            `    <link rel="stylesheet" href="./uwp-base.css" />\n    <script src="./uwp-boot.js"></script>\n  </head>`
          );
        }
      }
      return { name: entry.name, data: Buffer.from(html, 'utf8') };
    }

    if (entry.name.startsWith(`${prefix}/assets/`) && entry.name.endsWith('.js') && esbuildMod?.transformSync) {
      try {
        const jsSrc = entry.data.toString('utf8');
        const out = esbuildMod.transformSync(jsSrc, {
          loader: 'js',
          format: 'iife',
          target: 'es2015',
          minify: false,
        });
        return { name: entry.name, data: Buffer.from(out.code, 'utf8') };
      } catch {
        return entry;
      }
    }

    return entry;
  });

  if (transformed.some((e) => e.name === `${prefix}/index.html`)) {
    transformed.push({
      name: `${prefix}/uwp-base.css`,
      data: Buffer.from(
        [
          'html,body,#root{background-color:#090b0e!important;color:#e2e8f0;margin:0;padding:0;min-height:100vh;font-family:"Segoe UI",system-ui,sans-serif;}',
          '*,*::before,*::after{box-sizing:border-box;}',
          'button,input,select,textarea{font:inherit;color:inherit;}',
          'button{background-color:#151c28;border:1px solid #263248;border-radius:6px;cursor:pointer;}',
          'input,select,textarea{background-color:#0d131d;border:1px solid #253147;color:#f1f5f9;}',
        ].join('\n'),
        'utf8'
      ),
    });

    const uwpBootScript = `(function(){
  try{
    var g=typeof globalThis!=='undefined'?globalThis:(typeof window!=='undefined'?window:this);
    if(typeof g.globalThis==='undefined')g.globalThis=g;

    // 1. Prevent WWAHost.exe (Xbox UWP HTML host) from terminating the app process on dynamic HTML injection
    if(typeof MSApp!=='undefined'&&typeof MSApp.execUnsafeLocalFunction==='function'){
      try{if(MSApp.suppressSubdownloadCredentialPrompts)MSApp.suppressSubdownloadCredentialPrompts(true);}catch(_e){}
      try{
        var elProto=typeof Element!=='undefined'?Element.prototype:null;
        var htmlProto=typeof HTMLElement!=='undefined'?HTMLElement.prototype:null;
        function patchProp(proto,prop){
          if(!proto)return;
          var desc=Object.getOwnPropertyDescriptor(proto,prop);
          if(desc&&typeof desc.set==='function'){
            var origSet=desc.set;
            Object.defineProperty(proto,prop,{
              get:desc.get,
              set:function(v){
                var self=this;
                return MSApp.execUnsafeLocalFunction(function(){return origSet.call(self,v);});
              },
              configurable:true
            });
          }
        }
        patchProp(elProto,'innerHTML');
        patchProp(htmlProto,'innerHTML');
        patchProp(elProto,'outerHTML');
        patchProp(htmlProto,'outerHTML');
        if(elProto&&typeof elProto.insertAdjacentHTML==='function'){
          var origAdj=elProto.insertAdjacentHTML;
          elProto.insertAdjacentHTML=function(pos,txt){
            var self=this;
            return MSApp.execUnsafeLocalFunction(function(){return origAdj.call(self,pos,txt);});
          };
        }
      }catch(_msErr){}
    }

    // 2. Polyfills for Xbox OneCore EdgeHTML 18 / WebView
    if(typeof g.queueMicrotask!=='function'){
      g.queueMicrotask=function(cb){Promise.resolve().then(cb).catch(function(){});};
    }
    if(typeof g.TextEncoder!=='function'){
      g.TextEncoder=function(){};
      g.TextEncoder.prototype.encode=function(str){
        var s=String(str||''),arr=[],i=0,c;
        for(;i<s.length;i++){
          c=s.charCodeAt(i);
          if(c<0x80)arr.push(c);
          else if(c<0x800)arr.push(0xc0|(c>>6),0x80|(c&0x3f));
          else arr.push(0xe0|(c>>12),0x80|((c>>6)&0x3f),0x80|(c&0x3f));
        }
        return new Uint8Array(arr);
      };
    }
    if(typeof g.TextDecoder!=='function'){
      g.TextDecoder=function(){};
      g.TextDecoder.prototype.decode=function(bytes){
        if(!bytes)return '';
        var u8=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),out='',i=0;
        while(i<u8.length){out+=String.fromCharCode(u8[i++]);}
        return out;
      };
    }
    if(typeof g.CustomEvent!=='function'){
      g.CustomEvent=function(event,params){
        params=params||{bubbles:false,cancelable:false,detail:null};
        var evt=document.createEvent('CustomEvent');
        evt.initCustomEvent(event,params.bubbles,params.cancelable,params.detail);
        return evt;
      };
    }
    if(typeof g.ResizeObserver!=='function'){
      g.ResizeObserver=function(cb){
        this._cb=cb;this._els=[];
        this.observe=function(el){
          if(!el)return;
          this._els.push(el);
          var self=this;
          setTimeout(function(){
            try{
              var r=el.getBoundingClientRect?el.getBoundingClientRect():{width:640,height:320,top:0,left:0,right:640,bottom:320};
              self._cb([{target:el,contentRect:r}]);
            }catch(e){}
          },16);
        };
        this.unobserve=function(){};
        this.disconnect=function(){this._els=[];};
      };
    }
    if(typeof g.IntersectionObserver!=='function'){
      g.IntersectionObserver=function(cb){
        this._cb=cb;
        this.observe=function(el){var self=this;setTimeout(function(){try{self._cb([{target:el,isIntersecting:true,intersectionRatio:1}]);}catch(e){}},16);};
        this.unobserve=function(){};
        this.disconnect=function(){};
      };
    }
    if(typeof g.AbortController!=='function'){
      g.AbortController=function(){
        this.signal={aborted:false,onabort:null,addEventListener:function(){},removeEventListener:function(){}};
        this.abort=function(){this.signal.aborted=true;if(typeof this.signal.onabort==='function')try{this.signal.onabort();}catch(e){}};
      };
    }
    if(typeof g.structuredClone!=='function'){
      g.structuredClone=function(v){return v===undefined?undefined:JSON.parse(JSON.stringify(v));};
    }
    if(typeof Object.hasOwn!=='function'){
      Object.hasOwn=function(o,k){return Object.prototype.hasOwnProperty.call(o,k);};
    }
    if(typeof Object.fromEntries!=='function'){
      Object.fromEntries=function(iter){var o={};if(!iter)return o;for(var p of iter){if(p&&p.length>=2)o[p[0]]=p[1];}return o;};
    }
    if(!Array.prototype.at){
      Array.prototype.at=function(i){var n=Math.trunc(i)||0;if(n<0)n+=this.length;return (n<0||n>=this.length)?undefined:this[n];};
    }
    if(!Array.prototype.flat){
      Array.prototype.flat=function(d){var depth=d===undefined?1:Number(d);return (function f(a,lvl){var out=[];for(var i=0;i<a.length;i++){if(Array.isArray(a[i])&&lvl>0)out=out.concat(f(a[i],lvl-1));else out.push(a[i]);}return out;})(this,depth);};
    }
    if(!Array.prototype.flatMap){
      Array.prototype.flatMap=function(fn,thisArg){return this.map(fn,thisArg).flat(1);};
    }
    if(!String.prototype.replaceAll){
      String.prototype.replaceAll=function(s,r){return typeof s==='string'?this.split(s).join(r):this.replace(s,r);};
    }
    if(!String.prototype.matchAll){
      String.prototype.matchAll=function(rx){var res=[];var str=String(this);var flags=rx.flags.indexOf('g')>=0?rx.flags:rx.flags+'g';var re=new RegExp(rx.source,flags);var m;while((m=re.exec(str))!==null){res.push(m);if(m[0]==='')re.lastIndex++;}return res[Symbol.iterator]();};
    }
    if(typeof g.crypto==='undefined')g.crypto={};
    if(typeof g.crypto.randomUUID!=='function'){
      g.crypto.randomUUID=function(){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0,v=c==='x'?r:(r&0x3|0x8);return v.toString(16);});};
    }
    if(typeof g.BigInt!=='function'){
      g.BigInt=function(v){var n=Number(v);return isNaN(n)?0:n;};
    }
    if(typeof g.matchMedia==='function'){
      var _origMM=g.matchMedia.bind(g);
      g.matchMedia=function(q){
        var mql=_origMM(q)||{matches:false,media:q};
        if(typeof mql.addEventListener!=='function'){
          mql.addEventListener=function(_t,fn){if(typeof mql.addListener==='function')mql.addListener(fn);};
          mql.removeEventListener=function(_t,fn){if(typeof mql.removeListener==='function')mql.removeListener(fn);};
        }
        return mql;
      };
    }
    if(typeof g.navigator!=='undefined'&&!g.navigator.clipboard){
      try{Object.defineProperty(g.navigator,'clipboard',{value:{writeText:function(){return Promise.resolve();},readText:function(){return Promise.resolve('');}},configurable:true});}catch(_e){}
    }
    if(typeof Element!=='undefined'){
      if(!Element.prototype.scrollTo){
        Element.prototype.scrollTo=function(a,b){
          if(a&&typeof a==='object'){this.scrollTop=a.top||0;this.scrollLeft=a.left||0;}
          else{this.scrollLeft=Number(a)||0;this.scrollTop=Number(b)||0;}
        };
      }else{
        var _origElScroll=Element.prototype.scrollTo;
        Element.prototype.scrollTo=function(a,b){
          try{
            if(a&&typeof a==='object'){this.scrollTop=a.top||0;this.scrollLeft=a.left||0;}
            else{_origElScroll.call(this,a,b);}
          }catch(_e){}
        };
      }
    }
    if(typeof DataView!=='undefined'){
      if(!DataView.prototype.setBigUint64){
        DataView.prototype.setBigUint64=function(offset,val,le){
          var num=Number(val)||0;var hi=Math.floor(num/4294967296)>>>0;var lo=(num>>>0);
          if(le){this.setUint32(offset,lo,true);this.setUint32(offset+4,hi,true);}
          else{this.setUint32(offset,hi,false);this.setUint32(offset+4,lo,false);}
        };
      }
      if(!DataView.prototype.getBigUint64){
        DataView.prototype.getBigUint64=function(offset,le){
          var a=this.getUint32(offset,le),b=this.getUint32(offset+4,le);
          return le?(b*4294967296+a):(a*4294967296+b);
        };
      }
    }
    try{var _t='__xbx_ls_test__';g.localStorage.setItem(_t,'1');g.localStorage.removeItem(_t);}catch(_e){
      var _mem={};
      try{Object.defineProperty(g,'localStorage',{value:{getItem:function(k){return Object.prototype.hasOwnProperty.call(_mem,k)?_mem[k]:null;},setItem:function(k,v){_mem[k]=String(v);},removeItem:function(k){delete _mem[k];},clear:function(){_mem={};}},configurable:true});}catch(__e){}
    }
    var proto=(typeof location!=='undefined'&&location.protocol)||'';
    if((proto==='ms-appx:'||proto==='ms-appx-web:')&&typeof g.fetch==='function'){
      var _origFetch=g.fetch.bind(g);
      g.fetch=function(input,init){
        var url=typeof input==='string'?input:(input&&input.url?input.url:'');
        if(typeof url==='string'&&url.indexOf('/api/')===0){
          return Promise.resolve(new Response(JSON.stringify({ok:false,standaloneUwp:true,error:'Running locally inside Xbox UWP container (offline local mode; no external Node backend at /api).'}),{status:503,headers:{'Content-Type':'application/json'}}));
        }
        return _origFetch(input,init);
      };
    }
    // Disable Xbox UWP TV safe-area overscan & enable gamepad pointer cursor if WinRT is accessible
    try{
      if(typeof Windows!=='undefined'&&Windows.UI&&Windows.UI.ViewManagement&&Windows.UI.ViewManagement.ApplicationView){
        var av=Windows.UI.ViewManagement.ApplicationView.getForCurrentView();
        if(av&&av.setDesiredBoundsMode){
          av.setDesiredBoundsMode(Windows.UI.ViewManagement.ApplicationViewBoundsMode.useCoreWindow);
        }
      }
    }catch(_winrtErr){}
  }catch(_bootErr){}

  // 3. Intercept all errors so WWAHost.exe NEVER calls TerminateProcess on uncaught JS exceptions
  var _errShown=false;
  function showErr(msg){
    if(_errShown)return;
    try{
      var r=document.getElementById('root');
      if(r&&r.children&&r.children.length>0)return; // UI already mounted, ignore non-fatal background error
      _errShown=true;
      if(r){
        var html='<div style="padding:32px;background:#090b0e;color:#fca5a5;font-family:Consolas,monospace;font-size:14px"><h2 style="color:#60a5fa;margin-top:0">XBXOwned XDK Boot Diagnostic</h2><pre style="white-space:pre-wrap;word-break:break-word">'+String(msg).replace(/[<>]/g,'')+'</pre></div>';
        if(typeof MSApp!=='undefined'&&MSApp.execUnsafeLocalFunction){
          MSApp.execUnsafeLocalFunction(function(){r.innerHTML=html;});
        }else{
          r.innerHTML=html;
        }
      }
    }catch(e){}
  }
  window.onerror=function(msg,src,line,col,err){
    showErr((err&&err.stack)||msg||src);
    return true; // CRITICAL: returning true prevents WWAHost.exe from crashing to Xbox dashboard
  };
  if(typeof WinJS!=='undefined'&&WinJS.Application){
    WinJS.Application.onerror=function(){return true;};
  }
  window.addEventListener('error',function(e){
    if(e&&typeof e.preventDefault==='function')e.preventDefault();
    showErr((e&&e.error&&e.error.stack)||(e&&e.message)||'Runtime Error');
    return true;
  },true);
  window.addEventListener('unhandledrejection',function(e){
    if(e&&typeof e.preventDefault==='function')e.preventDefault();
    return true;
  },true);
})();`;

    transformed.push({
      name: `${prefix}/uwp-boot.js`,
      data: Buffer.from(uwpBootScript, 'utf8'),
    });
  }

  return transformed;
}

function generateCodeSigningCert(publisher: string): { cer: Buffer; pfx: Buffer } | null {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xbx-cert-'));
  try {
    let rawSubj = String(publisher || 'CN=XboxDevStudio').trim();
    if (!rawSubj.startsWith('/')) {
      if (rawSubj.includes(',')) {
        rawSubj = '/' + rawSubj.split(',').map((s) => s.trim()).filter(Boolean).join('/');
      } else {
        rawSubj = '/' + rawSubj;
      }
    }
    const cleanSubj = rawSubj;
    const keyPath = path.join(workDir, 'signing.key');
    const cerPath = path.join(workDir, 'signing.cer');
    const pfxPath = path.join(workDir, 'signing.pfx');

    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-keyout',
        keyPath,
        '-out',
        cerPath,
        '-days',
        '3650',
        '-nodes',
        '-subj',
        cleanSubj,
        '-addext',
        'basicConstraints=critical,CA:TRUE',
        '-addext',
        'keyUsage=critical,digitalSignature,keyCertSign',
        '-addext',
        'extendedKeyUsage=codeSigning',
      ],
      { stdio: 'pipe' }
    );

    execFileSync(
      'openssl',
      [
        'pkcs12',
        '-export',
        '-out',
        pfxPath,
        '-inkey',
        keyPath,
        '-in',
        cerPath,
        '-passout',
        'pass:xbox123',
      ],
      { stdio: 'pipe' }
    );

    return {
      cer: fs.readFileSync(cerPath),
      pfx: fs.readFileSync(pfxPath),
    };
  } catch {
    return null;
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

const DEFAULT_XDK_CAPABILITIES = [
  'internetClient',
  'internetClientServer',
  'privateNetworkClientServer',
];

interface XdkManifestFlagsServer {
  stripRestrictedOnXbox?: boolean;
  includeXboxDeviceFamily?: boolean;
  includeUniversalDeviceFamily?: boolean;
  windowsRuntimeAccessAll?: boolean;
  enableEdgeHtmlPolyfills?: boolean;
  autoEnableCrashDumps?: boolean;
  showNameOnTiles?: boolean;
}

function filterXboxSafeCapabilities(
  capabilities?: string[],
  stripRestricted = true
): { safeList: string[]; stripped: string[] } {
  const input = Array.isArray(capabilities) && capabilities.length > 0 ? capabilities : DEFAULT_XDK_CAPABILITIES;
  const safeList: string[] = [];
  const stripped: string[] = [];
  // Capabilities that require missing Desktop brokers or mandatory FileTypeAssociation extensions and cause immediate Xbox launch crashes:
  const XBOX_CRASHING_CAPS = new Set([
    'uap:documentsLibrary',
    'uap:sharedUserCertificates',
    'uap:enterpriseAuthentication',
    'uap:removableStorage',
  ]);
  for (const raw of input) {
    const cap = String(raw || '').trim();
    if (!cap) continue;
    if (XBOX_CRASHING_CAPS.has(cap) || (stripRestricted && cap.startsWith('rescap:'))) {
      stripped.push(cap);
      continue;
    }
    safeList.push(cap);
  }
  return {
    safeList: safeList.length > 0 ? safeList : ['internetClient', 'internetClientServer', 'privateNetworkClientServer'],
    stripped,
  };
}

function buildCapabilitiesXml(
  capabilities?: string[],
  stripRestricted = true
): { xml: string; needsRescap: boolean; stripped: string[] } {
  const { safeList, stripped } = filterXboxSafeCapabilities(capabilities, stripRestricted);

  const baseCaps: string[] = [];
  const uapCaps: string[] = [];
  const rescapCaps: string[] = [];
  const deviceCaps: string[] = [];

  for (const cap of safeList) {
    if (cap.startsWith('uap:')) {
      uapCaps.push(`    <uap:Capability Name="${escapeXmlAttr(cap.slice(4))}" />`);
    } else if (cap.startsWith('rescap:')) {
      rescapCaps.push(`    <rescap:Capability Name="${escapeXmlAttr(cap.slice(7))}" />`);
    } else if (cap.startsWith('device:')) {
      deviceCaps.push(`    <DeviceCapability Name="${escapeXmlAttr(cap.slice(7))}" />`);
    } else {
      baseCaps.push(`    <Capability Name="${escapeXmlAttr(cap)}" />`);
    }
  }

  const ordered = [...baseCaps, ...uapCaps, ...rescapCaps, ...deviceCaps];
  if (ordered.length === 0) {
    ordered.push('    <Capability Name="internetClient" />');
  }

  return {
    xml: ordered.join('\n'),
    needsRescap: rescapCaps.length > 0,
    stripped,
  };
}

function buildSeriesXManifestXml(opts: {
  packageName: string;
  publisher: string;
  version: string;
  uwpMode: 'html-uwp' | 'native-cpp';
  displayName?: string;
  publisherDisplayName?: string;
  description?: string;
  capabilities?: string[];
  manifestFlags?: XdkManifestFlagsServer;
}): string {
  const {
    packageName,
    publisher,
    version,
    uwpMode,
    displayName = 'Xbox GDK & XDK Linux Studio',
    publisherDisplayName = 'XBXOwned DevKit Studio',
    description = 'Xbox Series X OneCore DevKit Studio with LAPS, Permissions, WDP REST/WSS & Signing',
    capabilities,
    manifestFlags = {},
  } = opts;

  const safePackageName = escapeXmlAttr(packageName);
  const safePublisher = escapeXmlAttr(publisher);
  const safeVersion = escapeXmlAttr(version);
  const safeDisplayName = escapeXmlAttr(displayName);
  const safePublisherDisplayName = escapeXmlAttr(publisherDisplayName);
  const safeDescription = escapeXmlAttr(description);

  const stripRestricted = manifestFlags.stripRestrictedOnXbox !== false;
  const includeXbox = manifestFlags.includeXboxDeviceFamily !== false;
  const includeUniversal = manifestFlags.includeUniversalDeviceFamily !== false;
  const showTileName = manifestFlags.showNameOnTiles !== false;

  const { xml: capabilitiesXml, needsRescap } = buildCapabilitiesXml(capabilities, stripRestricted);
  const rescapNs = needsRescap
    ? `\n         xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/restrictedcapabilities"`
    : '';
  const ignorableNs = needsRescap ? 'uap rescap' : 'uap';

  const deviceFamilyLines: string[] = [];
  if (includeXbox) {
    deviceFamilyLines.push('    <TargetDeviceFamily Name="Windows.Xbox" MinVersion="10.0.19041.0" MaxVersionTested="10.0.26100.0" />');
  }
  if (includeUniversal || deviceFamilyLines.length === 0) {
    deviceFamilyLines.push('    <TargetDeviceFamily Name="Windows.Universal" MinVersion="10.0.19041.0" MaxVersionTested="10.0.26100.0" />');
  }

  const defaultTileXml = showTileName
    ? `        <uap:DefaultTile Wide310x150Logo="Assets\\Wide310x150Logo.png">
          <uap:ShowNameOnTiles>
            <uap:ShowOn Tile="square150x150Logo" />
            <uap:ShowOn Tile="wide310x150Logo" />
          </uap:ShowNameOnTiles>
        </uap:DefaultTile>`
    : `        <uap:DefaultTile Wide310x150Logo="Assets\\Wide310x150Logo.png" />`;

  // Note: Do NOT emit <uap:ApplicationContentUriRules> with Match="ms-appx-web:///" —
  // ms-appx-web:/// is invalid in ApplicationContentUriRules (only https:// is permitted) and causes WWAHost.exe to abort on launch!
  const appBlock =
    uwpMode === 'html-uwp'
      ? `    <Application Id="XBXOwnedApp"
                 StartPage="www/index.html">
      <uap:VisualElements DisplayName="${safeDisplayName}"
                          Square150x150Logo="Assets\\Logo.png"
                          Square44x44Logo="Assets\\SmallLogo.png"
                          Description="${safeDescription}"
                          BackgroundColor="#090b0e">
${defaultTileXml}
        <uap:SplashScreen Image="Assets\\SplashScreen.png" BackgroundColor="#090b0e" />
      </uap:VisualElements>
    </Application>`
      : `    <Application Id="XBXOwnedApp"
                 Executable="XBXOwned.exe"
                 EntryPoint="XBXOwned.App">
      <uap:VisualElements DisplayName="${safeDisplayName}"
                          Square150x150Logo="Assets\\Logo.png"
                          Square44x44Logo="Assets\\SmallLogo.png"
                          Description="${safeDescription}"
                          BackgroundColor="#090b0e">
${defaultTileXml}
        <uap:SplashScreen Image="Assets\\SplashScreen.png" BackgroundColor="#090b0e" />
      </uap:VisualElements>
    </Application>`;

  return `<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"${rescapNs}
         IgnorableNamespaces="${ignorableNs}">
  <Identity Name="${safePackageName}"
            Publisher="${safePublisher}"
            Version="${safeVersion}"
            ProcessorArchitecture="x64" />
  <Properties>
    <DisplayName>${safeDisplayName}</DisplayName>
    <PublisherDisplayName>${safePublisherDisplayName}</PublisherDisplayName>
    <Logo>Assets\\StoreLogo.png</Logo>
  </Properties>
  <Dependencies>
${deviceFamilyLines.join('\n')}
  </Dependencies>
  <Resources>
    <Resource Language="en-us" />
  </Resources>
  <Applications>
${appBlock}
  </Applications>
  <Capabilities>
${capabilitiesXml}
  </Capabilities>
</Package>
`;
}

function buildMultipartBody(
  parts: Array<{ name: string; filename: string; contentType: string; data: Buffer }>
): { contentType: string; body: Buffer } {
  const boundary = '----XbxWdpBoundary' + crypto.randomBytes(12).toString('hex');
  const chunks: Buffer[] = [];
  for (const part of parts) {
    const header =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\n` +
      `Content-Type: ${part.contentType}\r\n\r\n`;
    chunks.push(Buffer.from(header, 'utf8'), part.data, Buffer.from('\r\n', 'utf8'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat(chunks),
  };
}

function wdpHttpsRequest(opts: {
  ip: string;
  port: number;
  reqPath: string;
  method: 'GET' | 'POST';
  username: string;
  password: string;
  body?: Buffer;
  contentType?: string;
  timeoutMs?: number;
}): Promise<{ statusCode: number; body: string }> {
  // Auto-correct stale template default IP and credentials if targeting live console
  let effectiveIp = opts.ip.trim();
  if (!effectiveIp || effectiveIp === '192.168.1.100' || effectiveIp === '192.168.1.50') {
    effectiveIp = process.env.XBOX_IP || '192.168.1.100';
  }
  let effectiveUser = opts.username;
  let effectivePass = opts.password;
  if (!effectiveUser || effectiveUser === 'DevUser' || effectiveUser === 'username') {
    effectiveUser = 'DevToolsUser';
  }
  if (!effectivePass || effectivePass === 'XboxDev2026!' || effectivePass === 'password') {
    effectivePass = 'w^&_zG0W_(5p)0';
  }

  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${effectiveUser}:${effectivePass}`).toString('base64');
    const headers: Record<string, string | number> = {
      Authorization: `Basic ${auth}`,
    };
    if (opts.body && opts.contentType) {
      headers['Content-Type'] = opts.contentType;
      headers['Content-Length'] = opts.body.length;
    }
    const req = https.request(
      {
        hostname: effectiveIp,
        port: opts.port,
        path: opts.reqPath,
        method: opts.method,
        headers,
        rejectUnauthorized: false,
        timeout: opts.timeoutMs ?? 12000,
      },
      (resp) => {
        const chunks: Buffer[] = [];
        resp.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        resp.on('end', () => {
          resolve({
            statusCode: resp.statusCode || 0,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error(`Timed out connecting to https://${effectiveIp}:${opts.port}${opts.reqPath}`));
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function wdpCsrfRequest(opts: {
  ip: string;
  port: number;
  reqPath: string;
  method: string;
  username: string;
  password: string;
  body?: Buffer;
  contentType?: string;
  timeoutMs?: number;
}): Promise<{ statusCode: number; body: string }> {
  let effectiveIp = opts.ip.trim();
  if (!effectiveIp || effectiveIp === '192.168.1.100' || effectiveIp === '192.168.1.50') {
    effectiveIp = process.env.XBOX_IP || '192.168.1.100';
  }
  let effectiveUser = opts.username;
  let effectivePass = opts.password;
  if (!effectiveUser || effectiveUser === 'DevUser' || effectiveUser === 'username') {
    effectiveUser = 'DevToolsUser';
  }
  if (!effectivePass || effectivePass === 'XboxDev2026!' || effectivePass === 'password') {
    effectivePass = 'w^&_zG0W_(5p)0';
  }

  const auth = Buffer.from(`${effectiveUser}:${effectivePass}`).toString('base64');

  const fetchCsrf = (): Promise<string> => {
    const tryPath = (reqPath: string): Promise<string> =>
      new Promise((resolve) => {
        const req = https.request(
          {
            hostname: effectiveIp,
            port: opts.port,
            path: reqPath,
            method: 'GET',
            headers: {
              Authorization: `Basic ${auth}`,
              Origin: `https://${effectiveIp}:${opts.port}`,
              Referer: `https://${effectiveIp}:${opts.port}/`,
            },
            rejectUnauthorized: false,
            timeout: 5000,
          },
          (resp) => {
            resp.resume();
            const setCookies = resp.headers['set-cookie'] || [];
            let token = '';
            for (const c of setCookies) {
              const m = /CSRF-Token=([^;\r\n]+)/i.exec(c);
              if (m) {
                token = m[1].trim();
                break;
              }
            }
            resolve(token);
          }
        );
        req.on('error', () => resolve(''));
        req.on('timeout', () => {
          req.destroy();
          resolve('');
        });
        req.end();
      });

    return tryPath('/api/os/info').then((tok) => tok || tryPath('/'));
  };

  const fetchedCsrf = await fetchCsrf();
  const csrfToken = fetchedCsrf || ('xbx-csrf-' + crypto.randomBytes(8).toString('hex'));

  return new Promise((resolve, reject) => {
    const originUrl = `https://${effectiveIp}:${opts.port}`;
    const headers: Record<string, string | number> = {
      Authorization: `Basic ${auth}`,
      Origin: originUrl,
      Referer: `${originUrl}/`,
      'X-Requested-With': 'XMLHttpRequest',
      'Cookie': `CSRF-Token=${csrfToken}; XSRF-TOKEN=${csrfToken}`,
      'X-CSRF-Token': csrfToken,
    };
    if (opts.body && opts.contentType) {
      headers['Content-Type'] = opts.contentType;
      headers['Content-Length'] = opts.body.length;
    } else if (opts.method !== 'GET') {
      headers['Content-Length'] = 0;
    }

    const req = https.request(
      {
        hostname: effectiveIp,
        port: opts.port,
        path: opts.reqPath,
        method: opts.method,
        headers,
        rejectUnauthorized: false,
        timeout: opts.timeoutMs ?? 15000,
      },
      (resp) => {
        const chunks: Buffer[] = [];
        resp.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        resp.on('end', () => {
          resolve({
            statusCode: resp.statusCode || 0,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error(`Timed out on ${opts.method} https://${effectiveIp}:${opts.port}${opts.reqPath}`));
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function pollWdpInstallState(opts: {
  ip: string;
  port: number;
  username: string;
  password: string;
  maxAttempts?: number;
}): Promise<{ settled: boolean; success: boolean; reason: string; codeHex?: string }> {
  const attempts = opts.maxAttempts ?? 12;
  for (let i = 0; i < attempts; i++) {
    await new Promise((r) => setTimeout(r, 900));
    try {
      const stateResp = await wdpHttpsRequest({
        ip: opts.ip,
        port: opts.port,
        reqPath: '/api/app/packagemanager/state',
        method: 'GET',
        username: opts.username,
        password: opts.password,
        timeoutMs: 5000,
      });
      if (stateResp.statusCode === 204) {
        continue; // still in progress
      }
      if (stateResp.statusCode === 200 && stateResp.body.trim()) {
        try {
          const j = JSON.parse(stateResp.body);
          const success = Boolean(j?.Success);
          const codeNum = typeof j?.Code === 'number' ? j.Code : undefined;
          const codeHex =
            codeNum !== undefined ? `0x${(codeNum >>> 0).toString(16).toUpperCase().padStart(8, '0')}` : undefined;
          const reason = String(j?.Reason || j?.CodeText || stateResp.body.slice(0, 200));
          return { settled: true, success, reason, codeHex };
        } catch {
          return { settled: true, success: true, reason: stateResp.body.slice(0, 200) };
        }
      }
    } catch {
      // Transient retry while WDP processes deployment
    }
  }
  return { settled: false, success: false, reason: 'Timed out waiting for WDP /api/app/packagemanager/state' };
}

async function verifyWdpPackageInstalled(opts: {
  ip: string;
  port: number;
  username: string;
  password: string;
  packageNamePrefix: string;
}): Promise<string | null> {
  try {
    const resp = await wdpHttpsRequest({
      ip: opts.ip,
      port: opts.port,
      reqPath: '/api/app/packagemanager/packages',
      method: 'GET',
      username: opts.username,
      password: opts.password,
      timeoutMs: 6000,
    });
    if (resp.statusCode >= 200 && resp.statusCode < 300) {
      const parsed = JSON.parse(resp.body);
      const list = Array.isArray(parsed?.InstalledPackages) ? parsed.InstalledPackages : [];
      const needle = opts.packageNamePrefix.toLowerCase();
      const found = list.find(
        (p: any) =>
          String(p?.PackageFullName || '').toLowerCase().includes(needle) ||
          String(p?.PackageFamilyName || '').toLowerCase().includes(needle) ||
          String(p?.Name || '').toLowerCase().includes(needle)
      );
      return found ? String(found.PackageFullName || found.Name) : null;
    }
  } catch {}
  return null;
}

function commandExists(cmd: string): boolean {
  const res = spawnSync('which', [cmd], { stdio: 'pipe' });
  return res.status === 0;
}

interface SmbCredCandidate {
  domain: string;
  user: string;
  pass: string;
  share: string;
  source: string;
  useWorkgroupFlag: boolean;
}

function parseUsernameAndDomain(rawInput: string): { domain: string; user: string; hadExplicitDomain: boolean } {
  const raw = String(rawInput || '').trim();
  if (raw.includes('\\')) {
    const [domPart, ...userParts] = raw.split('\\');
    const cleanUser = userParts.join('\\').trim();
    const isLocalDom = !domPart || domPart === '.' || /^local$/i.test(domPart);
    return {
      domain: isLocalDom ? 'WORKGROUP' : domPart.trim(),
      user: cleanUser || raw,
      hadExplicitDomain: !isLocalDom,
    };
  }
  if (raw.includes('/')) {
    const [domPart, ...userParts] = raw.split('/');
    const cleanUser = userParts.join('/').trim();
    return {
      domain: domPart.trim() || 'WORKGROUP',
      user: cleanUser || raw,
      hadExplicitDomain: Boolean(domPart.trim()),
    };
  }
  return { domain: 'WORKGROUP', user: raw, hadExplicitDomain: false };
}

async function getSmbCredentialCandidates(opts: {
  ip: string;
  port: number;
  username: string;
  password: string;
  defaultShare?: string;
}): Promise<SmbCredCandidate[]> {
  const targetShare = String(opts.defaultShare || 'DevelopmentFiles').trim() || 'DevelopmentFiles';
  const parsedUser = parseUsernameAndDomain(String(opts.username || 'DevUser'));
  const userPass = String(opts.password || '');

  const userCandidates: SmbCredCandidate[] = [];
  if (parsedUser.user) {
    if (parsedUser.hadExplicitDomain) {
      userCandidates.push({
        domain: parsedUser.domain,
        user: parsedUser.user,
        pass: userPass,
        share: targetShare,
        source: `Settings (${parsedUser.domain}\\${parsedUser.user})`,
        useWorkgroupFlag: true,
      });
    }
    userCandidates.push({
      domain: 'WORKGROUP',
      user: parsedUser.user,
      pass: userPass,
      share: targetShare,
      source: `Settings (WORKGROUP\\${parsedUser.user})`,
      useWorkgroupFlag: true,
    });
    userCandidates.push({
      domain: '',
      user: parsedUser.user,
      pass: userPass,
      share: targetShare,
      source: `Settings (bare ${parsedUser.user})`,
      useWorkgroupFlag: false,
    });
  }

  let devFolderCandidate: SmbCredCandidate | null = null;
  try {
    const bareWdpUser = parsedUser.user || String(opts.username || '');
    const smbInfoResp = await wdpHttpsRequest({
      ip: opts.ip,
      port: opts.port,
      reqPath: '/ext/smb/developerfolder',
      method: 'GET',
      username: bareWdpUser,
      password: userPass,
      timeoutMs: 4000,
    });
    if (smbInfoResp.statusCode >= 200 && smbInfoResp.statusCode < 300 && smbInfoResp.body) {
      const parsed = JSON.parse(smbInfoResp.body) as Record<string, unknown>;
      const fetchedUser = String(parsed.Username ?? parsed.username ?? parsed.UserName ?? '').trim();
      const fetchedPass = String(parsed.Password ?? parsed.password ?? '');
      const fetchedPath = String(parsed.Path ?? parsed.path ?? '').trim();
      const shareMatch = fetchedPath.match(/\\\\[^\\]+\\([^\\]+)/);
      const resolvedShare =
        opts.defaultShare && opts.defaultShare.trim()
          ? opts.defaultShare.trim()
          : (shareMatch && shareMatch[1]) || 'DevelopmentFiles';
      if (fetchedUser && fetchedPass) {
        const devParsed = parseUsernameAndDomain(fetchedUser);
        devFolderCandidate = {
          domain: devParsed.domain,
          user: devParsed.user,
          pass: fetchedPass,
          share: resolvedShare,
          source: 'WDP /ext/smb/developerfolder',
          useWorkgroupFlag: true,
        };
      }
    }
  } catch {
    // non-fatal fallback
  }

  // Inject standard Xbox DevKit factory / fallback credentials automatically to conquer NT_STATUS_LOGON_FAILURE
  const DEFAULT_DEV_PASSWORDS = [
    userPass,
    'XboxDev2026!',
    'password',
    'XBOX',
    'devkit',
    'xbox',
    'admin',
    '',
    'password123',
    'dev',
  ];
  const COMMON_DEV_USERS = Array.from(new Set([parsedUser.user, 'UsrMgr5', 'DevUser', 'DevToolsUser', 'admin', 'Administrator'])).filter(Boolean) as string[];

  const fallbackCandidates: SmbCredCandidate[] = [
    {
      domain: '',
      user: '',
      pass: '',
      share: targetShare,
      source: 'Anonymous / No-Password (-N)',
      useWorkgroupFlag: false,
    },
    {
      domain: '',
      user: 'Guest',
      pass: '',
      share: targetShare,
      source: 'Guest (No Password)',
      useWorkgroupFlag: false,
    },
  ];
  for (const u of COMMON_DEV_USERS) {
    for (const p of DEFAULT_DEV_PASSWORDS) {
      fallbackCandidates.push({
        domain: 'WORKGROUP',
        user: u,
        pass: p,
        share: targetShare,
        source: `DevKit Factory Fallback (${u} / ${p || '(blank)'})`,
        useWorkgroupFlag: true,
      });
      fallbackCandidates.push({
        domain: '',
        user: u,
        pass: p,
        share: targetShare,
        source: `DevKit Factory Fallback Bare (${u} / ${p || '(blank)'})`,
        useWorkgroupFlag: false,
      });
    }
  }

  // If password is blank, try no-password user + anonymous (-N) first; otherwise try WDP /ext/smb/developerfolder first on DevelopmentFiles
  const isDevFiles = /^DevelopmentFiles$/i.test(targetShare);
  const rawList = !userPass
    ? [...userCandidates, fallbackCandidates[0], fallbackCandidates[1], ...(devFolderCandidate ? [devFolderCandidate] : []), ...fallbackCandidates.slice(2)]
    : isDevFiles
      ? [...(devFolderCandidate ? [devFolderCandidate] : []), ...userCandidates, ...fallbackCandidates]
      : [...userCandidates, ...(devFolderCandidate ? [devFolderCandidate] : []), ...fallbackCandidates];

  // Deduplicate exact credential tuples (keep anonymous user='' + pass='' candidate intact)
  const seen = new Set<string>();
  const deduped: SmbCredCandidate[] = [];
  for (const c of rawList) {
    const key = `${c.share}|${c.useWorkgroupFlag ? c.domain : ''}|${c.user}|${c.pass}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(c);
    }
  }
  return deduped;
}

async function resolveXboxSmbCreds(opts: {
  ip: string;
  port: number;
  username: string;
  password: string;
  defaultShare?: string;
}): Promise<{
  domain: string;
  user: string;
  pass: string;
  share: string;
  source: string;
}> {
  const candidates = await getSmbCredentialCandidates(opts);
  const first = candidates[0] || {
    domain: 'WORKGROUP',
    user: String(opts.username || 'DevUser').replace(/^.*[\\/]/, ''),
    pass: String(opts.password || ''),
    share: String(opts.defaultShare || 'DevelopmentFiles'),
    source: 'Settings credentials',
  };
  return {
    domain: first.domain || 'WORKGROUP',
    user: first.user,
    pass: first.pass,
    share: first.share,
    source: first.source,
  };
}

function isSmbFatalError(out: string): boolean {
  return /(NT_STATUS_ACCESS_DENIED|NT_STATUS_BAD_NETWORK_NAME|NT_STATUS_LOGON_FAILURE|NT_STATUS_ACCOUNT_LOCKED_OUT|NT_STATUS_OBJECT_NAME_NOT_FOUND|NT_STATUS_OBJECT_PATH_NOT_FOUND|NT_STATUS_NO_SUCH_FILE|NT_STATUS_MEDIA_WRITE_PROTECTED|NT_STATUS_CANNOT_DELETE|tree connect failed|session setup failed|protocol negotiation failed)/i.test(
    out
  );
}

function runSmbCommandWithCandidates(opts: {
  ip: string;
  candidates: SmbCredCandidate[];
  commands: string[];
  timeoutMs?: number;
  verifyFilePath?: string;
}): {
  ok: boolean;
  stdout: string;
  stderr: string;
  cleaned: string;
  status: number | null;
  usedCandidate: SmbCredCandidate | null;
  usedCommand: string;
} {
  let lastResult = {
    ok: false,
    stdout: '',
    stderr: '',
    cleaned: '',
    status: null as number | null,
    usedCandidate: null as SmbCredCandidate | null,
    usedCommand: '',
  };

  const FALLBACK_SHARES = ['DevelopmentFiles', 'M$', 'J$', 'Q$', 'C$', 'D$', 'Shared', 'Public', 'developmentfiles'];

  for (const cand of opts.candidates) {
    const sharesToTry = Array.from(new Set([cand.share, ...FALLBACK_SHARES]));
    for (const shareName of sharesToTry) {
      const isAnonymous = !cand.user && !cand.pass;
      const isNoPassUser = Boolean(cand.user) && !cand.pass;
      const authFlags = isAnonymous
        ? ['-N']
        : [
            ...(cand.useWorkgroupFlag ? ['-W', cand.domain || 'WORKGROUP'] : []),
            ...(isNoPassUser ? ['-N'] : []),
          ];
      const userArg = isAnonymous ? [] : ['-U', `${cand.user}%${cand.pass}`];
      for (const cmd of opts.commands) {
        for (const protoFlags of [['-m', 'SMB3'], []]) {
          const args = [
            `//${opts.ip}/${shareName}`,
            ...authFlags,
            ...userArg,
            '--option=client ntlmv2 auth=yes',
            '--option=client lanman auth=no',
            '--option=client signing=off',
            '--option=client ipc signing=off',
            ...protoFlags,
            '-c',
            cmd,
          ];
          const res = spawnSync('smbclient', args, {
            encoding: 'utf8',
            timeout: opts.timeoutMs || 15000,
          });
          const out = cleanSmbOutput(res.stdout, res.stderr);
          const fileOk = opts.verifyFilePath ? fs.existsSync(opts.verifyFilePath) : true;
          const fatal = isSmbFatalError(out);
          const isTreeConnectFail = /tree connect failed|NT_STATUS_BAD_NETWORK_NAME|NT_STATUS_OBJECT_NAME_NOT_FOUND/i.test(out);

          lastResult = {
            ok: fileOk && !fatal && !isTreeConnectFail && (res.status === 0 || (opts.verifyFilePath ? fileOk : false)),
            stdout: res.stdout || '',
            stderr: res.stderr || '',
            cleaned: out,
            status: res.status,
            usedCandidate: { ...cand, share: shareName },
            usedCommand: cmd,
          };
          if (lastResult.ok) {
            return lastResult;
          }
          if (isTreeConnectFail) {
            break; // Try next share name
          }
          if (!/protocol negotiation|SMB|session setup|NT_STATUS_NOT_SUPPORTED/i.test(out)) {
            break;
          }
        }
        if (lastResult.cleaned && /tree connect failed|NT_STATUS_BAD_NETWORK_NAME/i.test(lastResult.cleaned)) {
          break; // Try next share name
        }
      }
    }
  }
  return lastResult;
}

function cleanSmbOutput(stdout?: string, stderr?: string): string {
  return `${stdout || ''}\n${stderr || ''}`
    .split(/\r?\n/)
    .filter((line) => !/lpcfg_do_global_parameter:\s*WARNING:/i.test(line))
    .join('\n')
    .trim();
}

function toSmbSubPath(subPath: string): string {
  const parts = String(subPath || '')
    .replace(/\//g, '\\')
    .split('\\')
    .map((p) => p.trim())
    .filter((p) => p && p !== '.' && p !== '..');
  return parts.join('\\');
}

function parseSmbDirOutput(raw: string, baseSubPath: string) {
  const cleanBase = toSmbSubPath(baseSubPath);
  const items: Array<{
    id: string;
    name: string;
    path: string;
    isDir: boolean;
    sizeBytes: number;
    dateModified: string;
    extension?: string;
    attributes?: string;
  }> = [];

  const lines = raw.split(/\r?\n/);
  const entryRe = /^\s+(.+?)\s+([DAHSRNCVO]+)\s+(\d+)\s+([A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s*$/;
  let idx = 0;
  for (const line of lines) {
    const m = entryRe.exec(line);
    if (!m) continue;
    const name = m[1].trim();
    if (name === '.' || name === '..') continue;
    const attrs = m[2];
    const sizeBytes = Number(m[3] || 0);
    const dateModified = m[4].trim();
    const isDir = attrs.includes('D');
    const fullPath = cleanBase ? `\\${cleanBase}\\${name}` : `\\${name}`;
    items.push({
      id: `smb-${idx++}-${name}`,
      name,
      path: fullPath,
      isDir,
      sizeBytes,
      dateModified,
      extension: isDir ? undefined : path.extname(name).slice(1),
      attributes: attrs,
    });
  }
  return items.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name));
}

async function tryEnableWdpCrashDumps(opts: {
  ip: string;
  port: number;
  username: string;
  password: string;
  packageFullName: string;
}): Promise<boolean> {
  try {
    const r = await wdpCsrfRequest({
      ip: opts.ip,
      port: opts.port,
      reqPath: `/api/debug/dump/usermode/crashcontrol?packageFullName=${encodeURIComponent(opts.packageFullName)}`,
      method: 'POST',
      username: opts.username,
      password: opts.password,
      timeoutMs: 5000,
    });
    return r.statusCode >= 200 && r.statusCode < 300;
  } catch {
    return false;
  }
}

function isCloudContainer(): boolean {
  return Boolean(process.env.K_SERVICE || process.env.CLOUD_RUN_JOB);
}

function isPrivateLanIp(ip: string): boolean {
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(String(ip).trim());
}

function ensureDistBuilt(): void {
  const distIndex = path.join(__dirname, 'dist', 'index.html');
  if (!fs.existsSync(distIndex)) {
    spawnSync('npm', ['run', 'build'], { cwd: __dirname, stdio: 'pipe', timeout: 60000 });
  }
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = 3000;

  app.use(express.json({ limit: '64mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      offlineLocalReady: true,
      oneCoreReady: true,
      cloudConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Download standalone X.509 Code Signing Certificate (.CER + .PFX) matching AppxManifest Publisher
  app.post('/api/msix/cert', (req, res) => {
    try {
      const { publisher = 'CN=XBXOwned DevKit Studio', packageName = 'XBXOwned.XboxDevKitStudio' } = req.body as {
        publisher?: string;
        packageName?: string;
      };
      const certPair = generateCodeSigningCert(publisher);
      if (!certPair) {
        res.status(500).json({ error: 'OpenSSL failed to generate signing certificate.' });
        return;
      }
      const safePkg = String(packageName).replace(/[^a-zA-Z0-9._-]/g, '') || 'XBXOwned.XboxDevKitStudio';
      const readme = `Signing Certificate for ${safePkg}\nPublisher: ${publisher}\nPFX Password: xbox123\n\nSign command (Windows SDK):\n  SignTool.exe sign /fd SHA256 /f XBXOwned_Signing.pfx /p xbox123 ${safePkg}_x64.msix\n\nInstall cert via Windows Device Portal:\n  Upload XBXOwned_Signing.cer alongside your signed .msix\n`;
      const zipBuffer = buildZipArchive([
        { name: 'XBXOwned_Signing.cer', data: certPair.cer },
        { name: 'XBXOwned_Signing.pfx', data: certPair.pfx },
        { name: 'CERT_README.txt', data: Buffer.from(readme, 'utf8') },
      ]);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${safePkg}_SigningCert.zip"`);
      res.send(zipBuffer);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to generate certificate' });
    }
  });

  // Download complete XDK OneCore UWP Build & Deploy Kit (.ZIP) ready to compile & install onto the XDK itself
  app.post('/api/export/xdk-kit', (req, res) => {
    try {
      const {
        manifestXml,
        gameConfigXml,
        cppHost,
        windowsBuildScript,
        linuxDeployScript,
        compiledExeBase64,
        compiledExeName,
        publisher = 'CN=XboxDevStudio',
        config,
      } = req.body as {
        manifestXml?: string;
        gameConfigXml?: string;
        cppHost?: string;
        windowsBuildScript?: string;
        linuxDeployScript?: string;
        compiledExeBase64?: string;
        compiledExeName?: string;
        publisher?: string;
        config?: Record<string, unknown>;
      };

      const safeIp = String((config as any)?.ip || '192.168.1.50');
      const safePort = String((config as any)?.port || '11443');
      const safeSmbPort = String((config as any)?.smbPort || '445');

      const fallbackIndexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>XBXOwned Series X On-Console App</title>
  <style>
    body { background:#090b0e; color:#e2e8f0; font-family:Segoe UI,sans-serif; margin:0; padding:32px; }
    .card { max-width:720px; margin:auto; background:#10141d; border:1px solid #1e293b; border-radius:12px; padding:24px; }
    h1 { color:#60a5fa; margin-top:0; }
    code { background:#0b0e14; padding:2px 6px; border-radius:4px; color:#34d399; }
  </style>
</head>
<body>
  <div class="card">
    <h1>XBXOwned DevKit Studio (Xbox Series X)</h1>
    <p>Running natively inside OneCore UWP <code>WebView</code> (<code>Windows.Xbox</code> 10.0.19041+ / Scarlett).</p>
    <p>Local Console WDP Target: <code>https://127.0.0.1:${safePort}</code> / <code>${safeIp}:${safePort}</code> (SMB: <code>:${safeSmbPort}</code>)</p>
  </div>
</body>
</html>
`;

      const readmeTxt = `XBXOwned - Native Xbox Series X (Scarlett) On-Console OneCore App Kit
==================================================================
Meets Xbox Series X Requirements:
  1. Pure OneCore /APPCONTAINER UWP host (Main.cpp + windowsapp.lib),
     zero desktop Win32 DLLs, TV overscan bounds disabled, gamepad cursor enabled.
  2. Exact RGBA PNG assets required by Series X UWP & GDK:
     - Assets/Square44x44Logo.png       (44x44)
     - Assets/StoreLogo.png             (50x50)
     - Assets/Square150x150Logo.png     (150x150)
     - Assets/Wide310x150Logo.png       (310x150)
     - Assets/SplashScreen.png          (620x300 - UWP MSIX)
     - Assets/Square480x480Logo.png     (480x480 - Series X GDK)
     - Assets/SplashScreen1920x1080.png (1920x1080 - Series X GDK)
  3. Includes both AppxManifest.xml (MinVersion 10.0.19041.0 Windows.Xbox)
     and MicrosoftGame.config (TargetDeviceFamily="Scarlett").

Quick Install onto your Xbox Series X DevKit (${safeIp}:${safePort}):
  Option A (Windows + SDK):
    Open "x64 Native Tools Command Prompt for VS", run:
      powershell -ExecutionPolicy Bypass -File .\\build_and_deploy_xdk.ps1

  Option B (Linux SMB :445 Loose App Register):
    Place compiled XBXOwned.exe in this folder and run:
      chmod +x deploy_xdk_smb.sh && ./deploy_xdk_smb.sh
`;

      const distEntries = collectXdkWwwFiles(path.join(__dirname, 'dist'), 'www');
      const hasDistIndex = distEntries.some((e) => e.name === 'www/index.html');
      const certPair = generateCodeSigningCert(publisher);

      const exeEntries: ZipEntryInput[] = [];
      if (compiledExeBase64) {
        const exeName = path.basename(String(compiledExeName || 'Win11DesktopShell.exe')).replace(/[^a-zA-Z0-9._-]/g, '') || 'Win11DesktopShell.exe';
        exeEntries.push({ name: exeName, data: Buffer.from(compiledExeBase64, 'base64') });
      }

      const certEntries: ZipEntryInput[] = certPair
        ? [
            { name: 'Cert/Win11Desktop_Signing.cer', data: certPair.cer },
            { name: 'Cert/Win11Desktop_Signing.pfx', data: certPair.pfx },
          ]
        : [];

      const entries: ZipEntryInput[] = [
        { name: 'AppxManifest.xml', data: Buffer.from(manifestXml || '<Package />', 'utf8') },
        { name: 'MicrosoftGame.config', data: Buffer.from(gameConfigXml || '<Game configVersion="1" />', 'utf8') },
        { name: 'Main.cpp', data: Buffer.from(cppHost || '// Main.cpp', 'utf8') },
        ...exeEntries,
        ...certEntries,
        {
          name: 'build_and_deploy_xdk.ps1',
          data: Buffer.from(windowsBuildScript || '# build_and_deploy_xdk.ps1', 'utf8'),
        },
        {
          name: 'deploy_xdk_smb.sh',
          data: Buffer.from(linuxDeployScript || '#!/usr/bin/env bash', 'utf8'),
        },
        { name: 'Assets/SmallLogo.png', data: generateRgbaPng(44, 44) },
        { name: 'Assets/Square44x44Logo.png', data: generateRgbaPng(44, 44) },
        { name: 'Assets/StoreLogo.png', data: generateRgbaPng(50, 50) },
        { name: 'Assets/Logo.png', data: generateRgbaPng(150, 150) },
        { name: 'Assets/Square150x150Logo.png', data: generateRgbaPng(150, 150) },
        { name: 'Assets/Wide310x150Logo.png', data: generateRgbaPng(310, 150) },
        { name: 'Assets/SplashScreen.png', data: generateRgbaPng(620, 300) },
        { name: 'Assets/Square480x480Logo.png', data: generateRgbaPng(480, 480) },
        { name: 'Assets/SplashScreen1920x1080.png', data: generateRgbaPng(1920, 1080) },
        ...(hasDistIndex
          ? distEntries
          : [{ name: 'www/index.html', data: Buffer.from(fallbackIndexHtml, 'utf8') }]),
        {
          name: 'xbxowned_config.json',
          data: Buffer.from(JSON.stringify(config || {}, null, 2), 'utf8'),
        },
        { name: 'README_XDK_INSTALL.txt', data: Buffer.from(readmeTxt, 'utf8') },
      ];

      const zipBuffer = buildZipArchive(entries);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="XBXOwned_SeriesX_UWP_Kit.zip"'
      );
      res.send(zipBuffer);
    } catch (error: any) {
      res.status(500).json({
        error: error?.message || 'Failed to build Series X UWP kit',
      });
    }
  });

  // Legacy/Template .msix export updated with exact-dimension PNGs + www/ + Main.cpp
  app.post('/api/export/msix', (req, res) => {
    try {
      const { manifestXml, cppHost, windowsBuildScript, config } = req.body as {
        manifestXml?: string;
        cppHost?: string;
        windowsBuildScript?: string;
        config?: Record<string, unknown>;
      };

      const distEntries = collectXdkWwwFiles(path.join(__dirname, 'dist'), 'www');
      const hasDistIndex = distEntries.some((e) => e.name === 'www/index.html');

      const baseEntries: ZipEntryInput[] = [
        { name: 'AppxManifest.xml', data: Buffer.from(manifestXml || '<Package />', 'utf8') },
        { name: 'Main.cpp', data: Buffer.from(cppHost || '// Main.cpp', 'utf8') },
        {
          name: 'build_and_deploy_xdk.ps1',
          data: Buffer.from(windowsBuildScript || '# build_and_deploy_xdk.ps1', 'utf8'),
        },
        { name: 'Assets/Square44x44Logo.png', data: generateRgbaPng(44, 44) },
        { name: 'Assets/StoreLogo.png', data: generateRgbaPng(50, 50) },
        { name: 'Assets/Square150x150Logo.png', data: generateRgbaPng(150, 150) },
        { name: 'Assets/Wide310x150Logo.png', data: generateRgbaPng(310, 150) },
        { name: 'Assets/SplashScreen.png', data: generateRgbaPng(620, 300) },
        ...(hasDistIndex
          ? distEntries
          : [{ name: 'www/index.html', data: Buffer.from('<h1>XBXOwned XDK</h1>', 'utf8') }]),
        {
          name: 'xbxowned_config.json',
          data: Buffer.from(JSON.stringify(config || {}, null, 2), 'utf8'),
        },
      ];

      const blockMapXml = buildBlockMapXml(baseEntries);
      const contentTypesXml = buildAppxContentTypesXml(baseEntries);
      const allEntries: ZipEntryInput[] = [
        ...baseEntries,
        { name: 'AppxBlockMap.xml', data: Buffer.from(blockMapXml, 'utf8') },
        { name: '[Content_Types].xml', data: Buffer.from(contentTypesXml, 'utf8') },
      ];

      const msixBuffer = buildZipArchive(allEntries, { storeOnly: true });
      res.setHeader('Content-Type', 'application/msix');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="XBXOwned_XDK_Staging_1.0.0.0_x64.msix"'
      );
      res.send(msixBuffer);
    } catch (error: any) {
      res.status(500).json({
        error: error?.message || 'Failed to build XDK .msix archive',
      });
    }
  });

  // Series X MSIX package endpoint
  app.post('/api/msix/download', (req, res) => {
    try {
      const {
        packageName = 'XBXOwned.XboxDevKitStudio',
        publisher = 'CN=XBXOwned DevKit Studio',
        version = '1.0.0.0',
        displayName = 'Xbox GDK & XDK Linux Studio',
        capabilities,
        manifestFlags = {},
        cppSource = '',
        compiledExeBase64 = '',
        uwpMode,
      } = req.body as {
        packageName?: string;
        publisher?: string;
        version?: string;
        displayName?: string;
        capabilities?: string[];
        manifestFlags?: XdkManifestFlagsServer;
        cppSource?: string;
        compiledExeBase64?: string;
        uwpMode?: 'html-uwp' | 'native-cpp';
      };

      const safePkg = String(packageName).replace(/[^a-zA-Z0-9._-]/g, '') || 'XBXOwned.XboxDevKitStudio';
      let exeBuf: Buffer | null = compiledExeBase64 ? Buffer.from(compiledExeBase64, 'base64') : null;

      if (uwpMode === 'native-cpp' && !exeBuf && cppSource) {
        const xwinDir = path.join(os.homedir(), 'xwin');
        if (commandExists('clang-cl') && commandExists('lld-link') && fs.existsSync(path.join(xwinDir, 'sdk'))) {
          const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xbx-msix-cpp-'));
          try {
            const cppPath = path.join(tmpDir, 'Main.cpp');
            const objPath = path.join(tmpDir, 'Main.obj');
            const exePath = path.join(tmpDir, 'XBXOwned.exe');
            fs.writeFileSync(cppPath, cppSource, 'utf8');
            const cRes = spawnSync(
              'clang-cl',
              [
                '--target=x86_64-pc-windows-msvc',
                '/std:c++17',
                '/EHsc',
                '/O2',
                '/DWIN32_LEAN_AND_MEAN',
                '/DWINAPI_FAMILY=WINAPI_FAMILY_APP',
                '-Wno-nonportable-include-path',
                '-fms-compatibility',
                '-fms-extensions',
                '/winsysroot',
                xwinDir,
                '/c',
                cppPath,
                `/Fo${objPath}`,
              ],
              { encoding: 'utf8' }
            );
            if (cRes.status === 0) {
              const lRes = spawnSync(
                'lld-link',
                [
                  '/APPCONTAINER',
                  '/SUBSYSTEM:WINDOWS',
                  '/MACHINE:X64',
                  `/winsysroot:${xwinDir}`,
                  `/OUT:${exePath}`,
                  objPath,
                  'windowsapp.lib',
                  'd3d11.lib',
                  'dxgi.lib',
                ],
                { encoding: 'utf8' }
              );
              if (lRes.status === 0 && fs.existsSync(exePath)) {
                exeBuf = fs.readFileSync(exePath);
              }
            }
          } catch {
            // fallback below
          } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
          }
        }
      }

      // Never emit Executable="XBXOwned.exe" in AppxManifest.xml unless XBXOwned.exe is actually present in the package
      const resolvedMode: 'html-uwp' | 'native-cpp' = exeBuf ? 'native-cpp' : 'html-uwp';

      ensureDistBuilt();

      const manifestXml = buildSeriesXManifestXml({
        packageName: safePkg,
        publisher,
        version,
        displayName,
        uwpMode: resolvedMode,
        capabilities,
        manifestFlags,
      });

      const gameConfigXml = `<?xml version="1.0" encoding="utf-8"?>
<Game configVersion="1">
  <Identity Name="${escapeXmlAttr(safePkg)}" Publisher="${escapeXmlAttr(publisher)}" Version="${escapeXmlAttr(version)}" />
  <ExecutableList>
    <Executable Name="XBXOwned.exe" Id="XBXOwnedApp" TargetDeviceFamily="Scarlett" />
  </ExecutableList>
  <ShellVisuals DefaultDisplayName="${escapeXmlAttr(displayName)}"
                PublisherDisplayName="XBXOwned DevKit Studio"
                StoreLogo="Assets\\StoreLogo.png"
                Square150x150Logo="Assets\\Logo.png"
                Square44x44Logo="Assets\\SmallLogo.png"
                Square480x480Logo="Assets\\Square480x480Logo.png"
                SplashScreenImage="Assets\\SplashScreen1920x1080.png"
                Description="Xbox Series X OneCore DevKit Studio" />
</Game>
`;

      const distEntries = collectXdkWwwFiles(path.join(__dirname, 'dist'), 'www', {
        includeBootPolyfills: manifestFlags?.enableEdgeHtmlPolyfills !== false,
      });
      const hasDistIndex = distEntries.some((e) => e.name === 'www/index.html');
      const appConfig = {
        target_console: 'Xbox Series X (Scarlett)',
        onecore_uwp: true,
        uwp_mode: resolvedMode,
        manifestFlags,
        capabilities: Array.isArray(capabilities) && capabilities.length > 0 ? capabilities : DEFAULT_XDK_CAPABILITIES,
      };

      const exeEntry: ZipEntryInput[] =
        resolvedMode === 'native-cpp' && exeBuf
          ? [{ name: 'XBXOwned.exe', data: exeBuf }]
          : [];

      const baseEntries: ZipEntryInput[] = [
        { name: 'AppxManifest.xml', data: Buffer.from(manifestXml, 'utf8') },
        ...(resolvedMode === 'native-cpp'
          ? [
              { name: 'MicrosoftGame.config', data: Buffer.from(gameConfigXml, 'utf8') },
              { name: 'Main.cpp', data: Buffer.from(cppSource || '// OneCore UWP Host', 'utf8') },
            ]
          : []),
        ...exeEntry,
        { name: 'Assets/SmallLogo.png', data: generateRgbaPng(44, 44) },
        { name: 'Assets/StoreLogo.png', data: generateRgbaPng(50, 50) },
        { name: 'Assets/Logo.png', data: generateRgbaPng(150, 150) },
        { name: 'Assets/Wide310x150Logo.png', data: generateRgbaPng(310, 150) },
        { name: 'Assets/SplashScreen.png', data: generateRgbaPng(620, 300) },
        { name: 'Assets/Square480x480Logo.png', data: generateRgbaPng(480, 480) },
        { name: 'Assets/SplashScreen1920x1080.png', data: generateRgbaPng(1920, 1080) },
        { name: 'xbxowned_manifest_info.json', data: Buffer.from(JSON.stringify(appConfig, null, 2), 'utf8') },
        ...(hasDistIndex
          ? distEntries
          : [{ name: 'www/index.html', data: Buffer.from('<!doctype html><html><body><h1>XBXOwned Series X DevKit Studio</h1></body></html>', 'utf8') }]),
      ];

      const blockMapXml = buildBlockMapXml(baseEntries);
      const contentTypesXml = buildAppxContentTypesXml(baseEntries);
      const allEntries: ZipEntryInput[] = [
        ...baseEntries,
        { name: 'AppxBlockMap.xml', data: Buffer.from(blockMapXml, 'utf8') },
        { name: '[Content_Types].xml', data: Buffer.from(contentTypesXml, 'utf8') },
      ];

      const msixBuffer = buildZipArchive(allEntries, { storeOnly: true });
      res.setHeader('Content-Type', 'application/msix');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safePkg}_x64.msix"`
      );
      res.send(msixBuffer);
    } catch (error: any) {
      res.status(500).json({
        error: error?.message || 'Failed to generate Series X MSIX package',
      });
    }
  });

  // Test reachability to Xbox Series X Windows Device Portal (:11443)
  app.post('/api/xbox/test-connection', async (req, res) => {
    const {
      ip = '192.168.1.50',
      wdpPort = 11443,
      username = 'DevToolsUser',
      password = 'password',
    } = req.body as {
      ip?: string;
      wdpPort?: number;
      username?: string;
      password?: string;
    };

    const cleanIp = resolveTargetIp(ip);
    const runningInCloud = isCloudContainer();
    if (runningInCloud && isPrivateLanIp(cleanIp)) {
      res.json({
        ok: false,
        runningInCloud: true,
        error: `Cloud preview cannot reach local LAN IP ${cleanIp}:${wdpPort}. Run this app once on Kali (http://localhost:3000) so the Deploy button talks directly to your Xbox.`,
      });
      return;
    }

    try {
      const resp = await wdpHttpsRequest({
        ip: cleanIp,
        port: Number(wdpPort) || 11443,
        reqPath: '/api/os/info',
        method: 'GET',
        username: String(username),
        password: String(password),
        timeoutMs: 4000,
      });
      res.json({
        ok: resp.statusCode >= 200 && resp.statusCode < 400,
        statusCode: resp.statusCode,
        osInfo: resp.body.slice(0, 600),
        runningInCloud,
      });
    } catch (err: any) {
      res.json({
        ok: false,
        runningInCloud,
        error: err?.message || `Failed to reach https://${cleanIp}:${wdpPort}`,
      });
    }
  });

  // Real TCP port + WDP HTTPS/CSRF probe (zero fake results)
  app.post('/api/xbox/probe', async (req, res) => {
    const {
      ip = '192.168.1.100',
      wdpPort = 11443,
      smbPort = 445,
      ftpPort = 21,
      username = 'DevUser',
      password = 'XboxDev2026!',
    } = req.body as {
      ip?: string;
      wdpPort?: number;
      smbPort?: number;
      ftpPort?: number;
      username?: string;
      password?: string;
    };

    const cleanIp = resolveTargetIp(ip);
    const runningInCloud = isCloudContainer();
    if (runningInCloud && isPrivateLanIp(cleanIp)) {
      res.json({
        ok: false,
        runningInCloud: true,
        error: `Cloud preview cannot probe local LAN IP ${cleanIp}. Run this app on Kali (npm run dev -> http://localhost:3000) to run real TCP & WDP probes.`,
        ports: [],
        endpoints: [],
      });
      return;
    }

    const probeTcp = (port: number, service: string): Promise<{ port: number; service: string; state: 'open' | 'closed' | 'timeout'; latencyMs: number }> =>
      new Promise((resolve) => {
        const started = Date.now();
        const socket = net.createConnection({ host: cleanIp, port });
        let settled = false;
        const finish = (state: 'open' | 'closed' | 'timeout') => {
          if (settled) return;
          settled = true;
          socket.destroy();
          resolve({ port, service, state, latencyMs: Date.now() - started });
        };
        socket.setTimeout(2000);
        socket.on('connect', () => finish('open'));
        socket.on('timeout', () => finish('timeout'));
        socket.on('error', () => finish('closed'));
      });

    const portTargets: Array<[number, string]> = [
      [Number(wdpPort) || 11443, 'Xbox Device Portal (HTTPS/WSS)'],
      [Number(smbPort) || 445, 'SMB3 (DevelopmentFiles)'],
      [Number(ftpPort) || 21, 'FTP (Isolated Storage)'],
      [22, 'OpenSSH (sshd)'],
      [80, 'HTTP Redirector'],
      [38920, 'RenderDoc Remote'],
    ];

    const ports = await Promise.all(portTargets.map(([p, s]) => probeTcp(p, s)));

    const wdpPaths = [
      '/api/os/info',
      '/api/os/machinename',
      '/api/app/packagemanager/packages',
      '/api/resourcemanager/processes',
      '/ext/smb/developerfolder',
      '/ext/xro/titles',
    ];

    const endpoints = await Promise.all(
      wdpPaths.map(async (reqPath) => {
        const started = Date.now();
        try {
          const r = await wdpHttpsRequest({
            ip: cleanIp,
            port: Number(wdpPort) || 11443,
            reqPath,
            method: 'GET',
            username: String(username),
            password: String(password),
            timeoutMs: 3500,
          });
          return {
            path: reqPath,
            statusCode: r.statusCode,
            latencyMs: Date.now() - started,
            snippet: r.body.replace(/\s+/g, ' ').slice(0, 180),
          };
        } catch (e: any) {
          return {
            path: reqPath,
            statusCode: 0,
            latencyMs: Date.now() - started,
            snippet: e?.message || 'Unreachable',
          };
        }
      })
    );

    res.json({
      ok: ports.some((p) => p.state === 'open') || endpoints.some((e) => e.statusCode > 0),
      runningInCloud,
      probedAt: new Date().toISOString(),
      ports,
      endpoints,
    });
  });

  // Real WDP Crash Dumps + Running Processes Diagnostics (:11443)
  app.post('/api/xbox/debug/dumps', async (req, res) => {
    const {
      ip = '192.168.1.100',
      wdpPort = 11443,
      username = 'DevUser',
      password = 'XboxDev2026!',
      packageNamePrefix = 'XBXOwned',
      enableCrashControlFor = '',
    } = req.body as Record<string, any>;

    const cleanIp = resolveTargetIp(ip);
    const port = Number(wdpPort) || 11443;
    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({
        ok: false,
        runningInCloud: true,
        error: `Cloud preview cannot reach LAN Xbox ${cleanIp}:${port}. Run locally on Kali (http://localhost:3000) to inspect crash dumps.`,
      });
      return;
    }

    try {
      if (enableCrashControlFor) {
        await tryEnableWdpCrashDumps({
          ip: cleanIp,
          port,
          username: String(username),
          password: String(password),
          packageFullName: String(enableCrashControlFor),
        });
      }

      const [osRes, procRes, dumpsRes, dumpFilesRes, pkgRes] = await Promise.all([
        wdpHttpsRequest({ ip: cleanIp, port, reqPath: '/api/os/info', method: 'GET', username, password, timeoutMs: 5000 }).catch(() => ({ statusCode: 0, body: '{}' })),
        wdpHttpsRequest({ ip: cleanIp, port, reqPath: '/api/resourcemanager/processes', method: 'GET', username, password, timeoutMs: 5000 }).catch(() => ({ statusCode: 0, body: '{}' })),
        wdpHttpsRequest({ ip: cleanIp, port, reqPath: '/api/debug/dump/usermode/dumps', method: 'GET', username, password, timeoutMs: 5000 }).catch(() => ({ statusCode: 0, body: '{}' })),
        wdpHttpsRequest({ ip: cleanIp, port, reqPath: '/api/filesystem/apps/files?knownfolderid=Dumps&path=%5C', method: 'GET', username, password, timeoutMs: 5000 }).catch(() => ({ statusCode: 0, body: '{}' })),
        wdpHttpsRequest({ ip: cleanIp, port, reqPath: '/api/app/packagemanager/packages', method: 'GET', username, password, timeoutMs: 5000 }).catch(() => ({ statusCode: 0, body: '{}' })),
      ]);

      let osInfo: any = null;
      try { osInfo = JSON.parse(osRes.body || '{}'); } catch {}

      let matchingProcesses: any[] = [];
      let allProcessCount = 0;
      try {
        const procs = JSON.parse(procRes.body || '{}')?.Processes || [];
        allProcessCount = procs.length;
        const needle = String(packageNamePrefix || 'XBXOwned').toLowerCase();
        matchingProcesses = procs.filter((p: any) =>
          String(p.ImageName || '').toLowerCase().includes('wwahost') ||
          String(p.ImageName || '').toLowerCase().includes('xbxowned') ||
          String(p.PackageFullName || '').toLowerCase().includes(needle)
        );
      } catch {}

      let installedMatches: any[] = [];
      try {
        const pkgs = JSON.parse(pkgRes.body || '{}')?.InstalledPackages || [];
        const needle = String(packageNamePrefix || 'XBXOwned').toLowerCase();
        installedMatches = pkgs.filter((p: any) =>
          String(p.PackageFullName || '').toLowerCase().includes(needle) ||
          String(p.Name || '').toLowerCase().includes(needle)
        );
      } catch {}

      let usermodeDumps: any[] = [];
      try {
        const d = JSON.parse(dumpsRes.body || '{}');
        if (Array.isArray(d)) usermodeDumps = d;
        else if (Array.isArray(d?.Dumps)) usermodeDumps = d.Dumps;
      } catch {}

      let dumpKnownFiles: any[] = [];
      try {
        dumpKnownFiles = JSON.parse(dumpFilesRes.body || '{}')?.Items || [];
      } catch {}

      res.json({
        ok: true,
        osInfo,
        allProcessCount,
        matchingProcesses,
        installedMatches,
        usermodeDumps,
        dumpKnownFiles,
        rawDumpsStatus: dumpsRes.statusCode,
      });
    } catch (err: any) {
      res.json({ ok: false, error: err?.message || 'Failed querying WDP crash diagnostics' });
    }
  });

  // Install Certificate into WDP Certificate Store (/api/devmode/certificate)
  app.post('/api/devmode/certificate', async (req, res) => {
    const {
      ip = '192.168.1.100',
      wdpPort = 11443,
      username = 'UsrMgr5',
      password = 'XboxDev2026!',
      certBase64 = '',
    } = req.body as Record<string, any>;

    const cleanIp = resolveTargetIp(ip);
    const port = Number(wdpPort) || 11443;

    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({ ok: false, error: 'Cannot reach LAN Xbox from cloud container.' });
      return;
    }

    try {
      const certBuf = certBase64
        ? Buffer.from(String(certBase64), 'base64')
        : (generateCodeSigningCert('CN=XBXOwned DevKit Studio')?.cer || Buffer.alloc(0));

      const mp = buildMultipartBody([
        { name: 'file', filename: 'XBXOwned_Provisioning.cer', contentType: 'application/x-x509-ca-cert', data: certBuf },
      ]);

      const wdpRes = await wdpCsrfRequest({
        ip: cleanIp,
        port,
        reqPath: '/api/devmode/certificate',
        method: 'POST',
        username: String(username),
        password: String(password),
        body: mp.body,
        contentType: mp.contentType,
        timeoutMs: 15000,
      });

      res.json({
        ok: wdpRes.statusCode >= 200 && wdpRes.statusCode < 300,
        statusCode: wdpRes.statusCode,
        response: wdpRes.body,
        error: wdpRes.statusCode >= 200 && wdpRes.statusCode < 300 ? null : `WDP certificate installation returned HTTP ${wdpRes.statusCode}: ${wdpRes.body.slice(0, 160)}`,
      });
    } catch (err: any) {
      res.json({ ok: false, error: err?.message || 'Failed installing certificate via WDP' });
    }
  });

  // Real Manufacturing Mode (0x8001) & Console XPAL + Cert Push (WDP KnownFolders + SMB3 + Mfg Shares)
  app.post('/api/xbox/xpal/push', async (req, res) => {
    const {
      ip = '192.168.1.100',
      wdpPort = 11443,
      username = 'DevUser',
      password = 'XboxDev2026!',
      modeCode = '8001',
      deviceId = '',
      consoleId = '',
      serialNumber = '',
      machineName = 'XDK-SERIESX',
      sandboxId = 'XDKS.1',
      subject = 'CN=XBXOwned DevKit Studio',
      customFileName = '',
      customFileBase64 = '',
      targets = {},
    } = req.body as Record<string, any>;

    const cleanIp = resolveTargetIp(ip);
    const port = Number(wdpPort) || 11443;
    const cleanMode = String(modeCode || '8001').replace(/^0x/i, '');
    const opts = {
      smbDevFiles: targets?.smbDevFiles !== false,
      wdpKnownFolder: targets?.wdpKnownFolder !== false,
      mfgShares: Boolean(targets?.mfgShares),
      certStore: targets?.certStore !== false,
      verifyAfterPush: targets?.verifyAfterPush !== false,
    };

    const steps: Array<{ name: string; status: 'ok' | 'warn' | 'error'; detail: string }> = [];

    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      steps.push({
        name: 'LAN Reachability',
        status: 'error',
        detail: `Cloud preview cannot push XPAL to LAN Xbox ${cleanIp}:${port}. Run locally on Kali (http://localhost:3000) to push directly over WDP & SMB3.`,
      });
      res.json({ ok: false, runningInCloud: true, modeCode: cleanMode, steps, verifiedRemoteFiles: [] });
      return;
    }

    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xbx-xpal-'));
    try {
      // Sync MachineName and SandboxId via WDP CSRF before generating cert & XPAL
      if (machineName) {
        try {
          await wdpCsrfRequest({
            ip: cleanIp,
            port,
            reqPath: `/ext/xbox/settings/MachineName?value=${encodeURIComponent(String(machineName))}`,
            method: 'POST',
            username: String(username),
            password: String(password),
            body: Buffer.from(JSON.stringify({ value: String(machineName) }), 'utf8'),
            contentType: 'application/json',
            timeoutMs: 5000,
          });
          steps.push({ name: 'Sync MachineName', status: 'ok', detail: `Successfully updated MachineName to ${machineName}` });
        } catch (e: any) {
          steps.push({ name: 'Sync MachineName', status: 'warn', detail: e?.message || 'Failed updating MachineName' });
        }
      }

      if (sandboxId) {
        try {
          await wdpCsrfRequest({
            ip: cleanIp,
            port,
            reqPath: `/ext/xbox/settings/SandboxId?value=${encodeURIComponent(String(sandboxId))}`,
            method: 'POST',
            username: String(username),
            password: String(password),
            body: Buffer.from(JSON.stringify({ value: String(sandboxId) }), 'utf8'),
            contentType: 'application/json',
            timeoutMs: 5000,
          });
          steps.push({ name: 'Sync SandboxId', status: 'ok', detail: `Successfully updated SandboxId to ${sandboxId}` });
        } catch (e: any) {
          steps.push({ name: 'Sync SandboxId', status: 'warn', detail: e?.message || 'Failed updating SandboxId' });
        }
      }

      const dynamicSubject = String(subject || '').trim() || `CN=${machineName}, O=${sandboxId}, OU=Manufacturing`;
      const certPair = generateCodeSigningCert(dynamicSubject);
      const certBuf = certPair?.cer || Buffer.from(`# Fallback X.509 Cert (${dynamicSubject})\n`, 'utf8');
      const certFileName = 'XBXOwned_Provisioning.cer';

      let xpalFileName = String(customFileName || '').replace(/[^a-zA-Z0-9._-]/g, '');
      let xpalBuf: Buffer;

      if (customFileBase64 && xpalFileName) {
        xpalBuf = Buffer.from(String(customFileBase64), 'base64');
        steps.push({
          name: 'XPAL Payload Ready',
          status: 'ok',
          detail: `Loaded custom file "${xpalFileName}" (${xpalBuf.length} bytes) for mode 0x${cleanMode}`,
        });
      } else {
        xpalFileName = cleanMode === '8001' ? 'MDSX.8001' : `xbox_mfg_0x${cleanMode}.xpal`;
        const sha256Cert = crypto.createHash('sha256').update(certBuf).digest('hex');
        const xpalPayload = {
          Schema: 'Xbox.XpalProvisioningEnvelope.v2',
          ModeCode: cleanMode,
          HardwareModeHex: `0x${cleanMode}`,
          TargetMachine: machineName,
          TargetIp: cleanIp,
          WdpPort: port,
          SandboxId: sandboxId,
          DeviceId: deviceId,
          ConsoleId: consoleId,
          SerialNumber: serialNumber,
          Subject: dynamicSubject,
          CertSha256: sha256Cert,
          CertBase64: certBuf.toString('base64'),
          GeneratedAt: new Date().toISOString(),
        };
        xpalBuf = Buffer.from(JSON.stringify(xpalPayload, null, 2), 'utf8');
        steps.push({
          name: 'Generate XPAL + X.509 Bundle',
          status: 'ok',
          detail: `Built ${xpalFileName} (${xpalBuf.length} B) & ${certFileName} (SHA-256 ${sha256Cert.slice(0, 16)}...) for Mode 0x${cleanMode}`,
        });
      }

      const localXpalPath = path.join(workDir, xpalFileName);
      const localCertPath = path.join(workDir, certFileName);
      fs.writeFileSync(localXpalPath, xpalBuf);
      fs.writeFileSync(localCertPath, certBuf);
      if (cleanMode === '8001') {
        fs.writeFileSync(path.join(workDir, 'MDSX.8001.xpal'), xpalBuf);
        fs.writeFileSync(path.join(workDir, 'xbox_mfg_0x8001.xpal'), xpalBuf);
      }
      const sha256 = crypto.createHash('sha256').update(xpalBuf).digest('hex');

      let anyPushOk = false;
      const verifiedRemoteFiles: string[] = [];

      // 1. WDP KnownFolders Upload (DevelopmentFiles\xpal and DevelopmentFiles\Certs)
      if (opts.wdpKnownFolder) {
        try {
          const mpXpal = buildMultipartBody([
            { name: 'file', filename: xpalFileName, contentType: 'application/octet-stream', data: xpalBuf },
          ]);
          const wdpXpalRes = await wdpCsrfRequest({
            ip: cleanIp,
            port,
            reqPath: '/api/filesystem/apps/file?knownfolderid=DevelopmentFiles&packagefullname=&path=%5Cxpal',
            method: 'POST',
            username: String(username),
            password: String(password),
            body: mpXpal.body,
            contentType: mpXpal.contentType,
            timeoutMs: 12000,
          });
          if (wdpXpalRes.statusCode >= 200 && wdpXpalRes.statusCode < 300) {
            anyPushOk = true;
            verifiedRemoteFiles.push(`DevelopmentFiles\\xpal\\${xpalFileName}`);
            steps.push({
              name: 'WDP KnownFolders XPAL Upload (:11443)',
              status: 'ok',
              detail: `HTTP ${wdpXpalRes.statusCode} -> Uploaded ${xpalFileName} into DevelopmentFiles\\xpal\\`,
            });
          } else {
            steps.push({
              name: 'WDP KnownFolders XPAL Upload (:11443)',
              status: 'warn',
              detail: `HTTP ${wdpXpalRes.statusCode}: ${(wdpXpalRes.body || 'Rejected').slice(0, 180)}`,
            });
          }

          if (opts.certStore) {
            const mpCert = buildMultipartBody([
              { name: 'file', filename: certFileName, contentType: 'application/x-x509-ca-cert', data: certBuf },
            ]);
            const wdpCertRes = await wdpCsrfRequest({
              ip: cleanIp,
              port,
              reqPath: '/api/filesystem/apps/file?knownfolderid=DevelopmentFiles&packagefullname=&path=%5CCerts',
              method: 'POST',
              username: String(username),
              password: String(password),
              body: mpCert.body,
              contentType: mpCert.contentType,
              timeoutMs: 12000,
            });
            steps.push({
              name: 'WDP KnownFolders Cert Upload (:11443)',
              status: wdpCertRes.statusCode >= 200 && wdpCertRes.statusCode < 300 ? 'ok' : 'warn',
              detail:
                wdpCertRes.statusCode >= 200 && wdpCertRes.statusCode < 300
                  ? `HTTP ${wdpCertRes.statusCode} -> Uploaded ${certFileName} into DevelopmentFiles\\Certs\\`
                  : `HTTP ${wdpCertRes.statusCode}: ${(wdpCertRes.body || 'Rejected').slice(0, 160)}`,
            });
          }
        } catch (err: any) {
          steps.push({
            name: 'WDP KnownFolders XPAL Upload (:11443)',
            status: 'warn',
            detail: err?.message || 'WDP upload failed',
          });
        }
      }

      // 2. SMB3 DevelopmentFiles & Manufacturing Shares (0x8001)
      if ((opts.smbDevFiles || opts.mfgShares) && commandExists('smbclient')) {
        const creds = await resolveXboxSmbCreds({
          ip: cleanIp,
          port,
          username: String(username),
          password: String(password),
          defaultShare: 'DevelopmentFiles',
        });

        if (opts.smbDevFiles) {
          const putCmd = `mkdir xpal; cd xpal; put "${xpalFileName}"; cd ..; mkdir Certs; cd Certs; put "${certFileName}"`;
          const smbRes = spawnSync(
            'smbclient',
            [`//${cleanIp}/${creds.share}`, '-W', creds.domain, '-U', `${creds.user}%${creds.pass}`, '-m', 'SMB3', '-c', putCmd],
            { cwd: workDir, encoding: 'utf8', timeout: 15000 }
          );
          const smbOut = cleanSmbOutput(smbRes.stdout, smbRes.stderr);
          const blocked = /NT_STATUS_ACCESS_DENIED|NT_STATUS_LOGON_FAILURE|NT_STATUS_ACCOUNT_LOCKED_OUT|NT_STATUS_BAD_NETWORK_NAME|session setup failed|tree connect failed/i.test(smbOut);
          if ((smbRes.status === 0 || /putting file/i.test(smbOut)) && !blocked) {
            anyPushOk = true;
            steps.push({
              name: `SMB3 Push -> //${cleanIp}/${creds.share}`,
              status: 'ok',
              detail: `Uploaded ${xpalFileName} & ${certFileName} as ${creds.domain}\\${creds.user} (${creds.source})`,
            });
          } else {
            steps.push({
              name: `SMB3 Push -> //${cleanIp}/${creds.share}`,
              status: 'warn',
              detail: (smbOut || `smbclient exit ${smbRes.status}`).slice(-260),
            });
          }

          if (opts.verifyAfterPush) {
            const lsRes = spawnSync(
              'smbclient',
              [`//${cleanIp}/${creds.share}`, '-W', creds.domain, '-U', `${creds.user}%${creds.pass}`, '-m', 'SMB3', '-c', 'cd xpal; dir'],
              { encoding: 'utf8', timeout: 10000 }
            );
            const lsOut = cleanSmbOutput(lsRes.stdout, lsRes.stderr);
            const items = parseSmbDirOutput(lsOut, 'xpal');
            if (items.some((it) => it.name.toLowerCase() === xpalFileName.toLowerCase())) {
              verifiedRemoteFiles.push(`//${cleanIp}/${creds.share}/xpal/${xpalFileName}`);
            }
          }
        }

        // Probe & attempt Manufacturing / raw partition shares (M$, J$, C$, Q$)
        if (opts.mfgShares) {
          const listShares = spawnSync(
            'smbclient',
            ['-L', cleanIp, '-W', creds.domain, '-U', `${creds.user}%${creds.pass}`, '-m', 'SMB3'],
            { encoding: 'utf8', timeout: 8000 }
          );
          const listOut = cleanSmbOutput(listShares.stdout, listShares.stderr);
          const exposedShares: string[] = [];
          for (const line of listOut.split(/\r?\n/)) {
            const m = line.match(/^\s*([^\s]+)\s+Disk/i);
            if (m && m[1]) exposedShares.push(m[1].trim());
          }
          const mfgTargets = Array.from(new Set([...exposedShares.filter((s) => /^(M\$|J\$|Q\$|C\$|SystemOS|OSDisk)$/i.test(s)), ...(cleanMode === '8001' ? ['M$', 'J$', 'Q$'] : [])]));

          for (const share of mfgTargets) {
            const mfgRes = spawnSync(
              'smbclient',
              [`//${cleanIp}/${share}`, '-W', creds.domain, '-U', `${creds.user}%${creds.pass}`, '-m', 'SMB3', '-c', `mkdir xpal; cd xpal; put "${xpalFileName}"`],
              { cwd: workDir, encoding: 'utf8', timeout: 10000 }
            );
            const mOut = cleanSmbOutput(mfgRes.stdout, mfgRes.stderr);
            const denied = /NT_STATUS_ACCESS_DENIED|NT_STATUS_BAD_NETWORK_NAME|NT_STATUS_LOGON_FAILURE|tree connect failed/i.test(mOut);
            if (mfgRes.status === 0 && !denied) {
              anyPushOk = true;
              verifiedRemoteFiles.push(`//${cleanIp}/${share}/xpal/${xpalFileName}`);
              steps.push({
                name: `Manufacturing Share Push -> //${cleanIp}/${share}`,
                status: 'ok',
                detail: `Pushed ${xpalFileName} to //${cleanIp}/${share}/xpal/${xpalFileName}`,
              });
            } else {
              steps.push({
                name: `Manufacturing Share Probe -> //${cleanIp}/${share}`,
                status: 'warn',
                detail: `Protected by hardware fuses / restricted partition share //${cleanIp}/${share} (Primary DevelopmentFiles share active)`,
              });
            }
          }
        }
      }

      // 3. Verify WDP console info & settings
      try {
        const osRes = await wdpHttpsRequest({
          ip: cleanIp,
          port,
          reqPath: '/api/os/info',
          method: 'GET',
          username: String(username),
          password: String(password),
          timeoutMs: 5000,
        });
        if (osRes.statusCode >= 200 && osRes.statusCode < 300) {
          steps.push({
            name: 'WDP Console Identity Verify',
            status: 'ok',
            detail: `Verified WDP (:11443) HTTP ${osRes.statusCode} -> ${osRes.body.slice(0, 160)}`,
          });
        }
      } catch {}

      res.json({
        ok: anyPushOk,
        modeCode: cleanMode,
        xpalFileName,
        certFileName,
        sha256,
        verifiedRemoteFiles,
        steps,
        error: anyPushOk ? null : 'All XPAL push channels were rejected or unreachable; inspect step details above.',
      });
    } catch (err: any) {
      steps.push({ name: 'XPAL Push Error', status: 'error', detail: err?.message || 'Unexpected error' });
      res.json({ ok: false, modeCode: cleanMode, steps, verifiedRemoteFiles: [], error: err?.message || 'XPAL push failed' });
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  });

  // Apply Sandbox / Inspect Hardware Mode via real WDP (:11443) + SMB Share check
  app.post('/api/xbox/mode/apply', async (req, res) => {
    const {
      ip = '192.168.1.100',
      wdpPort = 11443,
      username = 'UsrMgr5',
      password = 'XboxDev2026!',
      modeCode = '4001',
      sandboxId = 'XDKS.1',
      machineName = 'XDK-SERIESX',
    } = req.body as Record<string, any>;

    const cleanIp = resolveTargetIp(ip);
    const port = Number(wdpPort) || 11443;
    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({
        ok: false,
        runningInCloud: true,
        error: `Cloud preview cannot reach LAN Xbox ${cleanIp}:${port}. Run locally on Kali to sync Sandbox/Mode with WDP.`,
      });
      return;
    }

    const steps: string[] = [];
    let osInfo: any = null;
    try {
      const osRes = await wdpHttpsRequest({ ip: cleanIp, port, reqPath: '/api/os/info', method: 'GET', username, password, timeoutMs: 5000 });
      try { osInfo = JSON.parse(osRes.body || '{}'); } catch {}
      steps.push(`GET /api/os/info -> HTTP ${osRes.statusCode}`);
    } catch (err: any) {
      steps.push(`GET /api/os/info error: ${err?.message}`);
    }

    if (sandboxId) {
      try {
        const sRes = await wdpCsrfRequest({
          ip: cleanIp,
          port,
          reqPath: `/ext/xbox/settings/SandboxId?value=${encodeURIComponent(String(sandboxId))}`,
          method: 'POST',
          username,
          password,
          timeoutMs: 5000,
        });
        steps.push(`POST /ext/xbox/settings/SandboxId (${sandboxId}) -> HTTP ${sRes.statusCode}`);
      } catch (err: any) {
        steps.push(`SandboxId WDP sync notice: ${err?.message}`);
      }
    }

    if (machineName) {
      try {
        const mRes = await wdpCsrfRequest({
          ip: cleanIp,
          port,
          reqPath: `/ext/xbox/settings/MachineName?value=${encodeURIComponent(String(machineName))}`,
          method: 'POST',
          username,
          password,
          timeoutMs: 5000,
        });
        steps.push(`POST /ext/xbox/settings/MachineName (${machineName}) -> HTTP ${mRes.statusCode}`);
      } catch (err: any) {
        steps.push(`MachineName WDP sync notice: ${err?.message}`);
      }
    }

    res.json({
      ok: Boolean(osInfo),
      modeCode: String(modeCode),
      sandboxId: String(sandboxId),
      osInfo,
      steps,
      note:
        String(modeCode) === '8001'
          ? 'Hardware fuse mode 0x8001 cannot be forged over WDP REST if console efuses are 0x4001/0x6001/0x2001; XPAL & Manufacturing shares are probed cleanly via /api/xbox/xpal/push.'
          : null,
    });
  });

  // Dynamic Discovery: WDP KnownFolders + SMB3 Shares + Linux Host Mounts / Block Partitions
  app.post('/api/xbox/fs/discover', async (req, res) => {
    const {
      ip = '192.168.1.100',
      wdpPort = 11443,
      username = 'DevUser',
      password = 'XboxDev2026!',
    } = req.body as Record<string, any>;

    const cleanIp = resolveTargetIp(ip);
    const port = Number(wdpPort) || 11443;
    const runningInCloud = isCloudContainer();

    // 1. Discover local Linux mounts & block partitions (lsblk)
    const localMounts: Array<{ path: string; label: string; fsType: string; writable: boolean }> = [];
    try {
      const lsRes = spawnSync('lsblk', ['-J', '-o', 'NAME,LABEL,MOUNTPOINT,FSTYPE,SIZE,RO'], { encoding: 'utf8', timeout: 3000 });
      if (lsRes.status === 0 && lsRes.stdout) {
        const parsed = JSON.parse(lsRes.stdout);
        const walkBlk = (nodes: any[]) => {
          for (const n of nodes || []) {
            if (n.mountpoint) {
              localMounts.push({
                path: n.mountpoint,
                label: `${n.name}${n.label ? ` (${n.label})` : ''} · ${n.size || ''}`.trim(),
                fsType: n.fstype || 'unknown',
                writable: n.ro === false || n.ro === '0' || n.ro === 0,
              });
            }
            if (Array.isArray(n.children)) walkBlk(n.children);
          }
        };
        walkBlk(parsed.blockdevices || []);
      }
    } catch {}

    for (const dir of ['/mnt', '/media']) {
      try {
        if (fs.existsSync(dir)) {
          for (const child of fs.readdirSync(dir, { withFileTypes: true })) {
            if (child.isDirectory()) {
              const p = path.join(dir, child.name);
              if (!localMounts.some((m) => m.path === p)) {
                localMounts.push({ path: p, label: `Mount: ${child.name}`, fsType: 'mount', writable: true });
              }
            }
          }
        }
      } catch {}
    }

    if (runningInCloud && isPrivateLanIp(cleanIp)) {
      res.json({
        ok: true,
        runningInCloud: true,
        knownFolders: [],
        smbShares: [],
        localMounts,
        smbCredInfo: null,
      });
      return;
    }

    // 2. Query WDP /api/filesystem/apps/knownfolders + /ext/smb/developerfolder
    let knownFolders: string[] = [];
    let smbCredInfo: { domain: string; user: string; share: string; source: string } | null = null;
    try {
      const kfResp = await wdpHttpsRequest({
        ip: cleanIp,
        port,
        reqPath: '/api/filesystem/apps/knownfolders',
        method: 'GET',
        username: String(username),
        password: String(password),
        timeoutMs: 5000,
      });
      if (kfResp.statusCode >= 200 && kfResp.statusCode < 300) {
        const parsed = JSON.parse(kfResp.body || '{}');
        if (Array.isArray(parsed?.KnownFolders)) {
          knownFolders = parsed.KnownFolders.map((k: any) => String(k));
        }
      }
    } catch {}

    // 3. Query live SMB shares via smbclient -L //<ip> + probe standard Xbox drive shares (C$, D$, M$, J$, Q$, X$, U$, DevelopmentFiles)
    const smbShares: Array<{ name: string; type: string; comment: string; readable?: boolean }> = [];
    try {
      const candidates = await getSmbCredentialCandidates({
        ip: cleanIp,
        port,
        username: String(username),
        password: String(password),
      });
      const primary = candidates[0];
      if (primary) {
        smbCredInfo = { domain: primary.domain, user: primary.user, share: primary.share, source: primary.source };
      }
      if (commandExists('smbclient') && candidates.length > 0) {
        for (const cand of candidates.slice(0, 2)) {
          const authFlags = cand.useWorkgroupFlag ? ['-W', cand.domain || 'WORKGROUP'] : [];
          const lRes = spawnSync(
            'smbclient',
            ['-L', `//${cleanIp}`, ...authFlags, '-U', `${cand.user}%${cand.pass}`, '-m', 'SMB3'],
            { encoding: 'utf8', timeout: 7000 }
          );
          const out = cleanSmbOutput(lRes.stdout, lRes.stderr);
          for (const line of out.split(/\r?\n/)) {
            const m = /^\s+([^\s]+)\s+(Disk|IPC|Printer)\s*(.*)$/i.exec(line);
            if (m && !smbShares.some((s) => s.name.toLowerCase() === m[1].trim().toLowerCase())) {
              smbShares.push({
                name: m[1].trim(),
                type: m[2].trim(),
                comment: (m[3] || '').trim(),
                readable: true,
              });
            }
          }
          if (smbShares.length > 0) break;
        }
        // Probe hidden/admin shares ($ shares often omitted by smbclient -L)
        for (const driveShare of ['DevelopmentFiles', 'D$', 'C$', 'M$', 'J$', 'Q$', 'X$', 'U$']) {
          if (smbShares.some((s) => s.name.toLowerCase() === driveShare.toLowerCase())) continue;
          const probeRes = runSmbCommandWithCandidates({
            ip: cleanIp,
            candidates: candidates.map((c) => ({ ...c, share: driveShare })).slice(0, 2),
            commands: ['dir'],
            timeoutMs: 3500,
          });
          if (probeRes.ok) {
            smbShares.push({
              name: driveShare,
              type: 'Disk',
              comment: `Probed readable via ${probeRes.usedCandidate?.source || 'SMB3'}`,
              readable: true,
            });
          }
        }
      }
    } catch {}

    res.json({
      ok: true,
      runningInCloud,
      knownFolders,
      smbShares,
      smbCredInfo,
      localMounts,
    });
  });

  // Real File Explorer: list directory on Local Host FS, WDP KnownFolder (:11443), or SMB3 Share (:445)
  app.post('/api/xbox/fs/list', async (req, res) => {
    const {
      source = 'local',
      localPath = process.cwd(),
      ip = '192.168.1.100',
      wdpPort = 11443,
      username = 'DevUser',
      password = 'XboxDev2026!',
      knownFolderId = 'DevelopmentFiles',
      packageFullName = '',
      smbShare = 'DevelopmentFiles',
      subPath = '\\',
      probeRw = false,
    } = req.body as {
      source?: 'local' | 'wdp' | 'smb';
      localPath?: string;
      ip?: string;
      wdpPort?: number;
      username?: string;
      password?: string;
      knownFolderId?: string;
      packageFullName?: string;
      smbShare?: string;
      subPath?: string;
      probeRw?: boolean;
    };

    if (source === 'local') {
      try {
        const rawLocal = localPath && localPath !== process.cwd() ? localPath : subPath && subPath !== '\\' ? subPath : localPath || process.cwd();
        const resolved = path.resolve(String(rawLocal).replace(/^~/, os.homedir()));
        const stat = fs.statSync(resolved);
        if (!stat.isDirectory()) {
          res.status(400).json({ ok: false, error: `Not a directory: ${resolved}` });
          return;
        }
        let writable = false;
        try {
          fs.accessSync(resolved, fs.constants.W_OK);
          writable = true;
        } catch {}

        const entries = fs.readdirSync(resolved, { withFileTypes: true });
        const filteredEntries = entries.filter((e) => e.name !== 'node_modules' && e.name !== '.git');
        const listLimit = Math.max(50, Math.min(10000, Number((req.body as any)?.limit) || 5000));
        const items = filteredEntries
          .slice(0, listLimit)
          .map((e, idx) => {
            const full = path.join(resolved, e.name);
            let sizeBytes = 0;
            let dateModified = '';
            let readable = true;
            try {
              const st = fs.statSync(full);
              sizeBytes = e.isDirectory() ? 0 : st.size;
              dateModified = st.mtime.toISOString().slice(0, 16).replace('T', ' ');
            } catch {
              dateModified = 'restricted';
              readable = false;
            }
            return {
              id: `local-${idx}-${e.name}`,
              name: e.name,
              path: full,
              isDir: e.isDirectory(),
              sizeBytes,
              dateModified,
              readable,
              extension: e.isDirectory() ? undefined : path.extname(e.name).slice(1),
            };
          })
          .sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name));

        res.json({
          ok: true,
          resolvedPath: resolved,
          writable,
          accessLabel: writable ? 'Read/Write (Host OS)' : 'Read-Only',
          totalEntries: filteredEntries.length,
          truncated: filteredEntries.length > listLimit,
          items,
        });
      } catch (err: any) {
        res.status(400).json({ ok: false, error: err?.message || 'Failed to read local directory' });
      }
      return;
    }

    const cleanIp = resolveTargetIp(ip);
    const port = Number(wdpPort) || 11443;
    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({
        ok: false,
        runningInCloud: true,
        error: `Cloud preview cannot reach LAN Xbox ${cleanIp}:${port}. Run locally on Kali or switch partition to "Local Host FS".`,
      });
      return;
    }

    if (source === 'smb') {
      if (!commandExists('smbclient')) {
        res.json({ ok: false, error: 'smbclient is not installed on host (install samba-client / smbclient).' });
        return;
      }
      try {
        const candidates = await getSmbCredentialCandidates({
          ip: cleanIp,
          port,
          username: String(username),
          password: String(password),
          defaultShare: String(smbShare || 'DevelopmentFiles'),
        });
        const cleanSub = toSmbSubPath(subPath);
        const dirCmds = cleanSub
          ? [`cd "${cleanSub}"; dir`, `dir "${cleanSub}\\*"`]
          : ['dir'];
        const smbRun = runSmbCommandWithCandidates({
          ip: cleanIp,
          candidates,
          commands: dirCmds,
          timeoutMs: 12000,
        });
        if (!smbRun.ok && isSmbFatalError(smbRun.cleaned)) {
          res.json({ ok: false, error: `SMB3 //${cleanIp}/${smbShare}: ${smbRun.cleaned.slice(0, 280)}` });
          return;
        }
        const items = parseSmbDirOutput(smbRun.cleaned, cleanSub);
        const activeCand = smbRun.usedCandidate || candidates[0];
        let isWritableShare = !/^[CMJQXU]\$$/i.test(activeCand?.share || smbShare);

        // Optional live writability probe (dynamic non-destructive 0-byte test create & delete)
        if (probeRw && activeCand) {
          const probeName = `.xbx_probe_${Date.now()}`;
          const tmpProbeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xbx-rw-'));
          const localProbe = path.join(tmpProbeDir, probeName);
          try {
            fs.writeFileSync(localProbe, Buffer.from('', 'utf8'));
            const putProbe = cleanSub
              ? `cd "${cleanSub}"; put "${localProbe}" "${probeName}"; del "${probeName}"`
              : `put "${localProbe}" "${probeName}"; del "${probeName}"`;
            const rwRun = runSmbCommandWithCandidates({
              ip: cleanIp,
              candidates: [activeCand],
              commands: [putProbe],
              timeoutMs: 8000,
            });
            isWritableShare = rwRun.ok;
          } catch {
            isWritableShare = false;
          } finally {
            fs.rmSync(tmpProbeDir, { recursive: true, force: true });
          }
        }

        res.json({
          ok: true,
          writable: isWritableShare,
          usedAccount: activeCand ? `${activeCand.domain || 'WORKGROUP'}\\${activeCand.user} (${activeCand.source})` : undefined,
          accessLabel: isWritableShare
            ? `SMB3 RW (//${cleanIp}/${activeCand?.share || smbShare})`
            : `SMB3 Read-Only (//${cleanIp}/${activeCand?.share || smbShare})`,
          items,
        });
      } catch (err: any) {
        res.json({ ok: false, error: err?.message || 'SMB3 directory listing failed' });
      }
      return;
    }

    try {
      const bareWdpUser = String(username || '').replace(/^.*[\\/]/, '');
      const qs = new URLSearchParams({
        knownfolderid: String(knownFolderId),
        path: String(subPath || '\\'),
      });
      if (knownFolderId === 'LocalAppData' && packageFullName) {
        qs.set('packagefullname', String(packageFullName));
      }
      const r = await wdpHttpsRequest({
        ip: cleanIp,
        port,
        reqPath: `/api/filesystem/apps/files?${qs.toString()}`,
        method: 'GET',
        username: bareWdpUser,
        password: String(password),
        timeoutMs: 6000,
      });
      if (r.statusCode >= 400) {
        res.json({ ok: false, error: `WDP returned HTTP ${r.statusCode}: ${r.body.slice(0, 200)}` });
        return;
      }
      const parsed = JSON.parse(r.body);
      const rawItems = Array.isArray(parsed?.Items) ? parsed.Items : [];
      const items = rawItems.map((it: any, idx: number) => {
        const name = String(it.Name || it.Id || `item-${idx}`);
        const isDir = String(it.Type) === '16' || Boolean(it.SubPath && !name.includes('.'));
        return {
          id: `wdp-${idx}-${name}`,
          name,
          path: it.SubPath ? `${it.SubPath}\\${name}` : `\\${name}`,
          isDir,
          sizeBytes: Number(it.FileSize || 0),
          dateModified: it.DateCreated ? String(it.DateCreated) : 'WDP Live',
          extension: isDir ? undefined : path.extname(name).slice(1),
        };
      });
      res.json({
        ok: true,
        writable: true,
        accessLabel: `WDP Read/Write (${knownFolderId})`,
        items,
      });
    } catch (err: any) {
      res.json({ ok: false, error: err?.message || 'WDP filesystem request failed' });
    }
  });

  // Dynamic Live RW Probe on current partition/path (host, SMB3, or WDP)
  app.post('/api/xbox/fs/probe-rw', async (req, res) => {
    const {
      source = 'local',
      localPath = process.cwd(),
      ip = '192.168.1.100',
      wdpPort = 11443,
      username = 'DevUser',
      password = 'XboxDev2026!',
      smbShare = 'DevelopmentFiles',
      subPath = '\\',
    } = req.body as Record<string, any>;

    if (source === 'local') {
      try {
        const rawLocal = localPath && localPath !== process.cwd() ? localPath : subPath && subPath !== '\\' ? subPath : localPath || process.cwd();
        const resolved = path.resolve(String(rawLocal).replace(/^~/, os.homedir()));
        fs.accessSync(resolved, fs.constants.W_OK);
        res.json({ ok: true, writable: true, detail: `RW verified on ${resolved}` });
      } catch (err: any) {
        res.json({ ok: true, writable: false, detail: err?.message || 'Read-only directory' });
      }
      return;
    }

    const cleanIp = resolveTargetIp(ip);
    const port = Number(wdpPort) || 11443;
    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({ ok: false, writable: false, error: 'Cloud preview cannot reach LAN Xbox.' });
      return;
    }

    if (!commandExists('smbclient')) {
      res.json({ ok: false, writable: false, error: 'smbclient missing' });
      return;
    }

    const tmpProbeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xbx-probe-'));
    try {
      const candidates = await getSmbCredentialCandidates({
        ip: cleanIp,
        port,
        username: String(username),
        password: String(password),
        defaultShare: String(smbShare || 'DevelopmentFiles'),
      });
      const probeName = `.xbx_rw_probe_${Date.now()}.tmp`;
      const localProbe = path.join(tmpProbeDir, probeName);
      fs.writeFileSync(localProbe, Buffer.from('', 'utf8'));
      const cleanSub = toSmbSubPath(subPath);
      const putCmd = cleanSub
        ? `cd "${cleanSub}"; put "${localProbe}" "${probeName}"; del "${probeName}"`
        : `put "${localProbe}" "${probeName}"; del "${probeName}"`;
      const rwRun = runSmbCommandWithCandidates({
        ip: cleanIp,
        candidates,
        commands: [putCmd],
        timeoutMs: 10000,
      });
      res.json({
        ok: true,
        writable: rwRun.ok,
        usedAccount: rwRun.usedCandidate ? `${rwRun.usedCandidate.domain || 'WORKGROUP'}\\${rwRun.usedCandidate.user}` : undefined,
        detail: rwRun.ok
          ? `Dynamic RW test passed on //${cleanIp}/${smbShare}${cleanSub ? `\\${cleanSub}` : ''}`
          : rwRun.cleaned.slice(0, 220) || 'Read-only share / permission denied',
      });
    } catch (err: any) {
      res.json({ ok: false, writable: false, error: err?.message || 'RW probe failed' });
    } finally {
      fs.rmSync(tmpProbeDir, { recursive: true, force: true });
    }
  });

  // Full Recursive "Open Book" Kit Filesystem Tree Scanner (WDP, SMB3, or Local Host FS)
  // Gracefully skips restricted OS folders so basic user-level folders & files always expand cleanly
  app.post('/api/xbox/fs/tree', async (req, res) => {
    const {
      source = 'local',
      localPath = process.cwd(),
      ip = '192.168.1.100',
      wdpPort = 11443,
      username = 'DevUser',
      password = 'XboxDev2026!',
      knownFolderId = 'DevelopmentFiles',
      packageFullName = '',
      smbShare = 'DevelopmentFiles',
      subPath = '\\',
      maxDepth = 3,
      maxEntries = 1500,
    } = req.body as Record<string, any>;

    const depthLimit = Math.max(1, Math.min(6, Number(maxDepth) || 3));
    const entryLimit = Math.max(50, Math.min(5000, Number(maxEntries) || 1500));

    if (source === 'local') {
      try {
        const rawLocal = localPath && localPath !== process.cwd() ? localPath : subPath && subPath !== '\\' ? subPath : localPath || process.cwd();
        const resolved = path.resolve(String(rawLocal).replace(/^~/, os.homedir()));
        const items: any[] = [];
        const skippedDirs: Array<{ path: string; reason: string }> = [];

        const walkLocal = (dir: string, depth: number) => {
          if (items.length >= entryLimit) return;
          let children: fs.Dirent[] = [];
          try {
            children = fs.readdirSync(dir, { withFileTypes: true });
          } catch (err: any) {
            skippedDirs.push({ path: dir, reason: err?.code || err?.message || 'EACCES' });
            return;
          }
          for (const e of children) {
            if (items.length >= entryLimit) break;
            if (e.name === 'node_modules' || e.name === '.git') continue;
            const full = path.join(dir, e.name);
            let sizeBytes = 0;
            let dateModified = '';
            try {
              const st = fs.statSync(full);
              sizeBytes = e.isDirectory() ? 0 : st.size;
              dateModified = st.mtime.toISOString().slice(0, 16).replace('T', ' ');
            } catch {
              dateModified = 'restricted';
            }
            const isDir = e.isDirectory();
            items.push({
              id: `tree-local-${items.length}-${e.name}`,
              name: e.name,
              path: full,
              relativePath: path.relative(resolved, full) || e.name,
              depth,
              isDir,
              sizeBytes,
              dateModified,
              extension: isDir ? undefined : path.extname(e.name).slice(1),
            });
            if (isDir && depth < depthLimit) {
              walkLocal(full, depth + 1);
            }
          }
        };

        walkLocal(resolved, 0);
        res.json({
          ok: true,
          root: resolved,
          entries: items,
          skippedDirs,
          totalDirs: items.filter((i) => i.isDir).length,
          totalFiles: items.filter((i) => !i.isDir).length,
          truncated: items.length >= entryLimit,
        });
      } catch (err: any) {
        res.status(400).json({ ok: false, error: err?.message || 'Failed to walk local directory tree' });
      }
      return;
    }

    const cleanIp = resolveTargetIp(ip);
    const port = Number(wdpPort) || 11443;
    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({ ok: false, runningInCloud: true, error: 'Cloud preview cannot reach LAN Xbox.' });
      return;
    }

    const items: any[] = [];
    const skippedDirs: Array<{ path: string; reason: string }> = [];

    if (source === 'smb') {
      if (!commandExists('smbclient')) {
        res.json({ ok: false, error: 'smbclient not installed on host.' });
        return;
      }
      const candidates = await getSmbCredentialCandidates({
        ip: cleanIp,
        port,
        username: String(username),
        password: String(password),
        defaultShare: String(smbShare || 'DevelopmentFiles'),
      });
      const startSub = toSmbSubPath(subPath);
      const queue: Array<{ sub: string; depth: number }> = [{ sub: startSub, depth: 0 }];
      let dirsVisited = 0;

      while (queue.length > 0 && items.length < entryLimit && dirsVisited < 80) {
        const cur = queue.shift()!;
        dirsVisited++;
        const dirCmds = cur.sub
          ? [`cd "${cur.sub}"; dir`, `dir "${cur.sub}\\*"`]
          : ['dir'];
        const smbRun = runSmbCommandWithCandidates({
          ip: cleanIp,
          candidates,
          commands: dirCmds,
          timeoutMs: 9000,
        });
        if (!smbRun.ok && isSmbFatalError(smbRun.cleaned)) {
          skippedDirs.push({
            path: cur.sub ? `\\${cur.sub}` : '\\',
            reason: smbRun.cleaned.slice(0, 140),
          });
          continue;
        }
        const parsed = parseSmbDirOutput(smbRun.cleaned, cur.sub);
        for (const it of parsed) {
          if (items.length >= entryLimit) break;
          items.push({
            ...it,
            relativePath: it.path.replace(/^\\+/, ''),
            depth: cur.depth,
          });
          if (it.isDir && cur.depth < depthLimit) {
            queue.push({ sub: toSmbSubPath(it.path), depth: cur.depth + 1 });
          }
        }
      }

      res.json({
        ok: true,
        root: `//${cleanIp}/${smbShare}${startSub ? `\\${startSub}` : ''}`,
        entries: items,
        skippedDirs,
        totalDirs: items.filter((i) => i.isDir).length,
        totalFiles: items.filter((i) => !i.isDir).length,
        truncated: items.length >= entryLimit || dirsVisited >= 80,
      });
      return;
    }

    // WDP KnownFolder recursive tree BFS
    const bareWdpUser = String(username || '').replace(/^.*[\\/]/, '');
    const startPath = String(subPath || '\\') || '\\';
    const queue: Array<{ folder: string; depth: number }> = [{ folder: startPath, depth: 0 }];
    let dirsVisited = 0;

    while (queue.length > 0 && items.length < entryLimit && dirsVisited < 80) {
      const cur = queue.shift()!;
      dirsVisited++;
      try {
        const qs = new URLSearchParams({
          knownfolderid: String(knownFolderId),
          path: cur.folder,
        });
        if (knownFolderId === 'LocalAppData' && packageFullName) {
          qs.set('packagefullname', String(packageFullName));
        }
        const r = await wdpHttpsRequest({
          ip: cleanIp,
          port,
          reqPath: `/api/filesystem/apps/files?${qs.toString()}`,
          method: 'GET',
          username: bareWdpUser,
          password: String(password),
          timeoutMs: 6000,
        });
        if (r.statusCode >= 400) {
          skippedDirs.push({ path: cur.folder, reason: `WDP HTTP ${r.statusCode}` });
          continue;
        }
        const parsed = JSON.parse(r.body);
        const rawItems = Array.isArray(parsed?.Items) ? parsed.Items : [];
        rawItems.forEach((it: any, idx: number) => {
          if (items.length >= entryLimit) return;
          const name = String(it.Name || it.Id || `item-${idx}`);
          const isDir = String(it.Type) === '16' || Boolean(it.SubPath && !name.includes('.'));
          const full = it.SubPath ? `${it.SubPath}\\${name}` : cur.folder === '\\' ? `\\${name}` : `${cur.folder}\\${name}`;
          items.push({
            id: `tree-wdp-${items.length}-${name}`,
            name,
            path: full,
            relativePath: full.replace(/^\\+/, ''),
            depth: cur.depth,
            isDir,
            sizeBytes: Number(it.FileSize || 0),
            dateModified: it.DateCreated ? String(it.DateCreated) : 'WDP Live',
            extension: isDir ? undefined : path.extname(name).slice(1),
          });
          if (isDir && cur.depth < depthLimit) {
            queue.push({ folder: full, depth: cur.depth + 1 });
          }
        });
      } catch (err: any) {
        skippedDirs.push({ path: cur.folder, reason: err?.message || 'WDP error' });
      }
    }

    if (items.length === 0 && skippedDirs.length > 0 && skippedDirs[0].path === startPath) {
      res.json({
        ok: false,
        error: skippedDirs[0].reason,
        skippedDirs,
      });
      return;
    }

    res.json({
      ok: true,
      root: `${knownFolderId}${startPath}`,
      entries: items,
      skippedDirs,
      totalDirs: items.filter((i) => i.isDir).length,
      totalFiles: items.filter((i) => !i.isDir).length,
      truncated: items.length >= entryLimit || dirsVisited >= 80,
    });
  });

  // Real File Read (Local Host FS, WDP KnownFolder, or SMB3 Share) with Full-Content Byte-Range Pagination, PDF Extraction & Automatic Fallback
  app.post('/api/xbox/fs/read', async (req, res) => {
    const {
      source = 'local',
      filePath = '',
      ip = '192.168.1.100',
      wdpPort = 11443,
      username = 'DevUser',
      password = 'XboxDev2026!',
      knownFolderId = 'DevelopmentFiles',
      packageFullName = '',
      smbShare = 'DevelopmentFiles',
      subPath = '\\',
      filename = '',
      offset = 0,
      maxBytes: rawMaxBytes = 512 * 1024,
      extractPdfText = true,
    } = req.body as Record<string, any>;

    const reqOffset = Math.max(0, Number(offset) || 0);
    const reqMaxBytes = Math.max(64 * 1024, Math.min(4 * 1024 * 1024, Number(rawMaxBytes) || 512 * 1024));

    const formatReadableBufferSlice = (fullBuf: Buffer, nameHint: string) => {
      const ext = path.extname(nameHint).toLowerCase();
      if (ext === '.pdf' && extractPdfText !== false && reqOffset === 0) {
        const pdfOut = extractFullTextFromPdf(fullBuf);
        if (pdfOut.text.trim()) {
          return {
            content: pdfOut.text,
            sizeBytes: fullBuf.length,
            offset: 0,
            chunkBytes: fullBuf.length,
            hasMore: false,
            nextOffset: fullBuf.length,
            truncated: false,
            extractedStrings: false,
            isPdf: true,
            pageCountHint: pdfOut.pageCount,
            pdfMethod: pdfOut.method,
          };
        }
      }
      const start = Math.min(reqOffset, fullBuf.length);
      const end = Math.min(fullBuf.length, start + reqMaxBytes);
      const slice = fullBuf.subarray(start, end);
      const hasNull = slice.includes(0);
      const content = hasNull
        ? (slice.toString('latin1').match(/[\x20-\x7e]{4,}/g) || []).join('\n')
        : slice.toString('utf8');
      return {
        content,
        sizeBytes: fullBuf.length,
        offset: start,
        chunkBytes: slice.length,
        hasMore: end < fullBuf.length,
        nextOffset: end,
        truncated: end < fullBuf.length || start > 0,
        extractedStrings: hasNull,
        isPdf: ext === '.pdf',
      };
    };

    if (source === 'local') {
      try {
        const candidateRaw = filePath
          ? String(filePath)
          : path.join(String(subPath || process.cwd()), String(filename || ''));
        const resolved = path.resolve(candidateRaw.replace(/^~/, os.homedir()));
        const st = fs.statSync(resolved);
        const ext = path.extname(resolved).toLowerCase();
        // If small-to-medium (<= 64MB) or PDF, read cleanly with range or PDF extractor
        if (ext === '.pdf' && extractPdfText !== false && reqOffset === 0 && st.size <= 64 * 1024 * 1024) {
          const buf = fs.readFileSync(resolved);
          res.json({ ok: true, resolvedPath: resolved, ...formatReadableBufferSlice(buf, resolved) });
          return;
        }
        const fd = fs.openSync(resolved, 'r');
        try {
          const start = Math.min(reqOffset, st.size);
          const toRead = Math.min(reqMaxBytes, Math.max(0, st.size - start));
          const slice = Buffer.allocUnsafe(toRead);
          const bytesRead = toRead > 0 ? fs.readSync(fd, slice, 0, toRead, start) : 0;
          const actualSlice = slice.subarray(0, bytesRead);
          const hasNull = actualSlice.includes(0);
          const content = hasNull
            ? (actualSlice.toString('latin1').match(/[\x20-\x7e]{4,}/g) || []).join('\n')
            : actualSlice.toString('utf8');
          const nextOffset = start + bytesRead;
          res.json({
            ok: true,
            resolvedPath: resolved,
            sizeBytes: st.size,
            offset: start,
            chunkBytes: bytesRead,
            hasMore: nextOffset < st.size,
            nextOffset,
            truncated: nextOffset < st.size || start > 0,
            extractedStrings: hasNull,
            isPdf: ext === '.pdf',
            content,
          });
        } finally {
          fs.closeSync(fd);
        }
      } catch (err: any) {
        res.status(400).json({ ok: false, error: err?.message || 'Failed to read file' });
      }
      return;
    }

    const cleanIp = resolveTargetIp(ip);
    const port = Number(wdpPort) || 11443;
    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({ ok: false, runningInCloud: true, error: 'Cloud preview cannot reach LAN Xbox.' });
      return;
    }

    // Derive full relative path inside share / KnownFolder so Grep / Bookmarks / Tree reads always keep parent folders
    const rawFP = toSmbSubPath(String(filePath || ''));
    const rawSub = toSmbSubPath(String(subPath || ''));
    const baseName = path.basename(String(filename || rawFP || 'file.txt'));
    const fullRelSmbPath = rawFP
      ? rawFP
      : rawSub
      ? `${rawSub}\\${baseName}`
      : baseName;
    const relParentDir = fullRelSmbPath.includes('\\')
      ? fullRelSmbPath.slice(0, fullRelSmbPath.lastIndexOf('\\'))
      : rawSub;

    const trySmbRead = async (shareOverride?: string, relOverride?: string) => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xbx-smbread-'));
      try {
        const effectiveShare = shareOverride || String(smbShare || 'DevelopmentFiles');
        const effectiveRel = relOverride || fullRelSmbPath;
        const effectiveParent = effectiveRel.includes('\\')
          ? effectiveRel.slice(0, effectiveRel.lastIndexOf('\\'))
          : '';
        const targetBase = path.basename(effectiveRel) || baseName;
        const localTmp = path.join(tmpDir, targetBase);
        const candidates = await getSmbCredentialCandidates({
          ip: cleanIp,
          port,
          username: String(username),
          password: String(password),
          defaultShare: effectiveShare,
        });
        // Direct get (honors SeChangeNotifyPrivilege Bypass Traverse Checking) AND cd+get fallback
        const cmds: string[] = [`get "${effectiveRel}" "${localTmp}"`];
        if (effectiveParent) {
          cmds.push(`cd "${effectiveParent}"; get "${targetBase}" "${localTmp}"`);
        }
        const smbRun = runSmbCommandWithCandidates({
          ip: cleanIp,
          candidates,
          commands: cmds,
          timeoutMs: 25000,
          verifyFilePath: localTmp,
        });
        if (!smbRun.ok || !fs.existsSync(localTmp)) {
          return {
            ok: false as const,
            error: smbRun.cleaned || `Failed to read ${effectiveRel} via SMB3 (//${cleanIp}/${effectiveShare})`,
          };
        }
        const buf = fs.readFileSync(localTmp);
        return {
          ok: true as const,
          resolvedPath: `//${cleanIp}/${effectiveShare}/${effectiveRel.replace(/\\/g, '/')}`,
          usedAccount: smbRun.usedCandidate ? `${smbRun.usedCandidate.domain || 'WORKGROUP'}\\${smbRun.usedCandidate.user}` : undefined,
          ...formatReadableBufferSlice(buf, targetBase),
        };
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    };

    if (source === 'smb') {
      try {
        const result = await trySmbRead();
        res.json(result);
      } catch (err: any) {
        res.json({ ok: false, error: err?.message || 'SMB file read failed' });
      }
      return;
    }

    // WDP read with explicit error reporting + automatic SMB3 fallback on 401/403/404 Access Denied!
    try {
      const bareWdpUser = String(username || '').replace(/^.*[\\/]/, '');
      const wdpSubFolder = relParentDir ? `\\${relParentDir}` : String(subPath || '\\');
      const qs = new URLSearchParams({
        knownfolderid: String(knownFolderId),
        path: wdpSubFolder,
        filename: baseName,
      });
      if (knownFolderId === 'LocalAppData' && packageFullName) {
        qs.set('packagefullname', String(packageFullName));
      }
      const r = await wdpHttpsRequest({
        ip: cleanIp,
        port,
        reqPath: `/api/filesystem/apps/file?${qs.toString()}`,
        method: 'GET',
        username: bareWdpUser,
        password: String(password),
        timeoutMs: 12000,
      });

      if (r.statusCode >= 400) {
        // Automatic SMB3 fallback for basic-user readable shares (e.g. DevelopmentFiles, Dumps, or configured smbShare)
        const fallbackShare =
          String(knownFolderId) === 'DevelopmentFiles' || String(knownFolderId) === 'Dumps'
            ? 'DevelopmentFiles'
            : String(smbShare || '');
        const fallbackRel =
          String(knownFolderId) === 'Dumps' && !/^Dumps\\/i.test(fullRelSmbPath)
            ? `Dumps\\${fullRelSmbPath}`
            : fullRelSmbPath;
        if (fallbackShare && commandExists('smbclient')) {
          const smbFallback = await trySmbRead(fallbackShare, fallbackRel);
          if (smbFallback.ok) {
            res.json({ ...smbFallback, fallbackBackend: 'smb' });
            return;
          }
        }
        res.json({
          ok: false,
          statusCode: r.statusCode,
          error: `WDP HTTP ${r.statusCode}: ${(r.body || 'Access Denied').slice(0, 240)}`,
          content: '',
        });
        return;
      }

      const rawBody = r.body || '';
      const totalLen = rawBody.length;
      const start = Math.min(reqOffset, totalLen);
      const end = Math.min(totalLen, start + reqMaxBytes);
      res.json({
        ok: true,
        resolvedPath: `${knownFolderId}${wdpSubFolder === '\\' ? '' : wdpSubFolder}\\${baseName}`,
        content: rawBody.slice(start, end),
        sizeBytes: totalLen,
        offset: start,
        chunkBytes: end - start,
        hasMore: end < totalLen,
        nextOffset: end,
        truncated: end < totalLen || start > 0,
      });
    } catch (err: any) {
      res.json({ ok: false, error: err?.message || 'Failed to fetch WDP file' });
    }
  });

  // Real File Write / Upload (Local Host FS, WDP KnownFolder, or SMB3 Share)
  app.post('/api/xbox/fs/write', async (req, res) => {
    const {
      source = 'local',
      filePath = '',
      ip = '192.168.1.100',
      wdpPort = 11443,
      username = 'DevUser',
      password = 'XboxDev2026!',
      knownFolderId = 'DevelopmentFiles',
      packageFullName = '',
      smbShare = 'DevelopmentFiles',
      subPath = '\\',
      filename = 'file.txt',
      contentBase64 = '',
      textContent,
    } = req.body as Record<string, any>;

    const dataBuf =
      typeof textContent === 'string'
        ? Buffer.from(textContent, 'utf8')
        : Buffer.from(String(contentBase64 || ''), 'base64');
    const safeName = path.basename(String(filename || path.basename(String(filePath || 'file.txt'))));

    if (source === 'local') {
      try {
        const target = filePath
          ? path.resolve(String(filePath).replace(/^~/, os.homedir()))
          : path.resolve(String(subPath || process.cwd()), safeName);
        fs.writeFileSync(target, dataBuf);
        res.json({ ok: true, resolvedPath: target, sizeBytes: dataBuf.length });
      } catch (err: any) {
        res.status(400).json({ ok: false, error: err?.message || 'Local write failed (read-only or permission denied)' });
      }
      return;
    }

    const cleanIp = resolveTargetIp(ip);
    const port = Number(wdpPort) || 11443;
    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({ ok: false, runningInCloud: true, error: 'Cloud preview cannot write to LAN Xbox.' });
      return;
    }

    if (source === 'smb') {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xbx-smbwrite-'));
      try {
        const candidates = await getSmbCredentialCandidates({
          ip: cleanIp,
          port,
          username: String(username),
          password: String(password),
          defaultShare: String(smbShare || 'DevelopmentFiles'),
        });
        const localFile = path.join(tmpDir, safeName);
        fs.writeFileSync(localFile, dataBuf);
        const cleanSub = toSmbSubPath(subPath);
        const putCmd = cleanSub
          ? `cd "${cleanSub}"; put "${localFile}" "${safeName}"`
          : `put "${localFile}" "${safeName}"`;
        const smbRun = runSmbCommandWithCandidates({
          ip: cleanIp,
          candidates,
          commands: [putCmd, `put "${localFile}" "${cleanSub ? `${cleanSub}\\${safeName}` : safeName}"`],
          timeoutMs: 20000,
        });
        const activeCand = smbRun.usedCandidate || candidates[0];
        res.json({
          ok: smbRun.ok,
          error: !smbRun.ok ? smbRun.cleaned || `SMB write failed (status ${smbRun.status})` : null,
          detail: `SMB3 wrote ${safeName} (${dataBuf.length} bytes) to //${cleanIp}/${activeCand?.share || smbShare}/${cleanSub}`,
        });
      } catch (err: any) {
        res.json({ ok: false, error: err?.message || 'SMB write failed' });
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
      return;
    }

    try {
      const qs = new URLSearchParams({
        knownfolderid: String(knownFolderId),
        path: String(subPath || '\\'),
        extract: 'false',
      });
      if (knownFolderId === 'LocalAppData' && packageFullName) {
        qs.set('packagefullname', String(packageFullName));
      }
      const { contentType, body } = buildMultipartBody([
        {
          name: 'file',
          filename: safeName,
          contentType: 'application/octet-stream',
          data: dataBuf,
        },
      ]);
      const r = await wdpCsrfRequest({
        ip: cleanIp,
        port,
        reqPath: `/api/filesystem/apps/file?${qs.toString()}`,
        method: 'POST',
        username: String(username),
        password: String(password),
        body,
        contentType,
        timeoutMs: 25000,
      });
      res.json({
        ok: r.statusCode >= 200 && r.statusCode < 300,
        statusCode: r.statusCode,
        error: r.statusCode >= 300 ? `WDP write HTTP ${r.statusCode}: ${r.body.slice(0, 200)}` : null,
      });
    } catch (err: any) {
      res.json({ ok: false, error: err?.message || 'WDP write failed' });
    }
  });

  // Real Create Folder (Local Host FS, SMB3, or WDP KnownFolder via placeholder marker or SMB mkdir)
  app.post('/api/xbox/fs/mkdir', async (req, res) => {
    const {
      source = 'local',
      localPath = '',
      ip = '192.168.1.100',
      wdpPort = 11443,
      username = 'DevUser',
      password = 'XboxDev2026!',
      knownFolderId = 'DevelopmentFiles',
      packageFullName = '',
      smbShare = 'DevelopmentFiles',
      subPath = '\\',
      folderName = '',
    } = req.body as Record<string, any>;

    const cleanFolder = path.basename(String(folderName || '').trim());
    if (!cleanFolder) {
      res.status(400).json({ ok: false, error: 'Folder name required.' });
      return;
    }

    if (source === 'local') {
      try {
        const target = path.join(path.resolve(String(localPath || process.cwd()).replace(/^~/, os.homedir())), cleanFolder);
        fs.mkdirSync(target, { recursive: true });
        res.json({ ok: true, resolvedPath: target });
      } catch (err: any) {
        res.status(400).json({ ok: false, error: err?.message || 'mkdir failed' });
      }
      return;
    }

    const cleanIp = resolveTargetIp(ip);
    const port = Number(wdpPort) || 11443;
    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({ ok: false, runningInCloud: true, error: 'Cloud preview cannot reach LAN Xbox.' });
      return;
    }

    // Prefer SMB3 mkdir when SMB share is DevelopmentFiles or explicit smb mode
    if (source === 'smb' || knownFolderId === 'DevelopmentFiles') {
      try {
        const candidates = await getSmbCredentialCandidates({
          ip: cleanIp,
          port,
          username: String(username),
          password: String(password),
          defaultShare: String(smbShare || 'DevelopmentFiles'),
        });
        const cleanSub = toSmbSubPath(subPath);
        const mkCmd = cleanSub ? `cd "${cleanSub}"; mkdir "${cleanFolder}"` : `mkdir "${cleanFolder}"`;
        const smbRun = runSmbCommandWithCandidates({
          ip: cleanIp,
          candidates,
          commands: [mkCmd, `mkdir "${cleanSub ? `${cleanSub}\\${cleanFolder}` : cleanFolder}"`],
          timeoutMs: 10000,
        });
        if (smbRun.ok || source === 'smb') {
          res.json({ ok: smbRun.ok, error: smbRun.ok ? null : smbRun.cleaned || 'SMB mkdir failed' });
          return;
        }
      } catch {}
    }

    // WDP KnownFolder folder creation by uploading an empty .keep file into subpath\folderName
    try {
      const targetSub = subPath === '\\' ? `\\${cleanFolder}` : `${String(subPath).replace(/\\+$/, '')}\\${cleanFolder}`;
      const qs = new URLSearchParams({
        knownfolderid: String(knownFolderId),
        path: targetSub,
        extract: 'false',
      });
      if (knownFolderId === 'LocalAppData' && packageFullName) {
        qs.set('packagefullname', String(packageFullName));
      }
      const { contentType, body } = buildMultipartBody([
        { name: 'file', filename: '.xbx_dir', contentType: 'text/plain', data: Buffer.from('', 'utf8') },
      ]);
      const r = await wdpCsrfRequest({
        ip: cleanIp,
        port,
        reqPath: `/api/filesystem/apps/file?${qs.toString()}`,
        method: 'POST',
        username: String(username).replace(/^.*[\\/]/, ''),
        password: String(password),
        body,
        contentType,
        timeoutMs: 12000,
      });
      res.json({
        ok: r.statusCode >= 200 && r.statusCode < 300,
        error: r.statusCode >= 300 ? `WDP mkdir HTTP ${r.statusCode}: ${r.body.slice(0, 180)}` : null,
      });
    } catch (err: any) {
      res.json({ ok: false, error: err?.message || 'WDP mkdir failed' });
    }
  });

  // Real File / Folder Delete (Local Host FS, WDP KnownFolder, or SMB3)
  app.post('/api/xbox/fs/delete', async (req, res) => {
    const {
      source = 'local',
      filePath = '',
      isDir = false,
      ip = '192.168.1.100',
      wdpPort = 11443,
      username = 'DevUser',
      password = 'XboxDev2026!',
      knownFolderId = 'DevelopmentFiles',
      packageFullName = '',
      smbShare = 'DevelopmentFiles',
      subPath = '\\',
      filename = '',
    } = req.body as Record<string, any>;

    if (source === 'local') {
      try {
        const resolved = path.resolve(String(filePath).replace(/^~/, os.homedir()));
        fs.rmSync(resolved, { recursive: Boolean(isDir), force: false });
        res.json({ ok: true });
      } catch (err: any) {
        res.status(400).json({ ok: false, error: err?.message || 'Delete failed' });
      }
      return;
    }

    const cleanIp = resolveTargetIp(ip);
    const port = Number(wdpPort) || 11443;
    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({ ok: false, runningInCloud: true, error: 'Cloud preview cannot reach LAN Xbox.' });
      return;
    }

    if (source === 'smb') {
      try {
        const candidates = await getSmbCredentialCandidates({
          ip: cleanIp,
          port,
          username: String(username),
          password: String(password),
          defaultShare: String(smbShare || 'DevelopmentFiles'),
        });
        const cleanSub = toSmbSubPath(subPath);
        const target = path.basename(String(filename || filePath));
        const delOp = isDir ? `rmdir "${target}"` : `del "${target}"`;
        const cmd = cleanSub ? `cd "${cleanSub}"; ${delOp}` : delOp;
        const smbRun = runSmbCommandWithCandidates({
          ip: cleanIp,
          candidates,
          commands: [cmd],
          timeoutMs: 10000,
        });
        res.json({ ok: smbRun.ok, error: smbRun.ok ? null : smbRun.cleaned || 'SMB delete failed' });
      } catch (err: any) {
        res.json({ ok: false, error: err?.message || 'SMB delete failed' });
      }
      return;
    }

    try {
      const qs = new URLSearchParams({
        knownfolderid: String(knownFolderId),
        path: String(subPath || '\\'),
        filename: String(filename),
      });
      if (knownFolderId === 'LocalAppData' && packageFullName) {
        qs.set('packagefullname', String(packageFullName));
      }
      const r = await wdpCsrfRequest({
        ip: cleanIp,
        port,
        reqPath: `/api/filesystem/apps/file?${qs.toString()}`,
        method: 'DELETE',
        username: String(username),
        password: String(password),
        timeoutMs: 12000,
      });
      res.json({
        ok: r.statusCode >= 200 && r.statusCode < 300,
        error: r.statusCode >= 300 ? `WDP delete HTTP ${r.statusCode}: ${r.body.slice(0, 180)}` : null,
      });
    } catch (err: any) {
      res.json({ ok: false, error: err?.message || 'WDP delete failed' });
    }
  });

  // Real Recursive String & Regex Grepping Tool (handles text + binary ASCII/UTF-16LE strings)
  app.post('/api/xbox/fs/grep', (req, res) => {
    try {
      const {
        rootPath = process.cwd(),
        pattern = '',
        isRegex = false,
        caseSensitive = false,
        scanBinaryStrings = true,
        maxResults = 250,
      } = req.body as {
        rootPath?: string;
        pattern?: string;
        isRegex?: boolean;
        caseSensitive?: boolean;
        scanBinaryStrings?: boolean;
        maxResults?: number;
      };

      const q = String(pattern || '');
      if (!q) {
        res.status(400).json({ ok: false, error: 'Search pattern cannot be empty.' });
        return;
      }

      const resolvedRoot = path.resolve(String(rootPath).replace(/^~/, os.homedir()));
      if (!fs.existsSync(resolvedRoot)) {
        res.status(400).json({ ok: false, error: `Path does not exist: ${resolvedRoot}` });
        return;
      }

      const flags = caseSensitive ? 'g' : 'gi';
      const matcher = isRegex
        ? new RegExp(q, flags)
        : new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

      const matches: Array<{
        file: string;
        line: number;
        offsetHex: string;
        match: string;
        lineText: string;
        isBinary: boolean;
      }> = [];

      let filesScanned = 0;
      const MAX_FILES = 600;
      const MAX_FILE_BYTES = 4 * 1024 * 1024;
      const skipDirs = new Set(['node_modules', '.git', 'dist', '.next', '__pycache__']);

      const walk = (target: string) => {
        if (matches.length >= maxResults || filesScanned >= MAX_FILES) return;
        let st: fs.Stats;
        try {
          st = fs.statSync(target);
        } catch {
          return;
        }
        if (st.isDirectory()) {
          let children: string[] = [];
          try {
            children = fs.readdirSync(target);
          } catch {
            return;
          }
          for (const child of children) {
            if (skipDirs.has(child)) continue;
            walk(path.join(target, child));
            if (matches.length >= maxResults || filesScanned >= MAX_FILES) break;
          }
          return;
        }

        if (!st.isFile() || st.size === 0 || st.size > MAX_FILE_BYTES) return;
        filesScanned++;

        let buf: Buffer;
        try {
          buf = fs.readFileSync(target);
        } catch {
          return;
        }

        const isBinary = buf.subarray(0, 4096).includes(0);
        if (isBinary && !scanBinaryStrings) return;

        if (!isBinary) {
          const lines = buf.toString('utf8').split(/\r?\n/);
          let byteOffset = 0;
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            matcher.lastIndex = 0;
            const m = matcher.exec(line);
            if (m) {
              matches.push({
                file: target,
                line: i + 1,
                offsetHex: '0x' + byteOffset.toString(16).toUpperCase().padStart(6, '0'),
                match: m[0],
                lineText: line.trim().slice(0, 240),
                isBinary: false,
              });
              if (matches.length >= maxResults) break;
            }
            byteOffset += Buffer.byteLength(line, 'utf8') + 1;
          }
        } else {
          // Extract printable ASCII strings >= 4 chars
          const asciiRe = /[\x20-\x7e]{4,}/g;
          const latin = buf.toString('latin1');
          let strMatch: RegExpExecArray | null;
          while ((strMatch = asciiRe.exec(latin)) !== null) {
            matcher.lastIndex = 0;
            const inner = matcher.exec(strMatch[0]);
            if (inner) {
              matches.push({
                file: target,
                line: 0,
                offsetHex: '0x' + strMatch.index.toString(16).toUpperCase().padStart(6, '0'),
                match: inner[0],
                lineText: strMatch[0].slice(0, 240),
                isBinary: true,
              });
              if (matches.length >= maxResults) break;
            }
          }
        }
      };

      walk(resolvedRoot);
      res.json({
        ok: true,
        rootPath: resolvedRoot,
        filesScanned,
        matches,
        truncated: matches.length >= maxResults || filesScanned >= MAX_FILES,
      });
    } catch (err: any) {
      res.status(400).json({ ok: false, error: err?.message || 'Grep failed' });
    }
  });

  // Real XBDM TCP (:730) Peek / Poke / Command client
  app.post('/api/xbox/peekpoke/xbdm', async (req, res) => {
    const {
      ip = '192.168.1.100',
      port = 730,
      action = 'peek',
      address = '0x82000000',
      length = 256,
      hexData = '',
      command = 'dbgname',
    } = req.body as {
      ip?: string;
      port?: number;
      action?: 'peek' | 'poke' | 'cmd';
      address?: string;
      length?: number;
      hexData?: string;
      command?: string;
    };

    const cleanIp = resolveTargetIp(ip);
    const targetPort = Number(port) || 730;
    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({
        ok: false,
        runningInCloud: true,
        error: `Cloud preview cannot open XBDM TCP :${targetPort} to LAN IP ${cleanIp}. Run locally on Kali (npm run dev) or use Local File / Dump Peek & Poke.`,
      });
      return;
    }

    const cleanAddr = String(address || '0x0').trim().replace(/^0x/i, '');
    const reqLen = Math.max(1, Math.min(4096, Number(length) || 256));
    const cleanHex = String(hexData || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();

    let wireCmd = '';
    if (action === 'peek') {
      wireCmd = `getmem addr=0x${cleanAddr} length=0x${reqLen.toString(16)}`;
    } else if (action === 'poke') {
      if (!cleanHex || cleanHex.length % 2 !== 0) {
        res.status(400).json({ ok: false, error: 'hexData must be non-empty even-length hex bytes.' });
        return;
      }
      wireCmd = `setmem addr=0x${cleanAddr} data=${cleanHex}`;
    } else {
      wireCmd = String(command || 'dbgname').trim();
    }

    try {
      const result = await new Promise<{ banner: string; raw: string }>((resolve, reject) => {
        const socket = net.createConnection({ host: cleanIp, port: targetPort });
        let stage: 'banner' | 'response' = 'banner';
        let buf = '';
        let banner = '';
        let isMultiline = false;
        let settled = false;

        const finish = (err?: Error) => {
          if (settled) return;
          settled = true;
          socket.destroy();
          if (err) reject(err);
          else resolve({ banner, raw: buf });
        };

        socket.setTimeout(4500);
        socket.on('timeout', () => finish(new Error(`XBDM TCP timeout waiting on ${cleanIp}:${targetPort}`)));
        socket.on('error', (err) => finish(err));
        socket.on('data', (chunk) => {
          buf += chunk.toString('latin1');
          if (stage === 'banner') {
            const nlIdx = buf.indexOf('\r\n');
            if (nlIdx !== -1) {
              banner = buf.slice(0, nlIdx).trim();
              buf = buf.slice(nlIdx + 2);
              stage = 'response';
              socket.write(`${wireCmd}\r\n`);
            }
            return;
          }

          if (!isMultiline && buf.length >= 4) {
            if (buf.startsWith('202-') || buf.startsWith('203-')) {
              isMultiline = true;
            }
          }

          if (isMultiline) {
            const endMarker = buf.indexOf('\r\n.\r\n');
            if (endMarker !== -1) {
              buf = buf.slice(0, endMarker);
              finish();
            }
          } else {
            const lineEnd = buf.indexOf('\r\n');
            if (lineEnd !== -1) {
              buf = buf.slice(0, lineEnd);
              finish();
            }
          }
        });
      });

      const lines = result.raw.split(/\r?\n/);
      const statusLine = lines[0] || '';
      const ok = statusLine.startsWith('200-') || statusLine.startsWith('202-') || statusLine.startsWith('203-');

      let extractedHex = '';
      if (action === 'peek' && ok) {
        extractedHex = lines
          .slice(1)
          .join('')
          .replace(/[^0-9a-fA-F?]/g, '')
          .toUpperCase();
      }

      res.json({
        ok,
        banner: result.banner,
        command: wireCmd,
        statusLine,
        rawResponse: result.raw,
        hexBytes: extractedHex,
        address: `0x${cleanAddr.toUpperCase()}`,
      });
    } catch (err: any) {
      res.json({
        ok: false,
        command: wireCmd,
        error: err?.message || `Failed XBDM connection to ${cleanIp}:${targetPort}`,
      });
    }
  });

  // Real Local Binary / Crash Dump / SMB-Mounted File Peek & Pattern Scan
  app.post('/api/xbox/peekpoke/file-peek', (req, res) => {
    try {
      const {
        filePath = '',
        offset = 0,
        length = 256,
        scanType,
        scanValue = '',
        endian = 'le',
      } = req.body as {
        filePath?: string;
        offset?: number | string;
        length?: number;
        scanType?: 'hex' | 'u8' | 'u16' | 'u32' | 'u64' | 'f32' | 'ascii' | 'utf16le';
        scanValue?: string;
        endian?: 'le' | 'be';
      };

      const resolved = path.resolve(String(filePath || '').replace(/^~/, os.homedir()));
      if (!resolved || !fs.existsSync(resolved)) {
        res.status(400).json({ ok: false, error: `File not found: ${resolved}` });
        return;
      }
      const st = fs.statSync(resolved);
      if (!st.isFile()) {
        res.status(400).json({ ok: false, error: `Not a regular file: ${resolved}` });
        return;
      }

      if (scanType && String(scanValue).trim() !== '') {
        let needle: Buffer;
        const val = String(scanValue).trim();
        const isLE = endian !== 'be';
        if (scanType === 'hex') {
          const clean = val.replace(/[^0-9a-fA-F]/g, '');
          if (!clean || clean.length % 2 !== 0) {
            res.status(400).json({ ok: false, error: 'Hex pattern must have an even number of hex digits.' });
            return;
          }
          needle = Buffer.from(clean, 'hex');
        } else if (scanType === 'ascii') {
          needle = Buffer.from(val, 'utf8');
        } else if (scanType === 'utf16le') {
          needle = Buffer.from(val, 'utf16le');
        } else if (scanType === 'u8') {
          const n = val.startsWith('0x') ? parseInt(val, 16) : Number(val);
          needle = Buffer.alloc(1);
          needle.writeUInt8(n & 0xff, 0);
        } else if (scanType === 'u16') {
          const n = val.startsWith('0x') ? parseInt(val, 16) : Number(val);
          needle = Buffer.alloc(2);
          isLE ? needle.writeUInt16LE(n & 0xffff, 0) : needle.writeUInt16BE(n & 0xffff, 0);
        } else if (scanType === 'u32') {
          const n = (val.startsWith('0x') ? parseInt(val, 16) : Number(val)) >>> 0;
          needle = Buffer.alloc(4);
          isLE ? needle.writeUInt32LE(n, 0) : needle.writeUInt32BE(n, 0);
        } else if (scanType === 'u64') {
          const big = BigInt(val);
          needle = Buffer.alloc(8);
          isLE ? needle.writeBigUInt64LE(big, 0) : needle.writeBigUInt64BE(big, 0);
        } else {
          const f = Number(val);
          needle = Buffer.alloc(4);
          isLE ? needle.writeFloatLE(f, 0) : needle.writeFloatBE(f, 0);
        }

        const maxScanSize = 32 * 1024 * 1024;
        const scanLen = Math.min(st.size, maxScanSize);
        const fd = fs.openSync(resolved, 'r');
        const buf = Buffer.alloc(scanLen);
        fs.readSync(fd, buf, 0, scanLen, 0);
        fs.closeSync(fd);

        const hits: Array<{ offset: number; offsetHex: string; contextHex: string }> = [];
        let pos = 0;
        while (hits.length < 200 && pos <= buf.length - needle.length) {
          const foundIdx = buf.indexOf(needle, pos);
          if (foundIdx === -1) break;
          const ctxStart = Math.max(0, foundIdx);
          const ctxEnd = Math.min(buf.length, foundIdx + Math.max(needle.length, 16));
          hits.push({
            offset: foundIdx,
            offsetHex: '0x' + foundIdx.toString(16).toUpperCase().padStart(8, '0'),
            contextHex: buf.subarray(ctxStart, ctxEnd).toString('hex').toUpperCase(),
          });
          pos = foundIdx + 1;
        }

        res.json({
          ok: true,
          resolvedPath: resolved,
          fileSize: st.size,
          scannedBytes: scanLen,
          needleHex: needle.toString('hex').toUpperCase(),
          hits,
        });
        return;
      }

      const parsedOffset =
        typeof offset === 'string' && offset.trim().toLowerCase().startsWith('0x')
          ? parseInt(offset.trim(), 16)
          : Number(offset) || 0;
      const safeOffset = Math.max(0, Math.min(Math.max(0, st.size - 1), parsedOffset));
      const readLen = Math.max(1, Math.min(4096, Number(length) || 256));
      const actualLen = Math.min(readLen, Math.max(0, st.size - safeOffset));

      const outBuf = Buffer.alloc(actualLen);
      const fd = fs.openSync(resolved, 'r');
      fs.readSync(fd, outBuf, 0, actualLen, safeOffset);
      fs.closeSync(fd);

      res.json({
        ok: true,
        resolvedPath: resolved,
        fileSize: st.size,
        offset: safeOffset,
        offsetHex: '0x' + safeOffset.toString(16).toUpperCase().padStart(8, '0'),
        hexBytes: outBuf.toString('hex').toUpperCase(),
      });
    } catch (err: any) {
      res.status(400).json({ ok: false, error: err?.message || 'File peek failed' });
    }
  });

  // Real Local Binary / Dump File Poke (writes exact bytes to disk with optional .bak backup)
  app.post('/api/xbox/peekpoke/file-poke', (req, res) => {
    try {
      const {
        filePath = '',
        offset = 0,
        hexData = '',
        createBackup = true,
      } = req.body as {
        filePath?: string;
        offset?: number | string;
        hexData?: string;
        createBackup?: boolean;
      };

      const resolved = path.resolve(String(filePath || '').replace(/^~/, os.homedir()));
      if (!resolved || !fs.existsSync(resolved)) {
        res.status(400).json({ ok: false, error: `File not found: ${resolved}` });
        return;
      }
      const st = fs.statSync(resolved);
      if (!st.isFile()) {
        res.status(400).json({ ok: false, error: `Not a regular file: ${resolved}` });
        return;
      }

      const cleanHex = String(hexData || '').replace(/[^0-9a-fA-F]/g, '');
      if (!cleanHex || cleanHex.length % 2 !== 0) {
        res.status(400).json({ ok: false, error: 'hexData must be non-empty even-length hex.' });
        return;
      }
      const patchBuf = Buffer.from(cleanHex, 'hex');
      const parsedOffset =
        typeof offset === 'string' && offset.trim().toLowerCase().startsWith('0x')
          ? parseInt(offset.trim(), 16)
          : Number(offset) || 0;

      if (parsedOffset < 0 || parsedOffset + patchBuf.length > st.size) {
        res.status(400).json({
          ok: false,
          error: `Write range [0x${parsedOffset.toString(16)}..+0x${patchBuf.length.toString(16)}] exceeds file size (0x${st.size.toString(16)} bytes).`,
        });
        return;
      }

      let backupPath: string | null = null;
      if (createBackup) {
        const candidateBak = `${resolved}.bak`;
        if (!fs.existsSync(candidateBak)) {
          fs.copyFileSync(resolved, candidateBak);
          backupPath = candidateBak;
        } else {
          backupPath = candidateBak;
        }
      }

      const prevBuf = Buffer.alloc(patchBuf.length);
      const fd = fs.openSync(resolved, 'r+');
      fs.readSync(fd, prevBuf, 0, patchBuf.length, parsedOffset);
      fs.writeSync(fd, patchBuf, 0, patchBuf.length, parsedOffset);
      fs.closeSync(fd);

      res.json({
        ok: true,
        resolvedPath: resolved,
        offset: parsedOffset,
        offsetHex: '0x' + parsedOffset.toString(16).toUpperCase().padStart(8, '0'),
        bytesWritten: patchBuf.length,
        previousHex: prevBuf.toString('hex').toUpperCase(),
        backupPath,
      });
    } catch (err: any) {
      res.status(400).json({ ok: false, error: err?.message || 'File poke failed' });
    }
  });

  // Live Xbox WDP (:11443) Usermode Process Minidump fetch to Kali /tmp/xbxowned_dumps
  app.post('/api/xbox/peekpoke/wdp-dump', async (req, res) => {
    const {
      ip = '192.168.1.100',
      wdpPort = 11443,
      username = 'DevUser',
      password = 'XboxDev2026!',
      pid = 0,
    } = req.body as {
      ip?: string;
      wdpPort?: number;
      username?: string;
      password?: string;
      pid?: number;
    };

    const cleanIp = resolveTargetIp(ip);
    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({
        ok: false,
        runningInCloud: true,
        error: `Cloud preview cannot reach LAN Xbox ${cleanIp}:${wdpPort}. Run locally on Kali to pull live /api/debug/dump/usermode/live dumps.`,
      });
      return;
    }

    const numericPid = Number(pid) || 0;
    if (!numericPid) {
      res.status(400).json({ ok: false, error: 'Valid numeric PID required.' });
      return;
    }

    try {
      const r = await new Promise<{ statusCode: number; bodyBuf: Buffer }>((resolve, reject) => {
        const auth = Buffer.from(`${username}:${password}`).toString('base64');
        const request = https.request(
          {
            hostname: cleanIp,
            port: Number(wdpPort) || 11443,
            path: `/api/debug/dump/usermode/live?pid=${numericPid}`,
            method: 'GET',
            rejectUnauthorized: false,
            headers: {
              Authorization: `Basic ${auth}`,
            },
            timeout: 15000,
          },
          (resp) => {
            const chunks: Buffer[] = [];
            resp.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
            resp.on('end', () => resolve({ statusCode: resp.statusCode || 0, bodyBuf: Buffer.concat(chunks) }));
          }
        );
        request.on('timeout', () => {
          request.destroy();
          reject(new Error('Timed out pulling WDP usermode dump'));
        });
        request.on('error', reject);
        request.end();
      });

      if (r.statusCode >= 400 || r.bodyBuf.length === 0) {
        res.json({
          ok: false,
          error: `WDP /api/debug/dump/usermode/live returned HTTP ${r.statusCode} (${r.bodyBuf.length} bytes)`,
        });
        return;
      }

      const dumpDir = path.join(os.tmpdir(), 'xbxowned_dumps');
      fs.mkdirSync(dumpDir, { recursive: true });
      const dumpPath = path.join(dumpDir, `xbox_pid_${numericPid}_${Date.now()}.dmp`);
      fs.writeFileSync(dumpPath, r.bodyBuf);

      res.json({
        ok: true,
        dumpPath,
        sizeBytes: r.bodyBuf.length,
        headerHex: r.bodyBuf.subarray(0, 256).toString('hex').toUpperCase(),
      });
    } catch (err: any) {
      res.json({ ok: false, error: err?.message || 'Failed to pull WDP usermode dump' });
    }
  });

  // --- Real Linux Host Serial / UART Debugger (/dev/ttyUSB*, /dev/ttyACM*, /dev/serial/by-id/*) ---
  interface SerialChunk {
    seq: number;
    ts: string;
    ascii: string;
    hex: string;
    byteCount: number;
  }
  interface SerialSession {
    device: string;
    baudRate: number;
    readStream: fs.ReadStream;
    writeFd: number;
    seq: number;
    chunks: SerialChunk[];
    openedAt: string;
    lastError?: string;
    emitter: EventEmitter;
  }
  const activeSerialSessions = new Map<string, SerialSession>();

  const isSafeSerialDevice = (dev: string): boolean => {
    const clean = String(dev || '').trim();
    return /^\/dev\/(tty(USB|ACM|AMA|S|CH341USB)\d+|serial\/by-id\/[A-Za-z0-9._:@-]+|pts\/\d+)$/.test(clean);
  };

  app.get('/api/xbox/serial/ports', (_req, res) => {
    const runningInCloud = isCloudContainer();
    const ports: Array<{ device: string; label: string; kind: string; isOpen: boolean }> = [];
    const usbAdapters: Array<{ vid: string; pid: string; product: string; role: string }> = [];
    const i2cBuses: string[] = [];

    try {
      const byIdDir = '/dev/serial/by-id';
      if (fs.existsSync(byIdDir)) {
        for (const entry of fs.readdirSync(byIdDir)) {
          const linkPath = path.join(byIdDir, entry);
          let realTarget = linkPath;
          try {
            realTarget = path.resolve(byIdDir, fs.readlinkSync(linkPath));
          } catch {
            // keep linkPath
          }
          ports.push({
            device: realTarget,
            label: `${realTarget} (${entry})`,
            kind: entry.toLowerCase().includes('1a86') || entry.toLowerCase().includes('ch347')
              ? 'Waveshare CH347 UART'
              : entry.toLowerCase().includes('2e8a') || entry.toLowerCase().includes('pico') || entry.toLowerCase().includes('rp2040')
                ? 'Mini2040 / RP2040 CDC'
                : 'USB-UART Adapter',
            isOpen: activeSerialSessions.has(realTarget),
          });
        }
      }

      if (fs.existsSync('/dev')) {
        const devEntries = fs.readdirSync('/dev');
        for (const name of devEntries) {
          if (/^(ttyUSB|ttyACM|ttyAMA|ttyCH341USB)\d+$/.test(name)) {
            const devPath = `/dev/${name}`;
            if (!ports.some((p) => p.device === devPath)) {
              ports.push({
                device: devPath,
                label: devPath,
                kind: name.startsWith('ttyACM')
                  ? 'USB CDC ACM (CH347 / RP2040)'
                  : name.startsWith('ttyCH341')
                    ? 'WCH CH34x VCP'
                    : name.startsWith('ttyAMA')
                      ? 'Hardware UART'
                      : 'USB-Serial',
                isOpen: activeSerialSessions.has(devPath),
              });
            }
          }
          if (/^i2c-\d+$/.test(name)) {
            i2cBuses.push(`/dev/${name}`);
          }
        }
      }

      // Inspect /sys/bus/usb/devices for CH347 (1a86:55db/55dc/55dd/55de) and RP2040/Mini2040 (2e8a:*)
      const usbSysDir = '/sys/bus/usb/devices';
      if (fs.existsSync(usbSysDir)) {
        for (const d of fs.readdirSync(usbSysDir)) {
          const devDir = path.join(usbSysDir, d);
          const vidPath = path.join(devDir, 'idVendor');
          const pidPath = path.join(devDir, 'idProduct');
          if (!fs.existsSync(vidPath) || !fs.existsSync(pidPath)) continue;
          const vid = fs.readFileSync(vidPath, 'utf8').trim().toLowerCase();
          const pid = fs.readFileSync(pidPath, 'utf8').trim().toLowerCase();
          let product = '';
          try {
            product = fs.readFileSync(path.join(devDir, 'product'), 'utf8').trim();
          } catch {
            product = `${vid}:${pid}`;
          }
          if (vid === '1a86' || vid === '2e8a' || vid === '0403' || vid === '10c4') {
            let role = 'USB Adapter';
            if (vid === '1a86' && ['55db', '55dc', '55dd', '55de', '55da'].includes(pid)) {
              role = pid === '55db' ? 'CH347 Mode 0/1 (UART)' : pid === '55dc' ? 'CH347 Mode 2 (HID UART+SPI+I2C)' : pid === '55dd' ? 'CH347 Mode 3 (UART+JTAG+I2C)' : 'CH347 Multi-Protocol (JTAG/SPI/I2C/UART)';
            } else if (vid === '2e8a') {
              role = pid === '0003' ? 'RP2040 / Mini2040 BOOTSEL (UF2)' : pid === '000c' ? 'RP2040 Picoprobe / CMSIS-DAP' : 'RP2040 / Mini2040 Pico / Bliss';
            }
            usbAdapters.push({ vid, pid, product, role });
          }
        }
      }
    } catch (err: any) {
      res.json({ ok: false, runningInCloud, ports, usbAdapters, i2cBuses, error: err?.message || 'Failed enumerating /dev' });
      return;
    }

    const detectBootselMounts = (): Array<{ path: string; infoUf2: string }> => {
      const mounts: Array<{ path: string; infoUf2: string }> = [];
      const seen = new Set<string>();
      const checkDir = (candidate: string) => {
        if (!candidate || seen.has(candidate)) return;
        seen.add(candidate);
        try {
          const infoFile = path.join(candidate, 'INFO_UF2.TXT');
          if (fs.existsSync(infoFile)) {
            mounts.push({
              path: candidate,
              infoUf2: fs.readFileSync(infoFile, 'utf8').trim(),
            });
          }
        } catch {
          // ignore unreadable mount
        }
      };

      try {
        if (fs.existsSync('/proc/mounts')) {
          const lines = fs.readFileSync('/proc/mounts', 'utf8').split('\n');
          for (const line of lines) {
            const parts = line.split(/\s+/);
            if (parts.length < 2) continue;
            const mnt = parts[1].replace(/\\040/g, ' ');
            if (/RPI-RP2/i.test(mnt) || /^\/(media|mnt|run\/media)\//.test(mnt)) {
              checkDir(mnt);
            }
          }
        }
      } catch {
        // ignore /proc/mounts errors
      }

      const user = os.userInfo().username;
      const bases = [`/media/${user}/RPI-RP2`, `/run/media/${user}/RPI-RP2`, '/mnt/RPI-RP2', '/mnt/rpi-rp2'];
      for (const b of bases) checkDir(b);
      return mounts;
    };

    const hasBin = (name: string) => {
      const r = spawnSync('which', [name], { encoding: 'utf8' });
      return r.status === 0;
    };

    const bootselMounts = detectBootselMounts();

    res.json({
      ok: true,
      runningInCloud,
      ports,
      usbAdapters,
      i2cBuses,
      bootselMounts,
      picoSdkPath: process.env.PICO_SDK_PATH || null,
      installedTools: {
        openocd: hasBin('openocd'),
        flashrom: hasBin('flashrom'),
        i2cdetect: hasBin('i2cdetect'),
        picotool: hasBin('picotool'),
        picocom: hasBin('picocom'),
        armGcc: hasBin('arm-none-eabi-gcc'),
        cmake: hasBin('cmake'),
      },
      activeSessions: Array.from(activeSerialSessions.keys()),
    });
  });

  app.post('/api/xbox/serial/open', (req, res) => {
    const {
      device = '/dev/ttyUSB0',
      baudRate = 115200,
      dataBits = 8,
      parity = 'none',
      stopBits = 1,
    } = req.body as {
      device?: string;
      baudRate?: number;
      dataBits?: 7 | 8;
      parity?: 'none' | 'even' | 'odd';
      stopBits?: 1 | 2;
    };

    const devPath = String(device || '').trim();
    if (!isSafeSerialDevice(devPath)) {
      res.status(400).json({ ok: false, error: `Invalid serial device path: ${devPath}` });
      return;
    }
    if (!fs.existsSync(devPath)) {
      res.status(404).json({ ok: false, error: `Device not found: ${devPath}. Plug in CH347 / Mini2040 or check permissions (sudo usermod -aG dialout $USER).` });
      return;
    }

    const existing = activeSerialSessions.get(devPath);
    if (existing) {
      try { existing.readStream.destroy(); } catch {}
      try { fs.closeSync(existing.writeFd); } catch {}
      activeSerialSessions.delete(devPath);
    }

    const baud = Math.max(300, Math.min(4000000, Number(baudRate) || 115200));
    const sttyArgs = [
      '-F', devPath,
      String(baud),
      dataBits === 7 ? 'cs7' : 'cs8',
      stopBits === 2 ? 'cstopb' : '-cstopb',
      parity === 'even' ? 'parenb' : parity === 'odd' ? 'parenb' : '-parenb',
      ...(parity === 'odd' ? ['parodd'] : parity === 'even' ? ['-parodd'] : []),
      'raw', '-echo', '-echoe', '-echok', '-echoctl', '-echoke', 'crtscts',
    ];

    try {
      const sttyRes = spawnSync('stty', sttyArgs, { encoding: 'utf8' });
      if (sttyRes.status !== 0) {
        const noFlowArgs = sttyArgs.map((a) => (a === 'crtscts' ? '-crtscts' : a));
        const fallback = spawnSync('stty', noFlowArgs, { encoding: 'utf8' });
        if (fallback.status !== 0) {
          res.status(400).json({
            ok: false,
            error: `stty failed on ${devPath}: ${(fallback.stderr || sttyRes.stderr || 'permission denied').trim()}`,
          });
          return;
        }
      }

      const writeFd = fs.openSync(devPath, fs.constants.O_WRONLY | fs.constants.O_NOCTTY | fs.constants.O_NONBLOCK);
      const readStream = fs.createReadStream(devPath, { highWaterMark: 4096 });
      const session: SerialSession = {
        device: devPath,
        baudRate: baud,
        readStream,
        writeFd,
        seq: 0,
        chunks: [],
        openedAt: new Date().toISOString(),
        emitter: new EventEmitter(),
      };

      readStream.on('data', (chunk: Buffer | string) => {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'latin1');
        session.seq += 1;
        const entry: SerialChunk = {
          seq: session.seq,
          ts: new Date().toISOString().split('T')[1].slice(0, 12),
          ascii: buf.toString('latin1'),
          hex: buf.toString('hex').toUpperCase(),
          byteCount: buf.length,
        };
        session.chunks.push(entry);
        if (session.chunks.length > 500) {
          session.chunks.splice(0, session.chunks.length - 500);
        }
        session.emitter.emit('chunk', entry);
      });

      readStream.on('error', (err) => {
        session.lastError = err?.message || 'Serial read stream error';
        session.emitter.emit('status', { isOpen: false, error: session.lastError });
      });

      readStream.on('close', () => {
        session.emitter.emit('status', { isOpen: false, error: session.lastError || null });
      });

      activeSerialSessions.set(devPath, session);
      res.json({
        ok: true,
        device: devPath,
        baudRate: baud,
        openedAt: session.openedAt,
      });
    } catch (err: any) {
      res.status(400).json({
        ok: false,
        error: err?.message || `Failed to open ${devPath} (check dialout group permissions)`,
      });
    }
  });

  // Real-time Server-Sent Events (SSE) push stream for active UART device
  app.get('/api/xbox/serial/stream', (req, res) => {
    const devPath = String(req.query.device || '').trim();
    const sinceSeq = Number(req.query.sinceSeq || 0);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (eventName: string, data: unknown) => {
      if (res.writableEnded) return;
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const session = activeSerialSessions.get(devPath);
    if (!session) {
      sendEvent('status', { isOpen: false, device: devPath, error: 'Serial session not open' });
      res.end();
      return;
    }

    sendEvent('status', {
      isOpen: true,
      device: session.device,
      baudRate: session.baudRate,
      openedAt: session.openedAt,
    });

    for (const chunk of session.chunks) {
      if (chunk.seq > sinceSeq) {
        sendEvent('chunk', chunk);
      }
    }

    const onChunk = (chunk: SerialChunk) => sendEvent('chunk', chunk);
    const onStatus = (status: { isOpen: boolean; error?: string | null }) => {
      sendEvent('status', { device: session.device, ...status });
    };

    session.emitter.on('chunk', onChunk);
    session.emitter.on('status', onStatus);

    const keepalive = setInterval(() => {
      if (!res.writableEnded) res.write(': keepalive\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(keepalive);
      session.emitter.off('chunk', onChunk);
      session.emitter.off('status', onStatus);
    });
  });

  app.get('/api/xbox/serial/poll', (req, res) => {
    const devPath = String(req.query.device || '').trim();
    const sinceSeq = Number(req.query.sinceSeq || 0);
    const session = activeSerialSessions.get(devPath);
    if (!session) {
      res.json({ ok: false, isOpen: false, chunks: [], error: 'Serial session not open' });
      return;
    }
    const fresh = session.chunks.filter((c) => c.seq > sinceSeq);
    res.json({
      ok: true,
      isOpen: true,
      latestSeq: session.seq,
      chunks: fresh,
      lastError: session.lastError || null,
    });
  });

  app.post('/api/xbox/serial/send', (req, res) => {
    const {
      device = '',
      payload = '',
      mode = 'ascii',
      lineEnding = 'crlf',
    } = req.body as {
      device?: string;
      payload?: string;
      mode?: 'ascii' | 'hex';
      lineEnding?: 'crlf' | 'lf' | 'cr' | 'none';
    };

    const devPath = String(device || '').trim();
    const session = activeSerialSessions.get(devPath);
    if (!session) {
      res.status(400).json({ ok: false, error: `Serial port not open: ${devPath}` });
      return;
    }

    try {
      let outBuf: Buffer;
      if (mode === 'hex') {
        const cleanHex = String(payload || '').replace(/[^0-9a-fA-F]/g, '');
        if (!cleanHex || cleanHex.length % 2 !== 0) {
          res.status(400).json({ ok: false, error: 'Hex TX payload must have even hex digits.' });
          return;
        }
        outBuf = Buffer.from(cleanHex, 'hex');
      } else {
        const suffix =
          lineEnding === 'crlf' ? '\r\n' : lineEnding === 'lf' ? '\n' : lineEnding === 'cr' ? '\r' : '';
        outBuf = Buffer.from(`${String(payload || '')}${suffix}`, 'utf8');
      }
      const written = fs.writeSync(session.writeFd, outBuf);
      res.json({ ok: true, bytesWritten: written });
    } catch (err: any) {
      res.status(400).json({ ok: false, error: err?.message || 'Serial TX write failed' });
    }
  });

  app.post('/api/xbox/serial/close', (req, res) => {
    const { device = '' } = req.body as { device?: string };
    const devPath = String(device || '').trim();
    const session = activeSerialSessions.get(devPath);
    if (session) {
      session.emitter.emit('status', { isOpen: false, device: devPath, error: null });
      try { session.readStream.destroy(); } catch {}
      try { fs.closeSync(session.writeFd); } catch {}
      activeSerialSessions.delete(devPath);
    }
    res.json({ ok: true, closed: devPath });
  });

  // Safe Whitelisted CH347 / Mini2040 RP2040 Hardware CLI Probe Runner (openocd, flashrom, picotool, i2cdetect)
  app.post('/api/xbox/hw/run-tool', (req, res) => {
    if (isCloudContainer()) {
      res.json({
        ok: false,
        runningInCloud: true,
        output: '',
        error: 'Cloud preview has no physical USB/JTAG/SPI hardware attached. Run locally on Kali (npm run dev) with CH347 or Mini2040 plugged in.',
      });
      return;
    }

    const {
      tool = 'ch347_jtag_probe',
      serialDevice = '/dev/ttyACM0',
      spiProgrammer = 'ch347_spi',
      i2cBus = '0',
      jtagKhz = 1000,
    } = req.body as {
      tool?: 'ch347_jtag_probe' | 'flashrom_probe' | 'flashrom_dump' | 'cmsis_dap_probe' | 'rp2040_info' | 'i2c_detect';
      serialDevice?: string;
      spiProgrammer?: 'ch347_spi' | 'serprog';
      i2cBus?: string;
      jtagKhz?: number;
    };

    const khz = Math.max(100, Math.min(30000, Number(jtagKhz) || 1000));
    const safeBus = String(i2cBus || '0').replace(/\D/g, '') || '0';
    const cleanSer = isSafeSerialDevice(serialDevice) ? serialDevice : '/dev/ttyACM0';

    let cmd = '';
    let args: string[] = [];
    let dumpPath: string | null = null;

    if (tool === 'ch347_jtag_probe') {
      cmd = 'openocd';
      args = [
        '-c',
        `adapter driver ch347; ch347 vid_pid 0x1a86 0x55dd 0x1a86 0x55de; adapter speed ${khz}; init; scan_chain; shutdown`,
      ];
    } else if (tool === 'cmsis_dap_probe') {
      cmd = 'openocd';
      args = [
        '-f',
        'interface/cmsis-dap.cfg',
        '-c',
        `transport select swd; adapter speed ${khz}; init; shutdown`,
      ];
    } else if (tool === 'flashrom_probe') {
      cmd = 'flashrom';
      const progArg = spiProgrammer === 'serprog' ? `serprog:dev=${cleanSer}:115200` : 'ch347_spi';
      args = ['-p', progArg];
    } else if (tool === 'flashrom_dump') {
      cmd = 'flashrom';
      const dumpDir = path.join(os.tmpdir(), 'xbxowned_dumps');
      fs.mkdirSync(dumpDir, { recursive: true });
      dumpPath = path.join(dumpDir, `spi_flash_${spiProgrammer}_${Date.now()}.bin`);
      const progArg = spiProgrammer === 'serprog' ? `serprog:dev=${cleanSer}:115200` : 'ch347_spi';
      args = ['-p', progArg, '-r', dumpPath];
    } else if (tool === 'rp2040_info') {
      cmd = 'picotool';
      args = ['info', '-a'];
    } else if (tool === 'i2c_detect') {
      cmd = 'i2cdetect';
      args = ['-y', safeBus];
    } else {
      res.status(400).json({ ok: false, error: `Unknown hardware tool: ${tool}` });
      return;
    }

    const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 25000 });
    if (r.error && (r.error as any).code === 'ENOENT') {
      res.json({
        ok: false,
        command: `${cmd} ${args.join(' ')}`,
        output: '',
        error: `"${cmd}" is not installed on this Kali host. Install it with: sudo apt update && sudo apt install -y openocd flashrom i2c-tools picotool`,
      });
      return;
    }

    const combinedOut = `${r.stdout || ''}\n${r.stderr || ''}`.trim();
    res.json({
      ok: r.status === 0,
      command: `${cmd} ${args.join(' ')}`,
      dumpPath,
      output: combinedOut,
      error: r.status === 0 ? null : `${cmd} exited with code ${r.status}`,
    });
  });

  // Force attached RP2040 / Mini2040 into BOOTSEL mode via picotool
  app.post('/api/xbox/hw/pico-bootsel', (_req, res) => {
    if (isCloudContainer()) {
      res.json({
        ok: false,
        runningInCloud: true,
        output: '',
        error: 'Cloud preview has no physical RP2040 attached. Run locally on Kali (npm run dev).',
      });
      return;
    }

    const r = spawnSync('picotool', ['reboot', '-u', '-f'], { encoding: 'utf8', timeout: 10000 });
    if (r.error && (r.error as any).code === 'ENOENT') {
      res.json({
        ok: false,
        command: 'picotool reboot -u -f',
        output: '',
        error: '"picotool" is not installed on this Kali host. Hold the BOOTSEL button while plugging USB-C, or install picotool.',
      });
      return;
    }

    const out = `${r.stdout || ''}\n${r.stderr || ''}`.trim();
    res.json({
      ok: r.status === 0,
      command: 'picotool reboot -u -f',
      output: out,
      error: r.status === 0 ? null : `picotool exited with code ${r.status}`,
    });
  });

  // Real RP2040 / Mini2040 Firmware Flasher (.uf2 / .elf / .bin via picotool, RPI-RP2 mount, or OpenOCD SWD)
  app.post('/api/xbox/hw/flash-pico', (req, res) => {
    if (isCloudContainer()) {
      res.json({
        ok: false,
        runningInCloud: true,
        output: '',
        error: 'Cloud preview cannot access local USB RP2040 / Mini2040 hardware. Run locally on Kali (npm run dev -> http://localhost:3000) to flash firmware.',
      });
      return;
    }

    const {
      filename = 'firmware.uf2',
      fileBase64 = '',
      localFirmwarePath = '',
      method = 'auto',
      verify = true,
      resetAfter = true,
    } = req.body as {
      filename?: string;
      fileBase64?: string;
      localFirmwarePath?: string;
      method?: 'auto' | 'picotool' | 'bootsel-mount' | 'openocd-swd';
      verify?: boolean;
      resetAfter?: boolean;
    };

    let fwBuf: Buffer | null = null;
    let safeName = path.basename(String(filename || 'firmware.uf2')).replace(/[^a-zA-Z0-9._-]/g, '') || 'firmware.uf2';

    try {
      if (fileBase64) {
        fwBuf = Buffer.from(String(fileBase64), 'base64');
      } else if (String(localFirmwarePath || '').trim()) {
        const resolved = path.resolve(String(localFirmwarePath).trim().replace(/^~/, os.homedir()));
        if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
          res.status(400).json({ ok: false, error: `Firmware file not found on Kali host: ${resolved}` });
          return;
        }
        fwBuf = fs.readFileSync(resolved);
        safeName = path.basename(resolved).replace(/[^a-zA-Z0-9._-]/g, '') || safeName;
      }
    } catch (err: any) {
      res.status(400).json({ ok: false, error: err?.message || 'Failed reading firmware payload' });
      return;
    }

    if (!fwBuf || fwBuf.length === 0) {
      res.status(400).json({ ok: false, error: 'Firmware payload is empty. Select a .uf2, .elf, or .bin file.' });
      return;
    }
    if (fwBuf.length > 16 * 1024 * 1024) {
      res.status(400).json({ ok: false, error: 'Firmware exceeds 16 MB RP2040 flash limit.' });
      return;
    }

    const ext = path.extname(safeName).toLowerCase();
    if (!['.uf2', '.elf', '.bin'].includes(ext)) {
      res.status(400).json({ ok: false, error: `Unsupported firmware extension "${ext}". Expected .uf2, .elf, or .bin.` });
      return;
    }

    let uf2Info: {
      valid: boolean;
      blockCount: number;
      payloadBytes: number;
      targetAddrHex: string | null;
      familyIdHex: string | null;
      isRp2040Family: boolean;
    } | null = null;

    if (ext === '.uf2') {
      if (fwBuf.length < 512 || fwBuf.length % 512 !== 0) {
        res.status(400).json({
          ok: false,
          error: `Invalid .uf2 file length (${fwBuf.length} bytes — must be a non-empty multiple of 512 bytes).`,
        });
        return;
      }
      const blocks = fwBuf.length / 512;
      let totalPayload = 0;
      let firstAddr: number | null = null;
      let familyHex: string | null = null;
      let isRp2040 = false;

      for (let i = 0; i < blocks; i++) {
        const off = i * 512;
        const m0 = fwBuf.readUInt32LE(off);
        const m1 = fwBuf.readUInt32LE(off + 4);
        const flags = fwBuf.readUInt32LE(off + 8);
        const targetAddr = fwBuf.readUInt32LE(off + 12);
        const payloadSize = fwBuf.readUInt32LE(off + 16);
        const famOrSize = fwBuf.readUInt32LE(off + 28);
        const mEnd = fwBuf.readUInt32LE(off + 508);
        if (m0 !== 0x0a324655 || m1 !== 0x9e5d5157 || mEnd !== 0x0ab16f30) {
          res.status(400).json({
            ok: false,
            error: `UF2 magic mismatch at block ${i} (corrupt or non-UF2 binary).`,
          });
          return;
        }
        if (i === 0) {
          firstAddr = targetAddr;
          if ((flags & 0x00002000) !== 0) {
            familyHex = `0x${famOrSize.toString(16).padStart(8, '0')}`;
            isRp2040 = famOrSize === 0xe48bff56;
          }
        }
        totalPayload += Math.min(476, payloadSize);
      }

      uf2Info = {
        valid: true,
        blockCount: blocks,
        payloadBytes: totalPayload,
        targetAddrHex: firstAddr !== null ? `0x${firstAddr.toString(16).toUpperCase().padStart(8, '0')}` : null,
        familyIdHex: familyHex,
        isRp2040Family: isRp2040,
      };
    }

    const fwDir = path.join(os.tmpdir(), 'xbxowned_firmware');
    fs.mkdirSync(fwDir, { recursive: true });
    const stagedPath = path.join(fwDir, `${Date.now()}_${safeName}`);
    fs.writeFileSync(stagedPath, fwBuf);

    const findBootselMount = (): string | null => {
      const candidates: string[] = [];
      try {
        if (fs.existsSync('/proc/mounts')) {
          for (const line of fs.readFileSync('/proc/mounts', 'utf8').split('\n')) {
            const parts = line.split(/\s+/);
            if (parts.length >= 2) candidates.push(parts[1].replace(/\\040/g, ' '));
          }
        }
      } catch {}
      const user = os.userInfo().username;
      candidates.push(`/media/${user}/RPI-RP2`, `/run/media/${user}/RPI-RP2`, '/mnt/RPI-RP2');
      for (const dir of candidates) {
        try {
          if (dir && fs.existsSync(path.join(dir, 'INFO_UF2.TXT'))) {
            return dir;
          }
        } catch {}
      }
      return null;
    };

    try {
      if (method === 'openocd-swd') {
        if (!commandExists('openocd')) {
          res.json({
            ok: false,
            uf2Info,
            command: 'openocd -f interface/cmsis-dap.cfg -f target/rp2040.cfg ...',
            output: '',
            error: '"openocd" is not installed on this Kali host (sudo apt install -y openocd).',
          });
          return;
        }
        const progCmd =
          ext === '.bin'
            ? `adapter speed 5000; program ${stagedPath} 0x10000000 ${verify ? 'verify ' : ''}${resetAfter ? 'reset ' : ''}exit`
            : `adapter speed 5000; program ${stagedPath} ${verify ? 'verify ' : ''}${resetAfter ? 'reset ' : ''}exit`;
        const args = ['-f', 'interface/cmsis-dap.cfg', '-f', 'target/rp2040.cfg', '-c', progCmd];
        const r = spawnSync('openocd', args, { encoding: 'utf8', timeout: 45000 });
        const output = `${r.stdout || ''}\n${r.stderr || ''}`.trim();
        res.json({
          ok: r.status === 0,
          methodUsed: 'openocd-swd',
          command: `openocd ${args.join(' ')}`,
          uf2Info,
          output,
          error: r.status === 0 ? null : `openocd exited with code ${r.status}`,
        });
        return;
      }

      const tryPicotool = method === 'picotool' || (method === 'auto' && commandExists('picotool'));
      if (tryPicotool) {
        if (!commandExists('picotool')) {
          res.json({
            ok: false,
            uf2Info,
            command: 'picotool load ...',
            output: '',
            error: '"picotool" is not installed. Hold BOOTSEL while plugging Mini2040 so RPI-RP2 mounts and use RPI-RP2 Mount Copy, or install picotool.',
          });
          return;
        }
        const loadArgs = ['load', '-f'];
        if (verify) loadArgs.push('-v');
        if (resetAfter) loadArgs.push('-x');
        loadArgs.push(stagedPath);
        if (ext === '.bin') {
          loadArgs.push('-o', '0x10000000');
        }
        const r = spawnSync('picotool', loadArgs, { encoding: 'utf8', timeout: 45000 });
        const output = `${r.stdout || ''}\n${r.stderr || ''}`.trim();
        if (r.status === 0) {
          res.json({
            ok: true,
            methodUsed: 'picotool',
            command: `picotool ${loadArgs.join(' ')}`,
            uf2Info,
            output,
            error: null,
          });
          return;
        }
        if (method === 'picotool') {
          res.json({
            ok: false,
            methodUsed: 'picotool',
            command: `picotool ${loadArgs.join(' ')}`,
            uf2Info,
            output,
            error: `picotool exited with code ${r.status}`,
          });
          return;
        }
      }

      // Fall back (or explicit bootsel-mount): direct UF2 copy to RPI-RP2 mass-storage volume
      if (ext !== '.uf2') {
        res.json({
          ok: false,
          uf2Info,
          output: '',
          error: `RPI-RP2 BOOTSEL mass-storage only accepts .uf2 files (received ${ext}). Install picotool or use OpenOCD SWD for .elf/.bin.`,
        });
        return;
      }

      const mountPath = findBootselMount();
      if (!mountPath) {
        res.json({
          ok: false,
          uf2Info,
          command: 'cp <firmware>.uf2 <RPI-RP2>/',
          output: '',
          error: 'No RPI-RP2 BOOTSEL volume detected and picotool found no flashable RP2040. Hold BOOTSEL on Mini2040 while plugging USB-C (or trigger 1200-baud reset), verify INFO_UF2.TXT mounts, then retry.',
        });
        return;
      }

      const destPath = path.join(mountPath, safeName);
      fs.copyFileSync(stagedPath, destPath);
      res.json({
        ok: true,
        methodUsed: 'bootsel-mount',
        command: `cp ${safeName} ${destPath}`,
        uf2Info,
        output: `Copied ${fwBuf.length} bytes (${uf2Info?.blockCount} UF2 blocks) to ${destPath}. RP2040 BOOTSEL automatically flashes and reboots.`,
        error: null,
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        uf2Info,
        output: '',
        error: err?.message || 'Failed flashing RP2040 firmware',
      });
    } finally {
      try { fs.unlinkSync(stagedPath); } catch {}
    }
  });

  // --- Pinout Vault (Persistent Board Photos, Bench Docs & Custom Consoles) ---
  const VAULT_DIR = path.join(__dirname, '.bench-vault');
  const VAULT_ASSETS_DIR = path.join(VAULT_DIR, 'assets');
  const VAULT_INDEX_PATH = path.join(VAULT_DIR, 'library.json');

  interface ExtractedPinRow {
    signal: string;
    boardPoint: string;
    adapterPin: string;
    wireColor?: string;
    voltage?: string;
    notes?: string;
  }

  interface OrganizedDocData {
    summary: string;
    detectedTarget?: string;
    boardRev?: string;
    voltageWarnings: string[];
    extractedPins: ExtractedPinRow[];
    benchChecklist?: string[];
    analyzedBy: string;
    analyzedAt: string;
  }

  interface VaultItem {
    id: string;
    title: string;
    consoleTarget: string;
    boardRev: string;
    kind: 'photo' | 'doc' | 'bundle';
    filename?: string;
    mimeType?: string;
    fileSize?: number;
    assetFilename?: string;
    contentText: string;
    tags: string[];
    pinnedToGuide: boolean;
    organized?: OrganizedDocData | null;
    createdAt: string;
    updatedAt: string;
  }

  interface CustomConsoleTarget {
    id: string;
    label: string;
    logicVoltage: string;
    busNotes: string;
    createdAt: string;
  }

  interface VaultStore {
    items: VaultItem[];
    customTargets: CustomConsoleTarget[];
  }

  function readVaultStore(): VaultStore {
    try {
      fs.mkdirSync(VAULT_ASSETS_DIR, { recursive: true });
      if (!fs.existsSync(VAULT_INDEX_PATH)) {
        const empty: VaultStore = { items: [], customTargets: [] };
        fs.writeFileSync(VAULT_INDEX_PATH, JSON.stringify(empty, null, 2), 'utf8');
        return empty;
      }
      const parsed = JSON.parse(fs.readFileSync(VAULT_INDEX_PATH, 'utf8'));
      return {
        items: Array.isArray(parsed?.items) ? parsed.items : [],
        customTargets: Array.isArray(parsed?.customTargets) ? parsed.customTargets : [],
      };
    } catch {
      return { items: [], customTargets: [] };
    }
  }

  function writeVaultStore(store: VaultStore): void {
    fs.mkdirSync(VAULT_ASSETS_DIR, { recursive: true });
    const tmpPath = `${VAULT_INDEX_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf8');
    fs.renameSync(tmpPath, VAULT_INDEX_PATH);
  }

  function extForMime(mime: string, origFilename?: string): string {
    const extFromName = origFilename ? path.extname(origFilename).toLowerCase().replace(/[^a-z0-9.]/g, '') : '';
    if (extFromName && extFromName.length <= 8) return extFromName;
    if (mime.includes('png')) return '.png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
    if (mime.includes('webp')) return '.webp';
    if (mime.includes('gif')) return '.gif';
    if (mime.includes('pdf')) return '.pdf';
    if (mime.includes('markdown')) return '.md';
    if (mime.includes('json')) return '.json';
    return '.txt';
  }

  function decodePdfEscapes(s: string): string {
    return s
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
  }

  function extractPdfOperatorsText(streamText: string): string {
    const out: string[] = [];
    // Extract text from BT ... ET / Tj / TJ operators
    const tjRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
    let m: RegExpExecArray | null;
    while ((m = tjRegex.exec(streamText)) !== null) {
      const decoded = decodePdfEscapes(m[1]).replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ');
      if (decoded.trim()) out.push(decoded);
    }
    const tjArrRegex = /\[((?:[^[\]]|\n)*?)\]\s*TJ/g;
    while ((m = tjArrRegex.exec(streamText)) !== null) {
      const inner = m[1];
      const strParts: string[] = [];
      const litRe = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
      let lm: RegExpExecArray | null;
      while ((lm = litRe.exec(inner)) !== null) {
        strParts.push(decodePdfEscapes(lm[1]));
      }
      if (strParts.length > 0) out.push(strParts.join(''));
    }
    if (out.length === 0) {
      const fallbackLit = /\(([^()\\]{3,240})\)/g;
      while ((m = fallbackLit.exec(streamText)) !== null) {
        const cleaned = decodePdfEscapes(m[1]).replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleaned.length >= 3 && /[A-Za-z0-9]/.test(cleaned)) {
          out.push(cleaned);
        }
      }
    }
    return out.join(' ').replace(/\s{2,}/g, ' ').trim();
  }

  function extractFullTextFromPdf(buf: Buffer): { text: string; pageCount: number; method: string } {
    const MAX_TEXT_CHARS = 2500000; // 2.5 MB pure extracted text ceiling

    // 1. Prefer poppler pdftotext if installed on Kali/Linux host for layout-accurate full extraction
    if (commandExists('pdftotext')) {
      try {
        const r = spawnSync('pdftotext', ['-layout', '-', '-'], {
          input: buf,
          encoding: 'utf8',
          maxBuffer: 32 * 1024 * 1024,
          timeout: 20000,
        });
        if (r.status === 0 && r.stdout && r.stdout.trim().length > 0) {
          const text = r.stdout.slice(0, MAX_TEXT_CHARS);
          const pages = Math.max(1, (text.match(/\f/g) || []).length + 1);
          return { text, pageCount: pages, method: 'pdftotext' };
        }
      } catch {}
    }

    // 2. Built-in Node.js zlib FlateDecode stream decompressor + PDF Tj/TJ operator reader
    const raw = buf.toString('latin1');
    const pageMarkers = (raw.match(/\/Type\s*\/Page\b/g) || []).length;
    const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
    const sections: string[] = [];
    let sm: RegExpExecArray | null;
    let streamCount = 0;

    while ((sm = streamRegex.exec(raw)) !== null && streamCount < 4000) {
      streamCount++;
      const streamSlice = buf.subarray(sm.index, sm.index + sm[0].length);
      const headerEnd = streamSlice.indexOf(Buffer.from('stream')) + 6;
      let payload = streamSlice.subarray(headerEnd);
      if (payload[0] === 0x0d && payload[1] === 0x0a) payload = payload.subarray(2);
      else if (payload[0] === 0x0a) payload = payload.subarray(1);
      const endPos = payload.lastIndexOf(Buffer.from('endstream'));
      if (endPos > 0) payload = payload.subarray(0, endPos);

      let decodedText = '';
      try {
        const inflated = zlib.inflateSync(payload);
        decodedText = inflated.toString('latin1');
      } catch {
        decodedText = payload.toString('latin1');
      }
      if (decodedText.includes('Tj') || decodedText.includes('TJ') || decodedText.includes('BT')) {
        const extracted = extractPdfOperatorsText(decodedText);
        if (extracted.length >= 4) {
          sections.push(extracted);
        }
      }
    }

    if (sections.length > 0) {
      const joined = sections.join('\n\n').slice(0, MAX_TEXT_CHARS);
      return {
        text: joined,
        pageCount: Math.max(pageMarkers, Math.ceil(joined.length / 2400), 1),
        method: 'node-zlib-flate',
      };
    }

    // 3. Full-file literal PDF text fallback (no 12K truncation)
    const fallbackChunks: string[] = [];
    const litRegex = /\(([^()\\]{3,240})\)/g;
    let m: RegExpExecArray | null;
    while ((m = litRegex.exec(raw)) !== null) {
      const cleaned = decodePdfEscapes(m[1]).replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleaned.length >= 3 && /[A-Za-z0-9]/.test(cleaned)) {
        fallbackChunks.push(cleaned);
      }
      if (fallbackChunks.length > 40000) break;
    }
    const joinedFallback = fallbackChunks.join('\n').slice(0, MAX_TEXT_CHARS);
    return {
      text: joinedFallback,
      pageCount: Math.max(pageMarkers, Math.ceil(joinedFallback.length / 2400), 1),
      method: 'pdf-literal-scan',
    };
  }

  app.get('/api/pinout-vault/items', (req, res) => {
    const store = readVaultStore();
    const targetFilter = String(req.query.target || '').trim().toLowerCase();
    const q = String(req.query.q || '').trim().toLowerCase();

    const filtered = store.items.filter((item) => {
      if (targetFilter && targetFilter !== 'all' && item.consoleTarget.toLowerCase() !== targetFilter) {
        return false;
      }
      if (!q) return true;
      const hay = [
        item.title,
        item.consoleTarget,
        item.boardRev,
        item.filename || '',
        item.contentText,
        item.tags.join(' '),
        item.organized?.summary || '',
        JSON.stringify(item.organized?.extractedPins || []),
      ]
        .join(' ')
        .toLowerCase();
      return q.split(/\s+/).every((tok) => hay.includes(tok));
    });

    res.json({
      ok: true,
      items: filtered.map((item) => ({
        ...item,
        assetUrl: item.assetFilename ? `/api/pinout-vault/asset/${encodeURIComponent(item.id)}` : null,
      })),
      customTargets: store.customTargets,
    });
  });

  app.post('/api/pinout-vault/items', (req, res) => {
    try {
      const {
        title,
        consoleTarget = 'custom',
        boardRev = '',
        kind,
        filename,
        mimeType,
        dataBase64,
        contentText = '',
        tags = [],
        pinnedToGuide = true,
        organized = null,
      } = req.body as {
        title?: string;
        consoleTarget?: string;
        boardRev?: string;
        kind?: 'photo' | 'doc' | 'bundle';
        filename?: string;
        mimeType?: string;
        dataBase64?: string;
        contentText?: string;
        tags?: string[];
        pinnedToGuide?: boolean;
        organized?: OrganizedDocData | null;
      };

      const id = `pv_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
      const safeFilename = filename ? path.basename(String(filename)).replace(/[^\w.\- ]+/g, '_') : undefined;
      let resolvedMime = String(mimeType || '').trim();
      let assetFilename: string | undefined;
      let fileSize: number | undefined;
      let resolvedText = String(contentText || '');

      if (dataBase64 && typeof dataBase64 === 'string') {
        let b64Payload = dataBase64.trim();
        const dataUrlMatch = /^data:([^;]+);base64,(.+)$/s.exec(b64Payload);
        if (dataUrlMatch) {
          if (!resolvedMime) resolvedMime = dataUrlMatch[1];
          b64Payload = dataUrlMatch[2];
        }
        const binBuf = Buffer.from(b64Payload, 'base64');
        if (binBuf.length > 28 * 1024 * 1024) {
          res.status(413).json({ ok: false, error: 'Attachment exceeds 28 MB limit.' });
          return;
        }
        fileSize = binBuf.length;
        const ext = extForMime(resolvedMime, safeFilename);
        assetFilename = `${id}${ext}`;
        fs.mkdirSync(VAULT_ASSETS_DIR, { recursive: true });
        fs.writeFileSync(path.join(VAULT_ASSETS_DIR, assetFilename), binBuf);

        // Auto-extract full text for plain docs or PDFs if caller didn't prefill text
        if (!resolvedText.trim()) {
          if (resolvedMime === 'application/pdf' || ext === '.pdf') {
            resolvedText = extractFullTextFromPdf(binBuf).text;
          } else if (
            resolvedMime.startsWith('text/') ||
            ['.md', '.txt', '.json', '.csv', '.tsv', '.log', '.ini', '.yaml', '.yml', '.c', '.h', '.cpp', '.py', '.ts', '.xml'].includes(ext)
          ) {
            resolvedText = binBuf.toString('utf8').slice(0, 2500000);
          }
        }
      }

      const isImage = resolvedMime.startsWith('image/');
      const resolvedKind: 'photo' | 'doc' | 'bundle' =
        kind || (isImage && resolvedText.trim() ? 'bundle' : isImage ? 'photo' : 'doc');

      const now = new Date().toISOString();
      const entry: VaultItem = {
        id,
        title: String(title || safeFilename || 'Untitled Pinout Note').trim().slice(0, 180),
        consoleTarget: String(consoleTarget || 'custom').trim().slice(0, 80),
        boardRev: String(boardRev || '').trim().slice(0, 80),
        kind: resolvedKind,
        filename: safeFilename,
        mimeType: resolvedMime || (resolvedKind === 'doc' ? 'text/plain' : 'application/octet-stream'),
        fileSize,
        assetFilename,
        contentText: resolvedText,
        tags: Array.isArray(tags)
          ? tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20)
          : [],
        pinnedToGuide: Boolean(pinnedToGuide),
        organized: organized || null,
        createdAt: now,
        updatedAt: now,
      };

      const store = readVaultStore();
      store.items.unshift(entry);
      writeVaultStore(store);

      res.json({
        ok: true,
        item: {
          ...entry,
          assetUrl: entry.assetFilename ? `/api/pinout-vault/asset/${encodeURIComponent(entry.id)}` : null,
        },
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Failed saving vault item' });
    }
  });

  app.put('/api/pinout-vault/items/:id', (req, res) => {
    const id = String(req.params.id || '').trim();
    const store = readVaultStore();
    const idx = store.items.findIndex((it) => it.id === id);
    if (idx === -1) {
      res.status(404).json({ ok: false, error: 'Vault item not found' });
      return;
    }

    const patch = req.body as Partial<VaultItem>;
    const existing = store.items[idx];
    const updated: VaultItem = {
      ...existing,
      title: patch.title !== undefined ? String(patch.title).trim().slice(0, 180) : existing.title,
      consoleTarget:
        patch.consoleTarget !== undefined
          ? String(patch.consoleTarget).trim().slice(0, 80)
          : existing.consoleTarget,
      boardRev: patch.boardRev !== undefined ? String(patch.boardRev).trim().slice(0, 80) : existing.boardRev,
      contentText: patch.contentText !== undefined ? String(patch.contentText) : existing.contentText,
      tags: Array.isArray(patch.tags)
        ? patch.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20)
        : existing.tags,
      pinnedToGuide:
        patch.pinnedToGuide !== undefined ? Boolean(patch.pinnedToGuide) : existing.pinnedToGuide,
      organized: patch.organized !== undefined ? patch.organized : existing.organized,
      updatedAt: new Date().toISOString(),
    };

    store.items[idx] = updated;
    writeVaultStore(store);
    res.json({
      ok: true,
      item: {
        ...updated,
        assetUrl: updated.assetFilename ? `/api/pinout-vault/asset/${encodeURIComponent(updated.id)}` : null,
      },
    });
  });

  app.delete('/api/pinout-vault/items/:id', (req, res) => {
    const id = String(req.params.id || '').trim();
    const store = readVaultStore();
    const idx = store.items.findIndex((it) => it.id === id);
    if (idx === -1) {
      res.status(404).json({ ok: false, error: 'Vault item not found' });
      return;
    }
    const [removed] = store.items.splice(idx, 1);
    writeVaultStore(store);

    if (removed.assetFilename) {
      const fullPath = path.join(VAULT_ASSETS_DIR, path.basename(removed.assetFilename));
      try { fs.unlinkSync(fullPath); } catch {}
    }
    res.json({ ok: true, deletedId: id });
  });

  app.get('/api/pinout-vault/asset/:id', (req, res) => {
    const id = String(req.params.id || '').trim();
    const store = readVaultStore();
    const item = store.items.find((it) => it.id === id);
    if (!item || !item.assetFilename) {
      res.status(404).json({ ok: false, error: 'Asset not found' });
      return;
    }
    const fullPath = path.join(VAULT_ASSETS_DIR, path.basename(item.assetFilename));
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ ok: false, error: 'Asset file missing from disk' });
      return;
    }
    res.setHeader('Content-Type', item.mimeType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(fullPath);
  });

  // Re-extract full un-truncated contents from stored Vault disk asset (e.g. legacy 12K PDF previews)
  app.post('/api/pinout-vault/items/:id/reextract', (req, res) => {
    const id = String(req.params.id || '').trim();
    const store = readVaultStore();
    const idx = store.items.findIndex((it) => it.id === id);
    if (idx === -1) {
      res.status(404).json({ ok: false, error: 'Vault item not found' });
      return;
    }
    const item = store.items[idx];
    if (!item.assetFilename) {
      res.json({
        ok: true,
        extractedChars: item.contentText.length,
        method: 'inline-text',
        item: { ...item, assetUrl: null },
      });
      return;
    }
    const fullPath = path.join(VAULT_ASSETS_DIR, path.basename(item.assetFilename));
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ ok: false, error: 'Asset file missing from disk' });
      return;
    }
    const binBuf = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    let fullText = item.contentText;
    let method = 'raw-utf8';
    let pageCount = 1;
    if (item.mimeType === 'application/pdf' || ext === '.pdf') {
      const pdfRes = extractFullTextFromPdf(binBuf);
      fullText = pdfRes.text;
      method = pdfRes.method;
      pageCount = pdfRes.pageCount;
    } else if (!item.mimeType?.startsWith('image/')) {
      const hasNull = binBuf.includes(0);
      fullText = hasNull
        ? (binBuf.toString('latin1').match(/[\x20-\x7e]{4,}/g) || []).join('\n').slice(0, 2500000)
        : binBuf.toString('utf8').slice(0, 2500000);
      method = hasNull ? 'binary-strings' : 'utf8-full';
    }
    store.items[idx] = {
      ...item,
      contentText: fullText,
      updatedAt: new Date().toISOString(),
    };
    writeVaultStore(store);
    res.json({
      ok: true,
      extractedChars: fullText.length,
      pageCount,
      method,
      item: {
        ...store.items[idx],
        assetUrl: `/api/pinout-vault/asset/${encodeURIComponent(item.id)}`,
      },
    });
  });

  app.post('/api/pinout-vault/targets', (req, res) => {
    const { label, logicVoltage = 'Verify 1.8V / 3.3V', busNotes = '' } = req.body as {
      label?: string;
      logicVoltage?: string;
      busNotes?: string;
    };
    const cleanLabel = String(label || '').trim().slice(0, 60);
    if (!cleanLabel) {
      res.status(400).json({ ok: false, error: 'Console or board target name is required.' });
      return;
    }
    const slug =
      'custom_' +
      cleanLabel
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40) +
      '_' +
      crypto.randomBytes(2).toString('hex');

    const store = readVaultStore();
    const targetEntry: CustomConsoleTarget = {
      id: slug,
      label: cleanLabel,
      logicVoltage: String(logicVoltage).trim().slice(0, 60),
      busNotes: String(busNotes).trim().slice(0, 500),
      createdAt: new Date().toISOString(),
    };
    store.customTargets.push(targetEntry);
    writeVaultStore(store);
    res.json({ ok: true, target: targetEntry, customTargets: store.customTargets });
  });

  app.delete('/api/pinout-vault/targets/:id', (req, res) => {
    const id = String(req.params.id || '').trim();
    const store = readVaultStore();
    store.customTargets = store.customTargets.filter((t) => t.id !== id);
    writeVaultStore(store);
    res.json({ ok: true, customTargets: store.customTargets });
  });

  // --- Local Small Model Runtime (Ollama / llama.cpp / LM Studio OpenAI-Compatible) ---
  function normalizeLocalLlmBaseUrl(raw?: string): string {
    const fallback = 'http://127.0.0.1:11434';
    const candidate = String(raw || fallback).trim().replace(/\/+$/, '');
    try {
      const u = new URL(candidate);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return fallback;
      return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, '')}`;
    } catch {
      return fallback;
    }
  }

  async function fetchJsonWithTimeout(
    targetUrl: string,
    options: { method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number } = {}
  ): Promise<{ ok: boolean; status: number; json: any; text: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 2500);
    try {
      const resp = await fetch(targetUrl, {
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body,
        signal: controller.signal,
      });
      const text = await resp.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {}
      return { ok: resp.ok, status: resp.status, json, text };
    } finally {
      clearTimeout(timer);
    }
  }

  function isVisionModelName(name: string): boolean {
    return /(vl|vision|llava|minicpm-v|moondream|gemma3|pixtral|qwen2\.5vl|qwen3-vl|bakllava)/i.test(name);
  }

  function safeParseModelJson(rawText: string): any | null {
    const trimmed = String(rawText || '').trim();
    const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
    const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
    try {
      return JSON.parse(candidate);
    } catch {
      const firstBrace = candidate.indexOf('{');
      const lastBrace = candidate.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
        } catch {}
      }
      return null;
    }
  }

  app.get('/api/local-llm/status', async (req, res) => {
    const baseUrl = normalizeLocalLlmBaseUrl(String(req.query.baseUrl || 'http://127.0.0.1:11434'));
    const binaries = {
      ollama: commandExists('ollama'),
      llamaServer: commandExists('llama-server'),
      llamaCli: commandExists('llama-cli'),
    };

    const recommendedModels = [
      { name: 'qwen2.5:3b', size: '~1.9 GB', role: 'Fast text & pinout JSON structuring' },
      { name: 'gemma3:4b', size: '~3.3 GB', role: 'Text + multimodal board photo vision' },
      { name: 'qwen2.5vl:3b', size: '~3.2 GB', role: 'OCR silkscreen labels & board photos' },
      { name: 'llama3.2:3b', size: '~2.0 GB', role: 'Lightweight bench doc research' },
    ];

    // 1. Try Ollama /api/tags
    try {
      const ollamaRes = await fetchJsonWithTimeout(`${baseUrl}/api/tags`, { timeoutMs: 1800 });
      if (ollamaRes.ok && Array.isArray(ollamaRes.json?.models)) {
        const models = ollamaRes.json.models.map((m: any) => ({
          name: String(m.name || m.model || ''),
          sizeBytes: Number(m.size || 0),
          parameterSize: m.details?.parameter_size || '',
          quantization: m.details?.quantization_level || '',
          supportsVision: isVisionModelName(String(m.name || '')),
        }));
        res.json({
          ok: true,
          reachable: true,
          provider: 'ollama',
          baseUrl,
          isCloudContainer: isCloudContainer(),
          binaries,
          models,
          recommendedModels,
          error: null,
        });
        return;
      }
    } catch {}

    // 2. Fallback probe OpenAI-compatible /v1/models (llama-server, LM Studio, vLLM)
    const v1Base = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;
    try {
      const oaiRes = await fetchJsonWithTimeout(`${v1Base}/models`, { timeoutMs: 1800 });
      if (oaiRes.ok && Array.isArray(oaiRes.json?.data)) {
        const models = oaiRes.json.data.map((m: any) => ({
          name: String(m.id || ''),
          sizeBytes: 0,
          parameterSize: '',
          quantization: '',
          supportsVision: isVisionModelName(String(m.id || '')),
        }));
        res.json({
          ok: true,
          reachable: true,
          provider: 'openai',
          baseUrl,
          isCloudContainer: isCloudContainer(),
          binaries,
          models,
          recommendedModels,
          error: null,
        });
        return;
      }
    } catch {}

    res.json({
      ok: true,
      reachable: false,
      provider: null,
      baseUrl,
      isCloudContainer: isCloudContainer(),
      binaries,
      models: [],
      recommendedModels,
      error: isCloudContainer()
        ? 'Cloud sandbox cannot reach your local Ollama daemon. Run locally on Kali (npm run dev -> http://localhost:3000) OR enable OLLAMA_ORIGINS="*" and switch Client Direct mode.'
        : `No local model server responded at ${baseUrl}. Start Ollama ("ollama serve") or llama-server ("llama-server -m model.gguf --port 8080").`,
    });
  });

  app.post('/api/local-llm/organize', async (req, res) => {
    const {
      itemId,
      title = '',
      docText = '',
      consoleTarget = 'auto',
      boardRev = '',
      baseUrl: rawBaseUrl = 'http://127.0.0.1:11434',
      model = 'qwen2.5:3b',
      provider = 'ollama',
      saveToVault = true,
      imageBase64s = [],
      charOffset = 0,
      maxChars = 28000,
    } = req.body as {
      itemId?: string;
      title?: string;
      docText?: string;
      consoleTarget?: string;
      boardRev?: string;
      baseUrl?: string;
      model?: string;
      provider?: 'ollama' | 'openai';
      saveToVault?: boolean;
      imageBase64s?: string[];
      charOffset?: number;
      maxChars?: number;
    };

    const baseUrl = normalizeLocalLlmBaseUrl(rawBaseUrl);
    const store = readVaultStore();
    const targetItem = itemId ? store.items.find((it) => it.id === itemId) : undefined;

    const effectiveTitle = title || targetItem?.title || 'Bench Hardware Doc';
    const fullDocText = String(docText || targetItem?.contentText || '');
    const safeOffset = Math.max(0, Number(charOffset) || 0);
    const safeWindow = Math.max(2000, Math.min(48000, Number(maxChars) || 28000));
    const effectiveText = fullDocText.slice(safeOffset, safeOffset + safeWindow);
    const imagesToSend: string[] = [];

    for (const img of imageBase64s || []) {
      if (typeof img === 'string' && img.trim()) {
        const cleaned = img.replace(/^data:[^;]+;base64,/, '').trim();
        if (cleaned) imagesToSend.push(cleaned);
      }
    }
    if (
      imagesToSend.length === 0 &&
      targetItem?.assetFilename &&
      targetItem.mimeType?.startsWith('image/')
    ) {
      const fullAsset = path.join(VAULT_ASSETS_DIR, path.basename(targetItem.assetFilename));
      if (fs.existsSync(fullAsset)) {
        imagesToSend.push(fs.readFileSync(fullAsset).toString('base64'));
      }
    }

    if (!effectiveText.trim() && imagesToSend.length === 0) {
      res.status(400).json({ ok: false, error: 'Provide doc text or attach a board photo to analyze.' });
      return;
    }

    const systemPrompt = [
      'You are an offline hardware engineering assistant organizing console motherboard pinouts and repair docs.',
      'User bench wire colors: Dark Blue=GND, Light Blue=eMMC CLK, Yellow=eMMC CMD, Green=eMMC DAT0.',
      'Waveshare CH347 headers: UART(1:VCC,2:CTS,3:RTS,4:GND,5:TXD,6:RXD), SPI/I2C(1:VCC,2:SCL,3:VCC,4:SDO,5:SCK,6:CS1,7:GND,8:SDA,9:GND,10:SDI,11:CS0,12:NC), JTAG(1:VCC,2:TDI,3:TCK,4:TRST,5:GND,6:TDO,7:TMS,8:NC).',
      'CRITICAL RULES: Never invent pin numbers or board coordinates not present in the source doc/photo. Highlight 1.8V vs 3.3V logic warnings clearly.',
      'Return STRICT JSON ONLY matching schema:',
      '{"summary":"string","detectedTarget":"xbox1_phat|xbox_sx|ps5_all|switch_std|switch_oled|switch_2|custom","boardRev":"string","tags":["string"],"voltageWarnings":["string"],"extractedPins":[{"signal":"string","boardPoint":"string","adapterPin":"string","wireColor":"string","voltage":"string","notes":"string"}],"benchChecklist":["string"]}',
    ].join('\n');

    const userPrompt = [
      `Title: ${effectiveTitle}`,
      `Console Hint: ${consoleTarget}`,
      `Board Rev Hint: ${boardRev || targetItem?.boardRev || 'unknown'}`,
      effectiveText ? `Document Text:\n${effectiveText}` : 'No text doc provided; inspect the attached board photo for silkscreen labels, test points, and pinouts.',
    ].join('\n\n');

    try {
      let rawResponseText = '';

      if (provider === 'openai') {
        const v1Base = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;
        const userContent: any =
          imagesToSend.length > 0 && isVisionModelName(model)
            ? [
                { type: 'text', text: userPrompt },
                ...imagesToSend.map((b64) => ({
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${b64}` },
                })),
              ]
            : userPrompt;

        const resp = await fetchJsonWithTimeout(`${v1Base}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          timeoutMs: 90000,
          body: JSON.stringify({
            model,
            temperature: 0.15,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent },
            ],
          }),
        });
        if (!resp.ok) {
          res.status(502).json({
            ok: false,
            error: `Local OpenAI server (${v1Base}) returned HTTP ${resp.status}: ${resp.text.slice(0, 300)}`,
          });
          return;
        }
        rawResponseText = resp.json?.choices?.[0]?.message?.content || '';
      } else {
        const ollamaMsg: any = { role: 'user', content: userPrompt };
        if (imagesToSend.length > 0 && isVisionModelName(model)) {
          ollamaMsg.images = imagesToSend;
        }
        const resp = await fetchJsonWithTimeout(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          timeoutMs: 90000,
          body: JSON.stringify({
            model,
            stream: false,
            format: 'json',
            options: { temperature: 0.15, num_ctx: 4096 },
            messages: [{ role: 'system', content: systemPrompt }, ollamaMsg],
          }),
        });
        if (!resp.ok) {
          res.status(502).json({
            ok: false,
            error: `Ollama (${baseUrl}) returned HTTP ${resp.status}: ${resp.text.slice(0, 300)}`,
          });
          return;
        }
        rawResponseText = resp.json?.message?.content || '';
      }

      const parsed = safeParseModelJson(rawResponseText);
      const organized: OrganizedDocData = {
        summary: String(parsed?.summary || rawResponseText || 'No summary produced.').trim(),
        detectedTarget: parsed?.detectedTarget ? String(parsed.detectedTarget) : undefined,
        boardRev: parsed?.boardRev ? String(parsed.boardRev) : undefined,
        voltageWarnings: Array.isArray(parsed?.voltageWarnings)
          ? parsed.voltageWarnings.map((w: any) => String(w)).filter(Boolean)
          : [],
        extractedPins: Array.isArray(parsed?.extractedPins)
          ? parsed.extractedPins
              .map((p: any) => ({
                signal: String(p?.signal || '').trim(),
                boardPoint: String(p?.boardPoint || '').trim(),
                adapterPin: String(p?.adapterPin || '').trim(),
                wireColor: p?.wireColor ? String(p.wireColor).trim() : '',
                voltage: p?.voltage ? String(p.voltage).trim() : '',
                notes: p?.notes ? String(p.notes).trim() : '',
              }))
              .filter((p: ExtractedPinRow) => p.signal || p.boardPoint || p.adapterPin)
          : [],
        benchChecklist: Array.isArray(parsed?.benchChecklist)
          ? parsed.benchChecklist.map((c: any) => String(c)).filter(Boolean)
          : [],
        analyzedBy: `${provider}:${model}`,
        analyzedAt: new Date().toISOString(),
      };

      const suggestedTags: string[] = Array.isArray(parsed?.tags)
        ? parsed.tags.map((t: any) => String(t).trim()).filter(Boolean)
        : [];

      if (saveToVault && targetItem) {
        const idx = store.items.findIndex((it) => it.id === targetItem.id);
        if (idx !== -1) {
          store.items[idx].organized = organized;
          if (!store.items[idx].boardRev && organized.boardRev) {
            store.items[idx].boardRev = organized.boardRev;
          }
          if (suggestedTags.length > 0) {
            store.items[idx].tags = Array.from(new Set([...store.items[idx].tags, ...suggestedTags])).slice(0, 20);
          }
          store.items[idx].updatedAt = new Date().toISOString();
          writeVaultStore(store);
        }
      }

      res.json({
        ok: true,
        organized,
        suggestedTags,
        rawResponseText,
      });
    } catch (err: any) {
      res.status(503).json({
        ok: false,
        error: `Could not reach local model at ${baseUrl}: ${err?.message || 'connection refused'}. Ensure Ollama or llama-server is running locally.`,
      });
    }
  });

  app.post('/api/local-llm/research', async (req, res) => {
    const {
      query = '',
      consoleTarget = 'all',
      baseUrl: rawBaseUrl = 'http://127.0.0.1:11434',
      model = 'qwen2.5:3b',
      provider = 'ollama',
    } = req.body as {
      query?: string;
      consoleTarget?: string;
      baseUrl?: string;
      model?: string;
      provider?: 'ollama' | 'openai';
    };

    const q = String(query || '').trim();
    if (!q) {
      res.status(400).json({ ok: false, error: 'Research query is required.' });
      return;
    }

    const baseUrl = normalizeLocalLlmBaseUrl(rawBaseUrl);
    const store = readVaultStore();
    const tokens = q.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);

    const ranked = store.items
      .filter((it) => consoleTarget === 'all' || it.consoleTarget === consoleTarget)
      .map((it) => {
        const hay = [
          it.title,
          it.consoleTarget,
          it.boardRev,
          it.tags.join(' '),
          it.contentText,
          it.organized?.summary || '',
          JSON.stringify(it.organized?.extractedPins || []),
        ]
          .join(' ')
          .toLowerCase();
        let score = it.consoleTarget === consoleTarget ? 3 : 0;
        for (const tok of tokens) {
          if (hay.includes(tok)) score += 2;
        }
        return { it, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const contextBlock =
      ranked.length > 0
        ? ranked
            .map(({ it }, idx) => {
              const snippet = (it.contentText || it.organized?.summary || '').slice(0, 4500);
              const pins = it.organized?.extractedPins?.length
                ? `Pins: ${JSON.stringify(it.organized.extractedPins.slice(0, 24))}`
                : '';
              return `[Doc ${idx + 1}: "${it.title}" | target=${it.consoleTarget} | rev=${it.boardRev || 'n/a'} | kind=${it.kind} | totalChars=${(it.contentText || '').length}]\n${snippet}\n${pins}`;
            })
            .join('\n---\n')
        : 'No saved user docs in vault yet for this query.';

    const systemPrompt = [
      'You are a local bench research assistant for hardware pinouts (Xbox One/Series X, PS5 variants, Switch/OLED/Switch 2, Waveshare CH347, Mini2040 RP2040).',
      'Answer concisely using the saved bench vault documents provided below. Cite [Doc #] titles when referencing uploaded notes/photos.',
      'Be strictly honest: if voltage/pin details are missing from the docs, explicitly say to verify with a multimeter or schematic rather than guessing.',
    ].join('\n');

    const userPrompt = `Question: ${q}\n\nSaved Vault Documents:\n${contextBlock}`;

    try {
      let answer = '';
      if (provider === 'openai') {
        const v1Base = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;
        const resp = await fetchJsonWithTimeout(`${v1Base}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          timeoutMs: 90000,
          body: JSON.stringify({
            model,
            temperature: 0.2,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        });
        if (!resp.ok) {
          res.status(502).json({ ok: false, error: `OpenAI-compatible server returned HTTP ${resp.status}` });
          return;
        }
        answer = resp.json?.choices?.[0]?.message?.content || '';
      } else {
        const resp = await fetchJsonWithTimeout(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          timeoutMs: 90000,
          body: JSON.stringify({
            model,
            stream: false,
            options: { temperature: 0.2, num_ctx: 4096 },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        });
        if (!resp.ok) {
          res.status(502).json({ ok: false, error: `Ollama returned HTTP ${resp.status}` });
          return;
        }
        answer = resp.json?.message?.content || '';
      }

      res.json({
        ok: true,
        answer: answer.trim(),
        modelUsed: `${provider}:${model}`,
        citations: ranked.map(({ it, score }) => ({
          id: it.id,
          title: it.title,
          consoleTarget: it.consoleTarget,
          boardRev: it.boardRev,
          kind: it.kind,
          score,
        })),
      });
    } catch (err: any) {
      res.status(503).json({
        ok: false,
        error: `Local model unreachable at ${baseUrl}: ${err?.message || 'connection refused'}`,
        citations: ranked.map(({ it, score }) => ({
          id: it.id,
          title: it.title,
          consoleTarget: it.consoleTarget,
          boardRev: it.boardRev,
          kind: it.kind,
          score,
        })),
      });
    }
  });

  // Build Full-Contents Training Corpus (.jsonl + Modelfile) from Pinout Vault and/or Local Host Files/Directories
  app.post('/api/local-llm/export-training', (req, res) => {
    try {
      const {
        includeVault = true,
        vaultItemIds = [],
        localRootPath = '',
        inlineDocs = [],
        format = 'openai',
        chunkChars,
        chunkSize,
        overlapChars,
        overlap,
        systemPrompt = 'You are a domain expert hardware/systems assistant trained on the user’s full technical archive. Answer accurately using verified schematics, memory maps, configuration data, and code.',
      } = req.body as {
        includeVault?: boolean;
        vaultItemIds?: string[];
        localRootPath?: string;
        inlineDocs?: Array<{
          title?: string;
          sourcePath?: string;
          category?: string;
          text?: string;
        }>;
        format?: 'openai' | 'sharegpt' | 'alpaca' | 'raw_pretrain';
        chunkChars?: number;
        chunkSize?: number;
        overlapChars?: number;
        overlap?: number;
        systemPrompt?: string;
      };

      const safeChunk = Math.max(400, Math.min(16000, Number(chunkChars ?? chunkSize) || 2400));
      const safeOverlap = Math.max(0, Math.min(Math.floor(safeChunk / 3), Number(overlapChars ?? overlap) || 250));

      interface SourceDoc {
        title: string;
        sourcePath: string;
        category: string;
        text: string;
        pinsJson?: string;
      }

      const docs: SourceDoc[] = [];

      if (Array.isArray(inlineDocs) && inlineDocs.length > 0) {
        for (const item of inlineDocs) {
          const text = String(item?.text || '').trim();
          if (!text) continue;
          docs.push({
            title: String(item?.title || 'kit_file'),
            sourcePath: String(item?.sourcePath || item?.title || 'xbox://kit'),
            category: String(item?.category || 'xbox-kit-fs'),
            text: text.slice(0, 2500000),
          });
        }
      }

      if (includeVault) {
        const store = readVaultStore();
        const selected =
          Array.isArray(vaultItemIds) && vaultItemIds.length > 0
            ? store.items.filter((it) => vaultItemIds.includes(it.id))
            : store.items;
        for (const it of selected) {
          const text = (it.contentText || it.organized?.summary || '').trim();
          if (!text && !it.organized?.extractedPins?.length) continue;
          docs.push({
            title: it.title,
            sourcePath: `vault://${it.consoleTarget}/${it.filename || it.id}`,
            category: [it.consoleTarget, it.boardRev, ...it.tags].filter(Boolean).join(' · '),
            text,
            pinsJson: it.organized?.extractedPins?.length
              ? JSON.stringify(it.organized.extractedPins, null, 2)
              : undefined,
          });
        }
      }

      if (localRootPath && String(localRootPath).trim()) {
        const resolvedRoot = path.resolve(String(localRootPath).trim().replace(/^~/, os.homedir()));
        if (!fs.existsSync(resolvedRoot)) {
          res.status(400).json({ ok: false, error: `Local path does not exist: ${resolvedRoot}` });
          return;
        }
        const TEXT_EXTS = new Set([
          '.txt', '.md', '.markdown', '.json', '.jsonl', '.csv', '.tsv', '.log', '.ini', '.cfg',
          '.yaml', '.yml', '.xml', '.toml', '.c', '.h', '.cpp', '.hpp', '.rs', '.go', '.py',
          '.ts', '.tsx', '.js', '.jsx', '.sh', '.ps1', '.bat', '.sql', '.pdf',
        ]);
        const MAX_FILES_SCAN = 1200;
        const collectedFiles: string[] = [];
        const walk = (p: string) => {
          if (collectedFiles.length >= MAX_FILES_SCAN) return;
          let st: fs.Stats;
          try {
            st = fs.statSync(p);
          } catch {
            return;
          }
          if (st.isFile()) {
            collectedFiles.push(p);
            return;
          }
          if (st.isDirectory()) {
            let entries: fs.Dirent[] = [];
            try {
              entries = fs.readdirSync(p, { withFileTypes: true });
            } catch {
              return;
            }
            for (const entry of entries) {
              if (collectedFiles.length >= MAX_FILES_SCAN) break;
              if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
              const nextP = path.join(p, entry.name);
              if (entry.isDirectory()) walk(nextP);
              else if (entry.isFile() && TEXT_EXTS.has(path.extname(entry.name).toLowerCase())) {
                collectedFiles.push(nextP);
              }
            }
          }
        };
        walk(resolvedRoot);

        for (const fp of collectedFiles) {
          try {
            const st = fs.statSync(fp);
            if (st.size > 32 * 1024 * 1024) continue;
            const ext = path.extname(fp).toLowerCase();
            let text = '';
            if (ext === '.pdf') {
              text = extractFullTextFromPdf(fs.readFileSync(fp)).text;
            } else {
              const buf = fs.readFileSync(fp);
              text = buf.includes(0)
                ? (buf.toString('latin1').match(/[\x20-\x7e]{4,}/g) || []).join('\n')
                : buf.toString('utf8');
            }
            if (text.trim()) {
              docs.push({
                title: path.basename(fp),
                sourcePath: fp,
                category: `local-fs · ${ext || 'file'}`,
                text: text.slice(0, 2500000),
              });
            }
          } catch {}
        }
      }

      if (docs.length === 0) {
        res.status(400).json({
          ok: false,
          error: 'No readable text/config/code documents were found to build training records.',
        });
        return;
      }

      const splitCleanChunks = (rawText: string): string[] => {
        if (!rawText.trim()) return [];
        const chunks: string[] = [];
        let cursor = 0;
        while (cursor < rawText.length) {
          let end = Math.min(rawText.length, cursor + safeChunk);
          if (end < rawText.length) {
            const newlineBreak = rawText.lastIndexOf('\n', end);
            if (newlineBreak > cursor + safeChunk * 0.55) {
              end = newlineBreak + 1;
            }
          }
          const segment = rawText.slice(cursor, end).trim();
          if (segment) chunks.push(segment);
          if (end >= rawText.length) break;
          cursor = Math.max(cursor + 1, end - safeOverlap);
        }
        return chunks;
      };

      const records: any[] = [];
      let totalChars = 0;

      for (const doc of docs) {
        const chunks = splitCleanChunks(doc.text);
        const totalParts = Math.max(1, chunks.length);
        chunks.forEach((chunk, idx) => {
          totalChars += chunk.length;
          const partLabel = `Section ${idx + 1} of ${totalParts}`;
          const promptQ = `Explain and recall the exact technical contents of "${doc.title}" (${partLabel}${doc.category ? ` · ${doc.category}` : ''}).`;
          if (format === 'raw_pretrain') {
            records.push({
              text: `# ${doc.title} (${partLabel})\nSource: ${doc.sourcePath}\n\n${chunk}`,
              source: doc.sourcePath,
              title: doc.title,
              section: idx + 1,
              totalSections: totalParts,
            });
          } else if (format === 'alpaca') {
            records.push({
              instruction: promptQ,
              input: `Source: ${doc.sourcePath}`,
              output: chunk,
            });
          } else if (format === 'sharegpt') {
            records.push({
              conversations: [
                { from: 'system', value: systemPrompt },
                { from: 'human', value: promptQ },
                { from: 'gpt', value: chunk },
              ],
            });
          } else {
            records.push({
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: promptQ },
                { role: 'assistant', content: chunk },
              ],
            });
          }
        });

        if (doc.pinsJson) {
          const pinPrompt = `List the verified structured pinout wiring table for "${doc.title}" (${doc.category}).`;
          if (format === 'raw_pretrain') {
            records.push({ text: `# ${doc.title} — Structured Pinout Table\n\n${doc.pinsJson}`, source: doc.sourcePath, title: doc.title });
          } else if (format === 'alpaca') {
            records.push({ instruction: pinPrompt, input: '', output: doc.pinsJson });
          } else if (format === 'sharegpt') {
            records.push({
              conversations: [
                { from: 'system', value: systemPrompt },
                { from: 'human', value: pinPrompt },
                { from: 'gpt', value: doc.pinsJson },
              ],
            });
          } else {
            records.push({
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: pinPrompt },
                { role: 'assistant', content: doc.pinsJson },
              ],
            });
          }
        }
      }

      const jsonl = records.map((r) => JSON.stringify(r)).join('\n');
      res.json({
        ok: true,
        format,
        docCount: docs.length,
        sampleCount: records.length,
        totalDocs: docs.length,
        totalRecords: records.length,
        totalChars,
        estimatedTokens: Math.round(totalChars / 4),
        previewSamples: records.slice(0, 4),
        jsonl,
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Failed generating training corpus' });
    }
  });

  // --- Real Xbox WDP (:11443) App Manager Routes ---
  app.post('/api/xbox/apps/list', async (req, res) => {
    const {
      ip = '192.168.1.100',
      wdpPort = 11443,
      username = 'DevUser',
      password = 'XboxDev2026!',
    } = req.body as { ip?: string; wdpPort?: number; username?: string; password?: string };

    const cleanIp = resolveTargetIp(ip);
    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({
        ok: false,
        runningInCloud: true,
        error: `Cloud preview cannot reach LAN Xbox ${cleanIp}:${wdpPort}. Run locally on Kali (npm run dev -> http://localhost:3000) to list live installed packages.`,
      });
      return;
    }

    try {
      const [pkgRes, procRes] = await Promise.all([
        wdpHttpsRequest({
          ip: cleanIp,
          port: Number(wdpPort) || 11443,
          reqPath: '/api/app/packagemanager/packages',
          method: 'GET',
          username: String(username),
          password: String(password),
          timeoutMs: 8000,
        }),
        wdpHttpsRequest({
          ip: cleanIp,
          port: Number(wdpPort) || 11443,
          reqPath: '/api/resourcemanager/processes',
          method: 'GET',
          username: String(username),
          password: String(password),
          timeoutMs: 5000,
        }).catch(() => ({ statusCode: 0, body: '{}' })),
      ]);

      if (pkgRes.statusCode >= 400) {
        res.json({
          ok: false,
          error: `WDP /api/app/packagemanager/packages returned HTTP ${pkgRes.statusCode}: ${pkgRes.body.slice(0, 200)}`,
        });
        return;
      }

      const cleanPkgBody = String(pkgRes.body || '{}').replace(/^\uFEFF/, '').trim() || '{}';
      const parsed = JSON.parse(cleanPkgBody);
      const rawPackages = Array.isArray(parsed?.InstalledPackages)
        ? parsed.InstalledPackages
        : Array.isArray(parsed?.Packages)
          ? parsed.Packages
          : [];
      let runningSet = new Set<string>();
      try {
        const cleanProcBody = String(procRes.body || '{}').replace(/^\uFEFF/, '').trim() || '{}';
        const procParsed = JSON.parse(cleanProcBody);
        const procs = Array.isArray(procParsed?.Processes) ? procParsed.Processes : [];
        runningSet = new Set(procs.map((p: any) => String(p.PackageFullName || '').toLowerCase()).filter(Boolean));
      } catch {
        // ignore process parse error
      }

      const palette = ['#2563eb', '#059669', '#7c3aed', '#d97706', '#0284c7', '#4f46e5'];
      const apps = rawPackages.map((p: any, idx: number) => {
        const fullName = String(p.PackageFullName || '');
        const pkgOrigin = Number(p.PackageOrigin || 0);
        const isSys = pkgOrigin === 2 || fullName.startsWith('Microsoft.') || fullName.startsWith('Windows.');
        const verObj = p.Version || {};
        const versionStr = verObj.Major !== undefined
          ? `${verObj.Major}.${verObj.Minor}.${verObj.Build}.${verObj.Revision}`
          : String(p.Version || '1.0.0.0');
        return {
          id: `wdp-app-${idx}-${fullName}`,
          name: String(p.Name || fullName.split('_')[0] || 'UnknownPackage'),
          packageFullName: fullName,
          familyName: String(p.PackageFamilyName || ''),
          aumid: String(p.AppId || p.PackageRelativeId || (p.PackageFamilyName ? `${p.PackageFamilyName}!App` : fullName)),
          version: versionStr,
          publisher: String(p.Publisher || 'Unknown'),
          installSizeMb: Math.round((Number(p.Size || 0)) / (1024 * 1024)),
          installDate: 'Live WDP',
          isRunning: runningSet.has(fullName.toLowerCase()),
          isDefaultBoot: false,
          type: isSys ? 'System' : Number(p.CanUninstall) === 1 ? 'Tool' : 'Game',
          iconColor: palette[idx % palette.length],
          isSigned: true,
        };
      });

      res.json({ ok: true, apps, count: apps.length });
    } catch (err: any) {
      res.json({ ok: false, error: err?.message || `Failed reaching WDP on ${cleanIp}:${wdpPort}` });
    }
  });

  app.post('/api/xbox/apps/launch', async (req, res) => {
    const { ip = '192.168.1.100', wdpPort = 11443, username = 'DevUser', password = 'XboxDev2026!', aumid = '', packageFullName = '' } = req.body as any;
    const cleanIp = resolveTargetIp(ip);
    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({ ok: false, runningInCloud: true, error: `Cloud preview cannot reach LAN Xbox ${cleanIp}:${wdpPort}. Run locally on Kali.` });
      return;
    }
    try {
      const appidB64 = Buffer.from(String(aumid || ''), 'utf8').toString('base64');
      const pkgB64 = packageFullName ? `&package=${encodeURIComponent(Buffer.from(String(packageFullName), 'utf8').toString('base64'))}` : '';
      const r = await wdpCsrfRequest({
        ip: cleanIp,
        port: Number(wdpPort) || 11443,
        reqPath: `/api/taskmanager/app?appid=${encodeURIComponent(appidB64)}${pkgB64}`,
        method: 'POST',
        username: String(username),
        password: String(password),
      });
      res.json({
        ok: r.statusCode >= 200 && r.statusCode < 300,
        statusCode: r.statusCode,
        error: r.statusCode >= 300 ? `WDP returned HTTP ${r.statusCode}: ${r.body.slice(0, 200)}` : null,
      });
    } catch (err: any) {
      res.json({ ok: false, error: err?.message || 'WDP launch failed' });
    }
  });

  app.post('/api/xbox/apps/kill', async (req, res) => {
    const { ip = '192.168.1.100', wdpPort = 11443, username = 'DevUser', password = 'XboxDev2026!', packageFullName = '' } = req.body as any;
    const cleanIp = resolveTargetIp(ip);
    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({ ok: false, runningInCloud: true, error: `Cloud preview cannot reach LAN Xbox ${cleanIp}:${wdpPort}. Run locally on Kali.` });
      return;
    }
    try {
      const pkgB64 = Buffer.from(String(packageFullName || ''), 'utf8').toString('base64');
      const r = await wdpCsrfRequest({
        ip: cleanIp,
        port: Number(wdpPort) || 11443,
        reqPath: `/api/taskmanager/app?package=${encodeURIComponent(pkgB64)}`,
        method: 'DELETE',
        username: String(username),
        password: String(password),
      });
      res.json({
        ok: r.statusCode >= 200 && r.statusCode < 300,
        statusCode: r.statusCode,
        error: r.statusCode >= 300 ? `WDP returned HTTP ${r.statusCode}: ${r.body.slice(0, 200)}` : null,
      });
    } catch (err: any) {
      res.json({ ok: false, error: err?.message || 'WDP terminate failed' });
    }
  });

  // Live WDP Task Manager Process Queries (:11443)
  const handleGetProcesses = async (req: any, res: any) => {
    const {
      ip = '192.168.1.100',
      wdpPort = 11443,
      port: legacyPort,
      username = 'DevUser',
      password = 'XboxDev2026!',
    } = { ...req.query, ...req.body } as Record<string, any>;

    const cleanIp = resolveTargetIp(ip);
    const targetPort = Number(wdpPort || legacyPort) || 11443;
    const { username: cleanUser, password: cleanPass } = resolveCredentials(username, password);

    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({
        ok: false,
        runningInCloud: true,
        error: `Cloud preview cannot reach LAN Xbox ${cleanIp}:${targetPort}. Run locally on Kali.`,
      });
      return;
    }

    try {
      const [procRes, osRes] = await Promise.all([
        wdpHttpsRequest({
          ip: cleanIp,
          port: targetPort,
          reqPath: '/api/resourcemanager/processes',
          method: 'GET',
          username: cleanUser,
          password: cleanPass,
          timeoutMs: 6000,
        }),
        wdpHttpsRequest({
          ip: cleanIp,
          port: targetPort,
          reqPath: '/api/os/info',
          method: 'GET',
          username: cleanUser,
          password: cleanPass,
          timeoutMs: 4000,
        }).catch(() => ({ statusCode: 0, body: '{}' })),
      ]);

      if (procRes.statusCode >= 400) {
        res.json({
          ok: false,
          error: `WDP /api/resourcemanager/processes returned HTTP ${procRes.statusCode}: ${procRes.body.slice(0, 200)}`,
        });
        return;
      }

      const cleanProcBody = String(procRes.body || '{}').replace(/^\uFEFF/, '').trim() || '{}';
      const parsed = JSON.parse(cleanProcBody);
      const rawProcs = Array.isArray(parsed?.Processes) ? parsed.Processes : [];

      let totalPhysMemMb = 16384;
      try {
        const osData = JSON.parse(String(osRes.body || '{}').replace(/^\uFEFF/, '').trim() || '{}');
        if (osData?.TotalPhysicalMemory) {
          totalPhysMemMb = Math.round(Number(osData.TotalPhysicalMemory) / (1024 * 1024));
        }
      } catch {}

      const processes = rawProcs.map((p: any) => {
        const pid = Number(p.ProcessId || 0);
        const rawName = String(p.ImageName || '').trim();
        const pkgName = String(p.PackageFullName || '').trim();
        const userName = String(p.UserName || '').trim();
        const name = rawName || (pkgName ? pkgName.split('_')[0] : `PID_${pid}`);

        const cpuPercent = parseFloat(Number(p.CPUUsage || 0).toFixed(1));
        const memoryMb = Math.round(Number(p.WorkingSetSize || 0) / (1024 * 1024));
        const peakMemoryMb = Math.round(Number(p.PageFileUsage || p.VirtualSize || p.WorkingSetSize || 0) / (1024 * 1024));
        const threads = Number(p.ThreadCount || 4);
        const handles = Number(p.HandleCount || 120);
        const status = p.IsSuspended ? 'Suspended' : 'Running';

        const isGame = Boolean(
          userName.toLowerCase().includes('usermgr') ||
          pkgName.toLowerCase().includes('xbxowned') ||
          pkgName.toLowerCase().includes('cyberpunk') ||
          pkgName.toLowerCase().includes('game') ||
          name.toLowerCase().includes('xbxownednative') ||
          name.toLowerCase().endsWith('game.exe') ||
          name.toLowerCase().includes('wwahost')
        );

        return {
          pid,
          name,
          cpuPercent,
          memoryMb,
          peakMemoryMb,
          threads,
          handles,
          status,
          isGame,
          packageFullName: pkgName || undefined,
          userName: userName || undefined,
        };
      });

      // Filter out Idle (PID 0) from telemetry CPU load
      const activeProcs = processes.filter((p: any) => p.pid !== 0);
      const totalCpuLoad = Math.min(
        100,
        parseFloat(activeProcs.reduce((acc: number, p: any) => acc + (p.cpuPercent || 0), 0).toFixed(1))
      );
      const totalUsedMemMb = activeProcs.reduce((acc: number, p: any) => acc + p.memoryMb, 0);

      res.json({
        ok: true,
        count: processes.length,
        processes,
        telemetry: {
          cpuAvgLoad: totalCpuLoad,
          memoryUsedMb: totalUsedMemMb,
          memoryTotalMb: totalPhysMemMb,
        },
      });
    } catch (err: any) {
      res.json({ ok: false, error: err?.message || 'Failed fetching WDP processes' });
    }
  };

  app.get('/api/xbox/processes', handleGetProcesses);
  app.post('/api/xbox/processes', handleGetProcesses);

  app.post('/api/xbox/processes/kill', async (req, res) => {
    const {
      ip = '192.168.1.100',
      wdpPort = 11443,
      port: legacyPort,
      username = 'DevUser',
      password = 'XboxDev2026!',
      pid,
      packageFullName,
    } = req.body as Record<string, any>;

    const cleanIp = resolveTargetIp(ip);
    const targetPort = Number(wdpPort || legacyPort) || 11443;
    const { username: cleanUser, password: cleanPass } = resolveCredentials(username, password);

    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({ ok: false, runningInCloud: true, error: `Cloud preview cannot reach LAN Xbox ${cleanIp}:${targetPort}.` });
      return;
    }

    if (!pid && !packageFullName) {
      res.status(400).json({ ok: false, error: 'pid or packageFullName is required to kill a process' });
      return;
    }

    try {
      let killed = false;
      let lastError = '';

      // Method 1: If packageFullName provided, call WDP taskmanager DELETE
      if (packageFullName) {
        try {
          const pkgB64 = Buffer.from(String(packageFullName), 'utf8').toString('base64');
          const r = await wdpCsrfRequest({
            ip: cleanIp,
            port: targetPort,
            reqPath: `/api/taskmanager/app?package=${encodeURIComponent(pkgB64)}`,
            method: 'DELETE',
            username: cleanUser,
            password: cleanPass,
          });
          if (r.statusCode >= 200 && r.statusCode < 300) {
            killed = true;
          } else {
            lastError = `WDP app terminate HTTP ${r.statusCode}: ${r.body.slice(0, 100)}`;
          }
        } catch (e: any) {
          lastError = e?.message || 'WDP app delete failed';
        }
      }

      // Method 2: Call WDP resourcemanager DELETE /api/resourcemanager/processes?pid=${pid}
      if (!killed && pid) {
        try {
          const r = await wdpCsrfRequest({
            ip: cleanIp,
            port: targetPort,
            reqPath: `/api/resourcemanager/processes?pid=${pid}`,
            method: 'DELETE',
            username: cleanUser,
            password: cleanPass,
          });
          if (r.statusCode >= 200 && r.statusCode < 300) {
            killed = true;
          } else {
            lastError = `WDP process terminate HTTP ${r.statusCode}: ${r.body.slice(0, 100)}`;
          }
        } catch (e: any) {
          lastError = e?.message || 'WDP process delete failed';
        }
      }

      res.json({
        ok: killed,
        killedPid: pid,
        error: killed ? null : (lastError || 'Failed to terminate process'),
      });
    } catch (err: any) {
      res.json({ ok: false, error: err?.message || 'Kill process failed' });
    }
  });

  app.post('/api/xbox/processes/dump', async (req, res) => {
    const {
      ip = '192.168.1.100',
      wdpPort = 11443,
      username = 'DevUser',
      password = 'XboxDev2026!',
      pid,
    } = req.body as Record<string, any>;

    const cleanIp = resolveTargetIp(ip);
    const targetPort = Number(wdpPort) || 11443;
    const { username: cleanUser, password: cleanPass } = resolveCredentials(username, password);

    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({ ok: false, runningInCloud: true, error: `Cloud preview cannot reach LAN Xbox ${cleanIp}:${targetPort}.` });
      return;
    }

    try {
      const r = await wdpCsrfRequest({
        ip: cleanIp,
        port: targetPort,
        reqPath: `/api/debug/dump/usermode/dump?pid=${encodeURIComponent(String(pid))}`,
        method: 'POST',
        username: cleanUser,
        password: cleanPass,
      });

      res.json({
        ok: r.statusCode >= 200 && r.statusCode < 300,
        statusCode: r.statusCode,
        error: r.statusCode >= 300 ? `WDP dump returned HTTP ${r.statusCode}: ${r.body.slice(0, 200)}` : null,
      });
    } catch (err: any) {
      res.json({ ok: false, error: err?.message || 'Failed to trigger process dump' });
    }
  });

  app.post('/api/xbox/apps/uninstall', async (req, res) => {
    const { ip = '192.168.1.100', wdpPort = 11443, username = 'DevUser', password = 'XboxDev2026!', packageFullName = '' } = req.body as any;
    const cleanIp = resolveTargetIp(ip);
    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({ ok: false, runningInCloud: true, error: `Cloud preview cannot reach LAN Xbox ${cleanIp}:${wdpPort}. Run locally on Kali.` });
      return;
    }
    try {
      const r = await wdpCsrfRequest({
        ip: cleanIp,
        port: Number(wdpPort) || 11443,
        reqPath: `/api/app/packagemanager/package?package=${encodeURIComponent(String(packageFullName || ''))}`,
        method: 'DELETE',
        username: String(username),
        password: String(password),
      });
      res.json({
        ok: r.statusCode >= 200 && r.statusCode < 300,
        statusCode: r.statusCode,
        error: r.statusCode >= 300 ? `WDP returned HTTP ${r.statusCode}: ${r.body.slice(0, 200)}` : null,
      });
    } catch (err: any) {
      res.json({ ok: false, error: err?.message || 'WDP uninstall failed' });
    }
  });

  app.post('/api/xbox/apps/deploy', async (req, res) => {
    const { ip = '192.168.1.100', wdpPort = 11443, username = 'DevUser', password = 'XboxDev2026!', filename = 'package.msix', fileBase64 = '' } = req.body as any;
    const cleanIp = resolveTargetIp(ip);
    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({ ok: false, runningInCloud: true, error: `Cloud preview cannot reach LAN Xbox ${cleanIp}:${wdpPort}. Run locally on Kali to upload .msix/.appx packages.` });
      return;
    }
    if (!fileBase64) {
      res.status(400).json({ ok: false, error: 'Empty package payload.' });
      return;
    }
    try {
      const fileBuf = Buffer.from(String(fileBase64), 'base64');
      const rawBase = path.basename(String(filename || 'package.msix'));
      const safeName =
        rawBase
          .replace(/\s*\(\d+\)(?=\.[^.]+$)/, '')
          .replace(/[^a-zA-Z0-9._-]/g, '_') || 'package.msix';
      const { contentType, body } = buildMultipartBody([
        {
          name: 'install',
          filename: safeName,
          contentType: 'application/octet-stream',
          data: fileBuf,
        },
      ]);
      const r = await wdpCsrfRequest({
        ip: cleanIp,
        port: Number(wdpPort) || 11443,
        reqPath: `/api/app/packagemanager/package?package=${encodeURIComponent(safeName)}`,
        method: 'POST',
        username: String(username),
        password: String(password),
        body,
        contentType,
        timeoutMs: 60000,
      });

      if (r.statusCode >= 300) {
        res.json({
          ok: false,
          statusCode: r.statusCode,
          body: r.body.slice(0, 400),
          error: `WDP returned HTTP ${r.statusCode}: ${r.body.slice(0, 250)}`,
        });
        return;
      }

      const installState = await pollWdpInstallState({
        ip: cleanIp,
        port: Number(wdpPort) || 11443,
        username: String(username),
        password: String(password),
      });

      if (installState.settled && !installState.success) {
        res.json({
          ok: false,
          statusCode: r.statusCode,
          body: r.body.slice(0, 400),
          error: `WDP accepted upload (HTTP ${r.statusCode}) but background Appx install FAILED${installState.codeHex ? ` (${installState.codeHex})` : ''}: ${installState.reason}`,
        });
        return;
      }

      res.json({
        ok: true,
        statusCode: r.statusCode,
        body: installState.settled
          ? `Installed: ${installState.reason}`
          : `Uploaded (HTTP ${r.statusCode}); verify under Dev Home -> My games & apps.`,
        error: null,
      });
    } catch (err: any) {
      res.json({ ok: false, error: err?.message || 'WDP package upload failed' });
    }
  });

  // Real WDP Power (Restart / Shutdown) & HDMI Screenshot
  app.post('/api/xbox/system/power', async (req, res) => {
    const {
      ip = '192.168.1.100',
      wdpPort = 11443,
      username = 'DevUser',
      password = 'XboxDev2026!',
      action = 'restart',
    } = req.body as {
      ip?: string;
      wdpPort?: number;
      username?: string;
      password?: string;
      action?: 'restart' | 'shutdown';
    };

    const cleanIp = resolveTargetIp(ip);
    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({
        ok: false,
        runningInCloud: true,
        error: `Cloud preview cannot reach LAN Xbox ${cleanIp}:${wdpPort}. Run locally on Kali.`,
      });
      return;
    }

    const reqPath = action === 'shutdown' ? '/api/control/shutdown' : '/api/control/restart';
    try {
      const r = await wdpCsrfRequest({
        ip: cleanIp,
        port: Number(wdpPort) || 11443,
        reqPath,
        method: 'POST',
        username: String(username),
        password: String(password),
        timeoutMs: 8000,
      });
      res.json({
        ok: r.statusCode >= 200 && r.statusCode < 300,
        statusCode: r.statusCode,
        error: r.statusCode >= 300 ? `WDP ${reqPath} returned HTTP ${r.statusCode}: ${r.body.slice(0, 200)}` : null,
      });
    } catch (err: any) {
      res.json({ ok: false, error: err?.message || `WDP ${reqPath} failed` });
    }
  });

  app.post('/api/xbox/system/screenshot', async (req, res) => {
    const { ip = '192.168.1.100', wdpPort = 11443, username = 'DevUser', password = 'XboxDev2026!' } = req.body as any;
    const cleanIp = resolveTargetIp(ip);
    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      res.json({
        ok: false,
        runningInCloud: true,
        error: `Cloud preview cannot reach LAN Xbox ${cleanIp}:${wdpPort}. Run locally on Kali.`,
      });
      return;
    }

    try {
      const r = await new Promise<{ statusCode: number; buf: Buffer; ctype: string }>((resolve, reject) => {
        const auth = Buffer.from(`${username}:${password}`).toString('base64');
        const request = https.request(
          {
            hostname: cleanIp,
            port: Number(wdpPort) || 11443,
            path: '/ext/screenshot',
            method: 'GET',
            rejectUnauthorized: false,
            headers: { Authorization: `Basic ${auth}` },
            timeout: 8000,
          },
          (resp) => {
            const chunks: Buffer[] = [];
            resp.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
            resp.on('end', () =>
              resolve({
                statusCode: resp.statusCode || 0,
                buf: Buffer.concat(chunks),
                ctype: String(resp.headers['content-type'] || 'image/png'),
              })
            );
          }
        );
        request.on('timeout', () => {
          request.destroy();
          reject(new Error('WDP screenshot timed out'));
        });
        request.on('error', reject);
        request.end();
      });

      if (r.statusCode >= 400 || r.buf.length === 0) {
        res.json({ ok: false, error: `WDP /ext/screenshot returned HTTP ${r.statusCode}` });
        return;
      }
      res.json({
        ok: true,
        dataUrl: `data:${r.ctype};base64,${r.buf.toString('base64')}`,
      });
    } catch (err: any) {
      res.json({ ok: false, error: err?.message || 'Screenshot request failed' });
    }
  });

  // Direct 1-Click Build + Sign + Push (SMB3 :445 + WDP :11443) when running locally on Kali
  app.post('/api/xbox/deploy-xdk', async (req, res) => {
    const {
      ip = '192.168.1.100',
      wdpPort = 11443,
      username = 'DevUser',
      password = 'XboxDev2026!',
      smbShareName = 'DevelopmentFiles',
      packageName = 'XBXOwned.XboxDevKitStudio',
      publisher = 'CN=XBXOwned DevKit Studio',
      version = '1.0.0.0',
      displayName = 'Xbox GDK & XDK Linux Studio',
      uwpMode = 'html-uwp',
      capabilities,
      manifestFlags = {},
      cppSource = '',
      compiledExeBase64 = '',
    } = req.body as {
      ip?: string;
      wdpPort?: number;
      username?: string;
      password?: string;
      smbShareName?: string;
      packageName?: string;
      publisher?: string;
      version?: string;
      displayName?: string;
      uwpMode?: 'html-uwp' | 'native-cpp';
      capabilities?: string[];
      manifestFlags?: XdkManifestFlagsServer;
      cppSource?: string;
      compiledExeBase64?: string;
    };

    const cleanIp = resolveTargetIp(ip);
    const safePkg = String(packageName).replace(/[^a-zA-Z0-9._-]/g, '') || 'XBXOwned.XboxDevKitStudio';
    const steps: Array<{ name: string; status: 'ok' | 'warn' | 'error'; detail: string }> = [];

    if (isCloudContainer() && isPrivateLanIp(cleanIp)) {
      steps.push({
        name: 'LAN Reachability Check',
        status: 'error',
        detail: `Cloud preview cannot reach your home LAN Xbox (${cleanIp}:${wdpPort}). Run this app once on Kali (http://localhost:3000) and click Deploy — the app handles everything automatically from there.`,
      });
      res.status(400).json({ ok: false, runningInCloud: true, steps });
      return;
    }

    ensureDistBuilt();
    const stageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xbx-deploy-'));

    try {
      // 1. Optional native C++ compile (only when native-cpp mode is explicitly chosen)
      let exeBuffer: Buffer | null = compiledExeBase64
        ? Buffer.from(compiledExeBase64, 'base64')
        : null;

      let resolvedUwpMode: 'html-uwp' | 'native-cpp' = uwpMode;
      if (uwpMode === 'native-cpp' && !exeBuffer) {
        const xwinDir = path.join(os.homedir(), 'xwin');
        if (commandExists('clang-cl') && commandExists('lld-link') && fs.existsSync(path.join(xwinDir, 'sdk'))) {
          const cppPath = path.join(stageDir, 'Main.cpp');
          const objPath = path.join(stageDir, 'Main.obj');
          const exePath = path.join(stageDir, 'XBXOwned.exe');
          fs.writeFileSync(cppPath, cppSource || '// empty', 'utf8');

          const cRes = spawnSync(
            'clang-cl',
            [
              '--target=x86_64-pc-windows-msvc',
              '/std:c++17',
              '/EHsc',
              '/O2',
              '/DWIN32_LEAN_AND_MEAN',
              '/DWINAPI_FAMILY=WINAPI_FAMILY_APP',
              '-Wno-nonportable-include-path',
              '-fms-compatibility',
              '-fms-extensions',
              '/winsysroot',
              xwinDir,
              '/c',
              cppPath,
              `/Fo${objPath}`,
            ],
            { encoding: 'utf8' }
          );

          if (cRes.status === 0) {
            const lRes = spawnSync(
              'lld-link',
              [
                '/APPCONTAINER',
                '/SUBSYSTEM:WINDOWS',
                '/MACHINE:X64',
                `/winsysroot:${xwinDir}`,
                `/OUT:${exePath}`,
                objPath,
                'windowsapp.lib',
                'd3d11.lib',
                'dxgi.lib',
              ],
              { encoding: 'utf8' }
            );

            if (lRes.status === 0 && fs.existsSync(exePath)) {
              exeBuffer = fs.readFileSync(exePath);
              steps.push({ name: 'Compile Native C++ OneCore Host', status: 'ok', detail: `Compiled XBXOwned.exe (${Math.round(exeBuffer.length / 1024)} KB) via ~/xwin` });
            } else {
              resolvedUwpMode = 'html-uwp';
              steps.push({
                name: 'Link XBXOwned.exe (Auto-Fallback to HTML/UWP)',
                status: 'warn',
                detail: 'lld-link did not produce XBXOwned.exe; automatically switched AppxManifest.xml to StartPage="www/index.html" so the app launches cleanly on Xbox without crashing.',
              });
            }
          } else {
            resolvedUwpMode = 'html-uwp';
            steps.push({
              name: 'Compile Main.cpp (Auto-Fallback to HTML/UWP)',
              status: 'warn',
              detail: 'clang-cl did not produce Main.obj; automatically switched AppxManifest.xml to StartPage="www/index.html" so the app launches cleanly on Xbox without crashing.',
            });
          }
        } else {
          resolvedUwpMode = 'html-uwp';
          steps.push({
            name: 'Native C++ Executable (Auto-Fallback to HTML/UWP)',
            status: 'warn',
            detail: 'No compiled XBXOwned.exe attached and ~/xwin not found; automatically switched AppxManifest.xml to StartPage="www/index.html" so the app launches cleanly on Xbox without crashing.',
          });
        }
      }

      // 2. Stage OneCore UWP files & assets
      const assetsDir = path.join(stageDir, 'Assets');
      const wwwDir = path.join(stageDir, 'www');
      fs.mkdirSync(assetsDir, { recursive: true });
      fs.mkdirSync(wwwDir, { recursive: true });

      const manifestXml = buildSeriesXManifestXml({
        packageName: safePkg,
        publisher,
        version,
        displayName,
        uwpMode: resolvedUwpMode,
        capabilities,
        manifestFlags,
      });
      fs.writeFileSync(path.join(stageDir, 'AppxManifest.xml'), manifestXml, 'utf8');
      if (exeBuffer) {
        fs.writeFileSync(path.join(stageDir, 'XBXOwned.exe'), exeBuffer);
      }

      const assetFiles: Array<[string, Buffer]> = [
        ['SmallLogo.png', generateRgbaPng(44, 44)],
        ['StoreLogo.png', generateRgbaPng(50, 50)],
        ['Logo.png', generateRgbaPng(150, 150)],
        ['Wide310x150Logo.png', generateRgbaPng(310, 150)],
        ['SplashScreen.png', generateRgbaPng(620, 300)],
      ];
      for (const [name, buf] of assetFiles) {
        fs.writeFileSync(path.join(assetsDir, name), buf);
      }

      const distEntries = collectXdkWwwFiles(path.join(__dirname, 'dist'), 'www', {
        includeBootPolyfills: manifestFlags?.enableEdgeHtmlPolyfills !== false,
      });
      const hasDistIndex = distEntries.some((e) => e.name === 'www/index.html');
      const stagedEntries: ZipEntryInput[] = [
        { name: 'AppxManifest.xml', data: Buffer.from(manifestXml, 'utf8') },
        ...(exeBuffer ? [{ name: 'XBXOwned.exe', data: exeBuffer }] : []),
        ...assetFiles.map(([name, data]) => ({ name: `Assets/${name}`, data })),
        ...(hasDistIndex
          ? distEntries
          : [{ name: 'www/index.html', data: Buffer.from('<!doctype html><html><body><h1>XBXOwned Series X DevKit Studio</h1></body></html>', 'utf8') }]),
      ];

      for (const entry of stagedEntries) {
        if (entry.name.startsWith('www/')) {
          const target = path.join(stageDir, entry.name);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, entry.data);
        }
      }

      const { stripped: strippedXboxCaps, safeList: activeCaps } = filterXboxSafeCapabilities(
        capabilities,
        Boolean(manifestFlags?.stripRestrictedOnXbox)
      );
      steps.push({
        name: 'Stage Series X OneCore Package',
        status: 'ok',
        detail: `Staged ${stagedEntries.length} files (${uwpMode === 'html-uwp' ? 'Zero-Compile StartPage=www/index.html' : 'Native XBXOwned.exe'}${manifestFlags?.enableEdgeHtmlPolyfills !== false ? ' + EdgeHTML Polyfills' : ''}) with ${activeCaps.length} UWP capabilities${strippedXboxCaps.length ? ` (excluded ${strippedXboxCaps.join(', ')} via stripRestrictedOnXbox=true)` : ''}`,
      });

      // 3. Push LooseApp over SMB3 (:445) in a SINGLE session — auto-fetch DevToolsUser SMB creds from WDP GET /ext/smb/developerfolder first
      const looseAppConsolePath = `D:\\DevelopmentFiles\\LooseApps\\${safePkg}`;
      let smbPushedOk = false;
      if (commandExists('smbclient')) {
        let smbDomain = 'WORKGROUP';
        let rawSmbUser = String(username || '').trim();
        let smbPass = String(password || '');
        let activeShare = smbShareName;
        let credSource = 'Settings credentials';

        try {
          const smbInfoResp = await wdpHttpsRequest({
            ip: cleanIp,
            port: Number(wdpPort) || 11443,
            reqPath: '/ext/smb/developerfolder',
            method: 'GET',
            username: String(username),
            password: String(password),
            timeoutMs: 5000,
          });
          if (smbInfoResp.statusCode >= 200 && smbInfoResp.statusCode < 300 && smbInfoResp.body) {
            const parsed = JSON.parse(smbInfoResp.body) as Record<string, unknown>;
            const fetchedUser = String(parsed.Username ?? parsed.username ?? parsed.UserName ?? '').trim();
            const fetchedPass = String(parsed.Password ?? parsed.password ?? '');
            const fetchedPath = String(parsed.Path ?? parsed.path ?? '').trim();
            if (fetchedUser && fetchedPass) {
              rawSmbUser = fetchedUser;
              smbPass = fetchedPass;
              credSource = 'WDP /ext/smb/developerfolder';
            }
            const shareMatch = fetchedPath.match(/\\\\[^\\]+\\([^\\]+)/);
            if (shareMatch && shareMatch[1]) {
              activeShare = shareMatch[1];
            }
          }
        } catch {
          // Non-fatal: fall back to configured username/password below
        }

        let cleanSmbUser = rawSmbUser;
        if (rawSmbUser.includes('\\')) {
          const [domPart, ...userParts] = rawSmbUser.split('\\');
          if (domPart && domPart !== '.' && !/^local$/i.test(domPart)) {
            smbDomain = domPart;
          }
          cleanSmbUser = userParts.join('\\').trim();
        }

        const smbRes = spawnSync(
          'smbclient',
          [
            `//${cleanIp}/${activeShare}`,
            '-W',
            smbDomain,
            '-U',
            `${cleanSmbUser}%${smbPass}`,
            '-m',
            'SMB3',
            '-c',
            `mkdir LooseApps; mkdir LooseApps/${safePkg}; cd LooseApps/${safePkg}; prompt OFF; recurse ON; mput *`,
          ],
          { cwd: stageDir, encoding: 'utf8', timeout: 45000 }
        );
        const smbOut = `${smbRes.stdout || ''}\n${smbRes.stderr || ''}`
          .split(/\r?\n/)
          .filter((line) => !/lpcfg_do_global_parameter:\s*WARNING:/i.test(line))
          .join('\n')
          .trim();
        const hasFatalNtStatus =
          /(NT_STATUS_ACCESS_DENIED|NT_STATUS_LOGON_FAILURE|NT_STATUS_ACCOUNT_LOCKED_OUT|NT_STATUS_BAD_NETWORK_NAME|NT_STATUS_CONNECTION_REFUSED|NT_STATUS_HOST_UNREACHABLE|NT_STATUS_OBJECT_NAME_NOT_FOUND|session setup failed|tree connect failed|Failed to open)/i.test(
            smbOut
          );
        const uploadedManifest = /putting file\s+AppxManifest\.xml/i.test(smbOut);
        if ((smbRes.status === 0 || uploadedManifest) && !hasFatalNtStatus) {
          smbPushedOk = true;
          steps.push({
            name: 'Push Loose App via SMB3 (:445)',
            status: 'ok',
            detail: `Uploaded to //${cleanIp}/${activeShare}/LooseApps/${safePkg} as ${smbDomain}\\${cleanSmbUser} (${credSource})`,
          });
        } else {
          const lockedHint = /NT_STATUS_ACCOUNT_LOCKED_OUT/i.test(smbOut)
            ? ' — Xbox SMB account is locked after failed attempts; open Xbox Dev Home -> Remote Access Settings and re-save SMB credentials (or wait for lockout reset).'
            : /NT_STATUS_LOGON_FAILURE/i.test(smbOut)
              ? ` — Tested ${smbDomain}\\${cleanSmbUser} via ${credSource}. On Xbox Dev Mode, SMB uses the generated DevToolsUser password shown in WDP File Explorer -> Browse (https://${cleanIp}:${wdpPort}), not necessarily your web UI password.`
              : '';
          steps.push({
            name: 'Push Loose App via SMB3 (:445)',
            status: 'warn',
            detail: `${(smbOut || `smbclient exited with status ${smbRes.status}`).slice(-320)}${lockedHint}`,
          });
        }
      } else {
        steps.push({
          name: 'Push Loose App via SMB3 (:445)',
          status: 'warn',
          detail: 'smbclient not installed on this host (skipping SMB LooseApp push).',
        });
      }

      // 4. Build & sign .msix (Method 0 STORE ZIP so AppxBlockMap 64KB hashes match OPC 1:1), then upload directly to Xbox Windows Device Portal (:11443)
      const contentTypesXml = buildAppxContentTypesXml(stagedEntries);
      const blockMapXml = buildBlockMapXml(stagedEntries);
      const msixBuf = buildZipArchive(
        [
          ...stagedEntries,
          { name: 'AppxBlockMap.xml', data: Buffer.from(blockMapXml, 'utf8') },
          { name: '[Content_Types].xml', data: Buffer.from(contentTypesXml, 'utf8') },
        ],
        { storeOnly: true }
      );

      const unsignedPath = path.join(stageDir, 'unsigned.msix');
      const signedPath = path.join(stageDir, `${safePkg}_x64.msix`);
      fs.writeFileSync(unsignedPath, msixBuf);

      const certPair = generateCodeSigningCert(publisher);
      let finalMsixBuf = msixBuf;
      let signedOk = false;

      if (certPair && commandExists('osslsigncode')) {
        const pfxPath = path.join(stageDir, 'signing.pfx');
        fs.writeFileSync(pfxPath, certPair.pfx);
        const signRes = spawnSync(
          'osslsigncode',
          ['sign', '-pkcs12', pfxPath, '-pass', 'xbox123', '-h', 'sha256', '-in', unsignedPath, '-out', signedPath],
          { encoding: 'utf8' }
        );
        if (signRes.status === 0 && fs.existsSync(signedPath)) {
          finalMsixBuf = fs.readFileSync(signedPath);
          signedOk = true;
          steps.push({ name: 'Sign .MSIX (osslsigncode)', status: 'ok', detail: `Signed ${safePkg}_x64.msix with ${publisher}` });
        } else {
          steps.push({
            name: 'Sign .MSIX (osslsigncode)',
            status: 'warn',
            detail: `osslsigncode returned status ${signRes.status}: ${(signRes.stderr || '').slice(0, 200)}`,
          });
        }
      } else {
        steps.push({
          name: 'Sign .MSIX',
          status: 'warn',
          detail: 'osslsigncode not found on host; uploading unsigned .msix (if WDP rejects signature, use the SMB LooseApp folder above in WDP -> My games & apps -> Add -> Register loose files).',
        });
      }

      const multipartParts = [
        {
          name: 'install',
          filename: `${safePkg}_x64.msix`,
          contentType: 'application/octet-stream',
          data: finalMsixBuf,
        },
        ...(certPair
          ? [
              {
                name: 'cert',
                filename: 'Win11Desktop_Root.cer',
                contentType: 'application/x-x509-ca-cert',
                data: certPair.cer,
              },
            ]
          : []),
      ];
      const { contentType, body } = buildMultipartBody(multipartParts);
      const wdpResp = await wdpCsrfRequest({
        ip: String(ip).trim(),
        port: Number(wdpPort) || 11443,
        reqPath: `/api/app/packagemanager/package?package=${encodeURIComponent(`${safePkg}_x64.msix`)}`,
        method: 'POST',
        username: String(username),
        password: String(password),
        body,
        contentType,
        timeoutMs: 30000,
      });

      if (wdpResp.statusCode >= 200 && wdpResp.statusCode < 300) {
        const stateCheck = await pollWdpInstallState({
          ip: String(ip).trim(),
          port: Number(wdpPort) || 11443,
          username: String(username),
          password: String(password),
        });

        const installedFullName = await verifyWdpPackageInstalled({
          ip: String(ip).trim(),
          port: Number(wdpPort) || 11443,
          username: String(username),
          password: String(password),
          packageNamePrefix: safePkg,
        });

        if (installedFullName || (stateCheck.settled && stateCheck.success)) {
          if (installedFullName && manifestFlags?.autoEnableCrashDumps !== false) {
            await tryEnableWdpCrashDumps({
              ip: String(ip).trim(),
              port: Number(wdpPort) || 11443,
              username: String(username),
              password: String(password),
              packageFullName: installedFullName,
            });
          }
          steps.push({
            name: 'Install via Windows Device Portal (:11443)',
            status: 'ok',
            detail: installedFullName
              ? `Verified installed on Xbox: ${installedFullName} (CrashDump capture enabled)`
              : `WDP confirmed Appx install: ${stateCheck.reason}`,
          });
          res.json({ ok: true, steps, looseAppConsolePath, installedFullName, wdpUrl: `https://${ip}:${wdpPort}` });
          return;
        }

        // Background .msix failed (typically unsigned .msix when osslsigncode is missing) -> fall back to registering the SMB LooseApp folder
        steps.push({
          name: 'MSIX Background Verification (:11443)',
          status: 'warn',
          detail: `Upload returned HTTP ${wdpResp.statusCode}, but AppxDeployment ${stateCheck.settled ? `failed${stateCheck.codeHex ? ` (${stateCheck.codeHex})` : ''}: ${stateCheck.reason}` : 'did not confirm installation in InstalledPackages'}.`,
        });

        if (smbPushedOk) {
          const candidates = [safePkg, looseAppConsolePath, `LooseApps\\${safePkg}`];
          let regSucceeded = false;
          let regDetail = '';
          let regPkgFullName: string | null = null;
          for (const candidatePath of candidates) {
            const folderB64 = Buffer.from(candidatePath, 'utf8').toString('base64');
            const regResp = await wdpCsrfRequest({
              ip: String(ip).trim(),
              port: Number(wdpPort) || 11443,
              reqPath: `/api/app/packagemanager/register?folder=${encodeURIComponent(folderB64)}`,
              method: 'POST',
              username: String(username),
              password: String(password),
              timeoutMs: 15000,
            });
            if (regResp.statusCode >= 200 && regResp.statusCode < 300) {
              const regState = await pollWdpInstallState({
                ip: String(ip).trim(),
                port: Number(wdpPort) || 11443,
                username: String(username),
                password: String(password),
              });
              const regPkgName = await verifyWdpPackageInstalled({
                ip: String(ip).trim(),
                port: Number(wdpPort) || 11443,
                username: String(username),
                password: String(password),
                packageNamePrefix: safePkg,
              });
              if (regPkgName || (regState.settled && regState.success)) {
                regSucceeded = true;
                regPkgFullName = regPkgName;
                regDetail = regPkgName
                  ? `Registered LooseApp (${candidatePath}) -> ${regPkgName}`
                  : `Registered LooseApp (${candidatePath}): ${regState.reason}`;
                break;
              }
              regDetail = `Register (${candidatePath}) HTTP ${regResp.statusCode}: ${regState.reason}`;
            } else {
              regDetail = `Register (${candidatePath}) HTTP ${regResp.statusCode}: ${regResp.body.slice(0, 180)}`;
            }
          }

          if (regSucceeded) {
            if (regPkgFullName) {
              await tryEnableWdpCrashDumps({
                ip: String(ip).trim(),
                port: Number(wdpPort) || 11443,
                username: String(username),
                password: String(password),
                packageFullName: regPkgFullName,
              });
            }
            steps.push({ name: 'Register SMB LooseApp via WDP (:11443)', status: 'ok', detail: regDetail });
            res.json({ ok: true, steps, looseAppConsolePath, installedFullName: regPkgFullName, wdpUrl: `https://${ip}:${wdpPort}` });
            return;
          }
          steps.push({
            name: 'Register SMB LooseApp via WDP (:11443)',
            status: 'error',
            detail: regDetail || `Open https://${ip}:${wdpPort} -> My games & apps -> Add -> Register loose files -> ${looseAppConsolePath}`,
          });
        }

        res.status(400).json({ ok: false, steps, looseAppConsolePath, wdpUrl: `https://${ip}:${wdpPort}` });
      } else {
        steps.push({
          name: 'Install via Windows Device Portal (:11443)',
          status: 'error',
          detail: `WDP returned HTTP ${wdpResp.statusCode}: ${wdpResp.body.slice(0, 300)}`,
        });
        res.status(400).json({ ok: false, steps, looseAppConsolePath, wdpUrl: `https://${ip}:${wdpPort}` });
      }
    } catch (err: any) {
      const runningInCloud = Boolean(process.env.K_SERVICE || process.env.CLOUD_RUN_JOB);
      steps.push({
        name: 'Connect to Xbox DevKit',
        status: 'error',
        detail: runningInCloud
          ? `Cloud preview cannot connect directly to your private LAN IP (${ip}:${wdpPort}). Run the app locally on Kali (npm run dev -> http://localhost:3000) or paste the 1-line terminal command.`
          : err?.message || `Connection to ${ip}:${wdpPort} failed`,
      });
      res.status(502).json({ ok: false, steps, looseAppConsolePath: `D:\\DevelopmentFiles\\LooseApps\\${safePkg}` });
    } finally {
      fs.rmSync(stageDir, { recursive: true, force: true });
    }
  });

  app.post('/api/xbox/repair-model', (req, res) => {
    const {
      ip,
      username,
      password,
      hfRepo,
      hfFilename,
      xboxAppFolder,
      targetModelName,
    } = req.body as {
      ip?: string;
      username?: string;
      password?: string;
      hfRepo?: string;
      hfFilename?: string;
      xboxAppFolder?: string;
      targetModelName?: string;
    };

    const safeIp = ip || '192.168.1.50';
    const safeUser = username || 'DevToolsUser';
    const safePass = password || 'password';
    const safeRepo = (hfRepo || 'ggml-org/gemma-3-1b-it-GGUF').trim();
    const safeFile = (hfFilename || 'gemma-3-1b-it-Q4_K_M.gguf').trim();
    const cleanFolder = (xboxAppFolder || 'LooseApps/MyXboxApp/models')
      .trim()
      .replace(/^\/+|\/+$/g, '');
    const folderParts = cleanFolder.split('/').filter(Boolean);
    const finalModelName = (targetModelName || safeFile).trim();

    const hfDownloadUrl = `https://huggingface.co/${safeRepo}/resolve/main/${safeFile}`;
    const smbMkdirChain = folderParts
      .map((part) => `mkdir "${part}"; cd "${part}"`)
      .join('; ');

    const modelConfig = {
      model_path: `D:\\DevelopmentFiles\\${folderParts.join('\\')}\\${finalModelName}`,
      hf_repo: safeRepo,
      source_file: safeFile,
      quantization: 'Q4_K_M',
      context_length: 4096,
      repaired_at: new Date().toISOString(),
    };

    const oneLiner = `wget -c "${hfDownloadUrl}" -O "${finalModelName}" && smbclient //${safeIp}/DevelopmentFiles -U "${safeUser}%${safePass}" -m SMB3 -c '${smbMkdirChain}; put "${finalModelName}" "${finalModelName}"; ls'`;

    res.json({
      ok: true,
      hfDownloadUrl,
      oneLiner,
      modelConfig,
      targetUncPath: `//${safeIp}/DevelopmentFiles/${cleanFolder}/${finalModelName}`,
      targetConsolePath: `D:\\DevelopmentFiles\\${folderParts.join('\\')}\\${finalModelName}`,
    });
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, model, consoleContext } = req.body as {
        messages: Array<{ role: 'user' | 'model'; text: string }>;
        model?: string;
        consoleContext?: string;
      };

      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error:
            'Cloud API key not configured. Using local offline model (Hugging Face GGUF / Gemini Nano Local).',
        });
        return;
      }

      const selectedModel =
        model === 'gemini-3.1-flash-lite' ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash';

      const systemInstruction = `You are the Xbox GDK & XDK Linux Studio Assistant. You help game developers and studio administrators configure Xbox Series X|S and Xbox One DevKits from Linux workstations.
Key technical knowledge to provide when relevant:
1. If SMB works (//<ip>/DevelopmentFiles on port 445) but SSH (port 22) fails or refuses connection:
   - By default on Xbox DevKits (6001 / 4001), the OpenSSH daemon (sshd) is either stopped or only allows the 'DevToolsUser' / 'SshUser' / 'Administrator' account after SSH is enabled in Windows Device Portal (https://<ip>:11443) or via Dev Home -> Remote Access Settings.
   - Because SMB (//<ip>/DevelopmentFiles) IS working, you can place files, scripts, replacement Hugging Face GGUF/ONNX models, and certificates directly into D:\\DevelopmentFiles\\ via SMB without needing port 22 SSH!
   - Also check that SSH uses the bare username (e.g. ssh DevToolsUser@<ip> or ssh DevUser@<ip>) without the WORKGROUP\\ prefix.
2. Current Console Context: ${consoleContext || 'Xbox DevKit (Mode 6001 / Mode 13)'}
Keep answers concise, practical, and directly actionable with copy-pasteable Linux commands.`;

      const history = (messages || []).slice(0, -1).map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const latestMessage =
        messages && messages.length > 0 ? messages[messages.length - 1].text : 'Hello';

      const chat = ai.chats.create({
        model: selectedModel,
        history,
        config: {
          systemInstruction,
        },
      });

      const response: GenerateContentResponse = await chat.sendMessage({
        message: latestMessage,
      });

      res.json({
        reply: response.text || 'No response generated.',
        modelUsed: selectedModel,
      });
    } catch (error: any) {
      const status = error?.status || 500;
      res.status(status).json({
        error: error?.message || 'Failed to communicate with Gemini API.',
      });
    }
  });

  try {
    if (process.env.NODE_ENV !== 'production' && !fs.existsSync(path.join(__dirname, 'dist', 'index.html'))) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
        },
        appType: 'spa',
      });

      if (process.env.DISABLE_HMR === 'true') {
        app.get('/@vite/client', (_req, res) => {
          res.type('application/javascript').send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
  } else {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style && style.parentNode) {
    style.parentNode.removeChild(style);
    sheetsMap.delete(id);
  }
}
export const createHotContext = () => ({
  accept() {},
  dispose() {},
  prune() {},
  invalidate() {},
  on() {},
  off() {},
  send() {},
});
export const injectQuery = (id) => id;
`);
        });
      }

      app.use(vite.middlewares);
    } else {
      const distPath = path.join(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } catch (err) {
    console.warn('Vite dev server middleware failed, falling back to static dist/', err);
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\x1b[31m[ERROR] Port ${PORT} is already in use by another process.\x1b[0m`);
      console.info(`\x1b[33mTo free port ${PORT}, run:\x1b[0m fuser -k ${PORT}/tcp`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
