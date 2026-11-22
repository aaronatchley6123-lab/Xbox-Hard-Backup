// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var xbdhUtils = DevHome.Utilities;
    var nativeUtils = xbdhUtils.getDevHomeNativeUtilities();
    var updateUtils = Microsoft.Xbox.Development.SystemUpdateUtilities;
    var systemUpdateGroup = Microsoft.Xbox.Development.SystemUpdateGroup;

    // Consts
    var strings = {
        updateDropdownLoadingLabel: "",
        updateOptionProductionSubText: "",
        updateOptionPreviewSubText: ""
    };

    var _currentUpdateGroupId;

    WinJS.UI.Pages.define("/toolwindows/update/update.html", {
        _continueUpdatingSelection: function (ev) {
            var newUpdateGroupId = this._updateComboBox.value;
            var newUpdateGroupFriendlyName = this._groupIdToFriendlyName(this._updateComboBox.value);
            if (_currentUpdateGroupId === newUpdateGroupId) {
                return;
            }

            xbdhUtils.showProgress(this._layoutRoot);

            try {
                updateUtils.currentSystemUpdateGroup = newUpdateGroupId;

                // If the user has switched to any group other than noupdate, we need to check
                // additional system settings like power mode to make sure they will actually
                // receive those updates. Developer skip OOBE so the system may have defaulted
                // to a power mode and retail update settings that will prevent the user from
                // getting dev updates.
                if (_currentUpdateGroupId !== newUpdateGroupId &&
                    newUpdateGroupId !== systemUpdateGroup.noUpdate &&
                    (!Windows.Xbox.System.Internal.Power.PowerProperties.allowInstantOn ||
                        !Windows.Xbox.System.Internal.Power.PowerProperties.allowAutoSystemUpdate)) {

                    var popupDescriptionString = DevHome.Utilities.Resources.getString("updateGroupChangeRetailUpdateSettingsDescriptionPart1").value + "<ul>";
                    if (!Windows.Xbox.System.Internal.Power.PowerProperties.allowInstantOn) {
                        popupDescriptionString += "<li>" + DevHome.Utilities.Resources.getString("updateGroupChangeRetailUpdateSettingsDescriptionPart2").value + "</li>";
                    }
                    if (!Windows.Xbox.System.Internal.Power.PowerProperties.allowAutoSystemUpdate) {
                        popupDescriptionString += "<li>" + DevHome.Utilities.Resources.getString("updateGroupChangeRetailUpdateSettingsDescriptionPart3").value + "</li>";
                    }
                    popupDescriptionString += "</ul>" + DevHome.Utilities.Resources.getString("updateGroupChangeRetailUpdateSettingsDescriptionPart4").value;

                    xbdhUtils.showPopUp(
                        DevHome.Utilities.Resources.getString("updateGroupChangeRetailUpdateSettingsTitle").value,
                        popupDescriptionString,
                        {
                            label: DevHome.Utilities.Resources.getString("updateGroupChangeRetailUpdateSettingsConfirmButtonLabel").value,
                            callback: this._fixRetailUpdateSettings.bind(this),
                        },
                        {
                            label: DevHome.Utilities.Resources.getString("updateGroupChangeRetailUpdateSettingsCancelButtonLabel").value,
                            callback: this._showSwitchUpdateSettingsConfirmationDialog.bind(this),
                        },
                        null,
                        "medium"
                    );
                } else {
                    this._showSwitchUpdateSettingsConfirmationDialog();
                }

                _currentUpdateGroupId = newUpdateGroupId;
                this._updateComboBoxValue(newUpdateGroupId);
                xbdhUtils.hideProgress(this._layoutRoot);
            } catch (ex) {
                // Ignore exceptions here, could be caused by network outage
                xbdhUtils.hideProgress(this._layoutRoot);
            }
        },
        _cancelPopUp: function (e) {
            var dialog = document.getElementById("xbdh-dialog").winControl;
            dialog.hide();
        },
        _addVersionToOptionStringAsync: function (groupLabel) {
            try {
                var updateGroupFriendlyName = this._groupIdToFriendlyName(groupLabel.value);

                nativeUtils.checkTargetUpdateGroupForNewVersionAsync(updateGroupFriendlyName)
                    .then(
                        function (newVersion) {
                            if (newVersion) {
                                // Append text for a value like "Auto-install latest production OS recovery (10.0.0.0)"
                                groupLabel.label = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("appendSubtext").value, groupLabel.label, newVersion);
                            }
                        }.bind(this));
            } catch (ex) {
                // Ignore exceptions here, could be caused by network outage
            }
        },
        _handleUpdateSelectionChanged: function (ev) {
            var newUpdateGroupId = this._updateComboBox.value;
            var newUpdateGroupFriendlyName = this._groupIdToFriendlyName(this._updateComboBox.value);
            if (_currentUpdateGroupId === newUpdateGroupId) {
                return;
            }

            xbdhUtils.showProgress(this._layoutRoot);

            try {

                nativeUtils.checkTargetUpdateGroupForNewVersionAsync(newUpdateGroupFriendlyName)
                    .then(
                    function (newVersion) {
                        if (newVersion) {
                            nativeUtils.checkTargetUpdateGroupForDowngradeAsync(newUpdateGroupFriendlyName)
                                .then(
                                function (isDowngrade) {
                                    var descString;
                                    if (isDowngrade) {
                                        descString = DevHome.Utilities.Resources.getString("updateGroupDowngradeWarningPart1").value;
                                        descString += newVersion;
                                        descString += DevHome.Utilities.Resources.getString("updateGroupDowngradeWarningPart2").value;
                                    } else {
                                        descString = DevHome.Utilities.Resources.getString("updateGroupUpgradeWarningPart1").value;
                                        descString += newVersion;
                                        descString += DevHome.Utilities.Resources.getString("updateGroupUpgradeWarningPart2").value;
                                    }
                                    xbdhUtils.showPopUp(
                                        DevHome.Utilities.Resources.getString("updateGroupVersionChangeWarningTitle").value,
                                        descString,
                                        {
                                            label: DevHome.Utilities.Resources.getString("commandYes").value,
                                            callback: this._continueUpdatingSelection.bind(this),
                                        },
                                        {
                                            label: DevHome.Utilities.Resources.getString("commandNo").value,
                                            callback: function () {
                                                this._updateComboBoxValue(_currentUpdateGroupId);
                                                this._cancelPopUp();
                                                xbdhUtils.hideProgress(this._layoutRoot);
                                            }.bind(this)
                                        },
                                        null,
                                        "medium"
                                    );
                                }.bind(this));
                        } else {
                            this._continueUpdatingSelection(ev);
                        }

                    }.bind(this));
            } catch (ex) {
                // Ignore exceptions here, could be caused by network outage
                xbdhUtils.hideProgress(this._layoutRoot);
            }
        },
        _showSwitchUpdateSettingsConfirmationDialog: function () {
            xbdhUtils.showPopUp(
                DevHome.Utilities.Resources.getString("updateGroupSwitchConfirmationTitle").value,
                DevHome.Utilities.Resources.getString("updateGroupSwitchConfirmationDescription").value,
                null,
                null
            );


            // Prompt a reboot when changing the osupdatepolicy setting because that setting causes the console to
            // download updated Live settings, and the reboot is needed to initiate that download
            this._promptRestart();
        },
        _fixRetailUpdateSettings: function () {
            Windows.Xbox.System.Internal.Power.PowerProperties.allowInstantOn = true;
            Windows.Xbox.System.Internal.Power.PowerProperties.allowAutoSystemUpdate = true;
            this._showSwitchUpdateSettingsConfirmationDialog();
        },
        _refreshUpdateGroup: function () {
            // Put a loading string in the combo box
            this._updateComboBox.value = strings.updateDropdownLoadingLabel;
            xbdhUtils.showProgress(this._layoutRoot);

            nativeUtils.getCurrentSystemUpdateGroupAsync()
                .then(
                function (systemUpdateGroup) {
                    _currentUpdateGroupId = systemUpdateGroup;
                    this._updateComboBoxValue(_currentUpdateGroupId);
                    xbdhUtils.hideProgress(this._layoutRoot);
                }.bind(this),
                function (error) {
                    // Ignore exceptions here, could be caused by network outage
                    this._updateComboBoxValue(systemUpdateGroup.unknown);
                    xbdhUtils.hideProgress(this._layoutRoot);
                }.bind(this));
        },
        _groupIdToFriendlyName: function (label) {
            var friendlyName = "";
            switch (label) {
                case systemUpdateGroup.noUpdate:
                    friendlyName = "noupdate";
                    break;
                case systemUpdateGroup.current:
                    friendlyName = "current";
                    break;
                case systemUpdateGroup.preview:
                    friendlyName = "preview";
                    break;
            };
            return friendlyName;
        },
        _updateComboBoxValue: function (groupId) {
            this._updateComboBox.value = groupId;
            switch (groupId) {
                case systemUpdateGroup.noUpdate:
                    this._updateGroupSubtext.textContent = "";
                    break;
                case systemUpdateGroup.current:
                    this._updateGroupSubtext.textContent = strings.updateOptionProductionSubText;
                    break;
                case systemUpdateGroup.preview:
                    this._updateGroupSubtext.textContent = strings.updateOptionPreviewSubText;
                    break;
                case systemUpdateGroup.legacyXboxOneXPreview:
                    this._updateGroupSubtext.textContent = strings.updateOptionLegacyScorpioPreviewSubText;
                    break;
                case systemUpdateGroup.legacyScarlettPreview:
                    this._updateGroupSubtext.textContent = strings.updateOptionLegacyScarlettPreviewSubText;
                    break;
                default:
                    this._updateGroupSubtext.textContent = "";
                    break;
            };
        },
        _promptRestart: function (e) {
            DevHome.Utilities.showPopUp(
                DevHome.Utilities.Resources.getString("consoleSettingsRestartPromptTitle").value,
                DevHome.Utilities.Resources.getString("consoleSettingsRestartPromptDescription").value,
                {
                    label: DevHome.Utilities.Resources.getString("commandRestartNow").value,
                    callback: this._reboot.bind(this),
                },
                {
                    label: DevHome.Utilities.Resources.getString("commandCancel").value,
                    callback: this._cancelRestart.bind(this),
                });
        },
        _reboot: function () {
            Windows.Xbox.System.Internal.Power.PowerProperties.restartConsole();
        },
        _cancelRestart: function (e) {
            var dialog = document.getElementById("xbdh-dialog").winControl;
            dialog.hide();
        },
        ready: function (element, options) {
            this._layoutRoot = element;

            strings.updateDropdownLoadingLabel = DevHome.Utilities.Resources.getString("updateDropdownLoadingLabel").value;
            strings.updateOptionProductionSubText = DevHome.Utilities.Resources.getString("updateOptionLatestProductionSubText").value;
            strings.updateOptionPreviewSubText = DevHome.Utilities.Resources.getString("updateOptionLatestPreviewSubText").value;
            strings.updateOptionScorpioLegacyPreviewSubText = DevHome.Utilities.Resources.getString("updateOptionLegacyScorpioPreviewSubText").value;
            strings.updateOptionLegacyScarlettPreviewSubText = DevHome.Utilities.Resources.getString("updateOptionLegacyScarlettPreviewSubText").value;

            var comboBoxElement = element.querySelector("#xbdh-update-updategroup");
            this._updateGroupSubtext = element.querySelector("#xbdh-update-updategroup-subtext");

            // Localize labels before adding them to the combobox due to appending version numbers to them.
            var optionsContainer = {
                value: strings.updateDropdownLoadingLabel,
                options: [
                    { value: systemUpdateGroup.noUpdate, label: DevHome.Utilities.Resources.getString("updateOptionNoUpdate").value },
                    { value: systemUpdateGroup.current, label: DevHome.Utilities.Resources.getString("updateOptionLatestProduction").value },
                    { value: systemUpdateGroup.preview, label: DevHome.Utilities.Resources.getString("updateOptionLatestPreview").value },
                    { value: systemUpdateGroup.unknown, label: DevHome.Utilities.Resources.getString("updateOptionUnknown").value, hidden: true },
                    { value: systemUpdateGroup.legacyXboxOneXPreview, label: DevHome.Utilities.Resources.getString("updateOptionLegacyScorpioPreview").value, hidden: true },
                    { value: systemUpdateGroup.legacyScarlettPreview, label: DevHome.Utilities.Resources.getString("updateOptionLegacyScarlettPreview").value, hidden: true },
                ]
            };

            // Async update the options with the 4 part version of the update assigned
            // to each group (except the NoUpdate group).
            this._addVersionToOptionStringAsync(optionsContainer.options[1]);
            this._addVersionToOptionStringAsync(optionsContainer.options[2]);

            this._updateComboBox = new DevHome.UI.ComboBox(comboBoxElement, optionsContainer, "updateDescription");
            this._updateComboBox.addEventListener("change", this._handleUpdateSelectionChanged.bind(this), false);

            this._refreshUpdateGroup();
        },

        unload: function () {
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();