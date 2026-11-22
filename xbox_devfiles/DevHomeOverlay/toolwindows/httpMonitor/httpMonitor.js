// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var networkUtils = Microsoft.Xbox.Development.NetworkUtilities;
    var xbdhUtils = DevHome.Utilities;

    WinJS.UI.Pages.define("/toolwindows/httpMonitor/httpMonitor.html", {
        _enabledToggled: function () {
            networkUtils.httpMonitorEnabled = this._httpMonitorEnabledCheckbox.checked;
            xbdhUtils._Events.logCommandResult("HttpMonitor", "enabled: " + (networkUtils.httpMonitorEnabled).toString(), 0);
        },
        ready: function (element, options) {
            this._httpMonitorEnabledCheckboxElement = element.querySelector("#xbdh-httpmonitor-enablehttpmonitor");

            this._httpMonitorEnabledCheckbox = new DevHome.UI.CheckBox(this._httpMonitorEnabledCheckboxElement);
            this._httpMonitorEnabledCheckbox.checked = networkUtils.httpMonitorEnabled;
            this._httpMonitorEnabledCheckbox.addEventListener("change", this._enabledToggled.bind(this), false);
        }
    });
})();