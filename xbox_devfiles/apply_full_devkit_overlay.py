import re

src_path = "X:\\Apps\\DevHome\\framework\\js\\framework.js"
dst_path = "D:\\DevelopmentFiles\\DevHomeOverlay\\framework\\js\\framework.js"

with open(src_path, "r", encoding="utf-8", errors="ignore") as f:
    code = f.read()

print("Original length:", len(code))

# 1. Force _getDefaultSettingsAsync to ALWAYS use _getDefaultAdvancedDevkitConfigurationAsync
old_get_default = """_WorkspaceManager.prototype._getDefaultSettingsAsync = async function (shouldSave) {
            if (utils._certType === utils.Cert.uwp) {
                utils._settings = await this._getDefaultUWPConfigurationAsync();
            } else {
                if (utils._consoleType === utils.ConsoleType.scorpioDevkit || utils._consoleType === utils.ConsoleType.dante) {
                    utils._settings = await this._getDefaultAdvancedDevkitConfigurationAsync();
                } else {
                    utils._settings = await this._getDefaultERAConfigurationAsync();
                }
            }"""

new_get_default = """_WorkspaceManager.prototype._getDefaultSettingsAsync = async function (shouldSave) {
            utils._certType = utils.Cert.era;
            utils._settings = await this._getDefaultAdvancedDevkitConfigurationAsync();"""

if old_get_default in code:
    code = code.replace(old_get_default, new_get_default)
    print("Replaced _getDefaultSettingsAsync successfully!")
else:
    print("WARNING: Exact match for _getDefaultSettingsAsync failed, using regex")
    code = re.sub(
        r"_WorkspaceManager\.prototype\._getDefaultSettingsAsync\s*=\s*async\s*function\s*\(shouldSave\)\s*\{[\s\S]*?utils\._settings\s*=\s*await\s*this\._getDefaultERAConfigurationAsync\(\);\s*\}\s*\}",
        new_get_default,
        code
    )

# 2. Force _loadSettingsAsync to ALWAYS load default settings (ignore cached UWP layout)
# Look for: if (utils._localSettings.values["xbdh-customized"])
old_customized = 'if (utils._localSettings.values["xbdh-customized"])'
new_customized = 'if (false && utils._localSettings.values["xbdh-customized"])'
if old_customized in code:
    code = code.replace(old_customized, new_customized)
    print("Disabled xbdh-customized cache successfully!")

# 3. Force utils._certType to era and classList to xbdh-era
old_cert = "if (utils._fullCertType === Microsoft.Xbox.Development.CertType.uwaDevkit)"
new_cert = "if (false)"
if old_cert in code:
    code = code.replace(old_cert, new_cert)
    print("Replaced getCertType condition successfully!")

# 4. Save to overlay
with open(dst_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Saved patched framework.js to overlay successfully!")
