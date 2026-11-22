// Copyright (c) Microsoft Corporation. All rights reserved.

var applicationView = Windows.UI.ViewManagement.ApplicationView.getForCurrentView();
applicationView.setDesiredBoundsMode(Windows.UI.ViewManagement.ApplicationViewBoundsMode.useCoreWindow);

var DevHome;
(function (DevHome) {
    "use strict";

    DevHome.Utilities = DevHome.Utilities || {};

    // Namespace declarations
    var xbdhUtils = DevHome.Utilities;
    var resources = xbdhUtils.Resources;

    // Private properties
    DevHome.Utilities._fullCertType = 0;
    DevHome.Utilities._certType = 0;
    DevHome.Utilities._consoleType = 0;
    DevHome.Utilities._currentDevHomeVersion = 2;
    DevHome.Utilities._fader = null;
    DevHome.Utilities._localSettings = Windows.Storage.ApplicationData.current.localSettings;
    DevHome.Utilities._inFirstRun = false;
    DevHome.Utilities._inTestMode = false;
    DevHome.Utilities._notificationsDomCreated = false;
    DevHome.Utilities._compatModeButtonInitialized = false;
    DevHome.Utilities._previousFocusFoot = null;
    DevHome.Utilities._settings = null;
    DevHome.Utilities._useMockConsoleExtensions = false;
    DevHome.Utilities._lastShutdownReason = "Pending retrieval";
    DevHome.Utilities._language = Windows.Xbox.System.Internal.Console.ConsoleProperties.currentNLSLanguage;
    if (DevHome.Utilities._language != null && DevHome.Utilities._language.toLowerCase() !== 'en-us') {
        DevHome.Utilities._isLocalized = true;
    } else {
        DevHome.Utilities._isLocalized = false;
    }

    // Class names
    DevHome.Utilities.ClassNames = {
        _cssHiddenClassName: "xbdh-hidden",
        _cssWindowClassName: "xbdh-window",
        _cssWindowSelector: ".xbdh-window",
        _cssWindowTitleClassName: "xbdh-window-title",
        _cssWorkspaceClassName: "xbdh-workspace",
        _cssWorkspaceSelector: ".xbdh-workspace"
    };

    DevHome.Utilities.WindowType = {
        none: 0,
        packaged: 1,
        hosted: 2
    };

    DevHome.Utilities.Cert = {
        uwp: 0,
        era: 1
    };

    DevHome.Utilities.ConsoleType = {
        xboxOne: 0,
        xboxOneS: 1,
        scorpioRetail: 2,
        scorpioDevkit: 3,
        dante: 4,
        scarlettOther: 5,
        lockhart: 6,
        edinburgh: 7,
        other: 8,
    };

    DevHome.Utilities._notifications = [];

    // Private methods
    var keys = xbdhUtils.Key;
    DevHome.Utilities._directionFromKeyCode = function (keyCode) {
        var direction = "";
        switch (keyCode) {
            case keys.GamepadDPadDown:
            case keys.GamepadLeftThumbstickDown:
            case keys.downArrow:
                direction = "down";
                break;
            case keys.GamepadDPadUp:
            case keys.GamepadLeftThumbstickUp:
            case keys.upArrow:
                direction = "up";
                break;
            case keys.GamepadDPadLeft:
            case keys.GamepadLeftThumbstickLeft:
            case keys.leftArrow:
                direction = "left";
                break;
            case keys.GamepadDPadRight:
            case keys.GamepadLeftThumbstickRight:
            case keys.rightArrow:
                direction = "right";
                break;
            default:
                // No-op
                break;
        };
        return direction;
    };

    DevHome.Utilities._sortNotifications = function () {
        DevHome.Utilities._notifications.sort(function (first, second) {
            // Sort urgent notifications first, followed by unread notifications.
            // -1 means first goes before second,
            // 1 means second goes before first,
            // and 0 means keep their current sort order
            if (first.isUrgentDisruptiveNotification && second.isUrgentDisruptiveNotification) {
                return 0;
            } else if (first.isUrgentDisruptiveNotification) {
                return -1;
            } else if (second.isUrgentDisruptiveNotification) {
                return 1;
            } else if (first.isRead && second.isRead) {
                return 0;
            } else if (first.isRead) {
                return 1;
            } else if (second.isRead) {
                return -1;
            } else {
                return 0;
            }
        });
    };

    DevHome.Utilities._getCountUnreadNotifications = function () {
        var notifications = DevHome.Utilities._notifications;
        var count = 0;
        for (var i = 0, len = notifications.length; i < len; ++i) {
            // If this is an unread notification or urgent notification, count it.
            if (!notifications[i].isRead || notifications[i].isUrgentDisruptiveNotification) {
                ++count;
            }
        }
        if (count > 0) {
            return count;
        } else {
            // We don't show a zero when there are no notifications, but just have the icon instead.
            return "";
        }
    };

    DevHome.Utilities._addNotification = function (args) {

        var notification = {
            title: args.title,
            description: args.description,
            isUrgentDisruptiveNotification: args.isUrgent,
            primaryActionLabel: args.primaryActionLabel,
            primaryActionId: args.primaryActionId,
            primaryActionCallback: args.primaryActionCallback
        }

        var rawDate = new Date();
        var timeFormatter = DevHome.Utilities.getTimeFormatter(true);

        notification.timeStamp = timeFormatter.format(rawDate);

        // Notifications should have a dismiss button by default
        if (!notification.primaryActionId && !notification.primaryActionLabel && !notification.primaryActionCallback) {

            notification.primaryActionId = "xbdh-notification-dismiss";
            notification.primaryActionLabel = DevHome.Utilities.Resources.getString("commandOk").value;
            notification.primaryActionCallback = function () {
                // Remove the notification
                xbdhUtils._removeNotification({
                    title: notification.title,
                    description: notification.description
                });

                // There are a number of unknown events where dialogElement could be null, this happened only once
                // As this is the primaryActionCallback, if dialogElement was null the first time, it could
                // be a timing issue and next time the element will be present and the button will work as expected
                var dialogElement = document.getElementById("xbdh-dialog");
                if (dialogElement) {
                    var dialog = dialogElement.winControl;
                    dialog.hide();
                }
            }
        }

        DevHome.Utilities._notifications.push(notification);
        DevHome.Utilities._sortNotifications();
        

        // Check if the notifications DOM is initialized. If not, create it.
        if (!DevHome.Utilities._notificationsDomCreated) {
            var notifications = DevHome.Utilities._notifications;
            // Create the DOM to host the notifications
            var notificationsButton = document.createElement("button");
            notificationsButton.id = "xbdh-shell-notifications";
            notificationsButton.className = "xbdh-shell-notifications";
            notificationsButton.type = "button";
            notificationsButton.textContent = DevHome.Utilities._getCountUnreadNotifications();
            var timeElement = document.getElementById("xbdh-shell-time");
            timeElement.parentNode.appendChild(notificationsButton);

            // Hook up event handler for the button
            notificationsButton.addEventListener("click", DevHome.Utilities._showNotifications, false);
            DevHome.Utilities._notificationsDomCreated = true;
        } else {
            var notificationsButton = document.getElementById("xbdh-shell-notifications");
            notificationsButton.className = "xbdh-shell-notifications";
            notificationsButton.textContent = DevHome.Utilities._getCountUnreadNotifications();
        }

        // This is disruptive as it interrupts whatever the user is doing,
        // so it should only be used for things we are truly okay making
        // annoying (like obsolete hardware that should be replaced ASAP).
        if (notification.isUrgentDisruptiveNotification) {
            // Pop the overlay
            DevHome.Utilities._showNotifications();
        } else {
            var notificationOverlay = document.querySelector(".xbdh-shell-notifications-overlay");
            if (notificationOverlay) {
                // If the overlay is already showing, refresh it.
                DevHome.Utilities._showNotifications();
            }
        }
    };

    DevHome.Utilities._removeNotification = function (notification) {
        // Remove from the notifications array
        var notifications = DevHome.Utilities._notifications;
        // Iterate backwards since we can remove elements from the array
        for (var i = notifications.length - 1; i >= 0; --i) {
            if (notifications[i].title === notification.title) {
                DevHome.Utilities._notifications.splice(i, 1);
                var notificationsButton = document.getElementById("xbdh-shell-notifications");
                notificationsButton.textContent = DevHome.Utilities._getCountUnreadNotifications();
            }
        }

        // Remove from the DOM if this was our final notification
        if (!DevHome.Utilities._notifications.length) {
            var notificationsElement = document.getElementById("xbdh-shell-notifications");
            if (notificationsElement) {
                notificationsElement.parentNode.removeChild(notificationsElement);
                DevHome.Utilities._notificationsDomCreated = false;
            }
        }
    };

    DevHome.Utilities._showNotifications = function () {
        var notifications = DevHome.Utilities._notifications;
        // Show a dialog
        var notificationsRootDiv = document.createElement("div");
        notificationsRootDiv.classList.add("xbdh-shell-notifications-overlay");
        notificationsRootDiv.classList.add("xbdh-overlay");
        notificationsRootDiv.classList.add("xbdh-overlay-tall");
        var notificationsHtml = '<h1>' + resources.getString("notificationsOverlayTitle").value + '</h1>';

        notificationsHtml +=
            '<div id="xbdh-shell-notification-list" class="xbdh-list">';

        for (var i = 0, len = notifications.length; i < len; ++i) {
            var notification = notifications[i];

            notificationsHtml +=
                '<div class="xbdh-shell-notification xbdh-list-item">';

            // Add the timestamp of when the notification came in.
            notificationsHtml +=
                '  <div class="xbdh-shell-notification-timestamp">' + notification.timeStamp + '</div><br>';

            if (notification.isUrgentDisruptiveNotification) {
                notificationsHtml +=
                    '  <h3 class="xbdh-shell-notification-title-urgent">' + notification.title + '</h3>' +
                    '  <div class="xbdh-shell-notification-description-urgent">' + notification.description + '</div>';
            } else if (notification.isRead) {
                notificationsHtml +=
                    '  <h3 class="xbdh-shell-notification-title-read">' + notification.title + '</h3>' +
                    '  <div class="xbdh-shell-notification-description-read">' + notification.description + '</div>';
            } else {
                notificationsHtml +=
                    '  <h3 class="xbdh-shell-notification-title">' + notification.title + '</h3>' +
                    '  <div class="xbdh-shell-notification-description">' + notification.description + '</div>';
            }

            if (notification.primaryActionId &&
                notification.primaryActionLabel) {
                var divClass = "xbdh-shell-notification-primarycommand-text";
                if (notification.isRead) {
                    divClass = "xbdh-shell-notification-primarycommand-text-read";
                }

                notificationsHtml +=
                    '  <button id="' + notification.primaryActionId + '" class="xbdh-shell-notification-primarycommand">' +
                    '    <div class="' + divClass + '">' +
                             notification.primaryActionLabel +
                    '    </div>' +
                    '  </button > ';
            }

            notificationsHtml += '</div><br>';
        }
        notificationsHtml += '</div><button id="xbdh-shell-notifications-closecommand" class="xbdh-shell-notifications-closecommand">' + resources.getString("commandClose").value + '</button>';

        var notificationsOverlay = new DevHome.UI.Overlay(notificationsRootDiv, { html: notificationsHtml });

        // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
        // to get reset to the main workspace after this function executes, which we don't want. We want the show() method
        // call to set focus to the user details overlay instead.
        setImmediate(function () {
            if (this._disposed) {
                return;
            }

            if (notificationsOverlay) {
                notificationsOverlay.show();

                var notifications = DevHome.Utilities._notifications;
                // Iterate backwards since we can remove elements from the array
                for (var i = notifications.length - 1; i >= 0; --i) {
                    var notification = notifications[i];

                    notification.isRead = true;
                    if (notification.primaryActionId &&
                        notification.primaryActionCallback) {
                        var primaryActionButton = notificationsRootDiv.querySelector("#" + notification.primaryActionId);
                        primaryActionButton.addEventListener("click", notification.primaryActionCallback, false);
                    }

                    if (notification.isTransient) {
                        DevHome.Utilities._notifications.splice(i, 1);
                    }
                }

                DevHome.Utilities._sortNotifications();

                var closeButton = notificationsRootDiv.querySelector("#xbdh-shell-notifications-closecommand");
                closeButton.addEventListener("click", notificationsOverlay.hide.bind(notificationsOverlay), false);
                closeButton.focus();

                // Now reset the notification count since they've been read and remove the button if needed.
                var notificationCount = DevHome.Utilities._getCountUnreadNotifications();
                var notificationsButton = document.getElementById("xbdh-shell-notifications");

                if (notificationsButton) {
                    notificationsButton.textContent = notificationCount;
                    if (notificationCount === "") {

                        // If we have no notifications, remove the element
                        if (notifications.length === 0) {
                            notificationsButton.parentNode.removeChild(notificationsButton);
                            DevHome.Utilities._notificationsDomCreated = false;
                        } else {
                            // Otherwise only unread notifications are left, change the color to gray for the icon
                            notificationsButton.className = "xbdh-shell-notifications-nounread";
                        }
                    }
                }
            }
        }.bind(this));
    };
    DevHome.Utilities._checkForUnattendedScript = function (value) {
        // If an unattended script is running, kick off a timer to show progress
        if (Microsoft.Xbox.Development.UnattendedUtilities.isScriptRunning) {
            // Create unattended script overlay
            var unattendedNotification = document.createElement("div");
            unattendedNotification.id = "xbdh-notification-unattendedscriptrunning";
            unattendedNotification.className = "xbdh-notification xbdh-accentcolor-background";
            unattendedNotification.innerHTML =
                '<div class="xbdh-notification-unattendedscriptrunning-container">' +
                '  <progress class="xbdh-notification-unattendedscriptrunning-progress"></progress>' +
                DevHome.Utilities.Resources.getString("notificationsUnattendedScriptRunning").value +
                '</div>';
            document.body.appendChild(unattendedNotification);

            // Play entrance animation
            setImmediate(function () {
                unattendedNotification.classList.add("xbdh-notification-enteranimation");
            }, false);

            var unattendedScriptRunningTimerCookie = setInterval(function () {
                // Animate the text
                if (!Microsoft.Xbox.Development.UnattendedUtilities.isScriptRunning) {
                    // Hide overlay
                    unattendedNotification.style.display = "none";
                    clearInterval(unattendedScriptRunningTimerCookie);
                }
            }, 500);
        }
    };
    DevHome.Utilities._trySetActive = function (nextFocus) {
        if (nextFocus.setActive) {
            nextFocus.setActive();
        } else {
            nextFocus.focus();
        }
    };

    DevHome.Utilities._getLocalizedName = function (entity) {
        var name = "";
        if (entity.name) {
            name = entity.name;
        } else {
            name = DevHome.Utilities.Resources.getString(entity.nameResourceId).value;
        }
        return name;
    };

    DevHome.Utilities._friendlyErrorFromWinRTError = function (winRTError, parameter1) {
        var friendlyError = null;

        // We default to E_FAIL if no error code is specified.
        var code = winRTError.number || -2147467259;
        var message = winRTError.message;
        var stackTrace = winRTError.stackTrace;

        var hexString = DevHome.Utilities.signedIntegerToHexString(code);

        var errorTitle = "";
        var errorDescription = "";
        switch (hexString) {
            case "8007139F":
                errorTitle = resources.getString("multiplayerTraceMultiplayerTraceStartErrorNoGameRunningTitle").value;
                errorDescription = resources._formatString(resources.getString("multiplayerTraceMultiplayerTraceStartErrorNoGameRunningDescription").value, hexString);
                break;
            // User management errors
            case "8004882D":
                errorTitle = resources.getString("userManagementErrorBadUsernameTitle").value;
                errorDescription = resources._formatString(resources.getString("userManagementErrorBadUsernameDescription").value, hexString);
                break;
            case "80048821":
                errorTitle = resources.getString("userManagementErrorBadUsernameTitle").value;
                errorDescription = resources._formatString(resources.getString("userManagementErrorBadUsernameDescription").value, hexString);
                break;
            case "8004882E":
                errorTitle = resources.getString("userManagementErrorMissingPasswordTitle").value;
                errorDescription = resources._formatString(resources.getString("userManagementErrorMissingPasswordDescription").value, hexString);
                break;
            default:
                // Default to unknown error
                var debugUtils = Microsoft.Xbox.Development.DebugUtilities;
                errorTitle = resources.getString("errorUnknownTitle").value;

                var generatedErrorDescription = debugUtils.formatErrorMessageEx(code, DevHome.Utilities.isLocalized());

                if (generatedErrorDescription) {
                    errorDescription = resources._formatString(generatedErrorDescription + " " + resources.getString("errorCodeDescription").value, hexString);
                } else {
                    errorDescription = resources._formatString(resources.getString("errorUnknownDescription").value, hexString);
                }
                
                break;
        };
        friendlyError = {
            title: errorTitle,
            description: errorDescription
        };

        DevHome.Utilities._Events.logError(code, message, stackTrace);

        return friendlyError;
    };

    // Public methods
    DevHome.Utilities.isStringEmptyOrWhiteSpace = function (value) {
        if (typeof value != "string") {
            throw new Error("Error on isStringEmptyOrWhiteSpace: value must be a string.");
        }

        return value.trim().length === 0;
    };

    DevHome.Utilities.defaultErrorHandler = function (error) {
        DevHome.Utilities.showError(error);
        // Hide any progress spinners if they exist
        DevHome.Utilities.hideProgress(document.body);
    };
    // Used for testing - adds a level of indirection so that tests can easily inject custom behavior into console extension API
    DevHome.Utilities.getConsoleExtensions = function () {
        if (this._useMockConsoleExtensions) {
            return DevHome.Test.Utilities.ConsoleExtensions;
        } else {
            return Microsoft.Xbox.Tools.ConsoleExtensions;
        }
    };
    DevHome.Utilities.getDevHomeNativeUtilities = function () {
        if (this._useMockConsoleExtensions) {
            return DevHome.Test.Utilities.NativeUtilities;
        } else {
            return new Microsoft.Xbox.Tools.DevHome.NativeUtilities();
        }
    };
    DevHome.Utilities.getMenu = function () {
        var menuEl = document.querySelector(".xbdh-menu");
        if (menuEl) {
            return menuEl.winControl;
        } else {
            return null;
        }
    };
    DevHome.Utilities.hide = function (element) {
        element.classList.add(DevHome.Utilities.ClassNames._cssHiddenClassName);
    };
    DevHome.Utilities.hideVisibleOverlays = function () {
        if (DevHome.Utilities._dontHideVisibleOverlays) {
            return;
        }

        var overlays = document.body.querySelectorAll(".win-overlay");
        for (var i = 0, len = overlays.length; i < len; i++) {
            var overlay = overlays[i];
            if (overlay &&
                overlay.winControl &&
                overlay.winControl._open) {
                overlay.winControl.hide();
            }
        }
    };
    DevHome.Utilities.hasVisibleOverlay = function () {
        var overlays = document.body.querySelectorAll(".win-overlay");
        for (var i = 0, len = overlays.length; i < len; i++) {
            var overlay = overlays[i];
            if (overlay &&
                overlay.winControl &&
                overlay.winControl._open) {
                return true;
            }
        }
        return false;
    };
    DevHome.Utilities.hideDarkBackground = function () {
        if (!DevHome.Utilities._fader) {
            DevHome.Utilities._fader = document.getElementById("xbdh-fader");
        }
        DevHome.Utilities._fader.classList.add("xbdh-hidden");
    };
    DevHome.Utilities.hideMenu = function () {
        var menu = this.getMenu();
        if (menu) {
            menu.hide();
        }
    };
    DevHome.Utilities.hideProgress = function (parentElement) {
        var progressContainer = parentElement.querySelector(".xbdh-indeterminateprogressoverlay");
        if (progressContainer &&
            progressContainer.parentNode) {
            progressContainer.parentNode.removeChild(progressContainer);
        }
    };
    DevHome.Utilities.setFocusToFirstFocusableElement = function (focusRoot) {
        if (!focusRoot &&
            TVJS.DirectionalNavigation.focusRoot) {
            focusRoot = TVJS.DirectionalNavigation.focusRoot;
        }
        var initialFocusElement = focusRoot.querySelector(".win-focusable, BUTTON:not([disabled]), BUTTON:not([tabIndex='-1']), INPUT:not([disabled]), INPUT:not([tabIndex='-1']), TEXTAREA:not([disabled]), TEXTAREA:not([tabIndex='-1']), SELECT:not([disabled]), SELECT:not([tabIndex='-1']), A:not([disabled]), A:not([tabIndex='-1'])");
        if (initialFocusElement) {
            initialFocusElement.focus();
        }
    };
    DevHome.Utilities.show = function (element) {
        element.classList.remove(DevHome.Utilities.ClassNames._cssHiddenClassName);
    };
    DevHome.Utilities.showDarkBackground = function () {
        if (!DevHome.Utilities._fader) {
            DevHome.Utilities._fader = document.getElementById("xbdh-fader");
        }
        DevHome.Utilities._fader.classList.remove("xbdh-hidden");
    };
    DevHome.Utilities.showError = function (error, title, description, parameter1) {
        // If an error object was passed, then derive the title and description from the error information.
        if (error) {
            var friendlyError = DevHome.Utilities._friendlyErrorFromWinRTError(error, parameter1)
            title = friendlyError.title;
            description = friendlyError.description;
        } else {
            // Fallback to unknown error message
            title = title || DevHome.Utilities.Resources.getString("errorUnknownTitle").value;
            description = description || DevHome.Utilities.Resources.getString("errorUnknownDescription").value;
        }

        //Replace new lines with breaks
        if (description) {
            // Regex is global and ignoring case
            description = description.replace(new RegExp("\n", "gi"), "<br>");
        }

        var overlayRootElement = document.createElement("div");
        overlayRootElement.classList.add("xbdh-errormessage");
        overlayRootElement.classList.add("xbdh-overlay-short");
        var innerHtml =
            '<h1 class="xbdh-errormessage-heading">' + title + '</h1>' +
            '<p class="xbdh-errormessage-description">' + description + '</p>' +
            '<div class="xbdh-form-buttons">' +
            '  <button class="xbdh-errormessage-primaryaction">' + DevHome.Utilities.Resources.getString("commandClose").value + '</button>' +
            '</div>';

        var overlay = new DevHome.UI.Overlay(overlayRootElement, { html: innerHtml });

        // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
        // to get reset to the main workspace after this function executes, which we don't want. We want the show() method
        // call to set focus to the user details overlay instead.

        function handleErrorMessageKeyUp(e) {
            if (e.keyCode === keys.GamepadA ||
                e.keyCode === keys.enter ||
                e.keyCode === keys.space) {
                overlay.hide();
            }
        };

        setImmediate(function () {
            if (overlay) {
                overlay.show();
                var primaryButton = overlay._element.querySelector("button");

                primaryButton.addEventListener("keyup", handleErrorMessageKeyUp, false);

                setImmediate(function () {
                    if (primaryButton) {
                        xbdhUtils._trySetActive(primaryButton);
                    }
                });
            }
        }.bind(this));
    };
    DevHome.Utilities.closePopUp = function () {
        var popup = document.body.querySelector(".xbdh-popup").winControl;
        popup.hide();
    },
        DevHome.Utilities.showPopUp = function (title, description, primaryCommand, secondaryCommand, extraClass, size) {
            // Default actions if the primary or secondary commands aren't specified
            if (!primaryCommand) {
                primaryCommand = {
                    label: DevHome.Utilities.Resources.getString("commandClose").value,
                    callback: DevHome.Utilities.closePopUp
                }
            }

            var overlayRootElement = document.createElement("div");
            overlayRootElement.classList.add("xbdh-popup");
            if (!size || size === "short") {
                overlayRootElement.classList.add("xbdh-overlay-short");
            } else if (size === "medium") {
                overlayRootElement.classList.add("xbdh-overlay-medium");
            } else {
                overlayRootElement.classList.add("xbdh-overlay-tall");
            }
            if (extraClass) {
                overlayRootElement.classList.add(extraClass);
            }
            var innerHtml =
                '<h1 class="xbdh-popup-heading">' + title + '</h1>' +
                '<p class="xbdh-popup-description">' + description + '</p>' +
                '<button class="xbdh-popup-primarycommnad">' + primaryCommand.label + '</button>';
            if (secondaryCommand) {
                innerHtml += '<button class="xbdh-popup-secondarycommnad">' + secondaryCommand.label + '</button>';
            }

            var overlay = new DevHome.UI.Overlay(overlayRootElement, { html: innerHtml });

            // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
            // to get reset to the main workspace after this function executes, which we don't want. We want the show() method
            // call to set focus to the user details overlay instead.
            setImmediate(function () {
                if (overlay) {
                    overlay.show();

                    var primaryCommandButton = overlayRootElement.querySelector(".xbdh-popup-primarycommnad");
                    var secondaryCommandButton = overlayRootElement.querySelector(".xbdh-popup-secondarycommnad");
                    primaryCommandButton.addEventListener("click", (primaryCommand.callback || overlay.hide), false);
                    if (secondaryCommandButton) {
                        secondaryCommandButton.addEventListener("click", (secondaryCommand.callback || overlay.hide), false);
                    }

                    setImmediate(function () {
                        if (primaryCommandButton) {
                            xbdhUtils._trySetActive(primaryCommandButton);
                        }
                    });
                }
            }.bind(this));
        };
    DevHome.Utilities.showProgress = function (parentElement, label) {
        // Check if there is already a progress spinner
        var progressContainer = parentElement.querySelector(".xbdh-indeterminateprogressoverlay");
        if (progressContainer) {
            if (label) {
                var descriptionContainer = parentElement.querySelector(".xbdh-indeterminateprogressoverlay-description");
                if (descriptionContainer) {
                    descriptionContainer.textContent = label;
                } else {
                    progressContainer.innerHtml += '<div class="xbdh-indeterminateprogressoverlay-description">' + label + '</div>';
                }
            }
        } else {
            progressContainer = document.createElement("div");
            progressContainer.classList.add("xbdh-indeterminateprogressoverlay");
            var htmlString = '<progress class="xbdh-indeterminateprogressoverlay-progress"></progress>';
            if (label) {
                htmlString += '<div class="xbdh-indeterminateprogressoverlay-description">' + label + '</div>';
            }
            progressContainer.innerHTML = htmlString;
            parentElement.appendChild(progressContainer);
        }
    };
    DevHome.Utilities.signedIntegerToHexString = function (signedInteger) {
        var hexNumber = 0;
        var hexString = "";
        if (signedInteger < 0) {
            hexNumber = 0xFFFFFFFF + signedInteger + 1;
        } else {
            hexNumber = signedInteger;
        }
        hexString = hexNumber.toString(16).toUpperCase();
        return hexString;
    };
    DevHome.Utilities.isLocalized = function () {
        return DevHome.Utilities._isLocalized;
    };
    DevHome.Utilities.currentLanguage = function () {
        if (DevHome.Utilities._language != null) {
            return DevHome.Utilities._language;
        } else {
            return null;
        }
    };
    Object.defineProperty(DevHome.Utilities, "viewState", {
        get: function () {
            var screenWidth = document.body.offsetWidth;
            if (screenWidth >= 1440) {
                return "full";
            } else {
                return "fill";
            }
        },
        enumerable: true,
        configurable: true
    });
    DevHome.Utilities.addFormBehaviors = function (formElement, validation) {
        DevHome.Utilities.addTabbingBehaviors(formElement);
        DevHome.Utilities.addTextboxBehaviors(formElement);
        if (validation) {
            DevHome.Utilities.addValidationBehaviors(formElement);
        }
    };
    // Adds tabbing behaviors to form elements
    DevHome.Utilities.addTabbingBehaviors = function (formElement) {

        var inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();
        // Make the menu button dismiss the keyboard
        var textBoxes = formElement.querySelectorAll("input[type='text'], input[type='url'], input[type='password'], input[type='email'], input[type='number'], input[type='tel'], input[type='search']");
        for (var i = 0, len = textBoxes.length; i < len; i++) {
            var textBox = textBoxes[i];
            textBox.addEventListener("keyup", function (e) {
                // When the enter key is pressed, set focus to the next tab stop in the form.
                if (e.keyCode === keys.enter) {
                    var activeElement = document.activeElement;
                    var currentTabIndex = parseInt(activeElement.getAttribute("tabindex"));
                    var nextFocus = formElement.querySelector("[tabindex='" + (currentTabIndex + 1) + "']");
                    if (nextFocus) {
                        nextFocus.focus();
                        if (nextFocus.tagName === "INPUT" &&
                            (nextFocus.getAttribute("[type='text']") ||
                                nextFocus.getAttribute("[type='password']") ||
                                nextFocus.getAttribute("[type='email']") ||
                                nextFocus.getAttribute("[type='number']") ||
                                nextFocus.getAttribute("[type='tel']") ||
                                nextFocus.getAttribute("[type='url']") ||
                                nextFocus.getAttribute("[type='search']"))) {
                            inputPane.tryShow();
                        }
                    }
                }
            }, false);

            textBox.addEventListener("change", function () {
                var errorMessageElement = formElement.querySelector(".xbdh-form-errormessage");
                if (errorMessageElement) {
                    errorMessageElement.classList.add("xbdh-hidden");
                }
            }, false);
        }
    };
    // Hooks the focus event on a textbox so that when the user focuses in the textbox, the text will get
    // highlighted and the cursor will be at the end. It will also add a behavior to dismiss the textbox
    // when the menu button ("enter") is pressed.
    DevHome.Utilities.addTextboxBehaviors = function (rootEl) {
        // Make the menu button dismiss the keyboard
        var textBoxes = rootEl.querySelectorAll("input[type='text'], input[type='url'], input[type='password'], input[type='email'], input[type='number'], input[type='tel'], input[type='search']");
        for (var i = 0, len = textBoxes.length; i < len; i++) {
            var textBox = textBoxes[i];
            textBox.addEventListener("keyup", function (e) {
                if (e.keyCode === keys.enter ||
                    e.keyCode === keys.escape) {
                    inputPane.tryHide();
                }
            }, false);
        }

        // Select text when keyboard is shown
        var inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();
        inputPane.addEventListener("showing", function () {
            var activeElement = document.activeElement;
            setImmediate(function () {
                if (activeElement &&
                    activeElement.tagName === "INPUT") {
                    var inputType = activeElement.getAttribute("type");
                    if (inputType === "text" ||
                        inputType === "url" ||
                        inputType === "password" ||
                        inputType === "email" ||
                        inputType === "number" ||
                        inputType === "tel" ||
                        inputType === "search") {
                        activeElement.select();
                    }
                }
            });
        }, false);
    };
    // Add input validation to form fields
    DevHome.Utilities.addValidationBehaviors = function (formElement) {
        var inputs = formElement.querySelectorAll("input");
        var submitButton = formElement.querySelector("button[type='submit']");

        if (!submitButton) {
            submitButton = formElement.querySelector(".xbdh-submit");
        }

        function validateForm(e) {
            var valid = true;
            var input = e.target;
            var parent = input.parentNode;
            var errorMessage = "";

            var errorElement = parent.querySelector(".xbdh-error");
            if (!errorElement) {
                return;
            }

            // Validate
            if (input.required && !input.value) {
                errorMessage = DevHome.Utilities.Resources.getString("errorRequiredField").value;
                valid = false;
            }

            var minLength = input.getAttribute("minlength");
            var maxLength = input.getAttribute("maxlength");
            if (minLength && maxLength &&
                (input.value.length < parseInt(minLength) ||
                    input.value.length > parseInt(maxLength))) {
                errorMessage = DevHome.Utilities.Resources._formatString(
                    DevHome.Utilities.Resources.getString("errorRequiredWrongNumberOfCharacters").value,
                    minLength,
                    maxLength
                );
                valid = false;
            }

            if (!valid) {
                // Remove any existing error messages
                errorElement.textContent = errorMessage;
                if (submitButton) {
                    submitButton.disabled = true;
                }
                DevHome.Utilities.show(errorElement);
            } else {
                DevHome.Utilities.hide(errorElement);

                // Check to see if this was the last validation error, if so set the form button to valid.
                var noValidationErrors = true;
                var errorElements = formElement.querySelectorAll(".xbdh-error");
                for (var i = 0, len = errorElements.length; i < len; i++) {
                    if (!errorElements[i].classList.contains(DevHome.Utilities.ClassNames._cssHiddenClassName)) {
                        noValidationErrors = false;
                        break;
                    }
                }
                if (noValidationErrors) {
                    // Enable the form submit button
                    if (submitButton) {
                        submitButton.disabled = false;
                    }
                }
            }
        };

        for (var i = 0, len = inputs.length; i < len; i++) {
            inputs[i].addEventListener("blur", validateForm, false);
            if (inputs[i].type === "email") {
                inputs[i].addEventListener("change", validateForm, false);
            }
        }
    };

    // Show an overlay which displays a text file in a scroll viewer
    DevHome.Utilities.showSimpleTextFileAsync = async function (folderPath, fileName) {
        try {
            var nativeUtils = xbdhUtils.getDevHomeNativeUtilities();
            var folder = await nativeUtils.getFolderAsync(folderPath);
            // Get the output file.
            var outputFile = await folder.getFileAsync(fileName);
            var fileContents = await Windows.Storage.FileIO.readTextAsync(outputFile);

            // Show an overlay with the HTML contents - give the overlay a default close button.
            var overlayRootElement = document.createElement("div");
            var innerHtml =
                '<label>' + fileName + '</label>' +
                '<div id="xbdh-overlay-fileoutput" tabindex="0" class="xbdh-overlay-fileoutput">' + fileContents.split("\r\n").join("<br>") + '</div>' +
                '<div class="xbdh-form-buttons">' +
                '  <button class="xbdh-popup-primarycommand">' + DevHome.Utilities.Resources.getString("commandClose").value + '</button>' +
                '</div>';

            var overlay = new DevHome.UI.Overlay(overlayRootElement, { html: innerHtml });

            // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
            // to get reset to the main workspace after this function executes, which we don't want. We want the show() method
            // call to set focus to the user details overlay instead.

            setTimeout(function () {
                if (overlay) {
                    overlay.show();

                    var fileOutput = overlayRootElement.querySelector(".xbdh-overlay-fileoutput");
                    var scrollViewerText = new TVJS.ScrollViewer(fileOutput);
                    scrollViewerText.scrollMode = TVJS.ScrollMode.text;

                    var primaryCommandButton = overlayRootElement.querySelector(".xbdh-popup-primarycommand");
                    primaryCommandButton.addEventListener("click", overlay.hide.bind(overlay), false);

                    setImmediate(function () {
                        if (primaryCommandButton) {
                            DevHome.Utilities._trySetActive(primaryCommandButton);
                        }
                    });
                }
            }.bind(this));
        } catch (ex) {
            // do nothing
        }
    };

    DevHome.Utilities.revertConsoleModeWithPrompt = function () {
        DevHome.Utilities.showPopUp(
            DevHome.Utilities.Resources.getString("notificationsConsoleModeDisableTitle").value,
            DevHome.Utilities.Resources.getString("notificationsConsoleModeDisableDescription").value,
            {
                label: DevHome.Utilities.Resources.getString("commandRestartNow").value,
                callback: function () {
                    Microsoft.Xbox.Development.DebugUtilities.consoleMode = Microsoft.Xbox.Development.ConsoleMode.default;
                    Windows.Xbox.System.Internal.Power.PowerProperties.restartConsole();
                }
            },
            {
                label: DevHome.Utilities.Resources.getString("commandCancel").value,
                callback: function () {
                    var dialog = document.getElementById("xbdh-dialog").winControl;
                    dialog.hide();
                }
            });
    };

    DevHome.Utilities.getErrorStringForNetworkShareRelatedError = function (errorNumber, filePath) {
        var networkErrorMessage;

        if (errorNumber === -2147023570 ||
            errorNumber === -2147023584) { // Incorrect user name or password
            networkErrorMessage = DevHome.Utilities.Resources.getString("launcherErrorRegisterRemotePackageBadCredentials").value;
        } else if (errorNumber === -2147024894 ||
            errorNumber === -2147024829 ||
            errorNumber === -2147024843) { // Could not find network location
            networkErrorMessage = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("launcherErrorRegisterRemotePackageBadLocation").value, filePath);
        } else if (errorNumber === -2147024735) { // Bad path name
            networkErrorMessage = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("launcherErrorRegisterRemotePackageBadPathName").value, filePath);
        } else if (errorNumber === -2147024891) { // Access denied
            networkErrorMessage = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("launcherErrorRegisterRemotePackageAccessDenied").value, filePath);
        } else if (errorNumber === -2147024809) { // Invalid parameters
            networkErrorMessage = DevHome.Utilities.Resources.getString("errorInvalidParameterDescription").value;
        } else if (errorNumber === -2147022694) { // Invalid format for the username
            networkErrorMessage = DevHome.Utilities.Resources.getString("errorInvalidUsernameFormatDescription").value;
        } else if (errorNumber === -2147023570) { // Incorrect username or password
            networkErrorMessage = DevHome.Utilities.Resources.getString("launcherErrorRegisterRemotePackageBadCredentials").value;
        } else if (errorNumber === -2147022989) { // Password needs updating or the location doesn't exist
            networkErrorMessage = DevHome.Utilities.Resources.getString("launcherErrorUserPasswordNeedsUpdatingDescription").value;
        } else {
            networkErrorMessage = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("errorUnknownDescription").value, DevHome.Utilities.signedIntegerToHexString(errorNumber));
        }

        return networkErrorMessage;
    };

    DevHome.Utilities.getErrorStringForSignInRelatedError = function (winRTError) {
        // We default to E_FAIL if no error code is specified.
        var code = winRTError.number || -2147467259;
        var hexString = DevHome.Utilities.signedIntegerToHexString(code);

        var errorString = "";
        switch (hexString) {
            // User management errors
            case "8004882D":
                errorString = resources._formatString(resources.getString("userManagementErrorBadUsernameDescription").value, hexString);
                break;
            case "80048821":
                errorString = resources._formatString(resources.getString("userManagementErrorBadUsernameDescription").value, hexString);
                break;
            case "8004882E":
                errorString = resources._formatString(resources.getString("userManagementErrorMissingPasswordDescription").value, hexString);
                break;
            default:
                // Default to unknown error
                errorString = resources._formatString(resources.getString("errorSignInDescription").value, hexString);
                break;
        };

        return errorString;
    };

    DevHome.Utilities.isValidNetworkAddress = function (ipAddress) {
        var validIPAddress = true;
        if (!ipAddress || ipAddress.length < 4) {
            validIPAddress = false;
        } else if(ipAddress[0] === '1' &&
                  ipAddress[1] === '6' &&
                  ipAddress[2] === '9' &&
                  ipAddress[3] === '.') {
            validIPAddress = false;
        } else if (ipAddress === "0.0.0.0") {
            validIPAddress = false;
        } else if (ipAddress === resources.getString("networkNotConnected").value) {
            validIPAddress = false;
        }

        return validIPAddress;
    };

    DevHome.Utilities.getTimeFormatter = function (includeDate) {
        // default to english
        let languages = ["en-US"]

        if (DevHome.Utilities.isLocalized()) {
            languages = [DevHome.Utilities.currentLanguage()];
        }

        let twentyFourHourClockEnabled = Windows.Xbox.System.Internal.Console.ConsoleProperties.twentyFourHourClockEnabled;
        let formatTemplate = includeDate ? "shortdate shorttime" : "shorttime";
        return new Windows.Globalization.DateTimeFormatting.DateTimeFormatter(
            formatTemplate,
            languages,
            // opt out of geographic region logic
            "ZZ",
            "GregorianCalendar",
            (twentyFourHourClockEnabled ? "24HourClock" : "12HourClock"));
    };

    //Use this function to remove the xbdh-checked class to all unchecked radio button containers on the elements list parameter
    DevHome.Utilities.removeCheckedClassOnUncheckedRadioButtonContainers = function (elements) {
        if (!elements) return;

        for (var i = 0; i < elements.length; i++) {
            var currentListItem = elements[i];
            var hasCheckedRadio = currentListItem.querySelector("input[type='radio']:checked");

            if (!hasCheckedRadio) {
                currentListItem.classList.remove("xbdh-checked");
                currentListItem.setAttribute("aria-selected", false);
            }
        }
    };

    var internalDevHomeUtilities = Microsoft.Xbox.Tools.ConsoleExtensions.InternalDevHomeUtilities;

    // Telemetry
    var _Events = _Events || {};
    _Events._initialized = false;
    _Events._eventsProvider = null;
    _Events.logUIAction = function (uiActionName, parameter1) {
        internalDevHomeUtilities.logUIAction(uiActionName, parameter1, 0);
    };
    _Events.logAppLaunch = function (launchArgs, viewState, numberOfWorkspaces, backgroundUri, themeAccentColor) {
        internalDevHomeUtilities.logAppLaunch("AppLaunch", "launch args: " + launchArgs + "| view state: " + viewState + "| workspaces: " + numberOfWorkspaces + "| background: " + backgroundUri + "| color: " + themeAccentColor, 0);
    };
    _Events.logCommandResult = function (commandName, parameter1, resultCode) {
        internalDevHomeUtilities.logCommandResult(commandName, parameter1, resultCode);
    };
    _Events.logError = function (code, message, stackTrace) {
        internalDevHomeUtilities.logError(message, stackTrace, code);
    };
    DevHome.Utilities._Events = _Events || {};

    // There can be multiple, saved configurations per-user.
    DevHome.Configurations = [];
})(DevHome || (DevHome = {}));

