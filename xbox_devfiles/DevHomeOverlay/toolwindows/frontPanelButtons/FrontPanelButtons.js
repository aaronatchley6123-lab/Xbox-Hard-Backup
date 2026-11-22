// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var fpdUtils = Microsoft.Xbox.Development.FrontPanelDisplayUtilities;
    var xbdhUtils = DevHome.Utilities;

    WinJS.UI.Pages.define("/toolwindows/frontpanelbuttons/frontpanelbuttons.html", {
        _handleQuickActionChange: function (e) {
            var selectElement = e.target;
            var scriptName = selectElement.value;
            var scriptNumber = parseInt(selectElement.element.id.replace("xbdh-frontpanelbuttons-fpd-select", "")) - 1;

            var isBuiltIn = false;
            if (this._builtInScriptIds) {
                var isBuiltIn = this._builtInScriptIds.includes(scriptName);
            }

            if (scriptNumber < fpdUtils.quickActions.length) {
                try {
                    fpdUtils.quickActions[scriptNumber].applyScript(scriptName, isBuiltIn);

                    DevHome.Utilities._Events.logUIAction("FrontPanelButtons:ChangeQuickAction", scriptName);
                } catch (e) {
                    xbdhUtils.showError(e);
                }
            }
        },
        _initializeComboBoxElements: function () {

            var customQuickActions = fpdUtils.availableQuickActions(false);
            var builtInQuickActions = fpdUtils.availableQuickActions(true);

            for (var i = 1; i <= 5; ++i) {
                var noneValue = "None";
                var options = {
                    value: noneValue,
                    options: [
                        { label: "frontPanelButtonsNone", value: noneValue}
                    ]
                };

                this._builtInScriptIds = [];

                // Add all the available quick actions
                for (var j = 0; j < customQuickActions.length; ++j) {
                    options.options.push({ label: customQuickActions[j].displayString, value: customQuickActions[j].displayString });
                }

                let formatAppendSubtextString = DevHome.Utilities.Resources.getString("appendSubtext").value;
                for (var j = 0; j < builtInQuickActions.length; ++j) {
                    // Append text for a value like "Capture Screenshot (built-in)"
                    let currentLabel = DevHome.Utilities.Resources._formatString(formatAppendSubtextString, DevHome.Utilities.Resources.getString(builtInQuickActions[j].displayString).value, DevHome.Utilities.Resources.getString("frontPanelButtonsBuiltIn").value);
                    options.options.push({ label: currentLabel, value: builtInQuickActions[j].displayString });
                    this._builtInScriptIds.push(builtInQuickActions[j].displayString);
                }

                var ariaLabelText = DevHome.Utilities.Resources._formatString(
                    DevHome.Utilities.Resources.getString("frontPanelButtons").value,
                    i.toString());

                var quickActionComboBoxElement = new DevHome.UI.ComboBox(document.getElementById("xbdh-frontpanelbuttons-fpd-select" + i.toString()), options, null, ariaLabelText);
                quickActionComboBoxElement.removeEventListener("change", this._handleQuickActionChange.bind(this));
                quickActionComboBoxElement.addEventListener("change", this._handleQuickActionChange.bind(this), false);

                // Set default
                if (fpdUtils.quickActions.length >= i) {
                    if (!fpdUtils.quickActions[i - 1].isBuiltIn) {
                        for (var j = 0; j < customQuickActions.length; ++j) {
                            if (fpdUtils.quickActions[i - 1].displayString === customQuickActions[j].displayString) {
                                quickActionComboBoxElement.value = customQuickActions[j].displayString;
                                break;
                            }
                        }
                    } else {
                        for (var j = 0; j < builtInQuickActions.length; ++j) {
                            if (fpdUtils.quickActions[i - 1].displayString === builtInQuickActions[j].displayString) {
                                quickActionComboBoxElement.value = builtInQuickActions[j].displayString;
                                break;
                            }
                        }
                    }

                    fpdUtils.quickActions[i - 1].removeEventListener("displaystringchanged", this._initializeComboBoxElements.bind(this));
                    fpdUtils.quickActions[i - 1].addEventListener("displaystringchanged", this._initializeComboBoxElements.bind(this), false);
                }
            }
        },
        ready: function (element, options) {
            this._layoutRoot = element;


            var fpdTableDiv = element.querySelector("#xbdh-frontpanelbuttons");

            var tableHtml = "";
            // Populate this for all 5 buttons
            for (var i = 1; i <= 5; ++i) {

                var buttonHtml =
                    '<div class="xbdh-frontpanelbuttons-buttondiv" id="xbdh-frontpanelbuttons-fpd-' + i.toString() + '">' +
                    '   <label>' + DevHome.Utilities.Resources.getString("frontPanelButtonsButton").value + i.toString() + '</label>' +
                    '   <div class="xbdh-combobox xbdh-combobox-singlerow xbdh-button win-focusable xbdh-frontpanelbuttons-fpd-select" tabindex="0" id="xbdh-frontpanelbuttons-fpd-select' + i.toString() + '">' +
                    '       <div class="xbdh-combobox-label"></div>' +
                    '       <div class="xbdh-combobox-togglevisual"></div>';

                buttonHtml +=
                    '   </div>' +
                    '</div>';

                tableHtml += buttonHtml;
            }

            fpdTableDiv.innerHTML = tableHtml;

            // Setup the combobox elements with available values,
            // defaults, and event handlers.
            this._initializeComboBoxElements();
        }
    });
})();
