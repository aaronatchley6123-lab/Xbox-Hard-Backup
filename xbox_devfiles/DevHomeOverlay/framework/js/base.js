(function xhrInit() {
    "use strict";

    function schedule(f, arg) {
        setImmediate(function xhr_callback() {
            f(arg);
        });
    }

    function noop() {
    }

    var schemeRegex = /^(\w+)\:\/\//;

    var REQUEST_TIMEOUT = 20000;

    function xhr(options) {
        var req;
        return new Promise(
            function (c, e, p) {
                req = new XMLHttpRequest();

                var isLocalRequest = false;
                var schemeMatch = schemeRegex.exec(options.url.toLowerCase());
                if (schemeMatch) {
                    if (schemeMatch[1] === 'file') {
                        isLocalRequest = true;
                    }
                } else if (window.location.protocol === 'file:') {
                    isLocalRequest = true;
                }

                req.ontimeout = function () {
                    console.error("The request for " + options.url.toLowerCase() + " timed out.");

                    if (req._canceled) {
                        req.ontimeout = noop;
                        return;
                    }

                    schedule(e, req);
                };

                req.onerror = function () {
                    console.error("The request for " + options.url.toLowerCase() + " encountered an error.");

                    if (req._canceled) {
                        req.onerror = noop;
                        return;
                    }

                    schedule(e, req);
                };

                req.onreadystatechange = function () {
                    if (req._canceled) {
                        req.onreadystatechange = noop;
                        return;
                    }

                    if (req.readyState === 4) {
                        if ((req.status >= 200 && req.status < 300) || (isLocalRequest && req.status === 0)) {
                            schedule(c, req);
                        } else {
                            schedule(e, req);
                        }
                        req.onreadystatechange = noop;
                    }
                };

                req.open(
                    options.type || "GET",
                    options.url,
                    // Promise based XHR does not support sync.
                    //
                    true,
                    options.user,
                    options.password
                );
                req.timeout = REQUEST_TIMEOUT;
                req.responseType = options.responseType || "";

                Object.keys(options.headers || {}).forEach(function (k) {
                    req.setRequestHeader(k, options.headers[k]);
                });

                if (options.customRequestInitializer) {
                    options.customRequestInitializer(req);
                }

                if (options.data === undefined) {
                    req.send();
                } else {
                    req.send(options.data);
                }
            },
            function () {
                req.ontimeout = noop;
                req.onerror = noop;
                req.onreadystatechange = noop;
                req._canceled = true;
                req.abort();
            }
        );
    }
    window.DevHome = window.DevHome || {};
    DevHome.Utilities = DevHome.Utilities || {};
    DevHome.Utilities.xhr = xhr;
})();

