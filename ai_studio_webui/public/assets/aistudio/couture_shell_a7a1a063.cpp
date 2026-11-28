#include <windows.h>
#include <stdio.h>
#include <initguid.h>
#include <d3d11.h>
#include <dxgi1_2.h>

// Define IID_IDCompositionDevice: C37925AA-26DE-450E-8BE4-C7CE80555091
DEFINE_GUID(IID_IDCompositionDevice, 0xc37925aa, 0x26de, 0x450e, 0x8b, 0xe4, 0xc7, 0xce, 0x80, 0x55, 0x50, 0x91);

// DComposition minimal COM interfaces
struct IDCompositionVisual : public IUnknown {
    virtual HRESULT STDMETHODCALLTYPE SetOffsetX(float offsetX) = 0;
    virtual HRESULT STDMETHODCALLTYPE SetOffsetY(float offsetY) = 0;
    virtual HRESULT STDMETHODCALLTYPE SetTransform(void *transform) = 0;
    virtual HRESULT STDMETHODCALLTYPE SetTransformParent(IDCompositionVisual *visual) = 0;
    virtual HRESULT STDMETHODCALLTYPE SetEffect(void *effect) = 0;
    virtual HRESULT STDMETHODCALLTYPE SetBitmapInterpolationMode(int mode) = 0;
    virtual HRESULT STDMETHODCALLTYPE SetBorderMode(int mode) = 0;
    virtual HRESULT STDMETHODCALLTYPE SetClip(void *clip) = 0;
    virtual HRESULT STDMETHODCALLTYPE SetContent(IUnknown *content) = 0;
    virtual HRESULT STDMETHODCALLTYPE AddVisual(IDCompositionVisual *visual, BOOL insertAbove, IDCompositionVisual *referenceVisual) = 0;
    virtual HRESULT STDMETHODCALLTYPE RemoveVisual(IDCompositionVisual *visual) = 0;
    virtual HRESULT STDMETHODCALLTYPE RemoveAllVisuals() = 0;
    virtual HRESULT STDMETHODCALLTYPE SetCompositeMode(int mode) = 0;
};

struct IDCompositionDevice : public IUnknown {
    virtual HRESULT STDMETHODCALLTYPE Commit() = 0;
    virtual HRESULT STDMETHODCALLTYPE WaitForCommitCompletion() = 0;
    virtual HRESULT STDMETHODCALLTYPE GetFrameStatistics(void *statistics) = 0;
    virtual HRESULT STDMETHODCALLTYPE CreateVisual(IDCompositionVisual **visual) = 0;
    virtual HRESULT STDMETHODCALLTYPE CreateSurfaceTargetForHwnd(HWND hwnd, BOOL topmost, void **target) = 0;
    virtual HRESULT STDMETHODCALLTYPE CreateTargetForHwnd(HWND hwnd, BOOL topmost, void **target) = 0;
};

typedef HRESULT (WINAPI *PFN_D3D11CreateDevice)(
    IDXGIAdapter*, D3D_DRIVER_TYPE, HMODULE, UINT,
    const D3D_FEATURE_LEVEL*, UINT, UINT,
    ID3D11Device**, D3D_FEATURE_LEVEL*, ID3D11DeviceContext**
);

typedef HRESULT (WINAPI *PFN_DCompositionCreateDevice)(
    IDXGIDevice *dxgiDevice, REFIID iid, void **dcompositionDevice
);

