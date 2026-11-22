// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var traceType = Microsoft.Xbox.Tools.ConsoleExtensions.TraceType;
    var xbdhUtils = DevHome.Utilities;

    WinJS.UI.Pages.define("/toolwindows/multiplayer/multiplayer.html", {
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        _layoutRoot: null,
        _multiplayerTraceButton: null,
        _toggleStartStopMultiplayerTrace: function () {
            if (this._traceManager.isTraceRunning) {
                this._stopTraceInvokedAsync().then(function () { }, function () { });
            } else {
                this._startTraceInvokedAsync().then(function () { }, function () { });
            }
        },
        _startTraceAsync: function () {
            DevHome.Utilities._Events.logUIAction("Multiplayer:StartAdvancedMultiplayerTrace");
            return this._traceManager.startAsync(traceType.advancedMultiplayer);
        },
        _startTraceInvokedAsync: function () {
            DevHome.Utilities.showProgress(this._layoutRoot);
            var startTracePromise = this._startTraceAsync();
            startTracePromise.then(function complete() {
                // Update the UI state
                DevHome.Utilities.hideProgress(this._layoutRoot);
                this._updateToggleButtonStates();
            }.bind(this),
            function error(error) {
                DevHome.Utilities.hideProgress(this._layoutRoot);
                this._updateToggleButtonStates();
                xbdhUtils.showError(error);
            }.bind(this));
            return startTracePromise;
        },
        _stopTraceAsync: function () {
            return this._traceManager.stopAsync();
        },
        _stopTraceInvokedAsync: function () {
            DevHome.Utilities._Events.logUIAction("Multiplayer:StopAdvancedMultiplayerTrace");
            DevHome.Utilities.showProgress(this._layoutRoot);
            var stopTracePromise = this._stopTraceAsync();
            stopTracePromise.then(function complete(e) {
                this._multiplayerTraceButton.textContent = DevHome.Utilities.Resources.getString("commandStart").value;
                DevHome.Utilities.hideProgress(this._layoutRoot);

                // Show a popup message to let the user know where their traces went
                DevHome.Utilities.showPopUp(
                    DevHome.Utilities.Resources.getString("multiplayerTraceMultiplayerTraceStopDialogTitle").value,
                    DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("multiplayerTraceMultiplayerTraceStopDialogDescription").value, e.filePath),
                    null,
                    null
                    );
            }.bind(this), DevHome.Utilities.defaultErrorHandler);
            return stopTracePromise;
        },
        _logMultiplayerStateAsync: function () {
            DevHome.Utilities._Events.logUIAction("Multiplayer:CaptureMultiplayerTraceSnapshot");

            var logStatePromise = this._traceManager.logNetworkStateAsync();
            logStatePromise.then(function success() {
                // No-op
            }, xbdhUtils.defaultErrorHandler);
            return logStatePromise;
        },
        _logMultiplayerStateInvokedAsync: function () {
            this._logMultiplayerStateAsync().then(function () { }, function () { });
        },
        _updateToggleButtonStates: function () {
            if (this._traceManager.isTraceRunning) {
                this._multiplayerTraceButton.textContent = DevHome.Utilities.Resources.getString("commandStop").value;
            } else {
                this._multiplayerTraceButton.textContent = DevHome.Utilities.Resources.getString("commandStart").value;
            }
            this._setButtonArialLabel(this._multiplayerTraceButton,
                DevHome.Utilities.Resources.getString("multiplayerTraceMultiplayerPrompt").value,
                this._multiplayerTraceButton.textContent);
        },
        _setButtonArialLabel(button, labelText, commandtext) {
            var ariaLabel = `${labelText}. ${commandtext}`;
            button.setAttribute("aria-label", ariaLabel);
        },
        ready: function (element, options) {
            this._layoutRoot = element;

            this._traceManager = DevHome.Utilities.getConsoleExtensions().TraceManager;

            this._multiplayerTraceButton = element.querySelector("#xbdh-multiplayer-togglemultiplayersimulation");
            this._multiplayerTraceButton.addEventListener("click", this._toggleStartStopMultiplayerTrace.bind(this), false);

            var captureCurrentMultiplayerState = element.querySelector("#xbdh-multiplayer-multiplayercapturecurrentstate");
            captureCurrentMultiplayerState.addEventListener("click", this._logMultiplayerStateInvokedAsync.bind(this), false);

            this._setButtonArialLabel(captureCurrentMultiplayerState,
                DevHome.Utilities.Resources.getString("multiplayerTraceMultiplayerCurrentStatePrompt").value,
                DevHome.Utilities.Resources.getString("multiplayerTraceMultiplayerCaptureCurrentState").value);

            // Update toggle button states
            this._updateToggleButtonStates();
        },

        unload: function () {
            // TODO: Respond to navigations away from this page.
        },

        updateLayout: function (element, viewState, lastViewState) {
            /// <param name="element" domElement="true" />

            // TODO: Respond to changes in viewState.
        }
    });
})();
