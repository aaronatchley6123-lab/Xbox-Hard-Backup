// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var wdpUtils = Microsoft.Xbox.Development.WDPUtilities;
    var networkUtils = Microsoft.Xbox.Development.NetworkUtilities;
    var systemProperties = Microsoft.Xbox.Tools.ConsoleExtensions.SystemConfigurationProperties;
    var xbdhUtils = DevHome.Utilities;
    var nativeUtils = xbdhUtils.getDevHomeNativeUtilities();

    WinJS.UI.Pages.define("/toolwindows/wdp/wdp.html", {
        _enabledToggledAsync: async function () {
            var overlayRootElement = document.querySelector(".xbdh-wdp-configurewdp");
            if (overlayRootElement) {
                xbdhUtils.showProgress(overlayRootElement);
                overlayRootElement.focus();
            }

            var errorNumber = await nativeUtils.setWDPEnabledAsync(this._enableWdpCheckbox.checked);

            if (errorNumber !== 0) {
                utils.showError(errorNumber);
            }

            if (!this._layoutRoot.contains(document.activeElement)) {
                this._enableWdpCheckbox.focus();
            }
            this._updateEnabledState();

            if (overlayRootElement) {
                xbdhUtils.hideProgress(overlayRootElement);
            }
        },
        _enableAuthFunc: async function () {
            // Only enable auth if credentials were set successfully.
            if (wdpUtils.hasCredentials) {
                var overlayRootElement = document.querySelector(".xbdh-wdp-configurewdp");
                if (overlayRootElement) {
                    xbdhUtils.showProgress(overlayRootElement);
                    overlayRootElement.focus();
                }

                var errorNumber = await nativeUtils.setWDPAuthEnabledAsync(true);

                if (errorNumber !== 0) {
                    utils.showError(errorNumber);
                }

                if (!this._layoutRoot.contains(document.activeElement)) {
                    this._enableWdpAuthCheckbox.focus();
                }
                this._updateAuthEnabledState();

                if (overlayRootElement) {
                    xbdhUtils.hideProgress(overlayRootElement);
                }
            }
        },
        _authToggledAsync: async function () {
            // If enabling authorization and there aren't already credentials, show the set credentials form.
            if (this._enableWdpAuthCheckbox.checked &&
                !wdpUtils.authorizationEnabled &&
                !wdpUtils.hasCredentials) {
                this._showCredentials();
            }
            else {
                var overlayRootElement = document.querySelector(".xbdh-wdp-configurewdp");
                if (overlayRootElement) {
                    xbdhUtils.showProgress(overlayRootElement);
                    overlayRootElement.focus();
                }

                var errorNumber = await nativeUtils.setWDPAuthEnabledAsync(this._enableWdpAuthCheckbox.checked);

                if (errorNumber !== 0) {
                    utils.showError(errorNumber);
                }

                if (!this._layoutRoot.contains(document.activeElement)) {
                    this._enableWdpAuthCheckbox.focus();
                }
                this._updateAuthEnabledState();

                if (overlayRootElement) {
                    xbdhUtils.hideProgress(overlayRootElement);
                }
            }
        },
        _closeConfigureWdpOverlay: function () {
            var overlay = document.querySelector(".xbdh-wdp-configurewdp").winControl;
            overlay.hide();
            xbdhUtils._Events.logCommandResult("WDP:ConfiguredPortal", "enabled: " + wdpUtils.enabled.toString(), 0);
        },
        _hideCredentials: function () {
            this._userNamePasswordSection.style.display = "none";
            this._resetCredentialsButton.style.display = "block";

            if (!this._layoutRoot.contains(document.activeElement)) {
                this._enableWdpAuthCheckbox.focus();
            }
        },
        _saveCredentialsAsync: async function () {
            var userName = this._userNameField.value;
            var password = this._passwordField.value;
            var errorTitle;
            var errorMessage;
            if (!userName) {
                errorTitle = DevHome.Utilities.Resources.getString("errorEmptyUsernameTitle").value;
                errorMessage = DevHome.Utilities.Resources.getString("errorEmptyUsernameDescription").value;
            }
            else if (!password) {
                errorTitle = DevHome.Utilities.Resources.getString("errorEmptyPasswordTitle").value;
                errorMessage = DevHome.Utilities.Resources.getString("errorEmptyPasswordDescription").value;
            }

            if (errorTitle && errorMessage) {
                xbdhUtils.showError(null, errorTitle, errorMessage);
            }
            else {
                var overlayRootElement = document.querySelector(".xbdh-wdp-configurewdp");
                if (overlayRootElement) {
                    xbdhUtils.showProgress(overlayRootElement);
                    overlayRootElement.focus();
                }

                var errorNumber = await nativeUtils.setCredentialsAsync(userName, password);

                if (errorNumber !== 0) {
                    utils.showError(errorNumber);
                }

                xbdhUtils._Events.logCommandResult("WDP:SetCredentials", null, 0);
                this._userNameField.value = "";
                this._passwordField.value = "";
                this._hideCredentials();

                if (overlayRootElement) {
                    xbdhUtils.hideProgress(overlayRootElement);
                }
                if (errorNumber === 0) {
                    await this._enableAuthFunc();
                }
            }
        },
        _disableCredentialsButton: function() {
            this._resetCredentialsButton.disabled = true;
        },
        _enableCredentialsButton: function() {
            this._resetCredentialsButton.disabled = false;
        },
        _showCredentials: function () {
            this._userNamePasswordSection.style.display = "block";
            this._resetCredentialsButton.style.display = "none";

            // Set default focus to the username field
            this._userNameField.focus();
            var inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();
            inputPane.tryShow();
        },
        _resetCertificatesAsync: async function () {
            var overlayRootElement = document.querySelector(".xbdh-wdp-configurewdp");
            if (overlayRootElement) {
                xbdhUtils.showProgress(overlayRootElement);
                overlayRootElement.focus();
            }

            var errorNumber = await nativeUtils.resetWdpCertificatesAsync();

            if (errorNumber === 0) {
                this._updateSSLThumbprints();
            } else {
                utils.showError(errorNumber);
            }

            if (!this._layoutRoot.contains(document.activeElement)) {
                this._closeConfigureWdpButton.focus();
            }

            if (overlayRootElement) {
                xbdhUtils.hideProgress(overlayRootElement);
            }
        },
        _showPasswordToggled: function () {
            if (this._showPasswordCheckBox.checked) {
                this._passwordField.type = "text";
            } else {
                this._passwordField.type = "password";
            }
        },
        _showConfigureWdpOverlay: function () {
            xbdhUtils._Events.logUIAction("WDP:ShowConfigureWdpOverlay");

            var configureWdpRootDiv = document.createElement("div");
            configureWdpRootDiv.tabIndex = "0";
            configureWdpRootDiv.classList.add("xbdh-wdp-configurewdp");
            configureWdpRootDiv.classList.add("xbdh-overlay");
            var configureWdpHtml =
                    '<div id="xbdh-wdp" class="xbdh-form">' +
                    '    <h1 class="xbdh-wdp-heading">' + DevHome.Utilities.Resources.getString("wdpDialogTitle").value + '</h1>' +
                    '    <div id="xbdh-wdp-enablewdpsection" style="display: none;">' +
                    '        <input id="xbdh-wdp-enablewdp" type="checkbox" /><label>' + DevHome.Utilities.Resources.getString("wdpEnableWdp").value + '</label>' +
                    '    </div>' +
                    '    <div id="xbdh-wdp-settings" style="display: none;">' +
                    '        <p id="xbdh-wdp-gettingstartedsection">' +
                    '            <span>' + DevHome.Utilities.Resources.getString("wdpGettingStartedPart1").value + '</span>' +
                    '            <span id="xbdh-wdp-wdpurlhostname" class="xbdh-fontweight-bold"></span>' +
                    '            <span>' + DevHome.Utilities.Resources.getString("wdpGettingStartedPart2").value + '</span>' +
                    '            <span id="xbdh-wdp-wdpurlipaddress" class="xbdh-fontweight-bold"></span>' +
                    '            <span>' + DevHome.Utilities.Resources.getString("wdpGettingStartedPart3").value + '</span>' +
                    '        </p>' +
                    '        <div class="xbdh-spacer-medium"></div>' +
                    '        <h2 class="xbdh-wdp-heading">' + DevHome.Utilities.Resources.getString("wdpCredentialsHeading").value + '</h2>' +
                    '        <input id="xbdh-wdp-enablewdpauth" type="checkbox" /><label>' + DevHome.Utilities.Resources.getString("wdpRequireAuth").value + '</label>' +
                    '        <label id="xbdh-wdp-authdisabledwarning" class="xbdh-warning" style="display: none;">' + DevHome.Utilities.Resources.getString("wdpAuthDisabledWarning").value + '</label>' +
                    '        <button id="xbdh-wdp-resetcredentials" type="button" style="display: none;">' + DevHome.Utilities.Resources.getString("wdpCredentialsButtonLabel").value + '</button>' +
                    '        <div id="xbdh-wdp-credentials" style="display: none;">' +
                    '            <p id="xbdh-wdp-description">' +
                    '                <span>' + DevHome.Utilities.Resources.getString("wdpDescriptionPart1").value + '</span>' +
                    '                <span>' + DevHome.Utilities.Resources.getString("wdpDescriptionPart2").value + '</span>' +
                    '            </p>' +
                    '            <label>' + DevHome.Utilities.Resources.getString("labelUserName").value + '</label>' +
                    '            <input id="xbdh-wdp-username-value" type="text" tabindex="0" />' +
                    '            <label>' + DevHome.Utilities.Resources.getString("labelPassword").value + '</label>' +
                    '            <input id="xbdh-wdp-password-value" type="password" tabindex="1" />' +
                    '            <input id="xbdh-wdp-showpassword" type="checkbox" /><label>' + DevHome.Utilities.Resources.getString("labelShowPassword").value + '</label>' +
                    '            <div class="xbdh-form-buttons">' +
                    '                <button id="xbdh-wdp-savecredentials" type="button" data-win-xyfocus="{ down: \'#xbdh-wdp-savecredentials\' }" tabindex="2">' + DevHome.Utilities.Resources.getString("commandSave").value + '</button>' +
                    '                <button id="xbdh-wdp-cancel" type="button" data-win-xyfocus="{ down: \"#xbdh-wdp-cancel\" }">' + DevHome.Utilities.Resources.getString("commandCancel").value + '</button>' +
                    '            </div>' +
                    '        </div>' +
                    '        <div id="xbdh-wdp-thumbprintssection">' +
                    '            <div class="xbdh-spacer-medium"></div>' +
                    '            <h2>' + DevHome.Utilities.Resources.getString("wdpThumbprintTitle").value + '</h2>' +
                    '            <p>' +
                    '                <span id="xbdh-wdp-certsignature-hostnamelabel"></span>' +
                    '                <span id="xbdh-wdp-certsignature-hostname"></span>' +
                    '            </p>' +
                    '            <p>' +
                    '                <span id="xbdh-wdp-certsignature-ipaddresslabel"></span>' +
                    '                <span id="xbdh-wdp-certsignature-ipaddress"></span>' +
                    '            </p>' +
                    '            <button id="xbdh-wdp-resetcertificate" type="button">' + DevHome.Utilities.Resources.getString("wdpResetCertButtonLabel").value + '</button>' +
                    '        </div>' +
                    '    </div>' +
                    '   <div class="xbdh-form-buttons">' +
                    '       <button id="xbdh-wdp-close" type="button" tabindex="3">' + DevHome.Utilities.Resources.getString("commandClose").value + '</button>' +
                    '   </div>' +
                    '</div>';

            var configureWdpOverlay = new DevHome.UI.Overlay(configureWdpRootDiv, { html: configureWdpHtml });

            // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
            // to get reset to the main workspace after this function executes, which we don't want.
            setImmediate(function () {
                if (configureWdpOverlay) {
                    // We need to set the overlay to the active element, otherwise hitting B won't dismiss it because focus 
                    // won't be on the overlay.
                    configureWdpOverlay.show();

                    this._cancelButton = configureWdpRootDiv.querySelector("#xbdh-wdp-cancel");
                    this._certSignatureHostName = configureWdpRootDiv.querySelector("#xbdh-wdp-certsignature-hostname");
                    this._certSignatureHostNameLabel = configureWdpRootDiv.querySelector("#xbdh-wdp-certsignature-hostnamelabel");
                    this._certSignatureIpAddress = configureWdpRootDiv.querySelector("#xbdh-wdp-certsignature-ipaddress");
                    this._certSignatureIpAddressLabel = configureWdpRootDiv.querySelector("#xbdh-wdp-certsignature-ipaddresslabel");
                    this._closeConfigureWdpButton = configureWdpRootDiv.querySelector("#xbdh-wdp-close");
                    this._enableWdpCheckbox = configureWdpRootDiv.querySelector("#xbdh-wdp-enablewdp");
                    this._enableWdpAuthCheckbox = configureWdpRootDiv.querySelector("#xbdh-wdp-enablewdpauth");
                    this._wdpAuthDisabledWarningLabel = configureWdpRootDiv.querySelector("#xbdh-wdp-authdisabledwarning");
                    this._enableWdpSection = configureWdpRootDiv.querySelector("#xbdh-wdp-enablewdpsection");
                    this._gettingStartedSection = configureWdpRootDiv.querySelector("#xbdh-wdp-gettingstartedsection");
                    this._gettingStartedWdpUrlHostname = configureWdpRootDiv.querySelector("#xbdh-wdp-wdpurlhostname");
                    this._gettingStartedWdpUrlIPAddress = configureWdpRootDiv.querySelector("#xbdh-wdp-wdpurlipaddress");
                    this._passwordField = configureWdpRootDiv.querySelector("#xbdh-wdp-password-value");
                    this._resetCredentialsButton = configureWdpRootDiv.querySelector("#xbdh-wdp-resetcredentials");
                    this._resetCertificatesButton = configureWdpRootDiv.querySelector("#xbdh-wdp-resetcertificate");
                    this._saveCredentialsButton = configureWdpRootDiv.querySelector("#xbdh-wdp-savecredentials");
                    this._settingsSection = configureWdpRootDiv.querySelector("#xbdh-wdp-settings");
                    this._showPasswordCheckBox = configureWdpRootDiv.querySelector("#xbdh-wdp-showpassword");
                    this._thumbprintsSection = configureWdpRootDiv.querySelector("#xbdh-wdp-thumbprintssection");
                    this._userNameField = configureWdpRootDiv.querySelector("#xbdh-wdp-username-value");
                    this._userNamePasswordSection = configureWdpRootDiv.querySelector("#xbdh-wdp-credentials");

                    // Hook up input fields and buttons
                    this._cancelButton.addEventListener("click", this._hideCredentials.bind(this), false);
                    this._closeConfigureWdpButton.addEventListener("click", this._closeConfigureWdpOverlay.bind(this), false);
                    this._enableWdpCheckbox.addEventListener("change", this._enabledToggledAsync.bind(this), false);
                    this._showPasswordCheckBox.addEventListener("change", this._showPasswordToggled.bind(this), false);
                    this._resetCredentialsButton.addEventListener("click", this._showCredentials.bind(this), false);
                    this._resetCertificatesButton.addEventListener("click", this._resetCertificatesAsync.bind(this), false);
                    this._saveCredentialsButton.addEventListener("click", this._saveCredentialsAsync.bind(this), false);
                    this._enableWdpAuthCheckbox.addEventListener("change", this._authToggledAsync.bind(this), false);
                    this._cancelButton.addEventListener("click", this._enableAuthFunc.bind(this), false);

                    // Add behavior to textboxes
                    xbdhUtils.addFormBehaviors(configureWdpRootDiv);

                    // We have a different 1st run experience if the user has not configured WDP before
                    this._hideCredentials();
                    this._enableWdpSection.style.display = "block";
                    this._gettingStartedSection.style.display = "block";
                    this._thumbprintsSection.style.display = "block";

                    this._updateEnabledState();
                    this._updateAuthEnabledState();

                    var hostName = systemProperties.hostName;
                    var ipAddress = networkUtils.systemIpAddress;

                    // Set the ip address for the help text
                    this._gettingStartedWdpUrlHostname.textContent = "https://" + hostName + ":11443";
                    this._gettingStartedWdpUrlIPAddress.textContent = "https://" + ipAddress + ":11443";

                    // Populate the signature
                    this._certSignatureHostNameLabel.textContent = hostName + " : ";
                    this._certSignatureIpAddressLabel.textContent = ipAddress + " : ";

                    this._updateSSLThumbprints();

                    xbdhUtils.addTextboxBehaviors(configureWdpRootDiv);

                    // Set default focus
                    this._enableWdpCheckbox.focus();
                }
            }.bind(this));
        },
        _updateEnabledState: function () {
            var enabled = wdpUtils.enabled;
            if (enabled) {
                this._settingsSection.style.display = "block";
                this._disabledDescriptionText.style.display = "none";
                this._alreadyConfiguredDescriptionText.style.display = "block";
                this._alreadyConfiguredDescriptionTextAdditional.style.display = "block";
            } else {
                this._settingsSection.style.display = "none";
                this._disabledDescriptionText.style.display = "block";
                this._alreadyConfiguredDescriptionText.style.display = "none";
                this._alreadyConfiguredDescriptionTextAdditional.style.display = "none";
            }
            this._enableWdpCheckbox.checked = enabled;

            if (enabled)
            {
                this._updateSSLThumbprints();
            }
        },
        _updateSSLThumbprints: function () {
            try {
                var ipAddress = networkUtils.systemIpAddress;
                var hostname = systemProperties.hostName;
                if (ipAddress) {
                    var ipAddressSignature = wdpUtils.getCertThumbprintForAddress(ipAddress);
                    this._certSignatureIpAddress.textContent = ipAddressSignature;
                }
                if (hostname) {
                    var hostNameSignature = wdpUtils.getCertThumbprintForAddress(hostname);
                    this._certSignatureHostName.textContent = hostNameSignature;
                }
            } catch (ex) {
                /* Swallow exception */
            }
        },
        _updateAuthEnabledState: function () {
            this._enableWdpAuthCheckbox.checked = wdpUtils.authorizationEnabled;

            if (this._enableWdpAuthCheckbox.checked)
            {
                this._enableCredentialsButton();
                this._wdpAuthDisabledWarningLabel.style.display = "none";
            }
            else
            {
                this._hideCredentials();
                this._disableCredentialsButton();
                this._wdpAuthDisabledWarningLabel.style.display = "block";
            }
        },
        ready: function (element, options) {
            setImmediate(function () {
                if (element && element.parentNode) {
                    this._layoutRoot = element;
                    this._disabledDescriptionText = element.querySelector("#xbdh-wdp-disableddescription");
                    this._alreadyConfiguredDescriptionText = element.querySelector("#xbdh-wdp-enableddescription");
                    this._alreadyConfiguredDescriptionTextAdditional = element.querySelector("#xbdh-wdp-enabledadditionaldescription");

                    var ipAddress = networkUtils.systemIpAddress;
                    if (ipAddress) {
                        this._alreadyConfiguredDescriptionTextAdditional.textContent = DevHome.Utilities.Resources._formatString(
                            DevHome.Utilities.Resources.getString("wdpToolDescriptionEnabledAdditionalDescription").value,
                            ipAddress
                        );
                    }

                    try {
                        if ((xbdhUtils._certType === xbdhUtils.Cert.uwp && wdpUtils.hasCredentials && wdpUtils.enabled) ||
                            wdpUtils.enabled) {
                            this._disabledDescriptionText.style.display = "none";
                            this._alreadyConfiguredDescriptionText.style.display = "block";
                            this._alreadyConfiguredDescriptionTextAdditional.style.display = "block";
                        }
                    } catch (ex) {
                        if (ex.number === -2147023840) { // Service is already running
                            this._disabledDescriptionText.style.display = "none";
                            this._alreadyConfiguredDescriptionText.style.display = "block";
                            this._alreadyConfiguredDescriptionTextAdditional.style.display = "block";
                        }
                    }
                    var configureWdpButton = element.querySelector("#xbdh-wdp-configurewdp");
                    configureWdpButton.addEventListener("click", this._showConfigureWdpOverlay.bind(this), false);
                }
            }.bind(this));
        }
    });
})();