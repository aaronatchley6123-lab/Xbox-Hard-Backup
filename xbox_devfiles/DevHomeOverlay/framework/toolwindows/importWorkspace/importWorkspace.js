// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var xbdhUtils = DevHome.Utilities;

    WinJS.UI.Pages.define("/framework/toolwindows/importWorkspace/importWorkspace.html", {
        _layoutRoot: null,
        _importWorkspaceAsync: function (workspaces) {
            DevHome.Utilities._Events.logUIAction("ImportWorkspace:ImportWorkspace");
            return new Promise(function (complete, error) {
                // Grab all selected workspaces
                var appSettingsModified = false;
                var firstImportedWorkspaceIndex = -1;
                for (var i = 0, len = workspaces.length; i < len; i++) {
                    // TODO - Handle duplicate workspaces that are already there
                    var workspaceData = workspaces[i];

                    // We block workspaces created in the preview time frame for Dev Home
                    if (workspaceData.version < 2) {
                        DevHome.Utilities.showError(null,
                            DevHome.Utilities.Resources.getString("importWorkspaceErrorVersionNotSupportedTitle").value,
                            DevHome.Utilities.Resources.getString("importWorkspaceErrorVersionNotSupportedDescription").value);
                    }

                    this._workspaceManager.settings.workspaces.push(workspaceData);
                    if (firstImportedWorkspaceIndex === -1) {
                        firstImportedWorkspaceIndex = this._workspaceManager.settings.workspaces.length - 1;
                    }
                    appSettingsModified = true;
                }
                this._workspaceManager.switchWorkspaceAsync(firstImportedWorkspaceIndex).then(function success() {
                    this._workspaceManager._refreshWorkspaceSwitcher();
                    if (appSettingsModified) {
                        this._workspaceManager.saveSettings();
                        complete();
                    } else {
                        complete();
                    }
                }.bind(this), function () {
                    error();
                });
                DevHome.Utilities.hideMenu();
            }.bind(this));
        },
        _importWorkspaceInvoked: function () {
            var workspacesToImport = [];
            var workspacesList = this._layoutRoot.querySelectorAll(".xbdh-importable-workspace");
            for (var i = 0, len = workspacesList.length; i < len; i++) {
                var workspaceElement = workspacesList[i];
                if (workspaceElement.winControl.checked) {
                    var workspaceData = this._workspacesData[workspaceElement.querySelector("input[type='checkbox']").value];
                    workspacesToImport.push(workspaceData);
                }
            }
            if (!workspacesToImport.length) {
                xbdhUtils.hideMenu();
                return;
            }
            this._importWorkspaceAsync(workspacesToImport).then(function () { }, function () { });
        },
        _refreshImportWorkspaceListAsync: function () {
            return new Promise(function (complete, error) {
                var workspacesList = this._layoutRoot.querySelector("#importworkspace-availableworkspaceslist");
                this._workspaceManager._getWorkspacesAvailableForImportAsync()
                .then(function success(workspaces) {
                    var readWorkspaceDataPromises = [];
                    for (var i = 0, len = workspaces.length; i < len; i++) {
                        var readWorkspaceDataPromise = (function generateReadWorkspaceDataOperation() {
                            return new Promise(function (complete2, error2) {
                                Windows.Storage.FileIO.readTextAsync(workspaces[i]).then(function (fileData) {
                                    try {
                                        var workspaceData = JSON.parse(fileData);
                                        this._workspacesData.push(workspaceData);
                                        complete2();
                                    } catch (ex) {
                                        error2(ex);
                                    }
                                }.bind(this), function () {
                                    error2();
                                });
                            }.bind(this));
                        }.bind(this))(i);
                        readWorkspaceDataPromises.push(readWorkspaceDataPromise);
                    }
                    return Promise.all(readWorkspaceDataPromises);
                }.bind(this)).then(function () {
                    if (this._workspacesData.length) {
                        for (var i = 0, len = this._workspacesData.length; i < len; i++) {
                            var workspaceData = this._workspacesData[i];

                            // Yield to nameResourceId if available to localize workspace name.
                            if (workspaceData.nameResourceId) {
                                workspaceData.name = DevHome.Utilities.Resources.getString(workspaceData.nameResourceId).value;
                            }

                            // Load the workspace data so we can get information about it
                            var div = document.createElement("div");
                            div.classList.add("xbdh-importable-workspace");
                            div.classList.add("xbdh-checkbox");
                            div.classList.add("win-focusable");
                            div.tabIndex = 0;
                            var input = document.createElement("input");
                            input.setAttribute("type", "checkbox");
                            input.value = i;
                            input.tabIndex = -1;
                            div.appendChild(input);
                            var label = document.createElement("label");
                            label.textContent = workspaceData.name;
                            div.appendChild(label);

                            workspacesList.appendChild(div);
                        }

                        // Make each checkbox into a checkbox winControl
                        var checkBoxElements = this._layoutRoot.querySelectorAll(".xbdh-checkbox");
                        for (var i = 0, len = checkBoxElements.length; i < len; i++) {
                            var checkBox = new DevHome.UI.CheckBox(checkBoxElements[i]);
                        }
                        this._importWorkspaceButton.textContent = DevHome.Utilities.Resources.getString("importWorkspaceButton").value;
                    } else {
                        var span1 = document.createElement("span");
                        span1.classList.add("xbdh-fontweight-bold");
                        var textSpan1 = document.createTextNode(DevHome.Utilities.Resources.getString("importWorkspaceNoWorkspacesMessagePart1").value);
                        var nbsp = document.createTextNode("\u00a0");
                        span1.appendChild(textSpan1);
                        span1.appendChild(nbsp);
                        var span2 = document.createElement("span");
                        var textSpan2 = document.createTextNode(DevHome.Utilities.Resources.getString("importWorkspaceNoWorkspacesMessagePart2").value);
                        span2.appendChild(textSpan2);

                        workspacesList.appendChild(span1);
                        workspacesList.appendChild(span2);

                        this._importWorkspaceButton.textContent = DevHome.Utilities.Resources.getString("commandContinue").value;
                    }
                    complete();
                }.bind(this),
                    function error() {
                        error();
                    });
            }.bind(this));
        },
        _workspacesData: [],
        _workspaceManager: null,
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            this._layoutRoot = element;
            this._importWorkspaceInvokedBound = this._importWorkspaceInvoked.bind(this);
            // Populate the list of available workspaces
            this._workspaceManager = DevHome.Utilities._Internal.workspaceManager;

            // Hook up the buttons
            this._importWorkspaceButton = this._layoutRoot.querySelector("#importworkspace-exportcommand");
            this._importWorkspaceButton.addEventListener("click", this._importWorkspaceInvokedBound, false);

            this._refreshImportWorkspaceListAsync().then(function () {
                if (this._disposed) {
                    return;
                }

                // Set initial focus
                var initialFocus = this._layoutRoot.querySelector(".xbdh-importable-workspace");
                if (!initialFocus) {
                    initialFocus = this._importWorkspaceButton;
                }
                initialFocus.focus();
            }.bind(this), function () { });
        },

        unload: function () {
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();