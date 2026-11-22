import os
import shutil

src_dir = "X:\\Apps\\DevHome"
overlay_dir = "D:\\DevelopmentFiles\\DevHomeOverlay"

print(f"Creating overlay directory: {overlay_dir}")
os.makedirs(overlay_dir, exist_ok=True)

# Copy the entire DevHome tree to the overlay folder so all assets, manifests, and toolwindows resolve cleanly
# Or copy only what we need
framework_src = os.path.join(src_dir, "framework", "js", "framework.js")
framework_dst_dir = os.path.join(overlay_dir, "framework", "js")
os.makedirs(framework_dst_dir, exist_ok=True)
framework_dst = os.path.join(framework_dst_dir, "framework.js")

with open(framework_src, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

# Inspect and patch the CertType logic
# Original:
# utils._fullCertType = await nativeUtils.getCertTypeAsync();
# if (utils._fullCertType === Microsoft.Xbox.Development.CertType.uwaDevkit) {
#     utils._certType = utils.Cert.uwp;
#     document.body.classList.add("xbdh-uwp");
# } else {
#     utils._certType = utils.Cert.era;
#     document.body.classList.add("xbdh-era");
# }

print("Searching for getCertTypeAsync in framework.js...")
if "getCertTypeAsync" in content:
    print("Found getCertTypeAsync! Patching...")
    # Force ERA devkit mode:
    patched = content.replace(
        "if (utils._fullCertType === Microsoft.Xbox.Development.CertType.uwaDevkit)",
        "if (false /* forced ERA devkit mode */)"
    )
    # Also ensure xbdh-era is always added and xbdh-uwp is never added
    if patched != content:
        print("Replacement 1 successful.")
    else:
        print("Direct replacement failed, checking exact syntax...")
        import re
        patched = re.sub(
            r"if\s*\(\s*utils\._fullCertType\s*===\s*Microsoft\.Xbox\.Development\.CertType\.uwaDevkit\s*\)",
            "if (false)",
            content
        )
        if patched != content:
            print("Regex replacement successful!")

    with open(framework_dst, "w", encoding="utf-8") as f:
        f.write(patched)
    print("Patched framework.js written to overlay folder.")
else:
    print("getCertTypeAsync not found directly, copying framework.js as-is.")
