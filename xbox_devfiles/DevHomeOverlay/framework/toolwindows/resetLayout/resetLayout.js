// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var xbdhUtils = DevHome.Utilities;

    WinJS.UI.Pages.define("/framework/toolwindows/resetLayout/resetLayout.html", {
        _resetLayout: function () {
            xbdhUtils._Events.logUIAction("ResetLayout:ResetLayout");

            this._workspaceManager.deleteSettings();

            // Relaunch DevHome
            Microsoft.Xbox.Development.ApplicationUtilities.launch("Microsoft.Xbox.DevHome_8wekyb3d8bbwe!App forceTerminate");
        },
        _workspaceManager: null,
        ready: function (element, options) {
            this._layoutRoot = element;
            this._workspaceManager = xbdhUtils._Internal.workspaceManager;

            this._resetLayoutButton = this._layoutRoot.querySelector("#xbdh-resetworkspace-savecommand");
            this._resetLayoutButton.addEventListener("click", this._resetLayout.bind(this), false);

            this._resetLayoutButton.focus();
        },

        unload: function () {
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();