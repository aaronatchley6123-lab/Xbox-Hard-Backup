// Copyright (c) Microsoft Corporation. All rights reserved.
// There is a fork of this logic under reportAProblemUWP folder. When doing changes to this folder, consider if the changes need to be synced in there as well.

(function () {
    "use strict";

    var xbdhUtils = DevHome.Utilities;
    var nativeUtils = xbdhUtils.getDevHomeNativeUtilities();
    var networkUtils = Microsoft.Xbox.Development.NetworkUtilities;
    var crashDumpUtils = Microsoft.Xbox.Development.DiagnosticCaptureUtilities;
    var systemProperties = Microsoft.Xbox.Tools.ConsoleExtensions.SystemConfigurationProperties;
    var utils = DevHome.Utilities;

    var ReportAProblemModes = {
        NONE: 0,
        INSTANT: 1,
        TRACE: 2,
    };

    var ReportAProblemStates = {
        COLLECT: 0,
        DESCRIBE: 1,
        REVIEW: 2,
        SEND: 3,
        SENT: 4,
        MAX: 5
    };

    // Keep aligned with ReportAProblemStates
    var ReportAProblemStateNames = ['collect', 'describe', 'review', 'send', 'sent'];
    var ReportAProblemTelemetryStateNames = ['selection', 'describe', 'reviewlogs', 'finalize', 'complete'];

    // Matches one or more non-white space characters followed by a '@' followed by one or more non-whitespace 
    // characters followed by a '.' followed by one or more whitespace characters. This ensures
    // that there is only 1 '@'.
    var matchEmailPattern = '^[^\\s@]+@[^\\s@]+\.[^\\s@]+$';

    var RAPDirectoryName = 'rap';
    var PendingLogsDirectory = '\\' + RAPDirectoryName + '\\pendingLogs';
    var PendingLogsDirectoryLocalPath = 'D:' + PendingLogsDirectory;
    var PendingLogsDirectoryNetworkPath = '\\SystemScratch' + PendingLogsDirectory;

    var SizeUnits = ['B', 'KB', 'MB', 'GB', 'TB'];

    function getReadableSize(sizeBytes) {
        var order = 0;
        var size = sizeBytes;
        while (size >= 1024 && order + 1 < SizeUnits.length) {
            order++;
            size /= 1024;
        }

        return +size.toFixed(2) + ' ' + SizeUnits[order];
    }

    function getPackageVersion() {
        var packageVersion = Windows.ApplicationModel.Package.current.id.version;
        return packageVersion.major + '.' + packageVersion.minor + '.' + packageVersion.build + '.' + packageVersion.revision;

    }

    function getFormattedTime() {
        var today = new Date();
        var y = today.getFullYear();
        // JavaScript months are 0-based.
        var m = today.getMonth() + 1;
        var d = today.getDate();
        var h = today.getHours();
        var mi = today.getMinutes();
        var s = today.getSeconds();
        return y + "-" + m + "-" + d + "-" + h + "-" + mi + "-" + s;
    }

    // Shared state
    DevHome.UI = DevHome.UI || {};
    if (typeof DevHome.UI.RAP === 'undefined') {
        DevHome.UI.RAP =
            {
                currentMode: ReportAProblemModes.NONE,
                currentState: ReportAProblemStates.COLLECT,
                isTracing: false,
                hasLogs: false,
                hasBundledPackage: false,
                sourceLogDirectory: '',
                packagedLogsTempFolder: '',
                bundledPackageFile: '',
                email: '',
                title: '',
                description: '',
            };

        Windows.UI.WebUI.WebUIApplication.addEventListener("unload", function (e) {
            if ((DevHome.UI.RAP.currentState !== ReportAProblemStates.COLLECT) && (DevHome.UI.RAP.currentState !== ReportAProblemStates.SENT)) {
                utils._Events.logUIAction("ReportAProblem:AppShutdown", this._getTelemetryStateName()); // Named to match XBOM RaP telemetry
            }
        });

        DevHome.Utilities._Events.logUIAction("ReportAProblem:ReportProblemStartup", ReportAProblemTelemetryStateNames[DevHome.UI.RAP.currentState]); // Expected once per DevHome lifetime
    }

    WinJS.UI.Pages.define("/toolwindows/reportAProblem/reportAProblem.html", {
        _tabs: null,
        _tracingDiv: null,
        _statusDiv: null,
        _tracingStatusDiv: null,
        _recentIssueRadio: null,
        _traceIssueRadio: null,
        _nextButton: null,
        _previousButton: null,
        _cancelButton: null,
        _toggleTraceButton: null,
        _includeCrashDumpCheckbox: null,
        _isDescriptionModifiedWithCrashDumpText: false,
        _isOperationInProgress: false,
        _isLoadingPage: true,
        _handleTraceTypeChanged: function () {
            if (DevHome.UI.RAP.currentState === ReportAProblemStates.COLLECT) {
                if (this._recentIssueRadio.checked) {
                    DevHome.UI.RAP.currentMode = ReportAProblemModes.INSTANT;
                } else {
                    DevHome.UI.RAP.currentMode = ReportAProblemModes.TRACE;
                }
                this._updateVolatileUI();

                if (!this._isLoadingPage) {
                    if (this._recentIssueRadio.checked) {
                        this._nextButton.focus();
                    } else {
                        this._toggleTraceButton.focus();
                    }
                }
            }
        },
        _getTelemetryStateName: function () {
            // Must match XBOM ReportStep names
            if (DevHome.UI.RAP.currentState === ReportAProblemStates.COLLECT) {
                if (DevHome.UI.RAP.isTracing) {
                    return "Tracing";
                }
            }
            return ReportAProblemTelemetryStateNames[DevHome.UI.RAP.currentState];
        },
        _handleInstantPress: function () {
            if (!this._recentIssueRadio.checked) {
                this._recentIssueRadio.checked = true;
            }
            this._handleTraceTypeChanged();
        },
        _handleTracePress: function () {
            if (!this._traceIssueRadio.checked) {
                this._traceIssueRadio.checked = true;
            }
            this._handleTraceTypeChanged();
        },
        _isValidEmail: function () {
            var regex = new RegExp(matchEmailPattern);
            return regex.test(this._emailElement.value);
        },
        _hasEmailValue: function () {
            return !DevHome.Utilities.isStringEmptyOrWhiteSpace(this._emailElement.value);
        },
        _hasTitleValue: function () {
            return !DevHome.Utilities.isStringEmptyOrWhiteSpace(this._titleElement.value);
        },
        _hasDescriptionValue: function () {
            return !DevHome.Utilities.isStringEmptyOrWhiteSpace(this._descriptionElement.value);
        },
        _inputValidation: function () {
            return this._isValidEmail() && this._hasEmailValue() && this._hasTitleValue() && this._hasDescriptionValue();
        },
        _toggleTraceOptions: function () {
            if (DevHome.UI.RAP.currentMode === ReportAProblemModes.TRACE && DevHome.UI.RAP.isTracing) {
                this._recentIssueRadio.disabled = true;
            }

            if (!DevHome.UI.RAP.isTracing) {
                this._traceIssueRadio.disabled = false;
                this._recentIssueRadio.disabled = false;
            }
        },
        _setToggleTraceButtonAriaLabel: function () {

            var ariaLabel = "";
            if (DevHome.UI.RAP.isTracing) {
                ariaLabel = `${DevHome.Utilities.Resources.getString("ReportAProblemTraceInProgress").value}. ${DevHome.Utilities.Resources.getString("ReportAProblemStopTrace").value}`;
            }
            else {
                ariaLabel = DevHome.Utilities.Resources.getString("ReportAProblemStartTrace").value;
            }

            if (ariaLabel != this._currentToggleTraceAriaLabel) {
                this._toggleTraceButton.setAttribute("aria-label", ariaLabel);
                this._currentToggleTraceAriaLabel = ariaLabel;
            }
        },
        _updateVolatileUI: function () {
            switch (DevHome.UI.RAP.currentState) {
                case ReportAProblemStates.COLLECT:
                    this._toggleTraceButton.textContent = DevHome.Utilities.Resources.getString(DevHome.UI.RAP.isTracing ? 'ReportAProblemStopTrace' : 'ReportAProblemStartTrace').value;
                    this._setToggleTraceButtonAriaLabel();
                    this._toggleTraceButton.disabled = this._isOperationInProgress;
                    this._toggleTraceOptions();
                    this._nextButton.disabled = this._isOperationInProgress || (DevHome.UI.RAP.currentMode === ReportAProblemModes.TRACE);

                    if (DevHome.UI.RAP.currentMode === ReportAProblemModes.TRACE) {
                        this._tracingDiv.classList.remove("xbdh-hidden");
                        this._collectCommandsDiv.classList.remove("xbdh-hidden");
                        this._toggleTraceButton.focus();
                    } else {
                        this._tracingDiv.classList.add("xbdh-hidden");
                        this._collectCommandsDiv.classList.add("xbdh-hidden");
                    }

                    DevHome.Utilities.removeCheckedClassOnUncheckedRadioButtonContainers(this._radioListItems);

                    break;
                case ReportAProblemStates.DESCRIBE:
                    this._nextButton.disabled = !(this._inputValidation() && (this._isOperationInProgress || DevHome.UI.RAP.hasLogs));
                    break;
                case ReportAProblemStates.REVIEW:
                    //Display temporary splash until logs are gathered.
                    var displayTemp = this._isOperationInProgress && !DevHome.UI.RAP.hasLogs;
                    if (displayTemp) {
                        this._almostDiv.classList.remove("xbdh-hidden");
                        this._reviewDiv.classList.add("xbdh-hidden");
                        this._cancelButton.disabled = true;
                    } else {
                        this._almostDiv.classList.add("xbdh-hidden");
                        this._reviewDiv.classList.remove("xbdh-hidden");
                        this._cancelButton.disabled = false;
                    }

                    this._nextButton.disabled = !(!this._isOperationInProgress && DevHome.UI.RAP.hasLogs);
                    break;
                case ReportAProblemStates.SEND:
                    this._nextButton.disabled = !(this._inputValidation() && !this._isOperationInProgress && DevHome.UI.RAP.hasBundledPackage);
                    this._emailElement.disabled = this._isOperationInProgress;
                    this._titleElement.disabled = this._isOperationInProgress;
                    this._descriptionElement.disabled = this._isOperationInProgress;
                    break;
                case ReportAProblemStates.SENT:

                    break;
                default:
                    // No-op
                    break;
            }
        },
        _gatherLogsAsync: async function (preserveExistingLogs) {
            if (preserveExistingLogs) {
                // no real tracing involved.
                this._toggleOperationInProgress('');
                this._gatherLogsWorkerAsync(preserveExistingLogs, false);

            } else {
                var isTracing = false;
                this._toggleOperationInProgress(DevHome.Utilities.Resources.getString('ReportAProblemGatheringLogs').value);

                try {
                    isTracing = await nativeUtils.getIsDiagnosticCapturingAsync();
                } catch (error) {
                    if (this._isOperationInProgress) {
                        this._toggleOperationInProgress('');
                        this._updateStatusMessage(true, DevHome.Utilities.Resources.getString('ReportAProblemFailedGatherLogs').value + ': ' + DevHome.Utilities._friendlyErrorFromWinRTError(error.number).description, true);
                        utils._Events.logError(error.number, error.message, new Error().stack);
                    }
                    return;
                }

                if (this._isOperationInProgress) {
                    if (DevHome.UI.RAP.isTracing === isTracing) {
                        // Proceed as expected
                        this._gatherLogsWorkerAsync(preserveExistingLogs, isTracing);
                    } else {
                        //display warning
                        DevHome.Utilities.showPopUp(
                            DevHome.Utilities.Resources.getString("labelConfirmTitle").value,
                            DevHome.Utilities.Resources.getString("ReportAProblemGatherInProgress").value,
                            {
                                label: DevHome.Utilities.Resources.getString("commandYes").value,
                                callback: (function () {
                                    if (this._isOperationInProgress) {
                                        this._gatherLogsWorkerAsync(preserveExistingLogs, true);
                                    }
                                    this._cancelPopUp();
                                }.bind(this)),
                            },
                            {
                                label: DevHome.Utilities.Resources.getString("commandNo").value,
                                callback: (function () {
                                    // Go back to beginning.
                                    this._toggleOperationInProgress();
                                    this._changeReportAProblemState(ReportAProblemStates.COLLECT, false);
                                    this._cancelPopUp();
                                }.bind(this)),
                            });
                    }
                }
            }
        },
        _gatherLogsWorkerAsync: async function (preserveExistingLogs, isTracing) {
            // Previously start operation.
            if (this._isOperationInProgress) {

                var getLogsOperation = (async () => {
                    try {
                        if (!preserveExistingLogs) {
                            var nativeGetLogsOperation;
                            if (isTracing) {
                                nativeGetLogsOperation = nativeUtils.completeDiagnosticCaptureAsync();
                            } else if (!DevHome.UI.RAP.isTracing && (DevHome.UI.RAP.currentMode !== ReportAProblemModes.TRACE)) {
                                nativeGetLogsOperation = nativeUtils.autologgerDiagnosticCaptureAsync();
                            }
                            let sourceLogDirectory = await nativeGetLogsOperation;

                            DevHome.UI.RAP.isTracing = false;
                            DevHome.UI.RAP.sourceLogDirectory = sourceLogDirectory;
                        }

                        return Promise.resolve(DevHome.UI.RAP.sourceLogDirectory);
                    } catch (error) {
                        if (this._isOperationInProgress) {
                            this._toggleOperationInProgress('');
                            this._updateStatusMessage(true, DevHome.Utilities.Resources.getString('ReportAProblemFailedGatherLogs').value + ': ' + DevHome.Utilities._friendlyErrorFromWinRTError(error.number).description, true);
                            utils._Events.logError(error.number, error.message, new Error().stack);
                        }
                    }
                })();

                //If directory does not exist is a NO OP.
                var deleteExistingPendingFiles = (async () => {
                    try {
                        await nativeUtils.recursiveDeleteFolderAsync(PendingLogsDirectoryLocalPath);
                    } catch (error) {
                        if (this._isOperationInProgress) {
                            this._toggleOperationInProgress('');
                            this._updateStatusMessage(true, DevHome.Utilities.Resources.getString('ReportAProblemFailedDeleteLogs').value + ': ' + DevHome.Utilities._friendlyErrorFromWinRTError(error.number).description, true);
                            utils._Events.logError(error.number, error.message, new Error().stack);
                        }
                    }
                })();

                await Promise.all([getLogsOperation, deleteExistingPendingFiles]);

                // Has operation not failed?
                if (this._isOperationInProgress) {
                    try {
                        // Copy log files to pending directory.
                        await nativeUtils.recursiveCopyFolderAsync(DevHome.UI.RAP.sourceLogDirectory, PendingLogsDirectoryLocalPath);
                        DevHome.UI.RAP.hasLogs = true;
                        this._toggleOperationInProgress('');
                    } catch (error) {
                        this._toggleOperationInProgress('');
                        this._updateStatusMessage(true, DevHome.Utilities.Resources.getString('ReportAProblemFailedCopyLogs').value + ': ' + DevHome.Utilities._friendlyErrorFromWinRTError(error.number).description, true);
                        utils._Events.logError(error.number, error.message, new Error().stack);
                    }
                }
            }
        },
        _bundleLogsAsync: async function () {
            this._toggleOperationInProgress(DevHome.Utilities.Resources.getString('ReportAProblemPackagingLogs').value);

            // Create folder if it doesn't already exist.
            var tempFolder = Windows.Storage.ApplicationData.current.temporaryFolder;
            var bundleLogsOperation = (async () => {
                var folder;

                try {
                    folder = await tempFolder.createFolderAsync(RAPDirectoryName, Windows.Storage.CreationCollisionOption.openIfExists);
                } catch (error) {
                    if (this._isOperationInProgress) {
                        this._toggleOperationInProgress('');
                        this._updateStatusMessage(true, DevHome.Utilities.Resources.getString('ReportAProblemFailedCreateDir').value + ': ' + DevHome.Utilities._friendlyErrorFromWinRTError(error.number).description, true);
                        utils._Events.logError(error.number, error.message, new Error().stack);
                    }
                    return;
                }

                DevHome.UI.RAP.packagedLogsTempFolder = folder.path;
                var bundledPackageFileName = 'compressedProblemReport' + getFormattedTime();
                DevHome.UI.RAP.bundledPackageFile = DevHome.UI.RAP.packagedLogsTempFolder + '\\' + bundledPackageFileName;

                var finalDescription = this._descriptionElement.value

                if (this._includeCrashDumpCheckbox.checked) {
                    // Add some extra text to the description so we can tell the user triggered crash dumps.
                    // We don't add this to the real description value so the developer doesn't have to see it.
                    finalDescription += "\n\n***Triggering operating system dump after bug submission***";
                    this._isDescriptionModifiedWithCrashDumpText = true;
                } else {
                    this._isDescriptionModifiedWithCrashDumpText = false;
                }

                try {
                    await nativeUtils.bundleDiagnosticPackageAsync(
                        this._titleElement.value,
                        finalDescription,
                        getPackageVersion(),
                        DevHome.UI.RAP.bundledPackageFile,
                        PendingLogsDirectoryLocalPath,
                        this._emailElement.value);
                } catch (error) {
                    if (this._isOperationInProgress) {
                        this._toggleOperationInProgress('');
                        this._updateStatusMessage(true, DevHome.Utilities.Resources.getString('ReportAProblemFailedBundleLogs').value + ': ' + DevHome.Utilities._friendlyErrorFromWinRTError(error.number).description, true);
                        utils._Events.logError(error.number, error.message, new Error().stack);
                    }
                    return;
                }

                DevHome.UI.RAP.hasBundledPackage = true;

                //Get file size as string
                var file = await folder.getFileAsync(bundledPackageFileName);
                var properties = await file.getBasicPropertiesAsync();
                var fileSizeString = getReadableSize(properties.size);
                this._fileSizeDiv.textContent = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("ReportAProblemCompressedUploadSizeLabel").value, fileSizeString);
            })();

            var fileCountOperation = (async () => {
                var folder, files;

                try {
                    folder = await nativeUtils.getFolderAsync(PendingLogsDirectoryLocalPath)
                } catch (error) {
                    if (this._isOperationInProgress) {
                        this._toggleOperationInProgress('');

                        // No-op for "file not found" exception
                        if (error.number !== -2147024894) {
                            this._updateStatusMessage(true, DevHome.Utilities.Resources.getString('ReportAProblemFailedGetDir').value + ': ' + DevHome.Utilities._friendlyErrorFromWinRTError(error.number).description, true);
                            utils._Events.logError(error.number, error.message, new Error().stack);
                        }
                    }
                    return;
                }

                try {
                    files = await folder.getFilesAsync(Windows.Storage.Search.CommonFileQuery.orderBySearchRank);
                } catch (error) {
                    if (this._isOperationInProgress) {
                        this._toggleOperationInProgress('');
                        this._updateStatusMessage(true, DevHome.Utilities.Resources.getString('ReportAProblemFailedCountDir').value + ': ' + DevHome.Utilities._friendlyErrorFromWinRTError(error.number).description, true);
                        utils._Events.logError(error.number, error.message, new Error().stack);
                    }
                    return;
                }

                if (this._isOperationInProgress) {
                    this._fileCountDiv.textContent = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("ReportAProblemFilesToUploadLabel").value, files ? files.length : 0);
                }
            })();

            await Promise.all([bundleLogsOperation, fileCountOperation]);
        },
        _uploadLogBundleAsync: async function () {
            var rebundle = false;
            if ((this._cachedEmail !== this._emailElement.value)
                || (this._cachedTitle !== this._titleElement.value)
                || (this._cachedDescription !== this._descriptionElement.value)
                || (this._includeCrashDumpCheckbox.checked !== this._isDescriptionModifiedWithCrashDumpText)) {
                await this._bundleLogsAsync();
                rebundle = true;
            }
            if (this._isOperationInProgress || !rebundle) {
                if (rebundle) {
                    // Operation already in progress.
                    this._updateStatusMessage(false, DevHome.Utilities.Resources.getString('ReportAProblemSendingReport').value);
                } else {
                    this._toggleOperationInProgress(DevHome.Utilities.Resources.getString('ReportAProblemSendingReport').value);
                }

                var correlationGuid = 0;

                try {
                    correlationGuid = await nativeUtils.uploadBundledDiagnosticPackageAsync(DevHome.UI.RAP.bundledPackageFile);
                } catch (error) {
                    if (this._isOperationInProgress) {
                        this._toggleOperationInProgress('');
                        this._updateStatusMessage(true, 'failed to upload bundled logs: ' + DevHome.Utilities._friendlyErrorFromWinRTError(error.number).description, true);
                        utils._Events.logError(error.number, error.message, new Error().stack);
                    }
                    return;
                }

                if (this._isOperationInProgress) {
                    this._toggleOperationInProgress('');
                    this._changeReportAProblemState(ReportAProblemStates.SENT);
                    this._nextButton.focus();

                    if (this._includeCrashDumpCheckbox.checked && correlationGuid !== 0) {
                        this._crashDataMessage.classList.remove('xbdh-hidden');
                        this._nextButton.disabled = true;

                        // Delay triggering the crash dumps so the UI will
                        // update to the SENT page first.
                        setTimeout(function () {
                            crashDumpUtils.triggerCrashDumps(correlationGuid);
                        }.bind(this), 500);
                    }
                }
            }
        },
        _cleanUpFilesAsync: async function () {
            this._toggleOperationInProgress(DevHome.Utilities.Resources.getString('ReportAProblemCleaningUpFiles').value);

            // Best effort
            var deleteELogFilesFiles = nativeUtils.recursiveDeleteFolderAsync(DevHome.UI.RAP.sourceLogDirectory).then(function () { DevHome.UI.RAP.sourceLogDirectory = '';}, function () { });
            var deleteEPendingFiles = nativeUtils.recursiveDeleteFolderAsync(PendingLogsDirectoryLocalPath).then(function () { }, function () { });
            var deleteEBundledLogDirectoryFiles = nativeUtils.recursiveDeleteFolderAsync(DevHome.UI.RAP.packagedLogsTempFolder).then(function () { DevHome.UI.RAP.packagedLogsTempFolder = ''; DevHome.UI.RAP.bundledPackageFile = '';}, function () { });

            await Promise.all([deleteELogFilesFiles, deleteEPendingFiles, deleteEBundledLogDirectoryFiles]);

            if (this._isOperationInProgress) {
                this._toggleOperationInProgress('');
            }
        },
        _changeReportAProblemState: function (newState, isForward) {
            if (newState >= ReportAProblemStates.MAX) {
                newState = ReportAProblemStates.COLLECT;
                DevHome.UI.RAP.currentMode = ReportAProblemModes.INSTANT;
            }

            DevHome.UI.RAP.currentState = newState;

            // Show/hide UI based on state.
            var visibleElements = this._layoutRoot.querySelectorAll('[visibleStates]');
            for (var i = 0, len = visibleElements.length; i < len; i++) {
                if (visibleElements[i].getAttribute('visibleStates').includes(ReportAProblemStateNames[DevHome.UI.RAP.currentState])) {
                    visibleElements[i].classList.remove("xbdh-hidden");
                } else {
                    visibleElements[i].classList.add("xbdh-hidden");
                }
            }

            // Update selected tabs.
            var activeTabs = this._tabs.querySelectorAll('[activeStates]');
            for (var i = 0, len = activeTabs.length; i < len; i++) {
                if (activeTabs[i].getAttribute('activeStates').includes(ReportAProblemStateNames[DevHome.UI.RAP.currentState])) {
                    activeTabs[i].setAttribute('active', '');
                } else {
                    activeTabs[i].removeAttribute('active');
                }
            }

            // Clear error message;
            this._updateStatusMessage(false);

            switch (DevHome.UI.RAP.currentState) {
                case ReportAProblemStates.COLLECT:
                    // Reset
                    this._nextButton.textContent = DevHome.Utilities.Resources.getString("commandNext").value;
                    this._toggleTraceButton.textContent = DevHome.Utilities.Resources.getString("ReportAProblemStartTrace").value;
                    this._setToggleTraceButtonAriaLabel();
                    this._tracingStatusDiv.innerHTML = '';
                    this._emailElement.value = '';
                    this._titleElement.value = '';
                    this._descriptionElement.value = '';
                    this._cancelButton.classList.add("xbdh-hidden");
                    DevHome.UI.RAP.isTracing ? this._traceIssueRadio.checked = true : this._recentIssueRadio.checked = true;
                    DevHome.UI.RAP.hasLogs = false;
                    DevHome.UI.RAP.hasBundledPackage = false;

                    utils._Events.logUIAction("ReportAProblem:AppStartup", this._getTelemetryStateName()); // Named to match XBOM RaP telemetry
                    break;
                case ReportAProblemStates.DESCRIBE:
                    if (!isForward) {
                        DevHome.UI.RAP.hasLogs = false;
                    }

                    if (!DevHome.UI.RAP.hasLogs) {
                        this._gatherLogsAsync(!isForward);
                    }

                    this._previousButton.classList.add("xbdh-hidden");
                    this._cancelButton.classList.remove("xbdh-hidden");
                    this._describeSendHeading.textContent = DevHome.Utilities.Resources.getString("ReportAProblemDetailsLabel").value;

                    if (!this._isLoadingPage) {
                        this._emailElement.focus();
                    }
                    // Bring up the virtual keyboard
                    var inputPane = Windows.UI.ViewManagement.InputPane.getForCurrentView();
                    inputPane.tryShow();

                    break;
                case ReportAProblemStates.REVIEW:
                    this._previousButton.classList.remove("xbdh-hidden");
                    this._cancelButton.classList.remove("xbdh-hidden");
                    this._nextButton.textContent = DevHome.Utilities.Resources.getString("commandNext").value;

                    try {
                        var ipAddress = networkUtils.systemIpAddress;
                        this._networkPathDiv.textContent = '\\\\' + ipAddress + PendingLogsDirectoryNetworkPath;
                    } catch (ex) { }

                    DevHome.UI.RAP.hasBundledPackage = false;
                    break;
                case ReportAProblemStates.SEND:
                    this._fileCountDiv.textContent = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("ReportAProblemFilesToUploadLabel").value, '');
                    this._fileSizeDiv.textContent = DevHome.Utilities.Resources._formatString(DevHome.Utilities.Resources.getString("ReportAProblemCompressedUploadSizeLabel").value, '');
                    this._cachedEmail = this._emailElement.value;
                    this._cachedTitle = this._titleElement.value;
                    this._cachedDescription = this._descriptionElement.value;

                    if (!isForward) {
                        DevHome.UI.RAP.hasBundledPackage = false;
                    }

                    if (!DevHome.UI.RAP.hasBundledPackage) {
                        this._bundleLogsAsync()
                            .then(function () {
                                if (this._isOperationInProgress) {
                                    this._toggleOperationInProgress('');
                                    if (!this._isLoadingPage) {
                                        this._nextButton.focus();
                                    }
                                }
                            }.bind(this));
                    }
                    this._nextButton.textContent = DevHome.Utilities.Resources.getString("commandSend").value;
                    this._previousButton.classList.remove("xbdh-hidden");
                    this._cancelButton.classList.remove("xbdh-hidden");
                    this._describeSendHeading.textContent = DevHome.Utilities.Resources.getString("ReportAProblemSendLabel").value;
                    break;
                case ReportAProblemStates.SENT:
                    this._nextButton.textContent = DevHome.Utilities.Resources.getString("commandNewReport").value;
                    this._previousButton.classList.add("xbdh-hidden");
                    this._cancelButton.classList.add("xbdh-hidden");

                    try {
                        this._displayNameDiv.textContent = networkUtils.systemIpAddress + ' (' + systemProperties.hostName + ')';
                    } catch (ex) { }

                    utils._Events.logUIAction("ReportAProblem:AppShutdown", this._getTelemetryStateName()); // Named to match XBOM RaP telemetry
                    break;
                default:
                    // No-op
                    break;
            }

            this._updateVolatileUI();
        },
        _targetStatusDiv: function () {
            return (DevHome.UI.RAP.currentState === ReportAProblemStates.COLLECT && DevHome.UI.RAP.currentMode === ReportAProblemModes.TRACE) ? this._tracingStatusDiv : this._statusDiv;
        },
        _toggleOperationInProgress: function (statusMessage) {
            this._errorDiv.classList.add('xbdh-hidden');
            var targetDiv = this._targetStatusDiv();

            if (this._isOperationInProgress) {
                this._isOperationInProgress = false;
                DevHome.Utilities.hideProgress(targetDiv);
            } else {
                this._isOperationInProgress = true;
                DevHome.Utilities.showProgress(targetDiv, statusMessage);
            }

            this._updateVolatileUI();
        },
        _updateStatusMessage: function (isError, statusMessage) {
            this._errorDiv.classList.add('xbdh-hidden');
            var targetDiv = this._targetStatusDiv();

            if (this._isOperationInProgress) {
                if (!isError) {
                    DevHome.Utilities.showProgress(targetDiv, statusMessage);
                }
            }
            else {
                if (statusMessage) {
                    if (isError) {
                        this._errorDiv.classList.remove('xbdh-hidden');
                        this._errorMessageDiv.textContent = statusMessage;
                    } else {
                        targetDiv.innerHTML = '<div>' + statusMessage + '</div>';
                    }
                } else {
                    targetDiv.innerHTML = '';
                    this._errorDiv.classList.add('xbdh-hidden');
                }
            }
        },
        _handleNextButtonPress: function (e) {
            switch (DevHome.UI.RAP.currentState) {
                case ReportAProblemStates.SEND:
                    this._uploadLogBundleAsync();
                    break;
                case ReportAProblemStates.SENT:
                    this._cleanUpFilesAsync();
                default:
                    utils._Events.logUIAction("ReportAProblem:Confirm", this._getTelemetryStateName()); //Named to match XBOM RaP telemetry
                    this._changeReportAProblemState(DevHome.UI.RAP.currentState + 1, true);
            }
        },
        _handlPreviousButtonPress: function (e) {
            if (DevHome.UI.RAP.currentState === ReportAProblemStates.REVIEW) {
                // Display warning of losing progress.
                DevHome.Utilities.showPopUp(
                    DevHome.Utilities.Resources.getString("labelWarningStrong").value,
                    DevHome.Utilities.Resources.getString("ReportAProblemPreviousWarning").value,
                    {
                        label: DevHome.Utilities.Resources.getString("commandPrevious").value,
                        callback: (function () {
                            utils._Events.logUIAction("ReportAProblem:Cancel", this._getTelemetryStateName()); //Named to match XBOM RaP telemetry

                            this._changeReportAProblemState(DevHome.UI.RAP.currentState - 1, false);
                            this._cancelPopUp();
                        }.bind(this)),
                    },
                    {
                        label: DevHome.Utilities.Resources.getString("commandCancel").value,
                        callback: this._cancelPopUp.bind(this),
                    });
            } else {
                this._changeReportAProblemState(DevHome.UI.RAP.currentState - 1, false);
            }
        },
        _cancelPopUp: function (e) {
            var dialog = document.getElementById("xbdh-dialog").winControl;
            dialog.hide();
        },
        _handleCancelButtonPress: function (e) {
            // Display warning of losing progress.
            DevHome.Utilities.showPopUp(
                DevHome.Utilities.Resources.getString("labelWarningStrong").value,
                DevHome.Utilities.Resources.getString("ReportAProblemRestartWarning").value,
                {
                    label: DevHome.Utilities.Resources.getString("ReportAProblemRestartReport").value,
                    callback: (function ()
                    {
                        utils._Events.logUIAction("ReportAProblem:Cancel", this._getTelemetryStateName()); //Named to match XBOM RaP telemetry
                        utils._Events.logUIAction("ReportAProblem:AppShutdown", this._getTelemetryStateName()); // Named to match XBOM RaP telemetry
                        this._changeReportAProblemState(ReportAProblemStates.COLLECT, false);
                        this._cancelPopUp();
                    }.bind(this)),
                },
                {
                    label: DevHome.Utilities.Resources.getString("commandCancel").value,
                    callback: this._cancelPopUp.bind(this)
                });
        },
        _startTraceAsync: async function (useExistingTrace) {
            // Previously start operation.
            if (this._isOperationInProgress) {
                if (useExistingTrace) {
                    DevHome.UI.RAP.isTracing = true;
                    this._toggleOperationInProgress();
                    this._updateStatusMessage(false, DevHome.Utilities.Resources.getString('ReportAProblemTraceInProgress').value);
                } else {
                    utils._Events.logUIAction("ReportAProblem:StartTrace", this._getTelemetryStateName()); //Named to match XBOM RaP telemetry

                    try {
                        await nativeUtils.startDiagnosticCaptureAsync();
                    } catch (error) {
                        this._toggleOperationInProgress();
                        this._updateStatusMessage(true, DevHome.Utilities.Resources.getString('ReportAProblemFailedStartTrace').value + ': ' + DevHome.Utilities._friendlyErrorFromWinRTError(error.number).description);
                        utils._Events.logError(error.number, error.message, new Error().stack);
                        return;
                    }

                    DevHome.UI.RAP.isTracing = true;
                    this._toggleOperationInProgress();
                    this._updateStatusMessage(false, DevHome.Utilities.Resources.getString('ReportAProblemTraceInProgress').value);
                    this._toggleTraceButton.focus();
                }
            }
        },
        _handleToggleTraceButtonPress: function (e) {
            if (DevHome.UI.RAP.currentMode === ReportAProblemModes.TRACE) {
                if (!DevHome.UI.RAP.isTracing) {
                    this._toggleOperationInProgress(DevHome.Utilities.Resources.getString('ReportAProblemStartingTrace').value);
                    nativeUtils.getIsDiagnosticCapturingAsync()
                        .then(function (isTracing) {
                            if (!DevHome.UI.RAP.isTracing && !isTracing) {
                                // Proceed as expected.
                                this._startTraceAsync(false);
                            } else {
                                //display warning
                                DevHome.Utilities.showPopUp(
                                    DevHome.Utilities.Resources.getString("labelConfirmTitle").value,
                                    DevHome.Utilities.Resources.getString("ReportAProblemStartInProgress").value,
                                    {
                                        label: DevHome.Utilities.Resources.getString("commandYes").value,
                                        callback: (function () {
                                            if (this._isOperationInProgress) {
                                                this._startTraceAsync(true);
                                            }
                                            this._cancelPopUp();
                                        }.bind(this)),
                                    },
                                    {
                                        label: DevHome.Utilities.Resources.getString("commandNo").value,
                                        callback: (function () {
                                            // Abort trace then restart it.
                                            this._updateStatusMessage(false, DevHome.Utilities.Resources.getString('ReportAProblemAbortingTrace').value);
                                            nativeUtils.abortDiagnosticCaptureAsync().then(function () {
                                                DevHome.UI.RAP.isTracing = false;

                                                if (this._isOperationInProgress) {
                                                    this._startTraceAsync(false);
                                                }
                                            }.bind(this),
                                                function (error) {
                                                    if (this._isOperationInProgress) {
                                                        this._toggleOperationInProgress('');
                                                    }
                                                    this._updateStatusMessage(true, DevHome.Utilities.Resources.getString('ReportAProblemFailedAbortTrace').value + ': ' + DevHome.Utilities._friendlyErrorFromWinRTError(error.number).description);
                                                    utils._Events.logError(error.number, error.message, new Error().stack);
                                                }.bind(this));
                                            this._cancelPopUp();
                                        }.bind(this)),
                                    });
                            }
                        }.bind(this),
                            function (error) {
                                if (this._isOperationInProgress) {
                                    this._toggleOperationInProgress('');
                                    this._updateStatusMessage(true, DevHome.Utilities.Resources.getString('ReportAProblemFailedStartTrace').value + ': ' + DevHome.Utilities._friendlyErrorFromWinRTError(error.number).description, true);
                                    utils._Events.logError(error.number, error.message, new Error().stack);
                                }
                            }.bind(this));
                } else {
                    utils._Events.logUIAction("ReportAProblem:StopTrace", this._getTelemetryStateName()); //Named to match XBOM RaP telemetry
                    //Implicit confirm.
                    utils._Events.logUIAction("ReportAProblem:Confirm", this._getTelemetryStateName()); //Named to match XBOM RaP telemetry

                    // Indirectly trigger log capture.
                    this._changeReportAProblemState(ReportAProblemStates.DESCRIBE, true);
                }
            }
        },
        _inputTextChanged: function (e) {
            if (DevHome.UI.RAP.currentState === ReportAProblemStates.DESCRIBE || DevHome.UI.RAP.currentState === ReportAProblemStates.SEND) {
                this._updateErrorLabels(e);
                this._updateVolatileUI();
            }
        },
        _updateErrorLabels: function (e) {
            var targetId = e.target.id;

            switch (targetId) {
                case this._inputIds.email:
                    this._emailInvalidLabel.style.display = "none";
                    this._emailRequiredLabel.style.display = "none";
                    this._emailElement.setAttribute("aria-invalid", "false");

                    if (this._hasEmailValue() && !this._isValidEmail()) {
                        this._emailInvalidLabel.style.display = "flex";
                        this._emailElement.setAttribute("aria-invalid", "true");
                    }

                    if (!this._hasEmailValue()) {
                        this._emailRequiredLabel.style.display = "flex";
                    }

                    break;
                case this._inputIds.title:
                    this._titleRequiredLabel.style.display = "none";

                    if (!this._hasTitleValue()) {
                        this._titleRequiredLabel.style.display = "flex";
                    }

                    break;
                case this._inputIds.description:
                    this._descriptionRequiredLabel.style.display = "none";

                    if (!this._hasDescriptionValue()) {
                        this._descriptionRequiredLabel.style.display = "flex";
                    }

                    break;
            }
        },
        ready: function (element, options) {
            this._layoutRoot = element;

            this._isLoadingPage = true;

            this._errorDiv = this._layoutRoot.querySelector("#xbdh-rap-top-error");
            this._errorMessageDiv = this._layoutRoot.querySelector("#xbdh-rap-top-error-message");
            this._tabs = this._layoutRoot.querySelector("#xbdh-rap-top-tabs");
            this._tracingDiv = this._layoutRoot.querySelector("#xbdh-rap-panels-collect-options-tracing");
            this._collectCommandsDiv = this._layoutRoot.querySelector("#xbdh-rap-panels-collect-commands");
            this._statusDiv = this._layoutRoot.querySelector("#xbdh-rap-panels-describe-description-box-status");
            this._almostDiv = this._layoutRoot.querySelector("#xbdh-rap-panels-almost");
            this._tracingStatusDiv = this._layoutRoot.querySelector("#xbdh-rap-panels-collect-commands-traceStatus");
            this._reviewDiv = this._layoutRoot.querySelector("#xbdh-rap-panels-review");
            this._networkPathDiv = this._layoutRoot.querySelector("#xbdh-rap-panels-review-networkpath");
            this._fileCountDiv = this._layoutRoot.querySelector("#xbdh-rap-bottom-send-files");
            this._fileSizeDiv = this._layoutRoot.querySelector("#xbdh-rap-bottom-send-size");
            this._displayNameDiv = this._layoutRoot.querySelector("#xbdh-rap-panels-sent-displayName");
            this._describeSendHeading = this._layoutRoot.querySelector("#xbdh-rap-panels-describe-heading");
            this._crashDataMessage = this._layoutRoot.querySelector("#xbdh-rap-panels-sent-crashdata");

            this._recentIssueRadio = new DevHome.UI.Radio(this._layoutRoot.querySelector("#xbdh-rap-panels-collect-options-recent"), "ReportAProblemIssueYes");
            this._traceIssueRadio = new DevHome.UI.Radio(this._layoutRoot.querySelector("#xbdh-rap-panels-collect-options-trace"), "ReportAProblemIssueNo");

            this._nextButton = this._layoutRoot.querySelector("#xbdh-rap-bottom-commands-next");
            this._previousButton = this._layoutRoot.querySelector("#xbdh-rap-bottom-commands-previous");
            this._cancelButton = this._layoutRoot.querySelector("#xbdh-rap-bottom-commands-cancel");
            this._toggleTraceButton = this._layoutRoot.querySelector("#xbdh-rap-panels-collect-commands-toggleTrace");
            this._includeCrashDumpCheckbox = this._layoutRoot.querySelector("#xbdh-rap-panels-describe-crashdump-checkbox");

            this._inputIds = {
                email: "xbdh-rap-panels-describe-email-value",
                title: "xbdh-rap-panels-describe-title-value",
                description: "xbdh-rap-panels-describe-description-value"
            };

            this._emailElement = this._layoutRoot.querySelector(`#${this._inputIds.email}`);
            this._emailInvalidLabel = this._layoutRoot.querySelector("#xbdh-rap-panels-describe-email-invalid-label");
            this._emailRequiredLabel = this._layoutRoot.querySelector("#xbdh-rap-panels-describe-email-required-label");

            this._titleElement = this._layoutRoot.querySelector(`#${this._inputIds.title}`);
            this._titleRequiredLabel = this._layoutRoot.querySelector("#xbdh-rap-panels-describe-title-required-label");

            this._descriptionElement = this._layoutRoot.querySelector(`#${this._inputIds.description}`);
            this._descriptionRequiredLabel = this._layoutRoot.querySelector("#xbdh-rap-panels-describe-description-required-label");

            this._radioListItems = this._layoutRoot.querySelectorAll(".xbdh-radio.xbdh-list-item");

            this._currentToggleTraceAriaLabel = "";

            // Events
            this._recentIssueRadio.addEventListener("change", this._handleInstantPress.bind(this), false);
            this._traceIssueRadio.addEventListener("change", this._handleTracePress.bind(this), false);

            this._nextButton.addEventListener("click", this._handleNextButtonPress.bind(this), false);
            this._previousButton.addEventListener("click", this._handlPreviousButtonPress.bind(this), false);
            this._cancelButton.addEventListener("click", this._handleCancelButtonPress.bind(this), false);
            this._toggleTraceButton.addEventListener("click", this._handleToggleTraceButtonPress.bind(this), false);

            this._emailElement.addEventListener("input", this._inputTextChanged.bind(this), false);
            this._titleElement.addEventListener("input", this._inputTextChanged.bind(this), false);
            this._descriptionElement.addEventListener("input", this._inputTextChanged.bind(this), false);

            // Refresh inputs.
            this._emailElement.value = DevHome.UI.RAP.email;
            this._titleElement.value = DevHome.UI.RAP.title;
            this._descriptionElement.value = DevHome.UI.RAP.description;

            // Refresh UI
            this._changeReportAProblemState(DevHome.UI.RAP.currentState, true);

            this._isLoadingPage = false;
        },
        unload: function () {
            // Store UI state.
            DevHome.UI.RAP.email = this._emailElement.value;
            DevHome.UI.RAP.title = this._titleElement.value;
            DevHome.UI.RAP.description = this._descriptionElement.value;
        },
    });
})();