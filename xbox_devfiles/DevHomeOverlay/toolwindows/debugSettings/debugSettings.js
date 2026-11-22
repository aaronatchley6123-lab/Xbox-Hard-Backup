// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var crashDumpType = Microsoft.Xbox.Tools.ConsoleExtensions.CrashDumpType;
    var systemProperties = Microsoft.Xbox.Tools.ConsoleExtensions.SystemConfigurationProperties;
    var xbdhUtils = DevHome.Utilities;

    WinJS.UI.Pages.define("/toolwindows/debugSettings/debugSettings.html", {
        _crashDumpTypeCheckBox: null,
        _handleCrashDumpTypeChanged: function () {
            this._crashDumpTypeComboBox.value;
            this._setCrashDumpType(this._crashDumpTypeComboBox.value);
        },
        _setCrashDumpType: function (value) {
            DevHome.Utilities._Events.logUIAction("DebugSettings:SetCrashDumpType", systemProperties.crashDumpType);
            systemProperties.crashDumpType = value;
        },
        ready: function (element, options) {
            var options = {
                value: systemProperties.crashDumpType,
                allowZeroAsValidValue: true,
                options: [
                    { value: crashDumpType.none, label: "debugSettingsCrashDumpTypeNone" },
                    { value: crashDumpType.triage, label: "debugSettingsCrashDumpTypeTriage" },
                    { value: crashDumpType.mini, label: "debugSettingsCrashDumpTypeMini" },
                    { value: crashDumpType.heap, label: "debugSettingsCrashDumpTypeHeap" }
                ]
            };
            var comboBoxElement = element.querySelector("#xbdh-debugsettings-crashdumptype");
            this._crashDumpTypeComboBox = new DevHome.UI.ComboBox(comboBoxElement, options, "debugSettingsCrashDumpLabel");
            this._crashDumpTypeComboBox.addEventListener("change", this._handleCrashDumpTypeChanged.bind(this), false);
        },

        unload: function () {
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();