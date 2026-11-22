// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var debugUtils = Microsoft.Xbox.Development.DebugUtilities;
    var networkUtils = Microsoft.Xbox.Development.NetworkUtilities;
    var resources = DevHome.Utilities.Resources;
    var utils = DevHome.Utilities;
    var xbdhNativeUtils = Microsoft.Xbox.Tools.ConsoleExtensions.InternalDevHomeUtilities;

    WinJS.UI.Pages.define("/toolwindows/debugnic/debugnic.html", {
        _cancelRestart: function (e) {
            var dialog = document.getElementById("xbdh-dialog").winControl;
            dialog.hide();
            this._ipRoutingCheckbox.checked = !debugUtils.debugNicDisable;

            // Delay reverting this to avoid keyup from dismissing the dialog.
            setTimeout(function () {
                this._pendingChangeConfirmation = false;
            }.bind(this), 500);
        },
        _promptRestart: function (e) {
            var dialogTitle = "";
            var dialogDescription = "";
            if (debugUtils.debugNicDisable) {
                dialogTitle = DevHome.Utilities.Resources.getString("debugNicProxyingEnableRestartTitle").value;
                dialogDescription = DevHome.Utilities.Resources.getString("debugNicProxyingEnableRestartDescription").value;
            } else {
                dialogTitle = DevHome.Utilities.Resources.getString("debugNicProxyingDisableRestartTitle").value;
                dialogDescription = DevHome.Utilities.Resources.getString("debugNicProxyingDisableRestartDescription").value;
            }
            DevHome.Utilities.showPopUp(
                dialogTitle,
                dialogDescription,
                {
                    label: DevHome.Utilities.Resources.getString("commandRestartNow").value,
                    callback: this._setDebugNicValue.bind(this),
                },
                {
                    label: DevHome.Utilities.Resources.getString("commandCancel").value,
                    callback: this._cancelRestart.bind(this),
                });
        },
        _reboot: function () {
            Windows.Xbox.System.Internal.Power.PowerProperties.restartConsole();
        },
        _isSystemNicConnected: function () {
            var ipAddress = networkUtils.systemIpAddress;
            return DevHome.Utilities.isValidNetworkAddress(ipAddress);
        },
        _refreshTextContentByResourceKey: function (element, resourceKey) {
            var resource = resources.getString(resourceKey);

            if (!resource) {
                return;
            }

            if (element.textContent != resource.value) {
                element.textContent = resource.value;
            }
        },
        _refreshTextContent: function (element, textContentValue) {
            if (element.textContent != textContentValue) {
                element.textContent = textContentValue;
            }
        },
        _refreshDisplayValue: function (element, displayValue) {
            if (element.style.display != displayValue) {
                element.style.display = displayValue;
            }
        },
        _refreshNetworkInfomation: function () {
            try {
                if (xbdhNativeUtils.debugNicConnected &&
                    this._isSystemNicConnected()) {
                    this._refreshTextContentByResourceKey(this._debugNicConnectedStatus, "debugNicBothConnectedValue");
                } else if (xbdhNativeUtils.debugNicConnected &&
                    !this._isSystemNicConnected()) {
                    this._refreshTextContentByResourceKey(this._debugNicConnectedStatus, "debugNicSystemNotConnectedDebugConnectedValue");
                } else if (!xbdhNativeUtils.debugNicConnected &&
                    this._isSystemNicConnected()) {
                    this._refreshTextContentByResourceKey(this._debugNicConnectedStatus, "debugNicSystemConnectedDebugNotConnectedValue");
                } else {
                    this._refreshTextContentByResourceKey(this._debugNicConnectedStatus, "debugNicSystemNoneConnectedValue");
                }
                if (xbdhNativeUtils.debugNicConnected) {
                    this._refreshTextContent(this._debugNicIPAddress, networkUtils.hostIpAddress);
                    this._refreshDisplayValue(this._debugNicIPAddressContainer, "block");
                } else {
                    this._refreshDisplayValue(this._debugNicIPAddressContainer, "none");
                }
                if (this._isSystemNicConnected()) {
                    this._refreshTextContent(this._systemNicIPAddress, networkUtils.systemIpAddress);
                    this._refreshDisplayValue(this._systemNicIPAddressContainer, "block");
                } else {
                    this._refreshDisplayValue(this._systemNicIPAddressContainer, "none");
                }
            } catch (ex) {
                utils._Events.logError(ex.number, ex.message, ex.stack);
            }
        },
        _handleIPRoutingCheckboxChanged: function () {
            if (this._pendingChangeConfirmation) {
                this._ipRoutingCheckbox.checked = !debugUtils.debugNicDisable;
                return;
            }
            this._pendingChangeConfirmation = true;
            this._promptRestart();
        },
        _setDebugNicValue: function () {
            try {
                debugUtils.debugNicDisable = !this._ipRoutingCheckbox.checked;

                this._pendingChangeConfirmation = false;
                this._reboot();
            } catch (ex) {
                this._pendingChangeConfirmation = false;
                DevHome.Utilities.showError(ex);
            }
        },
        ready: function (element, options) {
            this._debugNicConnectedStatus = element.querySelector("#xbdh-debugnic-connectedstatus");
            this._debugNicIPAddress = element.querySelector("#xbdh-debugnic-address-value");
            this._systemNicIPAddress = element.querySelector("#xbdh-systemnic-address-value");
            this._debugNicIPAddressContainer = element.querySelector("#xbdh-debugnic-address");
            this._systemNicIPAddressContainer = element.querySelector("#xbdh-systemnic-address");

            this._ipRoutingCheckboxElement = element.querySelector("#xbdh-debugnic-enabled");
            this._ipRoutingCheckbox = new DevHome.UI.CheckBox(this._ipRoutingCheckboxElement);
            this._ipRoutingCheckbox.checked = !debugUtils.debugNicDisable;

            // Events
            this._ipRoutingCheckbox.addEventListener("change", this._handleIPRoutingCheckboxChanged.bind(this), false);

            this._refreshNetworkInfomation();
            this._timerCookie = setInterval(this._refreshNetworkInfomation.bind(this), 1000);
        },
        unload: function () {
            clearTimeout(this._timerCookie);
        }
    });
})();