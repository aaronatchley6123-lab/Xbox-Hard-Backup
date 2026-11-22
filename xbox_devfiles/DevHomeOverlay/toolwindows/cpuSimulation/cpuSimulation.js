// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var simulationManager = Microsoft.Xbox.Tools.ConsoleExtensions.SimulationManager;
    var simulationProfile = Microsoft.Xbox.Tools.ConsoleExtensions.SimulationProfile;
    var simulationType = Microsoft.Xbox.Tools.ConsoleExtensions.SimulationType;
    var xbdhUtils = DevHome.Utilities;

    var _simulationTypeEnum = {
        cpuSimulationSystemAverage: "systemAverage",
        cpuSimulationCpu6Maximum: "cpu6Maximum",
        cpuSimulationCpu6Spikes: "cpu6Spikes",
    };

    WinJS.UI.Pages.define("/toolwindows/cpuSimulation/cpuSimulation.html", {
        _startSimulationAsync: function (type, profile) {
            xbdhUtils._Events.logUIAction("CpuSimulation:StartSimulation");
            var startSimulationPromise = simulationManager.startAsync(type, profile);
            return startSimulationPromise;
        },
        _startSimulationInvokedAsync: function () {
            var startSimulationPromise = null;
            var type = simulationType.cpu6;
            var profile = simulationProfile.systemUIDefault;
            switch (this._simulationTypeDropDown.value) {
                case _simulationTypeEnum.cpuSimulationSystemAverage:
                    type = simulationType.systemUI;
                    profile = simulationProfile.systemUIDefault;
                    break;
                case _simulationTypeEnum.cpuSimulationCpu6Maximum:
                    type = simulationType.cpu6;
                    profile = simulationProfile.cpu6Maximum;
                    break; 
                case _simulationTypeEnum.cpuSimulationCpu6Spikes:
                    type = simulationType.cpu6;
                    profile = simulationProfile.cpu6Spikes;
                    break;
                default:
                    // No-op
                    break;
            };

            startSimulationPromise = this._startSimulationAsync(type, profile);
            startSimulationPromise.then(function () {
                this._toggleSimulationButton.textContent = DevHome.Utilities.Resources.getString("commandStop").value;
            }.bind(this), xbdhUtils.defaultErrorHandler);
            return startSimulationPromise;
        },
        _stopSimulationAsync: function () {
            xbdhUtils._Events.logUIAction("CPU:StopSimulation");
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
            simulationManager.getStatusAsync().then(function success(activeSimulations) {
                if (!activeSimulations.size) {
                    this._startSimulationInvokedAsync().then(function () { }, function () { });
                } else {
                    this._stopSimulationInvokedAsync().then(function () { }, function () { });
                }
            }.bind(this), xbdhUtils.defaultErrorHandler);
        },
        _updateToggleButtonStates: function () {
            simulationManager.getStatusAsync().then(function (activeSimulations) {
                if (activeSimulations.size) {
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
            var comboBoxOptions = {
                value: _simulationTypeEnum.cpuSimulationCpu6Maximum,
                options: [
                    { label: "cpuSimulationValueSystemAverage", value: _simulationTypeEnum.cpuSimulationSystemAverage },
                    { label: "cpuSimulationValueCpu6Spikes", value: _simulationTypeEnum.cpuSimulationCpu6Spikes },
                    { label: "cpuSimulationValueCpu6Maximum", value: _simulationTypeEnum.cpuSimulationCpu6Maximum }
                ]
            };
            this._simulationTypeDropDown = new DevHome.UI.ComboBox(element.querySelector("#xbdh-cpusimulation-simulationtype"), comboBoxOptions, "cpuSimulationPrompt");

            this._toggleSimulationButton = element.querySelector("#xbdh-cpusimulation-togglesimulation");
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