(function controlsInit() {
    "use strict";

    var classNames = DevHome.Utilities.ClassNames;
    var utils = DevHome.Utilities;

    // CheckBox
    var CheckBox = (function () {
        // Namespace shortcuts

        function CheckBox(element) {
            // Private variables
            this._checked = false;
            this._element = element || document.createElement("div");
            this._element.winControl = this;
            this._element.addEventListener("keyup", this._handleKeyUp.bind(this), false);

            var checkElement = this._element.querySelector("input[type='checkbox']");
            checkElement.addEventListener("change", this._handleChangeOnElement.bind(this), false);

            this._element.setAttribute("role", "checkbox");

            var labelElement = this._element.querySelector("label");

            if (labelElement && labelElement.id) {
                this._element.setAttribute("aria-labelledby", labelElement.id);
            }
        };
        Object.defineProperty(CheckBox.prototype, "element", {
            get: function () {
                return this._element;
            },
            enumerable: true,
            configurable: true
        });
        CheckBox.prototype._handleChangeOnElement = function (e) {
            var oldValue = this._checked;
            var checkElement = this._element.querySelector("input[type='checkbox']");
            this._checked = checkElement.checked;
            if (this._checked) {
                this._element.classList.add("xbdh-checked");
            } else {
                this._element.classList.remove("xbdh-checked");
            }
            this._element.setAttribute("aria-checked", this._checked);
            if (oldValue !== this._checked) {
                this.dispatchEvent("change", null);
            }
        };
        Object.defineProperty(CheckBox.prototype, "checked", {
            get: function () {
                return this._checked;
            },
            set: function (value) {
                var oldValue = this._checked;
                this._checked = value;
                var checkElement = this._element.querySelector("input[type='checkbox']");
                checkElement.checked = this._checked;
                if (this._checked) {
                    this._element.classList.add("xbdh-checked");
                } else {
                    this._element.classList.remove("xbdh-checked");
                }
                this._element.setAttribute("aria-checked", this._checked);
                if (oldValue !== this._checked) {
                    this.dispatchEvent("change", null);
                }
            },
            enumerable: true,
            configurable: true
        });
        CheckBox.prototype._handleKeyUp = function (e) {
            var keyCode = e.keyCode;
            if (keyCode === utils.Key.GamepadA ||
                keyCode === utils.Key.space ||
                keyCode === utils.Key.enter) {
                this.checked = !this.checked;
                e.preventDefault();
            }
        };
        // Public methods
        CheckBox.prototype.dispose = function () {
            if (this._disposed) {
                return;
            }
            this._disposed = true;
        };
        return CheckBox;
    })();
    WinJS.Class.mix(CheckBox, WinJS.Utilities.eventMixin);
    DevHome.UI = DevHome.UI || {};
    DevHome.UI.CheckBox = CheckBox;

    // Radio
    var Radio = (function () {
        // Namespace shortcuts

        function Radio(element, ariaLabelResourceKey) {
            // Private variables
            this._checked = false;
            this._disabled = false;
            this._element = element || document.createElement("div");
            this._element.setAttribute("role", "option");
            this._ariaLabelResourceKey = ariaLabelResourceKey || "";
            this._element.winControl = this;
            this._element.addEventListener("keyup", this._handleKeyUp.bind(this), false);

            var radioElement = this._element.querySelector("input[type='radio']");
            radioElement.addEventListener("change", this._handleChangeOnElement.bind(this), false);

            if (this._ariaLabelResourceKey) {
                var ariaLabel = `${DevHome.Utilities.Resources.getString(this._ariaLabelResourceKey).value}. ${DevHome.Utilities.Resources.getString("radioButton").value}`;
                this._element.setAttribute("aria-label", ariaLabel);
            }

        };
        Object.defineProperty(Radio.prototype, "element", {
            get: function () {
                return this._element;
            },
            enumerable: true,
            configurable: true
        });
        Radio.prototype._handleChangeOnElement = function (e) {
            var radioElement = this._element.querySelector("input[type='radio']");
            this._checked = radioElement.checked;
            this._disabled = radioElement.disabled;

            if (this._checked) {
                this._element.classList.add("xbdh-checked");
            } else {
                this._element.classList.remove("xbdh-checked");
            }

            if (this._disabled) {
                this._element.classList.add("xbdh-disabled");
            } else {
                this._element.classList.remove("xbdh-disabled");
            }

            this.dispatchEvent("change", null);
        };
        Object.defineProperty(Radio.prototype, "checked", {
            get: function () {
                // Force refresh incase value has been changed from underneath us.
                var radioElement = this._element.querySelector("input[type='radio']");
                this._checked = radioElement.checked;
                return this._checked;
            },
            set: function (value) {
                this._checked = value;
                var radioElement = this._element.querySelector("input[type='radio']");
                radioElement.checked = this._checked;
                if (this._checked) {
                    this._element.classList.add("xbdh-checked");
                } else {
                    this._element.classList.remove("xbdh-checked");
                }
                this._element.setAttribute("aria-selected", this._checked);
                this.dispatchEvent("change", null);
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(Radio.prototype, "disabled", {
            get: function () {
                // Force refresh incase value has been changed from underneath us.
                var radioElement = this._element.querySelector("input[type='radio']");
                this._disabled = radioElement.disabled;
                return this._disabled;
            },
            set: function (value) {
                this._disabled = value;
                var radioElement = this._element.querySelector("input[type='radio']");
                radioElement.disabled = this._disabled;
                if (this._disabled) {
                    this._element.classList.add("xbdh-disabled");
                } else {
                    this._element.classList.remove("xbdh-disabled");
                }
            },
            enumerable: true,
            configurable: true
        });
        Radio.prototype._handleKeyUp = function (e) {
            var keyCode = e.keyCode;
            if (keyCode === utils.Key.GamepadA ||
                keyCode === utils.Key.space ||
                keyCode === utils.Key.enter) {
                this.checked = !this.checked;
            }
        };
        // Public methods
        Radio.prototype.dispose = function () {
            if (this._disposed) {
                return;
            }
            this._disposed = true;
        };
        return Radio;
    })();
    WinJS.Class.mix(Radio, WinJS.Utilities.eventMixin);
    DevHome.UI = DevHome.UI || {};
    DevHome.UI.Radio = Radio;

    // ComboBox
    var ComboBox = (function () {
        // Namespace shortcuts
        var keys = DevHome.Utilities.Key;

        // Last option is the default
        function ComboBox(element, options, ariaLabelResourceKey, ariaLabelText) {
            // Private variables
            this._disabled = false;
            this._domInitialized = false;
            this._element = element || document.createElement("div");
            this._element.setAttribute("role", "combobox");
            this._element.setAttribute("aria-expanded", false);
            this._ariaLabelResourceKey = ariaLabelResourceKey || "";
            this._ariaLabelText = ariaLabelText || "";
            this._handleKeyDownBound = this._handleKeyDown.bind(this);
            this._handleButtonKeyUpBound = this._handleButtonKeyUp.bind(this);
            this._handleOverlayKeyUpBound = this._handleOverlayKeyUp.bind(this);
            this._handleClickBound = this._handleClick.bind(this);
            this._handleOverlayClickBound = this._handleOverlayClick.bind(this);
            this._handleDetectOutsideClickBound = this._handleDetectOutsideClick.bind(this);
            this._label = "";
            this._open = false;
            this._options = [];
            this._allowZeroAsValidValue = false;
            this._overlay = null;
            this._preInitializedHtml = true;
            this._previousFocus = null;
            this._previousFocusRoot = null;
            this._ariaLabel = null;
            this._element.winControl = this;
            this._workspaceManager = utils._Internal.workspaceManager;

            var comboboxToggle = this._element.querySelector(".xbdh-combobox-togglevisual");

            if (comboboxToggle) {
                comboboxToggle.setAttribute("aria-hidden", true);
            }

            if (this._ariaLabelResourceKey) {
                this._ariaLabel = DevHome.Utilities.Resources.getString(this._ariaLabelResourceKey);
            }

            if (options) {
                this._options = options.options || [];
                this._allowZeroAsValidValue = options.allowZeroAsValidValue || false;
                this._value = options.value;

                // Translate value to label
                if (this._options && typeof this._value != "undefined") {
                    const valueOption = this._options.find(({ value }) => value === this._value);

                    if (valueOption) {
                        if (valueOption.label) {
                            this._label = DevHome.Utilities.Resources.getString(valueOption.label).value;
                        }
                    }
                    else {
                        // legacy fallback 
                        this._label = this._value;
                    }
                }

                if (!this._label) {
                    this._label = "";
                }

                this.ariaLabel = "";

                if (this._label) {
                    this.ariaLabel = this._label;
                    var comboBox = this._element.querySelector(".xbdh-combobox-label");
                    if (comboBox) {
                        comboBox.textContent = this._label;
                    }
                }
            }

            this._setUpElement();

            // Events
            this._element.addEventListener("keyup", this._handleButtonKeyUpBound, false);
            this._element.addEventListener("click", this._handleClickBound, false);
        };
        Object.defineProperty(ComboBox.prototype, "disabled", {
            get: function () {
                return this._disabled;
            },
            set: function (value) {
                this._disabled = value;
                if (this._disabled) {
                    this._element.classList.add("xbdh-disabled");
                    this._element.tabIndex = -1;
                } else {
                    this._element.classList.remove("xbdh-disabled");
                    this._element.tabIndex = 0;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ComboBox.prototype, "element", {
            get: function () {
                return this._element;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ComboBox.prototype, "options", {
            get: function () {
                return this._options;
            },
            set: function (value) {
                this._options = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ComboBox.prototype, "label", {
            get: function () {
                return this._label;
            },
            set: function (value) {
                this._label = DevHome.Utilities.Resources.getString(value).value;
                var comboBox = this._element.querySelector(".xbdh-combobox-label");
                if (comboBox) {
                    comboBox.textContent = this._label;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ComboBox.prototype, "ariaLabel", {
            get: function () {
                return this._getAriaLabel();
            },
            set: function (value) {
                var composedAriaLabel = "";
                var ariaLabelValue = this._getAriaLabel();

                if (ariaLabelValue && value) {
                    composedAriaLabel = `${ariaLabelValue}, ${value}`;
                }
                else {
                    if (ariaLabelValue) {
                        composedAriaLabel = ariaLabelValue;
                    }

                    if (value) {
                        composedAriaLabel = value;
                    }
                }

                this._element.setAttribute("aria-label", composedAriaLabel);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ComboBox.prototype, "value", {
            get: function () {
                return this._value;
            },
            set: function (value) {
                this._value = value;

                // Translate value to label
                if (this._options && (this._value || this._allowZeroAsValidValue)) {
                    const valueOption = this._options.find(({ value }) => value === this._value);

                    if (valueOption) {
                        if (valueOption.label) {
                            this.label = valueOption.label;
                            this.ariaLabel = this.label;
                        }
                    }
                    else {
                        // legacy fallback 
                        this.label = this._value;
                        this.ariaLabel = this.label;
                    }
                }
            },
            enumerable: true,
            configurable: true
        });
        // Private methods
        ComboBox.prototype._getAriaLabel = function () {

            if (this._ariaLabel) {
                return this._ariaLabel.value;
            }

            if (this._ariaLabelText) {
                return this._ariaLabelText;
            }

            return null;
        };
        ComboBox.prototype._findPosition = function () {
            var buttonBoundingRect = this._element.getBoundingClientRect();
            var overlayBoundingrect = this._overlay.getBoundingClientRect();

            var top = Math.floor(buttonBoundingRect.top + (buttonBoundingRect.height / 2) - (overlayBoundingrect.height / 2));
            var left = buttonBoundingRect.left;

            this._overlay.style.top = top + "px";
            this._overlay.style.left = left + "px";

            if (buttonBoundingRect.width > overlayBoundingrect.width) {
                this._overlay.style.width = buttonBoundingRect.width + "px";
            }
        };
        ComboBox.prototype._handleKeyDown = function (e) {
            var keyCode = e.keyCode;
            var currentFocus = e.srcElement;
            var currentFocusIndex = currentFocus.xbdhGridFocusIndex;
            var nextFocus = null;
            if (keyCode === keys.upArrow ||
                keyCode === keys.GamepadDPadUp ||
                keyCode === keys.GamepadLeftThumbstickUp) {
                if (currentFocusIndex > 0) {
                    nextFocus = currentFocus.previousElementSibling;
                }
            } else if (keyCode === keys.downArrow ||
                keyCode === keys.GamepadDPadDown ||
                keyCode === keys.GamepadLeftThumbstickDown) {
                if (currentFocusIndex < this._options.length) {
                    nextFocus = currentFocus.nextElementSibling;
                }
            }
            if (nextFocus) {
                nextFocus.focus();
            }
        };
        ComboBox.prototype._handleClick = function (e) {
            this.show();
        };
        ComboBox.prototype._handleButtonKeyUp = function (e) {
            switch (e.keyCode) {
                case keys.escape:
                case keys.GamepadB:
                    this.hide();
                    break;
                case keys.enter:
                case keys.space:
                    this.show();
                    break;
                default:
                    // No-op
                    break;
            }
        };
        ComboBox.prototype._handleOverlayClick = function (e) {
            var newValue = e.srcElement.xbdhValue;
            this.value = newValue;
            this.hide();
            this.dispatchEvent("change", null);
        };
        ComboBox.prototype._handleDetectOutsideClick = function (e) {
            if (!this._element.contains(e.target) && !this._overlay.contains(e.target)) {
                this.hide();
            }
        };
        ComboBox.prototype._handleOverlayKeyUp = function (e) {
            switch (e.keyCode) {
                case keys.escape:
                case keys.GamepadB:
                    this.hide();
                    break;
                case keys.enter:
                case keys.space:
                    var newValue = e.srcElement.xbdhValue;
                    this.value = newValue;
                    this.hide();
                    this.dispatchEvent("change", null);
                    break;
                default:
                    // No-op
                    break;
            }
        };
        ComboBox.prototype._setUpElement = function () {
            if (!this._preInitializedHtml) {
                this._element.classList.add("win-focusable");
                this._element.tabIndex = 0;
            }
        };
        ComboBox.prototype._setUpMenuBeforeShowing = function () {
            this._overlay = document.createElement("div");
            this._overlay.winControl = this;

            var innerHtml = "";
            var visibleOptions = this._options.filter(({ hidden }) => hidden !== true);
            for (var i = 0, len = visibleOptions.length; i < len; i++) {
                var option = visibleOptions[i];
                var label = "";
                var localizedLabel = DevHome.Utilities.Resources.getString(option.label);
                var isSelectedOption = false;
                if (!label.empty) {
                    label = localizedLabel.value;
                } else {
                    label = option.label;
                }

                if (this._value === option.value) {
                    isSelectedOption = true;
                }
                var optionClass = isSelectedOption ? "xbdh-combobox-option xbdh-combobox-option-selected" : "xbdh-combobox-option";
                innerHtml += `<div class="${optionClass}" tabIndex="0" role="option" aria-selected="${isSelectedOption}"><div class="xbdh-combobox-option-label">${label}</div></div>`;
            }
            this._overlay.innerHTML = innerHtml;

            // Add properties to each option to be used for focus movement
            var options = this._overlay.querySelectorAll(".xbdh-combobox-option");
            for (i = 0, len = options.length; i < len; i++) {
                option = options[i];
                option.xbdhGridFocusIndex = i;
                option.xbdhValue = visibleOptions[i].value;

                var innerLabel = option.querySelector(".xbdh-combobox-option-label");

                if (innerLabel) {
                    innerLabel.xbdhGridFocusIndex = i;
                    innerLabel.xbdhValue = visibleOptions[i].value;
                }
            }

            // Default behavior is to dismiss the context menu after an option is selected.
            this._overlay.addEventListener("keydown", this._handleKeyDownBound, false);
            this._overlay.addEventListener("keyup", this._handleOverlayKeyUpBound, false);
            this._overlay.addEventListener("click", this._handleOverlayClickBound, false);

            var localizedComboboxOptions = DevHome.Utilities.Resources.getString("comboboxOptions");
            // Place the menu at the top of the DOM tree
            document.body.appendChild(this._overlay);
            this._overlay.classList.add("xbdh-combobox-overlay");
            this._overlay.classList.add("xbdh-list");
            this._overlay.classList.add("win-overlay");
            this._overlay.setAttribute("role", "listbox");
            this._overlay.setAttribute("aria-label", localizedComboboxOptions.value);
        };
        ComboBox.prototype._tearDownMenuAfterHide = function () {
            document.body.removeChild(this._overlay);
        };
        // Public methods
        ComboBox.prototype.dispose = function () {
            if (this._disposed) {
                return;
            }
            this._disposed = true;

            if (this._element &&
                this._element.parentNode) {
                this._element.parentNode.removeChild(this._element);
            }
        };
        ComboBox.prototype.hide = function () {
            if (!this._open) {
                return;
            }

            var wasCancelled = this.dispatchEvent("beforehide", null);
            if (wasCancelled) {
                return;
            }

            this._tearDownMenuAfterHide();

            // Ensure _previousFocusRoot is visible, otherwise use document body
            if (this._previousFocusRoot && this._previousFocusRoot.offsetParent !== null) {
                TVJS.DirectionalNavigation.focusRoot = this._previousFocusRoot;
                TVJS.DirectionalNavigation.enabled = true;
            }
            else {
                TVJS.DirectionalNavigation.focusRoot = document.body;
                TVJS.DirectionalNavigation.enabled = true;
            }

            if (this._previousFocus) {
                this._previousFocus.focus();
            }

            this._element.setAttribute("aria-expanded", false);
            this._open = false;
            document.removeEventListener('click', this._handleDetectOutsideClickBound);
        };
        ComboBox.prototype.show = function () {
            if (this._open ||
                utils._inFirstRun) {
                return;
            }

            var wasCancelled = this.dispatchEvent("beforeshow", null);
            if (wasCancelled) {
                return;
            }

            var activeElement = document.activeElement;
            if (!activeElement) {
                return;
            }

            // Set context, this code must run before _findMenu, which is
            // dependent on context no being null.
            this._context = activeElement;
            activeElement.classList.add("xbdh-active");

            this._setUpMenuBeforeShowing();
            this._findPosition();

            this._previousFocus = document.activeElement;
            this._previousFocusRoot = TVJS.DirectionalNavigation.focusRoot;

            // Turn off automatic focus
            TVJS.DirectionalNavigation.enabled = false;

            // Set default focus
            var initialFocusElement = null;
            var options = this._overlay.querySelectorAll(".xbdh-combobox-option");
            for (var i = 0, len = options.length; i < len; i++) {
                if (this._value === options[i].xbdhValue) {
                    initialFocusElement = options[i];
                    break;
                }
            }
            if (!initialFocusElement) {
                initialFocusElement = this._overlay.querySelector(".xbdh-combobox-option");
            }
            if (initialFocusElement) {
                initialFocusElement.focus();
            }

            this._element.setAttribute("aria-expanded", true);
            this._open = true;
            document.addEventListener('click', this._handleDetectOutsideClickBound, false);
        };
        return ComboBox;
    })();
    WinJS.Class.mix(ComboBox, WinJS.Utilities.eventMixin);
    DevHome.UI = DevHome.UI || {};
    DevHome.UI.ComboBox = ComboBox;

    // Context Menu
    var ContextMenu = (function () {
        // Namespace shortcuts
        var keys = DevHome.Utilities.Key;

        function ContextMenu(element) {
            // Private variables
            this._context = null;
            this._domInitialized = false;
            this._element = element || document.createElement("div");
            this._handleKeydownBound = this._handleKeydown.bind(this);
            this._handleClickBound = this._handleClick.bind(this);
            this._handleContextMenuBound = this._handleContextMenu.bind(this);
            this._handleDismissClickBound = this._handleDismissClick.bind(this);
            this._open = false;
            this._previousFocus = null;
            this._previousFocusRoot = null;
            this._element.winControl = this;
            this._workspaceManager = utils._Internal.workspaceManager;

            // Events
            document.addEventListener("keydown", this._handleKeydownBound, false);
            document.addEventListener("contextmenu", this._handleContextMenuBound, false);
            this._element.addEventListener("click", this._handleClickBound, false);
        };
        Object.defineProperty(ContextMenu.prototype, "context", {
            get: function () {
                return this._context;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ContextMenu.prototype, "element", {
            get: function () {
                return this._element;
            },
            enumerable: true,
            configurable: true
        });
        // Private methods
        ContextMenu.prototype._findMenu = function () {
            var key = DevHome.Utilities.Key;
            var resources = DevHome.Utilities.Resources;
            var contextMenuElement = null;

            // Walk up the DOM tree, searching for a context menu
            var currentNode = document.activeElement;
            var contextMenuSelector = "";
            do {
                contextMenuSelector = currentNode.getAttribute("data-xbdh-contextmenu");
                if (contextMenuSelector ||
                    contextMenuSelector === "") {
                    break;
                }
                currentNode = currentNode.parentNode;
            } while (currentNode && currentNode !== document);

            // If we couldn't find a context menu, but are focused a window title, show the
            // context menu for a tool window.
            if (!contextMenuSelector &&
                document.activeElement.classList.contains(classNames._cssWindowTitleClassName)) {
                // Create the context menu for a window
                var windowContextMenuEl = document.createElement("div");
                windowContextMenuEl.id = "xbdh-window-contextmenu";
                var windowName = this._context.textContent;
                windowContextMenuEl.innerHTML =
                    '<button id="xbdh-window-contextmenu-move">' + resources.getString("commandMoveTool").value + '</button>' +
                    '<button id="xbdh-window-contextmenu-resize">' + resources.getString("commandResizeTool").value + '</button>' +
                    '<button id="xbdh-window-contextmenu-delete">' + resources.getString("commandRemoveTool").value + '</button>';

                // Hook up commands
                var moveCommand = windowContextMenuEl.querySelector("#xbdh-window-contextmenu-move");
                var resizeCommand = windowContextMenuEl.querySelector("#xbdh-window-contextmenu-resize");
                var deleteCommand = windowContextMenuEl.querySelector("#xbdh-window-contextmenu-delete");

                moveCommand.addEventListener("keyup", function (ev) {
                    if (ev.keyCode === key.GamepadA ||
                        ev.keyCode === key.space ||
                        ev.keyCode === key.enter) {
                        ev.stopPropagation();
                        var toolWindow = this._context.parentNode;
                        this._workspaceManager._enterCustomizationMode("move", toolWindow);
                        this.hide();
                    } 
                }.bind(this), false);
                resizeCommand.addEventListener("keyup", function (ev) {
                    if (ev.keyCode === key.GamepadA ||
                        ev.keyCode === key.space ||
                        ev.keyCode === key.enter) {
                        ev.stopPropagation();
                        var toolWindow = this._context.parentNode;
                        this._workspaceManager._enterCustomizationMode("resize", toolWindow);
                        this.hide();
                    }
                }.bind(this), false);
                deleteCommand.addEventListener("keyup", function (ev) {
                    if (ev.keyCode === key.GamepadA ||
                        ev.keyCode === key.space ||
                        ev.keyCode === key.enter) {
                        ev.stopPropagation();
                        var toolWindow = this._context.parentNode;
                        this._workspaceManager._deleteToolAsync(toolWindow).then(function () { }, function () { });
                        this.hide();
                    }
                }.bind(this), false);

                contextMenuElement = windowContextMenuEl;
            } else {
                if (contextMenuSelector) {
                    contextMenuElement = document.body.querySelector(contextMenuSelector);
                }
            }

            if (contextMenuElement) {
                contextMenuElement.winControl = this;
            }

            return contextMenuElement;
        };
        ContextMenu.prototype._findPosition = function (anchor) {
            var overlayRect = this._element.getBoundingClientRect();
            var anchorRect = anchor.getBoundingClientRect();

            var top = anchorRect.top;
            var left = anchorRect.right;

            // We may need to adjust the position if the flyout is clipped on the right or bottom
            setImmediate(function () {
                var newOverlayRect = this._element.getBoundingClientRect();
                var rightEdgeOfTitleSafe = document.body.offsetWidth - 64;
                if (newOverlayRect.right > rightEdgeOfTitleSafe) {
                    this._element.style.left = Math.floor(left - (newOverlayRect.right - rightEdgeOfTitleSafe)) + "px";
                }
                var bottomEdgeOfTitleSafe = document.body.offsetHeight - 64;
                if (newOverlayRect.bottom > bottomEdgeOfTitleSafe) {
                    this._element.style.top = Math.floor(top - (newOverlayRect.bottom - bottomEdgeOfTitleSafe)) + "px";
                }
            }.bind(this));

            this._element.style.top = top + "px";
            this._element.style.left = left + "px";
        };
        ContextMenu.prototype._handleClick = function () {
            setImmediate(function () {
                if (this._disposed) {
                    return;
                }
                this.hide();
            }.bind(this));
        };
        ContextMenu.prototype._handleContextMenu = function (e) {
            e.preventDefault();
            // Focus the right-clicked element (or nearest focusable ancestor) so
            // _findMenu can walk up from document.activeElement as usual.
            var target = e.target;
            while (target && target !== document) {
                if (target.tabIndex >= 0 || target.classList.contains("win-focusable")) {
                    target.focus();
                    break;
                }
                target = target.parentNode;
            }
            if (document.activeElement && document.activeElement !== document.body) {
                this._toggleMenu();
            }
        };
        ContextMenu.prototype._handleDismissClick = function (e) {
            // Close the menu if the click is outside of it
            if (this._open && this._element && !this._element.contains(e.target)) {
                this.hide();
            }
        };
        ContextMenu.prototype._handleKeydown = function (e) {
            switch (e.keyCode) {
                case 93: // The context menu button
                case keys.GamepadView:
                    this._toggleMenu();
                    break;
                case keys.escape:
                case keys.GamepadB:
                    this.hide();
                    break;
                default:
                    // No-op
                    break;
            }
        };
        ContextMenu.prototype._setUpMenuBeforeShowing = function (menuElement) {
            if (menuElement) {
                // We need to put a placeholder div in place of the HTML for the context menu so we don't disrupt layout
                // However, if have the special case of the context menu for the Window title, we don't need to create
                // a placeholder.
                if (menuElement.id !== "xbdh-window-contextmenu") {
                    var placeHolder = document.createElement("div");
                    placeHolder.id = "xbdh-contextmenu-placeholder";
                    menuElement.parentNode.insertBefore(placeHolder, menuElement);
                }

                // Default behavior is to dismiss the context menu after an option is selected.
                menuElement.addEventListener("click", this._handleClickBound, false);

                // Place the menu at the top of the DOM tree
                document.body.appendChild(menuElement);
                menuElement.classList.add("xbdh-contextmenu");
                menuElement.classList.add("xbdh-list");
                menuElement.classList.add("win-overlay");
                menuElement.classList.remove(classNames._cssHiddenClassName);
                this._element = menuElement;
            }
        };
        ContextMenu.prototype._tearDownMenuAfterHide = function () {
            var menuElement = document.body.querySelector(".xbdh-contextmenu");
            if (menuElement) {
                var placeHolder = document.getElementById("xbdh-contextmenu-placeholder");
                menuElement.classList.remove("xbdh-contextmenu");
                menuElement.classList.add(classNames._cssHiddenClassName);

                menuElement.removeEventListener("click", this._handleClickBound);

                if (placeHolder) {
                    placeHolder.parentNode.insertBefore(menuElement, placeHolder);
                    placeHolder.parentNode.removeChild(placeHolder);
                } else if (menuElement.id === "xbdh-window-contextmenu") {
                    // If there's no placeholder, we might be in the case where the context menu belongs to the window title.
                    // If that is the case, then remove the dynamically created HTML for the window title context menu.
                    menuElement.parentNode.removeChild(menuElement);
                }
            }
        };
        ContextMenu.prototype._toggleMenu = function () {
            if (this._open) {
                this.hide();
            } else {
                this.show();
            }
        };
        // Public methods
        ContextMenu.prototype.dispose = function () {
            if (this._disposed) {
                return;
            }
            this._disposed = true;

            document.removeEventListener("keydown", this._handleKeydownBound);
            document.removeEventListener("contextmenu", this._handleContextMenuBound);

            if (this._element &&
                this._element.parentNode) {
                this._element.parentNode.removeChild(this._element);
            }
        };
        ContextMenu.prototype.hide = function () {
            if (!this._open) {
                return;
            }

            var wasCancelled = this.dispatchEvent("beforehide", null);
            if (wasCancelled) {
                return;
            }

            DevHome.Utilities.hideDarkBackground();
            this._tearDownMenuAfterHide();

            if (this._previousFocusRoot) {
                TVJS.DirectionalNavigation.focusRoot = this._previousFocusRoot;
                TVJS.DirectionalNavigation.enabled = true;
            }
            if (this._previousFocus) {
                this._previousFocus.focus();
            }

            // Clear context
            if (this._context) {
                this._context.classList.remove("xbdh-active");
            }
            this._context = null;
            this.dispatchEvent("afterhide", null);
            this._open = false;

            // Stop listening for dismiss clicks
            document.removeEventListener("click", this._handleDismissClickBound, true);
        };
        ContextMenu.prototype.show = function () {
            if (this._open ||
                utils._inFirstRun) {
                return;
            }

            var wasCancelled = this.dispatchEvent("beforeshow", null);
            if (wasCancelled) {
                return;
            }

            var activeElement = document.activeElement;
            if (!activeElement) {
                return;
            }

            // Set context, this code must run before _findMenu, which is
            // dependent on context no being null.
            this._context = activeElement;
            activeElement.classList.add("xbdh-active");

            // Find the context menu to show
            var menuElement = this._findMenu();
            // The developer can tell us explicitly they don't want a context menu on an element in which case
            // we shouldn't attempt to show one. They do this by setting the data-xbdh-contextmenu attribute to empty
            if (!menuElement) {
                return;
            }

            DevHome.Utilities.showDarkBackground();
            this._setUpMenuBeforeShowing(menuElement);
            this._findPosition(activeElement);

            // Set default focus
            this._previousFocus = document.activeElement;
            this._previousFocusRoot = TVJS.DirectionalNavigation.focusRoot;
            TVJS.DirectionalNavigation.focusRoot = this._element;
            TVJS.DirectionalNavigation.enabled = true;
            var initialFocusElementCandidates = this._element.querySelectorAll(".win-focusable, BUTTON:not([disabled]), BUTTON:not([tabIndex='-1']), INPUT:not([disabled]), INPUT:not([tabIndex='-1']), TEXTAREA:not([disabled]), TEXTAREA:not([tabIndex='-1']), SELECT:not([disabled]), SELECT:not([tabIndex='-1']), A:not([disabled]), A:not([tabIndex='-1'])");
            for (var i = 0, len = initialFocusElementCandidates.length; i < len; i++) {
                if (initialFocusElementCandidates[i] && !initialFocusElementCandidates[i].disabled) {
                    initialFocusElementCandidates[i].focus();
                    break;
                }
            }

            this.dispatchEvent("aftershow", null);
            this._open = true;

            // Listen for clicks outside the menu to dismiss it
            document.addEventListener("click", this._handleDismissClickBound, true);
        };
        return ContextMenu;
    })();
    WinJS.Class.mix(ContextMenu, WinJS.Utilities.eventMixin);
    DevHome.UI = DevHome.UI || {};
    DevHome.UI.ContextMenu = ContextMenu;

    // Menu
    var _Menu = (function () {
        // Namespace shortcuts
        var xbdhUtils = DevHome.Utilities;
        var keys = xbdhUtils.Key;

        function _Menu(element, options) {
            // Private variables
            this._domInitialized = false;
            this._element = null;
            this._handleNoNextFocusFoundBind = this._handleNoNextFocusFound.bind(this);
            this._handleKeyDownBound = this._handleKeyDown.bind(this);
            this._handleKeyUpBound = this._handleKeyUp.bind(this);
            this._open = false;

            // Events
            document.addEventListener("keydown", this._handleKeyDownBound, false);
            document.addEventListener("keyup", this._handleKeyUpBound, false);

            // Populate the menu options from settings
            if (options &&
                options.commands) {
                this._menuOptions = options.commands;
            }
        };
        Object.defineProperty(_Menu.prototype, "element", {
            get: function () {
                return this._element;
            },
            enumerable: true,
            configurable: true
        });
        // Private methods
        _Menu.prototype._createDom = function () {
            this._element = document.createElement("div");
            this._element.winControl = this;
            this._element.classList.add("xbdh-menu");
            this._element.classList.add("win-overlay");
            var htmlString =
                '<div class="xbdh-shell-header-left">' +
                '  <div class="xbdh-shell-title">' +
                '    <span id="xbdh-shell-title-devhome" class="xbdh-shell-title-devhome">' + DevHome.Utilities.Resources.getString("appTitle").value + '</span>' +
                '  </div>' +
                '</div>' +
                '<div class="xbdh-menu-options-0" role="menubar" aria-label="' + DevHome.Utilities.Resources.getString("appTitle").value + '">';

            // Put all the 1st menu options in the menu
            var level1Options = this._menuOptions;
            if (level1Options) {
                for (var i = 0, len = level1Options.length; i < len; i++) {
                    var name = "";
                    var option = level1Options[i];
                    if (option.nameResourceId) {
                        name = DevHome.Utilities.Resources.getString(option.nameResourceId).value;
                    } else if (option.name) {
                        name = option.name;
                    }
                    if (i === 0) {
                        var ariaProperties = "";
                        if (this._menuOptions[0].children) {
                            ariaProperties = 'aria-haspopup="true" aria-expanded="true"';
                        }
                        htmlString += '<div tabindex="0" role="menuitem" ' + ariaProperties + ' class="xbdh-menu-option xbdh-selected xbdh-gridfocus-0-' + i + '">' + name + '</div>';
                    } else {
                        htmlString += '<div tabindex="0" role="menuitem" class="xbdh-menu-option xbdh-gridfocus-0-' + i + '">' + name + '</div>';
                    }
                }
                var ariaMenu1Properties = "";
                if (this._menuOptions[0].children) {
                    ariaMenu1Properties = `role="menu" aria-label="${DevHome.Utilities.Resources.getString(this._menuOptions[0].nameResourceId).value}"`;
                }
                htmlString +=
                    '   </div>' +
                    '   <div class="xbdh-menu-options-1" ' + ariaMenu1Properties + ' >';

                // For the 1st time the menu is open, we optimistically construct the 1st 2 levels of navigation.
                if (this._menuOptions[0] &&
                    this._menuOptions[0].children) {
                    var level2Options = this._menuOptions[0].children;
                    for (var i = 0, len = level2Options.length; i < len; i++) {
                        var name = "";
                        var option = level2Options[i];
                        if (option.nameResourceId) {
                            name = DevHome.Utilities.Resources.getString(option.nameResourceId).value;
                        } else if (option.name) {
                            name = option.name;
                        }
                        htmlString += '<div tabindex="0" role="menuitem" class="xbdh-menu-option xbdh-gridfocus-1-' + i + '">' + name + '</div>';
                    }
                    htmlString += '   </div>';
                }
            }
            this._element.innerHTML = htmlString;

            // Attach click handlers
            var menuOptions0 = this._element.querySelectorAll(".xbdh-menu-options-0 .xbdh-menu-option");
            for (var i = 0, len = menuOptions0.length; i < len; i++) {
                var currentMenuOption = menuOptions0[i];
                currentMenuOption.optionLevel = 0;
                currentMenuOption.optionIndex = i;
                if (level1Options[i].children) {
                    currentMenuOption.childOptions = level1Options[i].children;
                    currentMenuOption.childOptionsInitialized = false;
                }
                if (level1Options[i]) {
                    currentMenuOption.action = level1Options[i].action;
                }
                currentMenuOption.addEventListener("focus", this._handleMenuOptionFocus.bind(this), false);
                currentMenuOption.addEventListener("keyup", this._handleMenuOptionKeyUp.bind(this), false);
                currentMenuOption.addEventListener("click", this._handleMenuOptionClick.bind(this), false);
            };

            var menuOptions1 = this._element.querySelectorAll(".xbdh-menu-options-1 .xbdh-menu-option");
            for (var i = 0, len = menuOptions1.length; i < len; i++) {
                var currentMenuOption = menuOptions1[i];
                currentMenuOption.optionLevel = 1;
                currentMenuOption.optionIndex = i;
                if (level2Options[i].children) {
                    currentMenuOption.childOptions = level2Options[i].children;
                    currentMenuOption.childOptionsInitialized = false;
                }
                if (level2Options[i]) {
                    currentMenuOption.action = level2Options[i].action;
                }
                currentMenuOption.addEventListener("focus", this._handleMenuOptionFocus.bind(this), false);
                currentMenuOption.addEventListener("keyup", this._handleMenuOptionKeyUp.bind(this), false);
                currentMenuOption.addEventListener("click", this._handleMenuOptionClick.bind(this), false);
            };
            document.body.appendChild(this._element);
            this._domInitialized = true;
        };
        _Menu.prototype._showSubMenuOptions = function (srcMenuOptionElement) {
            var menuLevel = srcMenuOptionElement.optionLevel + 1;
            var optionsData = srcMenuOptionElement.childOptions;

            // Remove the old options
            var oldSubMenuOptions = this._element.querySelectorAll(".xbdh-menu-options-" + menuLevel + " .xbdh-menu-option");
            for (var i = 0, len = oldSubMenuOptions.length; i < len; i++) {
                oldSubMenuOptions[i].parentNode.removeChild(oldSubMenuOptions[i]);
            }

            // Add the new options to the DOM
            var subMenuOptionsContainer = this._element.querySelector(".xbdh-menu-options-1");
            if (!subMenuOptionsContainer) {
                subMenuOptionsContainer = document.createElement("div");
                subMenuOptionsContainer.classList.add("xbdh-menu-options-1");
                subMenuOptionsContainer.setAttribute("role", "menu");
                subMenuOptionsContainer.setAttribute("aria-label", srcMenuOptionElement.innerText);
                this._element.appendChild(subMenuOptionsContainer);
            }
            var htmlString = "";
            for (var i = 0, len = optionsData.length; i < len; i++) {
                var name = "";
                var option = optionsData[i];
                if (option.nameResourceId) {
                    name = DevHome.Utilities.Resources.getString(option.nameResourceId).value;
                } else if (option.name) {
                    name = option.name;
                }
                htmlString += '<div tabindex="0" role="menuitem" class="xbdh-menu-option xbdh-gridfocus-' + menuLevel + '-' + i + '">' + name + '</div>';
            }
            htmlString += '</div>';

            subMenuOptionsContainer.innerHTML = htmlString;

            // Hook up event handlers
            var menuOptions = this._element.querySelectorAll(".xbdh-menu-options-" + menuLevel + " .xbdh-menu-option");
            for (var i = 0, len = menuOptions.length; i < len; i++) {
                var currentMenuOption = menuOptions[i];
                currentMenuOption.optionLevel = menuLevel;
                currentMenuOption.optionIndex = i;
                if (optionsData[i]) {
                    currentMenuOption.action = optionsData[i].action;
                }
                currentMenuOption.addEventListener("focus", this._handleMenuOptionFocus.bind(this), false);
                currentMenuOption.addEventListener("keyup", this._handleMenuOptionKeyUp.bind(this), false);
                currentMenuOption.addEventListener("click", this._handleMenuOptionClick.bind(this), false);
            };

            // Remove old classes that should be there
            subMenuOptionsContainer.classList.remove("xbdh-window");
            subMenuOptionsContainer.classList.remove("pagecontrol");
        };
        _Menu.prototype._handleNoNextFocusFound = function (e) {
            // This function handles the specific case of navigating left from a tool window to a panel of menu options
            var focusRoot = TVJS.DirectionalNavigation.focusRoot;
            if (focusRoot &&
                TVJS.DirectionalNavigation.focusRoot.classList.contains(classNames._cssWindowClassName)) {
                var nextFocusTarget = e.detail.nextFocusElement;
                var keyCode = e.detail.keyCode;
                var key = DevHome.Utilities.Key;
                if (!nextFocusTarget &&
                    (keyCode === key.leftArrow ||
                        keyCode === key.GamepadDPadLeft ||
                        keyCode === key.GamepadLeftThumbstickLeft)) {
                    var selectedMenuOptions = this._element.querySelectorAll(".xbdh-selected");
                    var nextFocus = selectedMenuOptions[selectedMenuOptions.length - 1];
                    if (nextFocus) {
                        nextFocus.focus();
                        DevHome.Utilities._focusDisabled = true;
                        this._alreadyMovedFocus = true;
                    }
                }
            }
        };
        _Menu.prototype._handleKeyDown = function (e) {
            var key = DevHome.Utilities.Key;
            switch (e.keyCode) {
                case key.leftArrow:
                case key.rightArrow:
                case key.downArrow:
                case key.upArrow:
                case key.GamepadDPadDown:
                case key.GamepadDPadLeft:
                case key.GamepadDPadRight:
                case key.GamepadDPadUp:
                case key.GamepadLeftThumbstickDown:
                case key.GamepadLeftThumbstickLeft:
                case key.GamepadLeftThumbstickRight:
                case key.GamepadLeftThumbstickUp:
                    if (this._open) {
                        this._moveFocus(e.keyCode);
                    }
                    break;
                default:
                    // No-op
                    break;
            }
        };
        _Menu.prototype._handleKeyUp = function (e) {
            var key = DevHome.Utilities.Key;
            switch (e.keyCode) {
                case key.home:
                case keys.GamepadMenu:
                    this._toggleMenu();
                    break;
                case keys.escape:
                case keys.GamepadB:
                    this.hide();
                    e.stopPropagation();
                    e.preventDefault();
                    break;
                default:
                    // No-op
                    break;
            }
        };
        _Menu.prototype._handleMenuOptionFocus = function (e) {
            var fromCommand = e.srcElement;
            var activeCommandIndex = fromCommand.optionIndex;
            var commands = fromCommand.parentNode.querySelectorAll(".xbdh-menu-option");
            for (var i = 0, len = commands.length; i < len; i++) {
                if (i === activeCommandIndex) {
                    commands[i].classList.add("xbdh-selected");
                } else {
                    commands[i].classList.remove("xbdh-selected");
                }
            }

            // If there's a menu panel that's more than one level away from the focused command,
            // we need to remove it.
            var granChildMenuPanel = this.element.querySelector(".xbdh-menu-options-" + (fromCommand.optionLevel + 2));
            if (granChildMenuPanel) {
                granChildMenuPanel.parentNode.removeChild(granChildMenuPanel);
            }

            // If we have children, then show another level of menu
            if (fromCommand.childOptions) {
                this._showSubMenuOptions(fromCommand);
            } else {
                // Clear any child panel elements that exist
                var childMenuPanel = this.element.querySelector(".xbdh-menu-options-" + (fromCommand.optionLevel + 1));
                if (childMenuPanel) {
                    childMenuPanel.parentNode.removeChild(childMenuPanel);
                }
            }
        };
        _Menu.prototype._executeCommand = function (command) {
            // If the menu action is to load a tool window
            if (command.action) {
                if (command.action[0] === '/') {
                    // Render the page in an overlay
                    var overlayDiv = document.createElement("div");
                    overlayDiv.classList.add("xbdh-menu-overlay");
                    overlayDiv.classList.add("xbdh-overlay");
                    document.body.appendChild(overlayDiv);
                    TVJS.DirectionalNavigation.focusRoot = overlayDiv;
                    TVJS.DirectionalNavigation.enabled = true;
                    var parentedCompleted = null;
                    var parentedPromise = new Promise(function (c) { parentedCompleted = c; });
                    WinJS.UI.Pages.render(command.action, overlayDiv, null, parentedPromise).then(function (control) {
                        var overlayElement = control.element;
                        parentedCompleted();
                        DevHome.Utilities.Resources.processAll(overlayElement);
                    }.bind(this));
                    overlayDiv.addEventListener("keyup", this._handleMenuOvelayKeyUp.bind(this), false);
                } else if (typeof command.action === 'function') {
                    command.action();
                }
            }
        };
        _Menu.prototype._handleMenuOptionKeyUp = function (e) {
            var keyCode = e.keyCode;
            if (keyCode === DevHome.Utilities.Key.GamepadA ||
                keyCode === DevHome.Utilities.Key.enter ||
                keyCode === DevHome.Utilities.Key.space) {
                e.preventDefault();
                this._executeCommand(e.srcElement);
            }
        };
        _Menu.prototype._handleMenuOptionClick = function (e) {
            this._executeCommand(e.srcElement);
        };
        _Menu.prototype._handleMenuOvelayKeyUp = function (e) {
            var keyCode = e.keyCode;
            if (keyCode === DevHome.Utilities.Key.GamepadB ||
                keyCode === DevHome.Utilities.Key.escape) {
                var overlay = document.querySelector(".xbdh-menu-overlay");
                overlay.parentNode.removeChild(overlay);
                if (this._previousFocusRoot) {
                    TVJS.DirectionalNavigation.focusRoot = this._previousFocusRoot;
                    TVJS.DirectionalNavigation.enabled = true;
                }
                if (this._previousFocus) {
                    this._previousFocus.focus();
                }
            }
        };
        _Menu.prototype._moveFocus = function (keyCode) {
            var xbdhUtils = DevHome.Utilities;
            var nextFocus = null;
            var activeElement = document.activeElement;
            // We don't want this code to run if we are not in the menu
            if (!this._element.contains(activeElement)) {
                return;
            }

            var currentOptionLevel = -1;
            var currentOptionIndex = -1;
            if (activeElement) {
                currentOptionLevel = activeElement.optionLevel;
                currentOptionIndex = activeElement.optionIndex;
            };
            var key = DevHome.Utilities.Key;
            // If we are navigating menu items we use an optimized way to move focus. Otherwise, we'll fall back to automatic focus.
            if (currentOptionLevel !== undefined &&
                currentOptionIndex !== undefined) {
                switch (keyCode) {
                    case key.upArrow:
                    case key.GamepadDPadUp:
                    case key.GamepadLeftThumbstickUp:
                        nextFocus = this._element.querySelector(".xbdh-gridfocus-" + currentOptionLevel + "-" + (currentOptionIndex - 1));
                        break;
                    case key.downArrow:
                    case key.GamepadDPadDown:
                    case key.GamepadLeftThumbstickDown:
                        nextFocus = this._element.querySelector(".xbdh-gridfocus-" + currentOptionLevel + "-" + (currentOptionIndex + 1));
                        break;
                    // There is a special behavior when navigating "back" (left) in the menu. We don't want to go to the nearest neighbor.
                    // Instead, we want to go to the menu option we previously had selected.
                    case key.leftArrow:
                    case key.GamepadDPadLeft:
                    case key.GamepadLeftThumbstickLeft:
                        if (currentOptionLevel === 0) {
                            return;
                        }
                        nextFocus = this._element.querySelector(".xbdh-menu-options-" + (currentOptionLevel - 1) + " .xbdh-selected");
                        break;
                    case key.rightArrow:
                    case key.GamepadDPadRight:
                    case key.GamepadLeftThumbstickRight:
                        nextFocus = this._element.querySelector(".xbdh-gridfocus-" + (currentOptionLevel + 1) + "-" + currentOptionIndex);
                        if (!nextFocus) {
                            var targetPanel = this._element.querySelector(".xbdh-menu-options-" + (currentOptionLevel + 1));
                            if (targetPanel) {
                                if (targetPanel.classList.contains(classNames._cssWindowClassName)) {
                                    // Set focus to the new panel and call automatic focus to find the next focus element
                                    TVJS.DirectionalNavigation.focusRoot = targetPanel;
                                    TVJS.DirectionalNavigation.enabled = true;
                                    var direction = xbdhUtils._directionFromKeyCode(keyCode);
                                    nextFocus = TVJS.DirectionalNavigation.findNextFocusElement(direction, {
                                        referenceElement: activeElement
                                    });
                                } else {
                                    nextFocus = targetPanel.lastElementChild;
                                }
                            }
                        }
                        break;
                    default:
                        // No-op
                        break;
                }
            }

            if (nextFocus &&
                !this._alreadyMovedFocus) {
                nextFocus.focus();
            } else if (this._alreadyMovedFocus) {
                this._alreadyMovedFocus = false;
            }
        };
        _Menu.prototype._toggleMenu = function () {
            // Don't show the menu if we're in the first run experience.
            if (utils._inFirstRun) {
                return;
            }

            if (this._open) {
                this.hide();
            } else {
                this.show();
            }
        };
        // Public methods
        _Menu.prototype.dispose = function () {
            document.removeEventListener("keydown", this._handleKeyDownBound);
            document.removeEventListener("keyup", this._handleKeyUpBound);
            var menuElement = document.body.querySelector(".xbdh-menu");
            if (menuElement) {
                menuElement.parentNode.removeChild(menuElement);
            }
        };
        _Menu.prototype.hide = function (dontResetFocus) {
            if (!this._open) {
                return;
            }

            var wasCancelled = this.dispatchEvent("beforehide", null);
            if (wasCancelled) {
                return;
            }

            DevHome.Utilities.hideDarkBackground();

            // Hide any other overlays. We do this because the menu may have opened a modal overlay and
            // closing the menu should close that overlay because to the user it is considered part of
            // the menu.
            var menuOverlay = document.querySelector(".xbdh-menu-overlay");
            if (menuOverlay) {
                menuOverlay.parentNode.removeChild(menuOverlay);
            }

            // If we haven't created the DOM yet, we need to do that
            if (!this._domInitialized) {
                this._createDom();
            }
            // Enable automatic focus
            if (!dontResetFocus && this._previousFocusRoot) {
                TVJS.DirectionalNavigation.focusRoot = this._previousFocusRoot;
                TVJS.DirectionalNavigation.enabled = true;
            }
            if (!dontResetFocus && this._previousFocus) {
                this._previousFocus.focus();
            }
            TVJS.DirectionalNavigation.removeEventListener("_nonextfocusfound", this._handleNoNextFocusFoundBind);
            this._element.classList.add(classNames._cssHiddenClassName);

            this._open = false;
        };
        _Menu.prototype.show = function () {
            if (this._open) {
                return;
            }

            var wasCancelled = this.dispatchEvent("beforeshow", null);
            if (wasCancelled) {
                return;
            }

            DevHome.Utilities.showDarkBackground();

            // Hide any other overlays
            utils.hideVisibleOverlays();

            // If we haven't created the DOM yet, we need to do that
            if (!this._domInitialized) {
                this._createDom();
            }
            this._element.classList.remove(classNames._cssHiddenClassName);
            // Disable automatic focus
            this._previousFocusRoot = TVJS.DirectionalNavigation.focusRoot;
            TVJS.DirectionalNavigation.enabled = false;
            TVJS.DirectionalNavigation.addEventListener("_nonextfocusfound", this._handleNoNextFocusFoundBind, false);
            // Set default focus
            this._previousFocus = document.activeElement;
            var initialFocusElement = this._element.querySelector(".xbdh-menu-option");
            if (initialFocusElement) {
                xbdhUtils._trySetActive(initialFocusElement);
            }

            this._open = true;
        };
        return _Menu;
    })();
    WinJS.Class.mix(_Menu, WinJS.Utilities.eventMixin);
    DevHome.UI = DevHome.UI || {};
    DevHome.UI._Menu = _Menu;

    // Overlay
    var Overlay = (function () {

        function Overlay(element, options) {
            // Private variables
            this._domInitialized = false;
            this._element = element || document.createElement("div");
            this._elementInitialized = false;
            this._handleKeyUpBound = this._handleKeyUp.bind(this);
            this._previousFocus = null;
            this._previousFocusRoot = null;
            this._open = false;

            this._element.winControl = this;

            if (options &&
                options.html) {
                this._html = options.html;
            }

            // Events
            this._element.addEventListener("keyup", this._handleKeyUpBound, false);
        };
        Object.defineProperty(Overlay.prototype, "element", {
            get: function () {
                return this._element;
            },
            enumerable: true,
            configurable: true
        });
        Overlay.prototype._handleKeyUp = function (e) {
            switch (e.keyCode) {
                case DevHome.Utilities.Key.escape:
                case DevHome.Utilities.Key.GamepadB:
                    this.hide();
                    break;
                default:
                    break;
            };
        };
        // Public methods
        Overlay.prototype.dispose = function () {
            if (this._disposed) {
                return;
            }
            this._disposed = true;

            if (this._element) {
                this._element.parentNode.removeChild(this._element);
            }
        };
        Overlay.prototype.hide = function () {
            var wasCancelled = this.dispatchEvent("beforehide", null);
            if (wasCancelled) {
                return;
            }

            if (this._element &&
                this._element.parentNode) {
                this._element.parentNode.removeChild(this._element);
            }

            DevHome.Utilities.hideDarkBackground();

            if (this._previousFocusRoot) {
                TVJS.DirectionalNavigation.focusRoot = this._previousFocusRoot;
                TVJS.DirectionalNavigation.enabled = true;
            } else {
                TVJS.DirectionalNavigation.focusRoot = document.body;
                TVJS.DirectionalNavigation.enabled = true;
            }
            if (this._previousFocus) {
                this._previousFocus.focus();
            }

            this.dispatchEvent("afterhide", null);

            // Update our occupied grid
            utils._Internal.workspaceManager._updateOccupiedMap();

            // Update list that tracks a map between tool window indexes in the data structure and the 
            // index / order of the tool window in the UI.
            utils._Internal.workspaceManager._updateToolWindowDomIndexes();

            this._open = false;
        };
        Overlay.prototype.show = function () {

            var wasCancelled = this.dispatchEvent("beforeshow", null);
            if (wasCancelled ||
                DevHome.Utilities._suppressOverlays) {
                return;
            }

            // Hide any other overlays
            utils.hideVisibleOverlays();

            if (!this._elementInitialized) {
                this._element.id = "xbdh-dialog";
                this._element.classList.add("xbdh-overlay");
                this._element.classList.add("win-overlay");
                this._elementInitialized = true;
            }

            this._element.innerHTML = this._html;
            document.body.appendChild(this._element);

            DevHome.Utilities.showDarkBackground();

            // Set default focus
            this._previousFocus = document.activeElement;
            this._previousFocusRoot = TVJS.DirectionalNavigation.focusRoot;
            TVJS.DirectionalNavigation.focusRoot = this._element;
            TVJS.DirectionalNavigation.enabled = true;
            var initialFocusElement = this._element.querySelector(".win-focusable, BUTTON:not([disabled]), BUTTON:not([tabIndex='-1']), INPUT:not([disabled]), INPUT:not([tabIndex='-1']), TEXTAREA:not([disabled]), TEXTAREA:not([tabIndex='-1']), SELECT:not([disabled]), SELECT:not([tabIndex='-1']), A:not([disabled]), A:not([tabIndex='-1'])");
            if (initialFocusElement) {
                initialFocusElement.focus();
            }
            this._open = true;
            this.dispatchEvent("aftershow", null);
        };
        return Overlay;
    })();
    WinJS.Class.mix(Overlay, WinJS.Utilities.eventMixin);
    DevHome.UI = DevHome.UI || {};
    DevHome.UI.Overlay = Overlay;
})();

(function frameworkInit() {
    "use strict";

    var classNames = DevHome.Utilities.ClassNames;
    var utils = DevHome.Utilities;
    var windowType = DevHome.Utilities.WindowType;

    var _activeWorkspaceIndex = 0;
    var _loadWindowsPromise = null;
    var _workspaceManager = null;

    // Constants
    var _APP_SETTINGS_FILENAME = "devHomeAppSettings.json";
    var _DEVELOPER_SCRATCH_DRIVE = "D:\\";
    var _EXPORTED_WORKSPACES_FOLDER = "Workspaces\\";
    var _EXPORTED_WORKSPACES_ROOT_PATH = "D:\\DevHome\\Workspaces\\";
    var _EXPORTED_WORKSPACES_ROOT_FOLDER = "DevHome\\Workspaces\\";
    var _WORKSPACE_EXTENSION = ".xbdhworkspace";

    /*
     * Common controls
     */

    // Main class for the app
    var _WorkspaceManager = (function () {
        // Namespace shortcuts
        var xbdhUtils = DevHome.Utilities;
        var keys = xbdhUtils.Key;
        var xyFocus = TVJS.DirectionalNavigation;

        function _WorkspaceManager() {
            // Private variables
            this._accentColorClassName = "";
            this._activeToolWindowIndexInternal = -1;
            this._backgroundImageUri = "";
            this._customizationMode = "none";
            this._dateFormatter = null;
            this._timeFormatter = null;
            this._doTimerFunctionsBound = this._doTimerFunctions.bind(this);
            this._doFrequentTimerFunctionsBound = this._doFrequentTimerFunctions.bind(this);
            this._element = null;
            this._fontColorThemeClassName = "";
            this._handleNoNextFocusFoundBound = this._handleNoNextFocusFound.bind(this);
            this._handleResizeBound = this._handleResize.bind(this);
            this._inSemanticZoomMode = false;
            this._keyDownHandlerBound = this._keyDownHandler.bind(this);
            this._keyupHandlerBound = this._keyupHandler.bind(this);
            this._lastNavigationPromise = new Promise(function (c) { c() });
            this._lastWorkspaceSwitchTime = -1;
            this._occupiedMap = [];
            this._oldWorkspaceElement = null;
            this._newWorkspaceElement = null;
            this._pendingSaveSettings = false;
            this._themeColorClassName = "";
            this._timerFunctionsCookie = null;
            this._frequentTimerFunctionsCookie = null;
            this._toolWindowDomElements = [];

            // Constants
            this._MAX_COLS = 128;
            this._FULL_SCREEN_IN_COLUMNS = 28;
            this._MAX_ROWS = 16;
            this._HALF_SCREEN_IN_ROWS = 8;
            this._QUARTER_SCREEN_IN_ROWS = 4;
            this._STARTING_ROW_FOR_HALF_SCREEN_TOOL_WINDOW = 9;

            this._reportAProblemWorkspaceElement = {
                nameResourceId: "workspaceReportAProblem",
                id: "{6E28D5C5-9AF9-4228-8CA7-A42B93BA86BB}",
                version: 1,
                customized: false,
                windows: [
                    {
                        nameResourceId: "ReportAProblemTitle",
                        uri: "/toolwindows/reportaproblem/reportaproblem.html",
                        layout: {
                            row: 1,
                            col: 1,
                            rowspan: this._MAX_ROWS,
                            colspan: ((this._HALF_SCREEN_IN_ROWS * 3) + 3)
                        }
                    }],
                theme: {
                    accentColor: "xboxgreen",
                    themeColor: "dark"
                }
            };

            this._reportAProblemUwpWorkspaceElement = {
                nameResourceId: "workspaceReportAProblem",
                id: "{228bc31c-aee6-44dc-8d15-e3b409ffff9e}",
                version: 1,
                customized: false,
                windows: [
                    {
                        nameResourceId: "ReportAProblemTitle",
                        uri: "/toolwindows/reportaproblemuwp/reportaproblemuwp.html",
                        layout: {
                            row: 1,
                            col: 1,
                            rowspan: this._MAX_ROWS,
                            colspan: ((this._HALF_SCREEN_IN_ROWS * 3) + 3)
                        }
                    }],
                theme: {
                    accentColor: "xboxgreen",
                    themeColor: "dark"
                }
            };

            // Default app settings and configuration if there are no custom workspaces or profile files present.
            this._defaultUwpConfiguration = {
                version: 3,
                commands: [{
                    nameResourceId: "menuAddToolToWorkspace",
                    action: "/framework/toolwindows/addTool/addTool.html"
                }, {
                    nameResourceId: "menuResetLayout",
                    action: "/framework/toolwindows/resetLayout/resetLayout.html"
                }, {
                    nameResourceId: "menuManageDevStorage",
                    action: "/framework/toolwindows/manageStorage/manageStorage.html"
                }, {
                    nameResourceId: "menuBackgroundImage",
                    action: "/framework/toolwindows/backgroundImage/backgroundImage.html"
                }, {
                    nameResourceId: "menuThemeColors",
                    action: "/framework/toolwindows/themeColors/themeColors.html"
                }, {
                    nameResourceId: "menuProvideFeedback",
                    action: "/framework/toolwindows/feedback/feedback.html"
                }],
                tools: [{
                    nameResourceId: "launcherTitle",
                    descriptionResourceId: "launcherDescription",
                    uri: "/toolwindows/launcher/launcher.html",
                    layout: {
                        rowspan: this._MAX_ROWS,
                        colspan: 12
                    }
                }, {
                    nameResourceId: "userManagementTitle",
                    descriptionResourceId: "userManagementDescription",
                    uri: "/toolwindows/userManagement/userManagement.html",
                    layout: {
                        rowspan: this._MAX_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS + 1
                    }
                }, {
                    nameResourceId: "vsDevSettingsTitle",
                    uri: "/toolwindows/vsDevSettings/vsDevSettings.html",
                    layout: {
                        rowspan: this._MAX_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS + 1
                    }
                }, {
                    nameResourceId: "wdpTitle",
                    uri: "/toolwindows/wdp/wdp.html",
                    layout: {
                        rowspan: this._MAX_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS + 1
                    }
                }, {
                    nameResourceId: "consoleSettingsTitle",
                    descriptionResourceId: "consoleSettingsDescription",
                    uri: "/toolwindows/consoleSettings/consoleSettings.html",
                    layout: {
                        rowspan: this._MAX_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS + 1
                    }
                }, {
                    nameResourceId: "xboxLiveServiceStatusTitle",
                    descriptionResourceId: "xboxLiveServiceStatusDescription",
                    uri: "/toolwindows/xboxLiveServiceStatus/xboxLiveServiceStatus.html",
                    layout: {
                        rowspan: this._MAX_ROWS,
                        colspan: 8
                    }
                }, {
                    nameResourceId: "httpMonitorTitle",
                    descriptionResourceId: "HttpMonitorDescription",
                    uri: "/toolwindows/httpMonitor/httpMonitor.html",
                    layout: {
                        rowspan: this._HALF_SCREEN_IN_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS + 1
                    }
                }, {
                    nameResourceId: "defaultAppTitle",
                    descriptionResourceId: "defaultAppDescription",
                    uri: "/toolwindows/defaultApp/defaultApp.html",
                    layout: {
                        rowspan: this._HALF_SCREEN_IN_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS + 1
                    }
                }],
                workspaces: [{
                    nameResourceId: "workspaceHome",
                    id: "{9DBF5C7D-3F90-4C40-991F-14B67548F374}",
                    version: 4,
                    customized: false,
                    windows: [{
                        nameResourceId: "commonActionsTitle",
                        uri: "/toolwindows/commonActions/commonActions.html",
                        layout: {
                            row: 1,
                            col: 1,
                            rowspan: this._HALF_SCREEN_IN_ROWS - 2,
                            colspan: 16
                        }
                    }, {
                        nameResourceId: "launcherTitle",
                        uri: "/toolwindows/launcher/launcher.html",
                        isDefault: "true",
                        layout: {
                            row: this._HALF_SCREEN_IN_ROWS - 1,
                            col: 1,
                            rowspan: this._HALF_SCREEN_IN_ROWS + 2,
                            colspan: 16
                        }
                    }, {
                        nameResourceId: "userManagementTitle",
                        uri: "/toolwindows/userManagement/userManagement.html",
                        layout: {
                            row: 1,
                            col: 17,
                            rowspan: this._HALF_SCREEN_IN_ROWS + 2,
                            colspan: this._HALF_SCREEN_IN_ROWS + 3
                        }
                    }, {
                        nameResourceId: "wdpTitle",
                        uri: "/toolwindows/wdp/wdp.html",
                        layout: {
                            row: this._HALF_SCREEN_IN_ROWS + 3,
                            col: 17,
                            rowspan: this._HALF_SCREEN_IN_ROWS - 2,
                            colspan: this._HALF_SCREEN_IN_ROWS + 3
                        }
                    }],
                    theme: {
                        accentColor: "xboxgreen",
                        themeColor: "dark"
                    }
                }, {
                    nameResourceId: "workspaceSettings",
                    id: "{0BA8781B-3F8B-4D34-97C4-062189CF1CC6}",
                    version: 1,
                    customized: false,
                    windows: [{
                        nameResourceId: "consoleSettingsTitle",
                        uri: "/toolwindows/consoleSettings/consoleSettings.html",
                        layout: {
                            row: 1,
                            col: 1,
                            rowspan: this._MAX_ROWS,
                            colspan: 16
                        },
                    }, {
                        nameResourceId: "httpMonitorTitle",
                        uri: "/toolwindows/httpMonitor/httpMonitor.html",
                        layout: {
                            row: 1,
                            col: 17,
                            rowspan: this._HALF_SCREEN_IN_ROWS - 1,
                            colspan: this._HALF_SCREEN_IN_ROWS + 1
                        }
                    }, {
                        nameResourceId: "vsDevSettingsTitle",
                        uri: "/toolwindows/vsDevSettings/vsDevSettings.html",
                        layout: {
                            row: this._HALF_SCREEN_IN_ROWS,
                            col: 17,
                            rowspan: this._HALF_SCREEN_IN_ROWS - 4,
                            colspan: this._HALF_SCREEN_IN_ROWS + 1
                        }
                    }, {
                        nameResourceId: "defaultAppTitle",
                        uri: "/toolwindows/defaultApp/defaultApp.html",
                        layout: {
                            row: 12,
                            col: 17,
                            rowspan: this._HALF_SCREEN_IN_ROWS - 2,
                            colspan: this._HALF_SCREEN_IN_ROWS + 1
                        }
                    }],
                    theme: {
                        accentColor: "xboxgreen",
                        themeColor: "dark"
                    }
                }, {
                    nameResourceId: "workspaceXboxLive",
                    id: "{BAD57C19-E68C-462A-9E4E-10E8D2078180}",
                    version: 1,
                    customized: false,
                    windows: [{
                        nameResourceId: "xboxLiveServiceStatusTitle",
                        uri: "/toolwindows/xboxLiveServiceStatus/xboxLiveServiceStatus.html",
                        layout: {
                            row: 1,
                            col: 1,
                            rowspan: this._MAX_ROWS,
                            colspan: 16
                        }
                    }],
                    theme: {
                        accentColor: "xboxgreen",
                        themeColor: "dark"
                        }
                    }],
                appSettings: {
                    workspaces: {
                        defaultWorkspace: "{9DBF5C7D-3F90-4C40-991F-14B67548F374}",
                        deletedBuiltInWorkspaces: []
                    }
                }
            };

            this._defaultEraConfiguration = {
                version: 3.1,
                commands: [{
                    nameResourceId: "menuWorkspace",
                    children: [{
                        nameResourceId: "menuAddToolToWorkspace",
                        action: "/framework/toolwindows/addTool/addTool.html"
                    }, {
                        nameResourceId: "menuNewWorkspace",
                        action: "/framework/toolwindows/newWorkspace/newWorkspace.html"
                    }, {
                        nameResourceId: "menuLoadWorkspace",
                        action: "/framework/toolwindows/importWorkspace/importWorkspace.html"
                    }, {
                        nameResourceId: "menuExportWorkspace",
                        action: "/framework/toolwindows/exportWorkspace/exportWorkspace.html"
                    }, {
                        nameResourceId: "menuRenameWorkspace",
                        action: "/framework/toolwindows/renameWorkspace/renameWorkspace.html"
                    }, {
                        nameResourceId: "menuDeleteWorkspace",
                        action: "/framework/toolwindows/deleteWorkspace/deleteWorkspace.html"
                    }, {
                        nameResourceId: "menuSetAsDefaultWorkspace",
                        action: "/framework/toolwindows/defaultWorkspace/defaultWorkspace.html"
                    }, {
                        nameResourceId: "menuResetLayout",
                        action: "/framework/toolwindows/resetLayout/resetLayout.html"
                    }, {
                        nameResourceId: "menuBackgroundImage",
                        action: "/framework/toolwindows/backgroundImage/backgroundImage.html"
                    }, {
                        nameResourceId: "menuThemeColors",
                        action: "/framework/toolwindows/themeColors/themeColors.html"
                    }]
                }, {
                    nameResourceId: "menuManageCredentials",
                    action: "/framework/toolwindows/manageCredentials/manageCredentials.html"
                }, {
                    nameResourceId: "menuProvideFeedback",
                    action: "/framework/toolwindows/feedback/feedback.html"
                }],
                tools: [{
                    nameResourceId: "launcherTitle",
                    descriptionResourceId: "launcherDescription",
                    uri: "/toolwindows/launcher/launcher.html",
                    layout: {
                        rowspan: this._MAX_ROWS,
                        colspan: 12
                    }
                }, {
                    nameResourceId: "userManagementTitle",
                    descriptionResourceId: "userManagementDescription",
                    uri: "/toolwindows/userManagement/userManagement.html",
                    layout: {
                        rowspan: this._MAX_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS + 1
                    }
                }, {
                    nameResourceId: "vsDevSettingsTitle",
                    uri: "/toolwindows/vsDevSettings/vsDevSettings.html",
                    layout: {
                        rowspan: this._MAX_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS + 1
                    }
                }, {
                    nameResourceId: "consoleSettingsTitle",
                    descriptionResourceId: "consoleSettingsDescription",
                    uri: "/toolwindows/consoleSettings/consoleSettings.html",
                    layout: {
                        rowspan: this._MAX_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS + 1
                    }
                }, {
                    nameResourceId: "debugSettingsTitle",
                    descriptionResourceId: "debugSettingsDescription",
                    uri: "/toolwindows/debugSettings/debugSettings.html",
                    layout: {
                        rowspan: this._HALF_SCREEN_IN_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS
                    }
                }, {
                    nameResourceId: "networkingTitle",
                    descriptionResourceId: "networkingDescription",
                    uri: "/toolwindows/networkingSimulation/networkingSimulation.html",
                    layout: {
                        rowspan: this._HALF_SCREEN_IN_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS
                    }
                }, {
                    nameResourceId: "multiplayerTitle",
                    descriptionResourceId: "multiplayerDescription",
                    uri: "/toolwindows/multiplayer/multiplayer.html",
                    layout: {
                        rowspan: this._HALF_SCREEN_IN_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS
                    }
                }, {
                    nameResourceId: "xboxLiveServiceStatusTitle",
                    descriptionResourceId: "xboxLiveServiceStatusDescription",
                    uri: "/toolwindows/xboxLiveServiceStatus/xboxLiveServiceStatus.html",
                    layout: {
                        rowspan: this._MAX_ROWS,
                        colspan: 8
                    }
                }, {
                    nameResourceId: "networkPacketTraceTitle",
                    descriptionResourceId: "networkPacketTraceDescription",
                    uri: "/toolwindows/networkPacketTrace/networkPacketTrace.html",
                    layout: {
                        rowspan: this._HALF_SCREEN_IN_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS
                    }
                }, {
                    nameResourceId: "diskSimulationTitle",
                    descriptionResourceId: "diskSimulationDescription",
                    uri: "/toolwindows/diskSimulation/diskSimulation.html",
                    layout: {
                        rowspan: this._HALF_SCREEN_IN_ROWS + 1,
                        colspan: this._HALF_SCREEN_IN_ROWS
                    }
                }, {
                    nameResourceId: "cpuSimulationTitle",
                    descriptionResourceId: "cpuSimulationDescription",
                    uri: "/toolwindows/cpuSimulation/cpuSimulation.html",
                    layout: {
                        rowspan: this._HALF_SCREEN_IN_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS
                    }
                }, {
                    nameResourceId: "updateTitle",
                    descriptionResourceId: "updateDescription",
                    uri: "/toolwindows/update/update.html",
                    layout: {
                        rowspan: this._HALF_SCREEN_IN_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS
                    }
                }, {
                    nameResourceId: "commonActionsTitle",
                    descriptionResourceId: "commonActionsDescription",
                    uri: "/toolwindows/commonActions/commonActions.html",
                    layout: {
                        rowspan: this._HALF_SCREEN_IN_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS
                    }
                }, {
                    nameResourceId: "unattendedSetupTitle",
                    uri: "/toolwindows/unattend/unattend.html",
                    layout: {
                        rowspan: this._HALF_SCREEN_IN_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS
                    }
                }, {
                    nameResourceId: "httpMonitorTitle",
                    descriptionResourceId: "HttpMonitorDescription",
                    uri: "/toolwindows/httpMonitor/httpMonitor.html",
                    layout: {
                        rowspan: this._HALF_SCREEN_IN_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS + 1
                    }
                }, {
                    nameResourceId: "defaultAppTitle",
                    descriptionResourceId: "defaultAppDescription",
                    uri: "/toolwindows/defaultApp/defaultApp.html",
                    layout: {
                        rowspan: this._HALF_SCREEN_IN_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS + 1
                    }
                }, {
                    nameResourceId: "devStorageTitle",
                    uri: "/toolwindows/devStorage/devStorage.html",
                    layout: {
                        rowspan: this._HALF_SCREEN_IN_ROWS,
                        colspan: this._HALF_SCREEN_IN_ROWS + 1
                    }
                }],
                workspaces: [{
                    nameResourceId: "workspaceHome",
                    id: "{9DBF5C7D-3F90-4C40-991F-14B67548F374}",
                    version: 3,
                    customized: false,
                    windows: [
                        {
                            nameResourceId: "commonActionsTitle",
                            uri: "/toolwindows/commonActions/commonActions.html",
                            layout: {
                                row: 1,
                                col: 1,
                                rowspan: this._HALF_SCREEN_IN_ROWS - 2,
                                colspan: 16
                            }
                        }, {
                            nameResourceId: "launcherTitle",
                            uri: "/toolwindows/launcher/launcher.html",
                            isDefault: "true",
                            layout: {
                                row: this._HALF_SCREEN_IN_ROWS - 1,
                                col: 1,
                                rowspan: this._HALF_SCREEN_IN_ROWS + 2,
                                colspan: 16
                            }
                        }, {
                            nameResourceId: "userManagementTitle",
                            uri: "/toolwindows/userManagement/userManagement.html",
                            layout: {
                                row: 1,
                                col: 17,
                                rowspan: this._HALF_SCREEN_IN_ROWS + 2,
                                colspan: this._HALF_SCREEN_IN_ROWS + 3
                            }
                        }, {
                            nameResourceId: "wdpTitle",
                            uri: "/toolwindows/wdp/wdp.html",
                            layout: {
                                row: this._HALF_SCREEN_IN_ROWS + 3,
                                col: 17,
                                rowspan: this._HALF_SCREEN_IN_ROWS - 2,
                                colspan: this._HALF_SCREEN_IN_ROWS + 3
                            }
                        }],
                    theme: {
                        accentColor: "xboxgreen",
                        themeColor: "dark"
                    }
                }, {
                    nameResourceId: "workspaceXboxLive",
                    id: "{B242DA4A-CACE-47CD-A542-7366A1625F7B}",
                    version: 1,
                    customized: false,
                    windows: [
                        {
                            nameResourceId: "multiplayerTitle",
                            uri: "/toolwindows/multiplayer/multiplayer.html",
                            layout: {
                                row: 1,
                                col: 1,
                                rowspan: this._HALF_SCREEN_IN_ROWS,
                                colspan: this._HALF_SCREEN_IN_ROWS + 1
                            }
                        }, {
                            nameResourceId: "xboxLiveServiceStatusTitle",
                            uri: "/toolwindows/xboxLiveServiceStatus/xboxLiveServiceStatus.html",
                            layout: {
                                row: 1,
                                col: 10,
                                rowspan: this._MAX_ROWS,
                                colspan: 12
                            }
                        }],
                    theme: {
                        accentColor: "xboxgreen",
                        themeColor: "dark"
                    }
                }, {
                    nameResourceId: "workspaceSettings",
                    id: "{A211AC32-1A99-4E0F-9A29-9F2794F06389}",
                    version: 1,
                    customized: false,
                    windows: [
                        {
                            nameResourceId: "consoleSettingsTitle",
                            uri: "/toolwindows/consoleSettings/consoleSettings.html",
                            layout: {
                                row: 1,
                                col: 1,
                                rowspan: this._MAX_ROWS,
                                colspan: this._HALF_SCREEN_IN_ROWS + 3
                            }
                        }, {
                            nameResourceId: "updateTitle",
                            uri: "/toolwindows/update/update.html",
                            layout: {
                                row: 1,
                                col: 12,
                                rowspan: this._HALF_SCREEN_IN_ROWS - 3,
                                colspan: this._HALF_SCREEN_IN_ROWS + 1
                            }
                        }, {
                            nameResourceId: "vsDevSettingsTitle",
                            uri: "/toolwindows/vsDevSettings/vsDevSettings.html",
                            layout: {
                                row: this._HALF_SCREEN_IN_ROWS - 2,
                                col: 12,
                                rowspan: this._HALF_SCREEN_IN_ROWS - 4,
                                colspan: this._HALF_SCREEN_IN_ROWS + 1
                            }
                        }, {
                            nameResourceId: "unattendedSetupTitle",
                            uri: "/toolwindows/unattend/unattend.html",
                            layout: {
                                row: 1,
                                col: 21,
                                rowspan: this._HALF_SCREEN_IN_ROWS - 3,
                                colspan: this._HALF_SCREEN_IN_ROWS
                            }
                        }, {
                            nameResourceId: "debugSettingsTitle",
                            uri: "/toolwindows/debugSettings/debugSettings.html",
                            layout: {
                                row: 10,
                                col: 12,
                                rowspan: this._HALF_SCREEN_IN_ROWS - 1,
                                colspan: this._HALF_SCREEN_IN_ROWS + 1
                            }
                        }, {
                            nameResourceId: "defaultAppTitle",
                            uri: "/toolwindows/defaultApp/defaultApp.html",
                            layout: {
                                row: this._HALF_SCREEN_IN_ROWS - 2,
                                col: 21,
                                rowspan: this._HALF_SCREEN_IN_ROWS - 4,
                                colspan: this._HALF_SCREEN_IN_ROWS
                            }
                        }, {
                            nameResourceId: "devStorageTitle",
                            uri: "/toolwindows/devStorage/devStorage.html",
                            layout: {
                                row: 10,
                                col: 21,
                                rowspan: this._HALF_SCREEN_IN_ROWS - 1,
                                colspan: this._HALF_SCREEN_IN_ROWS
                            }
                        }],
                    theme: {
                        accentColor: "xboxgreen",
                        themeColor: "dark"
                    }
                }, {
                    nameResourceId: "workspaceNetworking",
                    id: "{1FFCD915-007A-4477-A093-C7800B745FCE}",
                    version: 1,
                    customized: false,
                    windows: [
                        {
                            nameResourceId: "networkingTitle",
                            uri: "/toolwindows/networkingSimulation/networkingSimulation.html",
                            layout: {
                                row: 1,
                                col: 1,
                                rowspan: this._HALF_SCREEN_IN_ROWS + 1,
                                colspan: this._HALF_SCREEN_IN_ROWS + 1
                            }
                        }, {
                            nameResourceId: "networkPacketTraceTitle",
                            uri: "/toolwindows/networkPacketTrace/networkPacketTrace.html",
                            layout: {
                                row: this._HALF_SCREEN_IN_ROWS + 2,
                                col: 1,
                                rowspan: this._HALF_SCREEN_IN_ROWS - 2,
                                colspan: this._HALF_SCREEN_IN_ROWS + 1
                            },
                        }, {
                            nameResourceId: "httpMonitorTitle",
                            uri: "/toolwindows/httpMonitor/httpMonitor.html",
                            layout: {
                                row: 1,
                                col: 10,
                                rowspan: this._HALF_SCREEN_IN_ROWS,
                                colspan: this._HALF_SCREEN_IN_ROWS + 1
                            }
                        }],
                    theme: {
                        accentColor: "xboxgreen",
                        themeColor: "dark"
                    }
                }, {
                    nameResourceId: "workspacePerformance",
                    id: "{ED25089C-C12A-4162-9D18-DB068DA3B7BC}",
                    version: 1,
                    customized: false,
                    windows: [
                        {
                            nameResourceId: "diskSimulationTitle",
                            uri: "/toolwindows/diskSimulation/diskSimulation.html",
                            layout: {
                                row: 1,
                                col: 1,
                                rowspan: this._HALF_SCREEN_IN_ROWS,
                                colspan: this._HALF_SCREEN_IN_ROWS + 1
                            }
                        }, {
                            nameResourceId: "cpuSimulationTitle",
                            uri: "/toolwindows/cpuSimulation/cpuSimulation.html",
                            layout: {
                                row: this._HALF_SCREEN_IN_ROWS + 1,
                                col: 1,
                                rowspan: this._HALF_SCREEN_IN_ROWS,
                                colspan: this._HALF_SCREEN_IN_ROWS + 1
                            }
                        }, {
                            nameResourceId: "scorpioCompatMode",
                            uri: "/toolwindows/compatMode/compatMode.html",
                            layout: {
                                row: 1,
                                col: 10,
                                rowspan: this._HALF_SCREEN_IN_ROWS,
                                colspan: this._HALF_SCREEN_IN_ROWS + 8
                            }
                        }, {
                            nameResourceId: "performanceSettingsTitle",
                            uri: "/toolwindows/performanceSettings/performanceSettings.html",
                            layout: {
                                row: this._HALF_SCREEN_IN_ROWS + 1,
                                col: 10,
                                rowspan: this._HALF_SCREEN_IN_ROWS + 4,
                                colspan: this._HALF_SCREEN_IN_ROWS + 8
                            }
                        }],
                    theme: {
                        accentColor: "xboxgreen",
                        themeColor: "dark"
                    }
                    }, this._reportAProblemWorkspaceElement
                ],
                appSettings: {
                    workspaces: {
                        defaultWorkspace: "{9DBF5C7D-3F90-4C40-991F-14B67548F374}",
                        deletedBuiltInWorkspaces: []
                    }
                }
            };

            this._advancedDevkitToolsElements = [{
                nameResourceId: "scorpioFrontPanelButtons",
                uri: "/toolwindows/frontpanelbuttons/frontpanelbuttons.html",
                layout: {
                    rowspan: this._MAX_ROWS,
                    colspan: this._HALF_SCREEN_IN_ROWS
                }
            }, {
                nameResourceId: "scorpioDebugNic",
                uri: "/toolwindows/debugNic/debugNic.html",
                layout: {
                    rowspan: this._HALF_SCREEN_IN_ROWS,
                    colspan: this._HALF_SCREEN_IN_ROWS
                }
            }, {
                nameResourceId: "scorpioCompatMode",
                uri: "/toolwindows/compatMode/compatMode.html",
                layout: {
                    rowspan: this._HALF_SCREEN_IN_ROWS,
                    colspan: this._HALF_SCREEN_IN_ROWS
                }
            }];

            this._advancedDevkitWorkspaceElement = {
                nameResourceId: "workspaceAdvancedDevkit",
                id: "{E7343AC8-4186-4EEF-894E-FE7FE38A6FB8}",
                version: 1,
                customized: false,
                windows: [{
                    nameResourceId: "scorpioDebugNic",
                    uri: "/toolwindows/debugNic/debugNic.html",
                    layout: {
                        row: 1,
                        col: 16,
                        rowspan: this._HALF_SCREEN_IN_ROWS,
                        colspan: 10
                    },
                },{
                    nameResourceId: "scorpioFrontPanelButtons",
                    uri: "/toolwindows/frontpanelbuttons/frontpanelbuttons.html",
                    layout: {
                        row: 1,
                        col: 1,
                        rowspan: this._MAX_ROWS,
                        colspan: 15
                    },
                }],
                theme: {
                    accentColor: "xboxgreen",
                    themeColor: "dark"
                }
            };

            this._gameStreamingWorkspaceElement = {
                nameResourceId: "workspaceStreaming",
                id: "{429987CD-974C-45AD-9DBB-D81308ACDEDD}",
                version: 1,
                customized: false,
                windows: [
                    {
                        nameResourceId: "gameStreamingTitle",
                        uri: "/toolwindows/gameStreaming/gameStreaming.html",
                        layout: {
                            row: 1,
                            col: 1,
                            rowspan: this._MAX_ROWS,
                            colspan: this._HALF_SCREEN_IN_ROWS + 3
                        }
                    },
                    {
                        nameResourceId: "streamSimulationTitle",
                        uri: "/toolwindows/streamSimulation/streamSimulation.html",
                        layout: {
                            row: 1,
                            col: this._HALF_SCREEN_IN_ROWS + 4,
                            rowspan: this._HALF_SCREEN_IN_ROWS,
                            colspan: this._HALF_SCREEN_IN_ROWS + 2
                        }
                    },
                    {
                        nameResourceId: "gameStreamingConfigOverridesTitle",
                        uri: "/toolwindows/gameStreamingConfigOverrides/gameStreamingConfigOverrides.html",
                        layout: {
                            row: 1 + this._HALF_SCREEN_IN_ROWS,
                            col: this._HALF_SCREEN_IN_ROWS + 4,
                            rowspan: this._HALF_SCREEN_IN_ROWS,
                            colspan: this._HALF_SCREEN_IN_ROWS + 2
                        }
                    }],
                theme: {
                    accentColor: "xboxgreen",
                    themeColor: "dark"
                }
            };

            this._getDefaultAdvancedDevkitConfigurationAsync = async function () {
                var config = await this._getDefaultERAConfigurationAsync();

                // Insert the new scorpio/dante specific workspace
                var insertIndex = 3;
                config.workspaces.splice(insertIndex, 0, this._advancedDevkitWorkspaceElement);

                // Also add the scorpio/dante specific tools
                config.tools = config.tools.concat(this._advancedDevkitToolsElements);

                return config;
            };

            this._getDefaultERAConfigurationAsync = async function () {
                var config = this._defaultEraConfiguration;

                // Insert cloud streaming all the time now.
                var insertIndex = 4;
                config.workspaces.splice(insertIndex, 0, this._gameStreamingWorkspaceElement);

                return config;
            };

            this._getDefaultUWPConfigurationAsync = async function () {
                let config = this._defaultUwpConfiguration;
                let devRapUWPEnabled = false;

                var nativeUtils = xbdhUtils.getDevHomeNativeUtilities();
                devRapUWPEnabled = await nativeUtils.getIsDevRaPUWPEnabledAsync();
                if (devRapUWPEnabled) {
                    config.workspaces.push(this._reportAProblemUwpWorkspaceElement);
                }

                return config;
            };

            // Events
            document.addEventListener("keydown", this._keyDownHandlerBound, false);
            document.addEventListener("keyup", this._keyupHandlerBound, false);
            window.addEventListener("resize", this._handleResizeBound, false);

            TVJS.DirectionalNavigation.addEventListener("_nonextfocusfound", this._handleNoNextFocusFoundBound, false);

            // Initialization
            this._createOccupiedMap();
        };
        // Private properties
        Object.defineProperty(_WorkspaceManager.prototype, "_activeToolWindowIndex", {
            get: function () {
                return this._activeToolWindowIndexInternal;
            },
            set: function (value) {
                this._activeToolWindowIndexInternal = value;
                var activeToolWindowElement = this._toolWindowDomElements[this._activeToolWindowIndexInternal];
                for (var i = 0, len = this._toolWindowDomElements.length; i < len; i++) {
                    if (this._toolWindowDomElements[i]) {
                        this._toolWindowDomElements[i].classList.remove("xbdh-active");
                    }
                }
                if (activeToolWindowElement) {
                    activeToolWindowElement.classList.add("xbdh-active");
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(_WorkspaceManager.prototype, "_activeWorkspaceIndex", {
            get: function () {
                return _activeWorkspaceIndex;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(_WorkspaceManager.prototype, "settings", {
            get: function () {
                return utils._settings;
            },
            enumerable: true,
            configurable: true
        });
        // Private methods
        _WorkspaceManager.prototype._arrange = function (layoutChanged) {
            var workspaceWindows = this.settings.workspaces[this._activeWorkspaceIndex].windows;
            var windowElements = document.body.querySelectorAll(classNames._cssWindowSelector);
            for (var i = 0; i < windowElements.length; i++) {
                var currentWindow = windowElements[i];
                var workspaceWindow = workspaceWindows[currentWindow.xbdhIndex];

                // If we didn't get a workspace window, skip this one.
                if (!workspaceWindow) {
                    continue;
                }

                // Update CSS classes
                currentWindow.classList.remove("xbdh-layout-colspan" + currentWindow.style.msGridColumnSpan);
                currentWindow.classList.remove("xbdh-layout-rowspan" + currentWindow.style.msGridRowSpan);

                currentWindow.classList.add("xbdh-layout-colspan" + currentWindow.colspan);
                currentWindow.classList.add("xbdh-layout-rowspan" + currentWindow.rowspan);

                // Update grid column and row properties
                currentWindow.style.msGridColumn = currentWindow.col;
                currentWindow.style.msGridRow = currentWindow.row;
                currentWindow.style.msGridColumnSpan = currentWindow.colspan;
                currentWindow.style.msGridRowSpan = currentWindow.rowspan;

                // Update the workspace file data
                workspaceWindow.layout.col = currentWindow.col;
                workspaceWindow.layout.row = currentWindow.row;
                workspaceWindow.layout.colspan = currentWindow.colspan;
                workspaceWindow.layout.rowspan = currentWindow.rowspan;
            }

            // Update our occupied grid
            this._updateOccupiedMap();
            // Update list that tracks a map between tool window indexes in the data structure and the 
            // index / order of the tool window in the UI.
            this._updateToolWindowDomIndexes();

            // Save settings
            this.saveSettings();
        };
        _WorkspaceManager.prototype._changeAccentColor = function (color) {
            // Remove old themes
            var oldColor = utils._settings.workspaces[this._activeWorkspaceIndex].theme.accentColor;
            document.body.classList.remove("xbdh-theme-accentcolor-" + oldColor);
            // Apply the new theme
            document.body.classList.add("xbdh-theme-accentcolor-" + color);

            // Save the setting
            utils._settings.workspaces[this._activeWorkspaceIndex].theme.accentColor = color;
            utils._localSettings.values["xbdh-customized"] = "true";
            this.saveSettings();
        };
        _WorkspaceManager.prototype._changeBackgroundImage = function (uri) {
            document.body.style.backgroundImage = 'url("' + uri + '")';

            // Save the setting
            utils._settings.workspaces[this._activeWorkspaceIndex].theme.backgroundImage = uri;
            utils._localSettings.values["xbdh-customized"] = "true";
            this.saveSettings();
        };
        _WorkspaceManager.prototype._changeThemeColor = function (theme) {
            // Remove old themes
            if (theme === "dark") {
                document.body.classList.remove("xbdh-theme-light");
                document.body.classList.add("xbdh-theme-dark");
            } else {
                document.body.classList.remove("xbdh-theme-dark");
                document.body.classList.add("xbdh-theme-light");
            }

            // Save the setting
            utils._settings.workspaces[this._activeWorkspaceIndex].theme.themeColor = theme;
            utils._localSettings.values["xbdh-customized"] = "true";
            this.saveSettings();
        };
        
        _WorkspaceManager.prototype._checkForConsoleModeAsync = async function (windowElement, layoutData) {
            var nativeUtils = xbdhUtils.getDevHomeNativeUtilities();
            var consoleMode = await nativeUtils.getConsoleModeAsync();
            var debugUtils = Microsoft.Xbox.Development.DebugUtilities;

            if (consoleMode !== Microsoft.Xbox.Development.ConsoleMode.default &&
                !(utils._consoleType === utils.ConsoleType.dante && consoleMode === Microsoft.Xbox.Development.ConsoleMode.anacondaProfiling)) {
                //Add Button that shows consoleMode in the dashboard, it redirects to performance Workspace.
                this._setCompatModeText(consoleMode);
                var compatModeButton = document.getElementById("xbdh-shell-compatMode");
                compatModeButton.hidden = false;

                //Add notification
                xbdhUtils._addNotification({
                    title: DevHome.Utilities.Resources.getString("notificationsInCompatModeTitle").value,
                    description: DevHome.Utilities.Resources.getString("notificationsInCompatModeDescription").value,
                    primaryActionId: "xbdh-notification-revertconsolemode",
                    primaryActionLabel: DevHome.Utilities.Resources.getString("notificationsConsoleModeDisable").value,
                    primaryActionCallback: DevHome.Utilities.revertConsoleModeWithPrompt
                });
            }
            // A console could be in default mode and still have extra title memory
            else if (debugUtils.extraTitleMemory > 0) {
                this._setCompatModeText(consoleMode);
                var compatModeButton = document.getElementById("xbdh-shell-compatMode");
                compatModeButton.hidden = false;
            }
        };
        _WorkspaceManager.prototype._checkForDeprecatedHardware = function (windowElement, layoutData) {
            // If this hardware is deprecated, that counts as an urgent notification.
            if (Microsoft.Xbox.Development.XboxInfoUtilities.isDeprecatedXboxDevkitHardware) {
                xbdhUtils._addNotification({
                    title: DevHome.Utilities.Resources.getString("notificationsDeprecatedHardwareTitle").value,
                    description: DevHome.Utilities.Resources.getString("notificationsDeprecatedHardwareDescription1").value + "<p>" + DevHome.Utilities.Resources.getString("notificationsDeprecatedHardwareDescription2").value,
                    isUrgentDisruptiveNotification: true
                });
            }
        };
        _WorkspaceManager.prototype._checkForWebProxy = function () {
            if (Microsoft.Xbox.Development.NetworkUtilities.fiddlerProxyEnabled) {
                // If a proxy is enabled, add a notification
                utils._addNotification({
                    title: DevHome.Utilities.Resources.getString("notificationsProxyTitle").value,
                    description: DevHome.Utilities.Resources.getString("notificationsProxyDescription").value,
                    primaryActionId: "xbdh-notification-disablefiddler",
                    primaryActionLabel: DevHome.Utilities.Resources.getString("notificationsProxyDisable").value,
                    primaryActionCallback: function () {
                        DevHome.Utilities.showPopUp(
                            DevHome.Utilities.Resources.getString("notificationsProxyRestartTitle").value,
                            DevHome.Utilities.Resources.getString("notificationsProxyRestartDescription").value,
                            {
                                label: DevHome.Utilities.Resources.getString("commandRestartNow").value,
                                callback: function () {
                                    try {
                                        Microsoft.Xbox.Development.NetworkUtilities.disableFiddlerProxy();
                                        Windows.Xbox.System.Internal.Power.PowerProperties.restartConsole();
                                    } catch (e) {
                                        // Do nothing. Failures here should not crash DevHome
                                    }
                                }
                            },
                            {
                                label: DevHome.Utilities.Resources.getString("commandCancel").value,
                                callback: function () {
                                    var dialog = document.getElementById("xbdh-dialog").winControl;
                                    dialog.hide();
                                }
                            });
                    }
                });
            }
        };
        _WorkspaceManager.prototype._checkForCorruptProfileSelfHeal = function () {
            if (Microsoft.Xbox.Development.XboxInfoUtilities.wasUserProfileCleanupPerformed) {
                // If cleanup was performed, add a notification
                utils._addNotification({
                    title: DevHome.Utilities.Resources.getString("notificationsSelfHealTitle").value,
                    description: DevHome.Utilities.Resources.getString("notificationsSelfHealDescription").value,
                    isUrgentDisruptiveNotification: true,
                    primaryActionId: "xbdh-notification-selfhealmessage-dismiss",
                    primaryActionLabel: DevHome.Utilities.Resources.getString("notificationsSelfHealDismiss").value,
                    primaryActionCallback: function () {
                        try {
                            Microsoft.Xbox.Development.XboxInfoUtilities.clearUserProfileCleanupFlag();
                        } catch (e) {
                            // Do nothing. Failures here should not crash DevHome
                        }
                        // Remove the notification
                        xbdhUtils._removeNotification({
                            title: DevHome.Utilities.Resources.getString("notificationsSelfHealTitle").value,
                            description: DevHome.Utilities.Resources.getString("notificationsSelfHealDescription").value
                        });
                        var dialog = document.getElementById("xbdh-dialog").winControl;
                        dialog.hide();
                    }
                });
            }
        };
        _WorkspaceManager.prototype._checkForWifiAsync = async function (windowElement, layoutData) {
            if (utils._certType !== utils.Cert.uwp) {
                var nativeUtils = xbdhUtils.getDevHomeNativeUtilities();
                if (await nativeUtils.getIsConnectedToWifiAsync()) {
                    xbdhUtils._addNotification({
                        title: DevHome.Utilities.Resources.getString("notificationsConnectedToWifiTitle").value,
                        description: DevHome.Utilities.Resources.getString("notificationsConnectedToWifiDescription").value,
                    });
                }
            }
        };
        // Clears the occupancy map for the specified element
        _WorkspaceManager.prototype._clearMapForElements = function (elements) {
            for (var i = 0; i < elements.length; i++) {
                var element = elements[i];
                if (element.col + element.colspan > this._MAX_COLS ||
                    element.row + element.rowspan > this._MAX_ROWS) {
                    return false;
                }
                for (var j = element.col - 1; j < element.col + element.colspan - 1 && j < this._occupiedMap.length; j++) {
                    for (var k = element.row - 1; k < element.row + element.rowspan - 1 && k < this._occupiedMap[j].length; k++) {
                        this._occupiedMap[j][k] = 0;
                    }
                }
            }
            return true;
        };
        _WorkspaceManager.prototype._clearOccupiedMap = function () {
            // Zero out all the memory
            for (var i = 0; i < this._occupiedMap.length; i++) {
                var currentColumn = this._occupiedMap[i];
                for (var j = 0; j < currentColumn.length; j++) {
                    currentColumn[j] = 0;
                }
            }
        };
        _WorkspaceManager.prototype._createOccupiedMap = function () {
            // Build the occupiedMap
            for (var i = 0; i < this._MAX_COLS; i++) {
                var newColumn = [];
                for (var j = 0; j < this._MAX_ROWS; j++) {
                    newColumn.push(0);
                }
                this._occupiedMap.push(newColumn);
            }
        };
        _WorkspaceManager.prototype._createWorkspaceElement = function () {
            var workspaceElement = document.createElement("div");
            workspaceElement.classList.add(classNames._cssWorkspaceClassName);
            this._element = workspaceElement;
            return workspaceElement;
        };
        _WorkspaceManager.prototype._deleteToolAsync = function (toolWindow) {
            return new Promise(function (complete) {
                // Get the corresponding tool data to delete
                var activeWorkspace = utils._settings.workspaces[this._activeWorkspaceIndex];

                // Delete from the array
                activeWorkspace.windows.splice(this._activeToolWindowIndex, 1);

                // Take the page out of the DOM
                toolWindow.parentNode.removeChild(toolWindow);

                // Update the indexes of the tools after the deleted one
                var windowElements = document.body.querySelectorAll(classNames._cssWindowSelector);
                for (var i = this._activeToolWindowIndex, len = windowElements.length; i < len; i++) {
                    windowElements[i].xbdhIndex--;
                }

                this._updateToolWindowDomIndexes();

                // Update the activeToolIndex in case we just deleted the last tool in the workspace. We set it to the 1st tool
                // because that is where default focus will go.
                if (this._activeToolWindowIndex > this._toolWindowDomElements.length - 1) {
                    this._activeToolWindowIndex = 0;
                }

                // Run layout again
                this.layout();

                setImmediate(function () {
                    // Set focus again since previous focus was likely on the tool window we just deleted
                    var workspaceElementRoot = document.body.querySelector(".xbdh-workspace");
                    var newFocusRoot = workspaceElementRoot.querySelector(".xbdh-window");
                    TVJS.DirectionalNavigation.focusRoot = newFocusRoot;
                    TVJS.DirectionalNavigation.enabled = true;
                    if (newFocusRoot) {
                        var newFocus = newFocusRoot.querySelector(".win-focusable, BUTTON:not([disabled]), BUTTON:not([tabIndex='-1']), INPUT:not([disabled]), INPUT:not([tabIndex='-1']), TEXTAREA:not([disabled]), TEXTAREA:not([tabIndex='-1']), SELECT:not([disabled]), SELECT:not([tabIndex='-1']), A:not([disabled]), A:not([tabIndex='-1'])");
                        if (newFocus) {
                            newFocus.focus();
                        }
                    }
                    this._activeToolWindowIndex = 0;
                    complete();
                });

                // Save settings
                var activeWorkspace = utils._settings.workspaces[this._activeWorkspaceIndex];
                activeWorkspace.customized = true;
                utils._localSettings.values["xbdh-customized"] = "true";
                this.saveSettings();
            }.bind(this));
        };
        // Don't put anything resource intensive here since it runs often
        _WorkspaceManager.prototype._doFrequentTimerFunctions = function () {
            try {
                this._verifyNetworkAsync();
            } catch (e){
                // Do nothing. Failures here should not crash DevHome
            }
        };
        _WorkspaceManager.prototype._doTimerFunctions = function () {
            this._updateTime();

            // As soon as we get a LastShutdownReason, we'll show a notification
            // if it was an unexpected shutdown and stop querying for the last
            // shutdown reason.
            if (DevHome.Utilities._lastShutdownReason === "Pending retrieval") {
                try {
                    DevHome.Utilities._lastShutdownReason = Microsoft.Xbox.Development.DebugUtilities.getSimpleSettingStringValue("LastShutdownReason");
                } catch (e) {
                    // Do nothing. Failures here should not crash DevHome
                }

                if (DevHome.Utilities._lastShutdownReason !== "Pending retrieval" &&
                    DevHome.Utilities._lastShutdownReason !== "Unknown" &&
                    DevHome.Utilities._lastShutdownReason !== "Normal") {

                    var titleString = DevHome.Utilities.Resources.getString(DevHome.Utilities._lastShutdownReason).value;

                    var descriptionId = DevHome.Utilities._lastShutdownReason + "_DESC";
                    var descriptionString = DevHome.Utilities.Resources.getString(descriptionId).value;

                    // If we got a unique title/description for this bug, add a notification.
                    if (descriptionString !== descriptionId) {
                        // Add notification.
                        xbdhUtils._addNotification({
                            title: titleString,
                            description: descriptionString,
                            primaryActionId: "xbdh-notification-shutdownreason-dismiss",
                            primaryActionLabel: DevHome.Utilities.Resources.getString("DismissShutdownReason").value,
                            primaryActionCallback: function () {
                                // Remove the notification
                                xbdhUtils._removeNotification({
                                    title: titleString,
                                    description: descriptionString
                                });
                                var dialog = document.getElementById("xbdh-dialog").winControl;
                                dialog.hide();
                            }
                        });
                    }
                }
            }
        };
        _WorkspaceManager.prototype._enterCustomizationMode = function (mode, activeWindow) {
            utils._Events.logUIAction("WorkspaceManager:EnterCustomizeWorkspaceMode", mode);

            document.body.classList.add("xbdh-customizing");

            // Set focus to the active workspace
            setImmediate(function () {
                if (activeWindow) {
                    // Turn off automatic focus
                    this._previousFocus = document.activeElement;
                    this._previousFocusRoot = TVJS.DirectionalNavigation.focusRoot;
                    TVJS.DirectionalNavigation.enabled = false;
                    activeWindow.focus();
                }
            }.bind(this));

            this._customizationMode = mode;
            this._inCustomizationMode = true;
        };
        _WorkspaceManager.prototype._enterSemanticZoomMode = function () {
            utils._Events.logUIAction("WorkspaceManager:EnterSemanticZoom");

            TVJS.DirectionalNavigation.addEventListener("focuschanging", this._handleSemanticZoomFocusChanging, false);

            document.body.classList.add("xbdh-zoomed");
            this._previousFocusRoot = TVJS.DirectionalNavigation.focusRoot;
            this._previousFocus = document.activeElement;
            this._showSemanticZoomView();
            this._inSemanticZoomMode = true;
        };
        _WorkspaceManager.prototype._exitCustomizationMode = function () {
            utils._Events.logUIAction("WorkspaceManager:ExitCustomizeWorkspaceMode", this._customizationMode);

            document.body.classList.remove("xbdh-customizing");

            // Turn on automatic focus
            if (this._previousFocusRoot) {
                TVJS.DirectionalNavigation.focusRoot = this._previousFocusRoot;
                TVJS.DirectionalNavigation.enabled = true;
            }
            if (this._previousFocus) {
                this._previousFocus.focus();
            }
            var activeWorkspace = utils._settings.workspaces[this._activeWorkspaceIndex];
            activeWorkspace.customized = true;
            utils._localSettings.values["xbdh-customized"] = "true";
            this.saveSettings();

            this._customizationMode = "none";
            this._inCustomizationMode = false;
        };
        _WorkspaceManager.prototype._exitSemanticZoom = function () {
            utils._Events.logUIAction("WorkspaceManager:ExitSemanticZoom");

            this._inSemanticZoomMode = false;
            TVJS.DirectionalNavigation.removeEventListener("focuschanging", this._handleSemanticZoomFocusChanging);
            document.body.classList.remove("xbdh-zoomed");
            this._hideSemanticZoomView();
        };
        // Exports the current workspace
        _WorkspaceManager.prototype._exportAsync = async function () {
            var activeWorkspace = utils._settings.workspaces[this._activeWorkspaceIndex];
            var settingsString = JSON.stringify(activeWorkspace);
            var nativeUtils = new Microsoft.Xbox.Tools.DevHome.NativeUtilities();
            var workspaceName = activeWorkspace.name;
            var workspacesFolder = _EXPORTED_WORKSPACES_FOLDER;
            var workspacesFolderFullPath = _DEVELOPER_SCRATCH_DRIVE + _EXPORTED_WORKSPACES_ROOT_FOLDER;
            var workspaceFileName = workspaceName + _WORKSPACE_EXTENSION;

            await nativeUtils.createFolderAsync(workspacesFolder);
            var folder = await nativeUtils.getFolderAsync(workspacesFolderFullPath);
            var file = await folder.createFileAsync(workspaceFileName, Windows.Storage.CreationCollisionOption.replaceExisting);
            await Windows.Storage.FileIO.writeTextAsync(file, settingsString);
        };
        _WorkspaceManager.prototype._getActiveToolWindowIndex = function (focusElement) {
            var activeToolWindowIndex = 0;

            try {
                if (!focusElement) {
                    focusElement = document.activeElement;
                }
                for (var i = 0, len = this._toolWindowDomElements.length; i < len; i++) {
                    if (this._toolWindowDomElements[i].contains(focusElement)) {
                        activeToolWindowIndex = i;
                        break;
                    }
                }
            } catch (e) {
                // Do nothing. DOM must not be initialized or is already cleaned up.
            }
            return activeToolWindowIndex;
        };
        _WorkspaceManager.prototype._getActiveWindow = function (data) {
            var currentFocus = document.activeElement;
            if (!currentFocus) {
                return null;
            }
            var activeWindow = null;
            var toolWindows = document.body.querySelectorAll(classNames._cssWindowSelector);
            for (var i = 0, len = toolWindows.length; i < len; i++) {
                if (toolWindows[i].contains(currentFocus)) {
                    activeWindow = toolWindows[i];
                    break;
                }
            }
            return activeWindow;
        };
        _WorkspaceManager.prototype._getFaderDiv = function () {
            var faderElement = document.getElementById("xbdh-workspacetransitionfader");
            if (!faderElement) {
                faderElement = document.createElement("div");
            }
            return faderElement;
        };
        _WorkspaceManager.prototype._getWorkspacesAvailableForImportAsync = function () {
            try {
                var workspacesFolder = Microsoft.Xbox.Development.StorageUtilities.getFolder(_EXPORTED_WORKSPACES_ROOT_PATH);
                return workspacesFolder.getFilesAsync();
            } catch (ex) {
                if (ex.number === -2147024894) {
                    return new Promise(function (c) { c([]) });
                } else {
                    throw ex;
                }
            }
        };
        _WorkspaceManager.prototype._getWorkspaceIndexById = function (id, workspaces) {
            var index = 0;
            for (var i = 0, len = workspaces.length; i < len; i++) {
                if (workspaces[i].id === id) {
                    index = i;
                    break;
                }
            }
            return index;
        };
        _WorkspaceManager.prototype._setCompatModeText = function (currentConsoleMode) {
            var compatModeButtonLabel = document.getElementById("xbdh-shell-compatMode-label");
            var compatModeButtonExtraMemory = document.getElementById("xbdh-shell-compatMode-extraMemory");
            var consoleMode = Microsoft.Xbox.Development.ConsoleMode;
            var debugUtils = Microsoft.Xbox.Development.DebugUtilities;

            var strings = {
                compatModeUnknownLabel: "",
                compatModeDefaultLabel: "",
                compatModeAnacondaLabel: "",
                compatModeAnacondaProfilingLabel: "",
                compatModeLockhartLabel: "",
                compatModeLockhartProfilingLabel: "",
                compatModeXCloudLabel: "",
                compatModeDanteLabel: "",
                compatModeScorpioDevkitLabel: "",
                compatModeScorpioDevkit44Label: "",
                compatModeScorpioRetailLabel: "",
                compatModeScorpioXboxOneSLabel: "",
                compatModeScorpioXboxOneLabel: "",
                compatModeLockhart40GbLabel: "",
                compatModeTitleExtraMemoryLabel: ""
            };

            strings.compatModeUnknownLabel = DevHome.Utilities.Resources.getString("compatModeUnknownLabel").value;
            strings.compatModeDefaultLabel = DevHome.Utilities.Resources.getString("compatModeDefaultLabel").value;
            strings.compatModeAnacondaLabel = DevHome.Utilities.Resources.getString("compatModeAnacondaLabel").value;
            strings.compatModeAnacondaProfilingLabel = DevHome.Utilities.Resources.getString("compatModeAnacondaProfilingLabel").value;
            strings.compatModeLockhartLabel = DevHome.Utilities.Resources.getString("compatModeLockhartLabel").value;
            strings.compatModeLockhartProfilingLabel = DevHome.Utilities.Resources.getString("compatModeLockhartProfilingLabel").value;
            strings.compatModeXCloudLabel = DevHome.Utilities.Resources.getString("compatModeXCloudLabel").value;
            strings.compatModeDanteLabel = DevHome.Utilities.Resources.getString("compatModeDanteLabel").value;
            strings.compatModeScorpioDevkitLabel = DevHome.Utilities.Resources.getString("compatModeScorpioDevkitLabel").value;
            strings.compatModeScorpioDevkit44Label = DevHome.Utilities.Resources.getString("compatModeScorpioDevkit44Label").value;
            strings.compatModeScorpioRetailLabel = DevHome.Utilities.Resources.getString("compatModeScorpioRetailLabel").value;
            strings.compatModeScorpioXboxOneSLabel = DevHome.Utilities.Resources.getString("compatModeScorpioXboxOneSLabel").value;
            strings.compatModeScorpioXboxOneLabel = DevHome.Utilities.Resources.getString("compatModeScorpioXboxOneLabel").value;
            strings.compatModeLockhart40GbLabel = DevHome.Utilities.Resources.getString("compatModeLockhart40GbLabel").value;
            strings.compatModeTitleExtraMemoryLabel = DevHome.Utilities.Resources.getString("compatModeTitleExtraMemory").value;

            if (debugUtils.extraTitleMemory > 0) {
                var extraTitleMemoryGb = debugUtils.extraTitleMemory / 1024;
                compatModeButtonExtraMemory.textContent = strings.compatModeTitleExtraMemoryLabel;
                compatModeButtonExtraMemory.textContent += " " + extraTitleMemoryGb + " GB";
            }

            switch (currentConsoleMode) {
                case consoleMode.anacondaProfiling:
                    compatModeButtonLabel = strings.compatModeAnacondaProfilingLabel;
                    break;
                case consoleMode.lockhart:
                    compatModeButtonLabel.textContent = strings.compatModeLockhartLabel;
                    break;
                case consoleMode.lockhartProfiling:
                    compatModeButtonLabel.textContent = strings.compatModeLockhartProfilingLabel;
                    break;
                case consoleMode.xCloud:
                    compatModeButtonLabel.textContent = strings.compatModeXCloudLabel;
                    break;
                case consoleMode.scorpioDevkit:
                    compatModeButtonLabel.textContent = strings.compatModeScorpioDevkitLabel;
                    break;
                case consoleMode.scorpioDevkit44:
                    compatModeButtonLabel.textContent = strings.compatModeScorpioDevkit44Label;
                    break;
                case consoleMode.scorpioRetail:
                    compatModeButtonLabel.textContent = strings.compatModeScorpioRetailLabel;
                    break;
                case consoleMode.XboxOneS:
                    compatModeButtonLabel.textContent = string.compatModeScorpioXboxOneSLabel;
                    break;
                    //40GB modes give all the extra memory, we are overwriting here the extra memory label
                    //to not confuse the user with previous values maintained in other modes for when they switch back.
                case consoleMode.dante:
                    compatModeButtonLabel.textContent = strings.compatModeDanteLabel;
                    compatModeButtonExtraMemory.textContent = strings.compatModeTitleExtraMemoryLabel;
                    break;
                case consoleMode.lockhart40GB:
                    compatModeButtonLabel.textContent = strings.compatModeLockhart40GbLabel;
                    compatModeButtonExtraMemory.textContent = strings.compatModeTitleExtraMemoryLabel;
                    break;
                default:
                    compatModeButtonLabel = strings.compatModeDefaultLabel;
                    break;
            };

        };
        _WorkspaceManager.prototype._switchToPerformanceWorkspace = function () {
            var nav = document.getElementById("xbdh-shell-switchworkspace");
            var workspaceOptions = nav.querySelectorAll(".xbdh-shell-workspaceoption");
            var performanceWorkspaceId = "{ED25089C-C12A-4162-9D18-DB068DA3B7BC}";
            var debugUtils = Microsoft.Xbox.Development.DebugUtilities;
            
            // Checks if performanceWorkspace is present before proceeding
            var i = 0;
            var performanceWorkspace = null;
            var currentActiveWorkspace =  null;

            while (i < workspaceOptions.length) {
                var currentWorkspaceId = workspaceOptions[i].getAttribute("data-xbdh-workspaceid");

                if (workspaceOptions[i].classList.contains("xbdh-active")) {
                    currentActiveWorkspace = workspaceOptions[i];
                } 

                if (currentWorkspaceId === performanceWorkspaceId) {
                    performanceWorkspace = workspaceOptions[i];
                }

                i++;
            }

            if (performanceWorkspace != null && currentActiveWorkspace != null) {
                currentActiveWorkspace.classList.remove("xbdh-active");
                performanceWorkspace.classList.add("xbdh-active");
                _workspaceManager._switchWorkspaceAction(performanceWorkspaceId);
            }
            
            
        };
        _WorkspaceManager.prototype._handleNoNextFocusFound = function (e) {
            if (!xyFocus ||
                !xyFocus.focusRoot) {
                return;
            }

            if (xyFocus.focusRoot.classList.contains(classNames._cssWindowClassName)) {
                var keyCode = e.detail.keyCode;
                var newActiveToolWindowIndex = 0;
                var previousFocusRoot = xyFocus.focusRoot;

                var workspaceElement = document.body;
                var direction = xbdhUtils._directionFromKeyCode(keyCode);
                var nextFocus = xyFocus.findNextFocusElement(direction, {
                    focusRoot: workspaceElement
                });
                if (nextFocus) {
                    // Special case the left nav. When focus is moving from the main content to the left
                    // nav, it should go back to the current workspace label instead of nearest neighbor.
                    if (nextFocus.classList.contains("xbdh-shell-workspaceoption")) {
                        var nav = document.getElementById("xbdh-shell-switchworkspace");
                        var currentWorkspaceOption = nav.querySelector(".xbdh-shell-workspaceoption.xbdh-active");
                        if (currentWorkspaceOption) {
                            e.preventDefault();
                            xbdhUtils._trySetActive(currentWorkspaceOption);
                            return;
                        }
                    }

                    // We perform a final check to make sure that automatic focus didn't pick an element that
                    // doesn't make sense.
                    var activeToolWindowElement = this._toolWindowDomElements[this._activeToolWindowIndex];
                    if (activeToolWindowElement) {
                        var activeToolWindowRect = activeToolWindowElement.getBoundingClientRect();
                        var nextFocusRect = nextFocus.getBoundingClientRect();
                        var validFocusTarget = true;
                        if ((keyCode === DevHome.Utilities.Key.GamepadDPadUp ||
                            keyCode === DevHome.Utilities.Key.GamepadLeftThumbstickUp ||
                            keyCode === DevHome.Utilities.Key.upArrow ||
                            keyCode === DevHome.Utilities.Key.GamepadDPadDown ||
                            keyCode === DevHome.Utilities.Key.GamepadLeftThumbstickDown ||
                            keyCode === DevHome.Utilities.Key.downArrow) &&
                            (nextFocusRect.right <= activeToolWindowRect.left ||
                                nextFocusRect.left >= activeToolWindowRect.right)) {
                            validFocusTarget = false;
                        }

                        if (validFocusTarget) {
                            newActiveToolWindowIndex = this._getActiveToolWindowIndex(nextFocus);
                            e.preventDefault();
                            xbdhUtils._trySetActive(nextFocus);
                            this._setActiveToolWindow(newActiveToolWindowIndex);
                            xyFocus.focusRoot = this._toolWindowDomElements[newActiveToolWindowIndex];
                            TVJS.DirectionalNavigation.enabled = true;
                        } else {
                            // We didn't move focus so set the focus root back
                            xyFocus.focusRoot = previousFocusRoot;
                            TVJS.DirectionalNavigation.enabled = true;
                        }
                    } else {
                        // We didn't move focus so set the focus root back
                        xyFocus.focusRoot = previousFocusRoot;
                        TVJS.DirectionalNavigation.enabled = true;
                    }
                } else {
                    // We didn't move focus so set the focus root back
                    xyFocus.focusRoot = previousFocusRoot;
                    TVJS.DirectionalNavigation.enabled = true;
                }
            }
        };
        _WorkspaceManager.prototype._handleResize = function () {
            this.layout();

            // Re-focus the active tool window
            setImmediate(function () {
                this._setActiveToolWindow(this._activeToolWindowIndex);
            }.bind(this));
        },
            _WorkspaceManager.prototype._handleSemanticZoomFocusChanging = function (e) {
                // Check if focus has left a workspace & if so, scroll it into view
                var nextFocus = e.detail.nextFocusElement;
                // Try to find a focus target in another workspace
                if (!nextFocus) {
                    var currentFocus = document.activeElement;

                    var keyCode = e.detail.keyCode;
                    var previousFocusRoot = xyFocus.focusRoot;

                    var workspaceContainer = document.body.querySelector(".xbdh-zoomed-container");
                    var direction = xbdhUtils._directionFromKeyCode(e.detail.keyCode);
                    nextFocus = xyFocus.findNextFocusElement(direction, {
                        focusRoot: workspaceContainer
                    });
                    if (nextFocus) {
                        // First find the workspace that the focus element is part of
                        var nextWorkspace = null;
                        var zoomedWorkspaces = workspaceContainer.querySelectorAll(".xbdh-zoomed-workspace");
                        for (var i = 0, len = zoomedWorkspaces.length; i < len; i++) {
                            if (zoomedWorkspaces[i].contains(nextFocus)) {
                                nextWorkspace = zoomedWorkspaces[i];
                                break;
                            }
                        }

                        // Zoom it into view
                        var nextWorkspaceRect = nextWorkspace.getBoundingClientRect();
                        var yScrollPos = nextWorkspaceRect.top + 204;
                        workspaceContainer.msZoomTo({ contentX: 0, contentY: yScrollPos, viewportX: 0, viewportY: 0 });

                        xyFocus.focusRoot = nextWorkspace;
                        TVJS.DirectionalNavigation.enabled = true;
                        xbdhUtils._trySetActive(nextFocus);
                    } else {
                        // We didn't move focus so set the focus root back
                        xyFocus.focusRoot = previousFocusRoot;
                        TVJS.DirectionalNavigation.enabled = true;
                    }
                }
            },
            _WorkspaceManager.prototype._handleSemanticZoomNavigate = function (targetWindowIndex, targetWorkspaceIndex) {
                this._exitSemanticZoom();
                if (targetWorkspaceIndex !== this._activeWorkspaceIndex) {
                    // If we're not already on the target workspace, then switch to the target workspace
                    this.switchWorkspaceAsync(targetWorkspaceIndex).then(function () {
                        this._setActiveToolWindow(targetWindowIndex);
                        var activeToolWindowElement = this._toolWindowDomElements[this._activeToolWindowIndex];
                        TVJS.DirectionalNavigation.focusRoot = activeToolWindowElement;
                        TVJS.DirectionalNavigation.enabled = true;
                        setImmediate(function () {
                            utils.setFocusToFirstFocusableElement();
                        });
                    }.bind(this), function () { /* No-op */ });
                } else {
                    this._setActiveToolWindow(targetWindowIndex);
                    var activeToolWindowElement = this._toolWindowDomElements[this._activeToolWindowIndex];
                    TVJS.DirectionalNavigation.focusRoot = activeToolWindowElement;
                    TVJS.DirectionalNavigation.enabled = true;
                    setImmediate(function () {
                        utils.setFocusToFirstFocusableElement();
                    });
                }
            };
        _WorkspaceManager.prototype._handleSemanticZoomNavigateInvoked = function (e) {
            var selectedElement = e.srcElement;
            // Find the workspace that current has focus
            var targetWindowIndex = parseInt(selectedElement.getAttribute("data-xbdh-windowindex"));
            var targetWorkspaceIndex = parseInt(selectedElement.getAttribute("data-xbdh-workspaceindex"));
            this._handleSemanticZoomNavigate(targetWindowIndex, targetWorkspaceIndex);
        };
        _WorkspaceManager.prototype._hideSemanticZoomView = function () {
            utils.show(this._element);
            var header = document.getElementById("xbdh-shell-header");
            utils.show(header);
            var zoomedContainer = document.body.querySelector(".xbdh-zoomed-container");
            zoomedContainer.parentNode.removeChild(zoomedContainer);
        };
        _WorkspaceManager.prototype._initializeHeader = function () {
            var systemProperties = Microsoft.Xbox.Tools.ConsoleExtensions.SystemConfigurationProperties;

            // If the DOM for the header isn't created yet, then create it
            var header = document.getElementById("xbdh-shell-header");
            if (!header) {
                header = document.createElement("div");
                header.id = "xbdh-shell-header";
                header.classList.add("xbdh-shell-header");
                header.innerHTML = '<div id="xbdh-shell-header" class="xbdh-shell-header">' +
                    '    <div class="xbdh-shell-header-left">' +
                    '        <div class="xbdh-shell-title">' +
                    '            <span id="xbdh-shell-title-devhome" class="xbdh-shell-title-devhome"></span>' +
                    '        <div class="xbdh-shell-title-metadata">' +
                    '            <span id="xbdh-shell-title-metadata-hostname"></span>' +
                    '            <span id="xbdh-shell-title-metadata-consoleip"></span>' +
                    '            <span id="xbdh-shell-title-metadata-sandboxid"></span>' +
                    '            <span id="xbdh-shell-title-metadata-osversion"></span>' +
                    '        </div>' +
                    '    </div>' +
                    '    <div class="xbdh-shell-header-right">' +
                    '    </div>' +
                    '</div>';
                var workspaceContainer = document.body.querySelector(".xbdh-workspace");
                workspaceContainer.parentNode.insertBefore(header, workspaceContainer);
            }

            // Initialize the strings
            var hostNameLabel = document.getElementById("xbdh-shell-title-metadata-hostname-label");
            hostNameLabel.textContent = DevHome.Utilities.Resources.getString("shellHostNameLabel").value;
            var hostNameValue = document.getElementById("xbdh-shell-title-metadata-hostname-value");
            try {
                hostNameValue.textContent = systemProperties.hostName;
            } catch (ex) { }

            var consoleIpLabel = document.getElementById("xbdh-shell-title-metadata-consoleip-label");
            consoleIpLabel.textContent = DevHome.Utilities.Resources.getString("shellConsoleIPLabel").value;

            // Always initialize the IP through this method to avoid orphaned notifications.
            this._verifyNetworkAsync();

            var sandboxIdLabel = document.getElementById("xbdh-shell-title-metadata-sandboxid-label");
            sandboxIdLabel.textContent = DevHome.Utilities.Resources.getString("shellSandboxLabel").value;
            var sandboxIdValue = document.getElementById("xbdh-shell-title-metadata-sandboxid-value");
            try {
                sandboxIdValue.textContent = systemProperties.sandboxId;
            } catch (ex) { }

            var osversionLabel = document.getElementById("xbdh-shell-title-metadata-osversion-label");
            var osversionLabelText = DevHome.Utilities.Resources.getString("shellOSVersionLabel").value;
            try {
                osversionLabelText += systemProperties.systemVersion;
            } catch (ex) { }
            osversionLabel.textContent = osversionLabelText;
            var osversionValue = document.getElementById("xbdh-shell-title-metadata-osversion-value");
            try {
                osversionValue.textContent = systemProperties.systemVersionFriendlyName;
            } catch (ex) { }

            //Initialize compatModeButton
            var compatModeButton = document.getElementById("xbdh-shell-compatMode");
            compatModeButton.addEventListener("click", this._switchToPerformanceWorkspace, false);

            // For the clock
            this._dateFormatter = new Windows.Globalization.DateTimeFormatting.DateTimeFormatter(
                Windows.Globalization.DateTimeFormatting.YearFormat.default,
                Windows.Globalization.DateTimeFormatting.MonthFormat.default,
                Windows.Globalization.DateTimeFormatting.DayFormat.default,
                Windows.Globalization.DateTimeFormatting.DayOfWeekFormat.default
            );
            this._timeFormatter = DevHome.Utilities.getTimeFormatter();
            this._updateTime();
            // We only show minutes so we only update the time every 30 seconds.
            this._timerFunctionsCookie = setInterval(this._doTimerFunctionsBound, 30000);
            this._frequentTimerFunctionsCookie = setInterval(this._doFrequentTimerFunctionsBound, 5000);
        };
        _WorkspaceManager.prototype._layout = function (fixedElements, firstTime) {

            // Get all elements
            var workspaceElement = document.body.querySelector(classNames._cssWorkspaceSelector);
            if (!workspaceElement) {
                return;
            }
            var windows = workspaceElement.querySelectorAll(classNames._cssWindowSelector);

            if (firstTime) {
                // Read from settings
                if (utils._settings) {
                    var windowData = utils._settings.workspaces[this._activeWorkspaceIndex].windows;

                    for (var i = 0, len = windows.length; i < len; i++) {
                        var currentWindow = windows[i];

                        if (windowData.length <= currentWindow.xbdhIndex) {
                            return;
                        }

                        var currentWindowData = windowData[currentWindow.xbdhIndex].layout;
                        currentWindow.row = currentWindowData.row;
                        currentWindow.col = currentWindowData.col;
                        currentWindow.rowspan = currentWindowData.rowspan;
                        currentWindow.colspan = currentWindowData.colspan;
                        currentWindow.layoutIndex = i + 1;
                    }
                }
            } else {
                this._clearOccupiedMap();

                // If we have fixed elements, then place those in the occupancy map before laying out the other items
                if (fixedElements) {
                    // Fill in fixed element indexes
                    for (var i = 0; i < fixedElements.length; i++) {
                        var fixedElement = fixedElements[i];
                        for (var j = fixedElement.col - 1; j < fixedElement.col + fixedElement.colspan - 1 && j < this._occupiedMap.length; j++) {
                            for (var k = fixedElement.row - 1; k < fixedElement.row + fixedElement.rowspan - 1 && k < this._occupiedMap[j].length; k++) {
                                this._occupiedMap[j][k] = fixedElement.layoutIndex;
                            }
                        }
                    }
                }

                // Go through items in order
                for (var i = 0; i < windows.length; i++) {
                    var currentWindow = windows[i];
                    var isFixedElement = false;
                    if (fixedElements) {
                        for (var j = 0; j < fixedElements.length; j++) {
                            if (currentWindow === fixedElements[j]) {
                                isFixedElement = true;
                                break;
                            }
                        }
                        if (isFixedElement) {
                            // Don't layout the fixed elements
                            continue;
                        }
                    }

                    // Find the 1st empty space
                    var spaceAvailable = false;
                    for (var j = 0; j < this._occupiedMap.length; j++) {
                        var currentColumn = this._occupiedMap[j];
                        for (var k = 0; k < currentColumn.length; k++) {
                            // See if the spot is empty
                            if (currentColumn[k] === 0) {
                                // Now see if it's big enough
                                // Probably a more intuitive way of doing this.
                                spaceAvailable = true;
                                var height = currentWindow.rowspan;
                                var width = currentWindow.colspan;
                                for (var l = j; l < width + j; l++) {
                                    for (var m = k; m < height + k; m++) {
                                        if (l >= this._occupiedMap.length ||
                                            m >= this._occupiedMap[l].length ||
                                            this._occupiedMap[l][m] !== 0) {
                                            spaceAvailable = false;
                                            break;
                                        }
                                    }
                                }
                                // If we found space, put the object there
                                if (spaceAvailable) {
                                    // Update the occupied map
                                    for (var l = j; l < width + j; l++) {
                                        for (var m = k; m < height + k; m++) {
                                            this._occupiedMap[l][m] = i + 1;
                                        }
                                    }

                                    // Update the element
                                    // Note: We add 1 since -ms-grid rows & columns start from 1, not 0
                                    currentWindow.col = j + 1;
                                    currentWindow.row = k + 1;
                                    break;
                                }
                            }
                        }
                        if (spaceAvailable) {
                            break;
                        }
                    }
                }
            }

            // Actually do layout
            var layoutChanged = !firstTime;
            this._arrange(layoutChanged);
        };
        // Resets the app settings to the default
        _WorkspaceManager.prototype._getDefaultSettingsAsync = async function (shouldSave) {
            utils._certType = utils.Cert.era;
            utils._settings = await this._getDefaultAdvancedDevkitConfigurationAsync();
            if (shouldSave) {
                this.saveSettings();
            }
        };
        // Loads settings for the app. Settings can either be identified by name, by user or neither. If no
        // user or name is specified, then the default configuration will be loaded.
        _WorkspaceManager.prototype._loadSettingsAsync = async function (name, user) {
            if (utils._settings) {
                // Case 1 - Settings are already loaded in memory
                return;
            } else {
                // Case 2 - Settings are in local storage

                // See if there are saved settings without doing a file read.
                if (false && utils._localSettings.values["xbdh-customized"]) {
                    try {
                        var settingsString = localStorage.getItem("xbdh-settings");
                        var appSettings;
                        if (settingsString) {
                            appSettings = JSON.parse(settingsString);
                        }
                        utils._settings = appSettings;
                        this._upgradeIfRequired();

                        // Remove RaP workspace on UWP if cloud setting disables it.
                        if (utils._certType === utils.Cert.uwp) {
                            let foundRaPWorkspaceIndex = utils._settings.workspaces.findIndex(
                                el => el.id === this._reportAProblemWorkspaceElement.id
                            );

                            if (foundRaPWorkspaceIndex > -1) {
                                let devRapUWPEnabled = false;
                                try {
                                    var nativeUtils = xbdhUtils.getDevHomeNativeUtilities();
                                    devRapUWPEnabled = await nativeUtils.getIsDevRaPUWPEnabledAsync();
                                } catch (error) {
                                    // Proceed without RaP.
                                    utils._Events.logError(error.number, error.message, new Error().stack);
                                }

                                if (!devRapUWPEnabled) {
                                    utils._settings.workspaces.splice(foundRaPWorkspaceIndex, 1);
                                }
                            }
                        }
                    } catch (ex) {
                        // Case 4 - There's an error reading the settings file, revert to
                        // the default settings.
                        await this._getDefaultSettingsAsync(true);
                    }
                } else {
                    // Case 3 - No settings in local storage, use the defaults
                    await this._getDefaultSettingsAsync(false);
                }
            }

            // Yield to nameResourceId if available to localize workspace name. Keep name value to maintain export computability with pre localized DevHomes.
            var workspaces = utils._settings.workspaces;
            for (var i = 0, len = workspaces.length; i < len; i++) {
                var currentWorkspace = workspaces[i];
                if (currentWorkspace.nameResourceId) {
                    currentWorkspace.name = DevHome.Utilities.Resources.getString(currentWorkspace.nameResourceId).value;
                }
            }
        };
        _WorkspaceManager.prototype._loadSettingsFromLocalFolderAsync = function () {
            // Reads current workspace data from local storage
            var applicationData = Windows.Storage.ApplicationData.current;
            // We use temp storage because there is a bug in the Xbox One local storage implementation
            var tempFolder = applicationData.temporaryFolder;
            return new Promise(function (complete, error) {
                // getFileAsync throws an exception if Dev Home is being installed the first time and there are no local settings
                try {
                    tempFolder.getFileAsync(_APP_SETTINGS_FILENAME)
                        .then(function (file) {
                            return Windows.Storage.FileIO.readTextAsync(file);
                        }, function () {
                            error();
                        }).then(function (fileData) {
                            try {
                                var settings = JSON.parse(fileData);
                                complete(settings);
                            } catch (ex) {
                                error(ex);
                            }
                        }, function () {
                            error();
                        });
                } catch (ex) {
                    complete(null);
                }
            });
        };
        _WorkspaceManager.prototype._loadWorkspaceAsync = async function (data) {
            // Start asynchronously loading window content
            var windows = null;
            if (data && data.windows) {
                // The developer passed us the data for the workspace
                windows = data.windows;
            } else {
                // The developer passed us the location for the workspace so we need to
                // find the corresponding window data for that workspace.
                var workspaceIndex = -1;
                var workspaces = utils._settings.workspaces;
                for (var i = 0, len = workspaces.length; i < len; i++) {
                    var windowFound = false;
                    var currentWindow = workspaces[i].windows;
                    for (var j = 0, winLen = windows.length; j < winLen; j++) {
                        if (windows[j].uri === location) {
                            windowFound = true;
                            break;
                        }
                    }
                    if (windowFound) {
                        workspaceIndex = i;
                        break;
                    }
                }
                if (workspaceIndex === -1) {
                    throw new Error("Workspace not found. Make sure the workspace with specified URI exists.");
                } else {
                    windows = workspaces[i].windows;
                }
            }

            this._refreshTheme();

            _loadWindowsPromise = this._loadWindowsAsync(windows, this._element);
            splashscreen_remove();
            await _loadWindowsPromise;
        };
        _WorkspaceManager.prototype._initializeAppAsync = async function (args) {
            var nativeUtils = xbdhUtils.getDevHomeNativeUtilities();

            utils._fullCertType = await nativeUtils.getCertTypeAsync();

            // Set the devkit type. We will use this property to show different UI based on what type of
            // devkit the user has.
            if (false) {
                utils._certType = utils.Cert.uwp;
                document.body.classList.add("xbdh-uwp");
            } else {
                utils._certType = utils.Cert.era;
                document.body.classList.add("xbdh-era");
            }

            // Set the console type.
            var consoleType = await nativeUtils.getConsoleTypeAsync();
            if (consoleType === Microsoft.Xbox.Development.ConsoleType.dante) {
                utils._consoleType = utils.ConsoleType.dante;
            } else if (consoleType === Microsoft.Xbox.Development.ConsoleType.anaconda) {
                utils._consoleType = utils.ConsoleType.scarlettOther;
            } else if (consoleType === Microsoft.Xbox.Development.ConsoleType.lockhart) {
                utils._consoleType = utils.ConsoleType.lockhart;
            } else if (consoleType === Microsoft.Xbox.Development.ConsoleType.edinburgh) {
                utils._consoleType = utils.ConsoleType.scarlettOther;
            } else if (consoleType === Microsoft.Xbox.Development.ConsoleType.xboxOneXDevkit) {
                utils._consoleType = utils.ConsoleType.scorpioDevkit;
            } else if (consoleType === Microsoft.Xbox.Development.ConsoleType.xboxOneX) {
                utils._consoleType = utils.ConsoleType.scorpioRetail;
            } else if (consoleType === Microsoft.Xbox.Development.ConsoleType.xboxOneS) {
                utils._consoleType = utils.ConsoleType.xboxOneS;
            } else if (consoleType === Microsoft.Xbox.Development.ConsoleType.other) {
                utils._consoleType = utils.ConsoleType.other;
            } else {
                utils._consoleType = utils.ConsoleType.xboxOne;
            }

            // Some consoles have extra features.
            if (utils._consoleType === utils.ConsoleType.scorpioDevkit || utils._consoleType === utils.ConsoleType.scorpioRetail || utils._consoleType === utils.ConsoleType.dante) {
                document.body.classList.add("xbdh-scorpio");
            } else {
                document.body.classList.add("xbdh-xboxone");
            }


            try {
                await this._loadSettingsAsync();
                // Initialize variables
                this._menu = new DevHome.UI._Menu(null, { commands: utils._settings.commands });
                this._contextMenu = new DevHome.UI.ContextMenu();

                setImmediate(function () {
                    if (!this._disposed) {
                        this._initializeHeader();
                    }
                }.bind(this));

                // See if we need to show the 1st run experience
                this._showFirstRunExperience();

                // Figure out where to navigate to
                // Default to the 1st workspace
                var newWorkspaceIndex = 0;
                var defaultWorkspaceId = utils._settings.appSettings.workspaces.defaultWorkspace;
                if (defaultWorkspaceId) {
                    newWorkspaceIndex = this._getWorkspaceIndexById(defaultWorkspaceId, utils._settings.workspaces);
                }

                // Create the UI
                var switchWorkspaceAsyncTask = this.switchWorkspaceAsync(newWorkspaceIndex);

                // Do non-critical tasks
                setImmediate(function () {
                    if (this._disposed) {
                        return;
                    }

                    this._initializeWorkspaceSwitcher();

                    // Put code that's not critical to startup in here.
                    setTimeout(function performNonCriticalWork() {

                        // Set up the handler for when a notification comes in
                        Microsoft.Xbox.Development.UnattendedUtilities.addEventListener("notificationreceived", xbdhUtils._addNotification);

                        // Set up the handler for when a script starts running
                        Microsoft.Xbox.Development.UnattendedUtilities.addEventListener("scriptrunningchanged", xbdhUtils._checkForUnattendedScript);

                        // We could have already missed the event if it happened before DevHome finished launching,
                        // so do an initial check to see if a script is already running.
                        xbdhUtils._checkForUnattendedScript();

                        // Check if we're running in a console mode
                        this._checkForConsoleModeAsync();

                        // Check if we're connected to WiFi
                        this._checkForWifiAsync();

                        // Verify IP Addresses and port connections
                        this._verifyNetworkAsync(true);

                        // Log launch event
                        var launchArgs = args;
                        var viewState = utils.viewState;
                        var numberOfWorkspaces = utils._settings.workspaces.length;
                        var backgroundUri = utils._settings.appSettings.backgroundImage;
                        var themeAccentColor = utils._settings.appSettings.backgroundImage;
                        utils._Events.logAppLaunch(launchArgs, viewState, numberOfWorkspaces, backgroundUri, themeAccentColor);

                        // Set up timer for hiding the mouse cursor after a period of time with no activity
                        var timer;
                        document.addEventListener("mousemove", function () {
                            if (timer) {
                                clearTimeout(timer);
                                timer = 0;
                            }

                            if (document && document.body && document.body.style) {
                                document.body.style.cursor = '';
                            }

                            timer = setTimeout(function () {
                                if (document && document.body && document.body.style) {
                                    document.body.style.cursor = 'none';
                                }
                            }, 5000);
                        });

                        // Check if a web proxy is enabled
                        setTimeout(function performExpensiveNonCriticalWork() {

                            // Check if this is deprecated hardware
                            this._checkForDeprecatedHardware();

                            // Check if a web proxy is enabled
                            this._checkForWebProxy();

                            // Check if we've done a self-heal due to a corrupt default user
                            this._checkForCorruptProfileSelfHeal();

                        }.bind(this), 5000);
                    }.bind(this), 500);

                }.bind(this));

                await switchWorkspaceAsyncTask;
            } catch (e) {
                var errorTitle = DevHome.Utilities.Resources.getString("errorCouldNotLoadWorkspaceTitle").value;
                var errorMessage = DevHome.Utilities.Resources.getString("errorCouldNotLoadWorkspaceDescription").value;
                utils.showError(null, errorTitle, errorMessage);
            }
        };
        _WorkspaceManager.prototype._initializeWorkspaceWindowLayoutInfo = function (windowElement, layoutData) {
            windowElement.col = layoutData.col;
            windowElement.row = layoutData.row;
            windowElement.colspan = layoutData.colspan;
            windowElement.rowspan = layoutData.rowspan;
        };
        _WorkspaceManager.prototype._initializeWorkspaceSwitcher = function () {
            this._refreshWorkspaceSwitcher();
        };
        _WorkspaceManager.prototype._loadBuiltInWindowAsync = async function (containerElement, windowData) {
            var parentedComplete = null;
            var parentedPromise = null;
            parentedPromise = new Promise(function (c) { parentedComplete = c; });

            var currentWorkspaceIndex = this._activeWorkspaceIndex;
            var control = await WinJS.UI.Pages.render(windowData.uri, containerElement, null, parentedPromise);
            if (this._disposed || (currentWorkspaceIndex !== this._activeWorkspaceIndex)) {
                return;
            }

            var windowElement = control.element;
            this._element.appendChild(windowElement);
            parentedComplete();
            DevHome.Utilities.Resources.processAll(windowElement);
        },
            _WorkspaceManager.prototype._loadPackagedToolAsync = async function (windowData, windowIndex) {
                // Create the UI control
                var css = "";
                var html = "";
                var javascript = "";

                var openCssFilePromises = [];
                var openHtmlFilePromises = [];
                var openJsFilePromises = [];

                var activeWorkspace = this.settings.workspaces[this._activeWorkspaceIndex];

                var folder = await Windows.Storage.StorageFolder.getFolderFromPathAsync(windowData.uri)
                var files = await folder.getFilesAsync();

                for (var j = 0, len = files.length; j < len; j++) {
                    var file = files[j];

                    if (file.fileType === ".css") {
                        var openCssFilePromise = (async () => {
                            css = await Windows.Storage.FileIO.readTextAsync(file);
                        })();
                        openCssFilePromises.push(openCssFilePromise);
                    }

                    if (file.fileType === ".html") {
                        var openHtmlFilePromise = (async () => {
                            html = await Windows.Storage.FileIO.readTextAsync(file);
                        })();
                        openHtmlFilePromises.push(openHtmlFilePromise);
                    }

                    if (file.fileType === ".js") {
                        var openJsFilePromise = (async () => {
                            javascript = await Windows.Storage.FileIO.readTextAsync(file);
                        })();
                        openJsFilePromises.push(openJsFilePromise);
                    }
                }

                var openFilePromises = openCssFilePromises.concat(openHtmlFilePromises, openJsFilePromises);
                await Promise.all(openFilePromises);
                var containerEl = document.createElement("div");
                containerEl.classList.add("xbdh-window");

                var currentWindow = activeWorkspace.windows[windowIndex];

                var name = "";
                if (currentWindow.nameResourceId) {
                    name = DevHome.Utilities.Resources.getString(currentWindow.nameResourceId).value;
                } else if (currentWindow.name) {
                    name = currentWindow.name;
                }
                containerEl.workspaceName = name;
                containerEl.xbdhIndex = windowIndex;

                this._initializeWorkspaceWindowLayoutInfo(containerEl, currentWindow.layout);

                var htmlString = "";

                // Find the body of the HTML
                var htmlDoc = document.implementation.createHTMLDocument("frag");
                htmlDoc.documentElement.innerHTML = html;
                var bodyHtml = htmlDoc.documentElement.querySelector("body").innerHTML;
                // Add the local styles and title bar
                htmlString += '<style>' + css + '</style><h2 class="xbdh-window-title xbdh-fontweight-light win-focusable xbdh-showmenuicononhover" tabIndex="0">' + name + '</h2>' + bodyHtml;
                containerEl.innerHTML = htmlString;
                // Eval the JavaScript
                /// <disable>JS2001</disable>
                eval(javascript);

                var windowElement = containerEl;
                var workspaceElement = document.body.querySelector(".xbdh-workspace");
                var firstWindowElement = workspaceElement.querySelector(".xbdh-window");
                if (firstWindowElement) {
                    firstWindowElement.parentNode.insertBefore(windowElement, firstWindowElement);
                } else {
                    workspaceElement.appendChild(windowElement);
                }
                DevHome.Utilities.Resources.processAll(windowElement);
            };
        _WorkspaceManager.prototype._loadRemoteHostedWindow = function (conatainerElement, windowData) {
            var frame = document.createElement("iframe");
            frame.classList.add("xbdh-remotetool-host");
            frame.src = windowData.uri;
            conatainerElement.appendChild(frame);
            this._placeNewWindow(conatainerElement);
        },
        _WorkspaceManager.prototype._loadWindowAsync = async function (window, workspaceElement, windowIndex) {
            /// <signature>
            /// <summary>
            /// This function is responsible for rendering the HTML for a single tool window.
            /// </summary>
            /// </signature>
            var containerEl = document.createElement("section");
            containerEl.classList.add(classNames._cssWindowClassName);

            // Add the title bar
            var titleBarEl = document.createElement("h2");
            titleBarEl.classList.add(classNames._cssWindowTitleClassName);
            titleBarEl.classList.add("win-focusable");

            var name = "";
            if (window.nameResourceId) {
                name = DevHome.Utilities.Resources.getString(window.nameResourceId).value;
            } else if (window.name) {
                name = window.name;
            }
            var ariaLabel = `${name}. ${DevHome.Utilities.Resources.getString("windowTitleDescription").value}`;
            titleBarEl.tabIndex = 0;
            titleBarEl.textContent = name;
            titleBarEl.setAttribute('aria-label', ariaLabel);

            //view icon for title bar
            var iconView = document.createElement("img");
            iconView.classList.add("xbdh-viewicon");
            iconView.classList.add("xbdh-viewicon-hidemenuicononhover");
            iconView.setAttribute("aria-label", DevHome.Utilities.Resources.getString("windowTitleDescription").value);
            iconView.setAttribute("role", "menu");
            iconView.setAttribute("src", "/framework/media/view-icon.svg");

            titleBarEl.appendChild(iconView);

            titleBarEl.addEventListener("focus", this._handleWindowTitleFocus.bind(this), false);
            titleBarEl.addEventListener("blur", this._handleWindowTitleBlur.bind(this), false);

            containerEl.appendChild(titleBarEl);
            containerEl.setAttribute('aria-label', name);

            containerEl.workspaceName = name;
            containerEl.xbdhIndex = windowIndex;

            var type = window.type;
            if (type === windowType.packaged) {
                await this._loadPackagedToolAsync(window, windowIndex);
            } else if (type === windowType.hosted) {
                this._loadRemoteHostedWindow(containerEl, window);
            } else {
                await this._loadBuiltInWindowAsync(containerEl, window);
            }
            containerEl.addEventListener("click", this._handleWindowClick.bind(this), false);
        };
        _WorkspaceManager.prototype._handleWindowClick = function (e) {
            var srcElement = e.srcElement;

            var newActiveToolWindowIndex = this._getActiveToolWindowIndex(srcElement);

            if (newActiveToolWindowIndex != this._activeToolWindowIndex) {
                this._setActiveToolWindow(newActiveToolWindowIndex);
                xyFocus.focusRoot = this._toolWindowDomElements[newActiveToolWindowIndex];
            }
        };
        _WorkspaceManager.prototype._handleWindowTitleFocus = function (e) {
            var srcElement = e.srcElement;

            var viewIcon = srcElement.querySelector(".xbdh-viewicon");

            if (viewIcon) {
                viewIcon.classList.remove("xbdh-viewicon-hidemenuicononhover");
                viewIcon.classList.add("xbdh-viewicon-showmenuicononhover");
            }
        };
        _WorkspaceManager.prototype._handleWindowTitleBlur = function (e) {
            var srcElement = e.srcElement;

            var viewIcon = srcElement.querySelector(".xbdh-viewicon");

            if (viewIcon) {
                viewIcon.classList.remove("xbdh-viewicon-showmenuicononhover");
                viewIcon.classList.add("xbdh-viewicon-hidemenuicononhover");
            }
        };
        _WorkspaceManager.prototype._loadWindowsAsync = function (windows, workspaceElement) {
            /// <signature>
            /// <summary>
            /// This function is responsible for rendering the HTML for the tools windows.
            /// </summary>
            /// </signature>
            var windowLoadPromises = [];
            for (var i = 0, len = windows.length; i < len; i++) {
                windowLoadPromises.push(this._loadWindowAsync(windows[i], workspaceElement, i));
            }
            return Promise.all(windowLoadPromises);
        };
        _WorkspaceManager.prototype._keyDownHandler = function (e) {
            var key = DevHome.Utilities.Key;
            var target = document.activeElement.parentNode;
            if (target &&
                _workspaceManager._inCustomizationMode) {
                if (_workspaceManager._customizationMode === "move") {
                    switch (e.keyCode) {
                        case key.upArrow:
                        case key.GamepadDPadUp:
                        case key.GamepadLeftThumbstickUp:
                            this._move(target, "up");
                            break;
                        case key.downArrow:
                        case key.GamepadDPadDown:
                        case key.GamepadLeftThumbstickDown:
                            this._move(target, "down");
                            break;
                        case key.leftArrow:
                        case key.GamepadDPadLeft:
                        case key.GamepadLeftThumbstickLeft:
                            this._move(target, "left");
                            break;
                        case key.rightArrow:
                        case key.GamepadDPadRight:
                        case key.GamepadLeftThumbstickRight:
                            this._move(target, "right");
                            break;
                        default:
                            // No-op
                            break;
                    };
                } else if (_workspaceManager._customizationMode === "resize") {
                    switch (e.keyCode) {
                        case key.upArrow:
                        case key.GamepadDPadUp:
                        case key.GamepadLeftThumbstickUp:
                            this._resize(target, "-height");
                            break;
                        case key.leftArrow:
                        case key.GamepadDPadLeft:
                        case key.GamepadLeftThumbstickLeft:
                            this._resize(target, "-width");
                            break;
                        case key.downArrow:
                        case key.GamepadDPadDown:
                        case key.GamepadLeftThumbstickDown:
                            this._resize(target, "+height");
                            break;
                        case key.rightArrow:
                        case key.GamepadDPadRight:
                        case key.GamepadLeftThumbstickRight:
                            this._resize(target, "+width");
                            break;
                        default:
                            // No-op
                            break;
                    };
                }
            } else {
                // Shoulder buttons are shortcuts to switch the workspace (but only
                // if we don't have an overlay up).
                if (!DevHome.Utilities.hasVisibleOverlay()) {
                    switch (e.keyCode) {
                        case key.pageUp:
                        case key.GamepadLeftShoulder:
                            var currentTime = Date.now();
                            if (this._activeWorkspaceIndex > 0 &&
                                currentTime - this._lastWorkspaceSwitchTime > 200) {
                                this._lastWorkspaceSwitchTime = currentTime;
                                this.switchWorkspaceAsync(this._activeWorkspaceIndex - 1, false).then(function () { }, function () { });
                            }
                            break;
                        case key.pageDown:
                        case key.GamepadRightShoulder:
                            if (this.settings) {
                                var currentTime = Date.now();
                                if (this._activeWorkspaceIndex < this.settings.workspaces.length - 1 &&
                                    currentTime - this._lastWorkspaceSwitchTime > 200) {
                                    this._lastWorkspaceSwitchTime = currentTime;
                                    this.switchWorkspaceAsync(this._activeWorkspaceIndex + 1, false).then(function () { }, function () { });
                                }
                            }
                            break;
                        default:
                            // No-op
                            break;
                    };
                }
            }
        };
        _WorkspaceManager.prototype._keyupHandler = function (e) {
            var key = DevHome.Utilities.Key;
            switch (e.keyCode) {
                case keys.space:
                case keys.enter:
                case keys.GamepadA:
                case keys.escape:
                case keys.GamepadB:
                    if (this._inCustomizationMode) {
                        this._exitCustomizationMode();
                    } else if (this._inSemanticZoomMode) {
                        this._exitSemanticZoom();
                        if (this._previousFocusRoot) {
                            TVJS.DirectionalNavigation.focusRoot = this._previousFocusRoot;
                            TVJS.DirectionalNavigation.enabled = true;
                        }
                        if (this._previousFocus) {
                            this._previousFocus.focus();
                        }
                    }
                    break;
                default:
                    // No-op
                    break;
            }
        };
        _WorkspaceManager.prototype._move = function (target, direction) {
            // See if there's space.
            // Decide where the desired location is
            var newLocation = {
                row: target.row,
                col: target.col,
                rowspan: target.rowspan,
                colspan: target.colspan
            };

            switch (direction) {
                case "left":
                    if (newLocation.col - 1 > 0) {
                        newLocation.col -= 1;
                    }
                    break;
                case "right":
                    if (newLocation.col + newLocation.colspan <= this._MAX_COLS) {
                        newLocation.col += 1;
                    }
                    break;
                case "up":
                    if (newLocation.row - 1 > 0) {
                        newLocation.row -= 1;
                    }
                    break;
                case "down":
                    if (newLocation.row + newLocation.rowspan <= this._MAX_ROWS) {
                        newLocation.row += 1;
                    }
                    break;
                default:
                    // No-op
                    break;
            };

            // See if anyone's already there
            var collisions = [];
            var windows = document.body.querySelectorAll(classNames._cssWindowSelector);
            for (var i = 0, len = windows.length; i < len; i++) {
                // Don't care about the element we're moving
                if (target === windows[i]) {
                    continue;
                }
                if ((newLocation.col > windows[i].col + (windows[i].colspan - 1)) ||
                    (newLocation.col + (newLocation.colspan - 1) < windows[i].col) ||
                    (newLocation.row > windows[i].row + (windows[i].rowspan - 1)) ||
                    (newLocation.row + (newLocation.rowspan - 1) < windows[i].row)) {
                    // No-op - the window doesn't cause a collision
                } else {
                    collisions.push(windows[i]);
                }
            }

            // If so, move there
            if (!collisions.length) {
                target.row = newLocation.row;
                target.col = newLocation.col;
                target.rowspan = newLocation.rowspan;
                target.colspan = newLocation.colspan;
            } else if (collisions.length === 1) {
                // If there's not space, can we swap places?
                var collision = collisions[0];
                // 1. There's a 1:1 swap, then just do the swap
                if (collision.row === newLocation.row &&
                    collision.col === newLocation.col &&
                    collision.rowspan === newLocation.rowspan &&
                    collision.colspan === newLocation.colspan) {
                    // Update collision
                    collision.row = target.row;
                    collision.col = target.col;
                    // Update target
                    target.row = newLocation.row;
                    target.col = newLocation.col;
                } else {
                    // Check if we can still do a simple swap even if the items aren't 1:1 matched
                    var simpleSwapPossible = true;
                    // To do this test, we need to pretend the target & destination elements aren't there
                    this._clearMapForElements([target, collision]);

                    // Any collisions between target -> new destination?
                    simpleSwapPossible = this._spaceOccupied([newLocation]) ? false : true;

                    // If the collision object is bigger than the target, we'll need to adjust the target destination. The logic is in the switch statement
                    // because the logic depends on the direction of movement.

                    // Any collisions between collision -> new destination?
                    var newCollisionDestination = {
                        col: collision.col,
                        row: collision.row,
                        colspan: collision.colspan,
                        rowspan: collision.rowspan
                    };
                    switch (direction) {
                        case "left":
                            if (newCollisionDestination.col + target.colspan <= this._MAX_COLS) {
                                newCollisionDestination.col += target.colspan;

                                // Adjust the target
                                if (newLocation.col - (collision.colspan - 1) >= 0) {
                                    newLocation.col -= (collision.colspan - 1);
                                }
                            }
                            break;
                        case "right":
                            if (newCollisionDestination.col - target.colspan > 0) {
                                newCollisionDestination.col -= target.colspan;

                                // Adjust the target
                                if (newLocation.col + (collision.colspan - 1) <= this._MAX_COLS) {
                                    newLocation.col += (collision.colspan - 1);
                                }
                            }
                            break;
                        case "up":
                            if (newCollisionDestination.row + target.rowspan <= this._MAX_ROWS) {
                                newCollisionDestination.row += target.rowspan;

                                // Adjust the target
                                if (newLocation.row - (collision.rowspan - 1) >= 0) {
                                    newLocation.row -= (collision.rowspan - 1);
                                }
                            }
                            break;
                        case "down":
                            if (newCollisionDestination.row - target.rowspan > 0) {
                                newCollisionDestination.row -= target.rowspan;

                                // Adjust the target
                                if (newLocation.row + (collision.rowspan - 1) <= this._MAX_ROWS) {
                                    newLocation.row += (collision.rowspan - 1);
                                }
                            }
                            break;
                        default:
                            // No-op
                            break;
                    };
                    simpleSwapPossible = this._spaceOccupied([newCollisionDestination]) ? false : true;

                    if (simpleSwapPossible) {
                        // Update collision
                        collision.row = newCollisionDestination.row;
                        collision.col = newCollisionDestination.col;
                        // Update target
                        target.row = newLocation.row;
                        target.col = newLocation.col;
                    } else {
                        // When a simple swap isn't possible & there's one item, then move that item down and it pushes everything else down

                        switch (direction) {
                            case "left":
                                collision.col += target.colspan;
                                break;
                            case "right":
                                collision.col -= target.colspan;
                                break;
                            case "up":
                                collision.row += target.rowspan;
                                break;
                            case "down":
                                collision.row -= target.rowspan;
                                break;
                            default:
                                // No-op
                                break;
                        };

                        // Update target
                        target.row = newLocation.row;
                        target.col = newLocation.col;

                        var fixedElements = [
                            target,
                            collision
                        ];
                        this._layout(fixedElements);
                    }
                }
            } else {
                // Maybe we can do a complex swap?
                // If the collisions aren't fully contained in the area of desired destination it won't work
                var complexSwapPossible = true;

                // Pretend we moved the target -> desired
                for (var j = newLocation.col - 1; j < newLocation.col + newLocation.colspan - 1; j++) {
                    for (var k = newLocation.row - 1; k < newLocation.row + newLocation.rowspan - 1; k++) {
                        this._occupiedMap[j][k] = -1;
                    }
                }

                // Loop through the collisions and see if a swap is possible
                complexSwapPossible = this._spaceOccupied(collisions) ? false : true;

                if (complexSwapPossible) {
                    // Update collisions as a unit
                    for (var i = 0; i < collisions.length; i++) {
                        var collision = collisions[i];
                        switch (direction) {
                            case "left":
                                collision.col += target.colspan;
                                break;
                            case "right":
                                collision.col -= target.colspan;
                                break;
                            case "up":
                                collision.row += target.rowspan;
                                break;
                            case "down":
                                collision.row -= target.rowspan;
                                break;
                            default:
                                // No-op
                                break;
                        };
                    }

                    // Update target
                    target.row = newLocation.row;
                    target.col = newLocation.col;
                } else {
                    // If a complex swap is not possible, we move the item into the desired location & re-layout the entire page
                    target.row = newLocation.row;
                    target.col = newLocation.col;

                    var fixedElements = [
                        target
                    ];
                    this._layout(fixedElements);
                }
            }

            this._arrange();
        };
        // Puts a new window in the DOM
        _WorkspaceManager.prototype._placeNewWindow = function (newWindowElement) {
            var workspaceElement = document.body.querySelector(".xbdh-workspace");
            var firstWindowElement = workspaceElement.querySelector(".xbdh-window");
            if (firstWindowElement) {
                firstWindowElement.parentNode.insertBefore(newWindowElement, firstWindowElement);
            } else {
                workspaceElement.appendChild(newWindowElement);
            }
        };
        // Helper function for testing
        _WorkspaceManager.prototype._printOccupiedMap = function () {
            var row1String = "";
            var row2String = "";
            var row3String = "";
            for (var i = 0; i < this._occupiedMap.length; i++) {
                var currentColumn = this._occupiedMap[i];
                row1String += currentColumn[0];
                row2String += currentColumn[1];
                row3String += currentColumn[2];
            }
            console.log(row1String + "\n" + row2String + "\n" + row3String);
        };
        _WorkspaceManager.prototype._setActiveToolWindow = function (activeToolWindowIndex) {
            this._activeToolWindowIndex = activeToolWindowIndex;
            if (this._activeToolWindowIndex === -1) {
                this._activeToolWindowIndex = this._getActiveToolWindowIndex();
            }

            // Figure out if the active Window is fully in view. If not, attempt to bring it in view
            var activeToolWindowElement = this._toolWindowDomElements[this._activeToolWindowIndex];
            if (!activeToolWindowElement) {
                return;
            }
            var activeToolWindowRect = activeToolWindowElement.getBoundingClientRect();
            var _titleSafeWidth = 100;
            var xScrollAmount = 0;
            var workspace = document.body.querySelector(classNames._cssWorkspaceSelector);
            var width = document.body.offsetWidth;
            if (activeToolWindowRect.left < _titleSafeWidth) {
                xScrollAmount = -1 * (_titleSafeWidth - activeToolWindowRect.left);
            } else if (activeToolWindowRect.right > width - _titleSafeWidth) {
                xScrollAmount = activeToolWindowRect.right - (width - _titleSafeWidth);
            }

            if (xScrollAmount) {
                var xScrollPos = Math.max(0, workspace.scrollLeft + xScrollAmount);
                workspace.msZoomTo({ contentX: xScrollPos, contentY: 0, viewportX: 0, viewportY: 0 });
            }
        };
        _WorkspaceManager.prototype._updateOccupiedMap = function () {
            this._clearOccupiedMap();

            // Fill in occupied data
            var windows = document.body.querySelectorAll(classNames._cssWindowSelector);
            if (this._occupiedMap) {
                for (var i = 0, len = windows.length; i < len; i++) {
                    var currentWindow = windows[i];
                    for (var j = currentWindow.col - 1; j < currentWindow.col + currentWindow.colspan - 1 && j < this._occupiedMap.length; j++) {
                        for (var k = currentWindow.row - 1; k < currentWindow.row + currentWindow.rowspan - 1 && k < this._occupiedMap[j].length; k++) {
                            this._occupiedMap[j][k] = i + 1;
                        }
                    }
                }
            }
        };
        _WorkspaceManager.prototype._showFirstRunExperience = function () {
            return; // We never show 1st run for now, until the E2E experience is finished.

            utils._Events.logUIAction("WorkspaceManager:ShowFirstRunExperience");
            var systemProperties = Microsoft.Xbox.Tools.ConsoleExtensions.SystemConfigurationProperties;
            var networkUtils = Microsoft.Xbox.Development.NetworkUtilities;

            var shouldsShowFirstRun = !utils._localSettings.values["xbdh-notfirstTimeLaunch"];
            if (!shouldsShowFirstRun) {
                return;
            } else {
                utils._localSettings.values["xbdh-notfirstTimeLaunch"] = "true";
                this.saveSettings();
            }

            // Set a flag to let the app know we are in the 1st run experience so we need to do things
            // like suppress all menus.
            utils._inFirstRun = true;

            splashscreen_remove();

            // Set the color theme
            this._refreshTheme();

            var that = this;
            function hideFirstRunExperience() {
                that._activeToolWindowIndex = 0;
                var firstToolWindow = document.body.querySelectorAll(classNames._cssWindowSelector)[that._activeToolWindowIndex];
                TVJS.DirectionalNavigation.focusRoot = firstToolWindow;
                TVJS.DirectionalNavigation.enabled = true;
                var initialFocusElement = firstToolWindow.querySelector(".win-focusable, BUTTON:not([disabled]), BUTTON:not([tabIndex='-1']), INPUT:not([disabled]), INPUT:not([tabIndex='-1']), TEXTAREA:not([disabled]), TEXTAREA:not([tabIndex='-1']), SELECT:not([disabled]), SELECT:not([tabIndex='-1']), A:not([disabled]), A:not([tabIndex='-1'])");
                if (initialFocusElement) {
                    initialFocusElement.focus();
                }
                utils._inFirstRun = false;
            };

            //
            // Welcome page
            //
            var welcomePage = document.createElement("div");
            welcomePage.id = "xbdh-firstrun-welcome";
            welcomePage.classList.add("xbdh-firstrun");
            welcomePage.classList.add("xbdh-firstrun-welcomepage");
            welcomePage.innerHTML =
                '<p class="xbdh-firstrun-welcome-description">' +
                DevHome.Utilities.Resources.getString("firstRunWelcomeInstructionsPart1").value +
                '   <span class="xbdh-accentcolor-color">' +
                DevHome.Utilities.Resources._formatString(
                    DevHome.Utilities.Resources.getString("firstRunWelcomeInstructionsHostNameOrIp").value,
                    systemProperties.hostName) +
                '   </span>' +
                DevHome.Utilities.Resources.getString("firstRunWelcomeInstructionsPart2").value +
                '   <span class="xbdh-accentcolor-color">' +
                DevHome.Utilities.Resources._formatString(
                    DevHome.Utilities.Resources.getString("firstRunWelcomeInstructionsHostNameOrIp").value,
                    networkUtils.systemIpAddress) +
                '   </span>' +
                DevHome.Utilities.Resources.getString("firstRunWelcomeInstructionsPart3").value +
                '</p>' +
                '<button id="xbdh-firstrun-welcome-skip" class="xbdh-firstrun-welcome-skip">' +
                DevHome.Utilities.Resources.getString("firstRunWelcomeSkip").value + '</button>';

            // Hook up buttons
            var welcomePageSkipButton = welcomePage.querySelector("#xbdh-firstrun-welcome-skip");
            welcomePageSkipButton.addEventListener("click", function () {
                utils._Events.logUIAction("WorkspaceManager:SkipWdpFirstRunExperience");

                welcomePage.parentNode.removeChild(welcomePage);
                hideFirstRunExperience();
            }, false);
            // Handle B to go back
            welcomePage.addEventListener("keyup", function handleKeyUp(e) {
                utils._Events.logUIAction("WorkspaceManager:SkipWdpFirstRunExperience");

                if (e.keyCode === DevHome.Utilities.Key.GamepadB ||
                    e.keyCode === DevHome.Utilities.Key.escape) {
                    welcomePage.parentNode.removeChild(welcomePage);
                    hideFirstRunExperience();
                }
            }, false);

            // Show welcome page
            document.body.appendChild(welcomePage);
            // Set focus
            TVJS.DirectionalNavigation.focusRoot = welcomePage;
            TVJS.DirectionalNavigation.enabled = true;
            welcomePageSkipButton.focus();
        };
        _WorkspaceManager.prototype._refreshTheme = function () {
            if (utils._settings) {
                // Remove old classes
                if (this._accentColorClassName && document.body.classList.contains(this._accentColorClassName)) {
                    document.body.classList.remove(this._accentColorClassName);
                }
                var activeWorkspaceSettings = utils._settings.workspaces[this._activeWorkspaceIndex];
                this._backgroundImageUri = activeWorkspaceSettings.theme.backgroundImage || "";
                this._accentColorClassName = "xbdh-theme-accentcolor-" + activeWorkspaceSettings.theme.accentColor || "";
                this._themeColorClassName = "xbdh-theme-" + activeWorkspaceSettings.theme.themeColor || "";
            }
            // Assign new class values
            document.body.classList.add(this._themeColorClassName);
            document.body.classList.add(this._accentColorClassName);

            // Set the background image
            document.body.style.backgroundImage = 'url("' + this._backgroundImageUri + '")';
        };
        _WorkspaceManager.prototype._refreshWorkspaceSwitcher = function () {
            if (utils._settings) {
                var workspaces = utils._settings.workspaces;
                var workspaceSwitcherElement = document.getElementById("xbdh-shell-switchworkspace");

                // Create the DOM
                var htmlString = '';
                for (var i = 0, len = workspaces.length; i < len; i++) {
                    var workspace = workspaces[i];
                    var focusUpOverrideString = "";
                    if (i > 0) {
                        focusUpOverrideString = 'data-tv-focus-up="#xbdh-shell-workspaceoption-' + (i - 1) + '"';
                    }
                    var focusDownOverrideString = "";
                    if (i < len - 1) {
                        focusDownOverrideString = 'data-tv-focus-down="#xbdh-shell-workspaceoption-' + (i + 1) + '"';
                    }
                    htmlString +=
                        '<div role="menuitem" id="xbdh-shell-workspaceoption-' + i + '" class="xbdh-shell-workspaceoption" data-xbdh-workspaceid="' + workspace.id + '" tabindex="0" ' + focusUpOverrideString + ' ' + focusDownOverrideString + '>' +
                        '  <div class="xbdh-shell-workspaceoption-label">' + workspace.name + '</div>' +
                        '</div>';
                }
                workspaceSwitcherElement.innerHTML = htmlString;

                // Hook up event handlers
                var buttons = workspaceSwitcherElement.querySelectorAll(".xbdh-shell-workspaceoption");
                for (var i = 0, len = buttons.length; i < len; i++) {
                    buttons[i].addEventListener("focus", this._switchWorkspaceWithWorkspaceSwitcher.bind(this), false);
                }

                // Set the active workspace
                var activeWorkspaceId = workspaces[this._activeWorkspaceIndex].id;
                var activeWorkspaceElement = workspaceSwitcherElement.querySelector("[data-xbdh-workspaceid='" + activeWorkspaceId + "']");
                activeWorkspaceElement.classList.add("xbdh-active");
                activeWorkspaceElement.setAttribute("aria-current", true);
            }
        };
        _WorkspaceManager.prototype._renderTool = function (uri, container) {
            return new Promise(function (complete, error) {
                DevHome.Utilities.xhr({ url: uri }).then(function (response) {
                    var content = document.createElement("div");
                    container.innerHTML = response.responseText;
                    complete(container);
                }, error);
            });
        };
        _WorkspaceManager.prototype._resize = function (target, operation) {

            // Update the target with the new size
            var shouldDoLayout = false;
            switch (operation) {
                case "+height":
                    if (target.row + target.rowspan <= this._MAX_ROWS) {
                        target.rowspan++;
                        shouldDoLayout = true;
                    }
                    break;
                case "-width":
                    if (target.colspan > 1) {
                        target.colspan--;
                        shouldDoLayout = true;
                    }
                    break;
                case "-height":
                    if (target.rowspan > 1) {
                        target.rowspan--;
                        shouldDoLayout = true;
                    }
                    break;
                case "+width":
                    if (target.col + target.colspan <= this._MAX_COLS &&
                        target.colspan < this._FULL_SCREEN_IN_COLUMNS) {

                        target.colspan++;
                        shouldDoLayout = true;
                    }
                    break;
                default:
                    // No-op
                    break;
            };

            // Call Layout
            if (shouldDoLayout) {
                this._layout([target]);
            }
        };
        _WorkspaceManager.prototype._saveSettingsToLocalFolderAsync = function () {
            this._pendingSaveSettings = false;
            // Saves the current workspace
            return new Promise(function (complete, error) {
                var settingsString = JSON.stringify(utils._settings);
                localStorage.setItem("xbdh-settings", settingsString);
                complete();
            });
        };
        _WorkspaceManager.prototype._showSemanticZoomView = function () {
            var container = document.createElement("div");
            container.classList.add("xbdh-zoomed-container");

            // Also hide the header
            var header = document.getElementById("xbdh-shell-header");

            // Go through all the toolWindows & re-create them
            var activeWindowIndex = 0;
            var htmlString = "";
            var workspaces = this.settings.workspaces;
            for (var i = 0, len = workspaces.length; i < len; i++) {
                var workspace = workspaces[i];
                htmlString += '<div class="xbdh-zoomed-workspace-title"><h1>' + workspace.name + '</h1></div>' +
                    '<div class="xbdh-zoomed-workspace">';
                var windows = workspace.windows;
                for (var j = 0, len2 = windows.length; j < len2; j++) {
                    var window = windows[j];
                    var name = utils._getLocalizedName(window);
                    var row = window.layout.row;
                    var col = window.layout.col;
                    var rowspan = window.layout.rowspan;
                    var colspan = window.layout.colspan;
                    htmlString += '<div class="xbdh-zoomed-window xbdh-accentcolor-border win-focusable xbdh-clickable" tabindex="0" style="-ms-grid-row: ' +
                        row + '; -ms-grid-column: ' + col + '; -ms-grid-row-span: ' + rowspan + '; -ms-grid-column-span: ' + colspan + ';" ' +
                        '   data-xbdh-windowindex="' + j + '" data-xbdh-workspaceindex="' + i + '">' +
                        '  <div class="xbdh-zoomed-window-name">' + name + '</div>' +
                        '</div>';
                }
                htmlString += '</div>';
            }
            container.innerHTML = htmlString;

            var workspaces = container.querySelectorAll(".xbdh-zoomed-workspace");
            var activeZoomedWorkspaceElement = workspaces[this._activeWorkspaceIndex];

            // Attach click handlers
            var allZoomedWindows = container.querySelectorAll(".xbdh-zoomed-window");
            for (var i = 0, len = allZoomedWindows.length; i < len; i++) {
                allZoomedWindows[i].addEventListener("click", this._handleSemanticZoomNavigate.bind(this), false);
            }

            utils.hide(container);
            document.body.appendChild(container);

            // Zoom it into view
            var activeZoomedWorkspaceRect = activeZoomedWorkspaceElement.getBoundingClientRect();
            var yScrollPos = activeZoomedWorkspaceRect.top + 100;
            container.msZoomTo({ contentX: 0, contentY: yScrollPos, viewportX: 0, viewportY: 0 });

            // Set default focus to whatever the active window was
            TVJS.DirectionalNavigation.focusRoot = activeZoomedWorkspaceElement;
            TVJS.DirectionalNavigation.enabled = true;
            var activeWorkspaceZoomedWindows = activeZoomedWorkspaceElement.querySelectorAll(".xbdh-zoomed-window");
            var initialFocus = activeWorkspaceZoomedWindows[this._activeToolWindowIndex];
            if (initialFocus) {
                initialFocus.focus();
            }
        };
        // Determines if there is already an element in the specified space
        _WorkspaceManager.prototype._spaceOccupied = function (elements) {
            var foundCollision = false;
            for (var i = 0; i < elements.length; i++) {
                var element = elements[i];
                for (var j = element.col - 1; j < element.col + element.colspan - 1; j++) {
                    for (var k = element.row - 1; k < element.row + element.rowspan - 1; k++) {
                        if (j >= this._occupiedMap.length ||
                            k >= this._occupiedMap[j].length ||
                            (this._occupiedMap[j][k] !== 0 &&
                            this._occupiedMap[j][k] !== -1)) {
                            foundCollision = true;
                            break;
                        }
                    }
                    if (foundCollision) {
                        break;
                    }
                }
                if (foundCollision) {
                    break;
                }
            }
            return foundCollision;
        };
        _WorkspaceManager.prototype._switchWorkspaceWithWorkspaceSwitcher = function (e) {
            // Set all the options to inactive, then switch workspace
            var workspaceSwitcherElement = document.getElementById("xbdh-shell-switchworkspace");
            var buttons = workspaceSwitcherElement.querySelectorAll(".xbdh-shell-workspaceoption");
            for (var i = 0, len = buttons.length; i < len; i++) {
                buttons[i].classList.remove("xbdh-active");
                buttons[i].removeAttribute("aria-current");
            }
            var activeWorkspaceOption = e.target;
            activeWorkspaceOption.classList.add("xbdh-active");
            activeWorkspaceOption.setAttribute("aria-current", true);
            // Make sure the workspace nav is fully scrolled into view
            var shellNav = document.getElementById("xbdh-shell-content");
            shellNav.scrollLeft = 0;

            this._queueSwitchWorkspaceAction();
        };
        _WorkspaceManager.prototype._switchWorkspaceAction = function (newWorkspaceId) {
            this._pendingSwitchWorkspaceAction = false;
            var newWorkspaceIndex = this._getWorkspaceIndexById(newWorkspaceId, utils._settings.workspaces);
            if (newWorkspaceIndex != this._activeWorkspaceIndex) {
                this.switchWorkspaceAsync(newWorkspaceIndex, true).then(function () { }, function () { });
                utils._Events.logUIAction("WorkspaceManager:SwitchWorkspaceWithSwitcherUI", utils._settings.workspaces[newWorkspaceIndex]);
            }
        };
        _WorkspaceManager.prototype._queueSwitchWorkspaceAction = function () {
            if (this._pendingSwitchWorkspaceAction) {
                return;
            }
            this._pendingSwitchWorkspaceAction = true;

            var shellNav = document.getElementById("xbdh-shell-content");
            var activeElement = document.activeElement;
            if (!shellNav.contains(activeElement)) {
                this._pendingSwitchWorkspaceAction = false;
                return;
            }
            var newWorkspaceId = document.activeElement.getAttribute("data-xbdh-workspaceid");
            if (newWorkspaceId) {
                this._switchWorkspaceAction(newWorkspaceId);
            } else {
                this._pendingSwitchWorkspaceAction = false;
            }
        };
        _WorkspaceManager.prototype._toggleSemanticZoom = function () {
            if (this._inSemanticZoomMode) {
                this._exitSemanticZoom();
            } else {
                this._enterSemanticZoomMode();
            }
        };
        _WorkspaceManager.prototype._unloadWorkspace = function (workspaceElement) {
            if (workspaceElement) {
                var windows = workspaceElement.querySelectorAll(classNames._cssWindowSelector);
                for (var i = 0, len = windows.length; i < len; i++) {
                    var currentWindow = windows[i];
                    if (currentWindow.winControl && currentWindow.winControl.unload) {
                        currentWindow.winControl.unload();
                        currentWindow.winControl._disposed = true;
                    }
                }
                workspaceElement.parentNode.removeChild(workspaceElement);
                workspaceElement.innerText = "";
            }
        };
        // The order of a tool window in the UI is not the same as it's order in the data structure that holds all the tool windows.
        // Therefore, we keep track of a map of the order 
        _WorkspaceManager.prototype._updateToolWindowDomIndexes = function () {
            var toolWindowElements = document.body.querySelectorAll(classNames._cssWindowSelector);
            var activeWorkspaceSettings = this.settings.workspaces[this._activeWorkspaceIndex];
            var numberOfToolWindows = activeWorkspaceSettings.windows.length;
            // Clear the old list so we don't leak memory
            this._toolWindowDomElements.length = numberOfToolWindows;
            for (var i = 0, len = toolWindowElements.length; i < len; i++) {
                this._toolWindowDomElements[toolWindowElements[i].xbdhIndex] = toolWindowElements[i];
            }
        };
        // Refreshes the clock time
        _WorkspaceManager.prototype._updateTime = function () {
            var rawDate = new Date();
            var time = document.getElementById("xbdh-shell-time");
            time.textContent = this._timeFormatter.format(rawDate);
        };
        _WorkspaceManager.prototype._upgradeIfRequired = function () {
            // Return if they are current
            var settings = utils._settings;
            if (settings.version === utils._currentDevHomeVersion) {
                return;
            }

            if (!settings.version) {
                settings.version = 0;
            }
            // Upgrade from a preview version
            if (settings.version < 2) {
                utils._settings = this._defaultEraConfiguration;
                this.saveSettings();
            }

            // Upgrade commands
            if (utils._certType !== utils.Cert.uwp) {
                utils._settings.commands = this._defaultEraConfiguration.commands;
            }

            // Upgrade workspaces
            var defaultWorkspaces = utils._settings.workspaces;
            var userWorkspaces = utils._settings.workspaces;
            for (var i = 0, len = defaultWorkspaces.length; i < len; i++) {
                var currentDefaultWorkspace = defaultWorkspaces[i];
                // Decide if it is safe to update the workspace. If the user has modified this workspace, then we leave it alone
                var workspaceIndex = this._getWorkspaceIndexById(currentDefaultWorkspace.id, userWorkspaces);
                if (workspaceIndex === -1) { // This workspace is net new and we can add it to the end
                    // Check if the user hasn't explicitly deleted it. If so we wouldn't want to add it back in
                    var deletedBuiltInWorkspaces = utils._settings.appSettings.workspaces.deletedBuiltInWorkspaces;
                    var workspaceDeletedByUser = false;
                    for (var j = 0, len = deletedBuiltInWorkspaces; j < len; j++) {
                        if (deletedBuiltInWorkspaces[i] === currentDefaultWorkspace.id) {
                            workspaceDeletedByUser = true;
                            break;
                        }
                    }
                    if (!workspaceDeletedByUser) {
                        userWorkspaces.push(currentDefaultWorkspace);
                    }
                } else {
                    if (!userWorkspaces[workspaceIndex].customized) { // Only if the user has not customized the workspace, then override it with the default
                        userWorkspaces[workspaceIndex] = currentDefaultWorkspace;
                    }
                }
            }
        };
        _WorkspaceManager.prototype._createDebugIPDom = function () {
            var debugIPElement = document.createElement("div");
            debugIPElement.id = "xbdh-shell-title-metadata-debugip";
            debugIPElement.className = "xbdh-shell-title-metadata";
            debugIPElement.innerHTML =
                '     <div id="xbdh-shell-title-metadata-debugip-value" class="xbdh-shell-title-metadata-value"></div>' +
                '     <div id="xbdh-shell-title-metadata-debugip-label" class="xbdh-shell-title-metadata-label">' + DevHome.Utilities.Resources.getString("shellDebugIPLabel").value + '</div>';
            var consoleIPElement = document.getElementById("xbdh-shell-title-metadata-consoleip");
            consoleIPElement.parentNode.insertBefore(debugIPElement, consoleIPElement);
            debugIPElement.parentNode.insertBefore(consoleIPElement, debugIPElement);
        };
        _WorkspaceManager.prototype._verifyNetworkAsync = async function (retry) {
            try {
                var nativeUtils = xbdhUtils.getDevHomeNativeUtilities();
                var resources = DevHome.Utilities.Resources;
                // It's possible we aquired a valid IP address in between when we set the value in the UI and now.
                var consoleIPValueElement = document.getElementById("xbdh-shell-title-metadata-consoleip-value");
                var consoleIPValue = consoleIPValueElement.textContent;
                var newConsoleIPAddress = await nativeUtils.getSystemIpAddressAsync();

                // Update the ip address element if it's changed.
                if (consoleIPValue !== newConsoleIPAddress) {
                    if (DevHome.Utilities.isValidNetworkAddress(newConsoleIPAddress)) {
                        consoleIPValueElement.textContent = newConsoleIPAddress;
                    } else {
                        consoleIPValueElement.textContent = resources.getString("networkNotConnected").value;
                    }
                }

                // On scorpio and dante, adjust if debug IP is shown and show any needed debug NIC notifications.
                if (utils._consoleType === utils.ConsoleType.scorpioDevkit || utils._consoleType === utils.ConsoleType.dante) {

                    if (!DevHome.Utilities.isValidNetworkAddress(consoleIPValue) ||
                        !DevHome.Utilities.isValidNetworkAddress(newConsoleIPAddress)) {

                        // If we are doing debug nic proxying, show the slow traffic warning.
                        if (!await nativeUtils.getDebugNicDisableAsync()) {
                            xbdhUtils._addNotification({
                                title: resources.getString("notificationsDebugNicSlowTrafficWarningTitle").value,
                                description: resources.getString("notificationsDebugNicSlowTrafficWarningDescription").value
                            });
                        } else {
                            xbdhUtils._removeNotification({
                                title: resources.getString("notificationsDebugNicSlowTrafficWarningTitle").value,
                                description: resources.getString("notificationsDebugNicSlowTrafficWarningDescription").value
                            });
                        }

                        // If we still don't have a valid IP address, see if it is because the debug NIC port is plugged in,
                        // but not the normal network port.
                        if (!DevHome.Utilities.isValidNetworkAddress(newConsoleIPAddress)) {
                            if (await nativeUtils.getDebugNicConnectedAsync()) {
                                xbdhUtils._addNotification({
                                    title: resources.getString("notificationsDebugNicButNotEthernetConnectedTitle").value,
                                    description: resources.getString("notificationsDebugNicButNotEthernetConnectedDescription").value
                                });
                            }
                        } else {
                            xbdhUtils._removeNotification({
                                title: resources.getString("notificationsDebugNicButNotEthernetConnectedTitle").value,
                                description: resources.getString("notificationsDebugNicButNotEthernetConnectedDescription").value
                            });
                        }
                    }

                    // Conditionally show Debug IP addresses in the header
                    var debugIPElement = document.getElementById("xbdh-shell-title-metadata-debugip");
                    if (!debugIPElement) {
                        this._createDebugIPDom();
                        debugIPElement = document.getElementById("xbdh-shell-title-metadata-debugip");
                    }
                    var hostIp = await nativeUtils.getHostIpAddressAsync();
                    var debugIPValue = debugIPElement.querySelector("#xbdh-shell-title-metadata-debugip-value");
                    if (await nativeUtils.getDebugNicConnectedAsync() && DevHome.Utilities.isValidNetworkAddress(hostIp)) {
                        debugIPElement.style.display = "inline-block";
                        debugIPValue.textContent = hostIp;
                    } else {
                        debugIPElement.style.display = "none";
                    }
                }

                if (retry) {
                    // Kick off another verification just in case
                    setTimeout(this._verifyNetworkAsync.bind(this), 1000);
                }
            } catch (e) {
                // Do nothing. This method has been generating crash dumps
                // and we've been unable to determine exactly which part is unstable.
                // If it fails, it just means we won't have IP address information, which
                // is not a reason to crash DevHome.
            }
        };
        // Public methods
        _WorkspaceManager.prototype.dispose = function () {
            if (this._disposed) {
                return;
            }
            this._disposed = true;
            clearInterval(this._timerFunctionsCookie);
            clearInterval(this._frequentTimerFunctionsCookie);
            document.removeEventListener("keydown", this._keyDownHandlerBound);
            document.removeEventListener("keyup", this._keyupHandlerBound);
            window.removeEventListener("resize", this._handleResizeBound);
            TVJS.DirectionalNavigation.removeEventListener("_nonextfocusfound", this._handleNoNextFocusFoundBound);

            // Unload the current workspace
            var currentWorkspace = document.querySelector(classNames._cssWorkspaceSelector);
            this._unloadWorkspace(currentWorkspace);
        };
        _WorkspaceManager.prototype.getDataForCurrentToolWindow = function () {
            var activeWorkspaceSettings = this.settings.workspaces[this._activeWorkspaceIndex];
            var activeToolWindowSettings = activeWorkspaceSettings.windows[this._activeToolWindowIndex];
            return (activeToolWindowSettings ? activeToolWindowSettings.data : null);
        };
        _WorkspaceManager.prototype.layout = function (fixedElements, firstTime) {
            this._layout(fixedElements, firstTime);
        };
        _WorkspaceManager.prototype.deleteSettings = function () {
            localStorage.removeItem("xbdh-settings");
        };
        _WorkspaceManager.prototype.saveSettings = function () {
            if (this._pendingSaveSettings) {
                return;
            } else {
                setTimeout(this._saveSettingsToLocalFolderAsync.bind(this), 200);
                this._pendingSaveSettings = true;
            }
        };
        _WorkspaceManager.prototype.saveDataForCurrentToolWindow = function (object) {
            var activeWorkspaceSettings = this.settings.workspaces[this._activeWorkspaceIndex];
            var activeToolWindowSettings = activeWorkspaceSettings.windows[this._activeToolWindowIndex];
            if (!activeToolWindowSettings.data) {
                activeToolWindowSettings.data = {};
            }
            activeToolWindowSettings.data = object;
            this.saveSettings();
        };
        _WorkspaceManager.prototype.switchWorkspaceAsync = async function (workspaceIndex, dontSetDefaultFocus) {
            _activeWorkspaceIndex = workspaceIndex;
            var workspaceData = utils._settings.workspaces[this._activeWorkspaceIndex];
            this._oldWorkspaceElement = document.querySelector(classNames._cssWorkspaceSelector);
            this._newWorkspaceElement = this._createWorkspaceElement();

            // Hide the workspace, while we perform some initialization
            this._newWorkspaceElement.classList.add(classNames._cssHiddenClassName);

            // Unload all windows
            this._unloadWorkspace(this._oldWorkspaceElement);

            // Put the workspace element in the DOM and make it visible
            var contentContainer = document.getElementById("xbdh-shell-content");
            contentContainer.appendChild(this._newWorkspaceElement);
            this._newWorkspaceElement.classList.remove(classNames._cssHiddenClassName);

            await this._loadWorkspaceAsync(workspaceData);
            this._layout(null, true);
            if (!utils._inFirstRun &&
                !dontSetDefaultFocus) {
                // Set focusRoot and initial focus:
                // Find the 1st tool window, set a default focus if one has not been set.
                // We do detect if focus hasnt' been set if focus is on the body or on an
                // element that isn't in the DOM.
                var focusRoot = TVJS.DirectionalNavigation.focusRoot;
                var firstWindow = this._element.querySelector(classNames._cssWindowSelector);
                var activeElement = document.activeElement;
                if (activeElement &&
                    !firstWindow.contains(activeElement)) {

                    let promise = new Promise(function (complete) {
                        setImmediate(function () {
                            if (firstWindow) {
                                utils.setFocusToFirstFocusableElement(firstWindow);
                                if (!TVJS.DirectionalNavigation.focusRoot) {
                                    TVJS.DirectionalNavigation.focusRoot = firstWindow;
                                    TVJS.DirectionalNavigation.enabled = true;
                                }
                                this._activeToolWindowIndex = firstWindow.xbdhIndex;
                            }
                            complete();
                        }.bind(this));
                    }.bind(this));
                    await promise;
                }
                this._refreshWorkspaceSwitcher();
            } else {
                this._activeToolWindowIndex = 0;
            }

            // Ensure we don't get stuck thinking we're switching workspaces when we are not
            this._pendingSwitchWorkspaceAction = false;
        };
        return _WorkspaceManager;
    })();
    DevHome = DevHome || {};

    DevHome = DevHome || {};
    DevHome._WorkspaceManager = _WorkspaceManager;

    DevHome.Utilities = DevHome.Utilities || {};
    DevHome.Utilities._Internal = DevHome.Utilities._Internal || {};
    Object.defineProperty(DevHome.Utilities._Internal, "workspaceManager", {
        get: function () {
            return _workspaceManager;
        },
        set: function (value) {
            _workspaceManager = value;
        },
        enumerable: true,
        configurable: true
    });

    /*
     * App infrastructure
     */

    // The startup function. It is effectively the first code that runs when the app starts.
    function _initialize(args) {
        // We need to turn off Mouse mode, which is the default for UWP apps.
        navigator.gamepadInputEmulation = "keyboard";

        _workspaceManager = new _WorkspaceManager();
        _workspaceManager._initializeAppAsync(args).then(function () { }, function () { });
    };

    /*
     * Global event handlers
     */

    (function () {
        "use strict";

        var xbdhUtils = DevHome.Utilities;
        var xyFocus = TVJS.DirectionalNavigation;
        var keys = xbdhUtils.Key;

        DevHome._globalHandleKeyDown = function (e) {
            if (!xyFocus.enabled) {
                return;
            }

            // If the virtual keyboard is up, early-out.
            var inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();
            if (inputPane.occludedRect.height > 0) {
                return;
            }

            function _toIRect(rect) {
                return {
                    top: Math.floor(rect.top),
                    bottom: Math.floor(rect.top + rect.height),
                    right: Math.floor(rect.left + rect.width),
                    left: Math.floor(rect.left),
                    height: Math.floor(rect.height),
                    width: Math.floor(rect.width),
                };
            };
            var CrossDomainMessageConstants = {
                messageDataProperty: "msWinJSXYFocusControlMessage",
                register: "register",
                unregister: "unregister",
                dFocusEnter: "dFocusEnter",
                dFocusExit: "dFocusExit"
            };

            // Ensure text is navigatable by keyboard normally.
            var keyCode = e.keyCode;
            let activeElement = document.activeElement;
            if (activeElement.tagName === "TEXTAREA" ||
                (activeElement.tagName === "INPUT" && (activeElement.type === "email" || activeElement.type === "text" || activeElement.type === "password"))
            ) {
                switch (keyCode) {
                    case keys.downArrow:
                    case keys.upArrow:
                    case keys.leftArrow:
                    case keys.rightArrow:
                    case keys.enter:
                        return;
                    default:
                        // No-op
                        break;
                };
            }

            var direction = xbdhUtils._directionFromKeyCode(keyCode);
            if (direction) {
                var nextFocus = xyFocus.findNextFocusElement(direction);
                if (nextFocus) {
                    var referenceRect = document.activeElement.getBoundingClientRect();
                    if (nextFocus.tagName === "IFRAME") {
                        var targetIframe = nextFocus;
                        // If we successfully moved focus and the new focused item is an IFRAME, then we need to notify it
                        // Note on coordinates: When signaling enter, DO transform the coordinates into the child frame's coordinate system.
                        var targetRect = targetIframe.getBoundingClientRect();
                        var refRect = _toIRect({
                            left: referenceRect.left - targetRect.left,
                            top: referenceRect.top - targetRect.top,
                            width: referenceRect.width,
                            height: referenceRect.height
                        });
                        var message = {};
                        message[CrossDomainMessageConstants.messageDataProperty] = {
                            type: CrossDomainMessageConstants.dFocusEnter,
                            direction: direction,
                            referenceRect: refRect
                        };
                        // postMessage API is safe even in cross-domain scenarios.
                        targetIframe.contentWindow.postMessage(message, "*");
                    }
                    nextFocus.focus();
                    TVJS.DirectionalNavigation.dispatchEvent("focuschanged", {});
                } else {
                    var wasEventCancelled = TVJS.DirectionalNavigation.dispatchEvent("_nonextfocusfound", { keyCode: keyCode });
                    if (document.activeElement.tagName === "IFRAME") {
                        TVJS.DirectionalNavigation._xyFocus();
                    }
                }
            }
        }
        // Disable automatic focus, we are going to control it ourselves
        xyFocus.keyCodeMap.up.length = 0;
        xyFocus.keyCodeMap.down.length = 0;
        xyFocus.keyCodeMap.left.length = 0;
        xyFocus.keyCodeMap.right.length = 0;
        document.addEventListener("keydown", DevHome._globalHandleKeyDown, false);
    })();

    /*
     * Extended splash screen
     */
    function splashscreen_show(splash) {
        /// <summary locid="MyApp.Utilities.SplashScreen.show">
        /// Displays the extended splash screen. Pass the splash screen object retrieved during activation.
        /// </summary>
        var extendedSplashImage = document.getElementById("extendedsplashscreenimage");

        // Position the extended splash screen image in the same location as the system splash screen image.
        if (splash.imageLocation.x === 650) {
            extendedSplashImage.style.top = splash.imageLocation.y + "px";
            extendedSplashImage.style.left = splash.imageLocation.x + "px";
            extendedSplashImage.style.width = splash.imageLocation.width + "px";
            extendedSplashImage.style.height = splash.imageLocation.height + "px";
        } else if (splash.imageLocation.x === 410) {
            extendedSplashImage.style.top = splash.imageLocation.y + "px";
            extendedSplashImage.style.left = splash.imageLocation.x + "px";
            extendedSplashImage.style.width = splash.imageLocation.width + "px";
            extendedSplashImage.style.height = splash.imageLocation.height + "px";
        } else {
            extendedSplashImage.style.top = "424px";
            extendedSplashImage.style.left = "1px";
            extendedSplashImage.style.width = "480px";
            extendedSplashImage.style.height = "232px";
        }

        // Position the extended splash screen's progress ring. Note: In this sample, the progress ring is not used.
        var extendedSplashProgress = document.getElementById("extendedsplashscreenprogress");
        extendedSplashProgress.style.marginTop = splash.imageLocation.y + splash.imageLocation.height + "px";
        var extendedSplashProgressRect = extendedSplashProgress.getBoundingClientRect();
        extendedSplashProgress.style.left = "calc(50% - " + parseFloat(getComputedStyle(extendedSplashProgress).width) / 2 + "px)";

        // Once the extended splash screen is setup, apply the CSS style that will make the extended splash screen visible.
        var extendedSplashScreen = document.getElementById("extendedsplashscreen");
        extendedSplashScreen.classList.remove("xbdh-hidden");
    };

    // Updates the location of the extended splash screen image. Should be used to respond to window size changes.
    function splashscreen_updateImageLocation(splash) {
        /// <summary locid="MyApp.Utilities.SplashScreen.updateImageLocation">
        /// Updates the location of the extended splash screen image. Should be used to respond to window size changes.
        /// </summary>
        if (MyApp.Utilities.SplashScreen.isVisible()) {
            var extendedSplashImage = document.getElementById("extendedsplashscreenimage");

            // Position the extended splash screen image in the same location as the system splash screen image.
            if (splash.imageLocation.x === 650) {
                extendedSplashImage.style.top = splash.imageLocation.y + "px";
                extendedSplashImage.style.left = splash.imageLocation.x + "px";
                extendedSplashImage.style.width = splash.imageLocation.width + "px";
                extendedSplashImage.style.height = splash.imageLocation.height + "px";
            }
            else if (splash.imageLocation.x === 410) {
                extendedSplashImage.style.top = splash.imageLocation.y + "px";
                extendedSplashImage.style.left = splash.imageLocation.x + "px";
                extendedSplashImage.style.width = splash.imageLocation.width + "px";
                extendedSplashImage.style.height = splash.imageLocation.height + "px";
            }
            else {
                extendedSplashImage.style.top = "424px";
                extendedSplashImage.style.left = "1px";
                extendedSplashImage.style.width = "480px";
                extendedSplashImage.style.height = "232px";
            }

            // Position the extended splash screen's progress ring. Note: In this sample, the progress ring is not used.
            var extendedSplashProgress = document.getElementById("extendedsplashscreenprogress");
            extendedSplashProgress.style.marginTop = splash.imageLocation.y + splash.imageLocation.height + 32 + "px";
            var extendedSplashProgressRect = extendedSplashProgress.getBoundingClientRect();
            extendedSplashProgress.style.left = "calc(50% - " + parseFloat(extendedSplashProgress, extendedSplashProgress.currentStyle.width) / 2 + "px)";
        }
    };

    function splashscreen_isVisible() {
        /// <summary locid="MyApp.Utilities.SplashScreen.isVisible">
        /// Checks whether the extended splash screen is visible and returns a boolean.
        /// </summary>
        var extendedSplashScreen = document.getElementById("extendedsplashscreen");
        return !(extendedSplashScreen.classList.contains("xbdh-hidden"));
    };

    function splashscreen_remove() {
        /// <summary locid="MyApp.Utilities.SplashScreen.remove">
        /// Removes the extended splash screen if it is currently visible.
        /// </summary>
        if (splashscreen_isVisible()) {
            var extendedSplashScreen = document.getElementById("extendedsplashscreen");
            extendedSplashScreen.classList.add("xbdh-hidden");
        }
    };

    /*
     * Windows app functions
     */
    var webUIApplication = Windows.UI.WebUI.WebUIApplication;
    var isFreshLaunch = true;

    /* Suspending */
    function handleSuspended(args) {
        // Removing handler for notifications from DevService
        Microsoft.Xbox.Development.UnattendedUtilities.removeEventListener("notificationreceived", DevHome.Utilities._addNotification);
        // Removing hander for scripts that start running
        Microsoft.Xbox.Development.UnattendedUtilities.removeEventListener("scriptrunningchanged", DevHome.Utilities._checkForUnattendedScript);
    }
    webUIApplication.addEventListener("suspending", handleSuspended, false);

    /* Resuming */
    function handleResuming(args) {
        // Restart the handler for when a notification comes in
        Microsoft.Xbox.Development.UnattendedUtilities.addEventListener("notificationreceived", DevHome.Utilities._addNotification);
        // Restart the handler for when a script starts running
        Microsoft.Xbox.Development.UnattendedUtilities.addEventListener("scriptrunningchanged", DevHome.Utilities._checkForUnattendedScript);
    }
    webUIApplication.addEventListener("resuming", handleResuming, false);

    /* Activation and error handlers */
    function handleActivated(args) {
        if (isFreshLaunch) {
            isFreshLaunch = false;
            var winRTArgs = args.detail[0];
            splashscreen_show(winRTArgs.splashScreen);
            _initialize(winRTArgs);
        }
        _handleProtocolActivation(args);
    };
    
    webUIApplication.addEventListener("activated", handleActivated, false);

    function _globalErrorHandler(args) {
        if (args &&
            args.detail) {
            var code = args.detail.errorCode || (args.detail.error && args.detail.error.number);
            var message = args.detail.errorMessage;
            var stackTrace = args.detail.error && args.detail.error.stack;
            DevHome.Utilities._Events.logError(code, message, stackTrace);
        }
    };
    window.addEventListener("error", _globalErrorHandler, false);

    function _handleProtocolActivation(args) {
        if (!args ||
            args.kind !== Windows.ApplicationModel.Activation.ActivationKind.protocol) {
            return;
        }

        // Uri format: ms-xbl-1c835833://show-overlay?uri=http%3A%2F%2Fwww.bing.com
        // Uri format: ms-xbl-1c835833://unattendedscript[?action=<abort or complete>]
        var activationUri = args.uri;
        var action = activationUri.host;
        var caseInsensitivAction = action.toLowerCase();
        if (caseInsensitivAction === "show-overlay") {
            var queryArgs = activationUri.queryParsed;
            var uri = "";
            for (var i = 0; i < queryArgs.size; i++) {
                var caseInsensitiveQueryArg = queryArgs[i].name.toLowerCase();
                switch (caseInsensitiveQueryArg) {
                    case "uri":
                        uri = queryArgs[i].value;
                        break;
                    default:
                        break;
                }
            }

            // Show an overlay with the HTML contents - give the overlay a default close button.
            var overlayRootElement = document.createElement("div");
            var innerHtml =
                '<iframe id="xbdh-whatnewframe" tabindex="0" class="xbdh-whatnewframe xbdh-hidden" src="' + decodeURIComponent(uri) + '"></iframe>' +
                '<div class="xbdh-form-buttons">' +
                '  <button class="xbdh-popup-primarycommand">' + DevHome.Utilities.Resources.getString("commandClose").value + '</button>' +
                '</div>';

            var overlay = new DevHome.UI.Overlay(overlayRootElement, { html: innerHtml });

            // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
            // to get reset to the main workspace after this function executes, which we don't want. We want the show() method
            // call to set focus to the user details overlay instead.
            setTimeout(function () {
                if (overlay) {
                    overlay.show();
                    DevHome.Utilities.showProgress(overlayRootElement);
                    var frame = overlayRootElement.querySelector("#xbdh-whatnewframe");
                    frame.addEventListener("load", function handleLoad() {
                        frame.removeEventListener("load", handleLoad);
                        DevHome.Utilities.hideProgress(overlayRootElement);
                        frame.classList.remove("xbdh-hidden");
                    }, false);

                    var primaryCommandButton = overlayRootElement.querySelector(".xbdh-popup-primarycommand");
                    primaryCommandButton.addEventListener("click", overlay.hide.bind(overlay), false);

                    setImmediate(function () {
                        if (primaryCommandButton) {
                            xbdhUtils._trySetActive(primaryCommandButton);
                        }
                    });
                }
            }.bind(this));
        } else if (caseInsensitivAction === "unattendedscript") {
            var queryArgs = activationUri.queryParsed;
            var action = "";
            var logFilePath = "";
            for (var i = 0; i < queryArgs.size; i++) {
                var caseInsensitiveQueryArg = queryArgs[i].name.toLowerCase();
                switch (caseInsensitiveQueryArg) {
                    case "action":
                        action = queryArgs[i].value.toLowerCase();
                        break;
                    case "filename":
                        logFilePath = queryArgs[i].value;
                        break;
                    default:
                        break;
                }
            }

            if (action === "abort") {
                // Mark the script as being aborted. DevService will take care of the rest.
                Microsoft.Xbox.Development.UnattendedUtilities.abortUnattendedScript();
            } else if (action === "complete") {
                // Pop an overlay showing the script output if we can find it.
                if (logFilePath) {
                    var finalSlash = logFilePath.lastIndexOf('\\');

                    if (finalSlash) {
                        var filename = logFilePath.substring(finalSlash + 1);
                        var folderPath = logFilePath.substring(0, finalSlash);

                        DevHome.Utilities.showSimpleTextFileAsync(folderPath, filename);
                    }
                }
            }
        }
    };
})();
