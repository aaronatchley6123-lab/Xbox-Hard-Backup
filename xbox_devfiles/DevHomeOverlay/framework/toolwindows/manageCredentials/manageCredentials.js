// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var credUtils = Microsoft.Xbox.Development.NetworkCredentialUtilities;
    var resources = DevHome.Utilities.Resources;

    WinJS.UI.Pages.define("/framework/toolwindows/manageCredentials/manageCredentials.html", {
        _showAddOrEditCredentialsDialog: function (sharePath, username) {

            // Hide the menu and it's overlays, because otherwise Dev Home will get in a bad state if there are multiple overlays visible at once
            DevHome.Utilities.hideMenu();

            var editSavedCredentialsRootDiv = document.createElement("div");
            editSavedCredentialsRootDiv.classList.add("xbdh-managecredentials-editcredentials");
            editSavedCredentialsRootDiv.classList.add("xbdh-overlay");
            var editSavedCredentialsHtml =
                // File path page
                '<div id="xbdh-managecredentials-editcredentials" class="xbdh-form">' +
                '  <h1 class="xbdh-managecredentials-editcredentials-heading">' + resources.getString("manageCredentialsEditCredentialsHeading").value + '</h1>';
            if (sharePath) {
                editSavedCredentialsHtml += '  <p id="xbdh-managecredentials-editcredentials-description" data-xbdh-sharepath="' + sharePath + '">' + resources._formatString(resources.getString("manageCredentialsEditCredentialsDescription").value, sharePath); + '</p><br />';
            } else {
                editSavedCredentialsHtml += '  <label id="xbdh-managecredentials-editcredentials-filepath-label">' + resources.getString("manageCredentialsEditCredentialsFilePath").value + '</label>' +
                                            '  <input id="xbdh-managecredentials-editcredentials-filepath-value" type="text" />';
            }

            editSavedCredentialsHtml += '  <label>' + resources.getString("manageCredentialsUsername").value + '</label>';

            if (username) {
                editSavedCredentialsHtml += '  <input id="xbdh-managecredentials-editcredentials-username-value" type="text" value="' + username + '" />';
            } else {
                editSavedCredentialsHtml += '  <input id="xbdh-managecredentials-editcredentials-username-value" type="text" />';
            }

            editSavedCredentialsHtml +=   '  <label>' + resources.getString("manageCredentialsPassword").value + '</label>' +
                                          '  <input id="xbdh-managecredentials-editcredentials-password-value" type="password" />' +
                                          '  <button id="xbdh-managecredentials-editcredentials-save" type="button">' + resources.getString("commandSave").value + '</button>' +
                                          '</div>';

            var editSavedCredentialsOverlay = new DevHome.UI.Overlay(editSavedCredentialsRootDiv, { html: editSavedCredentialsHtml });

            // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
            // to get reset to the main workspace after this function executes, which we don't want. We want the show() method
            // call to set focus to the user details overlay instead.
            setImmediate(function () {
                if (editSavedCredentialsOverlay) {
                    editSavedCredentialsOverlay.show();

                    // Add behavior to textboxes
                    DevHome.Utilities.addTextboxBehaviors(editSavedCredentialsRootDiv);

                    var filePathField = document.getElementById("xbdh-managecredentials-editcredentials-filepath-value");
                    var usernameField = document.getElementById("xbdh-managecredentials-editcredentials-username-value");
                    var passwordField = document.getElementById("xbdh-managecredentials-editcredentials-password-value");

                    // Bring up the virtual keyboard
                    var inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();
                    inputPane.tryShow();

                    // Set focus to the text input
                    if (!sharePath) {
                        filePathField.focus();
                    } else if (username) {
                        passwordField.focus();
                    } else {
                        usernameField.focus();
                    }

                    // Hook up buttons
                    var saveButton = editSavedCredentialsRootDiv.querySelector("#xbdh-managecredentials-editcredentials-save");
                    var saveFunction = sharePath ? this._saveCredentials : this._addCredentials;
                    saveButton.addEventListener("click", saveFunction.bind(this), false);
                }
            }.bind(this));
        },
        _addCredentials: function () {
            DevHome.Utilities._Events.logUIAction("ManageCredentials:AddNetworkCredentials");

            var filePath = document.getElementById("xbdh-managecredentials-editcredentials-filepath-value").value;
            var userName = document.getElementById("xbdh-managecredentials-editcredentials-username-value").value;
            var password = document.getElementById("xbdh-managecredentials-editcredentials-password-value").value;
            try {
                credUtils.addCredential(filePath, userName, password);

                // The share name doesn't always have the \\ but we want it when verifying the path
                var networkShareFilepath = "";
                if (!filePath.startsWith("\\\\")) {
                    networkShareFilepath = "\\\\";
                }
                networkShareFilepath += filePath;

                // Verify we have access to this path
                Microsoft.Xbox.Development.StorageUtilities.verifyAccessToPath(networkShareFilepath);
            } catch (ex) {
                var errorString = DevHome.Utilities.getErrorStringForNetworkShareRelatedError(ex.number, filePath);
                DevHome.Utilities.showError(false, false, errorString);
            }
            // Hide the addEditOverlay if it exists
            var addEditOverlay = document.body.querySelector(".xbdh-managecredentials-editcredentials");
            if (addEditOverlay &&
                addEditOverlay.winControl) {
                addEditOverlay.winControl.hide();
            }
        },
        _addNewCredentials: function () {
            this._showAddOrEditCredentialsDialog();
        },
        _saveCredentials: function () {
            var filePath = document.getElementById("xbdh-managecredentials-editcredentials-description").getAttribute("data-xbdh-sharepath");
            var userName = document.getElementById("xbdh-managecredentials-editcredentials-username-value").value;
            var password = document.getElementById("xbdh-managecredentials-editcredentials-password-value").value;
            try {
                credUtils.addCredential(filePath, userName, password);

                // The share name doesn't always have the \\ but we want it when verifying the path
                var networkShareFilepath = "";
                if (!filePath.startsWith("\\\\")) {
                    networkShareFilepath = "\\\\";
                }
                networkShareFilepath += filePath;

                // Verify we have access to this path
                Microsoft.Xbox.Development.StorageUtilities.verifyAccessToPath(networkShareFilepath);
            } catch (ex) {
                var errorString = DevHome.Utilities.getErrorStringForNetworkShareRelatedError(ex.number, filePath);
                DevHome.Utilities.showError(false, false, errorString);
            }
            // Hide the addEditOverlay if it exists
            var addEditOverlay = document.body.querySelector(".xbdh-managecredentials-editcredentials");
            if (addEditOverlay &&
                addEditOverlay.winControl) {
                addEditOverlay.winControl.hide();
            }
        },
        _populateCredentialsList: function () {
            var credentialsListElement = document.getElementById("xbdh-managecredentials-list");

            // Get credentials
            var credentials = credUtils.getCredentials();

            if (credentials.size) {
                // Create DOM
                var divHeading = document.createElement("div");
                divHeading.classList.add("xbdh-managecredentials-headings");

                var divHeadingPath = document.createElement("div");
                divHeadingPath.classList.add("xbdh-managecredentials-headings-path");
                var textPath = document.createTextNode(DevHome.Utilities.Resources.getString("manageCredentialsCredentialsListHeadingPath").value);
                divHeadingPath.appendChild(textPath);

                var divHeadingUserName = document.createElement("div");
                divHeadingUserName.classList.add("xbdh-managecredentials-headings-username");
                var textUserName = document.createTextNode(DevHome.Utilities.Resources.getString("manageCredentialsCredentialsListHeadingUsername").value);
                divHeadingUserName.appendChild(textUserName);

                var divHeadingAction = document.createElement("div");
                divHeadingAction.classList.add("xbdh-managecredentials-headings-actions");
                var textAction = document.createTextNode(DevHome.Utilities.Resources.getString("commandRemove").value);
                divHeadingAction.appendChild(textAction);

                divHeading.appendChild(divHeadingPath);
                divHeading.appendChild(divHeadingUserName);
                divHeading.appendChild(divHeadingAction);

                credentialsListElement.appendChild(divHeading);

                for (var i = 0, len = credentials.length; i < len; i++) {
                    var credentialInfo = credentials[i];

                    var divCredentials = document.createElement("div");
                    divCredentials.classList.add("xbdh-managecredentials-credential");
                    divCredentials.setAttribute("data-xbdh-sharepath", credentialInfo.serverName);
                    divCredentials.setAttribute("data-xbdh-username", credentialInfo.userName);

                    var divCredentialsPath = document.createElement("div");
                    divCredentialsPath.classList.add("xbdh-managecredentials-credential-path");
                    var linkServerName = document.createElement("a");
                    linkServerName.classList.add("xbdh-managecredentials-credential-edit");
                    linkServerName.textContent = credentialInfo.serverName;
                    linkServerName.href = "#";
                    divCredentialsPath.appendChild(linkServerName);

                    var divCredentialsUserName = document.createElement("div");
                    divCredentialsUserName.classList.add("xbdh-managecredentials-credential-username");
                    var textUserName = document.createTextNode(credentialInfo.userName);
                    divCredentialsUserName.appendChild(textUserName);

                    var divCredentialsAction = document.createElement("div");
                    divCredentialsAction.classList.add("xbdh-managecredentials-credential-delete");
                    var linkRemoveAction = document.createElement("a");
                    linkRemoveAction.textContent = DevHome.Utilities.Resources.getString("commandRemove").value;
                    linkRemoveAction.href = "#";
                    divCredentialsAction.appendChild(linkRemoveAction);

                    divCredentials.appendChild(divCredentialsPath);
                    divCredentials.appendChild(divCredentialsUserName);
                    divCredentials.appendChild(divCredentialsAction);

                    credentialsListElement.appendChild(divCredentials);
                }

                // Hook up buttons
                var editButtons = credentialsListElement.querySelectorAll(".xbdh-managecredentials-credential-edit");
                for (var i = 0, len = editButtons.length; i < len; i++) {
                    editButtons[i].addEventListener("click", this._editCredentials.bind(this), false);
                }
                var deleteButtons = credentialsListElement.querySelectorAll(".xbdh-managecredentials-credential-delete");
                for (var i = 0, len = deleteButtons.length; i < len; i++) {
                    deleteButtons[i].addEventListener("click", this._deleteCredentials.bind(this), false);
                }
            }
            DevHome.Utilities._Events.logUIAction("ManageCredentials:ViewNetworkCredentails", credentials.size);
        },
        _editCredentials: function (e) {
            DevHome.Utilities._Events.logUIAction("ManageCredentials:EditNetworkCredentials");

            var sharePath = e.srcElement.parentNode.parentNode.getAttribute("data-xbdh-sharepath");
            var username = e.srcElement.parentNode.parentNode.getAttribute("data-xbdh-username");
            this._showAddOrEditCredentialsDialog(sharePath, username);
        },
        _deleteCredentials: function (e) {
            DevHome.Utilities._Events.logUIAction("ManageCredentials:DeleteNetworkCredentials");
            var listElement = e.srcElement.parentNode.parentNode;
            var sharePath = listElement.getAttribute("data-xbdh-sharepath");
            try {
                credUtils.removeCredential(sharePath);
            } catch (ex) {
                if (ex.number === -2147023570 ||
                    ex.number === -2147023565 ||
                    ex.number === -2147024891) {
                    DevHome.Utilities.hideProgress(this._layoutRoot);
                    DevHome.Utilities.showError(
                        null,
                        DevHome.Utilities.Resources.getString("errorAddCredentials").value,
                        DevHome.Utilities.Resources.getString("launcherErrorRegisterRemotePackageBadCredentialsOrLocation").value);
                } else if (ex.number === -2147024843 ||
                            ex.number === -2147024829 ||
                            ex.number === -2147024893) {
                    DevHome.Utilities.hideProgress(this._layoutRoot);
                    DevHome.Utilities.showError(
                        null,
                        DevHome.Utilities.Resources.getString("errorAddCredentials").value,
                        DevHome.Utilities.Resources.getString("launcherErrorRegisterRemotePackageBadLocation").value);
                } else {
                    DevHome.Utilities.defaultErrorHandler(ex);
                }
            }
            var listElementBoundingRect = listElement.getBoundingClientRect();
            // Find the next element to set focus to. We try the up direction since there's always a button at the top we can focus on.
            var nextFocus = TVJS.DirectionalNavigation.findNextFocusElement(DevHome.Utilities.Key.GamepadDPadUp, listElementBoundingRect);
            listElement.parentNode.removeChild(listElement);

            if (nextFocus) {
                nextFocus.focus();
            } else {
                // Sometimes automatic focus isn't smart enough to set focus to the button at the top of the UI, so we manually do it if it exists
                this._addCommand.focus();
            }
        },
        ready: function (element, options) {
            this._layoutRoot = element;

            this._populateCredentialsList();

            this._addCommand = document.getElementById("xbdh-managecredentials-add");
            this._addCommand.addEventListener("click", this._addNewCredentials.bind(this), false);

            this._addCommand.focus();
        },

        unload: function () {
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();