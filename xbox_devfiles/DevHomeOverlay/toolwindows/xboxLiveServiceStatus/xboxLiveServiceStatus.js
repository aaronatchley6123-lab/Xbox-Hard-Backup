// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var nativeUtils = DevHome.Utilities.getDevHomeNativeUtilities();

    WinJS.UI.Pages.define("/toolwindows/xboxLiveServiceStatus/xboxLiveServiceStatus.html", {
        _friendlyStatusFromStatusCode: function (statusCode) {
            var friendlyStatus = "";
            switch (statusCode) {
                // For our purposes, service statuses of 3, which means partner services are down, still count as
                // Xbox Live being green.
                case "1":
                case "3":
                    friendlyStatus = DevHome.Utilities.Resources.getString("xboxLiveServiceStatusServiceStatusGood").value;
                    break;
                case "2":
                    friendlyStatus = DevHome.Utilities.Resources.getString("xboxLiveServiceStatusServiceStatusLimited").value;
                    break;
                default:
                    friendlyStatus = DevHome.Utilities.Resources.getString("xboxLiveServiceStatusServiceStatusUnknown").value;
                    break;
            };
            return friendlyStatus;
        },
        _updateServiceStatusAsync: async function () {
            var statusInfo;
            var statusCode = "0";

            try {
                statusInfo = await nativeUtils.getXboxLiveStatusAsync();

                if (statusInfo) {
                    statusCode = statusInfo.statusCode;
                }
            } catch (e) {
                // Swallow exception
            }

            if (this._layoutRoot.winControl._disposed) {
                return;
            }

            var innerHtml = "";

            // Get overall live status
            var overallStatusClass = "xbdh-xboxliveservicestatus-overallstatus-good";
            var overallLiveServiceStatusCode = statusCode;
            if (overallLiveServiceStatusCode === "0" || overallLiveServiceStatusCode === "2") {
                overallStatusClass = "xbdh-xboxliveservicestatus-overallstatus-limited";
            }
            innerHtml += '<div class="xbdh-xboxliveservicestatus-overallstatus ' + overallStatusClass + '"><div aria-hidden="true" class="xbdh-xboxliveservicestatus-overallstatus-icon"></div>' + DevHome.Utilities.Resources.getString("xboxLiveServiceStatusOverallStatus").value + ' <span class="xbdh-xboxliveservicestatus-overallstatus-status">' + this._friendlyStatusFromStatusCode(overallLiveServiceStatusCode) + '</span></div>';

            if (statusInfo && statusInfo.serviceList) {
                var serviceInfoList = statusInfo.serviceList;

                var noServicesWithLimitedStatus = true;
                for (var i = 0, len = serviceInfoList.length; i < len; i++) {
                    var serviceInfo = serviceInfoList[i];

                    var name = serviceInfo.name;
                    var incidentId = serviceInfo.incidentId;
                    var statusCode = serviceInfo.statusCode;
                    var serviceStatusText = this._friendlyStatusFromStatusCode(statusCode);
                    var serviceIncidentStartTime = serviceInfo.serviceIncidentStartTime;
                    var serviceIncidentEndTime = serviceInfo.serviceIncidentEndTime;
                    var messageText = serviceInfo.messageText;

                    if (statusCode !== "1") {
                        innerHtml += '<div class="xbdh-xboxliveservicestatus-subservicestatus-red">' +
                            '  <div>' + name + ': <span class="xbdh-xboxliveservicestatus-subservicestatus">' + serviceStatusText + '</span></div><br />';
                        if (incidentId) {
                            innerHtml += '  <div>' + DevHome.Utilities.Resources.getString("xboxLiveServiceStatusIncidentId").value + " " + incidentId + '</div>';
                        }
                        if (serviceIncidentStartTime) {
                            innerHtml += '  <div>' + DevHome.Utilities.Resources.getString("xboxLiveServiceStatusIncidentStartTime").value + " " + serviceIncidentStartTime + '</div>';
                        }
                        if (serviceIncidentEndTime) {
                            innerHtml += '  <div>' + DevHome.Utilities.Resources.getString("xboxLiveServiceStatusIncidentEndTime").value + " " + serviceIncidentEndTime + '</div>';
                        }
                        if (messageText) {
                            innerHtml += '<br /><p>' + messageText + '</p>';
                        }
                        innerHtml += '</div>';

                        noServicesWithLimitedStatus = false;
                    }
                }

                if (noServicesWithLimitedStatus) {
                    innerHtml += '<p>' + DevHome.Utilities.Resources.getString("xboxLiveServiceStatusNoIssuesToReport").value + '</p>';
                }
            }

            var rootElement = this._layoutRoot.querySelector("#xbdh-xboxliveservicestatus-status");
            rootElement.innerHTML = innerHtml;
        },
        ready: function (element, options) {
            this._layoutRoot = element;

            this._UPDATE_SERVICE_STATUS_INTERVAL = 5 * 60 * 1000;
            this._updateServiceStatusAsync().then(function () { }, function () { });
            this._updateServiceStatusAsyncBound = this._updateServiceStatusAsync.bind(this);
            this._updateServiceStatusTimerCookie = setInterval(this._updateServiceStatusAsyncBound, this._UPDATE_SERVICE_STATUS_INTERVAL);
        },

        unload: function () {
            clearInterval(this._updateServiceStatusTimerCookie);
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();