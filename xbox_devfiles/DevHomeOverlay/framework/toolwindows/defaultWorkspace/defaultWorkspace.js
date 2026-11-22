// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    WinJS.UI.Pages.define("/framework/toolwindows/defaultWorkspace/defaultWorkspace.html", {
        _refresh: function () {
            var activeWorkspaceSettings = this._workspaceManager.settings.workspaces[this._workspaceManager._activeWorkspaceIndex];

            // Populate the default checkbox
            var defaultWorkspaceName = this._workspaceManager.settings.appSettings.workspaces.defaultWorkspace;
            if (defaultWorkspaceName === activeWorkspaceSettings.name) {
                this._isDefaultWorkspaceElement.checked = true;
                this._isDefaultWorkspaceElement.disabled = true;
            } else {
                this._isDefaultWorkspaceElement.checked = false;
            }
        },
        _save: function () {
            var activeWorkspaceSettings = this._workspaceManager.settings.workspaces[this._workspaceManager._activeWorkspaceIndex];

            // Update the default workspace property
            if (this._isDefaultWorkspaceElement.checked) {
                this._workspaceManager.settings.appSettings.workspaces.defaultWorkspace = activeWorkspaceSettings.id;
            }

            // Save settings
            this._workspaceManager.saveSettings();
            DevHome.Utilities.hideMenu();
        },
        _workspaceManager: null,
        ready: function (element, options) {
            this._layoutRoot = element;
            this._workspaceManager = DevHome.Utilities._Internal.workspaceManager;
            this._isDefaultWorkspaceElement = this._layoutRoot.querySelector("#xbdh-defaultworkspace-setdefaultworkspacevalue");

            // Populate UI
            this._refresh();

            var saveButton = this._layoutRoot.querySelector("#xbdh-defaultworkspace-savecommand");
            saveButton.addEventListener("click", this._save.bind(this), false);

            var initialFocus = null;
            if (this._isDefaultWorkspaceElement.disabled) {
                initialFocus = this._isDefaultWorkspaceElement;
            } else {
                initialFocus = saveButton;
            }
            initialFocus.focus();
        },

        unload: function () {
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();