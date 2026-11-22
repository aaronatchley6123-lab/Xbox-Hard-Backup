// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    WinJS.UI.Pages.define("/framework/toolwindows/exportWorkspace/exportWorkspace.html", {
        _exportWorkspace: function () {
            DevHome.Utilities._Events.logUIAction("ExportWorkspace:ExportWorkspace");

            DevHome.Utilities._Internal.workspaceManager._exportAsync()
                .then(
                    function success() {
                        DevHome.Utilities.hideMenu();

                        // Show a confirmation dialog
                        DevHome.Utilities.showPopUp(
                            DevHome.Utilities.Resources.getString("exportWorkspaceConfirmationTitle").value,
                            DevHome.Utilities.Resources.getString("exportWorkspaceConfirmationDescription").value,
                            null,
                            null
                        );
                    }, DevHome.Utilities.defaultErrorHandler);
        },
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            // Hook up the buttons
            var exportWorkspaceButton = document.getElementById("exportworkspace-exportcommand");
            exportWorkspaceButton.addEventListener("click", this._exportWorkspace, false);

            var workspaceLabel = document.getElementById("xbdh-exportworkspace-workspacename");
            workspaceLabel.textContent = DevHome.Utilities._Internal.workspaceManager.settings.workspaces[DevHome.Utilities._Internal.workspaceManager._activeWorkspaceIndex].name;

            exportWorkspaceButton.focus();
        },

        unload: function () {
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();