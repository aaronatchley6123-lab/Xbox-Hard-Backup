// Copyright (c) Microsoft Corporation. All rights reserved.
(function () {
    "use strict";

    WinJS.UI.Pages.define("/toolwindows/launcher/launcher.html", {
        _launcher: null,
        ready: function (element, options) {
            setImmediate(function () {
                if (element && element.parentNode) {
                    this._launcher = new DevHome._ViewModels.Launcher(element);
                }
            }.bind(this));
        },

        unload: function () {
            if (this._launcher) {
                this._launcher.dispose();
            }
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();
