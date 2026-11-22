// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var classNames = DevHome.Utilities.ClassNames;
    var xbdhUtils = DevHome.Utilities;
    var windowType = DevHome.Utilities.WindowType;
    var _CUSTOMTOOLS_PATH = "D:\\DevHome\\Tools\\";

    WinJS.UI.Pages.define("/framework/toolwindows/addTool/addTool.html", {
        _customTools: [],
        _addToolsInvokedAsync: function () {
            var tools = [];

            // Get all the selected tools
            var availableToolsList = this._layoutRoot.querySelector("#addtool-availabletools");
            var selectedBuiltInToolsElements = availableToolsList.querySelectorAll(".xbdh-addtool-choice.xbdh-addtool-builtintool");

            // Add the tools to the workspace
            for (var i = 0, len = selectedBuiltInToolsElements.length; i < len; i++) {
                var selectedToolsElement = selectedBuiltInToolsElements[i];
                if (selectedToolsElement.checked) {
                    tools.push(this._getToolFromUri(selectedToolsElement.value));
                }
            }

            this._addToolsAsync(tools);
        },
        _addToolsAsync: async function (tools) {
            if (!tools.length) {
                xbdhUtils.hideMenu();
                return;
            }

            // Modify the backing data
            var activeWorkspace = this._workspaceManager.settings.workspaces[this._workspaceManager._activeWorkspaceIndex];
            var renderToolWindowPromises = [];
            var firstNewToolWindowIndex = activeWorkspace.windows.length;
            for (var i = 0, len = tools.length; i < len; i++) {
                var tool = tools[i];
                // New tools are added to the end of the workspace
                activeWorkspace.windows.push({
                    nameResourceId: tool.nameResourceId,
                    name: tool.name || "",
                    uri: tool.uri,
                    type: tool.type,
                    layout: tool.layout
                });

                xbdhUtils._Events.logUIAction("add tool: ", tool.name);
                var windowIndex = firstNewToolWindowIndex + i;

                var generateHandleItemPromise = (async () => {
                    if (tool.type === windowType.packaged) {
                        await this._workspaceManager._loadPackagedToolAsync(tool, windowIndex);
                    } else {
                        // Instantiate the UI control
                        var currentWindow = activeWorkspace.windows[windowIndex];
                        var containerEl = document.createElement("div");
                        containerEl.classList.add("xbdh-window");

                        containerEl.workspaceName = name;
                        containerEl.xbdhIndex = windowIndex;

                        this._workspaceManager._initializeWorkspaceWindowLayoutInfo(containerEl, currentWindow.layout);

                        // Add the title bar
                        var titleBarEl = document.createElement("div");
                        titleBarEl.classList.add("xbdh-window-title");
                        titleBarEl.classList.add("xbdh-fontweight-light");
                        titleBarEl.classList.add("win-focusable");
                        var name = "";
                        if (currentWindow.nameResourceId) {
                            name = DevHome.Utilities.Resources.getString(currentWindow.nameResourceId).value;
                        } else if (currentWindow.name) {
                            name = currentWindow.name;
                        }
                        titleBarEl.tabIndex = 0;
                        titleBarEl.textContent = name;
                        containerEl.appendChild(titleBarEl);

                        if (currentWindow.type === windowType.hosted) {
                            // Create an iframe & point it at the content. In the future this will be a WebView
                            this._workspaceManager._loadRemoteHostedWindow(containerEl, currentWindow);
                        } else {
                            await this._workspaceManager._loadBuiltInWindowAsync(containerEl, currentWindow);
                        }
                    }
                })();

                renderToolWindowPromises.push(generateHandleItemPromise);

                // After all the tools have been created
                await Promise.all(renderToolWindowPromises);
                // Run Layout again
                this._workspaceManager.layout();

                activeWorkspace.customized = true;

                // No need to call saveSettingsAsync, since calling layout() will do that already
                // We need to reset previous focus, or bad things will happen
                var menu = xbdhUtils.getMenu();
                var workspaceElementRoot = document.body.querySelector(".xbdh-workspace");
                var newFirstWindowElement = workspaceElementRoot.querySelector(".xbdh-window");
                menu._previousFocus = newFirstWindowElement.querySelector(".win-focusable, BUTTON:not([disabled]), BUTTON:not([tabIndex='-1']), INPUT:not([disabled]), INPUT:not([tabIndex='-1']), TEXTAREA:not([disabled]), TEXTAREA:not([tabIndex='-1']), SELECT:not([disabled]), SELECT:not([tabIndex='-1']), A:not([disabled]), A:not([tabIndex='-1'])");
                menu._previousFocusRoot = newFirstWindowElement;
                xbdhUtils.hideMenu();

                // Scroll the newly added tool into view if it's not already
                this._workspaceManager._setActiveToolWindow(firstNewToolWindowIndex);
            }
        },
        _createNewRemoteHostedTool: function (name, uri) {
            var newToolData = {
                name: name,
                uri: uri,
                type: windowType.hosted,
                layout: {
                    rowspan: this._workspaceManager._HALF_SCREEN_IN_ROWS,
                    colspan: this._workspaceManager._HALF_SCREEN_IN_ROWS
                },
            };
            this._workspaceManager.settings.tools.push(newToolData);
        },
        _createNewRemoteHostedToolCommandInvoked: function () {
            var name = this._newToolPageRemoteHostedToolName.value;
            var uri = this._newToolPageRemoteHostedToolUrl.value;
            this._createNewRemoteHostedTool(name, uri);
            this._showExistingToolPage(uri);
        },
        _getToolFromUri: function (uri, customTool) {
            var toolData = null;
            var tools = [];
            if (customTool) {
                tools = this._customTools;
            } else {
                tools = this._workspaceManager.settings.tools;
            }
            for (var i = 0, len = tools.length; i < len; i++) {
                var currentToolData = tools[i];
                if (currentToolData.uri === uri) {
                    toolData = currentToolData;
                    break;
                }
            }

            return toolData;
        },
        _getAvailableToolsAsync: function () {
            return new Promise(function (complete, error) {
                var settings = this._workspaceManager.settings;
                var availableBuiltInTools = [];

                // Look for all built in tools, removing any that are already in the workspace
                var buildInTools = settings.tools;
                var toolsAlreadyInWorkspace = settings.workspaces[this._workspaceManager._activeWorkspaceIndex].windows;
                for (var i = 0, len = buildInTools.length; i < len; i++) {
                    var toolAlreadyInWorkspace = false;
                    var builtInTool = buildInTools[i];
                    for (var j = 0, len2 = toolsAlreadyInWorkspace.length; j < len2; j++) {
                        if (toolsAlreadyInWorkspace[j].uri === builtInTool.uri) {
                            toolAlreadyInWorkspace = true;
                            break;
                        }
                    }
                    if (!toolAlreadyInWorkspace) {
                        var name = builtInTool.nameResourceId ? builtInTool.nameResourceId : builtInTool.name;
                        var description = builtInTool.descriptionResourceId ? builtInTool.descriptionResourceId : builtInTool.description;
                        availableBuiltInTools.push({
                            nameResourceId: name,
                            descriptionResourceId: description,
                            uri: builtInTool.uri
                        });
                    }
                }

            //    // We also look for custom tools on the scratch drive.
            //    var customToolFolders = null;

            //    try {
            //        var folder = Microsoft.Xbox.Development.StorageUtilities.getFolder(_CUSTOMTOOLS_PATH)
            //        folder.getFoldersAsync().then(function (folders) {
            //        customToolFolders = folders;

                    // Create UI representations of those tools
                    var htmlString = "";
                    for (var i = 0, len = availableBuiltInTools.length; i < len; i++) {
                        var availableBuiltInTool = availableBuiltInTools[i];
                        htmlString += '<div>' +
                                      '   <input type="checkbox" class="xbdh-addtool-choice xbdh-addtool-builtintool" value="' + availableBuiltInTool.uri + '" />' +
                                      '   <label>' + DevHome.Utilities.Resources.getString(availableBuiltInTool.nameResourceId).value + '</label>' +
                                      '</div>';
                    }
                    //for (var i = 0, len = customToolFolders.length; i < len; i++) {
                    //    var availableCustomTool = customToolFolders[i];
                    //    htmlString += '<input type="checkbox" class="xbdh-addtool-choice xbdh-addtool-customtool" value="' + availableCustomTool.path + '" />' +
                    //                    '  <label>' + availableCustomTool.name + '</label>';
                    //    this._customTools.push({
                    //        nameResourceId: "",
                    //        name: availableCustomTool.name,
                    //        uri: availableCustomTool.path,
                    //        type: windowType.packaged,
                    //        layout: {
                    //            rowspan: this._workspaceManager._HALF_SCREEN_IN_ROWS,
                    //            colspan: this._workspaceManager._HALF_SCREEN_IN_ROWS
                    //        },
                    //    });
                    //}
                    var availableToolsList = this._layoutRoot.querySelector("#addtool-availabletools");
                    if (availableBuiltInTools.length /* ||
                        customToolFolders.length*/) {
                        availableToolsList.innerHTML = htmlString;
                    } else {
                        availableToolsList.textContent = DevHome.Utilities.Resources.getString("addToolNoToolsAvailable").value;
                        // We use a setImmediate so the text doesn't get overritten when WinJS processes resources
                        setImmediate(function () {
                            if (this._existingToolsPageAddButton) {
                                this._existingToolsPageAddButton.textContent = DevHome.Utilities.Resources.getString("commandClose").value;
                                this._existingToolsPageAddButton.focus();
                            }
                        }.bind(this));
                    }
            //        complete();
            //    }.bind(this), function () {
            //        error();
            //    });
            //} catch (ex) {
            //    // Swallow exception
            //    }
            }.bind(this));
        },
        _refreshAsync: function () {
            return this._getAvailableToolsAsync().then(function () { }, function () { });
        },
        _showExistingToolPage: function (newToolUrl) {
            // If the page is launched from the new remote hosted tool page, then we auto-check the tool that was just created
            // and put focus on the add tool button.
            if (newToolUrl) {
                this._refreshAsync().then(function () {
                    var toolsElements = this._layoutRoot.querySelectorAll(".xbdh-addtool-choice");
                    for (var i = 0, len = toolsElements.length; i < len; i++) {
                        if (toolsElements[i].value === newToolUrl) {
                            toolsElements[i].checked = true;
                            break;
                        }
                    }
                    this._existingToolsPageAddButton.focus();
                }.bind(this), function () { });
            }

            this._newToolsPage.classList.add(classNames._cssHiddenClassName);
            this._existingToolsPage.classList.remove(classNames._cssHiddenClassName);
        },
        _showNewToolPage: function () {
            this._existingToolsPage.classList.add(classNames._cssHiddenClassName);
            this._newToolsPage.classList.remove(classNames._cssHiddenClassName);
            this._newToolPageRemoteHostedToolName.focus();
            var inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();
            inputPane.tryShow();
        },
        _workspaceManager: null,
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            this._layoutRoot = element;
            xbdhUtils.addFormBehaviors(element);

            this._workspaceManager = xbdhUtils._Internal.workspaceManager;
            this._existingToolsPage = this._layoutRoot.querySelector("#addtool-existingtools");
            this._existingToolsPageAddButton = this._layoutRoot.querySelector("#addtool-existingtools-addcommand");
            this._existingToolsPageNewButton = this._layoutRoot.querySelector("#addtool-existingtools-newcommand");

            this._newToolsPage = this._layoutRoot.querySelector("#addtool-newtool");
            this._newToolPageRemoteHostedToolName = this._layoutRoot.querySelector("#addtool-newtool-name");
            this._newToolPageRemoteHostedToolUrl = this._layoutRoot.querySelector("#addtool-newtool-url");
            this._newToolPageAddButton = this._layoutRoot.querySelector("#addtool-newtool-add");
            this._newToolPageCancelButton = this._layoutRoot.querySelector("#addtool-newtool-cancel");

            // Hook events
            this._existingToolsPageAddButton.addEventListener("click", this._addToolsInvokedAsync.bind(this), false);
            //this._existingToolsPageNewButton.addEventListener("click", this._showNewToolPage.bind(this), false);

            this._newToolPageAddButton.addEventListener("click", this._createNewRemoteHostedToolCommandInvoked.bind(this), false);
            this._newToolPageCancelButton.addEventListener("click", this._showExistingToolPage.bind(this), false);

            // Populate UI
            this._refreshAsync().then(function () {
                // Set default focus
                var initialFocus = this._layoutRoot.querySelector(".xbdh-addtool-choice");
                if (!initialFocus) {
                    initialFocus = this._existingToolsPageAddButton;
                }
                initialFocus.focus();
            }.bind(this));
        },

        unload: function () {
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();