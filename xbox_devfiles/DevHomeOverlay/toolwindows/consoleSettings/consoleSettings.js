// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var devHomeNativeUtils = Microsoft.Xbox.Tools.ConsoleExtensions.InternalDevHomeUtilities;
    var resources = DevHome.Utilities.Resources;
    var systemProperties = Microsoft.Xbox.Tools.ConsoleExtensions.SystemConfigurationProperties;
    var utils = DevHome.Utilities;
    var xbdhUtils = DevHome.Utilities;

    DevHome.Utilities.ConsoleSettings = DevHome.Utilities.ConsoleSettings || {};

    WinJS.UI.Pages.define("/toolwindows/consoleSettings/consoleSettings.html", {
        _cancelRestart: function (e) {
            DevHome.Utilities.ConsoleSettings.IsPromptingRestart= false;

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
        _friendlyCertNameFromEnum: function (certTypeEnum) {
            var certFriendlyName = "";
            switch (certTypeEnum) {
                case Microsoft.Xbox.Development.CertType.noCert:
                    certFriendlyName = resources.getString("consoleSettingsCertFriendlyNameNoCertificate").value;
                    break;
                case Microsoft.Xbox.Development.CertType.eraDevkit:
                    certFriendlyName = resources.getString("consoleSettingsCertFriendlyNameGameDevkit").value;
                    break;
                case Microsoft.Xbox.Development.CertType.sraDevkit:
                    certFriendlyName = resources.getString("consoleSettingsCertFriendlyNameSharedResourceAccessDevkit").value;
                    break;
                case Microsoft.Xbox.Development.CertType.eraTestkit:
                    certFriendlyName = resources.getString("consoleSettingsCertFriendlyNameGameTestkit").value;
                    break;
                case Microsoft.Xbox.Development.CertType.msDevkit:
                    certFriendlyName = resources.getString("consoleSettingsCertFriendlyNameMSInternalDevkit").value;
                    break;
                case Microsoft.Xbox.Development.CertType.uwaDevkit:
                    certFriendlyName = resources.getString("consoleSettingsCertFriendlyNameUniversalWindowsAppDevkit").value;
                    break;
                default:
                    certFriendlyName = resources.getString("consoleSettingsCertFriendlyNameOther").value;
                    break;
            }
            return certFriendlyName;
        },
        _getfriendlyCertExpirationTime: function () {
            var expirationTime;
            // The following API can throw exceptions if there isn't a valid devkit certificate
            // in slot zero.
            try {
                var certExpirationTime = Microsoft.Xbox.Development.XboxInfoUtilities.getCertificateExpirationTime();
                var friendlyDateObj = new Date(0); // The 0 there is the key, which sets the date to the epoch
                friendlyDateObj.setUTCSeconds(certExpirationTime);
                expirationTime =
                    resources._formatString(resources.getString("consoleSettingsCertExpirationMessage1").value, friendlyDateObj.toDateString()) +
                    '\r\n' + resources.getString("consoleSettingsCertExpirationMessage2").value;
            } catch (ex) {
                expirationTime = resources.getString("errorCouldNotGetCertExpiration").value;
            }
            return expirationTime;
        },
        _handleChangeAccessKey: function (newAccessKey) {
            DevHome.Utilities._Events.logUIAction("ConsoleSettings:ChangeAccessKey");

            if (systemProperties.accessKey !== newAccessKey) {
                try {
                    systemProperties.accessKey = newAccessKey;
                    newAccessKey = "";
                    this._promptRestart();
                } catch (ex) {
                    DevHome.Utilities.showPopUp(
                        DevHome.Utilities.Resources.getString("errorInvalidValueTitle").value,
                        DevHome.Utilities.Resources.getString("errorInputMustBeNumbersAndLettersOnlyDescription").value,
                        null,
                        null);
                }
            }
        },
        _handleKeyUpAccessKeyInvoked: function (e) {
            if (e.keyCode !== DevHome.Utilities.Key.enter || DevHome.Utilities.ConsoleSettings.IsPromptingRestart) {
                return;
            }

            this._handleChangeAccessKeyInvoked();
        },
        _handleChangeAccessKeyInvoked: function () {
            if (!DevHome.Utilities.ConsoleSettings.IsPromptingRestart) {
                var accessKeyTextBox = this._layoutRoot.querySelector("#xbdh-consolesettings-accesskey");
                var newAccessKey = accessKeyTextBox.value;
                this._handleChangeAccessKey(newAccessKey);
            }
        },
        _handleChangeConsoleName: function (name) {
            DevHome.Utilities._Events.logUIAction("ConsoleSettings:ChangeConsoleName");
            var consoleNameTextBox = this._layoutRoot.querySelector("#xbdh-consolesettings-consolename");
            if (systemProperties.hostName.toUpperCase() !== name.toUpperCase()) {
                try {
                    systemProperties.hostName = name;
                    this._promptRestart();
                } catch (ex) {
                    // Set the console name back to the old name
                    consoleNameTextBox.value = systemProperties.hostName;
                    DevHome.Utilities.showPopUp(
                        DevHome.Utilities.Resources.getString("errorInvalidValueTitle").value,
                        DevHome.Utilities.Resources.getString("errorInputMustBeNumbersAndLettersOnlyDescription").value,
                        null,
                        null);
                }
            }
        },
        _handleKeyUpConsoleNameInvoked: function (e) {
            if (e.keyCode !== DevHome.Utilities.Key.enter || DevHome.Utilities.ConsoleSettings.IsPromptingRestart) {
                return;
            }
            this._handleChangeConsoleNameInvoked();
        },
        _handleChangeConsoleNameInvoked: function () {
            if (!DevHome.Utilities.ConsoleSettings.IsPromptingRestart) {
                var consoleNameTextBox = this._layoutRoot.querySelector("#xbdh-consolesettings-consolename");
                var newName = consoleNameTextBox.value;
                this._handleChangeConsoleName(newName);
            }
        },
        _inputPane: null,
        _promptRestart: function (e) {
            DevHome.Utilities.ConsoleSettings.IsPromptingRestart= true;
            DevHome.Utilities.showPopUp(
                DevHome.Utilities.Resources.getString("consoleSettingsRestartPromptTitle").value,
                DevHome.Utilities.Resources.getString("consoleSettingsRestartPromptDescription").value,
                {
                    label: DevHome.Utilities.Resources.getString("commandRestartNow").value,
                    callback: this._restartConsoleInvoked,
                },
                {
                    label: DevHome.Utilities.Resources.getString("commandCancel").value,
                    callback: this._cancelRestart.bind(this),
                },
                "xbdh-consolesettings-restartprompt");
        },
        _restartConsoleInvoked: function () {
            DevHome.Utilities.ConsoleSettings.IsPromptingRestart= false;
            Windows.Xbox.System.Internal.Power.PowerProperties.restartConsole();
        },
        _reboot: function () {
            Windows.Xbox.System.Internal.Power.PowerProperties.restartConsole();
        },
        _launchSettingsInvoked: function () {
            Windows.System.Launcher.launchUriAsync(new Windows.Foundation.Uri("ms-settings://")).then(function success() { }, function error() { });
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
        _closeSwitchToRetailOverlay: function () {
            var overlay = document.querySelector(".xbdh-consolesettings-switchtoretail-overlay").winControl;
            overlay.hide();
        },
        _populateSettingsValues: function () {
            // Populate dev settings
            var consoleName = this._layoutRoot.querySelector("#xbdh-consolesettings-consolename");
            if (consoleName) {
                consoleName.value = systemProperties.hostName;
            }

            var osVersion = this._layoutRoot.querySelector("#xbdh-consolesettings-osversion");
            if (osVersion) {
                try {
                    osVersion.textContent = systemProperties.systemVersion;
                } catch (ex) { }
            }

            var devkitType = this._layoutRoot.querySelector("#xbdh-consolesettings-devkitcerttype");
            if (devkitType) {
                devkitType.textContent = this._friendlyCertNameFromEnum(utils._fullCertType);
            }

            var certExpirationTime = this._layoutRoot.querySelector("#xbdh-consolesettings-devkitcertexpiration-value");
            if (certExpirationTime) {
                certExpirationTime.textContent = this._getfriendlyCertExpirationTime();
            }

            var consoleId = this._layoutRoot.querySelector("#xbdh-consolesettings-consoleid");
            if (consoleId) {
                consoleId.textContent = systemProperties.consoleId.toUpperCase();
            }

            var accessKey = this._layoutRoot.querySelector("#xbdh-consolesettings-accesskey");
            if (accessKey) {
                accessKey.value = systemProperties.accessKey;
            }
            var consoleSettingsContainer = document.getElementById("xbdh-consolesettings-container");
            if (consoleSettingsContainer) {
                consoleSettingsContainer.style.display = "block";
            }
        },
        ready: function (element, options) {
            this._layoutRoot = element;

            this._inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();

            var consoleName = element.querySelector("#xbdh-consolesettings-consolename");
            var accessKey = element.querySelector("#xbdh-consolesettings-accesskey");
            var launchSettingsButton = element.querySelector("#xbdh-consolesettings-launchsettings");
            var leaveDevModeButton = element.querySelector("#xbdh-consolesettings-leavedevmode");

            if (utils._certType !== utils.Cert.uwp) {
                leaveDevModeButton.classList.remove("xbdh-hidden");
            }

            // Events
            consoleName.addEventListener("keyup", this._handleKeyUpConsoleNameInvoked.bind(this), false);
            accessKey.addEventListener("keyup", this._handleKeyUpAccessKeyInvoked.bind(this), false);
            consoleName.addEventListener("blur", this._handleChangeConsoleNameInvoked.bind(this), false);
            accessKey.addEventListener("blur", this._handleChangeAccessKeyInvoked.bind(this), false);
            launchSettingsButton.addEventListener("click", this._launchSettingsInvoked.bind(this), false);
            leaveDevModeButton.addEventListener("click", this._leaveDevModeInvoked.bind(this), false);

            // Add behavior to textboxes
            DevHome.Utilities.addTextboxBehaviors(element);

            setImmediate(this._populateSettingsValues.bind(this));
        },

        unload: function () {
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();