// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var storageUtils = Microsoft.Xbox.Development.StorageUtilities;
    var appUtils = Microsoft.Xbox.Development.ApplicationUtilities;
    var deployUtils = Microsoft.Xbox.Development.DeploymentUtilities;
    var xbdhUtils = DevHome.Utilities;
    var nativeUtils = xbdhUtils.getDevHomeNativeUtilities();

    var strings = {
        devStorageDevelopmentDriveLabel: "",
        devStorageRetailDriveLabel: "",
        devStorageExt1DriveLabel: "",
        devStorageExt2DriveLabel: "",
        devStorageExt3DriveLabel: "",
        devStorageExt4DriveLabel: "",
        devStorageExt5DriveLabel: "",
        devStorageExt6DriveLabel: "",
        devStorageExt7DriveLabel: "",
        devStorageExt8DriveLabel: "",
    };

    WinJS.UI.Pages.define("/toolwindows/devstorage/devstorage.html", {
        _ssdEnabledCheckBox: null,
        _cancelRestart: function (e) {
            var dialog = document.getElementById("xbdh-dialog").winControl;
            dialog.hide();
        },
        _promptRestart: function (e) {
            DevHome.Utilities.showPopUp(
                DevHome.Utilities.Resources.getString("scorpioEnableSsdWarningTitle").value,
                DevHome.Utilities.Resources.getString("scorpioEnableSsdWarningDescription").value,
                {
                    label: DevHome.Utilities.Resources.getString("commandRestart").value,
                    callback: this._doRestart.bind(this),
                },
                {
                    label: DevHome.Utilities.Resources.getString("commandCancel").value,
                    callback: this._cancelRestart.bind(this),
                },
                "xbdh-managestorage-restartprompt");
        },
        _doRestart: function () {
            Windows.Xbox.System.Internal.Power.PowerProperties.restartConsole();
        },
        _handleSsdEnabledChanged: function () {
            DevHome.Utilities._Events.logUIAction("InternalSSD:EnabledStateChange", this._ssdEnabledCheckBox.checked);

            Microsoft.Xbox.Development.DebugUtilities.enableInternalSSD = this._ssdEnabledCheckBox.checked;

            // Prompt the user to restart
            this._promptRestart();
        },
        _handleStorageDeviceChangeAsync: async function (e) {
            var selectElement = e.target;
            var desiredDeviceXcrdId = selectElement.value;
            await nativeUtils.setDefaultDeploymentCrdIdAsync(desiredDeviceXcrdId);
            DevHome.Utilities._Events.logUIAction("DevStorage:ChangeDefaultStorageDevice", selectElement.label);

            await this._refreshRegisterPackagesButtonAsync();
        },
        _handleRegisterPackagesButtonPress: function (e) {
            xbdhUtils.showProgress(this._layoutRoot);

            setTimeout(async function () {

                var unregisteredPackages;
                var defaultDeploymentXCrd;
                try {
                    unregisteredPackages = await nativeUtils.getUnregisteredPackagesAsync();
                    defaultDeploymentXCrd = await nativeUtils.getDefaultDeploymentCrdIdAsync();
                } catch (e) {
                    // Do nothing. defaultDevice won't be initialized but that's okay because it's disconnected.
                }

                var countRegisteredPackages = 0;
                var registeredPackages;
                if (defaultDeploymentXCrd && unregisteredPackages) {
                    // If we have unregistered packages on the current storage device, enable the button to register them.
                    for (var i = 0, len = unregisteredPackages.length; i < len; ++i) {
                        if (unregisteredPackages[i].deployDrive) {
                            var xcrdId = storageUtils.xcrdIdFromFriendlyStorageDeviceName(unregisteredPackages[i].deployDrive);
                            if (defaultDeploymentXCrd === xcrdId) {
                                try {
                                    if (!unregisteredPackages[i].instanceId) {
                                        deployUtils.registerSystemScratchPackage(unregisteredPackages[i].deployPath);
                                    } else {
                                        deployUtils.registerPackageByInstanceId(unregisteredPackages[i].instanceId, unregisteredPackages[i].packageFullName);
                                    }
                                    if (!registeredPackages) {
                                        registeredPackages = "";
                                    } else {
                                        registeredPackages += "<br/>";
                                    }
                                    registeredPackages += unregisteredPackages[i].packageFullName;
                                    ++countRegisteredPackages;
                                } catch (e) {
                                    // Do nothing. We couldn't register this package but may be able to register others.
                                }
                            }
                        }
                    }
                }

                if (countRegisteredPackages > 0) {
                    var title = DevHome.Utilities.Resources.getString("devStorageToolRegisteredPackagesListTitle").value;
                    if (countRegisteredPackages === 1) {
                        title = DevHome.Utilities.Resources.getString("devStorageToolRegisteredPackageListTitle").value;
                    }
                    // Show dialog with all PFNs.
                    DevHome.Utilities.showPopUp(
                        title,
                        registeredPackages,
                        null,
                        null);
                } else {
                    DevHome.Utilities.showPopUp(
                        DevHome.Utilities.Resources.getString("devStorageToolRegisteredPackagesFailedToRegisterTitle").value,
                        DevHome.Utilities.Resources.getString("devStorageToolRegisteredPackagesFailedToRegisterDescription").value,
                        null,
                        null);
                }

                // The Register button is going to be disabled now so we need to move focus.
                var comboBoxElement = document.getElementById("xbdh-devstorage-defaultdevice");
                comboBoxElement.focus();

                xbdhUtils.hideProgress(this._layoutRoot);

                await this._refreshRegisterPackagesButtonAsync();
            }.bind(this), 100);
        },
        _refreshRegisterPackagesButtonAsync: async function () {
            xbdhUtils.showProgress(this._layoutRoot);

            try {
                let unregisteredPackages = await nativeUtils.getUnregisteredPackagesAsync();
                try {
                    var foundUnregisteredPackage = false;
                    var defaultDeploymentXCrd = await nativeUtils.getDefaultDeploymentCrdIdAsync();

                    if (unregisteredPackages && defaultDeploymentXCrd) {
                        // If we have unregistered packages on the current storage device, enable the button to register them.
                        for (var i = 0, len = unregisteredPackages.length; i < len; ++i) {
                            var xcrdId = storageUtils.xcrdIdFromFriendlyStorageDeviceName(unregisteredPackages[i].deployDrive);
                            if (defaultDeploymentXCrd === xcrdId) {
                                foundUnregisteredPackage = true;
                                break;
                            }
                        }
                    }

                    var registerPackagesButton = document.getElementById("xbdh-devstorage-registerallpackagesondrive");
                    if (registerPackagesButton) {
                        if (foundUnregisteredPackage) {
                            registerPackagesButton.disabled = false;
                            registerPackagesButton.classList.remove("xbdh-hidden");
                        } else {
                            registerPackagesButton.disabled = true;

                            // If we only have a single storage device and it has no unregistered content,
                            // hide this button so the message about attaching additional devices has room
                            // to show.
                            let storageDevices = await nativeUtils.getStorageDevicesAsync();
                            if (storageDevices.length <= 1) {
                                registerPackagesButton.classList.add("xbdh-hidden");
                            }
                        }
                    }
                } catch (e) {
                    // Do nothing, this likely means our default deployment device is disconnected.
                }

                xbdhUtils.hideProgress(this._layoutRoot);
            } catch (e) {
                // Don't do anything about this error
            }
        },
        _refreshComboBoxElementAsync: async function () {

            var availableDevices = await nativeUtils.getStorageDevicesAsync();

            var deviceOptions = [];
            var defaultDeploymentXCrd;
            try {
                defaultDeploymentXCrd = await nativeUtils.getDefaultDeploymentCrdIdAsync();
            } catch (e) {
                // Do nothing. defaultDevice won't be initialized but that's okay because it's disconnected.
            }
            for (var i = 0, len = availableDevices.length; i < len; ++i) {
                deviceOptions.push({ label: availableDevices[i].deviceFriendlyName, value: availableDevices[i].xcrdId });
            }

            var comboBoxElement = document.getElementById("xbdh-devstorage-defaultdevice");

            if (!this.defaultStorageDeviceComboBoxElement) {
                var options = {
                    value: defaultDeploymentXCrd,
                    options: deviceOptions
                };

                this.defaultStorageDeviceComboBoxElement = new DevHome.UI.ComboBox(comboBoxElement, options, "defaultStorageDeviceLabel");
                this.defaultStorageDeviceComboBoxElement.removeEventListener("change", this._handleStorageDeviceChangeAsync.bind(this));
                this.defaultStorageDeviceComboBoxElement.addEventListener("change", this._handleStorageDeviceChangeAsync.bind(this), false);
            } else {
                this.defaultStorageDeviceComboBoxElement.options = deviceOptions;
                this.defaultStorageDeviceComboBoxElement.value = defaultDeploymentXCrd;
            }

            var storageMessageElement = document.getElementById("xbdh-devstorage-singlestoragemessage");

            if (comboBoxElement) {
                // If we only have 1 device and it's our default, disable the combobox and display a message
                // about connecting more devices.
                if (availableDevices.length <= 1 && defaultDeploymentXCrd) {
                    comboBoxElement.disabled = true;
                    storageMessageElement.classList.remove("xbdh-hidden");
                } else {
                    comboBoxElement.disabled = false;
                    storageMessageElement.classList.add("xbdh-hidden");
                }
            }
        },
        _getExtDriveLabel: function (index) {
            var resource = DevHome.Utilities.Resources.getString("ExtDrive");

            if (!resource) {
                return "";
            }

            var label = DevHome.Utilities.Resources._formatString(
                resource.value,
                index
            );

            return label;
        },
        ready: function (element, options) {
            this._layoutRoot = element;

            // These strings map to the deviceFriendlyName string values above, they are here for record keeping purposes.
            strings.devStorageDevelopmentDriveLabel = DevHome.Utilities.Resources.getString("Development").value;
            strings.devStorageRetailDriveLabel = DevHome.Utilities.Resources.getString("Retail").value;
            strings.devStorageExt1DriveLabel = this._getExtDriveLabel(1);
            strings.devStorageExt2DriveLabel = this._getExtDriveLabel(2);
            strings.devStorageExt3DriveLabel = this._getExtDriveLabel(3);
            strings.devStorageExt4DriveLabel = this._getExtDriveLabel(4);
            strings.devStorageExt5DriveLabel = this._getExtDriveLabel(5);
            strings.devStorageExt6DriveLabel = this._getExtDriveLabel(6);
            strings.devStorageExt7DriveLabel = this._getExtDriveLabel(7);
            strings.devStorageExt8DriveLabel = this._getExtDriveLabel(8);

            // Populate settings
            this._ssdEnabledCheckBox = new DevHome.UI.CheckBox(element.querySelector("#xbdh-devstorage-ssdenabled"));
            this._ssdEnabledCheckBox.checked = Microsoft.Xbox.Development.DebugUtilities.enableInternalSSD;

            // Events
            this._ssdEnabledCheckBox.addEventListener("change", this._handleSsdEnabledChanged.bind(this), false);

            // Currently this setting is disabled. We may bring it back eventually but we'd want to make sure
            // we were happy with fallback behavior when the scorpio devkit's NVMe was disabled first.
            // Show this element on scorpio devkits.
            //if (DevHome.Utilities._consoleType === DevHome.Utilities.ConsoleType.scorpioDevkit) {
            //    this._ssdEnabledCheckBox._element.classList.remove("xbdh-hidden");
            //}

            // Setup the combobox element with available values, default, and event handler.
            this._refreshComboBoxElementAsync();

            this._refreshComboBoxElementAsync = this._refreshComboBoxElementAsync.bind(this);
            storageUtils.addEventListener("storagestatusupdated", this._refreshComboBoxElementAsync);

            var registerPackagesButton = document.getElementById("xbdh-devstorage-registerallpackagesondrive");
            registerPackagesButton.removeEventListener("click", this._handleRegisterPackagesButtonPress.bind(this));
            registerPackagesButton.addEventListener("click", this._handleRegisterPackagesButtonPress.bind(this), false);

            this._refreshRegisterPackagesButtonAsync();
        },
        unload: function () {
            if (this._refreshComboBoxElementAsync) {
                storageUtils.removeEventListener("storagestatusupdated", this._refreshComboBoxElementAsync);
            }
        },
    });
})();