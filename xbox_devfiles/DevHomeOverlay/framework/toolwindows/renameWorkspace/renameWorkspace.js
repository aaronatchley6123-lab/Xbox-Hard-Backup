// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var xbdhUtils = DevHome.Utilities;

    WinJS.UI.Pages.define("/framework/toolwindows/renameWorkspace/renameWorkspace.html", {
        _refresh: function () {
            var activeWorkspaceSettings = this._workspaceManager.settings.workspaces[this._workspaceManager._activeWorkspaceIndex];

            // Populate the workspace name
            var nameElement = this._layoutRoot.querySelector("#xbdh-renameworkspace-name");
            var workspaceName = this._workspaceManager.settings.workspaces[this._workspaceManager._activeWorkspaceIndex].name;
            nameElement.value = workspaceName;
        },
        _save: function () {
            xbdhUtils._Events.logUIAction("RenameWorkspace:RenamedWorkspace");

            var activeWorkspaceSettings = this._workspaceManager.settings.workspaces[this._workspaceManager._activeWorkspaceIndex];

            // Update the name
            var nameElement = document.getElementById("xbdh-renameworkspace-name");

            if (this._nameElement.value) {
                this._nameElement.value = this._nameElement.value.trim();
            }

            // Validate the input includes only alpha numeric characters, foreign language characters and whitespace
            var regex = new RegExp('^[\\w\u00C0-\u1FFF\u2C00-\uD7FF\\s]+$');
            var valid = regex.test(this._nameElement.value);
            if (!valid) {
                xbdhUtils.showPopUp(
                    DevHome.Utilities.Resources.getString("errorInvalidValueTitle").value,
                    DevHome.Utilities.Resources.getString("errorInputMustBeNumbersLettersAndSpacesOnlyDescription").value,
                    null,
                    null);
                return;
            }

            var workspaceName = this._nameElement.value;
            if (!workspaceName) {
                workspaceName = DevHome.Utilities.Resources.getString("renameWorkspaceUntitledWorkspaceName").value;
            }
            activeWorkspaceSettings.name = workspaceName;
            activeWorkspaceSettings.customized = true;

            // Save settings
            this._workspaceManager.saveSettings();
            this._workspaceManager._refreshWorkspaceSwitcher();
            xbdhUtils.hideMenu();
        },
        _workspaceManager: null,
        ready: function (element, options) {
            this._layoutRoot = element;
            this._workspaceManager = xbdhUtils._Internal.workspaceManager;

            // Populate UI
            this._refresh();

            // Add behavior to textboxes
            xbdhUtils.addFormBehaviors(element);

            this._saveBackgroundCommand = this._layoutRoot.querySelector("#xbdh-renameworkspace-savecommand");
            this._saveBackgroundCommand.addEventListener("click", this._save.bind(this), false);

            this._nameElement = this._layoutRoot.querySelector("#xbdh-renameworkspace-name");
            this._nameElement.focus();
            var inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();
            inputPane.tryShow();
        },

        unload: function () {
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();