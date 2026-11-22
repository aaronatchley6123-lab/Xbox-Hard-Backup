// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    var xbdhUtils = DevHome.Utilities;

    WinJS.UI.Pages.define("/framework/toolwindows/backgroundImage/backgroundImage.html", {
        _layoutRoot: null,
        _clearBuiltInBackgroundsSelection: function () {
            var backgrounds = this._layoutRoot.querySelectorAll(".xbdh-backgrounds-background-thumbnail");
            for (var i = 0, len = backgrounds.length; i < len; i++) {
                backgrounds[i].classList.remove("xbdh-active");
            }
        },
        _customBackgroundTextChanged: function (e) {
            if (!e.srcElement.value) {
                return;
            }

            this._clearBuiltInBackgroundsSelection();
        },
        _refresh: function () {
            var activeWorkspaceSettings = this._workspaceManager.settings.workspaces[this._workspaceManager._activeWorkspaceIndex];

            var backgrounds = null;
            DevHome.Utilities.xhr({
                url: "https://assets.xboxservices.com/assets/51/ad/51ad87b4-b125-4836-9c34-27d645173e05.json?n=background-list3.json"
            }).then(function (result) {
                backgrounds = JSON.parse(result.responseText);

                // Build the HTML to show the backgrounds
                var usingBuiltInBackground = false;
                var activeBackgroundUrl = activeWorkspaceSettings.theme.backgroundImage;
                var backgroundsContainer = this._layoutRoot.querySelector("#xbdh-backgrounds");

                for (var i = 0, len = backgrounds.length; i < len; i++) {
                    var background = backgrounds[i];
                    var button = document.createElement("button");;
                    button.id = background.name;
                    button.classList.add("win-focusable");
                    button.classList.add("xbdh-backgrounds-background-thumbnail");
                    button.classList.add("xbdh-backgrounds-background");
                    button.classList.add("xbdh-accentcolor-border");
                    button.tabIndex = 0;
                    button.setAttribute("data-xbdh-url", background.uri);
                    button.type = "button";
                    button.style.backgroundImage = "url(\\" + background.thumbnail + "\\)";

                    if (activeBackgroundUrl === background.uri) {
                        usingBuiltInBackground = true;
                    }

                    backgroundsContainer.appendChild(button);
                }
                
                // Attach click handlers
                var backgroundElements = backgroundsContainer.querySelectorAll(".xbdh-backgrounds-background");
                for (var i = 0, len = backgroundElements.length; i < len; i++) {
                    backgroundElements[i].addEventListener("click", this._selectBackground.bind(this), false);
                }

                // Show the current background choice
                var currentBackgroundThumbnail = this._layoutRoot.querySelector("[data-xbdh-url='" + activeWorkspaceSettings.theme.backgroundImage + "']");
                if (currentBackgroundThumbnail) {
                    currentBackgroundThumbnail.classList.add("xbdh-active");
                }

                if (!currentBackgroundThumbnail) {
                    var customBackgroundElement = this._layoutRoot.querySelector("#xbdh-backgroundimage-custombackground-value");
                    if (!usingBuiltInBackground) {
                        customBackgroundElement.value = activeBackgroundUrl;
                    }
                }

                var firstBackground = backgroundElements[0];
                if (firstBackground) {
                    firstBackground.focus();
                }
            }.bind(this), function (error) {
                // Don't do anything
            });
        },
        _save: function () {
            var activeWorkspaceSettings = this._workspaceManager.settings.workspaces[this._workspaceManager._activeWorkspaceIndex];

            var newBackgroundImage = "";

            // First see if one of the built in backgrounds is selected
            var selectedBackground = this._layoutRoot.querySelector(".xbdh-backgrounds-background-thumbnail.xbdh-active");
            if (selectedBackground) {
                newBackgroundImage = selectedBackground.getAttribute("data-xbdh-url");
                xbdhUtils._Events.logUIAction("BackgroundImage:ChooseBuiltInBackground", newBackgroundImage);
            } else {
                // Otherwise look if there's a value in the custom background field
                var customBackgroundElement = this._layoutRoot.querySelector("#xbdh-backgroundimage-custombackground-value");
                newBackgroundImage = customBackgroundElement.value;
                xbdhUtils._Events.logUIAction("BackgroundImage:ChooseCustomBackground");
            }

            activeWorkspaceSettings.theme.backgroundImage = newBackgroundImage;

            // Update background also performs a save settings
            this._workspaceManager._changeBackgroundImage(newBackgroundImage);

            this._saveBackgroundCommand.textContent = "Saved";
            this._saveBackgroundCommand.disabled = true;

            xbdhUtils.hideMenu();
        },
        _selectBackground: function (e) {
            var srcElement = e.srcElement;

            // Remove selection from other backgrounds and clear the custom background text field
            this._clearBuiltInBackgroundsSelection();

            var customBackgroundElement = this._layoutRoot.querySelector("#xbdh-backgroundimage-custombackground-value");
            customBackgroundElement.value = "";

            srcElement.classList.add("xbdh-active");
        },
        _workspaceManager: null,
        ready: function (element, options) {
            this._workspaceManager = xbdhUtils._Internal.workspaceManager;
            this._layoutRoot = element;
            // Populate UI
            this._refresh();

            // Add behavior to textboxes
            xbdhUtils.addTextboxBehaviors(element);

            var customBackgroundElement = this._layoutRoot.querySelector("#xbdh-backgroundimage-custombackground-value");
            customBackgroundElement.placeholder = DevHome.Utilities.Resources.getString("backgroundImageCustomUrlPlaceholderText").value;
            customBackgroundElement.addEventListener("input", this._customBackgroundTextChanged.bind(this), false);

            this._saveBackgroundCommand = this._layoutRoot.querySelector("#xbdh-backgroundimage-savecommand");
            this._saveBackgroundCommand.addEventListener("click", this._save.bind(this), false);
        },

        unload: function () {
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();