// Copyright (c) Microsoft Corporation. All rights reserved.
(function () {
    "use strict";

    // Launcher class
    var Launcher = (function () {
        // Namespace shortcuts
        var utils = DevHome.Utilities;
        var applicationContentType = Microsoft.Xbox.Development.ApplicationContentType;
        var appUtils = Microsoft.Xbox.Development.ApplicationUtilities;
        var storageUtils = Microsoft.Xbox.Development.StorageUtilities;
        var plmState = Microsoft.Xbox.Development.PackageExecutionState;
        var xbdhUtils = DevHome.Utilities;
        var nativeUtils = xbdhUtils.getDevHomeNativeUtilities();

        // Consts
        var strings = {
            launcherAppTypeGame: "",
            launcherAppTypeApp: ""
        };

        function Launcher(element, options) {
            // Private variables
            this._appLaunchParameters = new Map();
            this._stubAppPfn = "Microsoft.Title.StubApp_1.0.0.0_neutral__8wekyb3d8bbwe";
            this._applicationManager = xbdhUtils.getConsoleExtensions().ApplicationManager;
            this._element = element || document.createElement("div");
            this._handleFocusChangedBound = this._handleFocusChanged.bind(this);
            this._handleRemotePackageBeforeHideBound = this._handleRemotePackageBeforeHide.bind(this);
            this._listElement = this._element.querySelector("#xbdh-launcher");
            this._contextMenuElement = this._element.querySelector("#xbdh-launcher-contextmenu");
            this._contextSubMenuElement = this._element.querySelector("#xbdh-launcher-contextmenu-subpackage");
            this._refreshAppListBound = this._refreshAppListAsync.bind(this);
            this._refreshUnregisteredAppsListBound = this._refreshUnregisteredAppsList.bind(this);
            this._refreshPlmStateBound = this._refreshPlmStateAsync.bind(this);
            this._addActiveOnlyEventListenersBound = this._addActiveOnlyEventListeners.bind(this);
            this._removeActiveOnlyEventListenersBound = this._removeActiveOnlyEventListeners.bind(this);
            this._isLaunching = false;

            this._element.winControl = this;

            this._listElement.setAttribute("aria-label", DevHome.Utilities.Resources.getString("launcherTitle").value);

            // Context menu
            this._setUpContextMenu();

            // Set up
            this._applicationManager.addEventListener("installedpackageschanged", this._refreshAppListBound, false);
            this._applicationManager.addEventListener("packageexecutionstatechanged", this._refreshPlmStateBound, false);

            Windows.UI.WebUI.WebUIApplication.addEventListener("activated", this._refreshAppListBound, false);
            Windows.UI.WebUI.WebUIApplication.addEventListener("resuming", this._refreshUnregisteredAppsListBound, false);
            Windows.UI.WebUI.WebUIApplication.addEventListener("resuming", this._refreshPlmStateBound, false);

            this._addActiveOnlyEventListeners();
            Windows.UI.WebUI.WebUIApplication.addEventListener("resuming", this._addActiveOnlyEventListenersBound, false);
            Windows.UI.WebUI.WebUIApplication.addEventListener("suspending", this._removeActiveOnlyEventListenersBound, false);

            this._createDomAsync().then(function () {
                TVJS.DirectionalNavigation.addEventListener("focuschanged", this._handleFocusChangedBound, false);
            }.bind(this));
        }
        Object.defineProperty(Launcher.prototype, "element", {
            get: function () {
                return this._element;
            },
            enumerable: true,
            configurable: true
        });
        // Private methods
        Launcher.prototype._createDomAsync = async function () {
            var innerHtml = "";
            this._apps = await this._getAppsAsync();
            if (!this._apps) {
                return;
            }

            var htmlPromises = [];
            for (let i = 0, len = this._apps.length; i < len; i++) {
                htmlPromises.push(this._getHtmlDomStringForAppAsync(this._apps[i]));
            }

            var htmlDomStrings = await Promise.all(htmlPromises);

            for (let i = 0, len = htmlDomStrings.length; i < len; i++) {
                innerHtml += htmlDomStrings[i];
            }

            // If there are no apps
            if (this._apps.length === 0) {
                innerHtml += '<div class="xbdh-form xbdh-launcher-noappsmessage"><p>' + DevHome.Utilities.Resources.getString("launcherNoApps").value + '</p></div>';
            }

            this._listElement.innerHTML = innerHtml;

            // Attach click handlers
            var appElements = this._listElement.querySelectorAll(".xbdh-launcher-app");
            for (var i = 0, len = appElements.length; i < len; i++) {
                appElements[i].addEventListener("click", this._handleClick.bind(this), false);
                appElements[i].addEventListener("keyup", this._handleClick.bind(this), false);
                appElements[i].addEventListener("focus", this._handleFocus.bind(this), false);
                appElements[i].addEventListener("blur", this._handleBlur.bind(this), false);
            }

            var registerRemotePackageCommand = this._element.querySelector("#xbdh-launcher-addremotepackage");
            registerRemotePackageCommand.addEventListener("click", this._showRegisterRemotePackageDialog.bind(this), false);
        };
        Launcher.prototype._promptUninstallConfirmation = function (e) {
            var app = this._uninstalling_app;
            var description = DevHome.Utilities.Resources.getString("launcherUninstallConfirmationDescription").value + app.aumid;

                DevHome.Utilities.showPopUp(
                DevHome.Utilities.Resources.getString("launcherUninstallConfirmationTitle").value,
                description,
                {
                    label: DevHome.Utilities.Resources.getString("launcherUninstall").value,
                    callback: this._uninstallApplication.bind(this),
                },
                {
                    label: DevHome.Utilities.Resources.getString("commandCancel").value,
                    callback: this._cancelUninstall.bind(this),
                });
        };
        Launcher.prototype._findPackageInfoByAumid = function (amuid) {
            for (var i = 0, len = this._apps.length; i < len; i++) {
                if (this._apps[i].aumid === amuid) {
                    return this._apps[i];
                }
            }
            return null;
        };
        Launcher.prototype._friendlyPlmStateFromEnum = function (plmStateEnum) {
            var friendlyPlmState = "";
            switch (plmStateEnum) {
                case plmState.unknown:
                    friendlyPlmState = DevHome.Utilities.Resources.getString("launcherPlmStateUnknown").value;
                    break;
                case plmState.running:
                    friendlyPlmState = DevHome.Utilities.Resources.getString("launcherPlmStateRunning").value;
                    break;
                case plmState.suspending:
                    friendlyPlmState = DevHome.Utilities.Resources.getString("launcherPlmStateSuspending").value;
                    break;
                case plmState.suspended:
                    friendlyPlmState = DevHome.Utilities.Resources.getString("launcherPlmStateSuspended").value;
                    break;
                case plmState.terminated:
                    friendlyPlmState = DevHome.Utilities.Resources.getString("launcherPlmStateTerminated").value;
                    break;
                case plmState.constrained:
                    friendlyPlmState = DevHome.Utilities.Resources.getString("launcherPlmStateConstrained").value;
                    break;
                default:
                    friendlyPlmState = DevHome.Utilities.Resources.getString("launcherPlmStateUnknown").value;
                    break;
            }
            return friendlyPlmState;
        };

        Launcher.prototype._isUnregistered = function (packageInfo) {
            return packageInfo.deployType === "UnregisteredFolder" ||
                packageInfo.deployType === "UnregisteredNetwork" ||
                packageInfo.deployType == "UnregisteredPackage";
        };

        Launcher.prototype._fixUnregisteredDeployPath = function (deployPath) {
            if (deployPath.startsWith("SystemScratch\\")) {
                deployPath = deployPath.replace("SystemScratch\\", "d:\\");
            } else if (deployPath.startsWith("\\\\?\\XrfsFile\\[xbtp]")) {
                deployPath = deployPath.replace("\\\\?\\XrfsFile\\[xbtp]", "xbtp:\\\\");
                deployPath = deployPath.replace("$", ":");
            } else if (deployPath.startsWith("\\\\[xbtp]")) {
                deployPath = deployPath.replace("\\\\[xbtp]", "xbtp:\\\\");
                deployPath = deployPath.replace("$", ":");
            }
            return deployPath;
        };

        Launcher.prototype._getAppsAsync = async function () {
            var apps = [];
            var combinedPackages = null;
            var i, len;
            try {
                var installedPackages = await nativeUtils.getInstalledPackagesAsync(true);
                var unregisteredPackages = await nativeUtils.getUnregisteredPackagesAsync();

                var runningTitleName = await nativeUtils.getRunningTitleName();
                var runningTitleDeployPath = await nativeUtils.getRunningTitleDeployPath();

                // Make sure the path is fixed up to match our deploy paths.
                runningTitleDeployPath = this._fixUnregisteredDeployPath(runningTitleDeployPath);

                combinedPackages = [];

                for (i = 0, len = installedPackages.length; i < len; ++i) {
                    combinedPackages.push(installedPackages[i]);
                }

                for (i = 0, len = unregisteredPackages.length; i < len; ++i) {
                    combinedPackages.push(unregisteredPackages[i]);
                }
            } catch (ex) {
                // We need to exit
                var errorTitle = DevHome.Utilities.Resources.getString("errorCorruptedAppDetectedTitle").value;
                var errorMessage = DevHome.Utilities.Resources.getString("errorCorruptedAppDetectedDescription").value;
                utils.showError(null, errorTitle, errorMessage);
                return;
            }

            for (i = 0, len = combinedPackages.length; i < len; ++i) {
                var installedPackage = combinedPackages[i];
                await (async () => {

                    if (installedPackage.applications) {
                        for (let j = 0, appLen = installedPackage.applications.length; j < appLen; ++j) {
                            var applicationInfo = installedPackage.applications[j];

                            var newApp = {
                                packageInfo: installedPackage,
                                applicationInfo: applicationInfo,
                                displayName: applicationInfo.displayName,
                                packageFullName: installedPackage.packageFullName,
                                aumid: applicationInfo.aumid,
                                executable: applicationInfo.executable,
                                titleId: applicationInfo.titleId,
                                deployPath: installedPackage.deployPath,
                                isGameCore: installedPackage.isGameCore,
                                isUnregistered: this._isUnregistered(installedPackage),
                                isLooseGameCore: installedPackage.isGameCore && installedPackage.deployType !== "Install" && installedPackage.deployType !== "UnregisteredPackage",
                                uniqueId: nativeUtils.createGuid()
                            };

                            // Loose Game Core should show their path and exe, not PFN.
                            if (newApp.isLooseGameCore) {
                                // Fix up the deploy path before looking for duplicates.
                                newApp.deployPath = this._fixUnregisteredDeployPath(newApp.deployPath);

                                if (installedPackage.applications.length === 1) {
                                    newApp.displayName = newApp.executable;
                                } else if (!newApp.displayName) {
                                    newApp.displayName = newApp.packageFullName;
                                }
                            }
                            else if (newApp.isUnregistered && !newApp.isLooseGameCore) {

                                var formattedDisplayName = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("unregisteredPackageDisplayString").value, DevHome.Utilities.Resources.getString(newApp.packageInfo.deployDrive).value);
                                if (newApp.packageInfo.packageAlias) {
                                    formattedDisplayName = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("unregisteredPackageWithAliasDisplayString").value, newApp.packageInfo.packageAlias, DevHome.Utilities.Resources.getString(newApp.packageInfo.deployDrive).value);
                                }
                                newApp.displayName = formattedDisplayName;
                            }

                            // We need to de-dupe any multi-AUMID packages that are versions of the same app. To do that we check if we already have an app with the same PFN (for registered)
                            // or deployPath (for unregistered) in our list
                            var duplicateApp = false;
                            for (var i = 0, len = apps.length; i < len; ++i) {

                                if (apps[i].isUnregistered !== newApp.isUnregistered) {
                                    continue;
                                }

                                if (apps[i].isUnregistered) {
                                    if (apps[i].isLooseGameCore) {
                                        if (apps[i].deployPath === newApp.deployPath) {
                                            duplicateApp = true;
                                            break;
                                        }
                                    } else {
                                        if (apps[i].packageFullName === newApp.packageFullName &&
                                            apps[i].packageInfo.deployDrive === newApp.packageInfo.deployDrive &&
                                            apps[i].packageInfo.packageAlias === newApp.packageInfo.packageAlias) {
                                            duplicateApp = true;
                                            break;
                                        }
                                    }
                                } else if (apps[i].packageFullName === newApp.packageFullName) {
                                    duplicateApp = true;
                                    break;
                                }
                            }

                            if (!duplicateApp) {

                                var executionState = plmState.unknown;
                                if (!newApp.isUnregistered) {
                                    try {
                                        // Get PLM state
                                        executionState = await nativeUtils.queryPackageExecutionStateAsync(newApp.packageFullName);
                                    } catch (e) {
                                        // App must have been uninstalled. Let's return from our enumeration--the uninstall event
                                        // should have triggered a new enumeration which will be accurate.
                                        return;
                                    }
                                } else {
                                    // If the stub app is running, see if it matches this app and set PLM appropriately.
                                    if (runningTitleName.startsWith("Microsoft.Title.StubApp") &&
                                        runningTitleDeployPath === newApp.deployPath) {
                                        try {
                                            // Get PLM state
                                            executionState = await nativeUtils.queryPackageExecutionStateAsync(runningTitleName);
                                        } catch (e) {
                                            // Do nothing. Stub app must have terminated.
                                        }
                                    }
                                }
                                newApp.plmStateEnum = executionState;
                                newApp.plmState = this._friendlyPlmStateFromEnum(executionState);

                                apps.push(newApp);
                            }
                        }
                    }
                })();
            }

            // Sort the array by display name
            apps.sort(function (a, b) {
                return a.displayName.localeCompare(b.displayName);
            });
            return apps;
        };
        Launcher.prototype._getHtmlDomStringForAppAsync = async function (app) {

            if (!app) {
                return;
            }

            var plmString = app.plmState;
            var overlayFolder = await nativeUtils.getOverlayFolderAsync(app.packageFullName);
            if (overlayFolder) {
                plmString += DevHome.Utilities.Resources.getString("launcherPlmStateOverlayActive").value;
                app.overlayFolder = overlayFolder;
            }

            var applications = app.packageInfo.applications;
            var firstLine = app.displayName;
            var secondLine = app.packageFullName;

            // Determine if the app is a multi-AUMID package
            var multiAumid = applications.size > 1;

            // For loose GameCore we also need to show the package deploy path. PackageFullName
            // is not as important for these so that's what we'll choose to hide for now
            // (until the next UI refresh cycle gives us time to rethink this).
            if (app.isLooseGameCore) {
                secondLine = app.deployPath;
            }
            var menuAriaLabel = DevHome.Utilities.Resources.getString("menuDescription").value;
            var innerHtml = '<div class="win-focusable xbdh-launcher-app xbdh-list-item" role="listitem" tabIndex="0" data-xbdh-uniqueid="' + app.uniqueId + '">' +
                             '<img class="xbdh-viewicon xbdh-viewicon-hidemenuicononhover" role="menu" aria-label="' + menuAriaLabel + '" src="/framework/media/view-icon.svg" />' +
                             '  <div class="xbdh-launcher-app-names">' +
                             '    <div class="xbdh-launcher-app-displayname xbdh-fontweight-bold">' + firstLine + '</div>' +
                             '    <div class="xbdh-launcher-app-pfn">' + secondLine + '</div>' +
                             '  </div>' +
                             '  <div class="xbdh-launcher-app-plmstate">' + plmString + '</div>';
            if (multiAumid) {
                innerHtml += '  <div class="xbdh-launcher-app-expandcollapsevisual xbdh-icon-expand"></div>';
            }
            innerHtml += '</div>';
            if (multiAumid) {
                var defaultApp;
                if (!app.isUnregistered) {
                    defaultApp = this._applicationManager.getDefaultApp(app.titleId);
                }
                var defaultAppSymbol = "";
                innerHtml += '<div class="xbdh-launcher-multieras xbdh-hidden">';
                for (var j = 0, len = applications.size; j < len; j++) {
                    var application = applications[j];
                    var displayId;
                    if (app.isLooseGameCore) {
                        displayId = application.executable;
                    } else {
                        var idIndex = application.aumid.lastIndexOf("!");
                        if (idIndex === -1) {
                            // Should never happen as all AUMIDs have a !, but just in case
                            displayId = application.aumid;
                        } else {
                            displayId = application.aumid.substring(idIndex + 1);
                        }
                    }

                    if (!app.isUnregistered && defaultApp === application.aumid) {
                        defaultAppSymbol = DevHome.Utilities.Resources.getString("launcherDefaultAppSymbol").value;
                    } else {
                        defaultAppSymbol = "";
                    }
                    innerHtml += '  <div tabIndex="0" class="xbdh-launcher-app xbdh-list-item xbdh-launcher-app-subpackage xbdh-button win-focusable" data-xbdh-uniqueid="' + app.uniqueId + '" data-xbdh-exe="' + application.executable + '" data-xbdh-aumid="' + application.aumid + '" data-xbdh-contextmenu="#xbdh-launcher-contextmenu-subpackage">' +
                                 '    <div class="xbdh-launcher-app-aumid">' + displayId + '<span class="xbdh-launcher-app-defaultappvisual">' + defaultAppSymbol + '</span></div>' +
                                 '  </div>';
                }
                innerHtml += '</div>';
            }
            return innerHtml;
        };
        Launcher.prototype._getAppByAumid = function (aumid) {
            var apps = this._apps;
            for (var i = 0, len = apps.length; i < len; i++) {
                var app = apps[i];
                if (app.aumid === aumid) {
                    return app;
                }
                var numberOfSubPackages = app.packageInfo.applications.length;
                if (numberOfSubPackages > 1) {
                    for (var j = 0, len2 = numberOfSubPackages; j < len2; j++) {
                        var subPackage = app.packageInfo.applications[j];
                        if (subPackage.aumid === aumid) {
                            return subPackage;
                        }
                    }
                }
            }
            return null;
        };
        Launcher.prototype._handleFocus = function (e) {
            var srcElement = e.srcElement;

            var viewIcon = srcElement.querySelector(".xbdh-viewicon");

            if (viewIcon) {
                viewIcon.classList.remove("xbdh-viewicon-hidemenuicononhover");
                viewIcon.classList.add("xbdh-viewicon-showmenuicononhover");
            }
        };
        Launcher.prototype._handleBlur = function (e) {
            var srcElement = e.srcElement;

            var viewIcon = srcElement.querySelector(".xbdh-viewicon");

            if (viewIcon) {
                viewIcon.classList.remove("xbdh-viewicon-showmenuicononhover");
                viewIcon.classList.add("xbdh-viewicon-hidemenuicononhover");
            }
        };
        Launcher.prototype._handleClick = function (e) {

            if (e.keyCode &&
                (e.keyCode !== DevHome.Utilities.Key.enter &&
                    e.keyCode !== DevHome.Utilities.Key.space)) {
                return;
            }

            var srcElement = e.srcElement;

            // Move our source element to the first app parent element if this was
            // the result of a mouse click.
            if (e.pointerType && e.pointerType === "mouse") {
                while (srcElement.parentNode && !srcElement.classList.contains("xbdh-launcher-app")) {
                    srcElement = srcElement.parentNode;
                }
            }

            var collectionOfMultiEraPackages = false;
            if (srcElement.nextElementSibling) {
                collectionOfMultiEraPackages = srcElement.nextElementSibling.classList.contains("xbdh-launcher-multieras");
            }
            if (collectionOfMultiEraPackages) {
                var multiEraApps = srcElement.nextElementSibling;
                var expandCollapseVisual = srcElement.querySelector(".xbdh-launcher-app-expandcollapsevisual");
                if (expandCollapseVisual) {
                    if (multiEraApps.classList.contains("xbdh-hidden")) {
                        multiEraApps.classList.remove("xbdh-hidden");
                        expandCollapseVisual.classList.remove("xbdh-icon-expand");
                        expandCollapseVisual.classList.add("xbdh-icon-collapse");
                        srcElement.classList.add("xbdh-expanded");
                    } else {
                        multiEraApps.classList.add("xbdh-hidden");
                        expandCollapseVisual.classList.add("xbdh-icon-expand");
                        expandCollapseVisual.classList.remove("xbdh-icon-collapse");
                        srcElement.classList.remove("xbdh-expanded");
                    }
                }
            } else {
                var app = this._getAppByElement(srcElement);
                if (app) {
                    this._launchOrResumeAsync(app, srcElement);
                }
            }
        };
        Launcher.prototype._getAppByElement = function (srcElement) {
            if (!srcElement) {
                return;
            }
            var uniqueId = srcElement.getAttribute("data-xbdh-uniqueid");

            if (!uniqueId) {
                return;
            }

            if (this._apps) {
                for (var i = 0; i < this._apps.length; ++i) {
                    var app = this._apps[i];
                    if (app && app.uniqueId === uniqueId) {
                        return app;
                    }
                }
            }
        };
        Launcher.prototype._hideContextMenuElement = function (element) {
            element.classList.add("xbdh-hidden");
            element.disabled = true;
        };
        Launcher.prototype._showContextMenuElement = function (element) {
            element.classList.remove("xbdh-hidden");
            element.disabled = false;
        };
        Launcher.prototype._updateAvailablePlm = function (element) {
            // Update the available PLM options based on the current application.
            var currentContextMenu = false;
            var app = this._getAppByElement(element);

            // Also try our parent element's context in case the menu is currently up (focus won't change
            // so we need to manually update PLM here).
            if (!app && element && element.parentNode && element.parentNode.winControl) {
                currentContextMenu = element.parentNode;
                app = this._getAppByElement(currentContextMenu.winControl.context);
            }

            if (app) {
                var contextMenuElement = this._contextMenuElement;
                var suspendCommand = contextMenuElement.querySelector("#xbdh-launcher-contextmenu-suspend");
                var resumeCommand = contextMenuElement.querySelector("#xbdh-launcher-contextmenu-resume");
                var launchCommand = contextMenuElement.querySelector("#xbdh-launcher-contextmenu-launch");
                var terminateCommand = contextMenuElement.querySelector("#xbdh-launcher-contextmenu-terminate");
                var uninstallCommand = contextMenuElement.querySelector("#xbdh-launcher-contextmenu-uninstall");
                var removeCommand = contextMenuElement.querySelector("#xbdh-launcher-contextmenu-remove");
                var appDetailsCommand = contextMenuElement.querySelector("#xbdh-launcher-contextmenu-appdetails");
                var launchWithParametersCommand = contextMenuElement.querySelector("#xbdh-launcher-contextmenu-launchwithparameters");

                var subpackageContextMenu = this._contextSubMenuElement;
                var resumeSubCommand = subpackageContextMenu.querySelector("#xbdh-launcher-contextmenu-subpackage-resume");
                var launchSubCommand = subpackageContextMenu.querySelector("#xbdh-launcher-contextmenu-subpackage-launch");
                var setDefaultAppCommand = subpackageContextMenu.querySelector("#xbdh-launcher-contextmenu-subpackage-setdefaultapp");

                if (app.isUnregistered) {
                    this._hideContextMenuElement(appDetailsCommand);
                    this._hideContextMenuElement(launchWithParametersCommand);
                    this._hideContextMenuElement(setDefaultAppCommand);
                    this._hideContextMenuElement(uninstallCommand);

                    this._showContextMenuElement(removeCommand);
                } else {
                    this._showContextMenuElement(appDetailsCommand);
                    this._showContextMenuElement(launchWithParametersCommand);

                    if (app.titleId && app.titleId !== "0") {
                        this._showContextMenuElement(setDefaultAppCommand);
                    }
                    else {
                        this._hideContextMenuElement(setDefaultAppCommand);
                    }
                    this._showContextMenuElement(uninstallCommand);

                    this._hideContextMenuElement(removeCommand);
                }

                // If the app is not running, show launch and hide others.
                if (app.plmStateEnum === plmState.unknown ||
                    app.plmStateEnum === plmState.terminated) {
                    this._showContextMenuElement(launchCommand);
                    this._showContextMenuElement(launchSubCommand);

                    this._hideContextMenuElement(resumeCommand);
                    this._hideContextMenuElement(resumeSubCommand);
                    this._hideContextMenuElement(suspendCommand);
                    this._hideContextMenuElement(terminateCommand);
                } else {
                    this._hideContextMenuElement(launchCommand);
                    this._hideContextMenuElement(launchSubCommand);

                    this._showContextMenuElement(resumeCommand);
                    this._showContextMenuElement(resumeSubCommand);
                    this._showContextMenuElement(terminateCommand);

                    if (app.plmStateEnum === plmState.suspended) {
                        this._hideContextMenuElement(suspendCommand);
                    } else {
                        this._showContextMenuElement(suspendCommand);
                    }
                }

                // Unregistered, multi-exe apps don't have a default so hide
                // the launch button regardless of execution state.
                if (app.isUnregistered && app.packageInfo.applications.size > 1) {
                    this._hideContextMenuElement(launchCommand);
                }

                // If we just disabled our current focus we'll need
                // to change focus to a new element (preferably the
                // first element of whichever context menu is open).
                if (currentContextMenu && element.disabled) {
                    if (currentContextMenu === contextMenuElement) {
                        if (!launchCommand.hidden) {
                            launchCommand.focus();
                        } else if (!resumeCommand.hidden) {
                            resumeCommand.focus();
                        }
                    } else if (currentContextMenu === subpackageContextMenu) {
                        if (!launchSubCommand.hidden) {
                            launchSubCommand.focus();
                        } else if (!resumeSubCommand.hidden) {
                            resumeSubCommand.focus();
                        }
                    }
                }
            }
        };
        Launcher.prototype._handleFocusChanged = function (e) {
            // We need to make sure the next focused element is on screen.
            var focusedElement = document.activeElement;
            if (this._listElement.contains(focusedElement))
            {
                var focusedElementBoundingRect = focusedElement.getBoundingClientRect();
                var listElementBoundingRect = this._listElement.getBoundingClientRect();
                if (focusedElementBoundingRect.bottom > listElementBoundingRect.bottom) {
                    this._listElement.scrollTop += focusedElementBoundingRect.bottom - listElementBoundingRect.bottom;
                }
                else if (focusedElementBoundingRect.top < listElementBoundingRect.top) {
                    this._listElement.scrollTop -= listElementBoundingRect.top - focusedElementBoundingRect.top;
                }

                this._updateAvailablePlm(focusedElement);
            }
        };
        Launcher.prototype._launchAsync = async function (aumid) {
            var errorNumber = await nativeUtils.launchAsync(aumid);
            if (errorNumber !== 0) {
                // The application could have failed to launch for a number of reasons, all harmless.
                // (eg. already running, app crashed during activation, etc)
                xbdhUtils._Events.logUIAction("Launcher:LaunchAppFailure", errorNumber);

                 // LM_E_ENTITLED_USER_SIGNED_OUT: 0x803F9006
                if (errorNumber == -2143318010) {
                    var errorTitle = DevHome.Utilities.Resources.getString("errorEntitledUserSignedOut").value;
                    var errorMessage = DevHome.Utilities.Resources.getString("errorEntitledUserSignedOutDescription").value;

                    utils.showError(null, errorTitle, errorMessage);
                // E_XTFAPP_NO_SIMPLIFIED_DEFAULT_USER: 0x8d160196
                } else if (errorNumber === -1927937642) {
                    var errorTitle = DevHome.Utilities.Resources.getString("errorDefaultUserRequired").value;
                    var errorMessage = DevHome.Utilities.Resources.getString("errorDefaultUserRequiredDescription").value;

                    utils.showError(null, errorTitle, errorMessage);
                }
            } else {
                xbdhUtils._Events.logUIAction("Launcher:LaunchAppSuccess");
            }
        };
        Launcher.prototype._launchByExeAsync = async function (deployPath, exePath) {
            var errorNumber = await nativeUtils.launchByExeAsync(deployPath, exePath);
            if (errorNumber !== 0) {
                // The application could have failed to launch for a number of reasons, all harmless.
                // (eg. already running, app crashed during activation, etc)
                xbdhUtils._Events.logUIAction("Launcher:LaunchAppFailure", errorNumber);

                // LM_E_ENTITLED_USER_SIGNED_OUT: 0x803F9006
                if (errorNumber == -2143318010) {
                    var errorTitle = DevHome.Utilities.Resources.getString("errorEntitledUserSignedOut").value;
                    var errorMessage = DevHome.Utilities.Resources.getString("errorEntitledUserSignedOutDescription").value;

                    utils.showError(null, errorTitle, errorMessage);
                    // E_XTFAPP_NO_SIMPLIFIED_DEFAULT_USER: 0x8d160196
                } else if (errorNumber === -1927937642) {
                    var errorTitle = DevHome.Utilities.Resources.getString("errorDefaultUserRequired").value;
                    var errorMessage = DevHome.Utilities.Resources.getString("errorDefaultUserRequiredDescription").value;

                    utils.showError(null, errorTitle, errorMessage);
                }
            } else {
                xbdhUtils._Events.logUIAction("Launcher:LaunchAppSuccess");
            }
        };
        Launcher.prototype._launchOrResumeAsync = async function (app, srcElement) {
            // For multi-exe packages.
            var targetExe = srcElement.getAttribute("data-xbdh-exe");
            var targetAumid = srcElement.getAttribute("data-xbdh-aumid");
            var executionState = plmState.unknown;
            var packageFullName = app.packageFullName;

            if (!targetExe && !targetAumid) {
                if (!app.isUnregistered) {
                    var defaultApp = this._applicationManager.getDefaultApp(app.titleId);

                    if (defaultApp) {
                        targetExe = undefined;
                        targetAumid = defaultApp;
                    }
                }

                if (!targetExe && !targetAumid) {
                    targetExe = app.executable;
                    targetAumid = app.aumid;
                }
            }

            if (app.isUnregistered) {
                try {
                    // Get PLM state
                    packageFullName = this._stubAppPfn;
                    executionState = await this._getUnregisteredAppExecutionStateAsync(app);

                    var runningTitleExePath = await nativeUtils.getRunningTitleExePath();

                    // Catch the case where another EXE from this same folder is running.
                    if (targetExe && targetExe !== runningTitleExePath) {
                        executionState = plmState.unknown;
                    }
                } catch (e) {
                    // Do nothing. Stub app must have terminated, so we'll do a full
                    // launch of this application.
                }
            } else {

                try {
                    // If the app is already running, then resume it instead of launching it
                    executionState = await nativeUtils.queryPackageExecutionStateAsync(app.packageFullName);

                    var activeAumid = this._applicationManager.getActiveAppFromPackage(app.packageFullName);

                    // Treat this as needing a full launch if the running aumid is a different one than
                    // what we are launching.
                    if (targetAumid !== activeAumid) {
                        executionState = plmState.terminated;
                    }
                } catch (e) {
                    // App must have been uninstalled.
                    return;
                }
            }

            if (!this._isLaunching) {
                this._isLaunching = true;
                var promise;

                // We check for the existence of an active app. If there is an active app
                // that means that we are running a multi-package app. In the case of a multi-package
                // app, checking the package full name is not enough. We also need to check the aumid.
                if (executionState !== plmState.terminated &&
                    executionState !== plmState.unknown) {
                    if (executionState === plmState.constrained) {
                        promise = this._unconstrainAsync(packageFullName);
                    } else {
                        promise = this._resumeByPackageNameAsync(packageFullName);
                    }
                } else {
                    if (app.isLooseGameCore && targetExe) {
                        promise = this._launchByExeAsync(app.deployPath, targetExe);
                    } else {
                        promise = this._launchAsync(targetAumid);
                    }
                }

                if (promise) {
                    promise.finally(() => {
                        this._isLaunching = false;
                    });
                } else {
                    this._isLaunching = false;
                }
            }
        };

        Launcher.prototype._refreshUnregisteredAppsList = async function (e) {
            try {
                var needsFullRefresh = false;
                var unregisteredPackages = await nativeUtils.getUnregisteredPackagesAsync();

                for (var i = 0, len = unregisteredPackages.length; i < len; ++i) {
                    if (unregisteredPackages[i].applications.length > 0) { // Don't ever full refresh for an unregistered package that won't show in the UI anyways.
                        var fixedDeployPath = this._fixUnregisteredDeployPath(unregisteredPackages[i].deployPath);
                        var foundPackage = false;
                        for (var j = 0, len2 = this._apps.length; j < len2; ++j) {
                            if (this._apps[j].isUnregistered && this._apps[j].deployPath === fixedDeployPath && this._apps[j].packageInfo.applications.length === unregisteredPackages[i].applications.length) {
                                foundPackage = true;
                                break;
                            }
                        }
                        if (!foundPackage) {
                            needsFullRefresh = true;
                            break;
                        }
                    }
                }

                if (!needsFullRefresh) {
                    // Count our unregistered packages to see if we have any extras.
                    var unregPackageCount = 0;
                    for (i = 0, len = this._apps.length; i < len; ++i) {
                        if (this._apps[i].isUnregistered) {
                            ++unregPackageCount;
                        }
                    }

                    if (unregPackageCount > unregisteredPackages.length) {
                        needsFullRefresh = true;
                    }
                }

                // We are either missing one or more unregistered packages or we have ones
                // that no longer exist.
                if (needsFullRefresh) {
                    this._refreshAppListAsync();
                }
                
            } catch (ex) {
                // Do nothing
            }
        };

        Launcher.prototype._refreshAppListAsync = async function (e) {
            var packageFullName;
            
            if (e) {
                packageFullName = e.packageFullName;
            }

            // See if the previous focus was in the launcher
            var activeElement = document.activeElement;
            var previousFocusIsUnregistered = false;
            var previousFocusUniqueId;
            var previousFocusId = "";
            if (activeElement) {
                var app = this._getAppByElement(activeElement);
                if (app) {
                    previousFocusUniqueId = app.uniqueId;
                    previousFocusIsUnregistered = app.isUnregistered;
                    previousFocusId = previousFocusIsUnregistered ? app.deployPath : app.packageFullName;
                }
            }

            if (!packageFullName || e.isInstalled) {

                // Remove old DOM
                var childElements = this._listElement.childNodes;
                while (childElements[0]) {
                    childElements[0].parentNode.removeChild(childElements[0]);
                }

                // Refresh the DOM
                await this._createDomAsync();

                // Set focus back to the previous focus element if focus was previous in the launcher, on an 
                // item that still exists.
                setImmediate(function () {
                    if (previousFocusId && this._apps) {

                        // Check if the previously focused app still exists (matching deploy path for unregistered
                        // and pfn for registered) and find its new ID if so. Then set focus to it.
                        for (i = 0, len = this._apps.length; i < len; ++i) {
                            if (previousFocusIsUnregistered) {
                                if (this._apps[i].deployPath === previousFocusId) {
                                    previousFocusUniqueId = this._apps[i].uniqueId;
                                }
                            } else if (this._apps[i].packageFullName === previousFocusId) {
                                previousFocusUniqueId = this._apps[i].uniqueId;
                            }
                        }

                        if (previousFocusUniqueId) {
                            var previousFocus = this._listElement.querySelector("[data-xbdh-uniqueid='" + previousFocusUniqueId + "']");
                            if (previousFocus) {
                                previousFocus.focus();
                            }
                        }
                    }
                }.bind(this));
            } else {

                if (this._apps) {
                    var removedAppUniqueId;
                    // Remove the app from our in-memory array of apps
                    for (var i = 0, len = this._apps.length; i < len; i++) {
                        if (!this._apps[i].isUnregistered && this._apps[i].packageFullName === packageFullName) {
                            removedAppUniqueId = this._apps[i].uniqueId;
                            this._apps.splice(i, 1);
                            break;
                        }
                    }

                    // Find this apps index before removing the DOM
                    var focusIndex = -1;
                    if (previousFocusUniqueId === removedAppUniqueId) {
                        var appElements = this._listElement.querySelectorAll(".xbdh-launcher-app");
                        for (i = 0, len = appElements.length; i < len; i++) {
                            if (appElements[i].getAttribute("data-xbdh-uniqueid") === removedAppUniqueId) {
                                focusIndex = i;
                                break;
                            }
                        }
                    }

                    // Remove the old DOM
                    var domForUninstalledPackage = this._listElement.querySelector("[data-xbdh-uniqueid='" + removedAppUniqueId + "']");
                    if (domForUninstalledPackage) {
                        domForUninstalledPackage.parentNode.removeChild(domForUninstalledPackage);
                    }

                    // Set focus to the app that is now occupying this app's space, or the prior app if the end of the list.
                    // If the list is empty, we'll set focus to the title.
                    if (focusIndex >= 0) {
                        var newFocus;
                        appElements = this._listElement.querySelectorAll(".xbdh-launcher-app");

                        if (appElements.length > focusIndex) {
                            newFocus = appElements[focusIndex];
                        } else if (appElements.length > 0) {
                            newFocus = appElements[appElements.length - 1];
                        } else {
                            newFocus = this._listElement.parentNode.querySelector(".xbdh-window-title");
                        }

                        if (newFocus) {
                            newFocus.focus();
                        }
                    }

                    // Trigger an unregistered refresh as that may have changed if we just unregistered this and
                    // didn't do a full uninstall.
                    this._refreshUnregisteredAppsList();
                }

                // If there are no apps, add the placeholder text
                if (!this._apps ||
                    !this._apps.length) {
                    var placeholderTextDom = document.createElement("form");
                    placeholderTextDom.classList.add("xbdh-launcher-noappsmessage");
                    this._listElement.appendChild(placeholderTextDom);
                }
            }
        };
        Launcher.prototype._isUnregisteredAppRunning = async function (app) {
            var runningTitleName = await nativeUtils.getRunningTitleName();
            var runningTitleDeployPath = await nativeUtils.getRunningTitleDeployPath();
            runningTitleDeployPath = this._fixUnregisteredDeployPath(runningTitleDeployPath);

            if (runningTitleName === this._stubAppPfn &&
                runningTitleDeployPath === app.deployPath) {
                return true;
            }
            return false;
        };
        Launcher.prototype._getUnregisteredAppExecutionStateAsync = async function (app) {
            if (await this._isUnregisteredAppRunning(app)) {
                return await nativeUtils.queryPackageExecutionStateAsync(this._stubAppPfn);
            }
            return plmState.unknown;
        };
        Launcher.prototype._refreshPlmStateAsync = async function () {
            if (!this._apps) {
                return;
            }

            // Go through the app list & get PLM state
            var apps = this._apps;
            for (var i = 0, len = apps.length; i < len; i++) {
                try {
                    var app = apps[i];
                    var oldPlmState = app.plmState;
                    var oldOverlayFolder = app.overlayFolder || "";
                    var retrievedExecutionState = false;

                    var executionState = false;

                    if (app.isUnregistered) {
                        try {
                            // Get PLM state
                            executionState = await this._getUnregisteredAppExecutionStateAsync(app);
                            retrievedExecutionState = true;
                        } catch (e) {
                            // Do nothing. Stub app must have terminated.
                        }
                    } else {
                        try {
                            executionState = await nativeUtils.queryPackageExecutionStateAsync(app.packageFullName);
                            retrievedExecutionState = true;
                        } catch (e) {
                            // App must have been uninstalled.
                        }
                    }

                    if (!retrievedExecutionState) {
                        continue;
                    }

                    var newPlmState = this._friendlyPlmStateFromEnum(executionState);

                    var newOverlayFolder = "";
                    if (!app.isUnregistered) {
                        newOverlayFolder = await nativeUtils.getOverlayFolderAsync(app.packageFullName);
                    }

                    if (oldPlmState !== newPlmState ||
                        oldOverlayFolder !== newOverlayFolder) {
                        // Find the package
                        var appElement = this._listElement.querySelector('.xbdh-launcher-app[data-xbdh-uniqueid=\'' + app.uniqueId + '\']');

                        if (appElement) {
                            var appPlmStateElement = appElement.querySelector('.xbdh-launcher-app-plmstate');

                            var plmString = newPlmState;
                            if (newOverlayFolder) {
                                plmString += DevHome.Utilities.Resources.getString("launcherPlmStateOverlayActive").value;
                            }
                            appPlmStateElement.textContent = plmString;
                            app.plmState = newPlmState;
                            app.plmStateEnum = executionState;
                            app.overlayFolder = newOverlayFolder;
                        }
                    }
                } catch (e) {
                    // Do nothing. Likely this app was uninstalled while we were refreshing PLM state or this app is not visible.
                }
            }

            // If the active element is an app that was updated, this will
            // ensure the available PLM commands are correct.
            this._updateAvailablePlm(document.activeElement);
        };
        Launcher.prototype._handleRemotePackageBeforeHide = function (e) {
            var credentialsPage = document.body.querySelector("#xbdh-launcher-registerremotepackage-credentials");
            if (!credentialsPage.classList.contains("xbdh-hidden")) {
                e.preventDefault();
                this._showFilePathPage();
            }
        };
        Launcher.prototype._launchWithParametersAsync = async function (uri) {
            xbdhUtils._Events.logUIAction("Launcher:LaunchWithParameters");
            var errorNumber = await nativeUtils.launchAsync(uri);
            if (errorNumber === -2144927148) {
                var errorTitle = DevHome.Utilities.Resources.getString("errorAppDoesNotSupportProtocolTitle").value;
                var errorMessage = DevHome.Utilities.Resources.getString("errorAppDoesNotSupportProtocolDescription").value;
                utils.showError(null, errorTitle, errorMessage);
            }
        };
        Launcher.prototype._launchWithParametersInvoked = function () {
            var overlay = document.querySelector(".xbdh-launcher-launchwithparameters").winControl;
            var uri = "";
            
            var protocolArgumentsInputElement = overlay.element.querySelector("#xbdh-launcher-launchwithparameters-parameters-value");
            var app = this._getAppByElement(protocolArgumentsInputElement);

            var launchParameters = protocolArgumentsInputElement.value;
            var useCustomProtocolCheckbox = overlay.element.querySelector("#xbdh-launcher-launchwithparameters-usecustomprotocol-value");
            if (useCustomProtocolCheckbox.checked) {
                uri = launchParameters;
            } else {
                if (app && app.titleId) {
                    uri = DevHome.Utilities.Resources._formatString("ms-xbl-{0}://", app.titleId) + launchParameters;
                }
            }

            // Remember last launch parameters
            if (this._appLaunchParameters.get(app.aumid) != launchParameters) {
                this._appLaunchParameters.set(app.aumid, launchParameters);
                utils._settings._appLaunchParameters = this._appLaunchParameters;
            }

            if (!this._isLaunching) {
                this._isLaunching = true;
                this._launchWithParametersAsync(uri)
                    .finally(() => {
                        this._isLaunching = false;
                    });
            }
            overlay.hide();
        };
        Launcher.prototype._launchWithParametersCommandInvoked = function (e) {
            xbdhUtils._Events.logUIAction("Launcher:LaunchWithParameters");
            this._showLaunchWithParametersOverlay();
        };
        Launcher.prototype._resumeInvoked = function (e) {
            // Call launch or resume so this will work for constrained or terminated apps.
            var contextElement = e.srcElement.parentNode.winControl.context;
            var app = this._getAppByElement(contextElement);
            if (app) {
                if (this._contextMenuElement && this._contextMenuElement.winControl) {
                    this._launchOrResumeAsync(app, this._contextMenuElement.winControl.context);
                }
            }
        };
        Launcher.prototype._resumeByPackageNameAsync = async function (packageFullName) {
            xbdhUtils._Events.logUIAction("Launcher:ResumeApp");
            return this._applicationManager.resumeAsync(packageFullName);
        };
        Launcher.prototype._saveCredentials = function () {
            var credentialsPage = document.getElementById("xbdh-launcher-registerremotepackage-credentials");
            var filePath = document.getElementById("xbdh-launcher-registerremotepackage-filepath-value").value;
            var userName = credentialsPage.querySelector("#xbdh-launcher-registerremotepackage-username-value").value;
            var password = credentialsPage.querySelector("#xbdh-launcher-registerremotepackage-password-value").value;

            xbdhUtils.showProgress(credentialsPage);
            // Remove any whitespace
            filePath = filePath.trim();
            var nativeUtils = new Microsoft.Xbox.Tools.DevHome.NativeUtilities();
            nativeUtils.registerNetworkSharePackageAsync(filePath, userName, password).then(function () {
                // If the overlay exists, hide it
                var credentialsOverlay = document.body.querySelector(".xbdh-launcher-registerremotepackage");
                if (credentialsOverlay &&
                    credentialsOverlay.winControl) {
                    var overlayControl = credentialsOverlay.winControl;
                    overlayControl.removeEventListener("beforehide", this._handleRemotePackageBeforeHideBound);
                    overlayControl.hide();
                }
                xbdhUtils.hideProgress(credentialsPage);                                        
            }.bind(this),
            function (ex) {
                xbdhUtils.hideProgress(credentialsPage);

                var errorString = DevHome.Utilities.getErrorStringForNetworkShareRelatedError(ex.number, filePath);

                var errorMessageElement = credentialsPage.querySelector(".xbdh-form-errormessage");
                errorMessageElement.textContent = errorString;
                errorMessageElement.classList.remove("xbdh-hidden");

                // Remove the bad credentials so they don't show up in the list of stored credentials
                try {
                    Microsoft.Xbox.Development.NetworkCredentialUtilities.removeCredential(filePath);
                } catch (ex2) {
                    // No-op: We already showed the user an error message at this point. No need to show them a 2nd and unrelated one due to trying to remove a user that was
                    // probably invalid to begin with.
                }
            }.bind(this));
        };
        Launcher.prototype._setDefaultApp = function (titleId, aumid) {
            xbdhUtils._Events.logUIAction("Launcher:SetDefaultApp");
            try {
                this._applicationManager.setDefaultApp(titleId, aumid);
            } catch (ex) { /* Swallow exception */ }
        };
        Launcher.prototype._setDefaultAppInvoked = function (e) {
            var contextElement = e.srcElement.parentNode.winControl.context;
            var app = this._getAppByElement(contextElement);

            if (!app || app.isUnregistered) {
                return; // Should be unreachable. We hide this option for unregistered. No-op to be defensive.
            }
            var targetAumid = contextElement.getAttribute("data-xbdh-aumid") || app.aumid;

            this._setDefaultApp(app.titleId, targetAumid);

            // Update the visuals
            var packageRootElement = contextElement.parentNode;
            var subpackageElements = packageRootElement.querySelectorAll(".xbdh-launcher-app-subpackage");
            for (var i = 0, len = subpackageElements.length; i < len; i++) {
                subpackageElements[i].querySelector(".xbdh-launcher-app-defaultappvisual").textContent = "";
            }
            contextElement.querySelector(".xbdh-launcher-app-defaultappvisual").textContent = DevHome.Utilities.Resources.getString("launcherDefaultAppSymbol").value;
        };
        Launcher.prototype._setUpContextMenu = function (e) {
            var contextMenuElement = this._contextMenuElement;
            var suspendCommand = contextMenuElement.querySelector("#xbdh-launcher-contextmenu-suspend");
            var resumeCommand = contextMenuElement.querySelector("#xbdh-launcher-contextmenu-resume");
            var launchCommand = contextMenuElement.querySelector("#xbdh-launcher-contextmenu-launch");
            var terminateCommand = contextMenuElement.querySelector("#xbdh-launcher-contextmenu-terminate");
            var uninstallCommand = contextMenuElement.querySelector("#xbdh-launcher-contextmenu-uninstall");
            var removeCommand = contextMenuElement.querySelector("#xbdh-launcher-contextmenu-remove");
            var appDetailsCommand = contextMenuElement.querySelector("#xbdh-launcher-contextmenu-appdetails");
            var launchWithParametersCommand = contextMenuElement.querySelector("#xbdh-launcher-contextmenu-launchwithparameters");

            suspendCommand.addEventListener("click", this._suspendInvoked.bind(this), false);
            resumeCommand.addEventListener("click", this._resumeInvoked.bind(this), false);
            launchCommand.addEventListener("click", this._resumeInvoked.bind(this), false);
            terminateCommand.addEventListener("click", this._terminateInvoked.bind(this), false);
            uninstallCommand.addEventListener("click", this._uninstallInvoked.bind(this), false);
            removeCommand.addEventListener("click", this._uninstallInvoked.bind(this), false);
            appDetailsCommand.addEventListener("click", this._showAppDetailsAsync.bind(this), false);
            launchWithParametersCommand.addEventListener("click", this._launchWithParametersCommandInvoked.bind(this), false);

            var subpackageContextMenu = this._contextSubMenuElement;
            var resumeSubCommand = subpackageContextMenu.querySelector("#xbdh-launcher-contextmenu-subpackage-resume");
            var launchSubCommand = subpackageContextMenu.querySelector("#xbdh-launcher-contextmenu-subpackage-launch");
            var setDefaultAppCommand = subpackageContextMenu.querySelector("#xbdh-launcher-contextmenu-subpackage-setdefaultapp");
            setDefaultAppCommand.addEventListener("click", this._setDefaultAppInvoked.bind(this), false);
            resumeSubCommand.addEventListener("click", this._resumeInvoked.bind(this), false);
            launchSubCommand.addEventListener("click", this._resumeInvoked.bind(this), false);
        };
        Launcher.prototype._handleUpdateIsGameToggleChanged = function (ev) {
            var isGame = this._isGameToggle.value;

            var isGameToggleElement = document.querySelector("#xbdh-launcher-appdetails-apptype");

            if (isGameToggleElement) {
                try {
                    // Get the package full name
                    var app = this._getAppByElement(isGameToggleElement);
                    if (app) {
                        if (isGame) {
                            appUtils.setContentType(app.packageFullName, applicationContentType.game);
                        } else {
                            appUtils.setContentType(app.packageFullName, applicationContentType.app_Entertainment);
                        }
                    }
                } catch (e) {
                    // Failed to change app type. Likely the app is store installed so the content
                    // type cannot be overridden.
                    utils.showError(e);
                }
            }
        };
        Launcher.prototype._handleGameDeploymentDriveChanged = function (ev) {
            var newDeployDrive = this._deployDriveToggle.value;
            // Get the package full name and deploy drive
            var app = this._getAppByElement(ev.target._context);
            if (app) {
                var pfn = app.packageFullName;
                var deployDrive = app.deployDrive;
                if (newDeployDrive !== deployDrive) {

                    var overlayRootElement = document.querySelector(".xbdh-launcher-appdetails");
                    if (overlayRootElement) {
                        xbdhUtils.showProgress(overlayRootElement);
                        overlayRootElement.focus();
                    }

                    var xcrdid = storageUtils.xcrdIdFromFriendlyStorageDeviceName(newDeployDrive);

                    var nativeUtils = new Microsoft.Xbox.Tools.DevHome.NativeUtilities();
                    nativeUtils.moveApplicationAsync(pfn, xcrdid)
                        .then(function (errorNumber) {
                            if (errorNumber !== 0) {
                                var errorTitle = DevHome.Utilities.Resources.getString("errorAppMoveFailed").value;
                                var errorMessage = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("errorAppMoveFailedDescription").value, DevHome.Utilities.signedIntegerToHexString(errorNumber));

                                utils.showError(null, errorTitle, errorMessage);
                            } else {
                                var deployDriveSelectElement = document.querySelector("#xbdh-launcher-appdetails-deploydriveselect");
                                if (deployDriveSelectElement) {
                                    deployDriveSelectElement.focus();
                                }
                            }

                            if (overlayRootElement) {
                                xbdhUtils.hideProgress(overlayRootElement);
                            }

                        }.bind(this));
                }
            }
        };
        Launcher.prototype._showAppDetailsAsync = async function () {
            xbdhUtils._Events.logUIAction("Launcher:ViewAppDtails");

            var appListElement = this._listElement;
            var activeAppElement = appListElement.querySelector(".xbdh-active");

            if (!activeAppElement) {
                return;
            }
            var app = this._getAppByElement(activeAppElement);

            if (!app) {
                return;
            }

            var appDeployInfo = appUtils.getPackageDeployInfoEx(app.packageFullName);

            if (!appDeployInfo) {
                return;
            }

            var deployTypeDisplay = appDeployInfo.deployType;

            // For some deploy types, we show friendlier user facing strings
            if (deployTypeDisplay === "Folder vnext") {
                deployTypeDisplay = "Folder";
            }

            var appDetailsRootDiv = document.createElement("div");
            appDetailsRootDiv.tabIndex = "0";
            appDetailsRootDiv.classList.add("xbdh-launcher-appdetails");
            appDetailsRootDiv.classList.add("xbdh-overlay");
            var appDetailsHtml =
                '<div id="xbdh-wdp" class="xbdh-form">' +
                '  <h1 class="xbdh-launcher-appdetails-heading">' + DevHome.Utilities.Resources.getString("launcherAppetailsHeading").value + '</h1>' +
                '  <div class="xbdh-field">' +
                '      <div class="xbdh-label">' + DevHome.Utilities.Resources.getString("launcherPackageMetadataTitleId").value + '</div>' +
                '      <div id="xbdh-launcher-appdetails-titleid" class="xbdh-value">' + (app.titleId || DevHome.Utilities.Resources.getString("launcherNoTitleId").value) + '</div>' +
                '  </div>' +
                '  <div class="xbdh-field">' +
                '      <div class="xbdh-label">' + DevHome.Utilities.Resources.getString("launcherPackageMetadataPackageAumid").value + '</div>' +
                '      <div id="xbdh-launcher-appdetails-aumid" class="xbdh-value">' + app.aumid + '</div>' +
                '  </div>' +
                '  <div class="xbdh-field">' +
                '      <div class="xbdh-label">' + DevHome.Utilities.Resources.getString("launcherPackageMetadataPackageFullName").value + '</div>' +
                '      <div id="xbdh-launcher-appdetails-packagefullname" class="xbdh-value">' + app.packageFullName + '</div>' +
                '  </div>' +
                '  <div class="xbdh-field">' +
                '      <div class="xbdh-label">' + DevHome.Utilities.Resources.getString("launcherPackageMetadataDeployType").value + '</div>' +
                '      <div id="xbdh-launcher-appdetails-deploytype" class="xbdh-value">' + deployTypeDisplay + '</div>' +
                '  </div>';

            if (appDeployInfo.deployType === "Install") {
                appDetailsHtml +=
                    '  <div class="xbdh-field">' +
                    '      <div class="xbdh-label">' + DevHome.Utilities.Resources.getString("launcherPackageMetadataDeploySpecifiers").value + '</div>' +
                    '      <div id="xbdh-launcher-appdetails-deployspecifiers" class="xbdh-value">' + appDeployInfo.deployPathOrSpecifiers + '</div>' +
                    '  </div>';
            }

            if (appDeployInfo.packageSize) {
                var bytesPerKb = 1024;
                var bytesPerMb = bytesPerKb * 1024;
                var bytesPerGb = bytesPerMb * 1024;

                var sizeInGb = (appDeployInfo.packageSize / bytesPerGb).toFixed(3);
                appDetailsHtml +=
                    '  <div class="xbdh-field">' +
                    '      <div class="xbdh-label">' + DevHome.Utilities.Resources.getString("launcherPackageMetadataSize").value + '</div>' +
                    '      <div id="xbdh-launcher-appdetails-size" class="xbdh-value">' + sizeInGb + '</div>' +
                    '  </div>';
            }

            if (appDeployInfo.deployDrive) {

                var availableDevices = await nativeUtils.getStorageDevicesAsync();
                if (availableDevices && availableDevices.length > 1) {
                    appDetailsHtml +=
                        '  <div class="xbdh-field">' +
                        '      <div class="xbdh-label">' + DevHome.Utilities.Resources.getString("launcherPackageMetadataDeployDrive").value + '</div>' +
                        '      <div id="xbdh-launcher-appdetails-deploydriveselect" class="xbdh-value xbdh-combobox xbdh-combobox-singlerow xbdh-button win-focusable" tabindex="0" data-xbdh-uniqueid="' + app.uniqueId + '">' +
                        '          <div class="xbdh-combobox-label"></div>' +
                        '          <div class="xbdh-combobox-togglevisual"></div>' +
                        '      </div>' +
                        '  </div>';
                } else {
                    appDetailsHtml +=
                        '  <div class="xbdh-field">' +
                        '      <div class="xbdh-label">' + DevHome.Utilities.Resources.getString("launcherPackageMetadataDeployDrive").value + '</div>' +
                        '      <div id="xbdh-launcher-appdetails-deploydrive" class="xbdh-value" tabindex="0">' + appDeployInfo.deployDrive + '</div>' +
                        '  </div>';
                }
            }

            if (appDeployInfo.deployType === "UWP" ||
                appDeployInfo.deployType === "UWP Store") {
                appDetailsHtml +=
                    '  <div class="xbdh-field">' +
                    '      <div class="xbdh-label">' + DevHome.Utilities.Resources.getString("launcherPackageMetadataAppContentType").value + '</div>' +
                    '      <div id="xbdh-launcher-appdetails-apptype" class="xbdh-value xbdh-combobox xbdh-combobox-singlerow xbdh-button win-focusable" tabindex="1" data-xbdh-uniqueid="' + app.uniqueId + '">' +
                    '          <div class="xbdh-combobox-label"></div>' +
                    '          <div class="xbdh-combobox-togglevisual"></div>' +
                    '      </div>' +
                    '  </div>';
            }

            // Show this option for the supported deployment types.
            // If a different tool set an overlay for some other deployment
            // type, we should still allow users to clear that overlay.
            if (appDeployInfo.deployType === "Install" ||
                appDeployInfo.deployType === "Push" ||
                appDeployInfo.deployType === "Network" ||
                appDeployInfo.deployType === "Folder" ||
                appDeployInfo.deployType === "Folder vnext" ||
                await nativeUtils.getOverlayFolderAsync(app.packageFullName)) {

                appDetailsHtml +=
                    '  <div class="xbdh-field">' +
                    '      <div class="xbdh-label">' + DevHome.Utilities.Resources.getString("launcherPackageMetadataOverlayFolder").value + '</div>' +
                    '      <input type="text" id="xbdh-launcher-overlayfolder" class="xbdh-value" tabindex="2" placeholder="' + DevHome.Utilities.Resources.getString("launcherPackageMetadataOverlayFolderPlaceholder").value + '" />' +
                    '  </div>';
            }

            appDetailsHtml +=
                '</div>';

            // See if we are showing details on a sub package for an package with multiple applications
            if (activeAppElement.classList.contains("xbdh-launcher-app-subpackage")) {
                var defaultApp = this._applicationManager.getDefaultApp(app.titleId);
                if (defaultApp === app.aumid) {
                    appDetailsHtml += '  <input id="xbdh-launcher-defaultapp-value" type="checkbox" checked="checked" value="' + app.aumid + '"><label>' + DevHome.Utilities.Resources.getString("menuSetAsDefaultWorkspace").value + '</label>';
                } else {
                    appDetailsHtml += '  <input id="xbdh-launcher-defaultapp-value" type="checkbox" value="' + app.aumid + '"><label>' + DevHome.Utilities.Resources.getString("menuSetAsDefaultWorkspace").value + '</label>';
                }

                // Hook up click handlers
                appDetailsRootDiv.querySelector("#xbdh-launcher-defaultapp-value").addEventListener("click", this._setDefaultAppInvoked.bind(this), false);
            }

            var appDetailsOverlay = new DevHome.UI.Overlay(appDetailsRootDiv, { html: appDetailsHtml });

            // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
            // to get reset to the main workspace after this function executes, which we don't want. We want the show() method
            // call to set focus to the user details overlay instead.
            setImmediate(async function () {
                if (appDetailsOverlay) {
                    // We need to set the overlay to the active element, otherwise hitting B won't dismiss it because focus 
                    // won't be on the overlay.
                    appDetailsOverlay.show();
                    appDetailsRootDiv.focus();

                    // Setup the element for changing drives if available.
                    var deployDriveSelectElement = appDetailsRootDiv.querySelector("#xbdh-launcher-appdetails-deploydriveselect");
                    if (deployDriveSelectElement) {

                        var availableDevices = await nativeUtils.getStorageDevicesAsync();

                        var defaultDevice = "";
                        var deviceOptions = [];

                        for (var i = 0, len = availableDevices.length; i < len; ++i) {
                            if (availableDevices[i].deviceFriendlyName === appDeployInfo.deployDrive) {
                                defaultDevice = availableDevices[i].deviceFriendlyName;
                            }

                            deviceOptions.push({ label: availableDevices[i].deviceFriendlyName, value: availableDevices[i].deviceFriendlyName });
                        }

                        // Device didn't come back in storageDevices, it may be disconnected.
                        if (!defaultDevice) {
                            defaultDevice = appDeployInfo.deployDrive;

                            // Labels use localization values from DevStorage.js
                            deviceOptions = [{ label: defaultDevice, value: defaultDevice }];
                            deployDriveSelectElement.disabled = true;
                        }

                        var options = {
                            value: defaultDevice,
                            options: deviceOptions
                        };

                        this._deployDriveToggle = new DevHome.UI.ComboBox(deployDriveSelectElement, options, "launcherPackageMetadataDeployDrive");
                        this._deployDriveToggle.addEventListener("change", this._handleGameDeploymentDriveChanged.bind(this), false);
                        // Update the value of the toggle
                        this._deployDriveToggle.value = defaultDevice;

                        deployDriveSelectElement.focus();
                    }

                    // Set the isGame toggle
                    var isGameToggleElement = appDetailsRootDiv.querySelector("#xbdh-launcher-appdetails-apptype");

                    if (isGameToggleElement) {
                        let isGame = appUtils.getContentType(app.packageFullName) === applicationContentType.game ? true : false;

                        options = {
                            value: isGame,
                            options: [
                                { value: true, label: "launcherAppTypeGame" },
                                { value: false, label: "launcherAppTypeApp" }
                            ]
                        };

                        this._isGameToggle = new DevHome.UI.ComboBox(isGameToggleElement, options, "launcherPackageMetadataAppContentType");
                        this._isGameToggle.addEventListener("change", this._handleUpdateIsGameToggleChanged.bind(this), false);
                        isGameToggleElement.focus();
                    }

                    var overlayFolderInput = appDetailsRootDiv.querySelector("#xbdh-launcher-overlayfolder");

                    if (overlayFolderInput) {
                        overlayFolderInput.value = await nativeUtils.getOverlayFolderAsync(app.packageFullName) || "";

                        overlayFolderInput.addEventListener("change",
                            async function (e) {
                                var inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();
                                inputPane.tryHide();

                                await nativeUtils.setOverlayFolderAsync(app.packageFullName, overlayFolderInput.value);

                                this._refreshPlmStateAsync();
                            }.bind(this),
                            false);

                        overlayFolderInput.focus();
                    }
                }
            }.bind(this));
        };
        Launcher.prototype._showCredentialsPage = function () {
            var filePathPage = document.getElementById("xbdh-launcher-registerremotepackage-filepath");
            var credentialsPage = document.getElementById("xbdh-launcher-registerremotepackage-credentials");
            filePathPage.classList.add("xbdh-hidden");
            credentialsPage.classList.remove("xbdh-hidden");
            var usernameField = document.getElementById("xbdh-launcher-registerremotepackage-username-value");

            var filePath = document.getElementById("xbdh-launcher-registerremotepackage-filepath-value").value;

            var credentialsDescription = document.getElementById("xbdh-launcher-registerremotepackage-credentials-description");
            credentialsDescription.textContent = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("launcherRegisterRemotePackageCredentialsDescription").value, filePath);

            // Bring up the virtual keyboard
            var inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();
            inputPane.tryShow();

            // Set focus to the text input
            usernameField.focus();
        };
        Launcher.prototype._showFilePathPage = function () {
            var filePathPage = document.getElementById("xbdh-launcher-registerremotepackage-filepath");
            var credentialsPage = document.getElementById("xbdh-launcher-registerremotepackage-credentials");
            filePathPage.classList.remove("xbdh-hidden");
            credentialsPage.classList.add("xbdh-hidden");
            var filePathField = document.getElementById("xbdh-launcher-registerremotepackage-filepath-value");

            // Bring up the virtual keyboard
            var inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();
            inputPane.tryShow();

            // Set focus to the text input
            filePathField.focus();
        };
        Launcher.prototype._showLaunchWithParametersOverlay = function () {
            xbdhUtils._Events.logUIAction("Launcher:ShowLaunchWithParametersOverlay");

            var appListElement = this._listElement;
            var activeAppElement = appListElement.querySelector(".xbdh-active");

            if (!activeAppElement) {
                return;
            }
            var app = this._getAppByElement(activeAppElement);

            if (!app) {
                return;
            }

            var launchParameterHistory = this._appLaunchParameters.get(app.aumid);
            if (!launchParameterHistory) {
                launchParameterHistory = "";
            }
            var launchWithParametersRootDiv = document.createElement("div");
            launchWithParametersRootDiv.tabIndex = "0";
            launchWithParametersRootDiv.classList.add("xbdh-launcher-launchwithparameters");
            launchWithParametersRootDiv.classList.add("xbdh-overlay");
            var launchWithParametersHtml =
                '<div class="xbdh-form">' +
                '  <h1 class="xbdh-launcher-launchwithparameters-heading">' + DevHome.Utilities.Resources.getString("launcherLaunchWithParametersHeading").value + '</h1>' +
                '  <input id="xbdh-launcher-launchwithparameters-usecustomprotocol-value" type="checkbox" /><label>' + DevHome.Utilities.Resources.getString("launcherLaunchWithParametersUseCustomProtocol").value + '</label>' +
                '  <p>' + DevHome.Utilities.Resources.getString("launcherLaunchWithParametersDescription").value + '</p>' +
                '  <div id="xbdh-launcher-protocolstring" class="xbdh-field">' +
                '      <div id="xbdh-launcher-launchwithparameters-parameters-label" class="xbdh-label">' + DevHome.Utilities.Resources._formatString("ms-xbl-{0}://", app.titleId) + '</div>' +
                '      <input id="xbdh-launcher-launchwithparameters-parameters-value" class="xbdh-launcher-launchwithparameters-parameters-value xbdh-value" type="text" data-xbdh-uniqueid="' + app.uniqueId + '" value="' + launchParameterHistory + '" />' +
                '  </div>' +
                '  <div class="xbdh-form-buttons">' +
                '    <button id="xbdh-launcher-launchwithparameters-launchcommand" type="button">' + DevHome.Utilities.Resources.getString("commandLaunch").value + '</button>' +
                '  </div>' +
                '</div>';

            var launchWithParametersOverlay = new DevHome.UI.Overlay(launchWithParametersRootDiv, { html: launchWithParametersHtml });

            // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
            // to get reset to the main workspace after this function executes, which we don't want. We want the show() method
            // call to set focus to the user details overlay instead.
            setImmediate(function () {
                if (launchWithParametersOverlay) {
                    // We need to set the overlay to the active element, otherwise hitting B won't dismiss it because focus 
                    // won't be on the overlay.
                    launchWithParametersOverlay.show();

                    utils.addTextboxBehaviors(launchWithParametersRootDiv);

                    // Hook up click handlers
                    launchWithParametersRootDiv.querySelector("#xbdh-launcher-launchwithparameters-usecustomprotocol-value").addEventListener("change", this._toggleUseCustomProtocol.bind(this), false);
                    launchWithParametersRootDiv.querySelector("#xbdh-launcher-launchwithparameters-launchcommand").addEventListener("click", this._launchWithParametersInvoked.bind(this), false);

                    var protocolArgumentsInput = launchWithParametersRootDiv.querySelector("#xbdh-launcher-launchwithparameters-parameters-value");
                    protocolArgumentsInput.focus();
                    var inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();
                    inputPane.tryShow();
                }
            }.bind(this));
        };
        Launcher.prototype._showRegisterRemotePackageDialog = function () {
            xbdhUtils._Events.logUIAction("Launcher:ShowRegisterRemotePackageDialog");

            var registerRemotePackageRootDiv = document.createElement("div");
            registerRemotePackageRootDiv.classList.add("xbdh-launcher-registerremotepackage");
            registerRemotePackageRootDiv.classList.add("xbdh-overlay");
            registerRemotePackageRootDiv.classList.add("xbdh-overlay-tall");
            var registerRemotePackageHtml =
                // File path page
                '<div id="xbdh-launcher-registerremotepackage-filepath" class="xbdh-form">' +
                '  <h1 class="xbdh-launcher-registerremotepackage-filepath-heading">' + DevHome.Utilities.Resources.getString("launcherRegisterRemotePackageFilePathHeading").value + '</h1>' +
                '  <p>' + DevHome.Utilities.Resources.getString("launcherRegisterRemotePackageFilePathDescription").value + '</p>' +
                '  <input id="xbdh-launcher-registerremotepackage-filepath-value" class="xbdh-value" type="text" tabindex="0" />' +
                '  <div class="xbdh-form-errormessage xbdh-hidden"></div>' +
                '  <button id="xbdh-launcher-registerremotepackage-filepath-save" type="button" tabindex="1">' + DevHome.Utilities.Resources.getString("commandSave").value + '</button>' +
                '</div>' +
                // Credentials page
                '<div id="xbdh-launcher-registerremotepackage-credentials" class="xbdh-hidden xbdh-form">' +
                '  <h1 class="xbdh-launcher-registerremotepackage-credentials-heading">' + DevHome.Utilities.Resources.getString("launcherRegisterRemotePackageCredentialsHeading").value + '</h1>' +
                '  <p id="xbdh-launcher-registerremotepackage-credentials-description"></p>' +
                '  <label class="xbdh-label">' + DevHome.Utilities.Resources.getString("labelUserName").value + '</label>' +
                '  <input id="xbdh-launcher-registerremotepackage-username-value" class="xbdh-value" type="text" tabindex="0" />' +
                '  <label class="xbdh-label">' + DevHome.Utilities.Resources.getString("labelPassword").value + '</label>' +
                '  <input id="xbdh-launcher-registerremotepackage-password-value" class="xbdh-value" type="password" tabindex="1" />' +
                '  <div class="xbdh-form-errormessage xbdh-hidden"></div>' +
                '  <button id="xbdh-launcher-registerremotepackage-credentials-save" type="button" tabindex="2">' + DevHome.Utilities.Resources.getString("commandOk").value + '</button>' +
                '</div>';

            var registerRemotePackageOverlay = new DevHome.UI.Overlay(registerRemotePackageRootDiv, { html: registerRemotePackageHtml });

            // The following function calls are behind a setImmediate because the context menu closing will cause the focusRoot
            // to get reset to the main workspace after this function executes, which we don't want. We want the show() method
            // call to set focus to the user details overlay instead.
            setImmediate(function () {
                if (registerRemotePackageOverlay) {
                    registerRemotePackageOverlay.show();

                    var filePathPage = registerRemotePackageRootDiv.querySelector("#xbdh-launcher-registerremotepackage-filepath");
                    var credentialsPage = registerRemotePackageRootDiv.querySelector("#xbdh-launcher-registerremotepackage-credentials");

                    // Add behavior to textboxes
                    xbdhUtils.addFormBehaviors(filePathPage);
                    xbdhUtils.addFormBehaviors(credentialsPage);

                    this._showFilePathPage();

                    // Hook up buttons
                    var saveFilePathButton = registerRemotePackageRootDiv.querySelector("#xbdh-launcher-registerremotepackage-filepath-save");
                    saveFilePathButton.addEventListener("click", this._trySaveFilePath.bind(this), false);

                    var saveCredentialsButton = registerRemotePackageRootDiv.querySelector("#xbdh-launcher-registerremotepackage-credentials-save");
                    saveCredentialsButton.addEventListener("click", this._saveCredentials.bind(this), false);

                    registerRemotePackageOverlay.addEventListener("beforehide", this._handleRemotePackageBeforeHideBound, false);
                }
            }.bind(this));
        };
        Launcher.prototype._suspendAsync = async function (packageFullName) {
            var errorNumber = await nativeUtils.suspendAsync(packageFullName, false);
            if (errorNumber !== 0) {
                xbdhUtils._Events.logUIAction("Launcher:SuspendAppFailure", errorNumber);
                return;
            } else {
                xbdhUtils._Events.logUIAction("Launcher:SuspendApp");
            }

            this._refreshPlmStateBound();
        };
        Launcher.prototype._suspendInvoked = function (e) {
            var contextElement = e.srcElement.parentNode.winControl.context;
            var app = this._getAppByElement(contextElement);
            if (app) {
                if (app.isUnregistered) {
                    if (this._isUnregisteredAppRunning(app)) {
                        this._suspendAsync(this._stubAppPfn);
                    }
                } else {
                    this._suspendAsync(app.packageFullName);
                }
            }
        };
        Launcher.prototype._terminateAsync = async function (packageFullName) {
            var errorNumber = await nativeUtils.terminateAsync(packageFullName);
            if (errorNumber !== 0) {
                xbdhUtils._Events.logUIAction("Launcher:TerminateAppFailure", errorNumber);
                return;
            }

            xbdhUtils._Events.logUIAction("Launcher:TerminateApp");
            this._refreshPlmStateBound();
        };
        Launcher.prototype._terminateInvoked = function (e) {
            var contextElement = e.srcElement.parentNode.winControl.context;
            var app = this._getAppByElement(contextElement);
            if (app) {
                if (app.isUnregistered) {
                    if (this._isUnregisteredAppRunning(app)) {
                        this._terminateAsync(this._stubAppPfn);
                    }
                } else {
                    this._terminateAsync(app.packageFullName);
                }
            }
        };
        Launcher.prototype._toggleUseCustomProtocol = function (e) {
            var useCustomProtocolCheckBox = e.srcElement;
            var overlayElement = document.querySelector(".xbdh-launcher-launchwithparameters");
            var useCustomProtocolLabel = overlayElement.querySelector("#xbdh-launcher-launchwithparameters-parameters-label");
            if (useCustomProtocolCheckBox.checked) {
                useCustomProtocolLabel.classList.add("xbdh-hidden");
            } else {
                useCustomProtocolLabel.classList.remove("xbdh-hidden");
            }
        };
        Launcher.prototype._trySaveFilePath = function () {
            // TODO - Handle error case of an empty file path
            var filePathPage = document.getElementById("xbdh-launcher-registerremotepackage-filepath");
            var filePath = document.getElementById("xbdh-launcher-registerremotepackage-filepath-value").value;

            // Passing an empty username and password tells the credential manager to find the best credentials to use
            xbdhUtils.showProgress(filePathPage);
            // Remove any whitespace
            filePath = filePath.trim();
            var nativeUtils = new Microsoft.Xbox.Tools.DevHome.NativeUtilities();
            nativeUtils.registerNetworkSharePackageAsync(filePath, "", "").then(function (packageInfo) {
                xbdhUtils.hideProgress(filePathPage);
                // If we were successful, then hide the overlay
                var credentialsOverlay = document.body.querySelector(".xbdh-launcher-registerremotepackage");
                if (credentialsOverlay &&
                    credentialsOverlay.winControl) {
                    credentialsOverlay.winControl.hide();

                    // Get the new package & set focus to it
                    var newPackageElement = this._element.querySelector('[data-xbdh-uniqueid="' + packageInfo.uniqueId + '"]');
                    if (newPackageElement) {
                        newPackageElement.focus();
                    }
                }
            }.bind(this), function registerNetworkShareErrorCallback(ex) {
                xbdhUtils.hideProgress(filePathPage);
                var errorMessageElement = filePathPage.querySelector(".xbdh-form-errormessage");
                if (ex.number === -2147024894 ||
                        ex.number === -2147024735 ||
                        ex.number === -2147024843 ||
                        ex.number === -2147024829 ||
                        ex.number === -2147024893) { // Could not find network location or bad path name
                    errorMessageElement.textContent = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("launcherErrorRegisterRemotePackageBadLocation").value, filePath);
                } else if (ex.number === -2147023570 ||
                               ex.number === -2147023565 || // Login failure or Error_account_disabled
                               ex.number === -2147024891 || // Access denied
                               ex.number === -2147022989) { // User's password must be changed
                    this._showCredentialsPage();
                } else if (ex.number === -2147024809) { // Invalid parameters
                    errorMessageElement.textContent = DevHome.Utilities.Resources.getString("errorInvalidParameterDescription").value;
                } else {
                    errorMessageElement.textContent = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("errorUnknownDescription").value, xbdhUtils.signedIntegerToHexString(ex.number));
                }
                errorMessageElement.classList.remove("xbdh-hidden");
            }.bind(this));
        };
        Launcher.prototype._unconstrainAsync = async function (packageFullName) {
            xbdhUtils._Events.logUIAction("Launcher:Unconstrain");
            return this._applicationManager.unconstrainAsync(packageFullName);
        };
        Launcher.prototype._uninstall = function (packageFullName) {
            xbdhUtils._Events.logUIAction("Launcher:Uninstall");

            xbdhUtils.showProgress(this._element);

            var nativeUtils = new Microsoft.Xbox.Tools.DevHome.NativeUtilities();
            nativeUtils.uninstallAsync(packageFullName)
                .then(function (errorNumber) {
                    if (errorNumber !== 0) {
                        var errorTitle = DevHome.Utilities.Resources.getString("errorAppUninstallFailed").value;
                        var errorMessage = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("errorAppUninstallFailedDescription").value, DevHome.Utilities.signedIntegerToHexString(errorNumber));

                        utils.showError(null, errorTitle, errorMessage);
                    }

                    xbdhUtils.hideProgress(this._element);

                }.bind(this));
        };
        Launcher.prototype._removeUnregistered = async function (app) {
            xbdhUtils._Events.logUIAction("Launcher:RemoveUnregistered");

            xbdhUtils.showProgress(this._element);

            var nativeUtils = new Microsoft.Xbox.Tools.DevHome.NativeUtilities();

            try {
                if (app.isLooseGameCore) {
                    if (app.deployPath.startsWith("d:\\")) {
                        await nativeUtils.recursiveDeleteFolderAsync(app.deployPath);
                    } else {
                        await nativeUtils.removePathFromUnregisteredNetworkFolders(app.deployPath);
                    }
                } else {
                    await nativeUtils.removePackageByInstanceId(app.packageInfo.instanceId, app.packageInfo.packageAlias);
                }
            } catch (error) {
                var errorTitle = DevHome.Utilities.Resources.getString("errorAppUninstallFailed").value;
                var errorMessage = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("errorAppUninstallFailedDescription").value, DevHome.Utilities.signedIntegerToHexString(error.number));

                utils.showError(null, errorTitle, errorMessage);
            }
            xbdhUtils.hideProgress(this._element);
        };
        Launcher.prototype._uninstallInvoked = function (e) {
            var contextElement = e.srcElement.parentNode.winControl.context;
            this._uninstalling_app = this._getAppByElement(contextElement);

            if (this._uninstalling_app) {
                this._promptUninstallConfirmation();
            }
        };
        Launcher.prototype._uninstallApplication = function() {
            var app = this._uninstalling_app;

            var dialog = document.getElementById("xbdh-dialog").winControl;
            dialog.hide();

            if (app) {
                if (app.isUnregistered) {
                    if (app.plmStateEnum !== plmState.terminated && app.plmStateEnum !== plmState.unknown) {
                        this._terminateAsync(this._stubAppPfn);
                    }
                    this._removeUnregistered(app);
                } else {
                    this._uninstall(app.packageFullName);
                }
                delete this._uninstalling_app;
            }
        };
        Launcher.prototype._cancelUninstall = function(e) {
            var dialog = document.getElementById("xbdh-dialog").winControl;
            dialog.hide();

            // Remove uninstalling app variable
            delete this._uninstalling_app
        }
        // Some event listeners can cause other clients to never receive the event if DevHome is registered but suspended.
        // For those events, we need to remove the event listener when we suspend and restore it when we resume. For now
        // this is just the scratchdrivemodified event but there may be others similarly affected.
        Launcher.prototype._addActiveOnlyEventListeners = function (e) {
            storageUtils.addEventListener("scratchdrivemodified", this._refreshUnregisteredAppsListBound, false);
        };
        Launcher.prototype._removeActiveOnlyEventListeners = function (e) {
            storageUtils.removeEventListener("scratchdrivemodified", this._refreshUnregisteredAppsListBound);
        };
        // Public methods
        Launcher.prototype.dispose = function () {
            this._applicationManager.removeEventListener("installedpackageschanged", this._refreshAppListBound);
            this._applicationManager.removeEventListener("packageexecutionstatechanged", this._refreshPlmStateBound);
            this._applicationManager = null;

            TVJS.DirectionalNavigation.removeEventListener("focuschanged", this._handleFocusChangedBound);

            Windows.UI.WebUI.WebUIApplication.removeEventListener("activated", this._refreshAppListBound);
            Windows.UI.WebUI.WebUIApplication.removeEventListener("resuming", this._refreshPlmStateBound);
            Windows.UI.WebUI.WebUIApplication.removeEventListener("resuming", this._refreshUnregisteredAppsListBound);

            Windows.UI.WebUI.WebUIApplication.removeEventListener("resuming", this._addActiveOnlyEventListenersBound);
            Windows.UI.WebUI.WebUIApplication.removeEventListener("suspending", this._removeActiveOnlyEventListenersBound);
        };
        return Launcher;
    })();
    DevHome._ViewModels = DevHome._ViewModels || {};
    DevHome._ViewModels.Launcher = Launcher;
})();