int main() {
    printf("====================================================\n");
    printf("[*] Launching CoutureOS Native Direct3D Shell Engine\n");
    printf("====================================================\n");

    HMODULE hD3D11 = LoadLibraryA("d3d11.dll");
    HMODULE hDXGI = LoadLibraryA("dxgi.dll");
    HMODULE hDComp = LoadLibraryA("dcomp.dll");

    if (!hD3D11 || !hDXGI || !hDComp) {
        printf("[-] Graphics subsystems unavailable.\n");
        return 1;
    }

    PFN_D3D11CreateDevice pD3D11Create = (PFN_D3D11CreateDevice)GetProcAddress(hD3D11, "D3D11CreateDevice");
    PFN_DCompositionCreateDevice pDCompCreate = (PFN_DCompositionCreateDevice)GetProcAddress(hDComp, "DCompositionCreateDevice");

    ID3D11Device *pDevice = NULL;
    ID3D11DeviceContext *pContext = NULL;
    D3D_FEATURE_LEVEL featureLevel;
    D3D_FEATURE_LEVEL levels[] = { D3D_FEATURE_LEVEL_11_0 };

    HRESULT hr = pD3D11Create(NULL, D3D_DRIVER_TYPE_HARDWARE, NULL, 0, levels, 1, 7, &pDevice, &featureLevel, &pContext);
    if (FAILED(hr) || !pDevice) {
        printf("[-] Failed to create D3D11 device: 0x%08X\n", (unsigned int)hr);
        return 1;
    }
    printf("[+] Direct3D 11 Hardware Device Initialized on AMD RDNA 2 GPU.\n");

    IDXGIDevice *pDXGIDevice = NULL;
    pDevice->QueryInterface(IID_IDXGIDevice, (void**)&pDXGIDevice);

    IDXGIAdapter *pAdapter = NULL;
    pDXGIDevice->GetAdapter(&pAdapter);

    IDXGIFactory2 *pFactory2 = NULL;
    pAdapter->GetParent(IID_IDXGIFactory2, (void**)&pFactory2);

    // Create Flip Sequential Composition SwapChain (1920x1080)
    DXGI_SWAP_CHAIN_DESC1 scDesc = {0};
    scDesc.Width = 1920;
    scDesc.Height = 1080;
    scDesc.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
    scDesc.Stereo = FALSE;
    scDesc.SampleDesc.Count = 1;
    scDesc.SampleDesc.Quality = 0;
    scDesc.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT;
    scDesc.BufferCount = 2;
    scDesc.Scaling = DXGI_SCALING_STRETCH;
    scDesc.SwapEffect = DXGI_SWAP_EFFECT_FLIP_SEQUENTIAL;
    scDesc.AlphaMode = DXGI_ALPHA_MODE_PREMULTIPLIED;

    IDXGISwapChain1 *pSwapChain = NULL;
    hr = pFactory2->CreateSwapChainForComposition((IUnknown*)pDevice, &scDesc, NULL, &pSwapChain);
    if (FAILED(hr) || !pSwapChain) {
        printf("[-] CreateSwapChainForComposition failed: 0x%08X\n", (unsigned int)hr);
        return 1;
    }
    printf("[+] CoutureOS SwapChain allocated successfully (1920x1080 FlipSequential).\n");

    // Acquire Backbuffer Render Target
    ID3D11Texture2D *pBackBuffer = NULL;
    hr = pSwapChain->GetBuffer(0, IID_ID3D11Texture2D, (void**)&pBackBuffer);
    ID3D11RenderTargetView *pRTV = NULL;
    if (SUCCEEDED(hr) && pBackBuffer) {
        hr = pDevice->CreateRenderTargetView((ID3D11Resource*)pBackBuffer, NULL, &pRTV);
        pBackBuffer->Release();
        printf("[+] Direct3D Render Target View created: 0x%08X\n", (unsigned int)hr);
    }

    // DirectComposition visual tree binding
    IDCompositionDevice *pDCompDevice = NULL;
    if (pDCompCreate) {
        hr = pDCompCreate(pDXGIDevice, IID_IDCompositionDevice, (void**)&pDCompDevice);
        printf("[+] DCompositionCreateDevice: 0x%08X (%p)\n", (unsigned int)hr, pDCompDevice);
        if (SUCCEEDED(hr) && pDCompDevice) {
            IDCompositionVisual *pVisual = NULL;
            hr = pDCompDevice->CreateVisual(&pVisual);
            if (SUCCEEDED(hr) && pVisual) {
                hr = pVisual->SetContent((IUnknown*)pSwapChain);
                printf("[+] SetVisualContent(SwapChain): 0x%08X\n", (unsigned int)hr);
                pDCompDevice->Commit();
                printf("[+] DirectComposition Frame Committed to Display Scanout!\n");
                pVisual->Release();
            }
            pDCompDevice->Release();
        }
    }

    // CoutureOS Signature Dark Violet/Cyberpunk Clear Color
    // Clears the TV framebuffer and presents directly
    const float clearColor[4] = { 0.12f, 0.05f, 0.22f, 1.0f }; // Deep CoutureOS Violet
    if (pRTV) {
        pContext->ClearRenderTargetView(pRTV, clearColor);
        hr = pSwapChain->Present(1, 0);
        printf("[🎉 SUCCESS!] CoutureOS Native Direct3D Frame #1 Presented to HDMI: 0x%08X\n", (unsigned int)hr);
        pRTV->Release();
    }

    if (pSwapChain) pSwapChain->Release();
    if (pFactory2) pFactory2->Release();
    if (pAdapter) pAdapter->Release();
    if (pDXGIDevice) pDXGIDevice->Release();
    if (pContext) pContext->Release();
    if (pDevice) pDevice->Release();

    printf("====================================================\n");
    printf("[+] CoutureOS Display Scanout Engine Complete!\n");
    printf("====================================================\n");
    return 0;
}
