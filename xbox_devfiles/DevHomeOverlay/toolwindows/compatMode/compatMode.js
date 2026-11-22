// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var consoleMode = Microsoft.Xbox.Development.ConsoleMode;
    var debugUtils = Microsoft.Xbox.Development.DebugUtilities;
    var storageUtils = Microsoft.Xbox.Development.StorageUtilities;
    var xbdhUtils = DevHome.Utilities;
    var nativeUtils = xbdhUtils.getDevHomeNativeUtilities();

    var _currentCompatMode;
    var _compatModeEnum = {
        unknown: "unknown",
        default: "default",
        anacondaProfiling: "anacondaProfiling",
        lockhart: "lockhart",
        lockhartProfiling: "lockhartProfiling",
        xcloud: "xcloud",
        dante: "dante",
        scorpioDevkit: "scorpioDevkit",
        scorpioDevkit44: "scorpioDevkit44",
        scorpioRetail: "scorpioRetail",
        xboxOneS: "xboxOneS",
        xboxOne: "xboxOne",
        lockhart40GB: "lockhart40GB"
    };
    var strings = {
        compatModeUnknownLabel: "",
        compatModeUnknownDescription: "",
        compatModeDefaultLabel: "",
        compatModeDefaultDescription: "",
        compatModeAnacondaLabel: "",
        compatModeAnacondaDescription: "",
        compatModeAnacondaProfilingLabel: "",
        compatModeAnacondaProfilingDescription: "",
        compatModeLockhartLabel: "",
        compatModeLockhartDescription: "",
        compatModeLockhartProfilingLabel: "",
        compatModeLockhartProfilingDescription: "",
        compatModeXCloudLabel: "",
        compatModeXCloudDescription: "",
        compatModeDanteLabel: "",
        compatModeDanteDescription: "",
        compatModeScorpioDevkitLabel: "",
        compatModeScorpioDevkitDescription: "",
        compatModeScorpioDevkit44Label: "",
        compatModeScorpioDevkit44Description: "",
        compatModeScorpioRetailLabel: "",
        compatModeScorpioRetailDescription: "",
        compatModeScorpioXboxOneSLabel: "",
        compatModeScorpioXboxOneSDescription: "",
        compatModeScorpioXboxOneLabel: "",
        compatModeScorpioXboxOneDescription: "",
        compatModeLockhart40GbLabel: "",
        compatModeLockhart40GbDescription: ""
    };

    WinJS.UI.Pages.define("/toolwindows/compatMode/compatMode.html", {
        _cancelRestart: function (e) {
            var dialog = document.getElementById("xbdh-dialog").winControl;
            dialog.hide();
            this._refreshCompatModeAsync();
        },
        _promptRestart: function (e) {
            DevHome.Utilities.showPopUp(
                DevHome.Utilities.Resources.getString("compatModePromptRestartTitle").value,
                DevHome.Utilities.Resources.getString("compatModePromptRestartDescription").value,
                {
                    label: DevHome.Utilities.Resources.getString("commandRestartNow").value,
                    callback: this._setCompatMode.bind(this),
                },
                {
                    label: DevHome.Utilities.Resources.getString("commandCancel").value,
                    callback: this._cancelRestart.bind(this),
                });
        },
        _reboot: function () {
            Windows.Xbox.System.Internal.Power.PowerProperties.restartConsole();
        },
        _handleCompatModeSelectionChanged: function (ev) {
            this._newCompatMode = this._compatModeComboBox.value;
            if (_currentCompatMode === this._newCompatMode) {
                return;
            }
            // Show the reboot dialog
            this._promptRestart();
        },
        _refreshCompatModeAsync: async function () {
            _currentCompatMode = this._getCompatModeFriendlyName();
            this._compatModeComboBox.value = _currentCompatMode;
            switch (_currentCompatMode) {
                case _compatModeEnum.anacondaProfiling:
                    this._compatModeSubtext.textContent = strings.compatModeAnacondaProfilingDescription;
                    this._titleCompatOverrideCheckboxElement.style.display = "block";
                    break;
                case _compatModeEnum.lockhart:
                    this._compatModeSubtext.textContent = strings.compatModeLockhartDescription;
                    this._titleCompatOverrideCheckboxElement.style.display = "block";
                    break;
                case _compatModeEnum.lockhartProfiling:
                    this._compatModeSubtext.textContent = strings.compatModeLockhartProfilingDescription;
                    this._titleCompatOverrideCheckboxElement.style.display = "block";
                    break;
                case _compatModeEnum.xcloud:
                    this._compatModeSubtext.textContent = strings.compatModeXCloudDescription;
                    this._titleCompatOverrideCheckboxElement.style.display = "block";
                    break;
                case _compatModeEnum.dante:
                    this._compatModeSubtext.textContent = strings.compatModeDanteDescription;
                    this._titleCompatOverrideCheckboxElement.style.display = "block";
                    break;
                case _compatModeEnum.scorpioDevkit:
                    this._compatModeSubtext.textContent = strings.compatModeScorpioDevkitDescription;
                    this._titleCompatOverrideCheckboxElement.style.display = "block";
                    break;
                case _compatModeEnum.scorpioDevkit44:
                    this._compatModeSubtext.textContent = strings.compatModeScorpioDevkit44Description;
                    this._titleCompatOverrideCheckboxElement.style.display = "block";
                    break;
                case _compatModeEnum.scorpioRetail:
                    this._compatModeSubtext.textContent = strings.compatModeScorpioRetailDescription;
                    this._titleCompatOverrideCheckboxElement.style.display = "block";
                    break;
                case _compatModeEnum.xboxOneS:
                    this._compatModeSubtext.textContent = strings.compatModeScorpioXboxOneSDescription;
                    this._titleCompatOverrideCheckboxElement.style.display = "none";
                    break;
                case _compatModeEnum.xboxOne:
                    this._compatModeSubtext.textContent = strings.compatModeScorpioXboxOneDescription;
                    this._titleCompatOverrideCheckboxElement.style.display = "none";
                    break;
                case _compatModeEnum.lockhart40GB:
                    this._compatModeSubtext.textContent = strings.compatModeLockhart40GbDescription;
                    this._titleCompatOverrideCheckboxElement.style.display = "block";
                    break;
                case _compatModeEnum.default:
                    this._compatModeSubtext.textContent = strings.compatModeDefaultDescription;
                    this._titleCompatOverrideCheckboxElement.style.display = xbdhUtils._consoleType >= xbdhUtils.ConsoleType.scorpioRetail ? "block" : "none";
                    break;
                case _compatModeEnum.unknown:
                default:
                    this._compatModeSubtext.textContent = strings.compatModeUnknownDescription;
                    this._titleCompatOverrideCheckboxElement.style.display = "none";
                    // No-op
                    break;
            };
            this._titleCompatOverrideCheckbox.checked = debugUtils.titleCompatOverride;

            // Do some additional check and display a warning if necessary
            if (debugUtils.extraTitleMemory > 0) {
                this._warningExtraMemoryText.textContent = DevHome.Utilities.Resources.getString("compatModeExtraMemoryWarning").value;
                this._warningExtraMemoryText.classList.remove("xbdh-hidden");
            } else {
                this._warningExtraMemoryText.classList.add("xbdh-hidden");
            }
            // Check the storage device
            var availableDevices = await nativeUtils.getStorageDevicesAsync();
            var defaultDevice = "";
            var defaultDeploymentXCrd;
            try {
                defaultDeploymentXCrd = await nativeUtils.getDefaultDeploymentCrdIdAsync();
            } catch (e) {
                // Do nothing. defaultDevice won't be initialized but that's okay because it's disconnected.
            }
            for (var i = 0, len = availableDevices.length; i < len; ++i) {
                if (availableDevices[i].xcrdId === defaultDeploymentXCrd) {
                    defaultDevice = availableDevices[i].deviceFriendlyName;
                }
            }
            if (defaultDevice !== "Retail") {
                this._warningStorageDriveText.textContent = DevHome.Utilities.Resources._formatString(
                    DevHome.Utilities.Resources.getString("compatModeDefaultStorageDriveWarning").value,
                    defaultDevice
                );
                this._warningStorageDriveText.classList.remove("xbdh-hidden");
            } else {
                this._warningStorageDriveText.classList.add("xbdh-hidden");
            }
        },
        _setCompatMode: function () {
            switch (this._newCompatMode) {
                case _compatModeEnum.default:
                    debugUtils.consoleMode = consoleMode.default;
                    break;
                case _compatModeEnum.anacondaProfiling:
                    debugUtils.consoleMode = consoleMode.anacondaProfiling;
                    break;
                case _compatModeEnum.lockhart:
                    debugUtils.consoleMode = consoleMode.lockhart;
                    break;
                case _compatModeEnum.lockhartProfiling:
                    debugUtils.consoleMode = consoleMode.lockhartProfiling;
                    break;
                case _compatModeEnum.xcloud:
                    debugUtils.consoleMode = consoleMode.xCloud;
                    break;
                case _compatModeEnum.dante:
                    debugUtils.consoleMode = consoleMode.dante;
                    break;
                case _compatModeEnum.scorpioDevkit:
                    debugUtils.consoleMode = consoleMode.scorpioDevkit;
                    break;
                case _compatModeEnum.scorpioDevkit44:
                    debugUtils.consoleMode = consoleMode.scorpioDevkit44;
                    break;
                case _compatModeEnum.scorpioRetail:
                    debugUtils.consoleMode = consoleMode.scorpioRetail;
                    break;
                case _compatModeEnum.xboxOne:
                    debugUtils.consoleMode = consoleMode.xboxOne;
                    break;
                case _compatModeEnum.xboxOneS:
                    debugUtils.consoleMode = consoleMode.xboxOneS;
                    break;
                case _compatModeEnum.lockhart40GB:
                    debugUtils.consoleMode = consoleMode.lockhart40GB;
                    break;
                case _compatModeEnum.unknown:
                default:
                    // No-op
                    break;
            };
            this._refreshCompatModeAsync();
            this._reboot();
        },
        _getCompatModeFriendlyName: function () {
            var compatMode = _compatModeEnum.unknown;

            try {
                switch (debugUtils.consoleMode) {
                    case consoleMode.default:
                        compatMode = _compatModeEnum.default;
                        break;
                    case consoleMode.anacondaProfiling:
                        compatMode = _compatModeEnum.anacondaProfiling;
                        break;
                    case consoleMode.lockhart:
                        compatMode = _compatModeEnum.lockhart;
                        break;
                    case consoleMode.lockhartProfiling:
                        compatMode = _compatModeEnum.lockhartProfiling;
                        break;
                    case consoleMode.xCloud:
                        compatMode = _compatModeEnum.xcloud;
                        break;
                    case consoleMode.dante:
                        compatMode = _compatModeEnum.dante;
                        break;
                    case consoleMode.scorpioRetail:
                        compatMode = _compatModeEnum.scorpioRetail;
                        break;
                    case consoleMode.scorpioDevkit:
                        compatMode = _compatModeEnum.scorpioDevkit;
                        break;
                    case consoleMode.scorpioDevkit44:
                        compatMode = _compatModeEnum.scorpioDevkit44;
                        break;
                    case consoleMode.xboxOne:
                        compatMode = _compatModeEnum.xboxOne;
                        break;
                    case consoleMode.xboxOneS:
                        compatMode = _compatModeEnum.xboxOneS;
                        break;
                    case consoleMode.lockhart40GB:
                        compatMode = _compatModeEnum.lockhart40GB;
                        break;
                    default:
                        // No-op
                        break;
                };
            } catch (ex) { } // Swallow exception. If this fails user can try again.

            return compatMode;
        },
        _handleTitleCompatOverrideChanged: function () {
            debugUtils.titleCompatOverride = this._titleCompatOverrideCheckbox.checked;
        },
        ready: function (element, options) {
            this._layoutRoot = element;

            strings.compatModeUnknownLabel = DevHome.Utilities.Resources.getString("compatModeUnknownLabel").value;
            strings.compatModeUnknownDescription = DevHome.Utilities.Resources.getString("compatModeUnknownDescription").value;
            strings.compatModeDefaultLabel = DevHome.Utilities.Resources.getString("compatModeDefaultLabel").value;
            strings.compatModeDefaultDescription = DevHome.Utilities.Resources.getString("compatModeDefaultDescription").value;
            strings.compatModeAnacondaLabel = DevHome.Utilities.Resources.getString("compatModeAnacondaLabel").value;
            strings.compatModeAnacondaDescription = DevHome.Utilities.Resources.getString("compatModeAnacondaDescription").value;
            strings.compatModeAnacondaProfilingLabel = DevHome.Utilities.Resources.getString("compatModeAnacondaProfilingLabel").value;
            strings.compatModeAnacondaProfilingDescription = DevHome.Utilities.Resources.getString("compatModeAnacondaProfilingDescription").value;
            strings.compatModeLockhartLabel = DevHome.Utilities.Resources.getString("compatModeLockhartLabel").value;
            strings.compatModeLockhartDescription = DevHome.Utilities.Resources.getString("compatModeLockhartDescription").value;
            strings.compatModeLockhartProfilingLabel = DevHome.Utilities.Resources.getString("compatModeLockhartProfilingLabel").value;
            strings.compatModeLockhartProfilingDescription = DevHome.Utilities.Resources.getString("compatModeLockhartProfilingDescription").value;
            strings.compatModeXCloudLabel = DevHome.Utilities.Resources.getString("compatModeXCloudLabel").value;
            strings.compatModeXCloudDescription = DevHome.Utilities.Resources.getString("compatModeXCloudDescription").value;
            strings.compatModeDanteLabel = DevHome.Utilities.Resources.getString("compatModeDanteLabel").value;
            strings.compatModeDanteDescription = DevHome.Utilities.Resources.getString("compatModeDanteDescription").value;
            strings.compatModeScorpioDevkitLabel = DevHome.Utilities.Resources.getString("compatModeScorpioDevkitLabel").value;
            strings.compatModeScorpioDevkitDescription = DevHome.Utilities.Resources.getString("compatModeScorpioDevkitDescription").value;
            strings.compatModeScorpioDevkit44Label = DevHome.Utilities.Resources.getString("compatModeScorpioDevkit44Label").value;
            strings.compatModeScorpioDevkit44Description = DevHome.Utilities.Resources.getString("compatModeScorpioDevkit44Description").value;
            strings.compatModeScorpioRetailLabel = DevHome.Utilities.Resources.getString("compatModeScorpioRetailLabel").value;
            strings.compatModeScorpioRetailDescription = DevHome.Utilities.Resources.getString("compatModeScorpioRetailDescription").value;
            strings.compatModeScorpioXboxOneSLabel = DevHome.Utilities.Resources.getString("compatModeScorpioXboxOneSLabel").value;
            strings.compatModeScorpioXboxOneSDescription = DevHome.Utilities.Resources.getString("compatModeScorpioXboxOneSDescription").value;
            strings.compatModeScorpioXboxOneLabel = DevHome.Utilities.Resources.getString("compatModeScorpioXboxOneLabel").value;
            strings.compatModeScorpioXboxOneDescription = DevHome.Utilities.Resources.getString("compatModeScorpioXboxOneDescription").value;
            strings.compatModeLockhart40GbLabel = DevHome.Utilities.Resources.getString("compatModeLockhart40GbLabel").value;
            strings.compatModeLockhart40GbDescription = DevHome.Utilities.Resources.getString("compatModeLockhart40GbDescription").value;

            var currentHardwareLabel = null;

            // Determine current hardware compat mode label
            if (debugUtils.consoleMode === consoleMode.dante) {
                currentHardwareLabel = strings.compatModeDanteLabel;
            }
            else if (debugUtils.consoleMode === consoleMode.scarlettOther) {
                currentHardwareLabel = strings.compatModeAnacondaLabel;
            }
            else if (debugUtils.consoleMode === consoleMode.lockhart) {
                currentHardwareLabel = strings.compatModeLockhartLabel;
            }
            else if (debugUtils.consoleMode === consoleMode.scorpioDevkit) {
                currentHardwareLabel = strings.compatModeScorpioDevkitLabel;
            }
            else if (debugUtils.consoleMode === consoleMode.scorpioDevkit44) {
                currentHardwareLabel = strings.compatModeScorpioDevkit44Label;
            }
            else if (debugUtils.consoleMode === consoleMode.scorpioRetail) {
                currentHardwareLabel = strings.compatModeScorpioRetailLabel;
            }
            else if (debugUtils.consoleMode === consoleMode.xboxOneS) {
                currentHardwareLabel = strings.compatModeScorpioXboxOneSLabel;
            }
            else if (debugUtils.consoleMode === consoleMode.xboxOne) {
                currentHardwareLabel = strings.compatModeScorpioXboxOneLabel;
            }
            else if (debugUtils.consoleMode === consoleMode.lockhart40GB) {
                currentHardwareLabel = strings.compatModeLockhart40GbLabel;
            }

            // Append current hardware type to default label and description for values like "Default (Xbox One X Devkit)".
            if (currentHardwareLabel) {
                let formatAppendSubtextString = DevHome.Utilities.Resources.getString("appendSubtext").value;
                strings.compatModeDefaultLabel = DevHome.Utilities.Resources._formatString(formatAppendSubtextString, strings.compatModeDefaultLabel, currentHardwareLabel);
                strings.compatModeDefaultDescription = DevHome.Utilities.Resources._formatString(formatAppendSubtextString, strings.compatModeDefaultDescription, currentHardwareLabel);
            }

            // Set all options as hidden read-only so they can be displayed in an error scenario.
            var optionsArray = [
                { value: _compatModeEnum.unknown, label: strings.compatModeUnknownLabel, hidden: true },
                { value: _compatModeEnum.default, label: strings.compatModeDefaultLabel, hidden: true },
                { value: _compatModeEnum.anacondaProfiling, label: strings.compatModeAnacondaProfilingLabel, hidden: true },
                { value: _compatModeEnum.dante, label: strings.compatModeDanteLabel, hidden: true },
                { value: _compatModeEnum.lockhart, label: strings.compatModeLockhartLabel, hidden: true },
                { value: _compatModeEnum.lockhartProfiling, label: strings.compatModeLockhartProfilingLabel, hidden: true },
                { value: _compatModeEnum.scorpioDevkit, label: strings.compatModeScorpioDevkitLabel, hidden: true },
                { value: _compatModeEnum.scorpioDevkit44, label: strings.compatModeScorpioDevkit44Label, hidden: true },
                { value: _compatModeEnum.xboxOneS, label: strings.compatModeScorpioXboxOneSLabel, hidden: true },
                { value: _compatModeEnum.xboxOne, label: strings.compatModeScorpioXboxOneLabel, hidden: true },
                { value: _compatModeEnum.xcloud, label: strings.compatModeXCloudLabel, hidden: true },
                { value: _compatModeEnum.lockhart40GB, label: strings.compatModeLockhart40GbLabel, hidden: true }
                
            ];

            // Dante console's don't have an explicit 'default' mode, and use Anaconda Profiling by default.
            if (xbdhUtils._consoleType !== xbdhUtils.ConsoleType.dante) {
                let targetOption = optionsArray.find(({ value }) => value === _compatModeEnum.default);
                if (targetOption) {
                    targetOption.hidden = false;
                }
            }

            // Construct options array to include lower hardware types.
            if (xbdhUtils._consoleType === xbdhUtils.ConsoleType.dante) {
                // Anaconda, Lockhart and Dante.
                let selectableOptions = optionsArray.filter(({ value }) => value == _compatModeEnum.anacondaProfiling || value == _compatModeEnum.lockhartProfiling || value == _compatModeEnum.dante || value == _compatModeEnum.lockhart40GB);
                selectableOptions.forEach((el) => { el.hidden = false; })
            } else if (xbdhUtils._consoleType === xbdhUtils.ConsoleType.edinburgh) {
                // Anaconda and Lockhart.
                let selectableOptions = optionsArray.filter(({ value }) => value == _compatModeEnum.anacondaProfiling || value == _compatModeEnum.lockhartProfiling);
                selectableOptions.forEach((el) => { el.hidden = false; })
            } else if (xbdhUtils._consoleType <= xbdhUtils.ConsoleType.scorpioDevkit) { // Anything > Scorpio other than Dante/Edinburgh has no Console Modes.
                if (xbdhUtils._consoleType === xbdhUtils.ConsoleType.scorpioDevkit) {
                    let targetOption = optionsArray.find(({ value }) => value === _compatModeEnum.scorpioDevkit44);
                    if (targetOption) {
                        targetOption.hidden = false;
                    }
                }
                // We're intentionally hiding Xbox One X Retail from the UI. It has some tooling complications.
                // It's still allowed at the XbConfig level for fine tuning performance in very limited scenarios.
                //if (xbdhUtils._consoleType > xbdhUtils.ConsoleType.scorpioRetail) {
                //    optionsArray.push({ value: _compatModeEnum.scorpioRetail, label: strings.compatModeScorpioRetailLabel });
                //  let targetOption = optionsArray.find(({ value }) => value === compatModeEnum.scorpioRetail);
                //  if (targetOption) {
                //    targetOption.hidden = false;
                //  }
                //}
                if (xbdhUtils._consoleType > xbdhUtils.ConsoleType.xboxOneS) {
                    let targetOption = optionsArray.find(({ value }) => value === _compatModeEnum.xboxOneS);
                    if (targetOption) {
                        targetOption.hidden = false;
                    }
                }
                if (xbdhUtils._consoleType > xbdhUtils.ConsoleType.xboxOne) {
                    let targetOption = optionsArray.find(({ value }) => value === _compatModeEnum.xboxOne);
                    if (targetOption) {
                        targetOption.hidden = false;
                    }
                }
            }

            // Dante console's don't have an explicit 'default' mode, and use Anaconda Profiling by default.
            let defaultValue = (xbdhUtils._consoleType === xbdhUtils.ConsoleType.dante) ? _compatModeEnum.anacondaProfiling : _compatModeEnum.default;

            var options = {
                value: defaultValue,
                options: optionsArray
            };

            // Populate the dropdown with hardcoded values
            var compatModeElement = element.querySelector("#xbdh-compatmode-mode");

            this._compatModeSubtext = element.querySelector("#xbdh-compatmode-subtext");
            this._warningExtraMemoryText = element.querySelector("#xbdh-compatmode-warningextramemorytext");
            this._warningStorageDriveText = element.querySelector("#xbdh-compatmode-warningstoragedrivetext");

            this._compatModeComboBox = new DevHome.UI.ComboBox(compatModeElement, options, "scorpioCompatMode");
            this._compatModeComboBox.addEventListener("change", this._handleCompatModeSelectionChanged.bind(this), false);

            this._titleCompatOverrideCheckboxElement = element.querySelector("#xbdh-compatmode-titlecompat");
            this._titleCompatOverrideCheckbox = new DevHome.UI.CheckBox(this._titleCompatOverrideCheckboxElement);
            this._titleCompatOverrideCheckbox.checked = debugUtils.titleCompatOverride;

            // Events
            this._titleCompatOverrideCheckbox.addEventListener("change", this._handleTitleCompatOverrideChanged.bind(this), false);

            this._refreshCompatModeAsync();

            // Disable on original Xbox One as console mode is not changeable.
            if (xbdhUtils._consoleType === xbdhUtils.ConsoleType.xboxOne) {
                this._compatModeComboBox.disabled = true;
                this._compatModeSubtext.classList.add("xbdh-error");
                this._compatModeSubtext.textContent = DevHome.Utilities.Resources.getString("compatModeDisabledMessage").value;
            } else {
                var infoElement = document.getElementById("xbdh-compatmode-info");
                if (infoElement) {
                    infoElement.style.display = "block";
                }
            }
        }
    });
})();