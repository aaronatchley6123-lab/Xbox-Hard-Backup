// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var xbdhUtils = DevHome.Utilities;

    WinJS.UI.Pages.define("/framework/toolwindows/newWorkspace/newWorkspace.html", {
        _workspaceManager: null,
        _generateNewWorkspaceName: function () {
            var newWorkspaceName = DevHome.Utilities.Resources.getString("newWorkspaceNewWorkspaceDefaultName").value + this._uniqueNumberToAppendFileName;
            this._uniqueNumberToAppendFileName++;
            return newWorkspaceName;
        },
        _refresh: function () {
            var workspaces = this._workspaceManager.settings.workspaces;

            var workspaceName = DevHome.Utilities.Resources.getString("newWorkspaceNewWorkspaceDefaultName").value;
            while (this._workspaceNameTaken(workspaceName)) {
                workspaceName = this._generateNewWorkspaceName(workspaceName);
            }

            this._nameElement.value = workspaceName;
        },
        _saveAsync: function () {
            return new Promise(function (complete, error) {
                var workspaces = this._workspaceManager.settings.workspaces;
                var activeWorkspaceSettings = workspaces[this._workspaceManager._activeWorkspaceIndex];

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

                // Copy the current workspace to get our initial tools and theme for this workspace
                // We may revisit this but right now there is a bug with adding an empty workspace
                // so this is a good way to work around that until we have time to track it down.
                var activeWorkspace = activeWorkspaceSettings;
                var newWorkspace = JSON.parse(JSON.stringify(activeWorkspaceSettings));

                newWorkspace.name = this._nameElement.value;
                newWorkspace.id = xbdhUtils.getDevHomeNativeUtilities().createGuid();
                newWorkspace.version = this._workspaceManager.settings.version;
                newWorkspace.customized = true;

                // Ensure custom workspace names are not localized via their source nameResourceId.
                if (newWorkspace.nameResourceId) {
                    delete newWorkspace.nameResourceId;
                }

                // Add it to the workspaces collection
                workspaces.push(newWorkspace);

                this._workspaceManager.switchWorkspaceAsync(workspaces.length - 1).then(function success() {
                    complete();
                }, function () {
                    error();
                });

                // Save settings
                this._workspaceManager.saveSettings();

                // Close the menu
                DevHome.Utilities.hideMenu();
            }.bind(this));
        },
        _workspaceNameTaken: function (name) {
            var workspaces = this._workspaceManager.settings.workspaces;
            for (var i = 0, len = workspaces.length; i < len; i++) {
                if (workspaces[i].name === name) {
                    return true;
                }
            }
            return false;
        },
        _uniqueNumberToAppendFileName: 1,
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            this._layoutRoot = element;
            this._workspaceManager = DevHome.Utilities._Internal.workspaceManager;
            this._nameElement = this._layoutRoot.querySelector("#xbdh-newworkspace-name");
            this._saveButton = this._layoutRoot.querySelector("#xbdh-newworkspace-savecommand");

            // Populate UI
            this._refresh();

            DevHome.Utilities.addFormBehaviors(element);
            this._saveButton.addEventListener("click", this._saveAsync.bind(this), false);
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