// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    // Launch the browser
    WinJS.UI.Pages.define("/framework/toolwindows/feedback/feedback.html", {
        _handleLinkClicked: function (keyCode, link) {
            if (keyCode === DevHome.Utilities.Key.GamepadA ||
                keyCode === DevHome.Utilities.Key.enter ||
                keyCode === DevHome.Utilities.Key.space) {
                var uri = new Windows.Foundation.Uri(link);
                Windows.System.Launcher.launchUriAsync(uri).then(function success() { }, function error() { });
            }
        },
        _handleSupportAndBugsKeyUp: function (e) {
            this._handleLinkClicked(e.keyCode, DevHome.Utilities.Resources.getString("feedbackSupportAndBugsLink").value);
        },
        ready: function (element, options) {
            DevHome.Utilities._Events.logUIAction("Feedback:ViewSendFeedbackPage");

            var supportAndBugsButton = element.querySelector("#xbdh-feedback-supportandbugs");
            supportAndBugsButton.addEventListener("keyup", this._handleSupportAndBugsKeyUp.bind(this), false);

            element.querySelector("#xbdh-feedback-requestfeatures").focus();
        }
    });
})();