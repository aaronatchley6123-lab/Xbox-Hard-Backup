// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    const xbdhUtils = DevHome.Utilities;
    let gameStreamingAgent = null;

    const maxResolutionExternalName = 'maxResolution';
    const minResolutionExternalName = 'minResolution';
    const maxHeightInternalName = '/xbox/maxHeight';
    const maxWidthInternalName = '/xbox/maxWidth';
    const minHeightInternalName = '/xbox/minHeight';
    const minWidthInternalName = '/xbox/minWidth';

    const _configTypeEnum = {
        boolean: "boolean",
        signedInteger: "signedInteger",
        unsignedInteger: "unsignedInteger",
        double: "double",
        string: "string",
        resolution: "resolution",
    };

    // These strings do not need to be localized as they are keys in the key/value pair similar to xbconfig.
    const configMappings = [
        { externalName: 'maxBitrate', internalName: '/xbox/maxBitrate', type: _configTypeEnum.unsignedInteger },
        { externalName: 'minBitrate', internalName: '/xbox/minBitrate', type: _configTypeEnum.unsignedInteger },
        { externalName: maxResolutionExternalName, internalName: maxHeightInternalName, type: _configTypeEnum.resolution },
        { externalName: minResolutionExternalName, internalName: minHeightInternalName, type: _configTypeEnum.resolution },
        { externalName: 'keepAliveTimeout', internalName: 'nano.keepAliveTimeout', type: _configTypeEnum.signedInteger },
        { externalName: 'keepAliveInterval', internalName: 'nano.keepAliveInterval', type: _configTypeEnum.signedInteger },
        { externalName: 'keepAliveGracePeriodDuration', internalName: 'nano.keepAliveGracePeriodDuration', type: _configTypeEnum.signedInteger },
        { externalName: 'keepAliveGracePeriodTimeout', internalName: 'nano.keepAliveGracePeriodTimeout', type: _configTypeEnum.signedInteger },
        { externalName: 'keepAliveMtuMax', internalName: 'nano.KeepAliveMTUMax', type: _configTypeEnum.unsignedInteger },
        { externalName: 'prioritizeAudioChannel', internalName: 'nano.prioritizeAudioChannel', type: _configTypeEnum.boolean },
        { externalName: 'allowDirectCapture', internalName: '/plugin/static/allowDirectCapture', type: _configTypeEnum.boolean },
        { externalName: 'galenaEndpoint', internalName: 'galena.endpoint', type: _configTypeEnum.string },
        { externalName: 'galenaVideoPort', internalName: 'galena.videoPort', type: _configTypeEnum.unsignedInteger },
        { externalName: 'galenaAudioPort', internalName: 'galena.audioPort', type: _configTypeEnum.unsignedInteger },
        { externalName: 'galenaInputPort', internalName: 'galena.inputPort', type: _configTypeEnum.unsignedInteger },
        { externalName: 'galenaUseTls', internalName: 'galena.useTLS', type: _configTypeEnum.boolean },
        { externalName: 'galenaEnableStreamProtocolPlugin', internalName: 'galena.enableStreamProtocolPlugin', type: _configTypeEnum.boolean },
        { externalName: 'enableStateSharePrototype', internalName: '/xbox/enableStateSharePrototype', type: _configTypeEnum.boolean },
        { externalName: 'enableSensors', internalName: '/xbox/enableSensors', type: _configTypeEnum.boolean },
        { externalName: 'titleMkbDeviceManagementEnum', internalName: '/xbox/titleMkbDeviceManagementEnum', type: _configTypeEnum.unsignedInteger },
    ];

    const resolutionMappings = [
        { name: '720p', width: 1280, height: 720 },
        { name: '1080p', width: 1920, height: 1080 },
    ]

    WinJS.UI.Pages.define("/toolwindows/gameStreamingConfigOverrides/gameStreamingConfigOverrides.html", {
        _getConfigMappingWithInternalName: function (internalName) {
            for (const mapping of configMappings) {
                if (internalName === mapping.internalName) {
                    return mapping;
                }
            }

            return undefined;
        },
        _getConfigMappingWithExternalName: function (externalName) {
            for (const mapping of configMappings) {
                if (externalName === mapping.externalName) {
                    return mapping;
                }
            }

            return undefined;
        },
        _mapInternalToExternalValue: function (internalValue, mapping) {
            switch (mapping.type) {
                case _configTypeEnum.boolean:
                    // Note that the xbpt json code can't write boolean values to the JSON so it uses 0/1 instead
                    if (internalValue === 0 || internalValue === false) {
                        return false;
                    } else if (internalValue === 1 || internalValue === true)
                        return true;
                    break;
                case _configTypeEnum.signedInteger:
                case _configTypeEnum.unsignedInteger:
                case _configTypeEnum.double:
                case _configTypeEnum.string:
                    return internalValue;
                case _configTypeEnum.resolution:
                    for (const resolutionMapping of resolutionMappings) {
                        if (resolutionMapping.height === internalValue) {
                            return resolutionMapping.name;
                        }
                    }
                    break;
            }

            return undefined;
        },
        _mapExternalToInternalValue: function (externalValue, mapping) {
            let parsedValue;
            switch (mapping.type) {
                case _configTypeEnum.boolean:
                    // Note that a number is used instead as the xbpt json code doesn't support boolean values
                    if (externalValue === 'false') {
                        return 0;
                    } else if (externalValue === 'true') {
                        return 1;
                    }
                    break;
                case _configTypeEnum.signedInteger:
                    parsedValue = parseInt(externalValue);
                    if (!isNaN(parsedValue)) {
                        return parsedValue;
                    }
                    break;
                case _configTypeEnum.unsignedInteger:
                    parsedValue = parseInt(externalValue);
                    if (!isNaN(parsedValue) && parsedValue >= 0) {
                        return parsedValue;
                    }
                    break;
                case _configTypeEnum.double:
                    parsedValue = parseFloat(externalValue);
                    if (!isNaN(parsedValue)) {
                        return parsedValue;
                    }
                    break;
                case _configTypeEnum.string:
                    return externalValue;
                case _configTypeEnum.resolution:
                    for (const resolutionMapping of resolutionMappings) {
                        if (externalValue === resolutionMapping.name) {
                            return resolutionMapping;
                        }
                    }
                    break;
            }

            return undefined;
        },
        _updateConfigOverrides: function (configOverride) {
            let innerHtml = '';
            for (const mapping of configMappings) {
                if (configOverride.hasOwnProperty(mapping.internalName)) {
                    const externalValue = this._mapInternalToExternalValue(configOverride[mapping.internalName], mapping);
                    innerHtml += '<div class="xbdh-gamestreamingconfigoverrides-override xbdh-list-item xbdh-checkbox win-focusable xbdh-showmenuicononhover" data-xbdh-key="' + mapping.externalName + '" data-xbdh-value="' + externalValue + '" data-xbdh-contextmenu=#xbdh-gamestreamingconfigoverrides-contextmenu-override tabIndex="0">';
                    innerHtml += '  <label>' + mapping.externalName + '=' + externalValue + '</label>';
                    innerHtml += '</div>';
                }
            }

            this._overridesList.innerHTML = innerHtml;
        },
        _addOverrideSubmitInvoked: function () {
            try {
                if (gameStreamingAgent) {
                    // Grab the key and value of the override to add from the input fields
                    const key = document.getElementById("xbdh-gamestreamingconfigoverrides-add-key").value;
                    const value = document.getElementById("xbdh-gamestreamingconfigoverrides-add-value").value;

                    // Validate the key is supported
                    const mapping = this._getConfigMappingWithExternalName(key);
                    if (!mapping) {
                        xbdhUtils.showError(null,
                            DevHome.Utilities.Resources.getString("gameStreamingConfigOverridesErrorInvalidArgumentTitle").value,
                            DevHome.Utilities.Resources.getString("gameStreamingConfigOverridesErrorInvalidKeyDescription").value);
                        return;
                    }

                    // Validate the value is valid for the key's type
                    const internalValue = this._mapExternalToInternalValue(value, mapping);
                    if (internalValue === undefined) {
                        xbdhUtils.showError(null,
                            DevHome.Utilities.Resources.getString("gameStreamingConfigOverridesErrorInvalidArgumentTitle").value,
                            DevHome.Utilities.Resources.getString("gameStreamingConfigOverridesErrorInvalidValueDescription").value);
                        return;
                    }

                    // Grab the latest set of overrides
                    const configOverride = gameStreamingAgent.getConfigurationOverride();
                    const configOverrideJson = JSON.parse(configOverride);

                    // Update the override. Resolution is a bit special beacuse it needs to map to two fields internally.
                    if (mapping.type === _configTypeEnum.resolution) {
                        if (key === maxResolutionExternalName) {
                            configOverrideJson[maxHeightInternalName] = internalValue.height;
                            configOverrideJson[maxWidthInternalName] = internalValue.width;
                        } else if (key === minResolutionExternalName) {
                            configOverrideJson[minHeightInternalName] = internalValue.height;
                            configOverrideJson[minWidthInternalName] = internalValue.width;
                        }
                    } else {
                        configOverrideJson[mapping.internalName] = internalValue;
                    }

                    gameStreamingAgent.setConfigurationOverride(JSON.stringify(configOverrideJson));
                }
            } finally {
                // Hide the overlay
                const addOverlay = document.body.querySelector(".xbdh-gamestreamingconfigoverrides-add").winControl;
                addOverlay.hide();
            }
        },
        _addOverrideCancelInvoked: function () {
            // Hide the overlay
            const addOverlay = document.body.querySelector(".xbdh-gamestreamingconfigoverrides-add").winControl;
            addOverlay.hide();
        },
        _addOverrideInvoked: function () {
            xbdhUtils._Events.logUIAction("GameStreamingConfigOverrides:Add");

            // Show a dialog
            const addRootDiv = document.createElement("div");
            addRootDiv.classList.add("xbdh-gamestreamingconfigoverrides-add");
            addRootDiv.classList.add("xbdh-overlay");
            addRootDiv.classList.add("xbdh-overlay-tall");
            const addHtml =
                '<form class="xbdh-gamestreamingconfigoverrides-add-form">' +
                '  <h1 class="xbdh-gamestreamingconfigoverrides-add-heading">' + DevHome.Utilities.Resources.getString("gameStreamingConfigOverrideAddOverlayTitle").value + '</h1>' +
                '  <label class="xbdh-label">' + DevHome.Utilities.Resources.getString("gameStreamingConfigOverridesKey").value + '</label>' +
                '  <input id="xbdh-gamestreamingconfigoverrides-add-key" type="text" />' +
                '  <label class="xbdh-label">' + DevHome.Utilities.Resources.getString("gameStreamingConfigOverridesValue").value + '</label>' +
                '  <input id="xbdh-gamestreamingconfigoverrides-add-value" type="text" />' +
                '  <div class="xbdh-form-buttons">' +
                '    <button id="xbdh-gamestreamingconfigoverrides-add-add" type="button">' + DevHome.Utilities.Resources.getString("commandAdd").value + '</button>' +
                '    <button id="xbdh-gamestreamingconfigoverrides-add-cancel" type="button">' + DevHome.Utilities.Resources.getString("commandCancel").value + '</button>' +
                '  </div>' +
                '</form>';

            const addOverlay = new DevHome.UI.Overlay(addRootDiv, { html: addHtml });

            // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
            // to get reset to the main workspace after this function executes, which we don't want. We want the show() method
            // call to set focus to the user details overlay instead.
            setImmediate(function () {
                if (this._disposed) {
                    return;
                }

                if (addOverlay) {
                    addOverlay.show();

                    // Add behavior to textboxes
                    xbdhUtils.addTextboxBehaviors(addRootDiv);

                    const keyField = addRootDiv.querySelector("#xbdh-gamestreamingconfigoverrides-add-key");
                    keyField.focus();

                    // Bring up the virtual keyboard
                    const inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();
                    inputPane.tryShow();

                    // Hook up buttons
                    const addButton = addRootDiv.querySelector("#xbdh-gamestreamingconfigoverrides-add-add");
                    addButton.addEventListener("click", this._addOverrideSubmitInvoked.bind(this), false);

                    const cancelButton = addRootDiv.querySelector("#xbdh-gamestreamingconfigoverrides-add-cancel");
                    cancelButton.addEventListener("click", this._addOverrideCancelInvoked.bind(this), false);
                }
            }.bind(this));
        },
        _clearAllOverrideInvoked: function () {
            if (gameStreamingAgent) {
                gameStreamingAgent.setConfigurationOverride("{}");
            }
        },
        _editOverrideSaveInvoked: function () {
            try {
                if (gameStreamingAgent) {
                    // Grab the key and value of the override to edit from the input fields
                    const key = document.getElementById("xbdh-gamestreamingconfigoverrides-edit-key").value;
                    const value = document.getElementById("xbdh-gamestreamingconfigoverrides-edit-value").value;

                    // Validate the key is supported
                    const mapping = this._getConfigMappingWithExternalName(key);
                    if (!mapping) {
                        xbdhUtils.showError(null,
                            DevHome.Utilities.Resources.getString("gameStreamingConfigOverridesErrorInvalidArgumentTitle").value,
                            DevHome.Utilities.Resources.getString("gameStreamingConfigOverridesErrorInvalidKeyDescription").value);
                        return;
                    }

                    // Validate the value is valid for the key's type
                    const internalValue = this._mapExternalToInternalValue(value, mapping);
                    if (!internalValue) {
                        xbdhUtils.showError(null,
                            DevHome.Utilities.Resources.getString("gameStreamingConfigOverridesErrorInvalidArgumentTitle").value,
                            DevHome.Utilities.Resources.getString("gameStreamingConfigOverridesErrorInvalidValueDescription").value);
                        return;
                    }

                    // Grab the latest set of overrides
                    const configOverride = gameStreamingAgent.getConfigurationOverride();
                    const configOverrideJson = JSON.parse(configOverride);

                    // Update the override. Resolution is a bit special beacuse it needs to map to two fields internally.
                    if (mapping.type === _configTypeEnum.resolution) {
                        if (key === maxResolutionExternalName) {
                            configOverrideJson[maxHeightInternalName] = internalValue.height;
                            configOverrideJson[maxWidthInternalName] = internalValue.width;
                        } else if (key === minResolutionExternalName) {
                            configOverrideJson[minHeightInternalName] = internalValue.height;
                            configOverrideJson[minWidthInternalName] = internalValue.width;
                        }
                    } else {
                        configOverrideJson[mapping.internalName] = internalValue;
                    }

                    gameStreamingAgent.setConfigurationOverride(JSON.stringify(configOverrideJson));
                }
            } finally {
                // Hide the overlay
                const editOverlay = document.body.querySelector(".xbdh-gamestreamingconfigoverrides-edit").winControl;
                editOverlay.hide();
            }
        },
        _editOverrideCancelInvoked: function () {
            // Hide the overlay
            const editOverlay = document.body.querySelector(".xbdh-gamestreamingconfigoverrides-edit").winControl;
            editOverlay.hide();
        },
        _editOverrideInvoked: function (e) {
            xbdhUtils._Events.logUIAction("GameStreamingConfigOverrides:Edit");

            const contextMenu = e.srcElement.parentNode;
            const key = contextMenu.winControl.context.getAttribute("data-xbdh-key");
            const value = contextMenu.winControl.context.getAttribute("data-xbdh-value");

            // Show a dialog
            const editRootDiv = document.createElement("div");
            editRootDiv.classList.add("xbdh-gamestreamingconfigoverrides-edit");
            editRootDiv.classList.add("xbdh-overlay");
            editRootDiv.classList.add("xbdh-overlay-tall");
            const editHtml =
                '<form class="xbdh-gamestreamingconfigoverrides-edit-form">' +
                '  <h1 class="xbdh-gamestreamingconfigoverrides-edit-heading">' + DevHome.Utilities.Resources.getString("gameStreamingConfigOverrideEditOverlayTitle").value + '</h1>' +
                '  <label class="xbdh-label">' + DevHome.Utilities.Resources.getString("gameStreamingConfigOverridesKey").value + '</label>' +
                '  <input id="xbdh-gamestreamingconfigoverrides-edit-key" type="text" disabled="disabled" value="' + key + '" />' +
                '  <label class="xbdh-label">' + DevHome.Utilities.Resources.getString("gameStreamingConfigOverridesValue").value + '</label>' +
                '  <input id="xbdh-gamestreamingconfigoverrides-edit-value" type="text" value="' + value + '" />' +
                '  <div class="xbdh-form-buttons">' +
                '    <button id="xbdh-gamestreamingconfigoverrides-edit-save" type="button">' + DevHome.Utilities.Resources.getString("commandSave").value + '</button>' +
                '    <button id="xbdh-gamestreamingconfigoverrides-edit-cancel" type="button">' + DevHome.Utilities.Resources.getString("commandCancel").value + '</button>' +
                '  </div>' +
                '</form>';

            const editOverlay = new DevHome.UI.Overlay(editRootDiv, { html: editHtml });

            // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
            // to get reset to the main workspace after this function executes, which we don't want. We want the show() method
            // call to set focus to the user details overlay instead.
            setImmediate(function () {
                if (this._disposed) {
                    return;
                }

                if (editOverlay) {
                    editOverlay.show();

                    // Add behavior to textboxes
                    xbdhUtils.addTextboxBehaviors(editRootDiv);

                    const valueField = editRootDiv.querySelector("#xbdh-gamestreamingconfigoverrides-edit-value");
                    valueField.focus();

                    // Bring up the virtual keyboard
                    const inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();
                    inputPane.tryShow();

                    // Hook up buttons
                    const saveButton = editRootDiv.querySelector("#xbdh-gamestreamingconfigoverrides-edit-save");
                    saveButton.addEventListener("click", this._editOverrideSaveInvoked.bind(this), false);

                    const cancelButton = editRootDiv.querySelector("#xbdh-gamestreamingconfigoverrides-edit-cancel");
                    cancelButton.addEventListener("click", this._editOverrideCancelInvoked.bind(this), false);
                }
            }.bind(this));
        },
        _clearOverrideInvoked: function (e) {
            if (gameStreamingAgent) {
                // Grab the key of the override to remove from the list item's attribute
                const contextMenu = e.srcElement.parentNode;
                const key = contextMenu.winControl.context.getAttribute("data-xbdh-key");

                const mapping = this._getConfigMappingWithExternalName(key);
                if (!mapping) {
                    return;
                }

                // Grab the latest overrides and attempt to the field
                const configOverride = gameStreamingAgent.getConfigurationOverride();
                const configOverrideJson = JSON.parse(configOverride);
                delete configOverrideJson[mapping.internalName];

                // Resolution settings are not a 1:1 mapping so clear out the second value
                if (mapping.type === _configTypeEnum.resolution) {
                    if (key === maxResolutionExternalName) {
                        delete configOverrideJson[maxHeightInternalName];
                    } else if (key === minResolutionExternalName) {
                        delete configOverrideJson[minHeightInternalName];
                    }
                }

                // Inform the streaming agent with the updated json
                gameStreamingAgent.setConfigurationOverride(JSON.stringify(configOverrideJson));
            }
        },
        _onConfigOverrideChanged: function (e) {
            const configOverride = e.configurationOverride;
            const configOverrideJson = JSON.parse(configOverride);
            this._updateConfigOverrides(configOverrideJson);
        },
        ready: async function (element, options) {
            this._statusChangeDiv = element.querySelector("#xbdh-gameStreaming-change-status");
            this._addButton = element.querySelector("#xbdh-gamestreamingconfigoverrides-add");
            this._clearAllButton = element.querySelector("#xbdh-gamestreamingconfigoverrides-clearall");
            this._overridesList = element.querySelector("#xbdh-gamestreamingconfigoverrides-overrides-list");
            this._editContextMenuButton = element.querySelector("#xbdh-gamestreamingconfigoverrides-contextmenu-override-edit");
            this._clearContextMenuButton = element.querySelector("#xbdh-gamestreamingconfigoverrides-contextmenu-override-clear");

            // Add event listeners for the buttons
            this._addButton.addEventListener("click", this._addOverrideInvoked.bind(this), false);
            this._clearAllButton.addEventListener("click", this._clearAllOverrideInvoked.bind(this), false);
            this._editContextMenuButton.addEventListener("click", this._editOverrideInvoked.bind(this), false);
            this._clearContextMenuButton.addEventListener("click", this._clearOverrideInvoked.bind(this), false);

            // Attempt to grab the game streaming agent
            if (gameStreamingAgent === null) {
                try {
                    gameStreamingAgent = Windows.Xbox.System.Internal.GameStreaming.GameStreamingAgent;
                }
                catch (e) {
                    // We failed to make a connection to the agent. Leave the agent null, and display an error when the page loads.
                    // We will try to reconnect the next time this page is loaded.
                }
            }

            if (gameStreamingAgent) {
                // Register for the config override change event so it can refresh whenever it is modified here or from the CLI
                this._onConfigOverrideChangedBound = this._onConfigOverrideChanged.bind(this);
                gameStreamingAgent.addEventListener("configurationoverridechanged", this._onConfigOverrideChangedBound, false);

                // Load the current config override
                const configOverride = gameStreamingAgent.getConfigurationOverride();
                const configOverrideJson = JSON.parse(configOverride);
                this._updateConfigOverrides(configOverrideJson);
            }
            else {
                this._statusDiv.innerHTML =
                    '<h1 class="xbdh-gameStreaming-overallstatus xbdh-gameStreaming-overallstatus-limited">' +
                    '  <div class="xbdh-gameStreaming-overallstatus-icon"></div>' +
                    '  <span class="xbdh-gameStreaming-overallstatus-status">' + DevHome.Utilities.Resources.getString("gameStreamingServerUnavailable").value + '</span>' +
                    '</h1>';
                this._toggleListenButton.disabled = true;
            }
        },
        unload: function () {
            if (gameStreamingAgent !== null) {
                gameStreamingAgent.removeEventListener("configurationoverridechanged", this._onConfigOverrideChangedBound);
            }
        },
        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();
