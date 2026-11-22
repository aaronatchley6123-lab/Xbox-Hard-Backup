// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    WinJS.UI.Pages.define("/framework/toolwindows/deleteWorkspace/deleteWorkspace.html", {
        _deleteAsync: async function () {
            DevHome.Utilities._Events.logUIAction("DeleteWorkspace:DeleteWorkspace");

            // Remove the workspace and then save settings
            var deletedWorkspaceId = this._workspaceManager.settings.workspaces[this._workspaceManager._activeWorkspaceIndex].id;
            this._workspaceManager.settings.workspaces.splice(this._workspaceManager._activeWorkspaceIndex, 1);
            this._workspaceManager.settings.appSettings.workspaces.deletedBuiltInWorkspaces.push(deletedWorkspaceId);

            // Save settings
            this._workspaceManager.saveSettings();

            // Switch to the first workspace since the current one is now deleted
            let switchPromise = this._workspaceManager.switchWorkspaceAsync(0);

            // Close the menu
            DevHome.Utilities.hideMenu();

            await switchPromise;
        },
        _refresh: function () {
            var canDeleteWorkspaceContainer = this._layoutRoot.querySelector("#xbdh-deleteworkspace-candeleteworkspace");
            var cannotDeleteWorkspaceContainer = this._layoutRoot.querySelector("#xbdh-deleteworkspace-cannotdeleteworkspace");
            if (this._workspaceManager.settings.workspaces.length > 1) {
                canDeleteWorkspaceContainer.classList.remove("xbdh-hidden");
                cannotDeleteWorkspaceContainer.classList.add("xbdh-hidden");
                this._cancelButton.focus();
            } else {
                cannotDeleteWorkspaceContainer.classList.remove("xbdh-hidden");
                canDeleteWorkspaceContainer.classList.add("xbdh-hidden");
                this._closeButton.focus();
            }
        },
        _workspaceManager: null,
        ready: function (element, options) {
            this._layoutRoot = element;
            this._workspaceManager = DevHome.Utilities._Internal.workspaceManager;
            this._deleteButton = this._layoutRoot.querySelector("#xbdh-deleteworkspace-deletecommand");
            this._cancelButton = this._layoutRoot.querySelector("#xbdh-deleteworkspace-cancelcommand");
            this._closeButton = this._layoutRoot.querySelector("#xbdh-deleteworkspace-closecommand");
            this._workspaceLabel = this._layoutRoot.querySelector("#xbdh-deleteworkspace-workspacename");

            this._workspaceLabel.innerHTML = this._workspaceManager.settings.workspaces[this._workspaceManager._activeWorkspaceIndex].name;

            this._refresh();

            this._deleteButton.addEventListener("click", this._deleteAsync.bind(this), false);
            this._cancelButton.addEventListener("click", DevHome.Utilities.hideMenu.bind(DevHome.Utilities), false);
            this._closeButton.addEventListener("click", DevHome.Utilities.hideMenu.bind(DevHome.Utilities), false);
        },

        unload: function () {
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();