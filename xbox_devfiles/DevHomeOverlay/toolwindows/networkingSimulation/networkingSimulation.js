// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";
    
    var consoleExtensions = Microsoft.Xbox.Tools.ConsoleExtensions;
    var networkProtocol = Microsoft.Xbox.Tools.ConsoleExtensions.SimulationManagerNetworkProtocol;
    var simulationManager = Microsoft.Xbox.Tools.ConsoleExtensions.SimulationManager;
    var simulationProfile = Microsoft.Xbox.Tools.ConsoleExtensions.SimulationProfile;
    var simulationType = Microsoft.Xbox.Tools.ConsoleExtensions.SimulationType;
    var xbdhUtils = DevHome.Utilities;

    var _networkingSimulationExemptPortsOverlayEnum = {
        tcpAndUdp: "tcpAndUdp",
        tcp: "tcp",
        udp: "udp",
    };

    WinJS.UI.Pages.define("/toolwindows/networkingSimulation/networkingSimulation.html", {
        _advancedOptionsOverlayElement: null,
        _layoutRoot: null,
        _addOverrideUrl: function () {
            var address = this._advancedOptionsOverlayElement.querySelector("#xbdh-networkingsimulation-advancedoptions-addoverrideurl-url").value;
            var overrideUrlElement = document.createElement("div");
            overrideUrlElement.classList.add("xbdh-networkingsimulation-advancedoptions-overrideurl");
            var innerHtml = '      <input class="xbdh-networkingsimulation-advancedoptions-overrideurl-url" type="url" value="' + address + '" />' +
                                '      <div class="xbdh-networkingsimulation-advancedoptions-overrideurl-connectionquality xbdh-combobox xbdh-combobox-singlerow xbdh-button win-focusable" tabindex="0">' +
                                '        <div class="xbdh-combobox-label"></div>' +
                                '        <div class="xbdh-combobox-togglevisual"></div>' +
                                '      </div>' +
                                '      <button class="xbdh-networkingsimulation-advancedoptions-overrideurl-remove"></button>';
            overrideUrlElement.innerHTML = innerHtml;

            var parentElement = this._advancedOptionsOverlayElement.querySelector(".xbdh-networkingsimulation-advancedoptions-overrideurls-list");
            parentElement.appendChild(overrideUrlElement);

            var connectionQualityDropDownElement = overrideUrlElement.querySelector(".xbdh-networkingsimulation-advancedoptions-overrideurl-connectionquality");
            var options = {
                value: simulationProfile.networkBroken,
                options: [
                    { label: "networkingSimulationConnectionAverage", value: simulationProfile.networkAverage },
                    { label: "networkingSimulationConnectionNone", value: simulationProfile.networkBroken },
                    { label: "networkingSimulationConnectionExcellent", value: simulationProfile.networkExcellent },
                    { label: "networkingSimulationConnectionMinimum", value: simulationProfile.networkMinimum }
                ]
            };
            var connectionQualityDropDown = new DevHome.UI.ComboBox(connectionQualityDropDownElement, options);

            var removeButton = overrideUrlElement.querySelector(".xbdh-networkingsimulation-advancedoptions-overrideurl-remove");
            removeButton.addEventListener("click", this._removeOverrideUrlOrPortExemption, false);

            // Reset the values of the top field
            this._advancedOptionsOverlayElement.querySelector("#xbdh-networkingsimulation-advancedoptions-addoverrideurl-url").value = "";
            this._advancedOptionsOverlayElement.querySelector("#xbdh-networkingsimulation-advancedoptions-addoverrideurl-connectionquality").winControl.value = DevHome.Utilities.Resources.getString("networkingSimulationConnectionNone").value;
        },
        _addPortExemption: function () {
            var port = this._advancedOptionsOverlayElement.querySelector("#xbdh-networkingsimulation-advancedoptions-addexemptionport-port").value;
            var exemptPortElement = document.createElement("div");
            exemptPortElement.classList.add("xbdh-networkingsimulation-advancedoptions-exemptionport");
            var innerHtml = '      <input class="xbdh-networkingsimulation-advancedoptions-exemptionport-port" type="number" value="' + port + '" />' +
                                '      <div class="xbdh-networkingsimulation-advancedoptions-exemptionport-protocol xbdh-combobox xbdh-combobox-singlerow xbdh-button win-focusable" tabindex="0">' +
                                '        <div class="xbdh-combobox-label"></div>' +
                                '        <div class="xbdh-combobox-togglevisual"></div>' +
                                '      </div>' +
                                '      <button class="xbdh-networkingsimulation-advancedoptions-exemptionport-remove"></button>';
            exemptPortElement.innerHTML = innerHtml;

            var parentElement = this._advancedOptionsOverlayElement.querySelector(".xbdh-networkingsimulation-advancedoptions-exemptionports-list");
            parentElement.appendChild(exemptPortElement);

            var protocolDropDownElement = exemptPortElement.querySelector(".xbdh-networkingsimulation-advancedoptions-overrideurl-connectionquality");
            var options = {
                value: _networkingSimulationExemptPortsOverlayEnum.tcpAndUdp,
                options: [
                    { label: "networkingSimulationExemptPortsOverlayTcpAndUdp", value: _networkingSimulationExemptPortsOverlayEnum.tcpAndUdp },
                    { label: "networkingSimulationExemptPortsOverlayTcp", value: _networkingSimulationExemptPortsOverlayEnum.tcp },
                    { label: "networkingSimulationExemptPortsOverlayUdp", value: _networkingSimulationExemptPortsOverlayEnum.udp }
                ]
            };
            var protocolDropDown = new DevHome.UI.ComboBox(protocolDropDownElement, options);

            var removeButton = exemptPortElement.querySelector(".xbdh-networkingsimulation-advancedoptions-exemptionport-remove");
            removeButton.addEventListener("click", this._removeOverrideUrlOrPortExemption, false);

            // Reset the values of the top field
            this._advancedOptionsOverlayElement.querySelector("#xbdh-networkingsimulation-advancedoptions-addexemptionport-port").value = "";
            this._advancedOptionsOverlayElement.querySelector("#xbdh-networkingsimulation-advancedoptions-addexemptionport-protocol").winControl.value = _networkingSimulationExemptPortsOverlayEnum.tcpAndUdp;
        },
        _getHtmlForExistingOverrideUrls: function (overrideURLs) {
            var htmlString = "";
            for (var i = 0, len = overrideURLs.length; i < len; i++) {
                var overrideURL = overrideURLs[i];
                var address = overrideURL.addresses[0];

                htmlString +=   '    <div class="xbdh-networkingsimulation-advancedoptions-overrideurl">' +
                                '      <input class="xbdh-networkingsimulation-advancedoptions-overrideurl-url" type="url" value="' + address + '" />' +
                                '      <div class="xbdh-networkingsimulation-advancedoptions-overrideurl-connectionquality xbdh-combobox xbdh-combobox-singlerow xbdh-button win-focusable" tabindex="0">' +
                                '        <div class="xbdh-combobox-label"></div>' +
                                '        <div class="xbdh-combobox-togglevisual"></div>' +
                                '      </div>' +
                                '      <button class="xbdh-networkingsimulation-advancedoptions-overrideurl-remove"></button>' +
                                '    </div>';
            }
            return htmlString;
        },
        _getHtmlForExistingPortExemptions: function(tcpExemptions, udpExceptions) {
            var htmlString = "";
            var ports = [];
            var duplicates = [];
            for (var i = 0, len = tcpExemptions.length; i < len; i++) {
                var port = tcpExemptions[i];
                var duplicate = false;
                for (var udpException in udpExceptions) {
                    // Remove duplicates
                    if (port === udpExceptions[i]) {
                        duplicate = true;
                        break;
                    }
                }

                if (duplicate) {
                    ports.push({
                        port: port,
                        protocol: _networkingSimulationExemptPortsOverlayEnum.tcpAndUdp
                    });
                    duplicates.push(port);
                } else {
                    ports.push({
                        port: port,
                        protocol: _networkingSimulationExemptPortsOverlayEnum.tcp
                    });
                }
            }

            for (var i = 0, len = udpExceptions.length; i < len; i++) {
                // Make sure the port isn't in our duplicates list
                var portAlreadyAccountedFor = false;
                var currentPort = udpExceptions[i];
                for (var j = 0, len = duplicates.length; j < len; j++) {
                    if (currentPort === duplicates[j]) {
                        portAlreadyAccountedFor = true;
                        break;
                    }
                }

                if (!portAlreadyAccountedFor) {
                    ports.push({
                        port: udpExceptions[i],
                        protocol: _networkingSimulationExemptPortsOverlayEnum.udp
                    });
                }
            }

            for (var i = 0, len = ports.length; i < len; i++) {
                var port = ports[i];

                htmlString +=   '    <div class="xbdh-networkingsimulation-advancedoptions-exemptionport">' +
                                '      <input class="xbdh-networkingsimulation-advancedoptions-exemptionport-port" type="number" value="' + port.port + '" />' +
                                '      <div class="xbdh-networkingsimulation-advancedoptions-exemptionport-protocol xbdh-combobox xbdh-combobox-singlerow xbdh-button win-focusable" tabindex="0">' +
                                '        <div class="xbdh-combobox-label"></div>' +
                                '        <div class="xbdh-combobox-togglevisual"></div>' +
                                '      </div>' +
                                '      <button class="xbdh-networkingsimulation-advancedoptions-exemptionport-remove"></button>' +
                                '    </div>';
            }
            return htmlString;
        },
        _handleAfterHideAdvancedOptions: function () {
        },
        // Used by test code
        _hideAdvancedOptionsDialog: function () {
            if (this._advancedOptionsOverlayElement &&
                this._advancedOptionsOverlayElement.winControl) {
                this._advancedOptionsOverlayElement.winControl.hide();
            }
        },
        _removeOverrideUrlOrPortExemption: function (e) {
            // Find the next element to focus on. Otherwise after the current element is removed, nothing will have focus.
            var activeElementFocusRect = document.activeElement.getBoundingClientRect();
            var nextFocus = TVJS.DirectionalNavigation.findNextFocusElement(DevHome.Utilities.Key.GamepadDPadUp, activeElementFocusRect);

            var rootElement = e.srcElement.parentNode;
            rootElement.parentNode.removeChild(rootElement);

            if (nextFocus) {
                nextFocus.focus();
            }
        },
        _save: function () {
            var networkChannelProfiles = [];
            var overrideUrls = this._advancedOptionsOverlayElement.querySelectorAll(".xbdh-networkingsimulation-advancedoptions-overrideurl");
            var networkProfileIndex = 0;
            for (var i = 0, len = overrideUrls.length; i < len; i++) {
                var networkProfileFriendlyElement = overrideUrls[i].querySelector(".xbdh-networkingsimulation-advancedoptions-overrideurl-connectionquality");
                if (networkProfileFriendlyElement) {
                    var networkSimulationProfile = networkProfileFriendlyElement.winControl.value;
                    var addressElement = overrideUrls[i].querySelector(".xbdh-networkingsimulation-advancedoptions-overrideurl-url");
                    if (addressElement) {
                        networkChannelProfiles.push({
                            index: networkProfileIndex,
                            simulationProfile: networkSimulationProfile,
                            addresses: [addressElement.value]
                        });
                        networkProfileIndex++;
                    }
                }
            }

            // Save these settings to the workspace document
            this._workspaceManager.saveDataForCurrentToolWindow({ networkChannelProfiles: networkChannelProfiles });

            var tcpPorts = [];
            var udpPorts = [];

            var exemptPorts = this._advancedOptionsOverlayElement.querySelectorAll(".xbdh-networkingsimulation-advancedoptions-exemptionport");
            for (var i = 0, len = exemptPorts.length; i < len; i++) {
                var exemptPort = exemptPorts[i];
                var portStringValueElement = exemptPort.querySelector(".xbdh-networkingsimulation-advancedoptions-exemptionport-port");
                if (portStringValueElement) {
                var portStringValue = portStringValueElement.value;
                    if (portStringValue !== "") {
                        var port = parseInt(portStringValue);
                        var networkProtocolTypeElement = exemptPort.querySelector(".xbdh-networkingsimulation-advancedoptions-exemptionport-protocol");
                        if (networkProtocolTypeElement && networkProtocolTypeElement.winControl) {
                            var networkProtocolType = networkProtocolTypeElement.winControl.value;
                            if (networkProtocolType === _networkingSimulationExemptPortsOverlayEnum.tcp) {
                                tcpPorts.push(port);
                            } else if (networkProtocolType === _networkingSimulationExemptPortsOverlayEnum.udp) {
                                udpPorts.push(port);
                            } else if (networkProtocolType === _networkingSimulationExemptPortsOverlayEnum.tcpAndUdp) {
                                tcpPorts.push(port);
                                udpPorts.push(port);
                            }
                        }
                    }
                }
            }

            simulationManager.setNetworkProtocolPortExemptionsAsync(networkProtocol.tcp, tcpPorts).then(function () { }, function () { });
            simulationManager.setNetworkProtocolPortExemptionsAsync(networkProtocol.udp, udpPorts).then(function () { }, function () { });

            this._advancedOptionsOverlayElement.winControl.hide();
        },
        _showAdvancedOptionsDialog: function () {
            DevHome.Utilities._Events.logUIAction("Networking:ViewAccountSettings");

            this._advancedOptionsOverlayElement = document.createElement("div");
            this._advancedOptionsOverlayElement.id = "xbdh-networkingsimulation-advancedoptions";
            this._advancedOptionsOverlayElement.classList.add("xbdh-networkingsimulation-advancedoptions");
            this._advancedOptionsOverlayElement.classList.add("xbdh-overlay-tall");

            var networkChannelProfiles = [];
            var tcpExemptions = [];
            var udpExceptions = [];

            var toolWindowData = this._workspaceManager.getDataForCurrentToolWindow();
            if (toolWindowData &&
                toolWindowData.networkChannelProfiles) {
                networkChannelProfiles = toolWindowData.networkChannelProfiles;
            }
            var getTcpExceptionsPromise = simulationManager.getNetworkProtocolPortExemptionsAsync(networkProtocol.tcp)
                .then(
                    function getNetworkProtocolPortExemptionsSuccess(exemptions) {
                        tcpExemptions = exemptions;
                    }, DevHome.Utilities.defaultErrorHandler);
            var getUdpExceptionsPromise = simulationManager.getNetworkProtocolPortExemptionsAsync(networkProtocol.udp)
                .then(
                    function getNetworkProtocolPortExemptionsSuccess(exemptions) {
                        udpExceptions = exemptions;
                    }, DevHome.Utilities.defaultErrorHandler);

            Promise.all([getTcpExceptionsPromise, getUdpExceptionsPromise])
            .then(
                function getNetworkProtocolPortExceptionsSuccess(exemptions) {
                    var advancedOptionsHtml = '<h1 class="xbdh-networkingsimulation-advancedoptions-heading">' + DevHome.Utilities.Resources.getString("networkingSimulationAdvancedOptionsHeading").value + '</h1>' +
                                                                 '<div class="xbdh-networkingsimulation-advancedoptions-container">' +
                                                                 '  <div class="xbdh-networkingsimulation-advancedoptions-overrideurls">' +
                                                                 '    <h1>' + DevHome.Utilities.Resources.getString("networkingSimulationAdvancedOptionsOverrideUrlsHeading").value + '</h1>' +
                                                                 '    <p class="xbdh-networkingsimulation-advancedoptions-overrideurls-description">' + DevHome.Utilities.Resources.getString("networkingSimulationAdvancedOptionsOverrideUrlsDescription").value + '</p>' +
                                                                 '    <div class="xbdh-networkingsimulation-advancedoptions-overrideurls-headingfieldlabels">' +
                                                                 '      <div class="xbdh-networkingsimulation-advancedoptions-overrideurls-headingfieldlabels-url">' + DevHome.Utilities.Resources.getString("networkingSimulationAdvancedOptionsOverrideUrlsUrlLabel").value + '</div>' +
                                                                 '      <div class="xbdh-networkingsimulation-advancedoptions-overrideurls-headingfieldlabels-connectivity">' + DevHome.Utilities.Resources.getString("networkingSimulationAdvancedOptionsOverrideUrlsConnectivityLabel").value + '</div>' +
                                                                 '    </div>' +
                                                                 '    <div class="xbdh-networkingsimulation-advancedoptions-overrideurls-list">' +
                                                                 '      <div class="xbdh-networkingsimulation-advancedoptions-overrideurl">' +
                                                                 '        <input id="xbdh-networkingsimulation-advancedoptions-addoverrideurl-url" class="xbdh-networkingsimulation-advancedoptions-overrideurl-url" type="url" />' +
                                                                 '        <div id="xbdh-networkingsimulation-advancedoptions-addoverrideurl-connectionquality" class="xbdh-networkingsimulation-advancedoptions-overrideurl-connectionquality xbdh-combobox xbdh-combobox-singlerow xbdh-button win-focusable" tabindex="0">' +
                                                                 '          <div class="xbdh-combobox-label"></div>' +
                                                                 '          <div class="xbdh-combobox-togglevisual"></div>' +
                                                                 '        </div>' +
                                                                 '        <button class="xbdh-networkingsimulation-advancedoptions-overrideurl-add"></button>' +
                                                                 '      </div>';

                    advancedOptionsHtml += this._getHtmlForExistingOverrideUrls(networkChannelProfiles);

                    advancedOptionsHtml +=                      '  </div>' +
                                                                '</div>' +
                                                                '  <div class="xbdh-networkingsimulation-advancedoptions-exemptports">' +
                                                                '    <h1>' + DevHome.Utilities.Resources.getString("networkingSimulationAdvancedOptionsExemptPortsHeading").value + '</h1>' +
                                                                '    <p class="xbdh-networkingsimulation-advancedoptions-exemptports-description">' + DevHome.Utilities.Resources.getString("networkingSimulationAdvancedOptionsExemptPortsDescription").value + '</p>' +
                                                                '    <div class="xbdh-networkingsimulation-advancedoptions-exemptports-headingfieldlabels">' +
                                                                '      <div class="xbdh-networkingsimulation-advancedoptions-exemptports-headingfieldlabels-port">' + DevHome.Utilities.Resources.getString("networkingSimulationAdvancedOptionsExemptPortsPortLabel").value + '</div>' +
                                                                '      <div class="xbdh-networkingsimulation-advancedoptions-exemptports-headingfieldlabels-protocol">' + DevHome.Utilities.Resources.getString("networkingSimulationAdvancedOptionsExemptPortsProtocolLabel").value + '</div>' +
                                                                '    </div>' +
                                                                '    <div class="xbdh-networkingsimulation-advancedoptions-exemptionports-list">' +
                                                                '      <div class="xbdh-networkingsimulation-advancedoptions-exemptionport">' +
                                                                '        <input id="xbdh-networkingsimulation-advancedoptions-addexemptionport-port" class="xbdh-networkingsimulation-advancedoptions-exemptionport-port" type="number" />' +
                                                                '        <div id="xbdh-networkingsimulation-advancedoptions-addexemptionport-protocol" class="xbdh-networkingsimulation-advancedoptions-exemptionport-protocol xbdh-combobox xbdh-combobox-singlerow xbdh-button win-focusable" tabindex="0">' +
                                                                '          <div class="xbdh-combobox-label"></div>' +
                                                                '          <div class="xbdh-combobox-togglevisual"></div>' +
                                                                '        </div>' +
                                                                '        <button class="xbdh-networkingsimulation-advancedoptions-exemptionport-add"></button>' +
                                                                '      </div>';

                                         advancedOptionsHtml += this._getHtmlForExistingPortExemptions(tcpExemptions, udpExceptions);

                                         advancedOptionsHtml +=  '        </div>' +
                                                                 '      </div>' +
                                                                 '    </div>' +
                                                                 '  </div>' +
                                                                 '  <button id="xbdh-networkingsimulation-advancedoptions-savecommand" class="xbdh-networkingsimulation-advancedoptions-savecommand">' + DevHome.Utilities.Resources.getString('commandSave').value + '</button>';

                                         var advancedOptionsOverlay = new DevHome.UI.Overlay(this._advancedOptionsOverlayElement, { html: advancedOptionsHtml });
                                         advancedOptionsOverlay.addEventListener("afterhide", this._handleAfterHideAdvancedOptions.bind(this), false);

                    // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
                    // to get reset to the main workspace after this function executes, which we don't want. We want the show() method
                    // call to set focus to the user details overlay instead.
                    setImmediate(function () {
                        if (advancedOptionsOverlay) {
                            advancedOptionsOverlay.show();

                            // Hook up add buttons
                            var addOverrideUrlButton = this._advancedOptionsOverlayElement.querySelector(".xbdh-networkingsimulation-advancedoptions-overrideurl-add");
                            addOverrideUrlButton.addEventListener("click", this._addOverrideUrl.bind(this), false);

                            var addPortExemptionButton = this._advancedOptionsOverlayElement.querySelector(".xbdh-networkingsimulation-advancedoptions-exemptionport-add");
                            addPortExemptionButton.addEventListener("click", this._addPortExemption.bind(this), false);

                            var connectionQualityDropDownElements = this._advancedOptionsOverlayElement.querySelectorAll(".xbdh-networkingsimulation-advancedoptions-overrideurl-connectionquality");
                            for (var i = 0, len = connectionQualityDropDownElements.length; i < len; i++) {

                                // If this is an existing profile, not the first one, then set its existing simulationProfile value.
                                let defaultSimulationProfile = simulationProfile.networkBroken;
                                let networkChannelProfile;
                                if (networkChannelProfiles && i != 0 && i - 1 < networkChannelProfiles.length) {
                                        networkChannelProfile = networkChannelProfiles[i - 1];
                                }
                                if (networkChannelProfile && networkChannelProfile.simulationProfile) {
                                    defaultSimulationProfile = networkChannelProfile.simulationProfile;
                                }

                                var options = {
                                    value: defaultSimulationProfile,
                                    options: [
                                        { label: "networkingSimulationConnectionAverage", value: simulationProfile.networkAverage },
                                        { label: "networkingSimulationConnectionNone", value: simulationProfile.networkBroken },
                                        { label: "networkingSimulationConnectionExcellent", value: simulationProfile.networkExcellent },
                                        { label: "networkingSimulationConnectionMinimum", value: simulationProfile.networkMinimum }
                                    ]
                                };
                                var connectionQualityDropDown = new DevHome.UI.ComboBox(connectionQualityDropDownElements[i], options);
                            }


                            var exemptPorts = this._advancedOptionsOverlayElement.querySelectorAll(".xbdh-networkingsimulation-advancedoptions-exemptionport");
                            for (var i = 0, len = exemptPorts.length; i < len; i++) {
                                let exemptPort = exemptPorts[i];
                                let portStringValueElement = exemptPort.querySelector(".xbdh-networkingsimulation-advancedoptions-exemptionport-port");
                                let portStringValue;
                                let defaultPortExepmption = _networkingSimulationExemptPortsOverlayEnum.tcpAndUdp;
                                if (portStringValueElement) {
                                    var portStringValue = portStringValueElement.value;
                                    if (portStringValue !== "") {
                                        let port = parseInt(portStringValue);
                                        let isTcpExempt = tcpExemptions.includes(port);
                                        let isUdpExempt = udpExceptions.includes(port);

                                        if (isTcpExempt && isUdpExempt) {
                                            defaultPortExepmption = _networkingSimulationExemptPortsOverlayEnum.tcpAndUdp;
                                        } else if (isTcpExempt) {
                                            defaultPortExepmption = _networkingSimulationExemptPortsOverlayEnum.tcp;
                                        } else if (isUdpExempt) {
                                            defaultPortExepmption = _networkingSimulationExemptPortsOverlayEnum.udp;
                                        }
                                    }

                                    var protocolDropDownElement = exemptPort.querySelector(".xbdh-networkingsimulation-advancedoptions-exemptionport-protocol");

                                    var options = {
                                        value: defaultPortExepmption,
                                        options: [
                                            { label: "networkingSimulationExemptPortsOverlayTcpAndUdp", value: _networkingSimulationExemptPortsOverlayEnum.tcpAndUdp },
                                            { label: "networkingSimulationExemptPortsOverlayTcp", value: _networkingSimulationExemptPortsOverlayEnum.tcp },
                                            { label: "networkingSimulationExemptPortsOverlayUdp", value: _networkingSimulationExemptPortsOverlayEnum.udp }
                                        ]
                                    };
                                    var protocolDropDown = new DevHome.UI.ComboBox(protocolDropDownElement, options);
                                }
                            }

                            var removeButtons = this._advancedOptionsOverlayElement.querySelectorAll(".xbdh-networkingsimulation-advancedoptions-overrideurl-remove, .xbdh-networkingsimulation-advancedoptions-exemptionport-remove");
                            for (var i = 0, len = removeButtons.length; i < len; i++) {
                                removeButtons[i].addEventListener("click", this._removeOverrideUrlOrPortExemption, false);
                            }

                            var saveButton = this._advancedOptionsOverlayElement.querySelector("#xbdh-networkingsimulation-advancedoptions-savecommand");
                            saveButton.addEventListener("click", this._save.bind(this), false);

                            // Set default focus
                            var intialFocus = this._advancedOptionsOverlayElement.querySelector("#xbdh-networkingsimulation-advancedoptions-addoverrideurl-url");
                            if (intialFocus) {
                                intialFocus.focus();
                            }
                        }
                    }.bind(this));
                }.bind(this),
                function getNetworkProtocolPortExceptionsError() {
                });
        },
        _startNetworkSimulationSimpleAsync: function (networkSimulationProfile) {
            DevHome.Utilities._Events.logUIAction("Networking:StartSimulation");
            var startSimulationPromise = simulationManager.startAsync(simulationType.network, networkSimulationProfile);
            return startSimulationPromise;
        },
        _startNetworkSimulationAdvancedAsync: function (simulationNetworkChannelProfiles) {
            DevHome.Utilities._Events.logUIAction("Networking:StartSimulation");
            var startSimulationPromise = simulationManager.startSimulationNetworkChannelsAsync(simulationNetworkChannelProfiles);
            return startSimulationPromise;
        },
        _startNetworkSimulationInvokedAsync: function () {
            var startSimulationPromise = null;
            var networkSimulationButton = this._layoutRoot.querySelector("#xbdh-networkingsimulation-togglenetworksimulation");
            var networkSimulationProfile = this._networkSimComboBox.value;

            var networkChannelProfiles = [];
            var toolWindowData = this._workspaceManager.getDataForCurrentToolWindow();
            if (toolWindowData &&
                toolWindowData.networkChannelProfiles) {
                networkChannelProfiles = toolWindowData.networkChannelProfiles;
            }
            if (networkChannelProfiles.length) {
                // Create the network profiles
                // TODO: Optimize for fewer profiles
                var simulationNetworkChannelProfiles = [];

                for (var i = 0, len = networkChannelProfiles.length; i < len; i++) {
                    // Convert the simulationProfile from an int to the correct type
                    var currentNetworkSimulationChannel = networkChannelProfiles[i];
                    var channelNetworkSimulationProfile = simulationProfile.networkAverage;
                    switch (currentNetworkSimulationChannel.simulationProfile) {
                        case 1:
                            channelNetworkSimulationProfile = simulationProfile.networkMinimum;
                            break;
                        case 2:
                            channelNetworkSimulationProfile = simulationProfile.networkAverage;
                            break;
                        case 3:
                            channelNetworkSimulationProfile = simulationProfile.networkExcellent;
                            break;
                        case 4:
                            channelNetworkSimulationProfile = simulationProfile.networkBroken;
                            break;
                        default:
                            // No-op
                            break;
                    };

                    simulationNetworkChannelProfiles.push(new consoleExtensions.SimulationNetworkChannelProfile(
                            currentNetworkSimulationChannel.index,
                            channelNetworkSimulationProfile,
                            currentNetworkSimulationChannel.addresses
                        ));
                }
                // Create the default profile as the last one
                simulationNetworkChannelProfiles.push(new consoleExtensions.SimulationNetworkChannelProfile(
                    networkChannelProfiles.length,
                    networkSimulationProfile,
                    null
                ));
                startSimulationPromise = this._startNetworkSimulationAdvancedAsync(simulationNetworkChannelProfiles);
                startSimulationPromise.then(function complete() {
                    networkSimulationButton.textContent = DevHome.Utilities.Resources.getString("commandStop").value;
                }, function startSimulationNetworkChannelsErrorHandler(errorObject) {
                    if (errorObject.number === -2147024809) { // Invalid URL most likely
                        // Loop through the URLs to see if any of them have a slash
                        var badAddress = "";
                        var addressContainsForwardSlash = false;
                        for (var i = 0, len = networkChannelProfiles.length; i < len; i++) {
                            var addresses = networkChannelProfiles[i].addresses;
                            for (var j = 0, len = addresses.length; j < len; j++) {
                                if (addresses[j].match("/")) {
                                    addressContainsForwardSlash = true;
                                    badAddress = addresses[j];
                                    break;
                                }
                            }
                            if (addressContainsForwardSlash) {
                                break;
                            }
                        }
                        if (addressContainsForwardSlash) {
                            DevHome.Utilities.showError(null,
                                DevHome.Utilities.Resources.getString("networkingSimulationErrorAddressCannotContainBackslashTitle").value,
                                DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("networkingSimulationErrorAddressCannotContainBackslashDescription").value, badAddress));
                        } else {
                            DevHome.Utilities.showError(null,
                                DevHome.Utilities.Resources.getString("networkingSimulationErrorInvalidParameterTitle").value,
                                DevHome.Utilities.Resources.getString("networkingSimulationErrorInvalidParameterDescription").value);
                        }
                    } else {
                        DevHome.Utilities.showError(errorObject);
                    }
                });
            } else {
                startSimulationPromise = this._startNetworkSimulationSimpleAsync(networkSimulationProfile);
                startSimulationPromise.then(function success() {
                    networkSimulationButton.textContent = DevHome.Utilities.Resources.getString("commandStop").value;
                }, DevHome.Utilities.defaultErrorHandler);
            }
            return startSimulationPromise;
        },
        _stopNetworkSimulationAsync: function () {
            DevHome.Utilities._Events.logUIAction("Networking:StopSimulation");
            var stopSimulationPromise = simulationManager.stopAsync();
            return stopSimulationPromise;
        },
        _stopNetworkSimulationInvokedAsync: function () {
            var stopSimulationPromise = null;
            var networkSimulationButton = document.getElementById("xbdh-networkingsimulation-togglenetworksimulation");
            stopSimulationPromise = this._stopNetworkSimulationAsync();
            stopSimulationPromise.then(function success() {
                if (networkSimulationButton) {
                    networkSimulationButton.textContent = DevHome.Utilities.Resources.getString("commandStart").value;
                }
            }, DevHome.Utilities.defaultErrorHandler);
            return stopSimulationPromise;
        },
        _toggleStartStopNetworkSimulation: function () {
            simulationManager.getStatusAsync()
            .then(
                function success(activeSimulations) {
                    if (!activeSimulations.size) {
                        this._startNetworkSimulationInvokedAsync().then(function () { }, function () { });
                    } else {
                        this._stopNetworkSimulationInvokedAsync().then(function () { }, function () { });
                    }
                }.bind(this),
                function error() {
                    // TODO
                });
        },
        _updateToggleButtonStates: function () {
            if (simulationManager.isSimulationRunning) {
                this._toggleNetworkSimulation.textContent = DevHome.Utilities.Resources.getString("commandStop").value;
            } else {
                this._toggleNetworkSimulation.textContent = DevHome.Utilities.Resources.getString("commandStart").value;
            }
        },
        ready: function (element, options) {
            this._layoutRoot = element;

            this._workspaceManager = DevHome.Utilities._Internal.workspaceManager;

            var options = {
                value: simulationProfile.networkMinimum,
                options: [
                    { label: "networkingSimulationConnectionAverage", value: simulationProfile.networkAverage },
                    { label: "networkingSimulationConnectionNone", value: simulationProfile.networkBroken },
                    { label: "networkingSimulationConnectionExcellent", value: simulationProfile.networkExcellent },
                    { label: "networkingSimulationConnectionMinimum", value: simulationProfile.networkMinimum }
                ]
            };
            this._networkSimComboBox = new DevHome.UI.ComboBox(element.querySelector("#xbdh-networkingsimulation-simulationtype"), options, "networkingSimulationPrompt");

            this._toggleNetworkSimulation = element.querySelector("#xbdh-networkingsimulation-togglenetworksimulation");
            this._toggleNetworkSimulation.addEventListener("click", this._toggleStartStopNetworkSimulation.bind(this), false);

            var advancedOptionsButton = element.querySelector("#xbdh-networkingsimulation-advanced");
            advancedOptionsButton.addEventListener("click", this._showAdvancedOptionsDialog.bind(this), false);

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
