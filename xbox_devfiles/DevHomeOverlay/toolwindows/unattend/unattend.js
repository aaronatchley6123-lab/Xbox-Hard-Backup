// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var unattendUtils = Microsoft.Xbox.Development.UnattendedUtilities;
    var xbdhUtils = DevHome.Utilities;
    var nativeUtils = xbdhUtils.getDevHomeNativeUtilities();

    var scriptFolderPath = "d:\\boot";
    var logFolderPath = scriptFolderPath + "\\logs";

    WinJS.UI.Pages.define("/toolwindows/unattend/unattend.html", {
        _allowedToggled: function () {
            unattendUtils.shouldBlockUnattendScripts = !this._allowUnattendedScriptsCheckbox.checked;

            this._updateAllowedState();
            this._updateRunScriptOnUsbState();
        },
        _allowUsbToggled: function () {
            unattendUtils.shouldBlockUsbScripts = !this._allowUsbScriptsCheckbox.checked;

            this._updateUsbAllowedState();
            this._updateRunScriptOnUsbState();
        },
        _runImmediatelyToggled: function () {
            unattendUtils.shouldSkipAbortToast = this._runImmediatelyCheckbox.checked;

            this._updateRunImmediatelyState();
        },
        _closeConfigureUnattendOverlay: function () {
            var overlay = document.querySelector(".xbdh-unattend-configureunattend").winControl;
            overlay.hide();
            xbdhUtils._Events.logCommandResult("UnattendedScripts:ConfiguredPortal", "allowed: " + (!unattendUtils.shouldBlockUnattendScripts).toString(), 0);
        },
        _clearStoredScript: function () {
            try {
                unattendUtils.removeUnattendedScript();
            } catch (e) {
                // Do nothing
            }

            // Set default focus
            this._allowUnattendedScriptsCheckbox.focus();

            this._updateClearScriptState();
        },
        _viewLastLog: function () {
            try {
                var logFolder = Microsoft.Xbox.Development.StorageUtilities.getFolder(logFolderPath);

                // See if we have any files in the logs directory
                logFolder.getFilesAsync()
                    .then(function (files) {
                        if (files && files.length > 0) {
                            var newestIndex = 0;

                            for (var i = 1; i < files.length; ++i) {
                                if (files[i].dateCreated > files[newestIndex].dateCreated) {
                                    newestIndex = i;
                                }
                            }
                            DevHome.Utilities.showSimpleTextFileAsync(logFolderPath, files[newestIndex].name);
                        }
                    });
            } catch (ex) {
                // do nothing
            }
        },
        _runScriptOnUsb: function () {
            try {
                // Disable the button to prevent pressing it multiple times.
                this._runScriptOnUsbButton.disabled = true;
                this._closeConfigureUnattendButton.focus();

                unattendUtils.runUnattendedScriptOnUsbAsync();
            } catch(e){
                // Do nothing. This shouldn't normally fail but can if the user removes the USB
                // drive at the right time.
            }
        },
        _showConfigureUnattendOverlay: function () {
            xbdhUtils._Events.logUIAction("UnattendedScripts:ShowConfigureUnattendOverlay");

            var configureUnattendRootDiv = document.createElement("div");
            configureUnattendRootDiv.tabIndex = "0";
            configureUnattendRootDiv.classList.add("xbdh-unattend-configureunattend");
            configureUnattendRootDiv.classList.add("xbdh-overlay");
            var configureUnattendHtml =
                    '<div id="xbdh-unattend" class="xbdh-form">' +
                    '    <h1 class="xbdh-unattend-heading">' + DevHome.Utilities.Resources.getString("unattendedSetupTitle").value + '</h1>' +
                    '    <div id="xbdh-unattend-allowunattendsection">' +
                    '        <input id="xbdh-unattend-allowunattend" type="checkbox" /><label>' + DevHome.Utilities.Resources.getString("unattendAllowScripts").value + '</label>' +
                    '    </div>' +
                    '    <div id="xbdh-unattend-settings" style="display: none;">' +
                    '        <input id="xbdh-unattend-allowusb" type="checkbox" /><label>' + DevHome.Utilities.Resources.getString("unattendAllowUsbScripts").value + '</label>' +
                    '        <input id="xbdh-unattend-runimmediately" type="checkbox" /><label>' + DevHome.Utilities.Resources.getString("unattendRunImmediately").value + '</label>' +
                    '        <div class="xbdh-form-buttons">' +
                    '            <button id="xbdh-unattend-runscriptonusb" type="button" data-win-xyfocus="{ down: \"#xbdh-unattend-runscriptonusb\" }" disabled>' + DevHome.Utilities.Resources.getString("unattendRunScriptOnUsb").value + '</button>' +
                    '            </br></br>' +
                    '            <button id="xbdh-unattend-clearstoredscript" type="button" data-win-xyfocus="{ down: \'#xbdh-unattend-clearstoredscript\' }" tabindex="2" disabled>' + DevHome.Utilities.Resources.getString("unattendClearStoredScript").value + '</button>' +
                    '            </br ></br > ' +
                    '            <button id="xbdh-unattend-viewlastlog" type="button" data-win-xyfocus="{ down: \"#xbdh-unattend-viewlastlog\" }" disabled>' + DevHome.Utilities.Resources.getString("unattendViewLastLog").value + '</button>' +
                    '        </div>' +
                    '    </div>' +
                    '   <div class="xbdh-form-buttons">' +
                    '       <button id="xbdh-unattend-close" type="button" tabindex="4">' + DevHome.Utilities.Resources.getString("commandClose").value + '</button>' +
                    '   </div>' +
                    '</div>';

            var configureUnattendOverlay = new DevHome.UI.Overlay(configureUnattendRootDiv, { html: configureUnattendHtml });

            // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
            // to get reset to the main workspace after this function executes, which we don't want.
            setImmediate(function () {
                if (configureUnattendOverlay) {
                    // We need to set the overlay to the active element, otherwise hitting B won't dismiss it because focus 
                    // won't be on the overlay.
                    configureUnattendOverlay.show();

                    this._closeConfigureUnattendButton = configureUnattendRootDiv.querySelector("#xbdh-unattend-close");
                    this._clearStoredScriptButton = configureUnattendRootDiv.querySelector("#xbdh-unattend-clearstoredscript");
                    this._viewLastLogButton = configureUnattendRootDiv.querySelector("#xbdh-unattend-viewlastlog");
                    this._runScriptOnUsbButton = configureUnattendRootDiv.querySelector("#xbdh-unattend-runscriptonusb");
                    this._allowUnattendedScriptsCheckbox = configureUnattendRootDiv.querySelector("#xbdh-unattend-allowunattend");
                    this._allowUsbScriptsCheckbox = configureUnattendRootDiv.querySelector("#xbdh-unattend-allowusb");
                    this._runImmediatelyCheckbox = configureUnattendRootDiv.querySelector("#xbdh-unattend-runimmediately");
                    this._settingsSection = configureUnattendRootDiv.querySelector("#xbdh-unattend-settings");

                    // Hook up input fields and buttons
                    this._closeConfigureUnattendButton.addEventListener("click", this._closeConfigureUnattendOverlay.bind(this), false);
                    this._clearStoredScriptButton.addEventListener("click", this._clearStoredScript.bind(this), false);
                    this._viewLastLogButton.addEventListener("click", this._viewLastLog.bind(this), false);
                    this._runScriptOnUsbButton.addEventListener("click", this._runScriptOnUsb.bind(this), false);
                    this._allowUnattendedScriptsCheckbox.addEventListener("change", this._allowedToggled.bind(this), false);
                    this._allowUsbScriptsCheckbox.addEventListener("change", this._allowUsbToggled.bind(this), false);
                    this._runImmediatelyCheckbox.addEventListener("change", this._runImmediatelyToggled.bind(this), false);

                    // Add behavior to textboxes
                    xbdhUtils.addFormBehaviors(configureUnattendRootDiv);

                    this._updateAllowedState();
                    this._updateUsbAllowedState();
                    this._updateRunImmediatelyState();
                    this._updateClearScriptState();
                    this._updateViewLastLogStateAsync();
                    this._updateRunScriptOnUsbState();

                    xbdhUtils.addTextboxBehaviors(configureUnattendRootDiv);

                    // Set default focus
                    this._allowUnattendedScriptsCheckbox.focus();
                }
            }.bind(this));
        },
        _updateAllowedState: function () {
            var allowScripts = !unattendUtils.shouldBlockUnattendScripts;
            if (allowScripts) {
                this._settingsSection.style.display = "block";
            } else {
                this._settingsSection.style.display = "none";
            }
            this._allowUnattendedScriptsCheckbox.checked = allowScripts;
        },
        _updateUsbAllowedState: function () {
            this._allowUsbScriptsCheckbox.checked = !unattendUtils.shouldBlockUsbScripts;
        },
        _updateRunImmediatelyState: function () {
            this._runImmediatelyCheckbox.checked = unattendUtils.shouldSkipAbortToast;
        },
        _updateClearScriptState: function () {
            this._clearStoredScriptButton.disabled = true;
            try {
                var scriptFolder = Microsoft.Xbox.Development.StorageUtilities.getFolder(scriptFolderPath);

                // See if the boot script exists
                scriptFolder.getFileAsync("boot.cmd")
                    .then(function (file) {
                        var rootDiv = document.querySelector(".xbdh-unattend-configureunattend");
                        var clearButton = rootDiv.querySelector("#xbdh-unattend-clearstoredscript");
                        clearButton.disabled = false;
                    });
            } catch (ex) {
                // do nothing
            }
        },
        _updateViewLastLogStateAsync: async function () {
            this._viewLastLogButton.disabled = true;
            try {
                var logFolder = await nativeUtils.getFolderAsync(logFolderPath);

                // See if we have any files in the logs directory
                var files = await logFolder.getFilesAsync();
                if (files && files.length > 0) {
                    var rootDiv = document.querySelector(".xbdh-unattend-configureunattend");
                    var lastLogButton = rootDiv.querySelector("#xbdh-unattend-viewlastlog");
                    lastLogButton.disabled = false;
                }
            } catch (ex) {
                // do nothing
            }
        },
        _updateRunScriptOnUsbState: function () {

            // Disable this button if we are blocking scripts or don't have one to run.
            try {
                this._runScriptOnUsbButton.disabled = unattendUtils.shouldBlockUnattendScripts ||
                    unattendUtils.shouldBlockUsbScripts ||
                    !unattendUtils.hasUnattendedScriptOnUsb;
            } catch (ex) {
                // disable the button if we fail to get a script.
                this._runScriptOnUsbButton.disabled = true;
            }
        },
        ready: function (element, options) {
            this._layoutRoot = element;

            var configureUnattendButton = element.querySelector("#xbdh-unattend-configureunattend");
            configureUnattendButton.addEventListener("click", this._showConfigureUnattendOverlay.bind(this), false);
        }
    });
})();