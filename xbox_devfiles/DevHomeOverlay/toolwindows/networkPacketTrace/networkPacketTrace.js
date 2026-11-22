// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var traceType = Microsoft.Xbox.Tools.ConsoleExtensions.TraceType;
    var xbdhUtils = DevHome.Utilities;
    var xtfTraceManager = Microsoft.Xbox.Tools.ConsoleExtensions.TraceManager;

    WinJS.UI.Pages.define("/toolwindows/networkPacketTrace/networkPacketTrace.html", {
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        _layoutRoot: null,
        // There's no way to know if a network packet trace is already in progress so for now, we'll keep a local variable
        // to keep track of that.
        _startNetworkPacketTrace: function () {
            return this._traceManager.startAsync(traceType.networkPacket);
        },
        _startNetworkPacketTraceInvoked: function () {
            // We change the text so the user gets more immediate visual feedback that a trace has started. It's possible that
            // this call will fail and the trace won't actually be started making the UI incorrect. But that is an edge case
            // so we optimize for a fast response time in the happy path.
            this._networkPacketTraceButton.textContent = DevHome.Utilities.Resources.getString("commandStop").value;
            DevHome.Utilities.showProgress(this._layoutRoot);
            this._startNetworkPacketTrace()
            .then(function complete() {
                DevHome.Utilities.hideProgress(this._layoutRoot);
                this._updateToggleButtonStates();
            }.bind(this),
                function error(error) {
                    DevHome.Utilities.hideProgress(this._layoutRoot);
                    this._updateToggleButtonStates();
                    DevHome.Utilities.showError(error);
                }.bind(this));
        },
        _stopNetworkPacketTrace: function () {
            // We change the text so the user gets more immediate visual feedback that a trace has stopped. It's possible that
            // this call will fail and the trace won't actually be stopped making the UI incorrect. But that is an edge case
            // so we optimize for a fast response time in the happy path.
            this._networkPacketTraceButton.textContent = DevHome.Utilities.Resources.getString("commandStart").value;
            DevHome.Utilities._Events.logUIAction("NetworkPacketTrace:StopNetworkPacketTrace");
            return this._traceManager.stopAsync();
        },
        _stopNetworkPacketTraceInvoked: function () {
            DevHome.Utilities.showProgress(this._layoutRoot);
            this._stopNetworkPacketTrace()
            .then(
                function complete(e) {
                    this._networkPacketTraceButton.textContent = DevHome.Utilities.Resources.getString("commandStart").value;
                    DevHome.Utilities.hideProgress(this._layoutRoot);

                    var filePath = "";
                    if (e && e.filePath) {
                        filePath = e.filePath;
                    }
                    // Show a popup message to let the user know where their traces went
                    DevHome.Utilities.showPopUp(
                        DevHome.Utilities.Resources.getString("networkPacketTraceNetworkPacketTraceStopDialogTitle").value,
                        DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("networkPacketTraceNetworkPacketTraceStopDialogDescription").value, filePath),
                        null,
                        null
                        );
                }.bind(this), DevHome.Utilities.defaultErrorHandler);
        },
        _toggleStartStopNetworkPacketTrace: function () {
            if (this._traceManager.isTraceRunning) {
                this._stopNetworkPacketTraceInvoked();
            } else {
                this._startNetworkPacketTraceInvoked();
            }
        },
        _updateToggleButtonStates: function () {
            if (this._traceManager.isTraceRunning) {
                this._networkPacketTraceButton.textContent = DevHome.Utilities.Resources.getString("commandStop").value;
            } else {
                this._networkPacketTraceButton.textContent = DevHome.Utilities.Resources.getString("commandStart").value;
            }
            this._setButtonArialLabel(this._networkPacketTraceButton.textContent);
        },
        _setButtonArialLabel(commandtext) {
            var ariaLabel = `${DevHome.Utilities.Resources.getString("networkPacketTracePrompt").value}. ${commandtext}`;
            this._networkPacketTraceButton.setAttribute("aria-label", ariaLabel);
        },
        ready: function (element, options) {
            this._layoutRoot = element;
            this._traceManager = xtfTraceManager;
            this._networkPacketTraceButton = element.querySelector("#xbdh-networkpackettrace-toggletrace");
            this._networkPacketTraceButton.addEventListener("click", this._toggleStartStopNetworkPacketTrace.bind(this), false);

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
