// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var debugUtils = Microsoft.Xbox.Development.DebugUtilities;
    var devHomeNativeUtils = Microsoft.Xbox.Tools.ConsoleExtensions.InternalDevHomeUtilities;
    var systemProperties = Microsoft.Xbox.Tools.ConsoleExtensions.SystemConfigurationProperties;
    var xbdhUtils = DevHome.Utilities;
    var nativeUtils = xbdhUtils.getDevHomeNativeUtilities();
    var utils = DevHome.Utilities;

    // Refresh the pin every 5 minutes
    var _HOME_AUMID = "Xbox.Dashboard_8wekyb3d8bbwe!Xbox.Dashboard.Application";
    var _PIN_REFRESH_INTERVAL = 90000;
    var _RETAIL_SANDBOX_ID = "RETAIL";
    var _UPDATE_SERVICE_STATUS_INTERVAL = 5 * 60 * 1000;
    var _MAX_SANDBOX_ID_LENGTH = 15;

    WinJS.UI.Pages.define("/toolwindows/commonActions/commonActions.html", {
        _launchHomeInvoked: function () {
            try {
                Microsoft.Xbox.Development.ApplicationUtilities.launch(_HOME_AUMID);
                xbdhUtils._Events.logUIAction("CommonActions:LaunchHomeSuccess");
            } catch (ex) {
                // The application could have failed to launch for a number of reasons, all harmless.
                // (eg. already running, app crashed during activation, etc)
                xbdhUtils._Events.logUIAction("CommonActions:LaunchHomeFailure", ex.number);
            }
        },
        _restartConsoleInvoked: function () {
            this._promptRestart(true);
        },
        _friendlyStatusFromStatusCode: function (statusCode) {
            var friendlyStatus = "";
            switch (statusCode) {
                // For our purposes, service statuses of 3, which means partner services are down, still count as
                // Xbox Live being green.
                case "1":
                case "3":
                    friendlyStatus = DevHome.Utilities.Resources.getString("xboxLiveServiceStatusServiceStatusGood").value;
                    break;
                case "2":
                    friendlyStatus = DevHome.Utilities.Resources.getString("xboxLiveServiceStatusServiceStatusLimited").value;
                    break;
                default:
                    friendlyStatus = DevHome.Utilities.Resources.getString("xboxLiveServiceStatusServiceStatusUnknown").value;
                    break;
            }
            return friendlyStatus;
        },
        _updateServiceStatusAsync: async function () {

            // Assume unknown.
            var statusCode = "0";

            try {
                var statusInfo = await nativeUtils.getXboxLiveStatusAsync();

                if (statusInfo) {
                    statusCode = statusInfo.statusCode;
                }
            } catch (ex) {
                /* Swallow exception */
            }

            if (this._layoutRoot.winControl._disposed) {
                return;
            }

            var innerHtml = "";

            // Get overall live status
            var overallStatusClass = "xbdh-commonactions-overallstatus-good";
            if (statusCode === "0" || statusCode === "2") {
                overallStatusClass = "xbdh-commonactions-overallstatus-limited";
            }
            innerHtml +=
                '<div class="xbdh-commonactions-overallstatus ' + overallStatusClass + '">' +
                '<div aria-hidden="true" class="xbdh-commonactions-overallstatus-icon"></div>' +
                DevHome.Utilities.Resources.getString("xboxLiveServiceStatusOverallStatus").value +
                '<div class="xbdh-commonactions-overallstatus-status">' + this._friendlyStatusFromStatusCode(statusCode) + '</div>' +
                '</div>';

            var rootElement = this._layoutRoot.querySelector("#xbdh-commonactions-xboxliveservicestatus-status");

            // Remove the old DOM
            var children = rootElement.childNodes;
            for (var i = 0, len = children.length; i < len; i++) {
                children[i].parentNode.removeChild(children[i]);
            }
            rootElement.innerHTML = innerHtml;
        },
        _cancelRestart: function (e) {
            var dialog = document.getElementById("xbdh-dialog").winControl;
            dialog.hide();
            // Workaround a bug - the keyboard comes up on keyup, but buttons get clicked on keydown so the keydown A goes to the button
            // and then the keyup goes to the text field and the keyboard gets raised.
            var that = this;
            this._inputPane.addEventListener("showing", function inputPaneShowing() {
                that._inputPane.tryHide();
                that._inputPane.removeEventListener("showing", inputPaneShowing);
            }, false);
        },
        _closeSwitchToRetailOverlay: function () {
            var overlay = document.querySelector(".xbdh-consolesettings-switchtoretail-overlay").winControl;
            overlay.hide();
        },
        _handleChangeSandbox: function () {
            DevHome.Utilities._Events.logUIAction("ConsoleSettings:ChangeSandbox");
            var sandboxElement = document.querySelector("#xbdh-commonactions-sandboxid");
            var sandboxId = sandboxElement.value;
            // Having a lowercase or mixed case Sandbox ID is not a valid scenario and will cause
            // errors. That is why we always change the Sandbox ID to uppercase to prevent this.
            sandboxId = sandboxId.toUpperCase();

            // trim trailing and leading spaces
            sandboxId = sandboxId.replace(/^\s+|\s+$/g, "");

            sandboxElement.textContent = sandboxId;
            if (systemProperties.sandboxId !== sandboxId) {
                // We do error checking for "RETAIL", because there is never a valid scenario
                // for an external developer when a devkit should be in the RETAIL sandbox.
                if (sandboxId === _RETAIL_SANDBOX_ID) {
                    DevHome.Utilities.showError(
                        null,
                        DevHome.Utilities.Resources.getString("errorChangeSandboxTitle").value,
                        DevHome.Utilities.Resources.getString("errorChangeSandboxRetailIsInvalidDescription1").value + "<br /><br />" + DevHome.Utilities.Resources.getString("errorChangeSandboxRetailIsInvalidDescription2").value);
                    return;
                }

                if (sandboxId.length > _MAX_SANDBOX_ID_LENGTH) {
                    xbdhUtils.showPopUp(
                        DevHome.Utilities.Resources.getString("errorInvalidValueTitle").value,
                        DevHome.Utilities.Resources.getString("errorSandboxIdLengthDescription").value,
                        null,
                        null);
                    return;
                }

                try {
                    systemProperties.sandboxId = sandboxId;
                    this._promptRestart();
                } catch (ex) {
                    console.log();
                    DevHome.Utilities.showError(
                        null,
                        DevHome.Utilities.Resources.getString("errorChangeSandboxTitle").value,
                        DevHome.Utilities.Resources.getString("errorChangeSandboxRetailIsInvalidDescription1").value + "<br /><br />" + DevHome.Utilities.Resources.getString("errorChangeSandboxRetailIsInvalidDescription2").value);
                }
            }
        },
        _changeSandboxInvoked: function (e) {
            var changeSandboxRootDiv = document.createElement("div");
            changeSandboxRootDiv.tabIndex = "0";
            changeSandboxRootDiv.classList.add("xbdh-commonsettings-changesandbox-overlay");
            changeSandboxRootDiv.classList.add("xbdh-overlay");
            changeSandboxRootDiv.classList.add("xbdh-overlay-short");
            var changeSandboxHtml =
                '<div class="xbdh-form">' +
                '  <h1>' + DevHome.Utilities.Resources.getString("commonActionsChangeSandboxDialogTitle").value + '</h1>' +
                '  <p id="xbdh-commonactions-changesandbox-description">' + DevHome.Utilities.Resources.getString("commonActionsChangeSandboxDialogDescription").value + '</p>' +
                '  <input id="xbdh-commonactions-sandboxid" type="text" />' +
                '  <div class="xbdh-form-buttons">' +
                '    <button id="xbdh-commonactions-changesandbox-okcommand" type="button">' + DevHome.Utilities.Resources.getString("commandSaveAndRestart").value + '</button>' +
                '    <button id="xbdh-commonactions-changesandbox-closecommand" type="button">' + DevHome.Utilities.Resources.getString("commandCancel").value + '</button>' +
                '  </div>' +
                '</div>';

            var changeSandboxOverlay = new DevHome.UI.Overlay(changeSandboxRootDiv, { html: changeSandboxHtml });

            // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
            // to get reset to the main workspace after this function executes, which we don't want.
            setImmediate(function () {
                if (changeSandboxOverlay) {
                    // We need to set the overlay to the active element, otherwise hitting B won't dismiss it because focus 
                    // won't be on the overlay.
                    changeSandboxOverlay.show();

                    var sandboxTextBox = changeSandboxRootDiv.querySelector("#xbdh-commonactions-sandboxid");
                    sandboxTextBox.value = systemProperties.sandboxId;

                    // Hook up click handlers
                    var okayButton = changeSandboxRootDiv.querySelector("#xbdh-commonactions-changesandbox-okcommand");
                    var cancelButton = changeSandboxRootDiv.querySelector("#xbdh-commonactions-changesandbox-closecommand");
                    okayButton.addEventListener("click", this._handleChangeSandbox.bind(this), false);
                    cancelButton.addEventListener("click", changeSandboxOverlay.hide.bind(changeSandboxOverlay), false);

                    xbdhUtils.addTextboxBehaviors(changeSandboxRootDiv);

                    // Set default focus to the close button
                    sandboxTextBox.focus();
                }
            }.bind(this));
        },
        _inputPane: null,
        _promptRestart: function (hideDescription) {

            // Allow callers to hide the description text
            var description = "";
            if (!hideDescription) {
                description = DevHome.Utilities.Resources.getString("consoleSettingsRestartPromptDescription").value;
            }
            DevHome.Utilities.showPopUp(
                DevHome.Utilities.Resources.getString("consoleSettingsRestartPromptTitle").value,
                description,
                {
                    label: DevHome.Utilities.Resources.getString("commandRestartNow").value,
                    callback: this._reboot
                },
                {
                    label: DevHome.Utilities.Resources.getString("commandCancel").value,
                    callback: this._cancelRestart.bind(this)
                },
                "xbdh-consolesettings-restartprompt");
        },
        _leaveDevModeInvoked: function () {
            var switchToRetailRootDiv = document.createElement("div");
            switchToRetailRootDiv.tabIndex = "0";
            switchToRetailRootDiv.classList.add("xbdh-consolesettings-switchtoretail-overlay");
            switchToRetailRootDiv.classList.add("xbdh-overlay");
            switchToRetailRootDiv.classList.add("xbdh-overlay-short");
            var switchToRetailHtml =
                '<div class="xbdh-form">' +
                '  <h1>' + DevHome.Utilities.Resources.getString("consoleSettingsSwitchToRetailDialogTitle").value + '</h1>' +
                '  <p id="xbdh-consolesettings-switchtoretail-description">' + DevHome.Utilities.Resources.getString("consoleSettingsSwitchToRetailDialogDescription").value + '</p>' +
                '  <input id="xbdh-consolesettings-switchtoretail-deletedevstorage" type="checkbox" /><label>' + DevHome.Utilities.Resources.getString("consoleSettingsDeleteDeveloperStorageLabel").value + '</label>' +
                '  <div class="xbdh-form-buttons">' +
                '    <button id="xbdh-consolesettings-switchtoretail-okcommand" type="button">' + DevHome.Utilities.Resources.getString("commandOk").value + '</button>' +
                '    <button id="xbdh-consolesettings-switchtoretail-closecommand" type="button">' + DevHome.Utilities.Resources.getString("commandCancel").value + '</button>' +
                '  </div>' +
                '</div>';

            var switchToRetailOverlay = new DevHome.UI.Overlay(switchToRetailRootDiv, { html: switchToRetailHtml });

            // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
            // to get reset to the main workspace after this function executes, which we don't want.
            setImmediate(function () {
                if (switchToRetailOverlay) {
                    // We need to set the overlay to the active element, otherwise hitting B won't dismiss it because focus 
                    // won't be on the overlay.
                    switchToRetailOverlay.show();

                    // Hook up click handlers
                    var okayButton = switchToRetailRootDiv.querySelector("#xbdh-consolesettings-switchtoretail-okcommand");
                    var cancelButton = switchToRetailRootDiv.querySelector("#xbdh-consolesettings-switchtoretail-closecommand");
                    okayButton.addEventListener("click", this._switchToRetail.bind(this), false);
                    cancelButton.addEventListener("click", this._closeSwitchToRetailOverlay.bind(this), false);

                    // Set default focus to the close button
                    okayButton.focus();
                }
            }.bind(this));
        },
        _switchToRetail: function () {
            // If the checkbox to clear dev storage is set, then clear dev storage
            var clearDevStorageCheckBox = document.getElementById("xbdh-consolesettings-switchtoretail-deletedevstorage");
            if (clearDevStorageCheckBox.checked) {
                try {
                    devHomeNativeUtils.resetDevScratch();
                } catch (ex) {
                    console.log();
                }
            }
            try {
                Windows.Xbox.System.Internal.DevelopmentKit.DevelopmentKitProperties.enableDevelopmentModeAsync(false).then(
                function success(result) {
                    xbdhUtils._Events.logCommandResult("SwitchToRetail", null, 0);
                    this._reboot();
                }.bind(this),
                function error(errorObject) {
                    xbdhUtils._Events.logCommandResult("SwitchToRetail", null, errorObject.number);
                    DevHome.Utilities.showError();
                });
            } catch (ex) {
                // enableDevelopmentModeAsync is known to throw exceptions even though it succeeds
                // so we proceed with the reboot
                this._reboot();
            }
        },
        _reboot: function () {
            try {
                Windows.Xbox.System.Internal.Power.PowerProperties.restartConsole();
            } catch (e) {
                // Asking the user to try again in this scenario.
                xbdhUtils.showError(null,
                    DevHome.Utilities.Resources.getString("errorRebootFailedTitle").value,
                    DevHome.Utilities.Resources.getString("errorRebootFailedDescription").value);
            }
        },
        _showVisualStudioPinInvoked: function () {
            this._showVSPinPairingOverlay();
        },
        _showVSPinPairingOverlay: function () {
            xbdhUtils._Events.logUIAction("VsDevSettings:ShowPinPairingOverlay");

            var pairingRootDiv = document.createElement("div");
            pairingRootDiv.tabIndex = "0";
            pairingRootDiv.classList.add("xbdh-vsdevsettings-vspinpairing");
            pairingRootDiv.classList.add("xbdh-overlay");
            pairingRootDiv.classList.add("xbdh-overlay-medium");
            var pinPairingHtml =
                '<div class="xbdh-form">' +
                '  <h1>' + DevHome.Utilities.Resources.getString("vsDevSettingsVSPinPairDialogTitle").value + '</h1>' +
                '  <p id="xbdh-vsdevsettings-vspinpairing-description">' + DevHome.Utilities.Resources.getString("vsDevSettingsVSPinPairDialogDescription").value + '</p>' +
                '  <div id="xbdh-vsdevsettings-vspinpairing-pin" class="xbdh-vsdevsettings-vspinpairing-pin xbdh-accentcolor-color"></div>' +
                '  <div class="xbdh-form-buttons">' +
                '    <button id="xbdh-vsdevsettings-vspinpairing-closecommand" type="button">' + DevHome.Utilities.Resources.getString("commandClose").value + '</div>' +
                '  </div>' +
                '</div>';

            var pairingOverlay = new DevHome.UI.Overlay(pairingRootDiv, { html: pinPairingHtml });

            // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
            // to get reset to the main workspace after this function executes, which we don't want.
            setImmediate(function () {
                if (pairingOverlay) {
                    // We need to set the overlay to the active element, otherwise hitting B won't dismiss it because focus 
                    // won't be on the overlay.
                    pairingOverlay.show();

                    // Set the pin for the 1st time.
                    this._resetPin();
                    // Set timer to refresh the pin
                    this._pinRefreshTimerCookie = setInterval(this._resetPin.bind(this), _PIN_REFRESH_INTERVAL);

                    // Hook up click handlers
                    var closeButton = pairingRootDiv.querySelector("#xbdh-vsdevsettings-vspinpairing-closecommand");
                    closeButton.addEventListener("click", this._handleClosePinPairingDialog.bind(this), false);

                    // Set default focus to the close button
                    closeButton.focus();
                }
            }.bind(this));
        },
        _generatePin: function () {
            var numberOfDigits = 6;
            var pin = "";
            var charSet = "123456789ABCDEFGHJKLMNPQRSTUVWXTZbcdfghkmnpqrstvwxyz";
            for (var i = 0; i < numberOfDigits; i++) {
                var character =
                pin += charSet.charAt(Math.floor(Math.random() * charSet.length));
            }
            return pin;
        },
        _safeClearPin: function () {
            try {
                devHomeNativeUtils.clearAuthPin();
            } catch (ex) {
                console.log();
            }
        },
        _resetPin: function () {
            this._safeClearPin();
            var pinElement = document.querySelector("#xbdh-vsdevsettings-vspinpairing-pin");
            var pin = this._generatePin();
            try {
                // We use Infinity, because Dev Home manages the pin timeout persion itself
                nativeUtils.setAuthPinAsync(pin, Infinity).then(function () { }, function () { });
            } catch (ex) { /* Swallow exception */ }
            if (pinElement) {
                pinElement.textContent = pin;
            }
        },
        _handlePinPaired: function () {
            this._safeClearPin();
            clearInterval(this._pinRefreshTimerCookie);
            document.querySelector("#xbdh-vsdevsettings-vspinpairing-description").textContent = DevHome.Utilities.Resources.getString("vsDevSettingsVSPinPairDialogSuccessMessage").value;
            var pinElement = document.querySelector("#xbdh-vsdevsettings-vspinpairing-pin");
            pinElement.classList.add("xbdh-invisible");
        },
        _handleClosePinPairingDialog: function () {
            this._safeClearPin();
            var pinPairingDialog = document.querySelector(".xbdh-vsdevsettings-vspinpairing").winControl;
            clearInterval(this._pinRefreshTimerCookie);
            pinPairingDialog.hide();
        },
        _showRegisterRemotePackageDialog: function () {
            xbdhUtils._Events.logUIAction("Launcher:ShowRegisterRemotePackageDialog");

            var registerRemotePackageRootDiv = document.createElement("div");
            registerRemotePackageRootDiv.classList.add("xbdh-launcher-registerremotepackage");
            registerRemotePackageRootDiv.classList.add("xbdh-overlay");
            registerRemotePackageRootDiv.classList.add("xbdh-overlay-tall");
            var registerRemotePackageHtml =
                // File path page
                '<div id="xbdh-launcher-registerremotepackage-filepath" class="xbdh-form">' +
                '  <h1 class="xbdh-launcher-registerremotepackage-filepath-heading">' + DevHome.Utilities.Resources.getString("launcherRegisterRemotePackageFilePathHeading").value + '</h1>' +
                '  <p>' + DevHome.Utilities.Resources.getString("launcherRegisterRemotePackageFilePathDescription").value + '</p>' +
                '  <input id="xbdh-launcher-registerremotepackage-filepath-value" class="xbdh-value" type="text" tabindex="0" />' +
                '  <div class="xbdh-form-errormessage xbdh-hidden"></div>' +
                '  <button id="xbdh-launcher-registerremotepackage-filepath-save" type="button" tabindex="1">' + DevHome.Utilities.Resources.getString("commandSave").value + '</button>' +
                '</div>' +
                // Credentials page
                '<div id="xbdh-launcher-registerremotepackage-credentials" class="xbdh-hidden xbdh-form">' +
                '  <h1 class="xbdh-launcher-registerremotepackage-credentials-heading">' + DevHome.Utilities.Resources.getString("launcherRegisterRemotePackageCredentialsHeading").value + '</h1>' +
                '  <p id="xbdh-launcher-registerremotepackage-credentials-description"></p>' +
                '  <label class="xbdh-label">' + DevHome.Utilities.Resources.getString("labelUserName").value + '</label>' +
                '  <input id="xbdh-launcher-registerremotepackage-username-value" class="xbdh-value" type="text" tabindex="0" />' +
                '  <label class="xbdh-label">' + DevHome.Utilities.Resources.getString("labelPassword").value + '</label>' +
                '  <input id="xbdh-launcher-registerremotepackage-password-value" class="xbdh-value" type="password" tabindex="1" />' +
                '  <div class="xbdh-form-errormessage xbdh-hidden"></div>' +
                '  <button id="xbdh-launcher-registerremotepackage-credentials-save" type="button" tabindex="2">' + DevHome.Utilities.Resources.getString("commandOk").value + '</button>' +
                '</div>';

            var registerRemotePackageOverlay = new DevHome.UI.Overlay(registerRemotePackageRootDiv, { html: registerRemotePackageHtml });

            // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
            // to get reset to the main workspace after this function executes, which we don't want. We want the show() method
            // call to set focus to the user details overlay instead.
            setImmediate(function () {
                if (registerRemotePackageOverlay) {
                    registerRemotePackageOverlay.show();

                    var filePathPage = registerRemotePackageRootDiv.querySelector("#xbdh-launcher-registerremotepackage-filepath");
                    var credentialsPage = registerRemotePackageRootDiv.querySelector("#xbdh-launcher-registerremotepackage-credentials");

                    // Add behavior to textboxes
                    xbdhUtils.addFormBehaviors(filePathPage);
                    xbdhUtils.addFormBehaviors(credentialsPage);

                    this._showFilePathPage();

                    // Hook up buttons
                    var saveFilePathButton = registerRemotePackageRootDiv.querySelector("#xbdh-launcher-registerremotepackage-filepath-save");
                    saveFilePathButton.addEventListener("click", this._trySaveFilePath.bind(this), false);

                    var saveCredentialsButton = registerRemotePackageRootDiv.querySelector("#xbdh-launcher-registerremotepackage-credentials-save");
                    saveCredentialsButton.addEventListener("click", this._saveCredentials.bind(this), false);

                    registerRemotePackageOverlay.addEventListener("beforehide", this._handleRemotePackageBeforeHide.bind(this), false);
                }
            }.bind(this));
        },
        _saveCredentials: function () {
            var credentialsPage = document.getElementById("xbdh-launcher-registerremotepackage-credentials");
            var filePath = document.getElementById("xbdh-launcher-registerremotepackage-filepath-value").value;
            var userName = credentialsPage.querySelector("#xbdh-launcher-registerremotepackage-username-value").value;
            var password = credentialsPage.querySelector("#xbdh-launcher-registerremotepackage-password-value").value;

            xbdhUtils.showProgress(credentialsPage);
            // Remove any whitespace
            filePath = filePath.trim();
            var nativeUtils = new Microsoft.Xbox.Tools.DevHome.NativeUtilities();
            nativeUtils.registerNetworkSharePackageAsync(filePath, userName, password).then(function () {
                // If the overlay exists, hide it
                var credentialsOverlay = document.body.querySelector(".xbdh-launcher-registerremotepackage");
                if (credentialsOverlay &&
                    credentialsOverlay.winControl) {
                    var overlayControl = credentialsOverlay.winControl;
                    overlayControl.removeEventListener("beforehide", this._handleRemotePackageBeforeHideBound);
                    overlayControl.hide();
                }
                xbdhUtils.hideProgress(credentialsPage);                                        
            }.bind(this),
            function (ex) {
                xbdhUtils.hideProgress(credentialsPage);

                var errorString = DevHome.Utilities.getErrorStringForNetworkShareRelatedError(ex.number, filePath);

                var errorMessageElement = credentialsPage.querySelector(".xbdh-form-errormessage");
                errorMessageElement.textContent = errorString;
                errorMessageElement.classList.remove("xbdh-hidden");

                // Remove the bad credentials so they don't show up in the list of stored credentials
                try {
                    Microsoft.Xbox.Development.NetworkCredentialUtilities.removeCredential(filePath);
                } catch (ex2) {
                    // No-op: We already showed the user an error message at this point. No need to show them a 2nd and unrelated one due to trying to remove a user that was
                    // probably invalid to begin with.
                }                                        
            }.bind(this));
        },
        _handleRemotePackageBeforeHide: function (e) {
            var credentialsPage = document.body.querySelector("#xbdh-launcher-registerremotepackage-credentials");
            if (!credentialsPage.classList.contains("xbdh-hidden")) {
                e.preventDefault();
                this._showFilePathPage();
            }
        },
        _showFilePathPage: function () {
            var filePathPage = document.getElementById("xbdh-launcher-registerremotepackage-filepath");
            var credentialsPage = document.getElementById("xbdh-launcher-registerremotepackage-credentials");
            filePathPage.classList.remove("xbdh-hidden");
            credentialsPage.classList.add("xbdh-hidden");
            var filePathField = document.getElementById("xbdh-launcher-registerremotepackage-filepath-value");

            // Bring up the virtual keyboard
            var inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();
            inputPane.tryShow();

            // Set focus to the text input
            filePathField.focus();
        },
        _trySaveFilePath: function () {
            // TODO - Handle error case of an empty file path
            var filePathPage = document.getElementById("xbdh-launcher-registerremotepackage-filepath");
            var filePath = document.getElementById("xbdh-launcher-registerremotepackage-filepath-value").value;

            // Passing an empty username and password tells the credential manager to find the best credentials to use
            xbdhUtils.showProgress(filePathPage);
            // Remove any whitespace
            filePath = filePath.trim();
            var nativeUtils = new Microsoft.Xbox.Tools.DevHome.NativeUtilities();
            nativeUtils.registerNetworkSharePackageAsync(filePath, "", "").then(function (packageInfo) {
                xbdhUtils.hideProgress(filePathPage);
                // If we were successful, then hide the overlay
                var credentialsOverlay = document.body.querySelector(".xbdh-launcher-registerremotepackage");
                if (credentialsOverlay &&
                    credentialsOverlay.winControl) {
                    credentialsOverlay.winControl.hide();

                    // Get the new package & set focus to it
                    var newPackageElement = this._layoutRoot.querySelector('[data-xbdh-pfn="' + packageInfo.packageFullName + '"]');
                    if (newPackageElement) {
                        newPackageElement.focus();
                    }
                }
            }.bind(this), function registerNetworkShareErrorCallback(ex) {
                xbdhUtils.hideProgress(filePathPage);
                var errorMessageElement = filePathPage.querySelector(".xbdh-form-errormessage");
                if (ex.number === -2147024894 ||
                        ex.number === -2147024735 ||
                        ex.number === -2147024843 ||
                        ex.number === -2147024829 ||
                        ex.number === -2147024893) { // Could not find network location or bad path name
                    errorMessageElement.textContent = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("launcherErrorRegisterRemotePackageBadLocation").value, filePath);
                } else if (ex.number === -2147023570 ||
                               ex.number === -2147023565 || // Login failure or Error_account_disabled
                               ex.number === -2147024891 || // Access denied
                               ex.number === -2147022989) { // User's password must be changed
                    this._showCredentialsPage();
                } else if (ex.number === -2147024809) { // Invalid parameters
                    errorMessageElement.textContent = DevHome.Utilities.Resources.getString("errorInvalidParameterDescription").value;
                } else {
                    errorMessageElement.textContent = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("errorUnknownDescription").value, xbdhUtils.signedIntegerToHexString(ex.number));
                }
                errorMessageElement.classList.remove("xbdh-hidden");
            }.bind(this));
        },
        _showCredentialsPage: function () {
            var filePathPage = document.getElementById("xbdh-launcher-registerremotepackage-filepath");
            var credentialsPage = document.getElementById("xbdh-launcher-registerremotepackage-credentials");
            filePathPage.classList.add("xbdh-hidden");
            credentialsPage.classList.remove("xbdh-hidden");
            var usernameField = document.getElementById("xbdh-launcher-registerremotepackage-username-value");

            var filePath = document.getElementById("xbdh-launcher-registerremotepackage-filepath-value").value;

            var credentialsDescription = document.getElementById("xbdh-launcher-registerremotepackage-credentials-description");
            credentialsDescription.textContent = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("launcherRegisterRemotePackageCredentialsDescription").value, filePath);

            // Bring up the virtual keyboard
            var inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();
            inputPane.tryShow();

            // Set focus to the text input
            usernameField.focus();
        },
        ready: function (element, options) {
            setImmediate(function () {
                if (element && element.parentNode) {
                    this._layoutRoot = element;
                    this._inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();

                    this._updateServiceStatusAsync().then(function () { }, function () { });
                    this._updateServiceStatusAsyncBound = this._updateServiceStatusAsync.bind(this);
                    this._updateServiceStatusTimerCookie = setInterval(this._updateServiceStatusAsyncBound, _UPDATE_SERVICE_STATUS_INTERVAL);

                    var showVisualStudioPinButton = element.querySelector("#xbdh-commonactions-showvspin");
                    showVisualStudioPinButton.addEventListener("click", this._showVisualStudioPinInvoked.bind(this), false);

                    var changeSandboxButton = element.querySelector("#xbdh-commonactions-changesandbox");
                    changeSandboxButton.addEventListener("click", this._changeSandboxInvoked.bind(this), false);

                    var restartConsoleButton = element.querySelector("#xbdh-commonactions-restartconsole");
                    restartConsoleButton.addEventListener("click", this._restartConsoleInvoked.bind(this), false);

                    var launchHomeButton = element.querySelector("#xbdh-commonactions-launchhome");
                    launchHomeButton.addEventListener("click", this._launchHomeInvoked.bind(this), false);

                    var leaveDevModeButton = element.querySelector("#xbdh-commonactions-leavedevmode");
                    leaveDevModeButton.addEventListener("click", this._leaveDevModeInvoked.bind(this), false);

                    var registerRemotePackageCommand = element.querySelector("#xbdh-commonactions-registergamefromshare");
                    registerRemotePackageCommand.addEventListener("click", this._showRegisterRemotePackageDialog.bind(this), false);

                    if (utils._certType !== utils.Cert.uwp) {
                        leaveDevModeButton.classList.add("xbdh-hidden");
                    }

                    if (utils._consoleType === utils.ConsoleType.other) {
                        registerRemotePackageCommand.classList.add("xbdh-hidden");
                    }

                    var commonActionsContainer = document.getElementById("xbdh-commonactions");
                    commonActionsContainer.classList.remove("xbdh-hidden");
                }
            }.bind(this));
        },
        unload: function () {
            clearInterval(this._updateServiceStatusTimerCookie);
        }
    });
})();