// Copyright (c) Microsoft Corporation. All rights reserved.

(function () {
    "use strict";

    // UserManager class
    var UserManager = (function () {
        var xbdhUtils = DevHome.Utilities;
        var nativeUtils = xbdhUtils.getDevHomeNativeUtilities();
        var xblUtils = Microsoft.Xbox.Development.XboxLiveUtilities;

        function UserManager(element, options) {
            // Private variables
            this._element = element || document.createElement("div");
            this._addUserBound = this._addUser.bind(this);
            this._addGuestInvokedBound = this._addGuestInvoked.bind(this);
            this._populateUserListAsyncBound = this._populateUserListAsync.bind(this);
            this._delayedUserListRefreshAsyncBound = this._delayedUserListRefreshAsync.bind(this);
            this._toggleSignedInBound = this._toggleSignedIn.bind(this);
            this._userList = this._element.querySelector("#xbdh-usermanagement-users-list");
            this._userManager = xbdhUtils.getConsoleExtensions().UserManager;
            this._workspaceManager = xbdhUtils._Internal.workspaceManager;

            this._createDom();

            // Events
            this._userWatcher = Windows.System.User.createWatcher();
            this._userWatcher.addEventListener("added", this._delayedUserListRefreshAsyncBound, false);
            this._userWatcher.addEventListener("removed", this._delayedUserListRefreshAsyncBound, false);
            this._userWatcher.addEventListener("updated", this._delayedUserListRefreshAsyncBound, false);
            this._userWatcher.addEventListener("authenticationstatuschanged", this._delayedUserListRefreshAsyncBound, false);
            this._userWatcher.start();

            Windows.UI.WebUI.WebUIApplication.addEventListener("resuming", this._populateUserListAsyncBound, false);
            Windows.Xbox.ApplicationModel.Core.CoreApplicationContext.addEventListener("currentuserchanged", this._populateUserListAsyncBound, false);
        }
        Object.defineProperty(UserManager.prototype, "element", {
            get: function () {
                return this._element;
            },
            enumerable: true,
            configurable: true
        });
        // Private methods
        UserManager.prototype._addGuestAsync = function () {
            xbdhUtils._Events.logUIAction("UserManagement:AddGuest");
            xbdhUtils.showProgress(this._element);
            return this._userManager.addSponsoredUserAsync()
                .then(
                    function success(user) {
                        xbdhUtils.hideProgress(this._element);
                    }.bind(this), xbdhUtils.defaultErrorHandler);
        };
        UserManager.prototype._addGuestInvoked = function () {
            this._addGuestAsync();
        };
        UserManager.prototype._addUser = function () {
            xbdhUtils._Events.logUIAction("UserManagement:AddUser");

            // Show a dialog
            var addUserRootDiv = document.createElement("div");
            addUserRootDiv.classList.add("xbdh-usermanagement-adduser");
            addUserRootDiv.classList.add("xbdh-overlay");
            addUserRootDiv.classList.add("xbdh-overlay-tall");
            var addUserHtml =
                '<form class="xbdh-usermanagement-adduser-form">' +
                '  <h1 class="xbdh-usermanagement-adduser-heading">' + DevHome.Utilities.Resources.getString("usermanagementAddUserHeading").value + '</h1>' +
                '  <label for="xbdh-usermanagement-adduser-email-value" class="xbdh-label">' + DevHome.Utilities.Resources.getString("usermanagementAddUserEmail").value + '</label>' +
                '  <input id="xbdh-usermanagement-adduser-email-value" type="email" />' +
                '  <label for="xbdh-usermanagement-adduser-password-value" class="xbdh-label">' + DevHome.Utilities.Resources.getString("usermanagementAddUserPassword").value + '</label>' +
                '  <input id="xbdh-usermanagement-adduser-password-value" type="password" />' +
                '  <input id="xbdh-usermanagement-adduser-showpassword" type="checkbox" /><label for="xbdh-usermanagement-adduser-showpassword">' + DevHome.Utilities.Resources.getString("labelShowPassword").value + '</label>' +
                '  <div class="xbdh-form-buttons">' +
                '    <button id="xbdh-usermanagement-adduser-addusercommand" type="button">' + DevHome.Utilities.Resources.getString("commandAdd").value + '</button>' +
                '  </div>' +
                '</form>';

            var addUserOverlay = new DevHome.UI.Overlay(addUserRootDiv, { html: addUserHtml });

            // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
            // to get reset to the main workspace after this function executes, which we don't want. We want the show() method
            // call to set focus to the user details overlay instead.
            setImmediate(function () {
                if (this._disposed) {
                    return;
                }

                if (addUserOverlay) {
                    addUserOverlay.show();

                    // Add behavior to textboxes
                    xbdhUtils.addTextboxBehaviors(addUserRootDiv);

                    var emailField = addUserRootDiv.querySelector("#xbdh-usermanagement-adduser-email-value");
                    emailField.focus();

                    // Bring up the virtual keyboard
                    var inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();
                    inputPane.tryShow();

                    // Hook up buttons
                    var addUserButton = addUserRootDiv.querySelector("#xbdh-usermanagement-adduser-addusercommand");
                    addUserButton.addEventListener("click", this._signInUserInvoked.bind(this), false);

                    // Register show password checkbox
                    var passwordField = addUserRootDiv.querySelector("#xbdh-usermanagement-adduser-password-value");
                    var showPasswordButton = addUserRootDiv.querySelector("#xbdh-usermanagement-adduser-showpassword");
                    showPasswordButton.addEventListener("change", function (e) {
                        if (showPasswordButton.checked) {
                            passwordField.type = "text";
                        } else {
                            passwordField.type = "password";
                        }
                    });
                }
            }.bind(this));
        };
        UserManager.prototype._consoleUserFromConsoleExtensionsUser = function (consoleExtensionsUser) {
            var userId = consoleExtensionsUser.userId;
            var consoleUsers = Windows.Xbox.System.Internal.UserManager.consoleUsers;
            for (var i = 0, len = consoleUsers.size; i < len; i++) {
                if (consoleUsers[i].id === userId) {
                    return consoleUsers[i];
                }
            }
        };
        UserManager.prototype._consoleUserFromSystemUser = function (systemUser) {
            var userId = systemUser.id;
            var consoleUsers = Windows.Xbox.System.Internal.UserManager.consoleUsers;
            for (var i = 0, len = consoleUsers.size; i < len; i++) {
                if (consoleUsers[i].id === userId) {
                    return consoleUsers[i];
                }
            }
        };
        UserManager.prototype._createDom = function () {
            this._populateUserListAsync().then(function () {
                // Update the add guest button if no users are signed in
                var addGuestButton = this._element.querySelector("#xbdh-usermanagement-addguest");
                var addUserButton = this._element.querySelector("#xbdh-usermanagement-adduser");
                if (addUserButton &&
                    addGuestButton) {
                    addUserButton.addEventListener("click", this._addUserBound, false);
                    addGuestButton.addEventListener("click", this._addGuestInvokedBound, false);
                }
            }.bind(this), function () { });
        };
        UserManager.prototype._delayedUserListRefreshAsync = function () {
            // After a short delay, refresh the user list. The delay is to allow the xbox user manager
            // to get in sync with the OneCore user manager. It will likely be able to be removed if
            // Console Extensions User Manager swapped to use OneCore APIs.
            setTimeout(function () {
                this._populateUserListAsync();
            }.bind(this), 500);
        };
        UserManager.prototype._populateUserListAsync = async function () {
            // Re-populate the user list
            var innerHtml = "";

            // Get all the users
            var users;

            try {
                users = await this._userManager.getUsersAsync();
            } catch (err) {
                xbdhUtils.defaultErrorHandler(err);
                return;
            }

            if (this._disposed) {
                return;
            }

            // If focus is currently on a user list item, then we remember the focus so we can restore it later
            var previousFocusUserId = -1;
            var currentFocus = document.activeElement;
            if (currentFocus
                && currentFocus.classList.contains("xbdh-usermanagement-user")) {
                previousFocusUserId = currentFocus.getAttribute("data-xbdh-userid");
            }
            var noUsersSignedIn = true;
            for (var i = 0, len = users.size || users.length; i < len; i++) {
                var user = users[i];
                var systemUser = Windows.System.User.getFromId(user.userId);
                var isGuest = systemUser && systemUser.type === Windows.System.UserType.localGuest;

                if (user.emailAddress || isGuest) {
                    var contextMenuSelector = isGuest ? "#xbdh-usermanagement-contextmenu-guest" : "#xbdh-usermanagement-contextmenu-user";
                    var isSystemUserAndIsSignedInOrIsGuest = systemUser && (user.isSignedIn || isGuest);
                    var checkedCssClass = isSystemUserAndIsSignedInOrIsGuest ? 'xbdh-checked' : '';
                    var ariaChecked = isSystemUserAndIsSignedInOrIsGuest ? 'aria-checked="true"' : 'aria-checked="false"';

                    innerHtml += '<div role="checkbox" ' + ariaChecked + ' aria-labelledby="xbdh-usermanagement-user-label-' + i.toString() + '" class="xbdh-usermanagement-user xbdh-list-item xbdh-checkbox ' + checkedCssClass + ' win-focusable xbdh-showmenuicononhover" data-xbdh-userid="' + user.userId + '" data-xbdh-email="' + user.emailAddress + '" data-xbdh-contextmenu="' + contextMenuSelector + '" tabIndex="0">';
                    if (isSystemUserAndIsSignedInOrIsGuest) {
                        innerHtml += '<input type="checkbox" id="xbdh-usermanagement-user-input-' + i.toString() + '" checked="checked" tabIndex="-1" /><label id="xbdh-usermanagement-user-label-' + i.toString() + '" for="xbdh-usermanagement-user-input-' + i.toString() + '" >' + (user.emailAddress || DevHome.Utilities.Resources.getString("userManagementGuest").value) + '</label>';
                        noUsersSignedIn = false;
                    } else {
                        innerHtml += '<input type="checkbox" id="xbdh-usermanagement-user-input-' + i.toString() + '" tabIndex="-1" /><label id="xbdh-usermanagement-user-label-' + i.toString() + '" for="xbdh-usermanagement-user-input-' + i.toString() + '">' + user.emailAddress + '</label>';
                    } 
                    innerHtml += '</div>';

                    // Logic for displaying the User Age Group
                    if (user.ageGroup === Microsoft.Xbox.Tools.ConsoleExtensions.UserAgeGroupType.child || user.ageGroup === Microsoft.Xbox.Tools.ConsoleExtensions.UserAgeGroupType.teen) {
                        var ageGroup = this._getUserAgeGroupAsString(user.ageGroup);
                        innerHtml += '<div class="usermanagement-agegroup"><p>' + DevHome.Utilities.Resources.getString("usermanagementAgeGroup").value + ': ' + ageGroup + '</p></div>';
                    }
                }
            }

            // If there are no users, then display the "no users" text
            if (!users.size &&
                !users.length) {
                innerHtml += '<form><p>' + DevHome.Utilities.Resources.getString("userManagementNoUsers").value + '</p></form>';
            }

            // Update the add guest button if no users are signed in
            var addGuestButton = this._element.querySelector("#xbdh-usermanagement-addguest");

            // Put the option to add a guest at the end of the list
            if (noUsersSignedIn) {
                addGuestButton.disabled = true;
            } else {
                addGuestButton.disabled = false;
            }

            this._userList.innerHTML = innerHtml;

            // Attach click handlers
            var userElements = this._userList.querySelectorAll(".xbdh-usermanagement-user");
            for (i = 0, len = userElements.length; i < len; i++) {
                var userElement = userElements[i];
                userElement.addEventListener("click", this._toggleSignedInBound, false);
                userElement.addEventListener("keyup", this._toggleSignedInBound, false);
            }

            // If there was a previous focus, restore it
            if (previousFocusUserId !== -1) {
                var previousFocus = this._userList.querySelector('[data-xbdh-userid="' + previousFocusUserId + '"]');
                if (previousFocus) {
                    previousFocus.focus();
                }
            }
        };
        UserManager.prototype._removeUser = function (userId) {
            xbdhUtils._Events.logUIAction("UserManagement:RemoveUser");
            return this._userManager.deleteUserByIdAsync(userId);
        };
        UserManager.prototype._removeUserInvoked = function (e, userId) {
            if (userId === undefined) {
                var contextMenu = e.currentTarget.parentNode;
                userId = parseInt(contextMenu.winControl.context.getAttribute("data-xbdh-userid"));
            }

            xbdhUtils.showProgress(this._element);
            this._removeUser(userId).then(function () {
                xbdhUtils.hideProgress(this._element);
            }.bind(this), xbdhUtils.defaultErrorHandler);

            // Set focus to something else
            var newFocusElement = document.querySelector(".xbdh-usermanagement-user");
            if (!newFocusElement) {
                newFocusElement = document.getElementById("xbdh-usermanagement-adduser");
            }
            if (newFocusElement) {
                newFocusElement.focus();
            }
        };
        UserManager.prototype._addUserAsync = function (email, password) {
            xbdhUtils._Events.logUIAction("UserManagement:SignInUser");
            // The 3rd parameter is whether we store the password. This will always be true.
            return this._userManager.signInUserByEmailAsync(email, password, true);
        };
        UserManager.prototype._signInErrorHandler = function (error) {
            var errorTitle = DevHome.Utilities.Resources.getString("errorSignInTitle").value;
            var errorString = DevHome.Utilities.getErrorStringForSignInRelatedError(error.number);

            DevHome.Utilities.showError(null, errorTitle, errorString);
            // Hide any progress spinners if they exist
            DevHome.Utilities.hideProgress(document.body);
        };
        UserManager.prototype._signInUserInvoked = function () {
            var addUserOverlay = document.body.querySelector(".xbdh-usermanagement-adduser").winControl;
            var email = document.getElementById("xbdh-usermanagement-adduser-email-value").value;
            var password = document.getElementById("xbdh-usermanagement-adduser-password-value").value;

            xbdhUtils.showProgress(this._element);
            this._addUserAsync(email, password)
                .then(
                    function success(user) {
                        xbdhUtils.hideProgress(this._element);
                    }.bind(this), this._signInErrorHandler);

            // Hide the overlay
            addUserOverlay.hide();
        };
        UserManager.prototype._toggleSignedIn = function (e) {

            if (e.keyCode &&
                (e.keyCode !== DevHome.Utilities.Key.enter &&
                    e.keyCode !== DevHome.Utilities.Key.space)) {
                return;
            }

            var currentTarget = e.currentTarget;
            var checkBox = currentTarget.querySelector("input[type='checkbox']");

            // If this came from a mouse click then the check state
            // was changed before we were ready. Change it back and move to
            // our parent node so we can handle the logic correctly.
            if (e.pointerType && e.pointerType === "mouse" && e.target.tagName === "INPUT") {
                checkBox.checked = !checkBox.checked;
            }

            // If it's a guest account signing out the account is the same as removing it
            var sponsoringUserId = currentTarget.getAttribute("data-xbdh-sponsoringuserid");
            var userId = parseInt(currentTarget.getAttribute("data-xbdh-userid"));
            if (sponsoringUserId) {
                this._removeUserInvoked(null, userId);
            } else {
                var email = currentTarget.getAttribute("data-xbdh-email");

                // Update checked state
                if (checkBox) {
                    if (checkBox.checked) {
                        this._signoutInvoked(userId);
                        checkBox.checked = false;

                        // Remove any guests that were associated with that user
                        var guests = this._element.querySelectorAll("[data-xbdh-sponsoringuserid='" + userId + "']");
                        for (var i = 0, len = guests.length; i < len; i++) {
                            this._removeUserInvoked(null, userId);
                        }
                    } else {
                        this._signinInvoked(email);
                        checkBox.checked = true;
                    }
                }
            }
        };
        UserManager.prototype._signin = function (email) {
            xbdhUtils._Events.logUIAction("UserManagement:SignInUser");
            return this._userManager.signInUserByEmailAsync(email, "", true);
        };
        UserManager.prototype._signinInvoked = function (email) {
            xbdhUtils.showProgress(this._element);
            return this._signin(email).then(function () {
                xbdhUtils.hideProgress(this._element);
            }.bind(this), this._signInErrorHandler);
        };
        UserManager.prototype._signout = function (userId) {
            xbdhUtils._Events.logUIAction("UserManagement:SignOutUser");
            return this._userManager.signOutUserByIdAsync(userId);
        };
        UserManager.prototype._signoutInvoked = function (userId) {
            xbdhUtils.showProgress(this._element);
            return this._signout(userId).then(function () {
                xbdhUtils.hideProgress(this._element);
            }.bind(this), xbdhUtils.defaultErrorHandler);
        };
        UserManager.prototype._consoleUserFromId = function (id) {
            var consoleUser = null;
            var consoleUsers = Windows.Xbox.System.Internal.UserManager.consoleUsers;
            for (var i = 0, len = consoleUsers.size; i < len; i++) {
                if (consoleUsers[i].id === id) {
                    consoleUser = consoleUsers[i];
                    break;
                }
            }
            return consoleUser;
        };
        UserManager.prototype._consoleUserFromEmail = function (email) {
            var consoleUser = null;
            var consoleUsers = Windows.Xbox.System.Internal.UserManager.consoleUsers;
            for (var i = 0, len = consoleUsers.size; i < len; i++) {
                if (consoleUsers[i].emailAddress === email) {
                    consoleUser = consoleUsers[i];
                    break;
                }
            }
            return consoleUser;
        };
        UserManager.prototype._showAccountSettings = function () {
            xbdhUtils._Events.logUIAction("UserManagement:ViewAccountSettings");

            var accountSettingsRootDiv = document.createElement("div");
            accountSettingsRootDiv.id = "xbdh-usermanagement-details";
            accountSettingsRootDiv.classList.add("xbdh-usermanagement-details");
            accountSettingsRootDiv.classList.add("xbdh-overlay-tall");
            var accountSettingsHtml =
                '<h1 class="usermanagement-heading">' + DevHome.Utilities.Resources.getString("userManagementAccountSettings").value + '</h1>' +
                '<div class="usermanagement-basicinfo">' +
                '    <h2 id="usermanagement-basicinfo-heading" class="usermanagement-basicinfo-heading"></h2>' +
                '    <div class="usermanagement-details-field xbdh-hidden">' + // TODO: Not currently getting subscription type so hiding this div. Should be unhidden when we get sub type. (TFS 13061776)
                '        <div class="usermanagement-details-label">' + DevHome.Utilities.Resources.getString("userManagementUserDetailsSubscription").value + '</div>' +
                '        <div id="usermanagement-details-subscription-value" class="usermanagement-details-value"></div>' +
                '    </div>' +
                '    <div class="usermanagement-details-field">' +
                '        <div class="usermanagement-details-label">' + DevHome.Utilities.Resources.getString("userManagementUserDetailsReputation").value + '</div>' +
                '        <select id="usermanagement-details-reputation-value" class="usermanagement-details-value" disabled="disabled">' +
                '            <option Value"Good">' + DevHome.Utilities.Resources.getString("userManagementUserDetailsReputationGood").value + '</option>' +
                '            <option Value"Medium">' + DevHome.Utilities.Resources.getString("userManagementUserDetailsReputationMedium").value + '</option>' +
                '            <option Value"Bad">' + DevHome.Utilities.Resources.getString("userManagementUserDetailsReputationBad").value + '</option>' +
                '        </select>' +
                '    </div>' +
                '    <div class="usermanagement-details-field">' +
                '        <div class="usermanagement-details-label">' + DevHome.Utilities.Resources.getString("userManagementUserDetailsGamerTag").value + '</div>' +
                '        <div id="usermanagement-details-gamertag-value" class="usermanagement-details-value"></div>' +
                '    </div>' +
                '    <div class="usermanagement-details-field">' +
                '        <div class="usermanagement-details-label">' + DevHome.Utilities.Resources.getString("userManagementUserDetailsEmail").value + '</div>' +
                '        <div id="usermanagement-details-email-value" class="usermanagement-details-value"></div>' +
                '    </div>' +
                '    <div class="usermanagement-details-field">' +
                '        <div class="usermanagement-details-label">' + DevHome.Utilities.Resources.getString("userManagementUserDetailsXUID").value + '</div>' +
                '        <div id="usermanagement-details-xuid-value" class="usermanagement-details-value"></div>' +
                '    </div>' +
                '    <input id="usermanagement-details-autosignin-value" class="usermanagement-details-autosignin-label" type="checkbox"><label class="usermanagement-details-autosignin-label">' + DevHome.Utilities.Resources.getString("userManagementUserDetailsAutoSignIn").value + '</label>' +
                //'    <button id="usermanagement-details-resetxbldata">' + "Reset Xbox Live data" + '</button>' +
                '</div>' +
                '<div id="usermanagement-privileges" class="usermanagement-privileges">' +
                '    <h2 class="usermanagement-privileges-heading">' + DevHome.Utilities.Resources.getString("userManagementUserDetailsPrivileges").value + '</h2>' +
                '    <div class="usermanagement-privileges-list">' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-addfriend" type="checkbox" disabled="disabled" value="255"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegeAddFriend").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-broadcast" type="checkbox" disabled="disabled" value="190"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegeBroadcast").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-cloudgamingjoinsession" type="checkbox" disabled="disabled" value="208"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegeCloudGamingJoinSession").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-cloudgamingmanagesession" type="checkbox" disabled="disabled" value="207"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegeCloudGamingManageSession").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-cloudsavedgames" type="checkbox" disabled="disabled" value="209"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegeCloudSavedGames").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-communications" type="checkbox" disabled="disabled" value="252"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegeCommunications").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-communicationvoiceingame" type="checkbox" disabled="disabled" value="205"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegeCommunicationVoiceInGame").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-communicationvoiceskype" type="checkbox" disabled="disabled" value="206"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegeCommunicationVoiceSkype").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-gamedvr" type="checkbox" disabled="disabled" value="198"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegeGameDvr").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-multiplayerparties" type="checkbox" disabled="disabled" value="203"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegeMultiplayerParties").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-multiplayersessions" type="checkbox" disabled="disabled" value="254"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegeMultiplayerSessions").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-premiumcontent" type="checkbox" disabled="disabled" value="214"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegePremiumContent").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-premiumvideo" type="checkbox" disabled="disabled" value="224"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegePremiumVideo").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-profileviewing" type="checkbox" disabled="disabled" value="249"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegeProfileViewing").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-purchasecontent" type="checkbox" disabled="disabled" value="245"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegePurchaseContent").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-sharecontent" type="checkbox" disabled="disabled" value="211"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegeShareContent").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-sharekinectcontent" type="checkbox" disabled="disabled" value="199"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegeShareKinectContent").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-socialnetworksharing" type="checkbox" disabled="disabled" value="220"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegeSocialNetworkSharing").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-subscriptioncontent" type="checkbox" disabled="disabled" value="219"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegeSubscriptionContent").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-usercreatedcontent" type="checkbox" disabled="disabled" value="247"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegeUserCreatedContent").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-videocommunications" type="checkbox" disabled="disabled" value="235"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegeVideoCommunications").value + '</label></div>' +
                '        <div class="usermanagement-privilege"><input id="usermanagement-privilege-viewfriendslist" type="checkbox" disabled="disabled" value="197"><label>' + DevHome.Utilities.Resources.getString("userManagementPrivilegeViewFriendsList").value + '</label></div>' +
                '    </div>' +
                '</div>' +
                '<div class="usermanagement-details-actionbuttons">' +
                '    <button id="usermanagement-details-save">' + DevHome.Utilities.Resources.getString("commandSave").value + '</button>' +
                '</div>';

            // Populate account settings values
            var userListElement = this._element.querySelector("#xbdh-usermanagement-users-list");
            var activeUserElement = userListElement.querySelector(".xbdh-active");

            if (activeUserElement) {
                var userId = activeUserElement.getAttribute("data-xbdh-userid");

                var accountSettingsOverlay = new DevHome.UI.Overlay(accountSettingsRootDiv, { html: accountSettingsHtml });

                // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
                // to get reset to the main workspace after this function executes, which we don't want. We want the show() method
                // call to set focus to the user details overlay instead.
                setImmediate(function () {
                    if (accountSettingsOverlay &&
                        this._updateUserDetails) {
                        accountSettingsOverlay.show();
                        this._updateUserDetails(parseInt(userId));

                        // Store some values to compare when the user saves to see if the values have changed
                        accountSettingsOverlay.oldReputationValue = document.getElementById("usermanagement-details-reputation-value").selectedIndex;
                        accountSettingsOverlay.oldAutoSignInValue = document.getElementById("usermanagement-details-autosignin-value").checked;

                        // Hook up save button
                        var saveButton = accountSettingsRootDiv.querySelector("#usermanagement-details-save");
                        saveButton.addEventListener("click", this._save.bind(this), false);

                        // Set default focus
                        saveButton.focus();
                    }
                }.bind(this));
            }
        };
        UserManager.prototype._getRefreshedConsoleUser = function (oldConsoleUser) {
            try {
                var consoleUsers = Windows.Xbox.System.Internal.UserManager.consoleUsers;
                for (var i = 0; i < consoleUsers.length; i++) {
                    if (consoleUsers[i].id === oldConsoleUser.id) {
                        return consoleUsers[i];
                    }
                }
            } catch (err) {
                console.log("Error refreshing user.");
            }
            return null;
        };
        UserManager.prototype._getUserByIdAsync = function (userId) {
            return new Promise(function (complete, error) {
                this._userManager.getUsersAsync()
                    .then(
                        function success(users) {
                            var foundUser = false;
                            for (var i = 0, len = users.size; i < len; i++) {
                                if (users[i].userId === userId) {
                                    foundUser = true;
                                    complete(users[i]);
                                    break;
                                }
                            }
                            if (!foundUser) {
                                error("DevHome.UserNotFound");
                            }
                        });
            }.bind(this));
        };
        UserManager.prototype._getUserAgeGroupAsString = function (ageGroup) {
            var ageGroupAsString = DevHome.Utilities.Resources.getString("usermanagementAgeGroupUnknown").value;

            switch (ageGroup) {
                case Microsoft.Xbox.Tools.ConsoleExtensions.UserAgeGroupType.adult:
                    ageGroupAsString = DevHome.Utilities.Resources.getString("usermanagementAgeGroupAdult").value;
                    break;
                case Microsoft.Xbox.Tools.ConsoleExtensions.UserAgeGroupType.teen:
                    ageGroupAsString = DevHome.Utilities.Resources.getString("usermanagementAgeGroupTeen").value;
                    break;
                case Microsoft.Xbox.Tools.ConsoleExtensions.UserAgeGroupType.child:
                    ageGroupAsString = DevHome.Utilities.Resources.getString("usermanagementAgeGroupChild").value;
                    break;
                default:
                    break;
            };
            return ageGroupAsString;
        };
        UserManager.prototype._save = function () {
            var accountSettingsOverlayElement = document.body.querySelector(".xbdh-usermanagement-details");
            var xuid = document.getElementById("usermanagement-details-xuid-value").textContent;

            // Update auto-sign in status
            var autoSignInField = document.getElementById("usermanagement-details-autosignin-value");
            if (autoSignInField.checked !== accountSettingsOverlayElement.oldAutoSignInValue) {
                var currentUserConsole = null;
                var consoleUsers = Windows.Xbox.System.Internal.UserManager.consoleUsers;
                for (var i = 0, len = consoleUsers.length; i < len; i++) {
                    var consoleUser = consoleUsers[i];
                    if (consoleUser.xboxUserId === xuid) {
                        currentUserConsole = consoleUser;
                        break;
                    }
                }
                this._updateAutoSignInInvoked(currentUserConsole, autoSignInField.checked);
            }

            accountSettingsOverlayElement.winControl.hide();
        };
        UserManager.prototype._updateAutoSignIn = function (user, newAutoSignInValue) {
            xbdhUtils._Events.logUIAction("UserManagement:UpdateUserAutoSignIn");

            // Try to update the auto-signin bit  
            try {
                Microsoft.Xbox.Development.UserUtilities.setAutoSigninById(user.id, newAutoSignInValue);
            } catch (err) {
                // Swallow error, we will message to user failure from the check below  
            }
        };
        UserManager.prototype._updateAutoSignInInvoked = function (user, newAutoSignInValue) {
            this._updateAutoSignIn(user, newAutoSignInValue);
            var updatedUser = this._getRefreshedConsoleUser(user);
            if (newAutoSignInValue && updatedUser && (updatedUser.autoSignIn === newAutoSignInValue)) {
                // We successfully updated auto-signin, so update UI to the new auto-signin user  
            } else if (!newAutoSignInValue && updatedUser && (updatedUser.autoSignIn === newAutoSignInValue)) {
                // We successfully cleared auto-signin, so update UI to nobody having auto-signin 
            } else {
                // We failed to successfully set the auto-signin bit, message this to the user  
            }
        };
        UserManager.prototype._updateUserDetails = function (userId) {
            // Get the public version of the user
            this._getUserByIdAsync(userId)
                .then(
                    function success(user) {
                        // Get field references
                        var emailField = document.getElementById("usermanagement-details-email-value");
                        var gamertagField = document.getElementById("usermanagement-details-gamertag-value");
                        var xuidField = document.getElementById("usermanagement-details-xuid-value");
                        //var subscriptionField = document.getElementById("usermanagement-details-subscription-value"); // HACKHACK
                        var autoSignInStatusField = document.getElementById("usermanagement-details-autosignin-value");
                        var reputationField = document.getElementById("usermanagement-details-reputation-value");

                        // Populate email address
                        var basicInfoHeading = document.getElementById("usermanagement-basicinfo-heading");
                        basicInfoHeading.textContent = user.emailAddress;
                        emailField.textContent = user.emailAddress;

                        gamertagField.textContent = user.gamertag;
                        xuidField.textContent = user.xuid;

                        // Auto sign in
                        autoSignInStatusField.checked = user.autoSignIn;

                        var userSettings = this._userSettings(user);
                        if (!userSettings) {
                            return;
                        }

                        var reputation = userSettings.reputation;

                        // Translate the reputation into a dropdown menu
                        if (reputation > 70) {
                            reputationField.selectedIndex = 0;
                        } else if (reputation > 30) {
                            reputationField.selectedIndex = 1;
                        } else {
                            reputationField.selectedIndex = 2;
                        }

                        // Update the privileges
                        var store = Windows.Xbox.ApplicationModel.Store;

                        var knownPrivileges = store.KnownPrivileges;
                        for (var privilegeId in knownPrivileges) {
                            this._refreshKnownPrivilegeAsync(user, store.KnownPrivileges[privilegeId]).then(function () { }, function () { });
                        }

                        if (user.xuid) {

                            // HACKHACK - XSAPI not running on Xbox - Need alternate solution or get it working
                            //    var xboxLiveContext = new Microsoft.Xbox.Services.XboxLiveContext(systemUser);
                            //    xboxLiveContext.profileService.getUserProfileAsync(user.xuid).then(function (currentUserProfile) {
                            //        var rawAccountTier = currentUserProfile.accountTier;
                            //        var friendlyAccountTierName = "";
                            //        var tier = Microsoft.Xbox.Services.Social.XboxAccountTier;
                            //        switch (rawAccountTier) {
                            //            case tier.familyGold:
                            //                friendlyAccountTierName = DevHome.Utilities.Resources.getString("userManagementSubscriptionTypeFamilyGold").value;
                            //                break;
                            //            case tier.gold:
                            //                friendlyAccountTierName = DevHome.Utilities.Resources.getString("userManagementSubscriptionTypeGold").value;
                            //                break;
                            //            case tier.silver:
                            //                friendlyAccountTierName = DevHome.Utilities.Resources.getString("userManagementSubscriptionTypeSilver").value;
                            //                break;
                            //            case tier.newUser:
                            //                friendlyAccountTierName = DevHome.Utilities.Resources.getString("userManagementSubscriptionTypeNone").value;
                            //                break;
                            //            case tier.unknown:
                            //            default:
                            //                friendlyAccountTierName = DevHome.Utilities.Resources.getString("userManagementSubscriptionTypeUnknown").value;
                            //                break;
                            //        }
                            //        subscriptionField.textContent = friendlyAccountTierName;
                        }
                    }.bind(this));
        };
        UserManager.prototype._refreshKnownPrivilegeAsync = function (user, privilegeId) {
            var systemUser = Windows.System.User.getFromId(user.userId);
            var store = Windows.Xbox.ApplicationModel.Store;
            return new Promise(function (complete, error) {
                try {
                    store.Internal.ProductInternal.checkPrivilegeAsync(systemUser, privilegeId, false, null)
                        .then(
                            function successCallback(result) {
                                var userRootElement = document.getElementById("usermanagement-privileges");

                                if (!userRootElement) {
                                    return;
                                }

                                var privilegeInput = userRootElement.querySelector("input[value='" + privilegeId + "']");

                                if (!privilegeInput) {
                                    return;
                                }

                                if (result === store.PrivilegeCheckResult.noIssue) {
                                    privilegeInput.checked = true;
                                } else {
                                    privilegeInput.checked = false;
                                }
                                complete();
                            },
                            function errorCallback() {
                                error();
                            });
                } catch (ex) {
                    error();
                }
            });
        };
        UserManager.prototype._userSettings = function (consoleExtensionsUser) {
            var userId = consoleExtensionsUser.userId;
            // Yes this is two UserSettings in a row, not a bug...
            var userSettings = Windows.Xbox.System.Internal.UserSettings.UserSettings.getUserSettings(userId);
            return userSettings.profileSettings;
        };
        // Public methods
        UserManager.prototype.dispose = function () {
            if (this._disposed) {
                return;
            }
            this._disposed = true;

            if (this._userWatcher) {
                this._userWatcher.removeEventListener("added", this._delayedUserListRefreshAsyncBound);
                this._userWatcher.removeEventListener("removed", this._delayedUserListRefreshAsyncBound);
                this._userWatcher.removeEventListener("updated", this._delayedUserListRefreshAsyncBound);
                this._userWatcher.removeEventListener("authenticationstatuschanged", this._delayedUserListRefreshAsyncBound);
                this._userWatcher.stop();
            }

            Windows.UI.WebUI.WebUIApplication.removeEventListener("resuming", this._populateUserListAsyncBound);
            Windows.Xbox.ApplicationModel.Core.CoreApplicationContext.removeEventListener("currentuserchanged", this._populateUserListAsyncBound);
        };
        return UserManager;
    })();
    DevHome._ViewModels = DevHome._ViewModels || {};
    DevHome._ViewModels.UserManager = UserManager;
})();