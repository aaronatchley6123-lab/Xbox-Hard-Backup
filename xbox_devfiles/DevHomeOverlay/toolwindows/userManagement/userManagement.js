// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";
    var utils = DevHome.Utilities;

    WinJS.UI.Pages.define("/toolwindows/userManagement/userManagement.html", {
        ready: function (element, options) {
            setImmediate(function () {
                if (element && element.parentNode) {
                    this._userList = new DevHome._ViewModels.UserManager(element);

                    // Hook up the context menu
                    var accountSettingsCommand = element.querySelector("#xbdh-usermanagement-contextmenu-user-accountsettings");
                    var removeUserCommand = element.querySelector("#xbdh-usermanagement-contextmenu-user-removeuser");
                    var removeGuestCommand = element.querySelector("#xbdh-usermanagement-contextmenu-removeguest");
                    var addGuestCommand = element.querySelector("#xbdh-usermanagement-contextmenu-user-addguest");
                    accountSettingsCommand.addEventListener("click", this._userList._showAccountSettings.bind(this._userList), false);
                    removeUserCommand.addEventListener("click", this._userList._removeUserInvoked.bind(this._userList), false);
                    removeGuestCommand.addEventListener("click", this._userList._removeUserInvoked.bind(this._userList), false);
                    addGuestCommand.addEventListener("click", this._userList._addGuestInvoked.bind(this._userList), false);
                    if (utils._consoleType === utils.ConsoleType.other) {
                        var addGuestButton = element.querySelector("#xbdh-usermanagement-addguest");
                        addGuestButton.classList.add("xbdh-hidden");
                        addGuestCommand.classList.add("xbdh-hidden");
                    }

                }
            }.bind(this));
        },

        unload: function () {
            if (this._userList) {
                this._userList.dispose();
            }
        },

        updateLayout: function (element, viewState, lastViewState) {
        }
    });
})();