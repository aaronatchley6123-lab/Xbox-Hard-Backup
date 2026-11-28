import React, { useState, useRef } from 'react';
import {
  FileCode,
  Check,
  Copy,
  Monitor,
  Terminal,
  Folder,
  Cpu,
  ShieldCheck,
  Package,
  Download,
  Upload,
  KeyRound,
  X,
  Rocket,
  Wifi,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Win11AppId, Win11SystemConfig } from '../../types/win11';
import { DEPLOYMENT_REPORT_MARKDOWN } from '../../services/win11State';

interface DeploymentReportAppProps {
  config: Win11SystemConfig;
  onUpdateConfig: (patch: Partial<Win11SystemConfig>) => void;
  onOpenWindow: (appId: Win11AppId) => void;
}

const DEFAULT_CPP_SHELL_SOURCE = `// ============================================================================
// Main.cpp — Pure OneCore UWP Host (WRL CoreApplication + D3D11 + DXGI)
// Target: Xbox Series X (Windows.Xbox >= 10.0.19041.0, x64 /APPCONTAINER)
// Compiles cleanly with BOTH:
//   - Linux (clang-cl + lld-link + xwin, ZERO Windows PC files required)
//   - Windows (MSVC cl.exe /APPCONTAINER windowsapp.lib d3d11.lib dxgi.lib)
// ============================================================================
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#include <roapi.h>
#include <wrl.h>
#include <wrl/wrappers/corewrappers.h>
#include <windows.applicationmodel.core.h>
#include <windows.applicationmodel.activation.h>
#include <windows.ui.core.h>
#include <windows.foundation.h>
#include <d3d11_1.h>
#include <dxgi1_2.h>
#include <math.h>

using namespace Microsoft::WRL;
using namespace Microsoft::WRL::Wrappers;
using namespace ABI::Windows::ApplicationModel::Core;
using namespace ABI::Windows::ApplicationModel::Activation;
using namespace ABI::Windows::UI::Core;
using namespace ABI::Windows::Foundation;

class XboxOneCoreView : public RuntimeClass<RuntimeClassFlags<WinRt>, IFrameworkView> {
    ComPtr<ICoreWindow> m_window;
    ComPtr<ID3D11Device> m_device;
    ComPtr<ID3D11DeviceContext> m_context;
    ComPtr<IDXGISwapChain1> m_swapChain;
    ComPtr<ID3D11RenderTargetView> m_rtv;
    EventRegistrationToken m_activatedToken = {};
    EventRegistrationToken m_closedToken = {};
    bool m_windowClosed = false;
    UINT m_width = 1920;
    UINT m_height = 1080;

    void InitD3D() {
        if (!m_window || m_swapChain) return;

        D3D_FEATURE_LEVEL levels[] = {
            D3D_FEATURE_LEVEL_11_1,
            D3D_FEATURE_LEVEL_11_0,
            D3D_FEATURE_LEVEL_10_1,
            D3D_FEATURE_LEVEL_10_0
        };
        UINT flags = D3D11_CREATE_DEVICE_BGRA_SUPPORT;
        HRESULT hr = D3D11CreateDevice(
            nullptr, D3D_DRIVER_TYPE_HARDWARE, nullptr,
            flags, levels, ARRAYSIZE(levels), D3D11_SDK_VERSION,
            &m_device, nullptr, &m_context
        );
        if (FAILED(hr)) {
            hr = D3D11CreateDevice(
                nullptr, D3D_DRIVER_TYPE_WARP, nullptr,
                flags, levels, ARRAYSIZE(levels), D3D11_SDK_VERSION,
                &m_device, nullptr, &m_context
            );
        }
        if (FAILED(hr) || !m_device) return;

        ComPtr<IDXGIDevice1> dxgiDevice;
        if (FAILED(m_device.As(&dxgiDevice)) || !dxgiDevice) return;
        dxgiDevice->SetMaximumFrameLatency(1);

        ComPtr<IDXGIAdapter> adapter;
        if (FAILED(dxgiDevice->GetAdapter(&adapter)) || !adapter) return;

        ComPtr<IDXGIFactory2> factory;
        if (FAILED(adapter->GetParent(IID_PPV_ARGS(&factory))) || !factory) return;

        // Width = 0, Height = 0 automatically matches CoreWindow bounds on Xbox OneCore
        DXGI_SWAP_CHAIN_DESC1 scDesc = {};
        scDesc.Width = 0;
        scDesc.Height = 0;
        scDesc.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
        scDesc.Stereo = FALSE;
        scDesc.SampleDesc.Count = 1;
        scDesc.SampleDesc.Quality = 0;
        scDesc.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT;
        scDesc.BufferCount = 2;
        scDesc.SwapEffect = DXGI_SWAP_EFFECT_FLIP_SEQUENTIAL;
        scDesc.Scaling = DXGI_SCALING_STRETCH;
        scDesc.AlphaMode = DXGI_ALPHA_MODE_IGNORE;

        hr = factory->CreateSwapChainForCoreWindow(
            m_device.Get(),
            reinterpret_cast<IUnknown*>(m_window.Get()),
            &scDesc, nullptr, &m_swapChain
        );
        if (FAILED(hr)) {
            scDesc.Width = 1920;
            scDesc.Height = 1080;
            hr = factory->CreateSwapChainForCoreWindow(
                m_device.Get(),
                reinterpret_cast<IUnknown*>(m_window.Get()),
                &scDesc, nullptr, &m_swapChain
            );
        }
        if (FAILED(hr) || !m_swapChain) return;

        DXGI_SWAP_CHAIN_DESC1 actualDesc = {};
        if (SUCCEEDED(m_swapChain->GetDesc1(&actualDesc))) {
            if (actualDesc.Width > 0) m_width = actualDesc.Width;
            if (actualDesc.Height > 0) m_height = actualDesc.Height;
        }

        ComPtr<ID3D11Texture2D> backBuffer;
        if (SUCCEEDED(m_swapChain->GetBuffer(0, IID_PPV_ARGS(&backBuffer))) && backBuffer) {
            m_device->CreateRenderTargetView(backBuffer.Get(), nullptr, &m_rtv);
        }
    }

public:
    HRESULT STDMETHODCALLTYPE Initialize(ICoreApplicationView* applicationView) override {
        if (applicationView) {
            typedef ITypedEventHandler<CoreApplicationView*, IActivatedEventArgs*> ActivatedHandler;
            auto callback = Callback<ActivatedHandler>(
                [this](ICoreApplicationView*, IActivatedEventArgs*) -> HRESULT {
                    if (m_window) {
                        m_window->Activate();
                    }
                    return S_OK;
                }
            );
            applicationView->add_Activated(callback.Get(), &m_activatedToken);
        }
        return S_OK;
    }

    HRESULT STDMETHODCALLTYPE SetWindow(ICoreWindow* window) override {
        m_window = window;
        if (m_window) {
            typedef ITypedEventHandler<CoreWindow*, CoreWindowEventArgs*> ClosedHandler;
            auto closedCb = Callback<ClosedHandler>(
                [this](ICoreWindow*, ICoreWindowEventArgs*) -> HRESULT {
                    m_windowClosed = true;
                    return S_OK;
                }
            );
            m_window->add_Closed(closedCb.Get(), &m_closedToken);
        }
        InitD3D();
        return S_OK;
    }

    HRESULT STDMETHODCALLTYPE Load(HSTRING) override {
        return S_OK;
    }

    HRESULT STDMETHODCALLTYPE Run() override {
        if (!m_window) return E_FAIL;
        m_window->Activate();

        ComPtr<ICoreDispatcher> dispatcher;
        m_window->get_Dispatcher(&dispatcher);

        float frameTick = 0.0f;
        while (!m_windowClosed) {
            if (dispatcher) {
                dispatcher->ProcessEvents(CoreProcessEventsOption_ProcessAllIfPresent);
            }
            if (!m_swapChain) {
                InitD3D();
            }
            if (m_context && m_rtv && m_swapChain) {
                // FLIP_SEQUENTIAL unbinds RTV after every Present() — rebind every frame
                ID3D11RenderTargetView* const targets[1] = { m_rtv.Get() };
                m_context->OMSetRenderTargets(1, targets, nullptr);

                D3D11_VIEWPORT vp = { 0.0f, 0.0f, static_cast<float>(m_width), static_cast<float>(m_height), 0.0f, 1.0f };
                m_context->RSSetViewports(1, &vp);

                frameTick += 0.015f;
                const float pulse = 0.03f + 0.015f * sinf(frameTick);
                const float clearColor[4] = { pulse, 0.07f + pulse * 0.5f, 0.16f + pulse, 1.0f };
                m_context->ClearRenderTargetView(m_rtv.Get(), clearColor);

                HRESULT hr = m_swapChain->Present(1, 0);
                if (hr == DXGI_ERROR_DEVICE_REMOVED || hr == DXGI_ERROR_DEVICE_RESET) {
                    m_rtv.Reset();
                    m_swapChain.Reset();
                    m_context.Reset();
                    m_device.Reset();
                }
            } else {
                Sleep(16);
            }
        }
        return S_OK;
    }

    HRESULT STDMETHODCALLTYPE Uninitialize() override {
        m_rtv.Reset();
        m_swapChain.Reset();
        m_context.Reset();
        m_device.Reset();
        m_window.Reset();
        return S_OK;
    }
};

class XboxViewSource : public RuntimeClass<RuntimeClassFlags<WinRt>, IFrameworkViewSource> {
public:
    HRESULT STDMETHODCALLTYPE CreateView(IFrameworkView** viewProvider) override {
        return Make<XboxOneCoreView>().CopyTo(viewProvider);
    }
};

int __stdcall wWinMain(HINSTANCE, HINSTANCE, PWSTR, int) {
    RoInitialize(RO_INIT_MULTITHREADED);
    {
        ComPtr<ICoreApplication> coreApp;
        HRESULT hr = GetActivationFactory(
            HStringReference(RuntimeClass_Windows_ApplicationModel_Core_CoreApplication).Get(),
            &coreApp
        );
        if (SUCCEEDED(hr) && coreApp) {
            coreApp->Run(Make<XboxViewSource>().Get());
        }
    }
    RoUninitialize();
    return 0;
}
`;

