// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var storageUtils = Microsoft.Xbox.Development.StorageUtilities;
    var xbdhUtils = DevHome.Utilities;

    var bytesPerKb = 1024;
    var bytesPerMb = bytesPerKb * 1024;
    var bytesPerGb = bytesPerMb * 1024;

    var _DEFAULT_DEV_STORAGE_SIZE = 5;

    WinJS.UI.Pages.define("/framework/toolwindows/manageStorage/manageStorage.html", {
        _cancelRestart: function (e) {
            var dialog = document.getElementById("xbdh-dialog").winControl;
            dialog.hide();
        },
        _handleFocus: function () {
            this._storageSizeSliderContainer.classList.add("xbdh-active");
        },
        _handleBlur: function () {
            this._storageSizeSliderContainer.classList.remove("xbdh-active");
        },
        _promptRestart: function (e) {

            // Get current size of the Dev Scratch drive
            var currentSize = storageUtils.getDevScratchDesiredSizeInGb();
            if (currentSize === 0) {
                currentSize = _DEFAULT_DEV_STORAGE_SIZE;
            }

            // If the user didn't change the size, just close the overlay
            if (currentSize === this._storageSizeSlider.value) {
                xbdhUtils.hideMenu();
            } else {
                DevHome.Utilities.showPopUp(
                    DevHome.Utilities.Resources.getString("manageStorageWarningTitle").value,
                    DevHome.Utilities.Resources.getString("manageStorageWarningDescription").value,
                    {
                        label: DevHome.Utilities.Resources.getString("commandRestart").value,
                        callback: this._save.bind(this),
                    },
                    {
                        label: DevHome.Utilities.Resources.getString("commandCancel").value,
                        callback: this._cancelRestart.bind(this),
                    },
                    "xbdh-managestorage-restartprompt");
            }
        },
        _refresh: function () {
            // Update the slider's values
            this._sliderMinValue = this._layoutRoot.querySelector("#xbdh-managestorage-devstoragesize-minvalue");
            this._sliderMaxValue = this._layoutRoot.querySelector("#xbdh-managestorage-devstoragesize-maxvalue");

            // Get the total size of the dev storage
            this.storageDeviceViewFactoryView = Windows.Xbox.Shell.Content.StorageDeviceViewFactory.createView(Windows.Xbox.Shell.Content.StorageDeviceViewFilter.configuredOrSystem);
            var spaceUsed;
            var freeSpace;
            var totalSpace;
            if (this.storageDeviceViewFactoryView) {
                var storageList = this.storageDeviceViewFactoryView.items;
                if (storageList) {
                    storageList.forEach(function (storageItem) {
                        if (storageItem.isInternal) {
                            freeSpace = storageItem.freeSpace / bytesPerGb;
                        }
                    });
                }
            }

            var minValue = 1;
            this._sliderMinValue.textContent = minValue + " GB";
            this._storageSizeSlider.min = minValue;

            var maxValue = freeSpace;
            this._sliderMaxValue.textContent = maxValue.toFixed(1)  + " GB";
            this._storageSizeSlider.max = maxValue.toFixed(1);

            // Get size of the Dev Scratch drive
            var usedSpace = storageUtils.getDevScratchDesiredSizeInGb();
            // There's a known issue where if Dev Storage is returns 0 it really means 5 GB.
            if (usedSpace === 0) {
                usedSpace = _DEFAULT_DEV_STORAGE_SIZE;
            }
            this._storageSizeSlider.value = usedSpace;
            this._arrow.textContent = usedSpace + " GB";
            this._storageSizeSlider._element.addEventListener("change", function (ev) {
                this._arrow.textContent = this._storageSizeSlider.value + " GB";
            }.bind(this), false);
        },
        _save: function () {
            var value = this._storageSizeSlider.value;
            storageUtils.setDevScratchDesiredSizeInGb(value);

            xbdhUtils.hideMenu();

            try {
                storageUtils.resetDevScratch();
            } catch (ex) {
                console.log(ex);
            }
            this._reboot();
        },
        _reboot: function () {
            Windows.Xbox.System.Internal.Power.PowerProperties.restartConsole();
        },
        _layoutRoot: null,
        _previousFocusRoot: null,
        ready: function (element, options) {
            this._layoutRoot = element;

            this._workspaceManager = xbdhUtils._Internal.workspaceManager;

            this._storageSizeSliderContainer = this._layoutRoot.querySelector("#xbdh-managestorage-devstoragesize");
            this._storageSizeSlider = new DevHome.UI.Slider(this._layoutRoot.querySelector("#xbdh-managestorage-devstoragesize-slider"), { min: 0, max: 100, value: 50 });
            this._arrow = this._layoutRoot.querySelector(".xbox-slider-currentvalue-arrow");
            this._refresh();

            this._saveCommand = this._layoutRoot.querySelector("#xbdh-managestorage-savecommand");
            this._saveCommand.addEventListener("click", this._promptRestart.bind(this), false);

            this._storageSizeSlider.element.addEventListener("focus", this._handleFocus.bind(this), false);
            this._storageSizeSlider.element.addEventListener("blur", this._handleBlur.bind(this), false);

            this._storageSizeSlider.element.focus();
        },

        unload: function () {
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();