(function resourcesInit() {
    "use strict";

    function _getWinJSString(id) {
        var result = getString("ms-resource:///Microsoft.WinJS/" + id);

        if (result.empty) {
            result = _getStringBuiltIn(id);
        }

        return result;
    }

    function _getStringBuiltIn(resourceId) {
        var str = defaultStrings[resourceId];

        if (typeof str === "string") {
            str = { value: str };
        }

        return str || { value: resourceId, empty: true };
    }

    var resourceMap;
    var mrtEventHook = false;
    var contextChangedET = "contextchanged";
    var resourceContext;

    //var ListenerType = _Base.Class.mix(_Base.Class.define(null, { /* empty */ }, { supportedForProcessing: false }), _Events.eventMixin);
    //var listeners = new ListenerType();
    //var createEvent = _Events._createEventProperty;

    var strings = {
        get malformedFormatStringInput() { return "Malformed, did you mean to escape your '{0}'?"; },
    };

    function _formatString(string) {
        var args = arguments;
        if (args.length > 1) {
            string = string.replace(/({{)|(}})|{(\d+)}|({)|(})/g, function (unused, left, right, index, illegalLeft, illegalRight) {
                if (illegalLeft || illegalRight) { throw formatString(strings.malformedFormatStringInput, illegalLeft || illegalRight); }
                return (left && "{") || (right && "}") || args[(index | 0) + 1];
            });
        }
        return string;
    }

    /**
       * Escapes a string so that it can be safely displayed in html.
       * This only escapes:
       *                    & " ' < >"
       * So any more complex escape such as invisible character to &#<value>; would need another function
       * @param htmlString The javascript string that is to be HTML escaped
       * @return The escaped string
       */
    function _escapeHtml(htmlString) {
        // Ensure we have a string to escape
        if ((typeof htmlString) !== "string") {
            if (htmlString === null || htmlString === undefined) {
                return "";
            }
            htmlString = "" + htmlString;
        }
        // Speed up the html escape by using chained regular expressions to decode html characters
        // Uses String.prototype to prevent a possible redefinition of "replace
        return (String.prototype.replace.call(String.prototype.replace.call(String.prototype.replace.call(String.prototype.replace.call(String.prototype.replace.call(htmlString, /&/g, "&amp;"), /"/g, "&quot;"), /'/g, "&apos;"), /</g, "&lt;"), />/g, "&gt;"));
    };

    function _getStringWinRT(resourceId) {
        if (!resourceMap) {
            var mainResourceMap = Windows.ApplicationModel.Resources.Core.ResourceManager.current.mainResourceMap;
            try {
                resourceMap = mainResourceMap.getSubtree('Resources');
            }
            catch (e) {
            }
            if (!resourceMap) {
                resourceMap = mainResourceMap;
            }
        }

        var stringValue;
        var langValue;
        var resCandidate;
        try {
            var resContext = _getResourceContext();
            if (resContext) {
                resCandidate = resourceMap.getValue(resourceId, resContext);
            } else {
                resCandidate = resourceMap.getValue(resourceId);
            }

            if (resCandidate) {
                stringValue = resCandidate.valueAsString;
                if (stringValue === undefined) {
                    stringValue = resCandidate.toString();
                }
            }
        }
        catch (e) { }

        if (!stringValue) {
            return _getStringJS(resourceId);
        }

        // EscapeHtml as a security precaution.
        stringValue = _escapeHtml(stringValue);

        try {
            langValue = resCandidate.getQualifierValue("Language");
        }
        catch (e) {
            return { value: stringValue };
        }

        return { value: stringValue, lang: langValue };
    };

    function _getStringJS(resourceId) {
        var str = strings && strings[resourceId];
        if (typeof str === "string") {
            str = { value: str };
        }

        if (str) {
            // EscapeHtml as a security precaution.
            str = _escapeHtml(str);
        }

        return str || { value: resourceId, empty: true };
    };

    function _getResourceContext() {
        if (document) {
            if (typeof (resourceContext) === 'undefined') {
                var context = Windows.ApplicationModel.Resources.Core.ResourceContext;
                if (context.getForCurrentView) {
                    resourceContext = context.getForCurrentView();
                } else {
                    resourceContext = null;
                }

            }
        }
        return resourceContext;
    };

    var getStringImpl = (Windows && Windows.ApplicationModel.Resources.Core.ResourceManager) ? _getStringWinRT : _getStringJS;

    var getString = function (resourceId) {

        return getStringImpl(resourceId);
    };

    function processAllImpl(rootElement, count) {
        rootElement = rootElement || _Global.document.body;

        var count = count || 0;

        if (count < 4) {
            // Only 3 depth is supported in the innerHTML
            if (count === 0) {
                if (rootElement.getAttribute) {
                    // Fragment-loaded root element isn't caught by querySelectorAll
                    var rootElementNode = rootElement.getAttribute('data-win-res');
                    if (rootElementNode) {
                        var decls = _OptionsParser.optionsParser(rootElementNode);
                        setMembers(rootElement, rootElement, decls, count);
                    }
                }
            }

            var selector = "[data-win-res],[data-win-control]";
            var elements = rootElement.querySelectorAll(selector);
            if (elements.length === 0) {
                return new Promise(function (c) { c(rootElement); });
            }

            for (var i = 0, len = elements.length; i < len; i++) {
                var e = elements[i];

                if (e.winControl && e.winControl.constructor && e.winControl.constructor.isDeclarativeControlContainer) {
                    var idcc = e.winControl.constructor.isDeclarativeControlContainer;
                    if (typeof idcc === "function") {
                        idcc(e.winControl, processAll);

                        // Skip all children of declarative control container
                        i += e.querySelectorAll(selector).length;
                    }
                }

                if (!e.hasAttribute("data-win-res")) {
                    continue;
                }
                // Use optionsParser that accept string format
                // {name="value", name2="value2"}
                //var decls = _OptionsParser.optionsParser(e.getAttribute('data-win-res'));
                var rawString = e.getAttribute('data-win-res');
                try {
                    var decls = JSON.parse(rawString);
                    setMembers(e, e, decls, count);
                } catch (ex) {}
            }

        }

        return new Promise(function (c) { c(rootElement); });
    }

    function setAttributes(root, descriptor) {
        var names = Object.keys(descriptor);

        for (var k = 0, l = names.length ; k < l; k++) {
            var name = names[k];
            var value = descriptor[name];

            var data = DevHome.Utilities.Resources.getString(value);

            if (!data || !data.empty) {
                root.setAttribute(name, data.value);

                if ((data.lang !== undefined) &&
                    (root.lang !== undefined) &&
                    (root.lang !== data.lang)) {

                    root.lang = data.lang;
                }
            } else if (_BaseUtils.validation) {
                notFound(value);
            }
        }
    }

    function notFound(name) {
        throw new Error("WinJS.Res.NotFound");
    }

    function setMembers(root, target, descriptor, count) {
        var names = Object.keys(descriptor);

        for (var k = 0, l = names.length ; k < l; k++) {
            var name = names[k];
            var value = descriptor[name];

            if (typeof value === "string") {
                var data = DevHome.Utilities.Resources.getString(value);

                if (!data || !data.empty) {

                    // targeted html unescape
                    if (name === 'textContent') {
                        data.value = String.prototype.replace.call(data.value, /&apos;/g, "'");
                    }

                    target[name] = data.value;

                    if ((data.lang !== undefined) &&
                        (root.lang !== undefined) &&
                        (root.lang !== data.lang)) {
                        // When lang property is different, we set the language with selected string's language
                        root.lang = data.lang;
                    }

                    if (name === "innerHTML") {
                        processAllImpl(target, count + 1);
                    }
                }
                //else if (_BaseUtils.validation) {
                //    notFound(value);
                //}
            } else if (root === target && name === "attributes") {
                //Exposing setAttribute for attributes that don't have HTML properties, like aria, through a fake 'attributes' property
                setAttributes(root, value);
            } else {
                setMembers(root, target[name], value, count);
            }
        }
    }

    function processAll(rootElement) {
        return processAllImpl(rootElement);
    }

    window.DevHome = window.DevHome || {};
    DevHome.Utilities = DevHome.Utilities || {};
    DevHome.Utilities.Resources = {
        getString: getString,
        _formatString: _formatString,
        processAll: processAll
    };
})();

(function keysInit() {
    "use strict";

    var Key = {
        backspace: 8,
        enter: 13,
        ctrl: 17,
        alt: 18,
        escape: 27,
        space: 32,
        pageUp: 33,
        pageDown: 34,
        home: 36,
        leftArrow: 37,
        upArrow: 38,
        rightArrow: 39,
        downArrow: 40,
        menu: 93,
        NavigationView: 136,
        NavigationMenu: 137,
        NavigationUp: 138,
        NavigationDown: 139,
        NavigationLeft: 140,
        NavigationRight: 141,
        NavigationAccept: 142,
        NavigationCancel: 143,
        GamepadA: 195,
        GamepadB: 196,
        GamepadX: 197,
        GamepadY: 198,
        GamepadRightShoulder: 199,
        GamepadLeftShoulder: 200,
        GamepadLeftTrigger: 201,
        GamepadRightTrigger: 202,
        GamepadDPadUp: 203,
        GamepadDPadDown: 204,
        GamepadDPadLeft: 205,
        GamepadDPadRight: 206,
        GamepadMenu: 207,
        GamepadView: 208,
        GamepadLeftThumbstick: 209,
        GamepadRightThumbstick: 210,
        GamepadLeftThumbstickUp: 211,
        GamepadLeftThumbstickDown: 212,
        GamepadLeftThumbstickRight: 213,
        GamepadLeftThumbstickLeft: 214,
        GamepadRightThumbstickUp: 215,
        GamepadRightThumbstickDown: 216,
        GamepadRightThumbstickRight: 217,
        GamepadRightThumbstickLeft: 218
    };

    window.DevHome = window.DevHome || {};
    DevHome.Utilities = DevHome.Utilities || {};
    DevHome.Utilities.Key = Key;
})();

(function () {
    "use strict";

    var CrossDomainMessageConstants = {
        messageDataProperty: "msWinJSXYFocusControlMessage",
        register: "register",
        unregister: "unregister",
        dFocusEnter: "dFocusEnter",
        dFocusExit: "dFocusExit"
    };
    var DirectionNames = {
        left: "left",
        right: "right",
        up: "up",
        down: "down"
    };
    var EventNames = {
        focusChanging: "focuschanging",
        focusChanged: "focuschanged"
    };
    var FocusableTagNames = [
        "A",
        "BUTTON",
        "IFRAME",
        "INPUT",
        "SELECT",
        "TEXTAREA",
        "X-MS-WEBVIEW"
    ];
    var FocusableSelectors = [];

    // These factors can be tweaked to adjust which elements are favored by the focus algorithm
    var ScoringConstants = {
        primaryAxisDistanceWeight: 30,
        secondaryAxisDistanceWeight: 20,
        percentInHistoryShadowWeight: 100000
    };

    /**
        * Gets the mapping object that maps keycodes to XYFocus actions.
    **/
    var _keyCodeMap = {
        left: [],
        right: [],
        up: [],
        down: [],
        accept: []
    };

    var _enabled = true;
    /**
        * Gets or sets the focus root when invoking XYFocus APIs.
    **/
    var _focusRoot;

    function _findNextFocusElement(direction, options) {
        var result = _findNextFocusElementInternal(direction, options);
        return result ? result.target : null;
    }
    function _moveFocus(direction, options) {
        var result = _findNextFocusElement(direction, options);
        if (result) {
            var previousFocusElement = document.activeElement;
            if (_trySetFocus(result, -1)) {
                eventSrc.dispatchEvent(EventNames.focusChanged, { previousFocusElement: previousFocusElement, keyCode: -1 });
                return result;
            }
        }
        return null;
    }
    function _mergeAll(list) {
        // Merge a list of objects together
        var o = {};
        list.forEach(function (part) {
            Object.keys(part).forEach(function (k) {
                o[k] = part[k];
            });
        });
        return o;
    };
    function _createEventProperty(name) {
        var eventPropStateName = "_on" + name + "state";

        return {
            get: function () {
                var state = this[eventPropStateName];
                return state && state.userHandler;
            },
            set: function (handler) {
                var state = this[eventPropStateName];
                if (handler) {
                    if (!state) {
                        state = { wrapper: function (evt) { return state.userHandler(evt); }, userHandler: handler };
                        Object.defineProperty(this, eventPropStateName, { value: state, enumerable: false, writable: true, configurable: true });
                        this.addEventListener(name, state.wrapper, false);
                    }
                    state.userHandler = handler;
                } else if (state) {
                    this.removeEventListener(name, state.wrapper, false);
                    this[eventPropStateName] = null;
                }
            },
            enumerable: true
        };
    };
    // Privates
    var _lastTarget;
    var _cachedLastTargetRect;
    var _historyRect;
    /**
        * Executes XYFocus algorithm with the given parameters. Returns true if focus was moved, false otherwise.
        * @param direction The direction to move focus.
        * @param keyCode The key code of the pressed key.
        * @param referenceRect (optional) A rectangle to use as the source coordinates for finding the next focusable element.
        * @param dontExit (optional) Indicates whether this focus request is allowed to propagate to its parent if we are in iframe.
    **/
    function _xyFocus(direction, keyCode, referenceRect, dontExit) {
        // If focus has moved since the last XYFocus movement, scrolling occurred, or an explicit
        // reference rectangle was given to us, then we invalidate the history rectangle.
        if (referenceRect || document.activeElement !== _lastTarget) {
            _historyRect = null;
            _lastTarget = null;
            _cachedLastTargetRect = null;
        }
        else if (_lastTarget && _cachedLastTargetRect) {
            var lastTargetRect = _toIRect(_lastTarget.getBoundingClientRect());
            // Sometimes the bounds calculation for top is off by 1 even though the element has not moved.
            if (lastTargetRect.left !== _cachedLastTargetRect.left || Math.abs(lastTargetRect.top - _cachedLastTargetRect.top) > 1) {
                _cachedLastTargetRect = lastTargetRect;
            }
        }
        var activeElement = document.activeElement;
        var lastTarget = _lastTarget;
        var result = _findNextFocusElementInternal(direction, {
            focusRoot: _focusRoot,
            historyRect: _historyRect,
            referenceElement: _lastTarget,
            referenceRect: referenceRect
        });
        if (result && _trySetFocus(result.target, keyCode)) {
            // A focus target was found
            updateHistoryRect(direction, result);
            _lastTarget = result.target;
            _cachedLastTargetRect = result.targetRect;
            if (result.target.tagName === "IFRAME") {
                var targetIframe = result.target;
                if (IFrameHelper.isXYFocusEnabled(targetIframe)) {
                    // If we successfully moved focus and the new focused item is an IFRAME, then we need to notify it
                    // Note on coordinates: When signaling enter, DO transform the coordinates into the child frame's coordinate system.
                    var refRect = _toIRect({
                        left: result.referenceRect.left - result.targetRect.left,
                        top: result.referenceRect.top - result.targetRect.top,
                        width: result.referenceRect.width,
                        height: result.referenceRect.height
                    });
                    var message = {};
                    message[CrossDomainMessageConstants.messageDataProperty] = {
                        type: CrossDomainMessageConstants.dFocusEnter,
                        direction: direction,
                        referenceRect: refRect
                    };
                    // postMessage API is safe even in cross-domain scenarios.
                    targetIframe.contentWindow.postMessage(message, targetIframe.contentWindow.origin);
                }
            }
            else if (typeof result.target.navigateFocus === "function") {
                // No need to adjust coordinate space of result.referenceRect. navigateFocus/departFocus and corresponding
                // events handle the coordinate space translation.
                result.target.navigateFocus(direction, WebViewHelper.refRectToNavigateFocusRect(result.referenceRect));
            }
            eventSrc.dispatchEvent(EventNames.focusChanged, { previousFocusElement: activeElement, keyCode: keyCode });
            return true;
        }
        else {
            // No focus target was found; if we are inside an IFRAME or webview and focus is allowed to propagate out, notify the parent that focus is exiting
            // Note on coordinates: When signaling exit, do NOT transform the coordinates into the parent's coordinate system.
            if ((!dontExit && top !== window) || typeof window.departFocus === "function") {
                var refRect = referenceRect;
                if (!refRect) {
                    refRect = document.activeElement ? _toIRect(document.activeElement.getBoundingClientRect()) : _defaultRect();
                }
                if (top === window && typeof window.departFocus === "function") {
                    departFocus(direction, WebViewHelper.refRectToNavigateFocusRect(refRect));
                }
                else {
                    var message = {};
                    message[CrossDomainMessageConstants.messageDataProperty] = {
                        type: CrossDomainMessageConstants.dFocusExit,
                        direction: direction,
                        referenceRect: refRect
                    };
                    // postMessage API is safe even in cross-domain scenarios.
                    parent.postMessage(message, parent.origin);
                }
                return true;
            }
        }
        return false;
        // Nested Helpers
        function updateHistoryRect(direction, result) {
            var newHistoryRect = _defaultRect();
            // It's possible to get into a situation where the target element has no overlap with the reference edge.
            //
            //..╔══════════════╗..........................
            //..║   reference  ║..........................
            //..╚══════════════╝..........................
            //.....................╔═══════════════════╗..
            //.....................║                   ║..
            //.....................║       target      ║..
            //.....................║                   ║..
            //.....................╚═══════════════════╝..
            //
            // If that is the case, we need to reset the coordinates to the edge of the target element.
            if (direction === DirectionNames.left || direction === DirectionNames.right) {
                newHistoryRect.top = Math.max(result.targetRect.top, result.referenceRect.top, _historyRect ? _historyRect.top : Number.MIN_VALUE);
                newHistoryRect.bottom = Math.min(result.targetRect.bottom, result.referenceRect.bottom, _historyRect ? _historyRect.bottom : Number.MAX_VALUE);
                if (newHistoryRect.bottom <= newHistoryRect.top) {
                    newHistoryRect.top = result.targetRect.top;
                    newHistoryRect.bottom = result.targetRect.bottom;
                }
                newHistoryRect.height = newHistoryRect.bottom - newHistoryRect.top;
                newHistoryRect.width = Number.MAX_VALUE;
                newHistoryRect.left = Number.MIN_VALUE;
                newHistoryRect.right = Number.MAX_VALUE;
            }
            else {
                newHistoryRect.left = Math.max(result.targetRect.left, result.referenceRect.left, _historyRect ? _historyRect.left : Number.MIN_VALUE);
                newHistoryRect.right = Math.min(result.targetRect.right, result.referenceRect.right, _historyRect ? _historyRect.right : Number.MAX_VALUE);
                if (newHistoryRect.right <= newHistoryRect.left) {
                    newHistoryRect.left = result.targetRect.left;
                    newHistoryRect.right = result.targetRect.right;
                }
                newHistoryRect.width = newHistoryRect.right - newHistoryRect.left;
                newHistoryRect.height = Number.MAX_VALUE;
                newHistoryRect.top = Number.MIN_VALUE;
                newHistoryRect.bottom = Number.MAX_VALUE;
            }
            _historyRect = newHistoryRect;
        }
    }
    function _findNextFocusElementInternal(direction, options) {
        options = options || {};
        options.focusRoot = options.focusRoot || _focusRoot || document.body;
        options.historyRect = options.historyRect || _defaultRect();
        var maxDistance = Math.max(window.screen.availHeight, window.screen.availWidth);
        var refObj = getReferenceObject(options.referenceElement, options.referenceRect);
        // Handle override
        var refElement = refObj.element;
        if (refElement) {
            var overrideSelector = refElement.getAttribute("data-tv-focus-" + direction);
            if (overrideSelector) {
                if (overrideSelector) {
                    var target;
                    var element = refObj.element;
                    while (!target && element) {
                        target = element.querySelector(overrideSelector);
                        element = element.parentElement;
                    }
                    if (target) {
                        if (target === document.activeElement) {
                            return null;
                        }
                        return { target: target, targetRect: _toIRect(target.getBoundingClientRect()), referenceRect: refObj.rect, usedOverride: true };
                    }
                }
            }
        }
        // Calculate scores for each element in the root
        var bestPotential = {
            element: null,
            rect: null,
            score: 0
        };
        var allElements = options.focusRoot.querySelectorAll("*");
        for (var i = 0, length = allElements.length; i < length; i++) {
            var potentialElement = allElements[i];
            if (refObj.element === potentialElement || !_isFocusable(potentialElement)) {
                continue;
            }
            var potentialRect = _toIRect(potentialElement.getBoundingClientRect());
            // Skip elements that have either a width of zero or a height of zero
            if (potentialRect.width === 0 || potentialRect.height === 0) {
                continue;
            }
            var score = calculateScore(direction, maxDistance, options.historyRect, refObj.rect, potentialRect);
            if (score > bestPotential.score) {
                bestPotential.element = potentialElement;
                bestPotential.rect = potentialRect;
                bestPotential.score = score;
            }
        }
        return bestPotential.element ? { target: bestPotential.element, targetRect: bestPotential.rect, referenceRect: refObj.rect, usedOverride: false } : null;
        // Nested Helpers
        function calculatePercentInShadow(minReferenceCoord, maxReferenceCoord, minPotentialCoord, maxPotentialCoord) {
            /// Calculates the percentage of the potential element that is in the shadow of the reference element.
            if ((minReferenceCoord >= maxPotentialCoord) || (maxReferenceCoord <= minPotentialCoord)) {
                // Potential is not in the reference's shadow.
                return 0;
            }
            var pixelOverlap = Math.min(maxReferenceCoord, maxPotentialCoord) - Math.max(minReferenceCoord, minPotentialCoord);
            var shortEdge = Math.min(maxPotentialCoord - minPotentialCoord, maxReferenceCoord - minReferenceCoord);
            return shortEdge === 0 ? 0 : (pixelOverlap / shortEdge);
        }
        function calculateScore(direction, maxDistance, historyRect, referenceRect, potentialRect) {
            var score = 0;
            var percentInShadow;
            var primaryAxisDistance;
            var secondaryAxisDistance = 0;
            var percentInHistoryShadow = 0;
            switch (direction) {
                case DirectionNames.left:
                    // Make sure we don't evaluate any potential elements to the right of the reference element
                    if (potentialRect.left >= referenceRect.left) {
                        break;
                    }
                    percentInShadow = calculatePercentInShadow(referenceRect.top, referenceRect.bottom, potentialRect.top, potentialRect.bottom);
                    primaryAxisDistance = referenceRect.left - potentialRect.right;
                    if (percentInShadow > 0) {
                        percentInHistoryShadow = calculatePercentInShadow(historyRect.top, historyRect.bottom, potentialRect.top, potentialRect.bottom);
                    }
                    else {
                        // If the potential element is not in the shadow, then we calculate secondary axis distance
                        secondaryAxisDistance = (referenceRect.bottom <= potentialRect.top) ? (potentialRect.top - referenceRect.bottom) : referenceRect.top - potentialRect.bottom;
                    }
                    break;
                case DirectionNames.right:
                    // Make sure we don't evaluate any potential elements to the left of the reference element
                    if (potentialRect.right <= referenceRect.right) {
                        break;
                    }
                    percentInShadow = calculatePercentInShadow(referenceRect.top, referenceRect.bottom, potentialRect.top, potentialRect.bottom);
                    primaryAxisDistance = potentialRect.left - referenceRect.right;
                    if (percentInShadow > 0) {
                        percentInHistoryShadow = calculatePercentInShadow(historyRect.top, historyRect.bottom, potentialRect.top, potentialRect.bottom);
                    }
                    else {
                        // If the potential element is not in the shadow, then we calculate secondary axis distance
                        secondaryAxisDistance = (referenceRect.bottom <= potentialRect.top) ? (potentialRect.top - referenceRect.bottom) : referenceRect.top - potentialRect.bottom;
                    }
                    break;
                case DirectionNames.up:
                    // Make sure we don't evaluate any potential elements below the reference element
                    if (potentialRect.top >= referenceRect.top) {
                        break;
                    }
                    percentInShadow = calculatePercentInShadow(referenceRect.left, referenceRect.right, potentialRect.left, potentialRect.right);
                    primaryAxisDistance = referenceRect.top - potentialRect.bottom;
                    if (percentInShadow > 0) {
                        percentInHistoryShadow = calculatePercentInShadow(historyRect.left, historyRect.right, potentialRect.left, potentialRect.right);
                    }
                    else {
                        // If the potential element is not in the shadow, then we calculate secondary axis distance
                        secondaryAxisDistance = (referenceRect.right <= potentialRect.left) ? (potentialRect.left - referenceRect.right) : referenceRect.left - potentialRect.right;
                    }
                    break;
                case DirectionNames.down:
                    // Make sure we don't evaluate any potential elements above the reference element
                    if (potentialRect.bottom <= referenceRect.bottom) {
                        break;
                    }
                    percentInShadow = calculatePercentInShadow(referenceRect.left, referenceRect.right, potentialRect.left, potentialRect.right);
                    primaryAxisDistance = potentialRect.top - referenceRect.bottom;
                    if (percentInShadow > 0) {
                        percentInHistoryShadow = calculatePercentInShadow(historyRect.left, historyRect.right, potentialRect.left, potentialRect.right);
                    }
                    else {
                        // If the potential element is not in the shadow, then we calculate secondary axis distance
                        secondaryAxisDistance = (referenceRect.right <= potentialRect.left) ? (potentialRect.left - referenceRect.right) : referenceRect.left - potentialRect.right;
                    }
                    break;
            }
            if (primaryAxisDistance >= 0) {
                // The score needs to be a positive number so we make these distances positive numbers
                primaryAxisDistance = maxDistance - primaryAxisDistance;
                secondaryAxisDistance = maxDistance - secondaryAxisDistance;
                if (primaryAxisDistance >= 0 && secondaryAxisDistance >= 0) {
                    // Potential elements in the shadow get a multiplier to their final score
                    primaryAxisDistance += primaryAxisDistance * percentInShadow;
                    score = primaryAxisDistance * ScoringConstants.primaryAxisDistanceWeight + secondaryAxisDistance * ScoringConstants.secondaryAxisDistanceWeight + percentInHistoryShadow * ScoringConstants.percentInHistoryShadowWeight;
                }
            }
            return score;
        }
        function getReferenceObject(referenceElement, referenceRect) {
            var refElement;
            var refRect;
            if ((!referenceElement && !referenceRect) || (referenceElement && !referenceElement.parentNode)) {
                // Note: We need to check to make sure 'parentNode' is not null otherwise there is a case
                // where _lastTarget is defined, but calling getBoundingClientRect will throw a native exception.
                // This case happens if the innerHTML of the parent of the _lastTarget is set to "".
                // If no valid reference is supplied, we'll use document.activeElement unless it's the body
                if (document.activeElement !== document.body) {
                    referenceElement = document.activeElement;
                }
            }
            if (referenceElement) {
                refElement = referenceElement;
                refRect = _toIRect(refElement.getBoundingClientRect());
            }
            else if (referenceRect) {
                refRect = _toIRect(referenceRect);
            }
            else {
                refRect = _defaultRect();
            }
            return {
                element: refElement,
                rect: refRect
            };
        }
    }
    function _defaultRect() {
        // We set the top, left, bottom and right properties of the referenceBoundingRectangle to '-1'
        // (as opposed to '0') because we want to make sure that even elements that are up to the edge
        // of the screen can receive focus.
        return {
            top: -1,
            bottom: -1,
            right: -1,
            left: -1,
            height: 0,
            width: 0
        };
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
    }
    function _trySetFocus(element, keyCode) {
        // We raise an event on the focusRoot before focus changes to give listeners
        // a chance to prevent the next focus target from receiving focus if they want.
        var canceled = eventSrc.dispatchEvent(EventNames.focusChanging, { nextFocusElement: element, keyCode: keyCode });
        if (!canceled) {
            element.focus();
        }
        return document.activeElement === element;
    }
    function _isFocusable(element) {
        var elementTagName = element.tagName;
        var tabIndex = parseInt(element.getAttribute("tabIndex"));
        if (FocusableTagNames.indexOf(elementTagName) === -1 && isNaN(tabIndex)) {
            // Loop through the selectors
            var matchesSelector = false;
            for (var i = 0, len = FocusableSelectors.length; i < len; i++) {
                if (_matchesSelector(element, FocusableSelectors[i])) {
                    if (isNaN(tabIndex)) {
                        element.setAttribute("tabIndex", 0);
                    }
                    matchesSelector = true;
                    break;
                }
            }
            // If the current potential element is not one of the tags we consider to be focusable, then exit
            if (!matchesSelector) {
                return false;
            }
        }
        if (elementTagName === "IFRAME" && !IFrameHelper.isXYFocusEnabled(element)) {
            // Skip IFRAMEs without compatible XYFocus implementation
            return false;
        }
        if (elementTagName === "DIV" && element["winControl"] && element["winControl"].disabled) {
            // Skip disabled WinJS controls
            return false;
        }

        var style = window.getComputedStyle(element);
        if (style && tabIndex === -1 || style.display === "none" || style.visibility === "hidden" || element.disabled) {
            // Skip elements that are hidden
            // Note: We don't check for opacity === 0, because the browser cannot tell us this value accurately.
            return false;
        }
        return true;
    };
    function _matchesSelector(element, selectorString) {
        var matchesSelector = element.matches
                || element.msMatchesSelector
                || element.mozMatchesSelector
                || element.webkitMatchesSelector;
        return matchesSelector.call(element, selectorString);
    };
    function _handleKeyDownEvent(e) {
        if (e.defaultPrevented) {
            return;
        }
        var direction = "";
        var keyCode = e.keyCode;
        if (_keyCodeMap.up.indexOf(keyCode) !== -1) {
            direction = "up";
        }
        else if (_keyCodeMap.down.indexOf(keyCode) !== -1) {
            direction = "down";
        }
        else if (_keyCodeMap.left.indexOf(keyCode) !== -1) {
            direction = "left";
        }
        else if (_keyCodeMap.right.indexOf(keyCode) !== -1) {
            direction = "right";
        }
        if (direction && _enabled) {
            var shouldPreventDefault = _xyFocus(direction, keyCode);
            if (shouldPreventDefault) {
                e.preventDefault();
            }
        }
    };
    function _handleKeyUpEvent(e) {
        if (e.defaultPrevented) {
            return;
        }
        if (_keyCodeMap.accept.indexOf(e.keyCode) !== -1) {
            e.srcElement.click();
        }
    };

    var WebViewHelper;
    (function (WebViewHelper) {
        function refRectToNavigateFocusRect(refRect) {
            return {
                originLeft: refRect.left,
                originTop: refRect.top,
                originWidth: refRect.width,
                originHeight: refRect.height
            };
        }
        WebViewHelper.refRectToNavigateFocusRect = refRectToNavigateFocusRect;

        function navigateFocusRectToRefRect(navigateFocusRect) {
            return _toIRect({
                left: navigateFocusRect.originLeft,
                top: navigateFocusRect.originTop,
                width: navigateFocusRect.originWidth,
                height: navigateFocusRect.originHeight
            });
        }
        WebViewHelper.navigateFocusRectToRefRect = navigateFocusRectToRefRect;
    })(WebViewHelper || (WebViewHelper = {}));

    var IFrameHelper;
    (function (IFrameHelper) {
        // XYFocus caches registered iframes and iterates over the cache for its focus navigation implementation.
        // However, since there is no reliable way for an iframe to unregister with its parent as it can be
        // spontaneously taken out of the DOM, the cache can go stale. This helper module makes sure that on
        // every query to the iframe cache, stale iframes are removed.
        // Furthermore, merely accessing an iframe that has been garbage collected by the platform will cause an
        // exception so each iteration during a query must be in a try/catch block.
        var iframes = [];
        function count() {
            // Iterating over it causes stale iframes to be cleared from the cache.
            _safeForEach(function () { return false; });
            return iframes.length;
        }
        IFrameHelper.count = count;
        function getIFrameFromWindow(win) {
            var iframes = document.querySelectorAll("IFRAME");
            var found = Array.prototype.filter.call(iframes, function (x) { return x.contentWindow === win; });
            return found.length ? found[0] : null;
        }
        IFrameHelper.getIFrameFromWindow = getIFrameFromWindow;
        function isXYFocusEnabled(iframe) {
            var found = false;
            _safeForEach(function (ifr) {
                if (ifr === iframe) {
                    found = true;
                }
            });
            return found;
        }
        IFrameHelper.isXYFocusEnabled = isXYFocusEnabled;
        function registerIFrame(iframe) {
            iframes.push(iframe);
        };
        IFrameHelper.registerIFrame = registerIFrame;
        function unregisterIFrame(iframe) {
            var index = -1;
            _safeForEach(function (ifr, i) {
                if (ifr === iframe) {
                    index = i;
                }
            });
            if (index !== -1) {
                iframes.splice(index, 1);
            }
        };
        IFrameHelper.unregisterIFrame = unregisterIFrame;
        function _safeForEach(callback) {
            for (var i = iframes.length - 1; i >= 0; i--) {
                try {
                    var iframe = iframes[i];
                    if (!iframe.contentWindow) {
                        iframes.splice(i, 1);
                    }
                    else {
                        callback(iframe, i);
                    }
                }
                catch (e) {
                    // Iframe has been GC'd
                    iframes.splice(i, 1);
                }
            }
        };
    })(IFrameHelper || (IFrameHelper = {}));

    // Default mappings
    _keyCodeMap.left.push(
        37, // LeftArrow
        214, // GamepadLeftThumbstickLeft
        205, // GamepadDPadLeft
        140); // NavigationLeft
    _keyCodeMap.right.push(
        39, // RightArrow
        213, // GamepadLeftThumbstickRight
        206, // GamepadDPadRight
        141); // NavigationRight
    _keyCodeMap.up.push(
        38, // UpArrow
        211, // GamepadLeftThumbstickUp
        203, // GamepadDPadUp
        138); // NavigationUp
    _keyCodeMap.down.push(
        40, // UpArrow
        212, // GamepadLeftThumbstickDown
        204, // GamepadDPadDown
        139); // NavigationDown
    _keyCodeMap.accept.push(
        142, // NavigationAccept
        195); // GamepadA
    window.addEventListener("message", function (e) {
        // Note: e.source is the Window object of an iframe which could be hosting content
        // from a different domain. No properties on e.source should be accessed or we may
        // run into a cross-domain access violation exception.
        var sourceWindow = null;
        try {
            // Since messages are async, by the time we get this message, the iframe could've
            // been removed from the DOM and e.source is null or throws an exception on access.
            sourceWindow = e.source;
            if (!sourceWindow) {
                return;
            }
        }
        catch (e) {
            return;
        }
        if (!e.data || !e.data[CrossDomainMessageConstants.messageDataProperty]) {
            return;
        }
        var data = e.data[CrossDomainMessageConstants.messageDataProperty];
        switch (data.type) {
            case CrossDomainMessageConstants.register:
                var iframe = IFrameHelper.getIFrameFromWindow(sourceWindow);
                iframe && IFrameHelper.registerIFrame(iframe);
                break;
            case CrossDomainMessageConstants.unregister:
                var iframe = IFrameHelper.getIFrameFromWindow(sourceWindow);
                iframe && IFrameHelper.unregisterIFrame(iframe);
                break;
            case CrossDomainMessageConstants.dFocusEnter:
                // The coordinates stored in data.refRect are already in this frame's coordinate system.
                // First try to focus anything within this iframe without leaving the current frame.
                var focused = _xyFocus(data.direction, -1, data.referenceRect, true);
                if (!focused) {
                    // No focusable element was found, we'll focus document.body if it is focusable.
                    if (_isFocusable(document.body)) {
                        document.body.focus();
                    }
                    else {
                        // Nothing within this iframe is focusable, we call _xyFocus again without a refRect
                        // and allow the request to propagate to the parent.
                        _xyFocus(data.direction, -1);
                    }
                }
                break;
            case CrossDomainMessageConstants.dFocusExit:
                var iframe = IFrameHelper.getIFrameFromWindow(sourceWindow);
                if (document.activeElement !== iframe) {
                    break;
                }
                // The coordinates stored in data.refRect are in the IFRAME's coordinate system,
                // so we must first transform them into this frame's coordinate system.
                var refRect = data.referenceRect;
                var iframeRect = iframe.getBoundingClientRect();
                refRect.left += iframeRect.left;
                refRect.top += iframeRect.top;
                if (typeof refRect.right === "number") {
                    refRect.right += iframeRect.left;
                }
                if (typeof refRect.bottom === "number") {
                    refRect.bottom += iframeRect.top;
                }
                _xyFocus(data.direction, -1, refRect);
                break;
        }
    });

    // Receiving departingFocus event in the app as a result of any child webview calling
    // window.departFocus from within the webview. Indicates focus transitioning into the app
    // from the webview. The navigatingfocus event handles transforming the 
    // coordinate space so we just pass the values along.
    document.addEventListener("departingfocus", function (eventArg) {
        var focusChanged = _xyfocus(
            eventArg.navigationReason,
            -1,
            WebViewHelper.navigateFocusRectToRefRect(eventArg));

        if (focusChanged && eventArg && (typeof eventArg.focus === "function")) {
            eventArg.focus();
        }
    });

    // Receiving a navigatingfocus event in the webview as a result of the host app calling
    // webview.navigateFocus on our containing webview element indicating focus transitioning
    // into the webview from the app. The navigatingfocus event handles transforming the 
    // coordinate space so we just pass the values along.
    window.addEventListener("navigatingfocus", function (eventArg) {
        var focusChanged = _xyfocus(
            eventArg.navigationReason,
            -1,
            WebViewHelper.navigateFocusRectToRefRect(eventArg));

        if (focusChanged && eventArg && (typeof eventArg.focus === "function")) {
            eventArg.focus();
        }
    });

    document.addEventListener("DOMContentLoaded", function () {
        // Subscribe on bubble phase to allow developers to override XYFocus behaviors for directional keys.
        document.addEventListener("keydown", _handleKeyDownEvent);
        document.addEventListener("keyup", _handleKeyUpEvent);
        // If we are running within an iframe, we send a registration message to the parent window
        if (window.top !== window.window) {
            var message = {};
            message[CrossDomainMessageConstants.messageDataProperty] = {
                type: CrossDomainMessageConstants.register,
                version: 1.0
            };
            window.parent.postMessage(message, window.parent.origin);
        }
    });

    var EventMixinEvent = (function () {
        function EventMixinEvent(type, detail, target) {
            this.detail = detail;
            this.target = target;
            this.timeStamp = Date.now();
            this.type = type;
            this.bubbles = { value: false, writable: false };
            this.cancelable = { value: false, writable: false };
            this.trusted = { value: false, writable: false };
            this.eventPhase = { value: 0, writable: false };
            this.supportedForProcessing = true;
        };
        Object.defineProperty(EventMixinEvent.prototype, "currentTarget", {
            get: function () { return this.target; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EventMixinEvent.prototype, "defaultPrevented", {
            get: function () { return this._preventDefaultCalled; },
            enumerable: true,
            configurable: true
        });
        EventMixinEvent.prototype.preventDefault = function () {
            this._preventDefaultCalled = true;
        };
        EventMixinEvent.prototype.stopImmediatePropagation = function () {
            this._stopImmediatePropagationCalled = true;
        };
        EventMixinEvent.prototype.stopPropagation = function () {
        };
        return EventMixinEvent;
    })();

    var eventMixin = {
        _listeners: null,

        addEventListener: function (type, listener, useCapture) {
            useCapture = useCapture || false;
            this._listeners = this._listeners || {};
            var eventListeners = (this._listeners[type] = this._listeners[type] || []);
            for (var i = 0, len = eventListeners.length; i < len; i++) {
                var l = eventListeners[i];
                if (l.useCapture === useCapture && l.listener === listener) {
                    return;
                }
            }
            eventListeners.push({ listener: listener, useCapture: useCapture });
        },
        dispatchEvent: function (type, details) {
            var listeners = this._listeners && this._listeners[type];
            if (listeners) {
                var eventValue = new EventMixinEvent(type, details, this);
                // Need to copy the array to protect against people unregistering while we are dispatching
                listeners = listeners.slice(0, listeners.length);
                for (var i = 0, len = listeners.length; i < len && !eventValue._stopImmediatePropagationCalled; i++) {
                    listeners[i].listener(eventValue);
                }
                return eventValue.defaultPrevented || false;
            }
            return false;
        },
        removeEventListener: function (type, listener, useCapture) {
            useCapture = useCapture || false;
            var listeners = this._listeners && this._listeners[type];
            if (listeners) {
                for (var i = 0, len = listeners.length; i < len; i++) {
                    var l = listeners[i];
                    if (l.listener === listener && l.useCapture === useCapture) {
                        listeners.splice(i, 1);
                        if (listeners.length === 0) {
                            delete this._listeners[type];
                        }
                        // Only want to remove one element for each call to removeEventListener
                        break;
                    }
                }
            }
        }
    };
    // Publish to namespace
    var toPublish = {
        findNextFocusElement: _findNextFocusElement,
        keyCodeMap: _keyCodeMap,
        focusableSelectors: FocusableSelectors,
        moveFocus: _moveFocus,
        onfocuschanged: _createEventProperty(EventNames.focusChanged),
        onfocuschanging: _createEventProperty(EventNames.focusChanging),
        _xyFocus: _xyFocus,
        _handleKeyDownEvent: _handleKeyDownEvent,
        _handleKeyUpEvent: _handleKeyUpEvent,
        _iframeHelper: IFrameHelper
    };
    toPublish = _mergeAll([toPublish, eventMixin]);
    toPublish["_listeners"] = {};
    var eventSrc = toPublish;
    window.TVJS = window.TVJS || {};
    TVJS.DirectionalNavigation = toPublish;
    Object.defineProperty(window.TVJS.DirectionalNavigation, "enabled", {
        get: function () {
            return _enabled;
        },
        set: function (value) {
            _enabled = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(window.TVJS.DirectionalNavigation, "focusRoot", {
        get: function () {
            return _focusRoot;
        },
        set: function (value) {
            _focusRoot = value;
        },
        enumerable: true,
        configurable: true
    });

    // The gamepadInputEmulation is a string property that exists in JavaScript UWAs and in WebViews in UWAs.
    // It won't exist in Win8.1 style apps or browsers.
    if (window.navigator && typeof window.navigator.gamepadInputEmulation === "string") {
        // We want the gamepad to provide gamepad VK keyboard events rather than moving a
        // mouse like cursor. Set to "keyboard", the gamepad will provide such keyboard events
        // and provide input to the DOM navigator.getGamepads API.
        window.navigator.gamepadInputEmulation = "keyboard";
    }
})();

(function () {
    "use strict";

    var EventMixinEvent = (function () {
        function EventMixinEvent(type, detail, target) {
            this.detail = detail;
            this.target = target;
            this.timeStamp = Date.now();
            this.type = type;
            this.bubbles = { value: false, writable: false };
            this.cancelable = { value: false, writable: false };
            this.trusted = { value: false, writable: false };
            this.eventPhase = { value: 0, writable: false };
            this.supportedForProcessing = true;
        };
        Object.defineProperty(EventMixinEvent.prototype, "currentTarget", {
            get: function () { return this.target; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EventMixinEvent.prototype, "defaultPrevented", {
            get: function () { return this._preventDefaultCalled; },
            enumerable: true,
            configurable: true
        });
        EventMixinEvent.prototype.preventDefault = function () {
            this._preventDefaultCalled = true;
        };
        EventMixinEvent.prototype.stopImmediatePropagation = function () {
            this._stopImmediatePropagationCalled = true;
        };
        EventMixinEvent.prototype.stopPropagation = function () {
        };
        return EventMixinEvent;
    })();

    var eventMixin = {
        _listeners: null,

        addEventListener: function (type, listener, useCapture) {
            /// <signature helpKeyword="WinJS.Utilities.eventMixin.addEventListener">
            /// <summary locid="WinJS.Utilities.eventMixin.addEventListener">
            /// Adds an event listener to the control.
            /// </summary>
            /// <param name="type" locid="WinJS.Utilities.eventMixin.addEventListener_p:type">
            /// The type (name) of the event.
            /// </param>
            /// <param name="listener" locid="WinJS.Utilities.eventMixin.addEventListener_p:listener">
            /// The listener to invoke when the event is raised.
            /// </param>
            /// <param name="useCapture" locid="WinJS.Utilities.eventMixin.addEventListener_p:useCapture">
            /// if true initiates capture, otherwise false.
            /// </param>
            /// </signature>
            useCapture = useCapture || false;
            this._listeners = this._listeners || {};
            var eventListeners = (this._listeners[type] = this._listeners[type] || []);
            for (var i = 0, len = eventListeners.length; i < len; i++) {
                var l = eventListeners[i];
                if (l.useCapture === useCapture && l.listener === listener) {
                    return;
                }
            }
            eventListeners.push({ listener: listener, useCapture: useCapture });
        },
        dispatchEvent: function (type, details) {
            /// <signature helpKeyword="WinJS.Utilities.eventMixin.dispatchEvent">
            /// <summary locid="WinJS.Utilities.eventMixin.dispatchEvent">
            /// Raises an event of the specified type and with the specified additional properties.
            /// </summary>
            /// <param name="type" locid="WinJS.Utilities.eventMixin.dispatchEvent_p:type">
            /// The type (name) of the event.
            /// </param>
            /// <param name="details" locid="WinJS.Utilities.eventMixin.dispatchEvent_p:details">
            /// The set of additional properties to be attached to the event object when the event is raised.
            /// </param>
            /// <returns type="Boolean" locid="WinJS.Utilities.eventMixin.dispatchEvent_returnValue">
            /// true if preventDefault was called on the event.
            /// </returns>
            /// </signature>
            var listeners = this._listeners && this._listeners[type];
            if (listeners) {
                var eventValue = new EventMixinEvent(type, details, this);
                // Need to copy the array to protect against people unregistering while we are dispatching
                listeners = listeners.slice(0, listeners.length);
                for (var i = 0, len = listeners.length; i < len && !eventValue._stopImmediatePropagationCalled; i++) {
                    listeners[i].listener(eventValue);
                }
                return eventValue.defaultPrevented || false;
            }
            return false;
        },
        removeEventListener: function (type, listener, useCapture) {
            /// <signature helpKeyword="WinJS.Utilities.eventMixin.removeEventListener">
            /// <summary locid="WinJS.Utilities.eventMixin.removeEventListener">
            /// Removes an event listener from the control.
            /// </summary>
            /// <param name="type" locid="WinJS.Utilities.eventMixin.removeEventListener_p:type">
            /// The type (name) of the event.
            /// </param>
            /// <param name="listener" locid="WinJS.Utilities.eventMixin.removeEventListener_p:listener">
            /// The listener to remove.
            /// </param>
            /// <param name="useCapture" locid="WinJS.Utilities.eventMixin.removeEventListener_p:useCapture">
            /// Specifies whether to initiate capture.
            /// </param>
            /// </signature>
            useCapture = useCapture || false;
            var listeners = this._listeners && this._listeners[type];
            if (listeners) {
                for (var i = 0, len = listeners.length; i < len; i++) {
                    var l = listeners[i];
                    if (l.listener === listener && l.useCapture === useCapture) {
                        listeners.splice(i, 1);
                        if (listeners.length === 0) {
                            delete this._listeners[type];
                        }
                        // Only want to remove one element for each call to removeEventListener
                        break;
                    }
                }
            }
        }
    };

    window.WinJS = window.WinJS || {};
    WinJS.Utilities = WinJS.Utilities || {};
    WinJS.Utilities.eventMixin = eventMixin;
})();

function initializeProperties(target, members, prefix) {
    var keys = Object.keys(members);
    var isArray = Array.isArray(target);
    var properties;
    var i, len;
    for (i = 0, len = keys.length; i < len; i++) {
        var key = keys[i];
        var enumerable = key.charCodeAt(0) !== /*_*/95;
        var member = members[key];
        if (member && typeof member === 'object') {
            if (member.value !== undefined || typeof member.get === 'function' || typeof member.set === 'function') {
                if (member.enumerable === undefined) {
                    member.enumerable = enumerable;
                }
                if (prefix && member.setName && typeof member.setName === 'function') {
                    member.setName(prefix + "." + key);
                }
                properties = properties || {};
                properties[key] = member;
                continue;
            }
        }
        if (!enumerable) {
            properties = properties || {};
            properties[key] = { value: member, enumerable: enumerable, configurable: true, writable: true };
            continue;
        }
        if (isArray) {
            target.forEach(function (target) {
                target[key] = member;
            });
        } else {
            target[key] = member;
        }
    }
    if (properties) {
        if (isArray) {
            target.forEach(function (target) {
                Object.defineProperties(target, properties);
            });
        } else {
            Object.defineProperties(target, properties);
        }
    }
};

function _mix(constructor) {
    /// <signature helpKeyword="WinJS.Class.mix">
    /// <summary locid="WinJS.Class.mix">
    /// Defines a class using the given constructor and the union of the set of instance members
    /// specified by all the mixin objects. The mixin parameter list is of variable length.
    /// </summary>
    /// <param name="constructor" locid="WinJS.Class.mix_p:constructor">
    /// A constructor function that is used to instantiate this class.
    /// </param>
    /// <returns type="Function" locid="WinJS.Class.mix_returnValue">
    /// The newly-defined class.
    /// </returns>
    /// </signature>
    constructor = constructor || function () { };
    var i, len;
    for (i = 1, len = arguments.length; i < len; i++) {
        initializeProperties(constructor.prototype, arguments[i]);
    }
    return constructor;
};

(function () {

    // not supported in WebWorker
    var forEach = function (arrayLikeValue, action) {
        for (var i = 0, l = arrayLikeValue.length; i < l; i++) {
            action(arrayLikeValue[i], i);
        }
    };
    var head = document.head || document.getElementsByTagName("head")[0];
    var scripts = {};
    var styles = {};
    var links = {};
    var initialized = false;
    var cacheStore = {};
    var uniqueId = 1;

    function addScript(scriptTag, fragmentHref, position, lastNonInlineScriptPromise) {
        // We synthesize a name for inline scripts because today we put the
        // inline scripts in the same processing pipeline as src scripts. If
        // we seperated inline scripts into their own logic, we could simplify
        // this somewhat.
        //
        var src = scriptTag.src;
        var inline = !src;
        if (inline) {
            src = fragmentHref + "script[" + position + "]";
        }
        src = src.toLowerCase();

        if (!(src in scripts)) {
            var promise = null;

            scripts[src] = true;
            var n = document.createElement("script");
            if (scriptTag.language) {
                n.setAttribute("language", "javascript");
            }
            n.setAttribute("type", scriptTag.type);
            n.setAttribute("async", "false");
            if (scriptTag.id) {
                n.setAttribute("id", scriptTag.id);
            }
            if (inline) {
                var text = scriptTag.text;
                promise = lastNonInlineScriptPromise.then(function () {
                    n.text = text;
                }).then(null, function () {
                    // eat error
                });
            } else {
                promise = new Promise(function (c) {
                    n.onload = n.onerror = function () {
                        c();
                    };

                    // Using scriptTag.src to maintain the original casing
                    n.setAttribute("src", scriptTag.src);
                });
            }
            head.appendChild(n);

            return {
                promise: promise,
                inline: inline,
            };
        }
    }

    function addStyle(styleTag, fragmentHref, position) {
        var src = (fragmentHref + "script[" + position + "]").toLowerCase();
        if (!(src in styles)) {
            styles[src] = true;
            head.appendChild(styleTag.cloneNode(true));
        }
    }

    function addLink(styleTag) {
        var src = styleTag.href.toLowerCase();
        if (!(src in links)) {
            links[src] = true;
            var n = styleTag.cloneNode(false);

            // Using scriptTag.href  to maintain the original casing
            n.href = styleTag.href;
            head.appendChild(n);
        }
    }

    function getStateRecord(href, removeFromCache) {
        if (typeof href === "string") {
            return loadFromCache(href, removeFromCache);
        } else {
            var state = {
                docfrag: _ElementUtilities.data(href).docFragment
            };
            if (!state.docfrag) {
                var fragment = document.createDocumentFragment();
                while (href.childNodes.length > 0) {
                    fragment.appendChild(href.childNodes[0]);
                }
                state.docfrag = _ElementUtilities.data(href).docFragment = fragment;
                href.setAttribute("data-win-hasfragment", "");
            }
            if (removeFromCache) {
                clearCache(href);
            }
            return new Promise(function (c) { c(state)});
        }
    }
    function createEntry(state, href) {
        return populateDocument(state, href).
            then(function () {
                if (state.document) {
                    return processDocument(href, state);
                } else {
                    return state;
                }
            }).
            then(function () {
                if (state.document) {
                    delete state.document;
                }
                return state;
            });
    }

    function loadFromCache(href, removeFromCache) {
        var fragmentId = href.toLowerCase();
        var state = cacheStore[fragmentId];

        if (state) {
            if (removeFromCache) {
                delete cacheStore[fragmentId];
            }
            if (state.promise) {
                return state.promise;
            } else {
                return new Promise(function (c) { c(state) });
            }
        } else {
            state = {};
            if (!removeFromCache) {
                cacheStore[fragmentId] = state;
            }
            var result = state.promise = createEntry(state, href);
            state.promise.then(function () { delete state.promise; });
            return result;
        }
    }

    function processDocument(href, state) {
        // Once the control's static state has been loaded in the temporary iframe,
        // this method spelunks the iframe's document to retrieve all relevant information. Also,
        // this performs any needed fixups on the DOM (like adjusting relative URLs).

        var cd = state.document;
        var b = cd.body;
        var sp = [];

        forEach(cd.querySelectorAll('link[rel="stylesheet"], link[type="text/css"]'), addLink);
        forEach(cd.getElementsByTagName('style'), function (e, i) { addStyle(e, href, i); });

        // In DOCMODE 11 IE moved to the standards based script loading behavior of
        // having out-of-line script elements which are dynamically added to the DOM
        // asynchronously load. This raises two problems for our fragment loader,
        //
        //  1) out-of-line scripts need to execute in order
        //
        //  2) so do in-line scripts.
        //
        // In order to mitigate this behavior we do two things:
        //
        //  A) We mark all scripts with the attribute async='false' which makes
        //     out-of-line scripts respect DOM append order for execution when they
        //     are eventually retrieved
        //
        //  B) We chain the setting of in-line script element's 'text' property
        //     on the completion of the previous out-of-line script's execution.
        //     This relies on the fact that the out-of-line script elements will
        //     synchronously run their onload handler immediately after executing
        //     thus assuring that the in-line script will run before the next
        //     trailing out-of-line script.
        //
        var lastNonInlineScriptPromise = new Promise(function (c) { c(); });
        forEach(cd.getElementsByTagName('script'), function (e, i) {
            var result = addScript(e, href, i, lastNonInlineScriptPromise);
            if (result) {
                if (!result.inline) {
                    lastNonInlineScriptPromise = result.promise;
                }
                sp.push(result.promise);
            }
        });

        forEach(b.getElementsByTagName('img'), function (e) { e.src = e.src; });
        forEach(b.getElementsByTagName('a'), function (e) {
            // for # only anchor tags, we don't update the href
            //
            if (e.href !== "") {
                var href = e.getAttribute("href");
                if (href && href[0] !== "#") {
                    e.href = e.href;
                }
            }
        });

        // strip inline scripts from the body, they got copied to the
        // host document with the rest of the scripts above...
        //
        var localScripts = b.getElementsByTagName("script");
        while (localScripts.length > 0) {
            var s = localScripts[0];
            s.parentNode.removeChild(s);
        }

        return Promise.all(sp).then(function () {
            // Create the docfrag which is just the body children
            //
            var fragment = document.createDocumentFragment();
            var imported = document.importNode(cd.body, true);
            while (imported.childNodes.length > 0) {
                fragment.appendChild(imported.childNodes[0]);
            }
            state.docfrag = fragment;

            return state;
        });
    }

    function initialize() {
        if (initialized) { return; }

        initialized = true;

        forEach(head.querySelectorAll("script"), function (e) {
            scripts[e.src.toLowerCase()] = true;
        });


        forEach(head.querySelectorAll('link[rel="stylesheet"], link[type="text/css"]'), function (e) {
            links[e.href.toLowerCase()] = true;
        });
    }

    function renderCopy(href, target) {
        /// <signature helpKeyword="WinJS.UI.Fragments.renderCopy">
        /// <summary locid="WinJS.UI.Fragments.renderCopy">
        /// Copies the contents of the specified URI into the specified element.
        /// </summary>
        /// <param name="href" type="String" locid="WinJS.UI.Fragments.renderCopy_p:href">
        /// The URI that contains the fragment to copy.
        /// </param>
        /// <param name="target" type="HTMLElement" optional="true" locid="WinJS.UI.Fragments.renderCopy_p:target">
        /// The element to which the fragment is appended.
        /// </param>
        /// <returns type="WinJS.Promise" locid="WinJS.UI.Fragments.renderCopy_returnValue">
        /// A promise that is fulfilled when the fragment has been loaded.
        /// If a target element is not specified, the copied fragment is the
        /// completed value.
        /// </returns>
        /// </signature>

        return renderImpl(href, target, true);
    }

    function renderImpl(href, target, copy) {
        initialize();
        return getStateRecord(href, !copy).then(function (state) {
            var frag = state.docfrag;
            if (copy) {
                frag = frag.cloneNode(true);
            }

            var child = frag.firstChild;
            while (child) {
                if (child.nodeType === 1 /*Element node*/) {
                    child.msParentSelectorScope = true;
                }
                child = child.nextSibling;
            }

            var retVal;
            if (target) {
                target.appendChild(frag);
                retVal = target;
            } else {
                retVal = frag;
            }
            return retVal;
        });
    }

    function render(href, target) {
        /// <signature helpKeyword="WinJS.UI.Fragments.render">
        /// <summary locid="WinJS.UI.Fragments.render">
        /// Copies the contents of the specified URI into the specified element.
        /// </summary>
        /// <param name='href' type='String' locid="WinJS.UI.Fragments.render_p:href">
        /// The URI that contains the fragment to copy.
        /// </param>
        /// <param name='target' type='HTMLElement' optional='true' locid="WinJS.UI.Fragments.render_p:target">
        /// The element to which the fragment is appended.
        /// </param>
        /// <returns type="WinJS.Promise" locid="WinJS.UI.Fragments.render_returnValue">
        /// A promise that is fulfilled when the fragment has been loaded.
        /// If a target element is not specified, the copied fragment is the
        /// completed value.
        /// </returns>
        /// </signature>

        return renderImpl(href, target, false);
    }

    function cache(href) {
        /// <signature helpKeyword="WinJS.UI.Fragments.cache">
        /// <summary locid="WinJS.UI.Fragments.cache">
        /// Starts loading the fragment at the specified location. The returned promise completes
        /// when the fragment is ready to be copied.
        /// </summary>
        /// <param name="href" type="String or DOMElement" locid="WinJS.UI.Fragments.cache_p:href">
        /// The URI that contains the fragment to be copied.
        /// </param>
        /// <returns type="WinJS.Promise" locid="WinJS.UI.Fragments.cache_returnValue">
        /// A promise that is fulfilled when the fragment has been prepared for copying.
        /// </returns>
        /// </signature>
        initialize();
        return getStateRecord(href).then(function (state) { return state.docfrag; });
    }

    function clearCache(href) {
        /// <signature helpKeyword="WinJS.UI.Fragments.clearCache">
        /// <summary locid="WinJS.UI.Fragments.clearCache">
        /// Removes any cached information about the specified fragment. This method does not unload any scripts
        /// or styles that are referenced by the fragment.
        /// </summary>
        /// <param name="href" type="String or DOMElement" locid="WinJS.UI.Fragments.clearCache_p:href">
        /// The URI that contains the fragment to be cleared. If no URI is provided, the entire contents of the cache are cleared.
        /// </param>
        /// </signature>

        if (!href) {
            cacheStore = {};
        } else if (typeof (href) === "string") {
            delete cacheStore[href.toLowerCase()];
        } else {
            delete _ElementUtilities.data(href).docFragment;
            href.removeAttribute("data-win-hasfragment");
        }
    }

    function populateDocument(state, href) {

        var htmlDoc = document.implementation.createHTMLDocument("frag");
        var base = htmlDoc.createElement("base");
        htmlDoc.head.appendChild(base);
        var anchor = htmlDoc.createElement("a");
        htmlDoc.body.appendChild(anchor);
        base.href = document.location.href; // Initialize base URL to primary document URL
        anchor.setAttribute("href", href); // Resolve the relative path to an absolute path
        base.href = anchor.href; // Update the base URL to be the resolved absolute path
        // 'anchor' is no longer needed at this point and will be removed by the innerHTML call
        state.document = htmlDoc;
        return getFragmentContents(href).then(function (text) {
            var parsedHTML = new DOMParser().parseFromString(text, "text/html");

            for (child of parsedHTML.documentElement.childNodes) {
                htmlDoc.documentElement.appendChild(child.cloneNode(true));
            }

            htmlDoc.body = parsedHTML.body;

            htmlDoc.head.appendChild(base);
        });
    }

    var getFragmentContents = getFragmentContentsXHR;
    function getFragmentContentsXHR(href) {
        return new Promise(function (c) {
            function reqListener(response) {
                c(this.responseText);
            }

            var oReq = new XMLHttpRequest();
            oReq.addEventListener("load", reqListener);
            oReq.open("GET", href);
            oReq.send();
        });

        //return WinJS.Utilities.xhr({ url: href }).then(function (req) {
        //    return req.responseText;
        //});
    }

    window.WinJS = window.WinJS || {};
    WinJS.UI = WinJS.UI || {};
    WinJS.UI.Fragments = {
        renderCopy: renderCopy,
        render: render,
        cache: cache,
        clearCache: clearCache,
        _cacheStore: { get: function () { return cacheStore; } },
        _getFragmentContents: {
            get: function () {
                return getFragmentContents;
            },
            set: function (value) {
                getFragmentContents = value;
            }
        }
    };

    WinJS.Class = WinJS.Class || {};
    WinJS.Class.mix = _mix;
})();

(function () {
    // Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
    function abs(uri) {
        var a = document.createElement("a");
        a.href = uri;
        return a.href;
    }
    var viewMap = {};

    function selfhost(uri) {
        return document.location.href.toLowerCase() === uri.toLowerCase();
    }

    var _mixin = {
        dispose: function () {
            /// <signature helpKeyword="WinJS.UI.Pages.dispose">
            /// <summary locid="WinJS.UI.Pages.dispose">
            /// Disposes this Page.
            /// </summary>
            /// </signature>
            if (this._disposed) {
                return;
            }

            this._disposed = true;
            _Dispose.disposeSubTree(this.element);
            this.element = null;
        },
        load: function (uri) {
            /// <signature helpKeyword="WinJS.UI.Pages._mixin.load">
            /// <summary locid="WinJS.UI.Pages._mixin.load">
            /// Creates a copy of the DOM elements from the specified URI.  In order for this override
            /// to be used, the page that contains the load override needs to be defined by calling
            /// WinJS.UI.Pages.define() before WinJS.UI.Pages.render() is called.
            /// </summary>
            /// <param name="uri" locid="WinJS.UI.Pages._mixin.load_p:uri">
            /// The URI from which to copy the DOM elements.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages._mixin.load_returnValue">
            /// A promise whose fulfilled value is the set of unparented DOM elements, if asynchronous processing is necessary. If not, returns nothing.
            /// </returns>
            /// </signature>
        },
        init: function (element, options) {
            /// <signature helpKeyword="WinJS.UI.Pages._mixin.init">
            /// <summary locid="WinJS.UI.Pages._mixin.init">
            /// Initializes the control before the content of the control is set.
            /// Use the processed method for any initialization that should be done after the content
            /// of the control has been set.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Pages._mixin.init_p:element">
            /// The DOM element that will contain all the content for the page.
            /// </param>
            /// <param name="options" locid="WinJS.UI.Pages._mixin.init_p:options">
            /// The options passed to the constructor of the page.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages._mixin.init_returnValue">
            /// A promise that is fulfilled when initialization is complete, if asynchronous processing is necessary. If not, returns nothing.
            /// </returns>
            /// </signature>
        },
        process: function (element, options) {
            /// <signature helpKeyword="WinJS.UI.Pages._mixin.process">
            /// <summary locid="WinJS.UI.Pages._mixin.process">
            /// Processes the unparented DOM elements returned by load.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Pages._mixin.process_p:element">
            /// The DOM element that will contain all the content for the page.
            /// </param>
            /// <param name="options" locid="WinJS.UI.Pages._mixin.process_p:options">
            /// The options that are to be passed to the constructor of the page.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages._mixin.process_returnValue">
            /// A promise that is fulfilled when processing is complete.
            /// </returns>
            /// </signature>
        },
        processed: function (element, options) {
            /// <signature helpKeyword="WinJS.UI.Pages._mixin.processed">
            /// <summary locid="WinJS.UI.Pages._mixin.processed">
            /// Initializes the control after the content of the control is set.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Pages._mixin.processed_p:element">
            /// The DOM element that will contain all the content for the page.
            /// </param>
            /// <param name="options" locid="WinJS.UI.Pages._mixin.processed_p:options">
            /// The options that are to be passed to the constructor of the page.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages._mixin.processed_returnValue">
            /// A promise that is fulfilled when initialization is complete, if asynchronous processing is necessary. If not, returns nothing.
            /// </returns>
            /// </signature>
        },
        render: function (element, options, loadResult) {
            /// <signature helpKeyword="WinJS.UI.Pages._mixin.render">
            /// <summary locid="WinJS.UI.Pages._mixin.render">
            /// Renders the control, typically by adding the elements specified in the loadResult parameter to the specified element.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Pages._mixin.render_p:element">
            /// The DOM element that will contain all the content for the page.
            /// </param>
            /// <param name="options" locid="WinJS.UI.Pages._mixin.render_p:options">
            /// The options passed into the constructor of the page.
            /// </param>
            /// <param name="loadResult" locid="WinJS.UI.Pages._mixin.render_p:loadResult">
            /// The elements returned from the load method.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages._mixin.render_returnValue">
            /// A promise that is fulfilled when rendering is complete, if asynchronous processing is necessary. If not, returns nothing.
            /// </returns>
            /// </signature>
        },
        ready: function (element, options) {
            /// <signature helpKeyword="WinJS.UI.Pages._mixin.ready">
            /// <summary locid="WinJS.UI.Pages._mixin.ready">
            /// Called after all initialization and rendering is complete. At this
            /// time the element is ready for use.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Pages._mixin.ready_p:element">
            /// The DOM element that contains all the content for the page.
            /// </param>
            /// <param name="options" locid="WinJS.UI.Pages._mixin.ready_p:options">
            /// The options passed into the constructor of the page
            /// </param>
            /// </signature>
        },
        error: function (err) {
            /// <signature helpKeyword="WinJS.UI.Pages._mixin.error">
            /// <summary locid="WinJS.UI.Pages._mixin.error">
            /// Called if any error occurs during the processing of the page.
            /// </summary>
            /// <param name="err" locid="WinJS.UI.Pages._mixin.error_p:err">
            /// The error that occurred.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages._mixin.error_returnValue">
            /// Nothing if the error was handled, or an error promise if the error was not handled.
            /// </returns>
            /// </signature>
            return Promise.wrapError(err);
        }
    };

    function Pages_define(uri, members) {
        /// <signature helpKeyword="WinJS.UI.Pages.define">
        /// <summary locid="WinJS.UI.Pages.define">
        /// Creates a new page control from the specified URI that contains the specified members.
        /// Multiple calls to this method for the same URI are allowed, and all members will be
        /// merged.
        /// </summary>
        /// <param name="uri" locid="WinJS.UI.Pages.define_p:uri">
        /// The URI for the content that defines the page.
        /// </param>
        /// <param name="members" locid="WinJS.UI.Pages.define_p:members">
        /// Additional members that the control will have.
        /// </param>
        /// <returns type="Function" locid="WinJS.UI.Pages.define_returnValue">
        /// A constructor function that creates the page.
        /// </returns>
        /// </signature>

        var base = get(uri);
        uri = abs(uri);

        if (!base) {
            var PageControl = (function () {
                // This needs to follow the WinJS.UI.processAll "async constructor"
                // pattern to interop nicely in the "Views.Control" use case.
                //
                function PageControl(element, options, complete, parentedPromise) {
                    var that = this;
                    this._disposed = false;
                    this.element = element = element || document.createElement("div");
                    element.classList.add("win-disposable");
                    element.msSourceLocation = uri;
                    this.uri = uri;
                    this.selfhost = selfhost(uri);
                    element.winControl = this;
                    element.classList.add("pagecontrol");
                    
                    var load = new Promise(function (c) { c(); }).
                        then(function Pages_load() {
                            return that.load(uri);
                        });

                    var renderCalled = load.then(function Pages_init(loadResult) {
                        //    return Promise.join({
                        //        loadResult: loadResult,
                        //        initResult: that.init(element, options)
                        //    });
                        //}).then(function Pages_render(result) {
                        return that.render(element, options, /*result.*/loadResult);
                    });

                    this.elementReady = renderCalled.then(function () { return element; });

                    this.renderComplete = renderCalled.
                        then(function Pages_process() {
                            //    return that.process(element, options);
                            //}).then(function Pages_processed() {
                            //    return that.processed(element, options);
                            //}).then(function () {
                            return that;
                        });

                    var callComplete = function () {
                        complete && complete(that);
                        //_WriteProfilerMark("WinJS.UI.Pages:createPage" + profilerMarkIdentifier + ",StopTM");
                    };

                    // promises guarantee order, so this will be called prior to ready path below
                    //
                    this.renderComplete.then(callComplete, callComplete);

                    this.readyComplete = this.renderComplete.then(function () {
                        return parentedPromise;
                    }).then(function Pages_ready() {
                        that.ready(element, options);
                        return that;
                    }).then(
                        null,
                        function Pages_error(err) {
                            return that.error(err);
                        }
                    );
                };
                PageControl.prototype.load = function (uri) {
                    /// <signature helpKeyword="WinJS.UI.Pages._mixin.load">
                    /// <summary locid="WinJS.UI.Pages._mixin.load">
                    /// Creates a copy of the DOM elements from the specified URI.  In order for this override
                    /// to be used, the page that contains the load override needs to be defined by calling
                    /// WinJS.UI.Pages.define() before WinJS.UI.Pages.render() is called.
                    /// </summary>
                    /// <param name="uri" locid="WinJS.UI.Pages._mixin.load_p:uri">
                    /// The URI from which to copy the DOM elements.
                    /// </param>
                    /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages._mixin.load_returnValue">
                    /// A promise whose fulfilled value is the set of unparented DOM elements, if asynchronous processing is necessary. If not, returns nothing.
                    /// </returns>
                    /// </signature>
                    if (!this.selfhost) {
                        return WinJS.UI.Fragments.renderCopy(_BasePage.abs(uri));
                    }
                };
                PageControl.prototype.process = function (element, options) {
                    /// <signature helpKeyword="WinJS.UI.Pages._mixin.process">
                    /// <summary locid="WinJS.UI.Pages._mixin.process">
                    /// Processes the unparented DOM elements returned by load.
                    /// </summary>
                    /// <param name="element" locid="WinJS.UI.Pages._mixin.process_p:element">
                    /// The DOM element that will contain all the content for the page.
                    /// </param>
                    /// <param name="options" locid="WinJS.UI.Pages._mixin.process_p:options">
                    /// The options that are to be passed to the constructor of the page.
                    /// </param>
                    /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages._mixin.process_returnValue">
                    /// A promise that is fulfilled when processing is complete.
                    /// </returns>
                    /// </signature>
                    return ControlProcessor.processAll(element);
                };
                PageControl.prototype.render = function (element, options, loadResult) {
                    /// <signature helpKeyword="WinJS.UI.Pages._mixin.render">
                    /// <summary locid="WinJS.UI.Pages._mixin.render">
                    /// Renders the control, typically by adding the elements specified in the loadResult parameter to the specified element.
                    /// </summary>
                    /// <param name="element" locid="WinJS.UI.Pages._mixin.render_p:element">
                    /// The DOM element that will contain all the content for the page.
                    /// </param>
                    /// <param name="options" locid="WinJS.UI.Pages._mixin.render_p:options">
                    /// The options passed into the constructor of the page.
                    /// </param>
                    /// <param name="loadResult" locid="WinJS.UI.Pages._mixin.render_p:loadResult">
                    /// The elements returned from the load method.
                    /// </param>
                    /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages._mixin.render_returnValue">
                    /// A promise that is fulfilled when rendering is complete, if asynchronous processing is necessary. If not, returns nothing.
                    /// </returns>
                    /// </signature>
                    if (!this.selfhost) {
                        element.appendChild(loadResult);
                    }
                    return element;
                };
                return PageControl;
            })();
            base = PageControl;
            //base = _Base.Class.mix(base, _Control.DOMEventMixin);
            viewMap[uri.toLowerCase()] = base;
        }

        // Lazily mix in the members, allowing for multiple definitions of "define" to augment
        // the shared definition of the member.
        //
        if (members) {
            base = _mix(base, members);
        }

        base.selfhost = selfhost(uri);

        return base;
    }

    function get(uri) {
        uri = abs(uri);
        return viewMap[uri.toLowerCase()];
    }

    function remove(uri) {
        uri = abs(uri);
        delete viewMap[uri.toLowerCase()];
    }

    window._BasePage = {
        abs: abs,
        define: Pages_define,
        get: get,
        remove: remove,
        viewMap: viewMap
    };
})();

(function () {
    var _mixin = {
        load: function (uri) {
            /// <signature helpKeyword="WinJS.UI.Pages._mixin.load">
            /// <summary locid="WinJS.UI.Pages._mixin.load">
            /// Creates a copy of the DOM elements from the specified URI.  In order for this override
            /// to be used, the page that contains the load override needs to be defined by calling
            /// WinJS.UI.Pages.define() before WinJS.UI.Pages.render() is called.
            /// </summary>
            /// <param name="uri" locid="WinJS.UI.Pages._mixin.load_p:uri">
            /// The URI from which to copy the DOM elements.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages._mixin.load_returnValue">
            /// A promise whose fulfilled value is the set of unparented DOM elements, if asynchronous processing is necessary. If not, returns nothing.
            /// </returns>
            /// </signature>
            if (!this.selfhost) {
                return WinJS.UI.Fragments.renderCopy(_BasePage.abs(uri));
            }
        },
        process: function (element, options) {
            /// <signature helpKeyword="WinJS.UI.Pages._mixin.process">
            /// <summary locid="WinJS.UI.Pages._mixin.process">
            /// Processes the unparented DOM elements returned by load.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Pages._mixin.process_p:element">
            /// The DOM element that will contain all the content for the page.
            /// </param>
            /// <param name="options" locid="WinJS.UI.Pages._mixin.process_p:options">
            /// The options that are to be passed to the constructor of the page.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages._mixin.process_returnValue">
            /// A promise that is fulfilled when processing is complete.
            /// </returns>
            /// </signature>
            return ControlProcessor.processAll(element);
        },
        render: function (element, options, loadResult) {
            /// <signature helpKeyword="WinJS.UI.Pages._mixin.render">
            /// <summary locid="WinJS.UI.Pages._mixin.render">
            /// Renders the control, typically by adding the elements specified in the loadResult parameter to the specified element.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Pages._mixin.render_p:element">
            /// The DOM element that will contain all the content for the page.
            /// </param>
            /// <param name="options" locid="WinJS.UI.Pages._mixin.render_p:options">
            /// The options passed into the constructor of the page.
            /// </param>
            /// <param name="loadResult" locid="WinJS.UI.Pages._mixin.render_p:loadResult">
            /// The elements returned from the load method.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages._mixin.render_returnValue">
            /// A promise that is fulfilled when rendering is complete, if asynchronous processing is necessary. If not, returns nothing.
            /// </returns>
            /// </signature>
            if (!this.selfhost) {
                element.appendChild(loadResult);
            }
            return element;
        }
    };

    function Pages_define(uri, members) {
        /// <signature helpKeyword="WinJS.UI.Pages.define">
        /// <summary locid="WinJS.UI.Pages.define">
        /// Creates a new page control from the specified URI that contains the specified members.
        /// Multiple calls to this method for the same URI are allowed, and all members will be
        /// merged.
        /// </summary>
        /// <param name="uri" locid="WinJS.UI.Pages.define_p:uri">
        /// The URI for the content that defines the page.
        /// </param>
        /// <param name="members" locid="WinJS.UI.Pages.define_p:members">
        /// Additional members that the control will have.
        /// </param>
        /// <returns type="Function" locid="WinJS.UI.Pages.define_returnValue">
        /// A constructor function that creates the page.
        /// </returns>
        /// </signature>

        var Page = _BasePage.get(uri);

        if (!Page) {
            Page = _BasePage.define(uri, _mixin);
        }

        if (members) {
            Page = _mix(Page, members);
        }

        if (Page.selfhost) {
            _BaseUtils.ready(function () {
                render(_BasePage.abs(uri), document.body);
            }, true);
        }

        return Page;
    }

    function get(uri) {
        /// <signature helpKeyword="WinJS.UI.Pages.get">
        /// <summary locid="WinJS.UI.Pages.get">
        /// Gets an already-defined page control for the specified URI, or creates a new one.
        /// </summary>
        /// <param name="uri" locid="WinJS.UI.Pages.get_p:uri">
        /// The URI for the content that defines the page.
        /// </param>
        /// <returns type="Function" locid="WinJS.UI.Pages.get_returnValue">
        /// A constructor function that creates the page.
        /// </returns>
        /// </signature>

        var ctor = _BasePage.get(uri);
        if (!ctor) {
            ctor = Pages_define(uri);
        }
        return ctor;
    }

    function _remove(uri) {
        Fragments.clearCache(_BasePage.abs(uri));
        _BasePage.remove(uri);
    }

    function render(uri, element, options, parentedPromise) {
        /// <signature helpKeyword="WinJS.UI.Pages.render">
        /// <summary locid="WinJS.UI.Pages.render">
        /// Creates a page control from the specified URI inside
        /// the specified element with the specified options.
        /// </summary>
        /// <param name="uri" locid="WinJS.UI.Pages.render_p:uri">
        /// The URI for the content that defines the page.
        /// </param>
        /// <param name="element" isOptional="true" locid="WinJS.UI.Pages.render_p:element">
        /// The element to populate with the page.
        /// </param>
        /// <param name="options" isOptional="true" locid="WinJS.UI.Pages.render_p:options">
        /// The options for configuring the page.
        /// </param>
        /// <param name="parentedPromise" isOptional="true" locid="WinJS.UI.Pages.render_p:parentedPromise">
        /// A promise that is fulfilled when the specified element is parented to the final document.
        /// </param>
        /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages.render_returnValue">
        /// A promise that is fulfilled when the page is done rendering
        /// </returns>
        /// </signature>
        var Ctor = get(uri);
        var control = new Ctor(element, options, null, parentedPromise);
        return control.renderComplete.then(null, function (err) {
            return Promise.wrapError({
                error: err,
                page: control
            });
        });
    }

    window.WinJS = window.WinJS || {};
    WinJS.UI = WinJS.UI || {};
    WinJS.UI.Pages = {
        define: Pages_define,
        get: get,
        _remove: _remove,
        render: render,
        _viewMap: _BasePage.viewMap
    };
})();