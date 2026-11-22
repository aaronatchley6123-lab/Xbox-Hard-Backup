// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var xbdhUtils = DevHome.Utilities;
    var resources = xbdhUtils.Resources;
    var nativeUtils = xbdhUtils.getDevHomeNativeUtilities();

    WinJS.UI.Pages.define("/toolwindows/streamSimulation/streamSimulation.html", {
        _handleGameStreamingServerLocationChangeInvoked: function (e) {
            if (e.keyCode !== DevHome.Utilities.Key.enter) {
                return;
            }
            var newName = this._gameStreamingServerLocation.value;
            this._changeGameStreamingServerLocation(newName);
        },
        _handleGameStreamingServerLocationResetInvoked: async function () {
            await this._changeGameStreamingServerLocation("");
            this._gameStreamingServerLocation.value = "";
        },
        _changeGameStreamingServerLocation: async function (name) {
            DevHome.Utilities._Events.logUIAction("StreamSimulation:ChangeGameStreamingServerLocation");
            var previousName = await nativeUtils.getGameStreamingServerLocationAsync();
            if (previousName !== name) {
                try {
                    await nativeUtils.setGameStreamingServerLocationAsync(name);
                } catch (ex) {
                    this._gameStreamingServerLocation.value = previousName;
                    DevHome.Utilities.showPopUp(
                        resources.getString("errorStreamSimulationGSServerLocation").value,
                        resources._formatString(resources.getString("errorStreamSimulationGSServerLocationDescription").value, ex.number),
                        null,
                        null
                    );
                }
            }
        },
        ready: async function (element, options) {
            this._layoutRoot = element;

            // Elements
            this._gameStreamingServerLocation = element.querySelector("#xbdh-streamSimulation-gs-serverLocation-input");
            this._gameStreamingServerLocationResetButton = element.querySelector("#xbdh-streamSimulation-gs-serverLocation-reset");

            // Events handlers
            this._gameStreamingServerLocation.addEventListener("keyup", this._handleGameStreamingServerLocationChangeInvoked.bind(this), false);
            this._gameStreamingServerLocationResetButton.addEventListener("click", this._handleGameStreamingServerLocationResetInvoked.bind(this), false);

            // Initializers
            this._gameStreamingServerLocation.value = await nativeUtils.getGameStreamingServerLocationAsync();
        },
        unload: function () {

        },
        updateLayout: function (element, viewState, lastViewState) {

        }
    });
})();
