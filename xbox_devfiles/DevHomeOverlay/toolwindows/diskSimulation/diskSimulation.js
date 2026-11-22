// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var simulationManager = Microsoft.Xbox.Tools.ConsoleExtensions.SimulationManager;
    var xbdhUtils = DevHome.Utilities;

    WinJS.UI.Pages.define("/toolwindows/diskSimulation/diskSimulation.html", {
        _startSimulationAsync: function (simulationProperties) {
            xbdhUtils._Events.logUIAction("DiskSimulation:StartSimulation");
            var startSimulationPromise = simulationManager.startSimulationResourcePropertiesAsync(simulationProperties);
            return startSimulationPromise;
        },
        _startSimulationInvokedAsync: function () {
            var startSimulationPromise = null;
            var simulationValue = this._simulationTypeDropDown.value;

            var simulationProperties = [
                new Microsoft.Xbox.Tools.ConsoleExtensions.SimulationResourceProperty(
                    Microsoft.Xbox.Tools.ConsoleExtensions.SimulationResourceType.disk, simulationValue)
            ];
            startSimulationPromise = this._startSimulationAsync(simulationProperties);
            startSimulationPromise.then(function complete() {
                this._toggleSimulationButton.textContent = DevHome.Utilities.Resources.getString("commandStop").value;
            }.bind(this), function (err) {
                xbdhUtils.defaultErrorHandler(err);
            });
            return startSimulationPromise;
        },
        _stopSimulationAsync: function () {
            xbdhUtils._Events.logUIAction("Disk:StopSimulation");
            var stopSimulationPromise = simulationManager.stopAsync();
            return stopSimulationPromise;
        },
        _stopSimulationInvokedAsync: function () {
            var stopSimulationPromise = null;
            stopSimulationPromise = this._stopSimulationAsync();
            stopSimulationPromise.then(function success() {
                if (this._toggleSimulationButton) {
                    this._toggleSimulationButton.textContent = DevHome.Utilities.Resources.getString("commandStart").value;
                }
            }.bind(this), xbdhUtils.defaultErrorHandler);
            return stopSimulationPromise;
        },
        _toggleStartStopSimulation: function () {
            simulationManager.getSimulationResourcePropertiesAsync()
            .then(
                function success(properties) {
                    if (!properties.size) {
                        this._startSimulationInvokedAsync().then(function () { }, function () { });
                    } else {
                        this._stopSimulationInvokedAsync().then(function () { }, function () { });
                    }
                }.bind(this), xbdhUtils.defaultErrorHandler);
        },
        _updateToggleButtonStates: function () {
            simulationManager.getSimulationResourcePropertiesAsync().then(function (properties) {
                if (properties.size) {
                    this._toggleSimulationButton.textContent = DevHome.Utilities.Resources.getString("commandStop").value;
                } else {
                    this._toggleSimulationButton.textContent = DevHome.Utilities.Resources.getString("commandStart").value;
                }
            }.bind(this));
        },
        ready: function (element, options) {
            this._layoutRoot = element;

            this._workspaceManager = DevHome.Utilities._Internal.workspaceManager;

            // Last option is the default
            var options = {
                value: 100, 
                options: [
                    { label: "diskSimulationLevelMinimum", value: 1},
                    { label: "diskSimulationLevelMedium", value: 50 },
                    { label: "diskSimulationLevelMaximum", value: 100 }
                ]
            };
            this._simulationTypeDropDown = new DevHome.UI.ComboBox(element.querySelector("#xbdh-disksimulation-simulationtype"), options, "diskSimulationPrompt");

            this._toggleSimulationButton = element.querySelector("#xbdh-disksimulation-togglesimulation");
            this._toggleSimulationButton.addEventListener("click", this._toggleStartStopSimulation.bind(this), false);

            // Update toggle button states
            this._updateToggleButtonStates();
        },

        unload: function () {
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();