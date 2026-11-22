// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var devHomeNativeUtils = Microsoft.Xbox.Tools.ConsoleExtensions.InternalDevHomeUtilities;
    var xbdhUtils = DevHome.Utilities;

    WinJS.UI.Pages.define("/toolwindows/vsDevSettings/vsDevSettings.html", {
        _handleRemoveAllPins: function () {
            try {
                devHomeNativeUtils.clearAllTrustedKeys();
            } catch (ex) { /* Swallow exception */ }
            xbdhUtils.showPopUp(
                DevHome.Utilities.Resources.getString("vsDevSettingsRemoveAllPinsTitle").value,
                DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("vsDevSettingsRemoveAllPinsDescription").value),
                null,
                null
                );
        },
        ready: function (element, options) {
            this._layoutRoot = element;
            var vsClearAllPinsButton = element.querySelector("#xbdh-vsdevsettings-vsclearallpins");

            // Events
            vsClearAllPinsButton.addEventListener("click", this._handleRemoveAllPins.bind(this), false);

            // Add behavior to textboxes
            DevHome.Utilities.addTextboxBehaviors(element);
        },

        unload: function () {
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();