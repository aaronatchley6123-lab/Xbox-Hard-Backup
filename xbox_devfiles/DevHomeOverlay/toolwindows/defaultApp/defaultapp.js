// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var devkitProperties = Windows.Xbox.System.Internal.DevelopmentKit.DevelopmentKitProperties;
    var xbdhUtils = DevHome.Utilities;

    WinJS.UI.Pages.define("/toolwindows/defaultapp/defaultapp.html", {
        _defaultAppComboBox: null,
        _handleDefaultAppChanged: function () {
            this._setDefaultApp(this._defaultAppComboBox.value);
        },
        _setDefaultApp: function (value) {
            devkitProperties.autoLaunchDevHomeInDeveloperMode = value;

            if (value) {
                xbdhUtils._Events.logUIAction("GeneralSettings:OptIntoDevHomeAutoLaunch");
            } else {
                xbdhUtils._Events.logUIAction("GeneralSettings:OptOutOfDevHomeAutoLaunch");
            }
        },
        ready: function (element, options) {
            var options = {
                value: devkitProperties.autoLaunchDevHomeInDeveloperMode,
                allowZeroAsValidValue: true,
                options: [
                    { value: true, label: "defaultAppDevHome" },
                    { value: false, label: "defaultAppRetailHome" },
                ]
            };
            // Mark the correct one as selected
            var comboBoxElement = element.querySelector("#xbdh-defaultappsettings-defaultapp");
            this._defaultAppComboBox = new DevHome.UI.ComboBox(comboBoxElement, options, "defaultAppLabel");
            this._defaultAppComboBox.addEventListener("change", this._handleDefaultAppChanged.bind(this), false);
        },

        unload: function () {
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();