export const DeploymentReportApp: React.FC<DeploymentReportAppProps> = ({
  config,
  onUpdateConfig,
  onOpenWindow,
}) => {
  const [activeTab, setActiveTab] = useState<'msix' | 'cpp' | 'manifest' | 'linuxsh' | 'report'>('msix');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uwpMode, setUwpMode] = useState<'html-uwp' | 'native-cpp'>('html-uwp');
  const [isDownloadingMsix, setIsDownloadingMsix] = useState(false);
  const [isDownloadingKit, setIsDownloadingKit] = useState(false);
  const [isDownloadingCert, setIsDownloadingCert] = useState(false);
  const [isTestingXdk, setIsTestingXdk] = useState(false);
  const [isDeployingXdk, setIsDeployingXdk] = useState(false);
  const [xdkTestResult, setXdkTestResult] = useState<{
    ok: boolean;
    message: string;
    runningInCloud?: boolean;
  } | null>(null);
  const [deployResult, setDeployResult] = useState<{
    ok: boolean;
    runningInCloud?: boolean;
    looseAppConsolePath?: string;
    wdpUrl?: string;
    steps: Array<{ name: string; status: 'ok' | 'warn' | 'error'; detail: string }>;
  } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [compiledExe, setCompiledExe] = useState<{
    name: string;
    sizeKb: number;
    base64: string;
  } | null>(null);
  const exeUploadRef = useRef<HTMLInputElement>(null);

  const [packageName, setPackageName] = useState('XboxWin11NativeDesktop');
  const [publisher, setPublisher] = useState('CN=XboxDevStudio');
  const [version, setVersion] = useState('11.24.26100.0');
  const [cppSource, setCppSource] = useState(DEFAULT_CPP_SHELL_SOURCE);
  const [brainPath, setBrainPath] = useState(
    '/home/nitrokali/.gemini/antigravity-cli/brain/dd55b21d-c3d7-4cb6-8d3c-7d872aa4690c'
  );

  const hfUrl = `https://huggingface.co/${config.customHfRepo.trim()}/resolve/main/${config.customHfFilename.trim()}`;
  const mobileHfUrl =
    'https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf';

  const appxManifestXml = `<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
         IgnorableNamespaces="uap">
  <Identity Name="${packageName}"
            Publisher="${publisher}"
            Version="${version}"
            ProcessorArchitecture="x64" />
  <Properties>
    <DisplayName>Windows 11 Native Desktop OS (Xbox Series X)</DisplayName>
    <PublisherDisplayName>Xbox Series X DevKit Studio</PublisherDisplayName>
    <Logo>Assets\\StoreLogo.png</Logo>
  </Properties>
  <!-- Xbox Series X (Scarlett) requires OneCore Windows.Xbox >= 10.0.19041.0 -->
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Xbox" MinVersion="10.0.19041.0" MaxVersionTested="10.0.26100.0" />
    <TargetDeviceFamily Name="Windows.Universal" MinVersion="10.0.19041.0" MaxVersionTested="10.0.26100.0" />
  </Dependencies>
  <Resources>
    <Resource Language="en-us" />
  </Resources>
  <Applications>
${
  uwpMode === 'html-uwp'
    ? `    <!-- Zero-Compile OneCore HTML5/UWP EntryPoint (No C++ / No xwin needed) -->
    <Application Id="Win11DesktopShell"
                 StartPage="www/index.html">
      <uap:VisualElements DisplayName="Windows 11 Native Desktop"
                          Square150x150Logo="Assets\\Logo.png"
                          Square44x44Logo="Assets\\SmallLogo.png"
                          Description="Xbox Series X OneCore Desktop Shell with Hermes Offline Local AI Copilot"
                          BackgroundColor="#0a1329">
        <uap:DefaultTile Wide310x150Logo="Assets\\Wide310x150Logo.png">
          <uap:ShowNameOnTiles>
            <uap:ShowOn Tile="square150x150Logo" />
            <uap:ShowOn Tile="wide310x150Logo" />
          </uap:ShowNameOnTiles>
        </uap:DefaultTile>
        <uap:SplashScreen Image="Assets\\SplashScreen.png" BackgroundColor="#0a1329" />
      </uap:VisualElements>
    </Application>`
    : `    <!-- Native C++ WRL + Direct3D 11 OneCore UWP EntryPoint -->
    <Application Id="Win11DesktopShell"
                 Executable="Win11DesktopShell.exe"
                 EntryPoint="Win11DesktopShell.App">
      <uap:VisualElements DisplayName="Windows 11 Native Desktop"
                          Square150x150Logo="Assets\\Logo.png"
                          Square44x44Logo="Assets\\SmallLogo.png"
                          Description="Xbox Series X OneCore Desktop Shell with Hermes Offline Local AI Copilot"
                          BackgroundColor="#0a1329">
        <uap:DefaultTile Wide310x150Logo="Assets\\Wide310x150Logo.png">
          <uap:ShowNameOnTiles>
            <uap:ShowOn Tile="square150x150Logo" />
            <uap:ShowOn Tile="wide310x150Logo" />
          </uap:ShowNameOnTiles>
        </uap:DefaultTile>
        <uap:SplashScreen Image="Assets\\SplashScreen.png" BackgroundColor="#0a1329" />
      </uap:VisualElements>
    </Application>`
}
  </Applications>
  <Capabilities>
    <Capability Name="internetClient" />
    <Capability Name="privateNetworkClientServer" />
  </Capabilities>
</Package>`;

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleAttachExe = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const bytes = new Uint8Array(reader.result as ArrayBuffer);
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      setCompiledExe({
        name: file.name,
        sizeKb: Math.round(file.size / 1024),
        base64: btoa(binary),
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadCert = async () => {
    setIsDownloadingCert(true);
    setDownloadError(null);
    try {
      const res = await fetch('/api/msix/cert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName, publisher }),
      });
      if (!res.ok) throw new Error('Failed to generate X.509 signing certificate');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${packageName}_SigningCert.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setDownloadError(err?.message || 'Failed to generate signing cert');
    } finally {
      setIsDownloadingCert(false);
    }
  };

  const handleTestXdkConnection = async () => {
    setIsTestingXdk(true);
    setXdkTestResult(null);
    try {
      const res = await fetch('/api/xbox/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: config.consoleIp,
          wdpPort: config.wdpPort,
          username: config.smbUser,
          password: config.smbPassword,
        }),
      });
      const data = await res.json();
      setXdkTestResult({
        ok: Boolean(data.ok),
        runningInCloud: Boolean(data.runningInCloud),
        message: data.ok
          ? `Connected to Xbox WDP (HTTP ${data.statusCode}). Ready for 1-Click Deploy!`
          : data.error || `Cannot reach https://${config.consoleIp}:${config.wdpPort}`,
      });
    } catch (err: any) {
      setXdkTestResult({ ok: false, message: err?.message || 'Connection test failed' });
    } finally {
      setIsTestingXdk(false);
    }
  };

  const handleDeployDirectlyToXdk = async () => {
    setIsDeployingXdk(true);
    setDeployResult(null);
    setDownloadError(null);
    try {
      const res = await fetch('/api/xbox/deploy-xdk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: config.consoleIp,
          wdpPort: config.wdpPort,
          username: config.smbUser,
          password: config.smbPassword,
          smbShareName: config.smbShareName,
          packageName,
          publisher,
          version,
          uwpMode,
          cppSource,
          compiledExeBase64: compiledExe?.base64 || '',
        }),
      });
      const data = await res.json();
      setDeployResult({
        ok: Boolean(data.ok),
        runningInCloud: Boolean(data.runningInCloud),
        looseAppConsolePath: data.looseAppConsolePath,
        wdpUrl: data.wdpUrl,
        steps: Array.isArray(data.steps) ? data.steps : [],
      });
    } catch (err: any) {
      setDeployResult({
        ok: false,
        steps: [{ name: 'Deploy Request', status: 'error', detail: err?.message || 'Deploy failed' }],
      });
    } finally {
      setIsDeployingXdk(false);
    }
  };

  const handleDirectDownloadMsix = async () => {
    setIsDownloadingMsix(true);
    setDownloadError(null);
    try {
      const res = await fetch('/api/msix/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName,
          publisher,
          version,
          hfRepo: config.customHfRepo,
          hfFilename: config.customHfFilename,
          cppSource,
          compiledExeBase64: compiledExe?.base64 || '',
          uwpMode,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate Series X MSIX package');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${packageName}_x64.msix`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setDownloadError(err?.message || 'Failed to build .msix package');
    } finally {
      setIsDownloadingMsix(false);
    }
  };

  const handleDownloadXdkKit = async () => {
    setIsDownloadingKit(true);
    setDownloadError(null);
    try {
      const gameConfigXml = `<?xml version="1.0" encoding="utf-8"?>
<Game configVersion="1">
  <Identity Name="${packageName}"
            Publisher="${publisher}"
            Version="${version}" />
  <ExecutableList>
    <Executable Name="Win11DesktopShell.exe"
                Id="Win11DesktopShell"
                TargetDeviceFamily="Scarlett" />
  </ExecutableList>
  <ShellVisuals DefaultDisplayName="Windows 11 Native Desktop"
                PublisherDisplayName="Xbox Series X DevKit Studio"
                StoreLogo="Assets\\StoreLogo.png"
                Square150x150Logo="Assets\\Logo.png"
                Square44x44Logo="Assets\\SmallLogo.png"
                Square480x480Logo="Assets\\Square480x480Logo.png"
                SplashScreenImage="Assets\\SplashScreen1920x1080.png"
                Description="Xbox Series X OneCore Desktop Shell" />
</Game>`;

      const windowsBuildScript = [
        `# ============================================================================`,
        `# Xbox Series X (Scarlett) OneCore UWP Build, Sign & WDP Deploy Script`,
        `# Auto-discovers Visual Studio x64 tools + Windows 10/11 SDK MakeAppx & SignTool`,
        `# ============================================================================`,
        `param(`,
        `    [string]$XboxIp = "${config.consoleIp}",`,
        `    [int]$WdpPort = ${config.wdpPort},`,
        `    [string]$WdpUser = "${config.smbUser}",`,
        `    [string]$WdpPass = "${config.smbPassword}",`,
        `    [switch]$DeployToXbox`,
        `)`,
        ``,
        `$ErrorActionPreference = "Stop"`,
        `$PkgName = "${packageName}"`,
        `$OutMsix = "$PkgName" + "_x64.msix"`,
        `$CertCer = "Cert\\Win11Desktop_Signing.cer"`,
        `$CertPfx = "Cert\\Win11Desktop_Signing.pfx"`,
        ``,
        `# 1. Import Visual Studio x64 environment if cl.exe is not in PATH`,
        `if (-not (Get-Command cl.exe -ErrorAction SilentlyContinue)) {`,
        `    $vswhere = "\${env:ProgramFiles(x86)}\\Microsoft Visual Studio\\Installer\\vswhere.exe"`,
        `    if (Test-Path $vswhere) {`,
        `        $vsPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`,
        `        $vcvars = Join-Path $vsPath "VC\\Auxiliary\\Build\\vcvars64.bat"`,
        `        if (Test-Path $vcvars) {`,
        `            Write-Host "[1/4] Importing VS x64 environment from $vcvars ..." -ForegroundColor Cyan`,
        `            cmd /c ('"' + $vcvars + '" && set') | ForEach-Object {`,
        `                if ($_ -match "^(.*?)=(.*)$") { [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process") }`,
        `            }`,
        `        }`,
        `    }`,
        `}`,
        ``,
        `# 2. Locate Windows SDK tools (MakeAppx.exe & SignTool.exe)`,
        `$SdkBin = Get-ChildItem "C:\\Program Files (x86)\\Windows Kits\\10\\bin\\*\\x64" -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1`,
        `if ($SdkBin) {`,
        `    $env:Path = "$($SdkBin.FullName);$env:Path"`,
        `}`,
        ``,
        `# 3. Compile Pure OneCore UWP Executable (if not already attached)`,
        `if (-not (Test-Path "Win11DesktopShell.exe")) {`,
        `    Write-Host "[2/4] Compiling Main.cpp (/APPCONTAINER windowsapp.lib d3d11.lib dxgi.lib) ..." -ForegroundColor Cyan`,
        `    cl.exe /std:c++17 /EHsc /O2 /APPCONTAINER /DWIN32_LEAN_AND_MEAN Main.cpp windowsapp.lib d3d11.lib dxgi.lib /Fe:Win11DesktopShell.exe`,
        `    if ($LASTEXITCODE -ne 0) { throw "MSVC compilation failed." }`,
        `} else {`,
        `    Write-Host "[2/4] Using attached Win11DesktopShell.exe ..." -ForegroundColor Green`,
        `}`,
        ``,
        `# 4. Pack Series X .msix cleanly (exclude scripts/certs from package root)`,
        `Write-Host "[3/4] Packing $OutMsix via MakeAppx.exe ..." -ForegroundColor Cyan`,
        `$StageDir = Join-Path $env:TEMP ($PkgName + "_stage")`,
        `if (Test-Path $StageDir) { Remove-Item -Recurse -Force $StageDir }`,
        `New-Item -ItemType Directory -Path $StageDir | Out-Null`,
        `Copy-Item "AppxManifest.xml", "MicrosoftGame.config", "Win11DesktopShell.exe" $StageDir`,
        `Copy-Item -Recurse "Assets", "www" $StageDir`,
        `MakeAppx.exe pack /o /d $StageDir /p $OutMsix`,
        `if ($LASTEXITCODE -ne 0) { throw "MakeAppx failed." }`,
        ``,
        `# 5. Sign .msix with bundled X.509 certificate`,
        `if (Test-Path $CertPfx) {`,
        `    Write-Host "[4/4] Signing $OutMsix with $CertPfx ..." -ForegroundColor Cyan`,
        `    SignTool.exe sign /fd SHA256 /f $CertPfx /p xbox123 $OutMsix`,
        `    if ($LASTEXITCODE -ne 0) { throw "SignTool failed." }`,
        `}`,
        ``,
        `Write-Host "[+] Ready: $OutMsix (OneCore Windows.Xbox x64)" -ForegroundColor Green`,
        ``,
        `if ($DeployToXbox) {`,
        `    $WdpUrl = "https://" + $XboxIp + ":" + $WdpPort + "/api/app/packagemanager/package?package=" + $OutMsix`,
        `    $WdpAuth = $WdpUser + ":" + $WdpPass`,
        `    Write-Host "[*] Uploading & installing onto Xbox Series X at $WdpUrl ..." -ForegroundColor Yellow`,
        `    curl.exe -k -u $WdpAuth -F "install=@$OutMsix" -F "cert=@$CertCer" $WdpUrl`,
        `}`,
      ].join('\n');

      const res = await fetch('/api/export/xdk-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifestXml: appxManifestXml,
          gameConfigXml,
          cppHost: cppSource,
          windowsBuildScript,
          linuxDeployScript: buildKaliScriptText(),
          compiledExeBase64: compiledExe?.base64 || '',
          compiledExeName: 'Win11DesktopShell.exe',
          publisher,
          config: {
            ip: config.consoleIp,
            port: config.wdpPort,
            smbPort: 445,
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to build Series X OneCore Kit (.zip)');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${packageName}_SeriesX_OneCore_Kit.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setDownloadError(err?.message || 'Failed to build Series X Kit');
    } finally {
      setIsDownloadingKit(false);
    }
  };

  const buildKaliScriptText = () =>
    [
      `#!/usr/bin/env bash`,
      `# ==============================================================================`,
      `# XBOX SERIES X (SCARLETT) GDK + ONECORE UWP BUILD SCRIPT FOR KALI LINUX`,
      `# Compiles Win11DesktopShell.exe natively on Linux using either:`,
      `#   A) clang-cl + lld-link (pointing to your copied Windows SDK / GDK / MSVC)`,
      `#   B) wine64 running Windows cl.exe + MakeAppx.exe / GDK makepkg.exe`,
      `# Packs AppxManifest.xml + MicrosoftGame.config + exact PNGs + AppxBlockMap,`,
      `# signs with osslsigncode, and deploys via WDP (:11443) or SMB3 (:445).`,
      `# ==============================================================================`,
      `set -e`,
      ``,
      `XBOX_IP="${config.consoleIp}"`,
      `SMB_USER="${config.smbUser}"`,
      `SMB_PASS="${config.smbPassword}"`,
      `WDP_PORT="${config.wdpPort}"`,
      `BRAIN_DIR="\${BRAIN_DIR:-$PWD/xbx_seriesx_build}"`,
      `BUILD_DIR="$BRAIN_DIR/msix_build"`,
      `MSIX_OUT="$BRAIN_DIR/${packageName}_x64.msix"`,
      ``,
      `# SDK locations on Linux:`,
      `#   Option A (Zero Windows PC needed): xwin splat --output ~/xwin`,
      `#   Option B (Copied from Windows PC): ~/xbox-sdk/{GDK,"Windows Kits/10",MSVC}`,
      `XWIN_DIR="\${XWIN_DIR:-$HOME/xwin}"`,
      `GDK_DIR="\${GDK_DIR:-$HOME/xbox-sdk/GDK}"`,
      `WINSDK_DIR="\${WINSDK_DIR:-$HOME/xbox-sdk/Windows Kits/10}"`,
      `WINSDK_VER="\${WINSDK_VER:-10.0.22621.0}"`,
      `MSVC_DIR="\${MSVC_DIR:-$HOME/xbox-sdk/MSVC}"`,
      ``,
      `echo "[1/6] Preparing Series X GDK + OneCore staging folder at $BUILD_DIR ..."`,
      `mkdir -p "$BRAIN_DIR" "$BUILD_DIR/Assets" "$BUILD_DIR/Models" "$BUILD_DIR/www"`,
      ``,
      `if [ -f "./Main.cpp" ]; then`,
      `  cp "./Main.cpp" "$BRAIN_DIR/Win11DesktopShell.cpp"`,
      `else`,
      `  cat << 'EOF_CPP' > "$BRAIN_DIR/Win11DesktopShell.cpp"`,
      cppSource,
      `EOF_CPP`,
      `fi`,
      ``,
      `echo "[2/6] Compiling Win11DesktopShell.exe (/APPCONTAINER windowsapp.lib) on Linux ..."`,
      `if [ -f "$BRAIN_DIR/Win11DesktopShell.exe" ]; then`,
      `  cp "$BRAIN_DIR/Win11DesktopShell.exe" "$BUILD_DIR/Win11DesktopShell.exe"`,
      `  echo "      [+] Reusing existing $BRAIN_DIR/Win11DesktopShell.exe"`,
      `elif command -v clang-cl >/dev/null 2>&1 && command -v lld-link >/dev/null 2>&1 && [ -d "$XWIN_DIR/crt" ] && [ -d "$XWIN_DIR/sdk" ]; then`,
      `  echo "      [*] Compiling natively on Linux using xwin ($XWIN_DIR) + clang-cl + lld-link ..."`,
      `  CPPWINRT_INC=""`,
      `  [ -d "$XWIN_DIR/sdk/include/cppwinrt" ] && CPPWINRT_INC="-imsvc $XWIN_DIR/sdk/include/cppwinrt"`,
      `  GDK_INC=""; GDK_LIB=""`,
      `  XGR_LIB=$(find "$GDK_DIR" -iname "xgameruntime.lib" 2>/dev/null | head -n1 || true)`,
      `  if [ -n "$XGR_LIB" ] && [ -d "$GDK_DIR/GRDK/GameKit/Include" ]; then`,
      `    GDK_INC="-imsvc $GDK_DIR/GRDK/GameKit/Include"`,
      `    GDK_LIB="$XGR_LIB"`,
      `  fi`,
      `  clang-cl --target=x86_64-pc-windows-msvc /std:c++17 /EHsc /O2 /DWIN32_LEAN_AND_MEAN /DWINAPI_FAMILY=WINAPI_FAMILY_APP \\`,
      `    -Wno-nonportable-include-path -fms-compatibility -fms-extensions /winsysroot "$XWIN_DIR" $CPPWINRT_INC $GDK_INC \\`,
      `    /c "$BRAIN_DIR/Win11DesktopShell.cpp" /Fo"$BUILD_DIR/Main.obj"`,
      `  WINAPP_LIB=$(find "$XWIN_DIR" -iname "windowsapp.lib" | head -n1)`,
      `  D3D11_LIB=$(find "$XWIN_DIR" -iname "d3d11.lib" | head -n1)`,
      `  DXGI_LIB=$(find "$XWIN_DIR" -iname "dxgi.lib" | head -n1)`,
      `  lld-link /APPCONTAINER /SUBSYSTEM:WINDOWS /MACHINE:X64 /winsysroot:"$XWIN_DIR" \\`,
      `    /OUT:"$BUILD_DIR/Win11DesktopShell.exe" "$BUILD_DIR/Main.obj" "$WINAPP_LIB" "$D3D11_LIB" "$DXGI_LIB" $GDK_LIB`,
      `  rm -f "$BUILD_DIR/Main.obj"`,
      `  echo "      [+] Compiled pure OneCore Win11DesktopShell.exe on Linux!"`,
      `elif command -v clang-cl >/dev/null 2>&1 && command -v lld-link >/dev/null 2>&1 && [ -d "$WINSDK_DIR/Include/$WINSDK_VER" ]; then`,
      `  echo "      [*] Compiling natively on Linux using copied SDK ($WINSDK_DIR) ..."`,
      `  WINAPP_LIB=$(find "$WINSDK_DIR/Lib/$WINSDK_VER" -iname "windowsapp.lib" 2>/dev/null | grep -i x64 | head -n1 || true)`,
      `  D3D11_LIB=$(find "$WINSDK_DIR/Lib/$WINSDK_VER" -iname "d3d11.lib" 2>/dev/null | grep -i x64 | head -n1 || true)`,
      `  DXGI_LIB=$(find "$WINSDK_DIR/Lib/$WINSDK_VER" -iname "dxgi.lib" 2>/dev/null | grep -i x64 | head -n1 || true)`,
      `  UCRT_LIB=$(find "$WINSDK_DIR/Lib/$WINSDK_VER" -iname "ucrt.lib" 2>/dev/null | grep -i x64 | head -n1 || true)`,
      `  VCRT_LIB=$(find "$MSVC_DIR" -iname "vcruntime.lib" 2>/dev/null | grep -i x64 | head -n1 || true)`,
      `  MSVCRT_LIB=$(find "$MSVC_DIR" -iname "msvcrt.lib" 2>/dev/null | grep -i x64 | head -n1 || true)`,
      `  GDK_INC=""; GDK_LIB=""`,
      `  XGR_LIB=$(find "$GDK_DIR" -iname "xgameruntime.lib" 2>/dev/null | head -n1 || true)`,
      `  if [ -n "$XGR_LIB" ] && [ -d "$GDK_DIR/GRDK/GameKit/Include" ]; then`,
      `    GDK_INC="-imsvc $GDK_DIR/GRDK/GameKit/Include"`,
      `    GDK_LIB="$XGR_LIB"`,
      `  fi`,
      `  clang-cl --target=x86_64-pc-windows-msvc /std:c++17 /EHsc /O2 /DWIN32_LEAN_AND_MEAN /DWINAPI_FAMILY=WINAPI_FAMILY_APP \\`,
      `    -Wno-nonportable-include-path -fms-compatibility -fms-extensions \\`,
      `    -imsvc "$MSVC_DIR/include" \\`,
      `    -imsvc "$WINSDK_DIR/Include/$WINSDK_VER/ucrt" \\`,
      `    -imsvc "$WINSDK_DIR/Include/$WINSDK_VER/um" \\`,
      `    -imsvc "$WINSDK_DIR/Include/$WINSDK_VER/shared" \\`,
      `    -imsvc "$WINSDK_DIR/Include/$WINSDK_VER/winrt" \\`,
      `    $GDK_INC \\`,
      `    /c "$BRAIN_DIR/Win11DesktopShell.cpp" /Fo"$BUILD_DIR/Main.obj"`,
      `  lld-link /APPCONTAINER /SUBSYSTEM:WINDOWS /MACHINE:X64 \\`,
      `    /OUT:"$BUILD_DIR/Win11DesktopShell.exe" "$BUILD_DIR/Main.obj" \\`,
      `    "$WINAPP_LIB" "$D3D11_LIB" "$DXGI_LIB" "$UCRT_LIB" "$VCRT_LIB" "$MSVCRT_LIB" $GDK_LIB`,
      `  rm -f "$BUILD_DIR/Main.obj"`,
      `  echo "      [+] Compiled pure OneCore Win11DesktopShell.exe on Linux!"`,
      `elif command -v wine64 >/dev/null 2>&1 && [ -f "$MSVC_DIR/bin/Hostx64/x64/cl.exe" ]; then`,
      `  echo "      [*] Compiling via wine64 + MSVC cl.exe ..."`,
      `  WINEPREFIX="\${WINEPREFIX:-$HOME/.wine-gdk}" wine64 "$MSVC_DIR/bin/Hostx64/x64/cl.exe" \\`,
      `    /std:c++17 /EHsc /O2 /APPCONTAINER /DWIN32_LEAN_AND_MEAN \\`,
      `    /I "$WINSDK_DIR/Include/$WINSDK_VER/cppwinrt" \\`,
      `    "$BRAIN_DIR/Win11DesktopShell.cpp" windowsapp.lib /Fe:"$BUILD_DIR/Win11DesktopShell.exe"`,
      `else`,
      `  echo "      [!] Neither ~/xwin nor ~/xbox-sdk/Windows Kits/10/$WINSDK_VER was found."`,
      `  echo "      [!] Quick Linux SDK setup: cargo install xwin && xwin --accept-license splat --output ~/xwin"`,
      `  echo "      [!] Or copy Windows Kits/10 + MSVC + GDK into ~/xbox-sdk/"`,
      `  echo "      [!] Continuing to stage manifests, PNGs, and www/ assets..."`,
      `fi`,
      ``,
      `echo "[3/6] Writing AppxManifest.xml, MicrosoftGame.config, www/ bundle, and exact PNG assets ..."`,
      `mkdir -p "$BUILD_DIR/www"`,
      `if [ -d "./dist" ] && [ -f "./dist/index.html" ]; then`,
      `  cp -r ./dist/* "$BUILD_DIR/www/"`,
      `elif [ ! -f "$BUILD_DIR/www/index.html" ]; then`,
      `  cat << 'EOF_HTML' > "$BUILD_DIR/www/index.html"`,
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Windows 11 Native Desktop OS (Xbox Series X)</title></head><body style="margin:0;background:#0a1329;color:#e2e8f0;font-family:Segoe UI,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;"><div style="text-align:center"><h1 style="color:#10b981;margin-bottom:8px;">Windows 11 Native Desktop (Xbox Series X)</h1><p>OneCore UWP Container Active</p></div></body></html>`,
      `EOF_HTML`,
      `fi`,
      `cat << 'EOF_MANIFEST' > "$BUILD_DIR/AppxManifest.xml"`,
      appxManifestXml,
      `EOF_MANIFEST`,
      `if [ ! -f "$BUILD_DIR/Win11DesktopShell.exe" ] && grep -q 'Executable="Win11DesktopShell.exe"' "$BUILD_DIR/AppxManifest.xml"; then`,
      `  echo "      [!] Win11DesktopShell.exe not found in $BUILD_DIR — switching AppxManifest.xml to HTML/UWP StartPage=\\"www/index.html\\" so launch never crashes"`,
      `  sed -i 's/Executable="Win11DesktopShell.exe"/StartPage="www\\/index.html"/g; /EntryPoint="Win11DesktopShell.App"/d' "$BUILD_DIR/AppxManifest.xml"`,
      `fi`,
      ``,
      `cat << 'EOF_GAME' > "$BUILD_DIR/MicrosoftGame.config"`,
      `<?xml version="1.0" encoding="utf-8"?>`,
      `<Game configVersion="1">`,
      `  <Identity Name="${packageName}" Publisher="${publisher}" Version="${version}" />`,
      `  <ExecutableList>`,
      `    <Executable Name="Win11DesktopShell.exe" Id="Win11DesktopShell" TargetDeviceFamily="Scarlett" />`,
      `  </ExecutableList>`,
      `  <ShellVisuals DefaultDisplayName="Windows 11 Native Desktop"`,
      `                PublisherDisplayName="Xbox Series X DevKit Studio"`,
      `                StoreLogo="Assets\\\\StoreLogo.png"`,
      `                Square150x150Logo="Assets\\\\Logo.png"`,
      `                Square44x44Logo="Assets\\\\SmallLogo.png"`,
      `                Square480x480Logo="Assets\\\\Square480x480Logo.png"`,
      `                SplashScreenImage="Assets\\\\SplashScreen1920x1080.png"`,
      `                Description="Xbox Series X OneCore Desktop Shell" />`,
      `</Game>`,
      `EOF_GAME`,
      ``,
      `cat << 'EOF_CFG' > "$BUILD_DIR/hermes_model_config.json"`,
      JSON.stringify(
        {
          brain_id: 'dd55b21d-c3d7-4cb6-8d3c-7d872aa4690c',
          offline_local_only: true,
          mobile_local_model: `D:\\DevelopmentFiles\\Windows11Desktop\\Models\\gemma-3-1b-it-Q4_K_M.gguf`,
          primary_hf_model: `D:\\DevelopmentFiles\\Windows11Desktop\\Models\\${config.customHfFilename}`,
        },
        null,
        2
      ),
      `EOF_CFG`,
      ``,
      `python3 - "$BUILD_DIR/Assets" << 'EOF_PNG'`,
      `import os, sys, struct, zlib`,
      `out_dir = sys.argv[1]`,
      `def write_png(name, w, h):`,
      `    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)`,
      `    raw = b''.join(b'\\x00' + (b'\\x09\\x0b\\x0e\\xff' * w) for _ in range(h))`,
      `    data = b'\\x89PNG\\r\\n\\x1a\\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')`,
      `    open(os.path.join(out_dir, name), 'wb').write(data)`,
      `for n, w, h in [('SmallLogo.png', 44, 44), ('StoreLogo.png', 50, 50), ('Logo.png', 150, 150), ('Wide310x150Logo.png', 310, 150), ('SplashScreen.png', 620, 300), ('Square480x480Logo.png', 480, 480), ('SplashScreen1920x1080.png', 1920, 1080)]:`,
      `    write_png(n, w, h)`,
      `EOF_PNG`,
      ``,
      `echo "[4/6] Packing .msix (ZIP_STORED for 1:1 Xbox BlockMap hash verification) ..."`,
      `python3 - "$BUILD_DIR" "$BRAIN_DIR/unsigned.msix" << 'EOF_PY'`,
      `import sys, os, hashlib, base64, zipfile`,
      `build_dir, out_msix = sys.argv[1], sys.argv[2]`,
      `entries = []`,
      `for root, _, files in os.walk(build_dir):`,
      `    for f in files:`,
      `        if f in ("AppxBlockMap.xml", "[Content_Types].xml"): continue`,
      `        full = os.path.join(root, f)`,
      `        rel = os.path.relpath(full, build_dir)`,
      `        data = open(full, "rb").read()`,
      `        if rel != "AppxManifest.xml":`,
      `            win_rel = rel.replace("/", "\\\\")`,
      `            blocks = "".join(f'<Block Hash="{base64.b64encode(hashlib.sha256(data[i:i+65536]).digest()).decode()}"/>' for i in range(0, max(1, len(data)), 65536))`,
      `            entries.append(f'  <File Name="{win_rel}" Size="{len(data)}" LfhSize="{30+len(rel)}">{blocks}</File>')`,
      `blockmap = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\\n<BlockMap xmlns="http://schemas.microsoft.com/appx/2010/blockmap" HashMethod="http://www.w3.org/2001/04/xmlenc#sha256">\\n' + "\\n".join(entries) + '\\n</BlockMap>'`,
      `open(os.path.join(build_dir, "AppxBlockMap.xml"), "w").write(blockmap)`,
      `ct = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="png" ContentType="image/png"/><Default Extension="exe" ContentType="application/x-msdownload"/><Default Extension="html" ContentType="text/html"/><Default Extension="js" ContentType="application/javascript"/><Default Extension="css" ContentType="text/css"/><Default Extension="config" ContentType="application/xml"/><Default Extension="json" ContentType="application/json"/><Default Extension="xml" ContentType="application/vnd.ms-appx.manifest+xml"/><Override PartName="/AppxManifest.xml" ContentType="application/vnd.ms-appx.manifest+xml"/><Override PartName="/AppxBlockMap.xml" ContentType="application/vnd.ms-appx.blockmap+xml"/></Types>'`,
      `open(os.path.join(build_dir, "[Content_Types].xml"), "w").write(ct)`,
      `with zipfile.ZipFile(out_msix, "w", zipfile.ZIP_STORED) as zf:`,
      `    for root, _, files in os.walk(build_dir):`,
      `        for f in files:`,
      `            full = os.path.join(root, f)`,
      `            zf.write(full, os.path.relpath(full, build_dir))`,
      `print("      [+] Created unsigned MSIX:", out_msix)`,
      `EOF_PY`,
      ``,
      `if command -v wine64 >/dev/null 2>&1 && [ -f "$GDK_DIR/bin/makepkg.exe" ]; then`,
      `  echo "      [*] GDK makepkg.exe detected — creating Scarlett .xvc package too..."`,
      `  mkdir -p "$BRAIN_DIR/xvc_out"`,
      `  WINEPREFIX="\${WINEPREFIX:-$HOME/.wine-gdk}" wine64 "$GDK_DIR/bin/makepkg.exe" pack /f "$BUILD_DIR/chunks.xml" /d "$BUILD_DIR" /pd "$BRAIN_DIR/xvc_out" || true`,
      `fi`,
      ``,
      `echo "[5/6] Generating X.509 Certificate (${publisher}) & Signing ${packageName}_x64.msix ..."`,
      `openssl req -x509 -newkey rsa:2048 -keyout "$BRAIN_DIR/win11.key" -out "$BRAIN_DIR/Win11Desktop_Root.cer" \\`,
      `  -days 3650 -nodes -subj "/${publisher.replace(/,/g, '/')}" \\`,
      `  -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,digitalSignature,keyCertSign" -addext "extendedKeyUsage=codeSigning"`,
      `openssl pkcs12 -export -out "$BRAIN_DIR/win11.pfx" -inkey "$BRAIN_DIR/win11.key" -in "$BRAIN_DIR/Win11Desktop_Root.cer" -passout pass:xbox123`,
      `if command -v osslsigncode >/dev/null 2>&1; then`,
      `  rm -f "$MSIX_OUT"`,
      `  osslsigncode sign -pkcs12 "$BRAIN_DIR/win11.pfx" -pass xbox123 -h sha256 -in "$BRAIN_DIR/unsigned.msix" -out "$MSIX_OUT" || cp "$BRAIN_DIR/unsigned.msix" "$MSIX_OUT"`,
      `else`,
      `  cp "$BRAIN_DIR/unsigned.msix" "$MSIX_OUT"`,
      `fi`,
      ``,
      `echo "[6/6] Pushing LooseApp + MSIX + Cert to Xbox Series X over SMB3 (:445) ..."`,
      `if command -v smbclient >/dev/null 2>&1; then`,
      `  cd "$BUILD_DIR"`,
      `  smbclient //$XBOX_IP/${config.smbShareName} -U "$SMB_USER%$SMB_PASS" -m SMB3 \\`,
      `    -c "mkdir LooseApps; cd LooseApps; mkdir ${packageName}; cd ${packageName}; prompt OFF; recurse ON; mput *"`,
      `fi`,
      ``,
      `echo "[+] Ready! Install via WDP (:11443):"`,
      `echo "    curl -k -u \\"$SMB_USER:$SMB_PASS\\" -F \\"install=@$MSIX_OUT\\" -F \\"cert=@$BRAIN_DIR/Win11Desktop_Root.cer\\" \\"https://$XBOX_IP:$WDP_PORT/api/app/packagemanager/package?package=${packageName}_x64.msix\\""`,
    ].join('\n');

  const handleDownloadKaliMsixCompilerScript = () => {
    const script = buildKaliScriptText();
    const blob = new Blob([script], { type: 'text/x-shellscript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `build_and_sign_win11_msix.sh`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const oneLineLocalLaunchCmd = `mkdir -p ~/xbx-studio && cd ~/xbx-studio && unzip -oq "$(ls -t ~/Downloads/xbox-gdk-xdk-linux-studio-*.zip | head -n1)" && npm install && npm run dev`;

  return (
    <div className="flex flex-col h-full bg-[#161920] text-slate-100 select-none">
      {/* Top Sub-Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#1e222d] border-b border-white/10">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'msix', label: '1. Deploy to XDK' },
            { id: 'cpp', label: '2. Main.cpp (OneCore UWP)' },
            { id: 'manifest', label: '3. AppxManifest.xml' },
            { id: 'linuxsh', label: '4. Linux Script (.sh)' },
            { id: 'report', label: '5. Validation Report' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === t.id
                  ? 'bg-sky-600 text-white'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {downloadError && (
          <div className="px-3.5 py-2 rounded bg-rose-950/70 border border-rose-500/40 text-xs text-rose-200">
            {downloadError}
          </div>
        )}
        {activeTab === 'msix' && (
          <>
            {/* Simple 1-Step Direct XDK Deploy Card */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-950/60 via-[#182232] to-[#161c28] border border-emerald-500/35 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-emerald-400" />
                    <span>Simple 1-Step Deploy to Xbox Series X DevKit (XDK)</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Pick <strong>Instant HTML/UWP</strong> (zero C++, zero <code className="text-emerald-300">xwin</code>, works immediately) or <strong>Native C++ D3D11</strong>, then push directly over your LAN via SMB3 (:445) + Windows Device Portal (:11443).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestXdkConnection}
                    disabled={isTestingXdk}
                    className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5"
                  >
                    {isTestingXdk ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5 text-sky-400" />}
                    <span>{isTestingXdk ? 'Testing...' : 'Test XDK (:11443)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeployDirectlyToXdk}
                    disabled={isDeployingXdk}
                    className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 shadow"
                  >
                    {isDeployingXdk ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                    <span>{isDeployingXdk ? 'Deploying to XDK...' : 'Deploy Directly to XDK'}</span>
                  </button>
                </div>
              </div>

              {/* Mode + Target Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">XDK Package Mode</label>
                  <select
                    value={uwpMode}
                    onChange={(e) => setUwpMode(e.target.value as 'html-uwp' | 'native-cpp')}
                    className="w-full bg-[#0f141d] border border-white/20 rounded px-2 py-1.5 text-white"
                  >
                    <option value="html-uwp">Instant HTML/UWP (Zero Compile)</option>
                    <option value="native-cpp">Native C++ D3D11 (.exe)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Xbox IP Address</label>
                  <input
                    type="text"
                    value={config.consoleIp}
                    onChange={(e) => onUpdateConfig({ consoleIp: e.target.value })}
                    className="w-full bg-[#0f141d] border border-white/20 rounded px-2.5 py-1.5 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">WDP / SMB User</label>
                  <input
                    type="text"
                    value={config.smbUser}
                    onChange={(e) => onUpdateConfig({ smbUser: e.target.value })}
                    className="w-full bg-[#0f141d] border border-white/20 rounded px-2.5 py-1.5 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">WDP / SMB Password</label>
                  <input
                    type="password"
                    value={config.smbPassword}
                    onChange={(e) => onUpdateConfig({ smbPassword: e.target.value })}
                    className="w-full bg-[#0f141d] border border-white/20 rounded px-2.5 py-1.5 font-mono text-white"
                  />
                </div>
              </div>

              {xdkTestResult && (
                <div
                  className={`p-2.5 rounded border text-xs ${
                    xdkTestResult.ok
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                      : 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                  }`}
                >
                  {xdkTestResult.message}
                </div>
              )}

              {deployResult && (
                <div className="p-3 rounded bg-[#0c1018] border border-white/15 space-y-1.5 text-xs">
                  {deployResult.steps.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      {s.status === 'ok' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : s.status === 'warn' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-semibold text-white">{s.name}: </span>
                        <span className="text-slate-300 break-all">{s.detail}</span>
                      </div>
                    </div>
                  ))}
                  {deployResult.looseAppConsolePath && (
                    <div className="pt-1 text-[11px] text-sky-300 font-mono">
                      Xbox Loose Folder: {deployResult.looseAppConsolePath} (WDP → My games &amp; apps → Add → Register loose files)
                    </div>
                  )}
                </div>
              )}

              {(xdkTestResult?.runningInCloud || deployResult?.runningInCloud) && (
                <div className="p-3 rounded bg-[#0c1018]/90 border border-amber-500/35 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200">
                    <span>
                      Run the downloaded app ZIP locally on Kali once so <strong>Deploy Directly to XDK</strong> runs on your home LAN:
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(oneLineLocalLaunchCmd, 'oneline-launch')}
                      className="px-2.5 py-1 rounded bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 text-xs font-mono flex items-center gap-1"
                    >
                      {copiedId === 'oneline-launch' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === 'oneline-launch' ? 'Copied!' : 'Copy Launch Command'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-emerald-300 break-all select-all">
                    {oneLineLocalLaunchCmd}
                  </div>
                </div>
              )}
            </div>

            {/* MSIX Identity & Target Console Configuration */}
            <div className="p-4 rounded-lg bg-[#1d222c] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-sky-400" />
                    <span>
                      Xbox Series X OneCore `.MSIX` Configuration (Windows.Xbox ≥ 10.0.19041.0)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pure OneCore UWP AppContainer manifest (zero `Windows.Desktop`, zero `runFullTrust`, zero `user32`/`gdi32`), exact-dimension PNGs (`44x44` to `620x300`), and optional `Win11DesktopShell.exe`.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    MSIX Identity Name
                  </label>
                  <input
                    type="text"
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    className="w-full bg-[#12151c] border border-white/15 rounded px-2.5 py-1.5 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Publisher (Must Match Signing Cert Subject)
                  </label>
                  <input
                    type="text"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    className="w-full bg-[#12151c] border border-white/15 rounded px-2.5 py-1.5 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    MSIX Package Version
                  </label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="w-full bg-[#12151c] border border-white/15 rounded px-2.5 py-1.5 font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Xbox WDP Port
                  </label>
                  <input
                    type="number"
                    value={config.wdpPort}
                    onChange={(e) => onUpdateConfig({ wdpPort: Number(e.target.value) || 11443 })}
                    className="w-full bg-[#12151c] border border-white/15 rounded px-2.5 py-1.5 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Xbox SMB Share Name
                  </label>
                  <input
                    type="text"
                    value={config.smbShareName}
                    onChange={(e) => onUpdateConfig({ smbShareName: e.target.value })}
                    className="w-full bg-[#12151c] border border-white/15 rounded px-2.5 py-1.5 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    nitrokali Brain Path
                  </label>
                  <input
                    type="text"
                    value={brainPath}
                    onChange={(e) => setBrainPath(e.target.value)}
                    className="w-full bg-[#12151c] border border-white/15 rounded px-2.5 py-1.5 font-mono text-white"
                  />
                </div>
              </div>

              {/* Attach Pre-Compiled .exe + Signing Cert Controls */}
              <div className="p-3 rounded-md bg-[#12161f] border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    ref={exeUploadRef}
                    type="file"
                    accept=".exe"
                    onChange={handleAttachExe}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => exeUploadRef.current?.click()}
                    className="px-3 py-1.5 rounded bg-amber-600/25 hover:bg-amber-600/40 border border-amber-500/40 text-amber-200 font-semibold flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {compiledExe
                        ? `Attached: ${compiledExe.name} (${compiledExe.sizeKb} KB)`
                        : 'Attach Compiled Win11DesktopShell.exe (Optional)'}
                    </span>
                  </button>
                  {compiledExe && (
                    <button
                      type="button"
                      onClick={() => setCompiledExe(null)}
                      className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                      title="Remove attached .exe"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleDownloadCert}
                  disabled={isDownloadingCert}
                  className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 text-slate-200 font-medium flex items-center gap-1.5 whitespace-nowrap"
                >
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {isDownloadingCert
                      ? 'Generating Cert...'
                      : 'Download Signing Cert (.CER + .PFX)'}
                  </span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDirectDownloadMsix}
                  disabled={isDownloadingMsix}
                  className="px-3.5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloadingMsix ? 'Packing .MSIX...' : `Download ${packageName}_x64.msix`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadXdkKit}
                  disabled={isDownloadingKit}
                  className="px-3.5 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloadingKit ? 'Packing Kit...' : 'Download Series X Kit (.ZIP)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadKaliMsixCompilerScript}
                  className="px-3.5 py-2 rounded bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Download Script (.sh)</span>
                </button>
              </div>
            </div>

            {/* Quick Launch Grid for Reconstructed Windows 11 Desktop Subsystems */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                Interactive Windows 11 Desktop Applications (Live Preview)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {[
                  {
                    id: 'explorer' as Win11AppId,
                    title: 'File Explorer',
                    desc: 'Browse C:, D:\\DevelopmentFiles, Models',
                    icon: Folder,
                    color: 'text-amber-400',
                  },
                  {
                    id: 'powershell' as Win11AppId,
                    title: 'PowerShell 7.4',
                    desc: 'Admin shell & SMB diagnostics',
                    icon: Terminal,
                    color: 'text-sky-400',
                  },
                  {
                    id: 'cmd' as Win11AppId,
                    title: 'Command Prompt',
                    desc: 'Native cmd.exe console',
                    icon: Terminal,
                    color: 'text-slate-200',
                  },
                  {
                    id: 'taskmgr' as Win11AppId,
                    title: 'Task Manager',
                    desc: '8-Core Zen 2 & 16GB GDDR6',
                    icon: Cpu,
                    color: 'text-emerald-400',
                  },
                  {
                    id: 'settings' as Win11AppId,
                    title: 'Windows 11 Settings',
                    desc: '4K120 TV, USB HID, Local GGUF AI',
                    icon: Monitor,
                    color: 'text-indigo-400',
                  },
                  {
                    id: 'hermes' as Win11AppId,
                    title: 'Hermes AI Copilot',
                    desc: '100% Offline Mobile / GGUF Model',
                    icon: ShieldCheck,
                    color: 'text-emerald-300',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpenWindow(item.id)}
                      className="p-3 rounded-lg bg-[#1d212a] hover:bg-[#252a36] border border-white/10 text-left transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 ${item.color}`} />
                        <span className="text-xs font-semibold text-white">{item.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">{item.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === 'cpp' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-300">
                Pure OneCore WRL `CoreApplication` + Direct3D 11 Host (`Main.cpp` — compiles with `xwin` + `clang-cl`/`lld-link` on Linux or MSVC `/APPCONTAINER` on Windows, zero `user32.dll`/`gdi32.dll`):
              </div>
              <button
                type="button"
                onClick={() => copyText(cppSource, 'cppsrc')}
                className="px-3 py-1 rounded bg-white/10 hover:bg-white/15 text-xs font-mono text-white flex items-center gap-1.5"
              >
                {copiedId === 'cppsrc' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy C++ Source</span>
              </button>
            </div>
            <textarea
              value={cppSource}
              onChange={(e) => setCppSource(e.target.value)}
              rows={20}
              className="w-full bg-[#0e1117] border border-white/15 rounded-lg p-3 text-xs font-mono text-emerald-300 focus:outline-none select-text"
            />
          </div>
        )}

        {activeTab === 'manifest' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-300">
                Pure OneCore `AppxManifest.xml` targeting `Windows.Xbox` &amp; `Windows.Universal` (`MinVersion=&quot;10.0.19041.0&quot;`, no `Windows.Desktop`, no `runFullTrust`):
              </div>
              <button
                type="button"
                onClick={() => copyText(appxManifestXml, 'manifestxml')}
                className="px-3 py-1 rounded bg-white/10 hover:bg-white/15 text-xs font-mono text-white flex items-center gap-1.5"
              >
                {copiedId === 'manifestxml' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy AppxManifest.xml</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-lg bg-[#0e1117] border border-white/15 text-xs font-mono text-sky-300 overflow-x-auto select-text">
              {appxManifestXml}
            </pre>
          </div>
        )}

        {activeTab === 'linuxsh' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-300">
                Self-contained Kali Linux build + sign + SMB/WDP script (`build_seriesx.sh` — works without browser downloads):
              </div>
              <button
                type="button"
                onClick={() => copyText(buildKaliScriptText(), 'kalish-tab')}
                className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-xs font-mono text-white flex items-center gap-1.5"
              >
                {copiedId === 'kalish-tab' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedId === 'kalish-tab' ? 'Copied!' : 'Copy Full Script'}</span>
              </button>
            </div>
            <textarea
              readOnly
              value={buildKaliScriptText()}
              rows={22}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              className="w-full bg-[#0e1117] border border-white/15 rounded-lg p-3 text-xs font-mono text-amber-200 focus:outline-none select-text"
            />
          </div>
        )}

        {activeTab === 'report' && (
          <div className="p-4 rounded-lg bg-[#12151b] border border-white/10">
            <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
              {DEPLOYMENT_REPORT_MARKDOWN}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
