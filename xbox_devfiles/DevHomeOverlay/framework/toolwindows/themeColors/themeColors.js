// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var xbdhUtils = DevHome.Utilities;

    WinJS.UI.Pages.define("/framework/toolwindows/themeColors/themeColors.html", {
        _handleAccentColorChange: function (e) {
            var activeColorChoice = e.srcElement;
            // Uncheck all checkboxes except the current one
            var choices = document.querySelectorAll(".xbdh-themecolors-accentcolorchoice");
            for (var i = 0, len = choices.length; i < len; i++) {
                if (choices[i] !== activeColorChoice) {
                    choices[i].checked = false;
                }
            }
            activeColorChoice.checked = true;
        },
        _handleThemeColorChange: function (e) {
            var activeThemeColorChoice = e.srcElement;
            // Uncheck all checkboxes except the current one
            var choices = document.querySelectorAll(".xbdh-themecolors-themecolorchoice");
            for (var i = 0, len = choices.length; i < len; i++) {
                if (choices[i] !== activeThemeColorChoice) {
                    choices[i].checked = false;
                }
            }
            activeThemeColorChoice.checked = true;
        },
        _refresh: function () {
            var activeWorkspaceSettings = this._workspaceManager.settings.workspaces[this._workspaceManager._activeWorkspaceIndex];

            // Update the accent color
            var accentColorElement = this._layoutRoot.querySelector("#xbdh-themecolors-accentcolor-" + activeWorkspaceSettings.theme.accentColor + "-value");
            accentColorElement.checked = true;
        },
        _save: function () {
            // Update accent color
            var accentColorChoices = document.querySelectorAll(".xbdh-themecolors-accentcolorchoice");
            var newAccentColor = "";
            for (var i = 0, len = accentColorChoices.length; i < len; i++) {
                if (accentColorChoices[i].checked) {
                    newAccentColor = accentColorChoices[i].value;
                    break;
                }
            }
            this._workspaceManager._changeAccentColor(newAccentColor);

            xbdhUtils._Events.logUIAction("ThemeColor:ChoseNewThemeColor", newAccentColor);
            xbdhUtils._Events.logUIAction("ThemeColor:ChoseNewAccentColor", newAccentColor);

            xbdhUtils.hideMenu();
        },
        _layoutRoot: null,
        _workspaceManager: null,
        ready: function (element, options) {
            this._layoutRoot = element;

            this._workspaceManager = xbdhUtils._Internal.workspaceManager;

            // Populate UI
            this._refresh();

            // Hook up the buttons
            var accentColorChoices = element.querySelectorAll(".xbdh-themecolors-accentcolorchoice");
            for (var i = 0, len = accentColorChoices.length; i < len; i++) {
                accentColorChoices[i].addEventListener("change", this._handleAccentColorChange.bind(this), false);
            }

            this._saveBackgroundCommand = this._layoutRoot.querySelector("#xbdh-themecolors-savecommand");
            this._saveBackgroundCommand.addEventListener("click", this._save.bind(this), false);

            accentColorChoices[0].focus();
        },

        unload: function () {
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();