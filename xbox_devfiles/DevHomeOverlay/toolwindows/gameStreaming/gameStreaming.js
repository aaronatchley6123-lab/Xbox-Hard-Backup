// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var gameStreamingAgent = null;
    var userManager = null;

    WinJS.UI.Pages.define("/toolwindows/gameStreaming/gameStreaming.html", {
        _updateStreamingStatusAcync: function() {
            return new Promise(function (complete, error) {
                var sessionStatus = gameStreamingAgent.getStreamSessionStatus();
                this._updateStreamingStatus(sessionStatus);
            }.bind(this), DevHome.Utilities.defaultErrorHandler);
        },
        _updateStreamingStatus: function (sessionStatus) {
            var isListening = sessionStatus > Windows.Xbox.System.Internal.GameStreaming.GameStreamSessionStatus.notListening;

            // Get overall live status
            var friendlyListeningStatus = DevHome.Utilities.Resources.getString("gameStreamingListening").value

            if (!isListening) {
                friendlyListeningStatus = DevHome.Utilities.Resources.getString("gameStreamingNotListening").value
            }

            var directConnectStatusSpan = document.getElementById('xbdh-gameStreaming-directConnect-status');
            if (directConnectStatusSpan) {
                directConnectStatusSpan.textContent = friendlyListeningStatus;
            }

            DevHome.Utilities.hideProgress(this._statusChangeDiv);
            this._streamConfigComboBox.disabled = isListening;

            var toggle = this._toggleListenButton.querySelector('#xbdh-gameStreaming-directConnect-toggle');
            if (toggle) {
                toggle.classList.toggle('xbdh-gameStreaming-directConnect-toggle--active', isListening);
            }

            this._toggleListenButton.setAttribute('aria-checked', isListening);
        },
        _selectedNanoVersion: "ANY",
        _selectedStreamConfig: "",
        _toggleListening: function () {
            return new Promise(function (complete, error) {
                var sessionStatus = gameStreamingAgent.getStreamSessionStatus();
                var isListening = sessionStatus > Windows.Xbox.System.Internal.GameStreaming.GameStreamSessionStatus.notListening;
                if (isListening) {
                    gameStreamingAgent.stopListening();
                } else {
                    gameStreamingAgent.startListening("", this._selectedNanoVersion, this._selectedStreamConfig);
                }
            }.bind(this), DevHome.Utilities.defaultErrorHandler);
        },
        _handleToggleListenButtonInvoked: function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
            DevHome.Utilities.showProgress(this._statusChangeDiv);
            this._toggleListening();
        },
        _onStreamStatusChanged: function (e) {
            var sessionStatus = e.status;
            this._updateStreamingStatus(sessionStatus);
        },
        _streamConfigComboBox: null,
        _streamConfigMonikers: {},
        _handleStreamConfigChanged: function () {
            this._selectedStreamConfig = this._streamConfigMonikers[this._streamConfigComboBox.value];
        },
        _buildComboBox: function (selectedValue, optionLabels, elementSelector, changedCallback) {
            // Last option is the default
            var options = {
                value: selectedValue,
                options: optionLabels.map(optionLabel => {
                    return { label: optionLabel, value: optionLabel }
                })
            };

            var comboBoxElement = this._layoutRoot.querySelector(elementSelector);
            var comboBox = new DevHome.UI.ComboBox(comboBoxElement, options, "gameStreamingSelectStreamConfigLabel");
            comboBox.addEventListener("change", changedCallback, false);
            return comboBox;
        },


        _handleRemoteConnectChanged: function (e) {
            if (e.keyCode &&
                (e.keyCode !== DevHome.Utilities.Key.enter &&
                    e.keyCode !== DevHome.Utilities.Key.space)) {
                return;
            }

            var currentTarget = e.currentTarget;

            var userId = parseInt(currentTarget.getAttribute("data-xbdh-userid"));

            // Update checked state
            var checkBox = currentTarget.querySelector("input[type='checkbox']");
            if (checkBox) {
                try {
                    var userLocalSettings = Windows.Xbox.System.Internal.UserSettings.UserSettings.getUserSettings(userId).localSettings;
                    var remoteAccess = !userLocalSettings.remoteAccessEnabled;
                    //both remoteAccessEnabled and consoleStreamingV2Enabled needs to change in order for XCCS to record the action correctly. 
                    userLocalSettings.remoteAccessEnabled = remoteAccess;
                    userLocalSettings.consoleStreamingV2Enabled = remoteAccess;
                    checkBox.checked = userLocalSettings.remoteAccessEnabled;
                    currentTarget.setAttribute('aria-checked', userLocalSettings.remoteAccessEnabled);
                } catch (err) {
                    DevHome.Utilities.defaultErrorHandler(err);
                    return;
                }
                
            }
        },
        _refreshRemoteConnectValueAsync: async function () {
            var users;
            if (this.userManager !== null) {
                try {
                    users = await userManager.getUsersAsync();
                    var hasSignedInUser = false;
                    var label = document.createElement('div');
                    label.id = "xbdh-gameStreaming-users-label";
                    label.textContent = DevHome.Utilities.Resources.getString("gameStreamingRemoteConnectLabel").value;
                    label.className = "xbdh-gameStreaming-users-label";
                    this._signedInUserList.insertAdjacentElement('beforebegin', label);
                    this._signedInUserList.setAttribute('aria-labelledby', label.id);
                    for (var i = 0, len = users.size || users.length; i < len; i++) {
                        var user = users[i];
                        var systemUser = Windows.System.User.getFromId(user.userId);
                        var userSettings = Windows.Xbox.System.Internal.UserSettings.UserSettings.getUserSettings(user.userId);
                        var isGuest = systemUser && systemUser.type === Windows.System.UserType.localGuest;

                        // remote connect doesn't support guest user
                        if (user.isSignedIn && !isGuest) {
                            if (!hasSignedInUser) {
                                hasSignedInUser = true;
                            }
                            var listItem = document.createElement('li');
                            listItem.classList.add('xbdh-gameStreaming-user', 'xbdh-list-item', 'win-focusable');
                            listItem.tabIndex = 0;
                            listItem.setAttribute('data-xbdh-userid', user.userId);

                            var checkboxLabel = document.createElement('div');
                            checkboxLabel.className = "xbdh-gameStreaming-user-label";
                            var input = document.createElement('input');
                            input.type = "checkbox";
                            input.checked = userSettings.localSettings.remoteAccessEnabled;
                            input.tabIndex = -1;
                            checkboxLabel.appendChild(input);
                            var nameSpan = document.createElement('span');
                            nameSpan.id = `user-${user.emailAddress}`;
                            nameSpan.textContent = user.emailAddress;
                            checkboxLabel.appendChild(nameSpan);
                            input.setAttribute('aria-labelledby', nameSpan.id);

                            listItem.appendChild(checkboxLabel);
                            listItem.setAttribute('aria-checked', input.checked);
                            listItem.setAttribute('role', 'menuitemcheckbox');
                            listItem.addEventListener("click", this._handleRemoteConnectChangedBound, false);
                            listItem.addEventListener("keyup", this._handleRemoteConnectChangedBound, false);
                            this._signedInUserList.appendChild(listItem);
                        }
                    }
                    
                    if (!hasSignedInUser) {
                        var noSignedInUserLabel = document.createElement('label');
                        noSignedInUserLabel.textContent = DevHome.Utilities.Resources.getString("gameStreamingRemoteConnectNoSignedInUser").value;
                        this._signedInUserList.appendChild(noSignedInUserLabel)
                    }
                } catch (err) {
                    DevHome.Utilities.defaultErrorHandler(err);
                    return;
                }
            }
            
        },


        ready: function (element, options) {
            this._layoutRoot = element;
            this._statusChangeDiv = element.querySelector("#xbdh-gameStreaming-change-status");
            this._toggleListenButton = element.querySelector("#xbdh-gameStreaming-toggleListeningButton");

            this._signedInUserList = element.querySelector("#xbdh-gameStreaming-users-list");

            this._refreshRemoteConnectValueBound = this._refreshRemoteConnectValueAsync.bind(this);
            this._handleRemoteConnectChangedBound = this._handleRemoteConnectChanged.bind(this);
            if (gameStreamingAgent === null) {
                try {
                    gameStreamingAgent = Windows.Xbox.System.Internal.GameStreaming.GameStreamingAgent;
                }
                catch (e) {
                    // We failed to make a connection to the agent. Leave the agent null, and display an error when the page loads.
                    // We will try to reconnect the next time this page is loaded.
                }
            }

            if (userManager === null) {
                try {
                    userManager = DevHome.Utilities.getConsoleExtensions().UserManager;
                }
                catch (err) {
                    DevHome.Utilities.defaultErrorHandler(err);
                    return;
                }
            }
            this._refreshRemoteConnectValueAsync().then(function () { }, function () { });
            Windows.Xbox.ApplicationModel.Core.CoreApplicationContext.addEventListener("currentuserchanged", this._refreshRemoteConnectValueBound, false);
            Windows.Xbox.System.User.addEventListener("signoutcompleted", this._refreshRemoteConnectValueBound, false);
            Windows.Xbox.System.User.addEventListener("signincompleted", this._refreshRemoteConnectValueBound, false);

            if (gameStreamingAgent !== null) {
                var toggle = this._toggleListenButton.querySelector('#xbdh-gameStreaming-directConnect-toggle');
                if (toggle) {
                    toggle.classList.toggle('xbdh-gameStreaming-directConnect-toggle--disabled', false);
                }
                this._toggleListenButton.addEventListener("click", this._handleToggleListenButtonInvoked.bind(this), false);

                this._onStreamStatusChangedBound = this._onStreamStatusChanged.bind(this);
                gameStreamingAgent.addEventListener("streamstatuschanged", this._onStreamStatusChangedBound, false);

                this._selectedNanoVersion = gameStreamingAgent.currentNanoVersion;

                // Attempt to find the currently in use-moniker, and if that is not available fall back to the recommended one
                this._selectedStreamConfig  = gameStreamingAgent.currentStreamSessionConfigMoniker;
                if (this._selectedStreamConfig === "") {
                    this._selectedStreamConfig = gameStreamingAgent.recommendedDevkitStreamConfigMoniker;
                }

                var configs = gameStreamingAgent.getSupportedDirectConnectStreamConfigs();
                var selectedConfigDisplayName = null;
                for (var i = 0; i < configs.displayNames.length; ++i) {
                    this._streamConfigMonikers[configs.displayNames[i]] = configs.monikers[i];
                    if (configs.monikers[i] == this._selectedStreamConfig) {
                        selectedConfigDisplayName = configs.displayNames[i];
                    }
                }
                this._streamConfigComboBox = this._buildComboBox(
                    selectedConfigDisplayName,
                    configs.displayNames,
                    "#xbdh-gameStreaming-config",
                    this._handleStreamConfigChanged.bind(this));

                this._updateStreamingStatusAcync().then(function () { }, function () { });
            }
            else {
                var toggle = this._toggleListenButton.querySelector('#xbdh-gameStreaming-directConnect-toggle');
                if (toggle) {
                    toggle.classList.toggle('xbdh-gameStreaming-directConnect-toggle--disabled', true);
                }
                this._toggleListenButton.onclick = null;
            }
        },

        unload: function () {
            if (gameStreamingAgent !== null) {
                gameStreamingAgent.removeEventListener("streamstatuschanged", this._onStreamStatusChangedBound);
            }
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();
