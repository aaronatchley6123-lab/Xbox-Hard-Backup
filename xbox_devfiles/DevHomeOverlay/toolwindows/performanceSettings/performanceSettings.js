// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var debugUtils = Microsoft.Xbox.Development.DebugUtilities;
    var resources = DevHome.Utilities.Resources;
    var xbdhUtils = DevHome.Utilities;

    WinJS.UI.Pages.define("/toolwindows/performanceSettings/performanceSettings.html", {
        _cancelRestart: function (e) {
            var dialog = document.getElementById("xbdh-dialog").winControl;
            dialog.hide();

            // Delay reverting this to avoid keyup from dismissing the dialog.
            setTimeout(function () {
                this._refreshProfilingMode();
            }.bind(this), 500);
        },
        _promptRestart: function (e) {
            DevHome.Utilities.showPopUp(
                DevHome.Utilities.Resources.getString("performanceSettingsPromptRestartDialogTitle").value,
                DevHome.Utilities.Resources.getString("performanceSettingsProfilingPromptRestartDialogDescription").value,
                {
                    label: DevHome.Utilities.Resources.getString("commandRestartNow").value,
                    callback: this._setDesiredProfilingMode.bind(this),
                },
                {
                    label: DevHome.Utilities.Resources.getString("commandCancel").value,
                    callback: this._cancelRestart.bind(this),
                });
        },
        _reboot: function () {
            Windows.Xbox.System.Internal.Power.PowerProperties.restartConsole();
        },
        _handleSliderFocus: function () {
            this._extraTitleMemorySplitSlider.element.classList.add("xbdh-active");
        },
        _handleSliderBlur: function () {
            this._extraTitleMemorySplitSlider.element.classList.remove("xbdh-active");
        },
        _handleExtraTitleMemoryInvoked: function (ev) {
            var manageExtraTitleMemorySplitRootDiv = document.createElement("div");
            manageExtraTitleMemorySplitRootDiv.classList.add("xbdh-performancesettings-managetoolmemorysplit-overlay");
            manageExtraTitleMemorySplitRootDiv.classList.add("xbdh-overlay");
            manageExtraTitleMemorySplitRootDiv.classList.add("xbdh-overlay-short");
            var manageExtraTitleMemoryHtml =
                '<div class="xbdh-form">' +
                '  <h1>' + resources.getString("performanceSettingsManageExtraTitleMemorySplitDialogTitle").value + '</h1>' +
                '  <p id="xbdh-performancesettings-tooltilememorysplit-description">' + resources.getString("performanceSettingsManageExtraTitleMemorySplitDialogDescription").value + '</p>' +
                '  <div id="xbdh-performancesettings-tooltilememorysplit-slider-container" class="xbdh-performancesettings-tooltilememorysplit-slider-container">' +
                '      <div id="xbdh-performancesettings-tooltilememorysplit-slider" class="xbdh-performancesettings-tooltilememorysplit-slider" data-win-control="Microsoft.Xbox.Slider" data-win-options="{ min: 0, max: 100, value: 50 }"></div>' +
                '      <div id="xbdh-performancesettings-tooltilememorysplit-minvalue" class="xbdh-performancesettings-tooltilememorysplit-minvalue"></div>' +
                '      <div id="xbdh-performancesettings-tooltilememorysplit-maxvalue" class="xbdh-performancesettings-tooltilememorysplit-maxvalue"></div>' +
                '  </div>' +
                '  <div class="xbdh-spacer-medium"></div>' +
                '  <button id="xbdh-performancesettings-tooltilememorysplit-savecommand" type="button">' + resources.getString("commandSave").value + '</button>' +
                '</div>';

            var manageExtraTitleMemoryOverlay = new DevHome.UI.Overlay(manageExtraTitleMemorySplitRootDiv, { html: manageExtraTitleMemoryHtml });

            // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
            // to get reset to the main workspace after this function executes, which we don't want.
            setImmediate(function () {
                if (manageExtraTitleMemoryOverlay) {
                    // We need to set the overlay to the active element, otherwise hitting B won't dismiss it because focus 
                    // won't be on the overlay.
                    manageExtraTitleMemoryOverlay.show();

                    this._extraTitleMemorySplitSlider = new DevHome.UI.Slider(manageExtraTitleMemorySplitRootDiv.querySelector("#xbdh-performancesettings-tooltilememorysplit-slider"), { min: 0, max: 100, value: 50 });
                    this._sliderMinValue = manageExtraTitleMemorySplitRootDiv.querySelector("#xbdh-performancesettings-tooltilememorysplit-minvalue");
                    this._sliderMaxValue = manageExtraTitleMemorySplitRootDiv.querySelector("#xbdh-performancesettings-tooltilememorysplit-maxvalue");
                    this._arrow = manageExtraTitleMemorySplitRootDiv.querySelector(".xbox-slider-currentvalue-arrow");

                    // Hook up click handlers
                    var saveButton = manageExtraTitleMemorySplitRootDiv.querySelector("#xbdh-performancesettings-tooltilememorysplit-savecommand");
                    saveButton.addEventListener("click", this._saveTitleMemorySplit.bind(this), false);

                    this._extraTitleMemorySplitSlider.element.addEventListener("focus", this._handleSliderFocus.bind(this), false);
                    this._extraTitleMemorySplitSlider.element.addEventListener("blur", this._handleSliderBlur.bind(this), false);

                    this._refreshSlider();
                    this._extraTitleMemorySplitSlider.element.focus();
                }
            }.bind(this));
        },
        _refreshSlider: function () {
            // Update the slider's values
            this._extraTitleMemorySplitSlider.step = 512;

            var minValue = 0;
            var currentValue = debugUtils.extraTitleMemory;
            var maxValue = debugUtils.extraTitleMemoryMaximum;

            this._sliderMinValue.textContent = resources._formatString(
                resources.getString("performanceSettingsManageExtraTitleMemorySplitMinLabel").value,
                 (currentValue / 1024));
            this._extraTitleMemorySplitSlider.min = minValue;

            this._sliderMaxValue.textContent = resources._formatString(
                resources.getString("performanceSettingsManageExtraTitleMemorySplitMaxLabel").value,
                ((maxValue - currentValue) / 1024));
            this._extraTitleMemorySplitSlider.max = maxValue;

            this._extraTitleMemorySplitSlider.value = currentValue;
            this._arrow.textContent = currentValue + " GB";
            this._extraTitleMemorySplitSlider._element.addEventListener("change", function (ev) {
                var currentValue = this._extraTitleMemorySplitSlider.value;
                this._arrow.textContent = (currentValue / 1024) + " GB";
                this._sliderMinValue.textContent = resources._formatString(
                    resources.getString("performanceSettingsManageExtraTitleMemorySplitMinLabel").value,
                    (currentValue / 1024));
                this._sliderMaxValue.textContent = resources._formatString(
                    resources.getString("performanceSettingsManageExtraTitleMemorySplitMaxLabel").value,
                    ((maxValue - currentValue) / 1024));
            }.bind(this), false);
        },
        _saveTitleMemorySplit: function () {

            xbdhUtils.hideVisibleOverlays();

            if (this._extraTitleMemorySplitSlider.value !== debugUtils.extraTitleMemory) {
                try {
                    debugUtils.extraTitleMemory = this._extraTitleMemorySplitSlider.value;

                    // Prompt for a reboot. There are some situations on an Xbox One X devkit where a
                    // reboot might not be needed but consistency is better than making all the checks.
                    DevHome.Utilities.showPopUp(
                        DevHome.Utilities.Resources.getString("performanceSettingsPromptRestartDialogTitle").value,
                        DevHome.Utilities.Resources.getString("performanceSettingsExtraTitleMemoryPromptRestartDialogDescription").value,
                        {
                            label: DevHome.Utilities.Resources.getString("commandRestartNow").value,
                            callback: this._reboot.bind(this),
                        },
                        {
                            label: DevHome.Utilities.Resources.getString("commandCancel").value,
                            callback: this._cancelRestart.bind(this),
                        });
                } catch (ex) {
                    xbdhUtils._Events.logUIAction("PerformanceSettings:SetExtraTitleMemoryFailure", ex.number);
                }
            }
        },
        _handleProfilingModeEnabledChanged: function () {
            if (debugUtils.profilingMode === Microsoft.Xbox.Development.ProfilingMode.on && this._profilingModeEnabledCheckBox.checked) {
                return;
            }
            if (debugUtils.profilingMode !== Microsoft.Xbox.Development.ProfilingMode.on && !this._profilingModeEnabledCheckBox.checked) {
                return;
            }
            this._targetProfilingModeValue = this._profilingModeEnabledCheckBox.checked ? Microsoft.Xbox.Development.ProfilingMode.on : Microsoft.Xbox.Development.ProfilingMode.off;
            this._promptRestart();
        },
        _setDesiredProfilingMode: function () {
            try {
                xbdhUtils._Events.logUIAction("DebugSettings:ChangeDebugMemoryEnabled", this._targetProfilingModeValue);
                debugUtils.profilingMode = this._targetProfilingModeValue;
                this._reboot();
            } catch (e) {
                DevHome.Utilities.showError(e);
            }
        },
        _refreshProfilingMode: function () {
            this._profilingModeEnabledCheckBox.checked = debugUtils.profilingMode === Microsoft.Xbox.Development.ProfilingMode.on;
        },
        ready: function (element, options) {
            this._layoutRoot = element;

            this._profilingModeEnabledCheckboxElement = element.querySelector("#xbdh-performancesettings-profilingmode");
            this._profilingModeEnabledCheckBox = new DevHome.UI.CheckBox(this._profilingModeEnabledCheckboxElement);
            this._profilingModeEnabledCheckBox.addEventListener("change", this._handleProfilingModeEnabledChanged.bind(this), false);

            var manageExtraTitleMemoryButton = document.getElementById("xbdh-performancesettings-changetoolmemorysplit");
            manageExtraTitleMemoryButton.addEventListener("click", this._handleExtraTitleMemoryInvoked.bind(this), false);

            this._refreshProfilingMode();

            var profilingModeCheckbox = document.getElementById("xbdh-performancesettings-profilingmode-checkbox");
            var profilingModeLabel = document.getElementById("xbdh-performancesettings-profilingmode-label");


            var showDisabledWarning = false;
            var fullProfilingModeString = DevHome.Utilities.Resources.getString("performanceSettingsEnableProfilingMemory").value;
            var debugMemoryOnlyString = DevHome.Utilities.Resources.getString("performanceSettingsEnableDebugMemory").value;
            var pixMemoryOnlyString = DevHome.Utilities.Resources.getString("performanceSettingsEnablePixMemory").value;

            // Many of these options are forced on/off. This logic should match the logic in
            // the DebugSettingProvider in the OS repo which controls this for WDP/XBOM.
            if (xbdhUtils._consoleType === xbdhUtils.ConsoleType.dante) {

                if (debugUtils.consoleMode === Microsoft.Xbox.Development.ConsoleMode.default || debugUtils.consoleMode === Microsoft.Xbox.Development.ConsoleMode.dante
                    || debugUtils.consoleMode === Microsoft.Xbox.Development.ConsoleMode.lockhart40GB) {
                    // Dante and Lockhart40GB mode doesn't allow setting profiling mode or extra title memory
                    profilingModeCheckbox.disabled = true;
                    manageExtraTitleMemoryButton.disabled = true;
                    profilingModeLabel.textContent = fullProfilingModeString;
                    showDisabledWarning = true;
                } else if (debugUtils.consoleMode === Microsoft.Xbox.Development.ConsoleMode.lockhart) {
                    // Lockhart Retail allows PIX memory only
                    manageExtraTitleMemoryButton.disabled = true;
                    profilingModeLabel.textContent = pixMemoryOnlyString;
                    showDisabledWarning = true;
                } else {
                    // Other Scarlett modes don't allow disabling PIX memory
                    profilingModeLabel.textContent = debugMemoryOnlyString;
                }
            } else if (xbdhUtils._consoleType === xbdhUtils.ConsoleType.scorpioDevkit) {
                // Xbox One X Devkit (Chuckwalla) exposes Profiling Mode as Debug Memory
                profilingModeLabel.textContent = debugMemoryOnlyString;
            } else if (xbdhUtils._consoleType === xbdhUtils.ConsoleType.lockhart) {
                // Lockhart Retail allows PIX memory only
                manageExtraTitleMemoryButton.disabled = true;
                profilingModeLabel.textContent = pixMemoryOnlyString;
                showDisabledWarning = true;
            } else {
                profilingModeLabel.textContent = fullProfilingModeString;
            }

            manageExtraTitleMemoryButton.disabled = manageExtraTitleMemoryButton.disabled || !profilingModeCheckbox.checked;

            if (showDisabledWarning) {
                var disabledSettingsLabel = document.getElementById("xbdh-performancesettings-disabledsettings-label");
                disabledSettingsLabel.classList.remove("xbdh-hidden");
            }
        }
    });
})();