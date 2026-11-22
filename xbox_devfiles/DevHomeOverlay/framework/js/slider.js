// Slider Control  

(function sliderInit(global, undefined) {

    "use strict";

    // Slider
    var Slider = (function () {
        // Namespace shortcuts

        function Slider(element) {
            element = element || document.createElement("div");
            element.winControl = this;
            element.tabIndex = 0;
            element.classList.add("xbox-slider");
            element.classList.add("win-focusable");
            element.classList.add("win-disposable");

            // Private fields.  
            this._disposed = false;
            this._element = element;
            this._min = 0;
            this._max = 100;
            this._step = -1;
            this._value = 0;

            this._controlsKeyupInputHandler = null;
            this._currentTimeIndicator = null;

            this._keydownInputHandler = null;
            this._keyupInputHandler = null;
            this._markers = [];
            this._fill = null;
            this._fillContainer = null;
            this._relativeTimelineStartOffset = 0;
            this._sliderBar = null;
            this._currentValue = null;
            this._startOffsetX = 0;
            this._totalSeekBarWidth = 0;

            // This is the innerHTML that gets rendered when the Slider is instantiated.
            var divSliderContainer = document.createElement("div");
            divSliderContainer.classList.add("xbox-slider-container");

            var divSliderWell = document.createElement("div");
            divSliderWell.classList.add("xbox-slider-well");
            var divSliderFillContainer = document.createElement("div");
            divSliderFillContainer.classList.add("xbox-slider-fillcontainer");

            var divSliderBar = document.createElement("div");
            divSliderBar.classList.add("xbox-slider-bar");

            var divSliderFill = document.createElement("div");
            divSliderFill.classList.add("xbox-slider-fill", "xbdh-accentcolor-background");
            var divSliderCurrentValue = document.createElement("div");
            divSliderCurrentValue.classList.add("xbox-slider-currentvalue");

            var divSliderCurrentValueBar = document.createElement("div");
            divSliderCurrentValueBar.classList.add("xbox-slider-currentvalue-bar");
            var divSliderCurrentValueArrow = document.createElement("div");
            divSliderCurrentValueArrow.classList.add("xbox-slider-currentvalue-arrow");

            // Append the elements to form the correct structure
            divSliderCurrentValue.appendChild(divSliderCurrentValueBar);
            divSliderCurrentValue.appendChild(divSliderCurrentValueArrow);

            divSliderBar.appendChild(divSliderFill);
            divSliderBar.appendChild(divSliderCurrentValue);

            divSliderFillContainer.appendChild(divSliderBar);

            divSliderWell.appendChild(divSliderFillContainer);

            divSliderContainer.appendChild(divSliderWell);

            this._sliderHtml = divSliderContainer;

            this._keydownInputHandler = function handleKeyDownInput(ev) {
                switch (ev.key) {
                    case "Left":
                    case "GamepadDPadLeft":
                    case "GamepadLeftThumbstickLeft":
                        if (this._step !== -1) {
                            this.value -= this._step;
                        } else {
                            this.value -= this._total / 100;
                        }
                        break;
                    case "Right":
                    case "GamepadDPadRight":
                    case "GamepadLeftThumbstickRight":
                        if (this._step !== -1) {
                            this.value += this._step;
                        } else {
                            this.value += this._total / 100;
                        }
                        break;
                    default:
                        // No-op  
                        break;
                }
            }.bind(this);

            this._updateDomElements();
            this._updateTotal();
        };
        Object.defineProperty(Slider.prototype, "element", {
            get: function () {
                return this._element;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Slider.prototype, "min", {
            get: function () {
                return this._min;
            },
            set: function (value) {
                Math.floor(value);
                if (value < 0) {
                    value = 0;
                }
                this._min = value;
                this._updateTotal();
                this._updateSlider();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Slider.prototype, "max", {
            get: function () {
                return this._max;
            },
            set: function (value) {
                Math.floor(value);
                if (value < 0) {
                    value = 0;
                }

                this._max = value;
                this._updateTotal();
                this._updateSlider();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Slider.prototype, "step", {
            get: function () {
                return this._step;
            },
            set: function (value) {
                Math.floor(value);
                if (value < 0) {
                    value = 0;
                }

                this._step = value;
                this._updateSteps();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Slider.prototype, "value", {
            get: function () {
                return this._value;
            },
            set: function (value) {
                Math.floor(value);
                if (value < this._min) {
                    value = this._min;
                } else if (value > this._max) {
                    value = this._max;
                } else {
                    value = Math.round(value / this._step) * this._step;
                }

                this._value = value;
                this._updateSlider();

                // Fire change event  
                var dispatchedEvent = document.createEvent("Event");
                dispatchedEvent.initEvent("change", true, true);
                this._element.dispatchEvent(dispatchedEvent);
            },
            enumerable: true,
            configurable: true
        });
        // Methods
        Slider.prototype._updateTotal = function () {
            this._total = this._max - this._min;
        };
        Slider.prototype._updateSteps = function () {
            // Remove existing markers from the timeline  
            if (this._sliderBar.parentNode) {
                var oldMarkers = this._sliderBar.parentNode.querySelectorAll(".xbox-slider-step");
                var oldMarkersLength = oldMarkers.length;
                for (var i = 0; i < oldMarkersLength; i++) {
                    oldMarkers[i].parentNode.removeChild(oldMarkers[i]);
                }
            }

            // Add markers to the timeline  
            // Note: We add one additional step, because there are markers at the beginning & end.  
            var numberOfSteps = (this._total / this._step) + 1;
            for (var i = 0; i < numberOfSteps; i++) {
                // Create a DOM element for each marker  
                var marker = document.createElement("div");
                marker.classList.add("xbox-slider-step");
                var percentageTime = (this._step * i) / this._total;
                var currentTimeLeftOffset = percentageTime * this._totalSeekBarWidth;
                marker.style.transform = "translateX(" + currentTimeLeftOffset + "px)";
                if (this._sliderBar.parentNode) {
                    this._sliderBar.parentNode.insertBefore(marker, this._sliderBar);
                }
            }
        };
        // Get references to the DOM elements & attach event listeners  
        Slider.prototype._updateDomElements = function () {
            this._element.appendChild(this._sliderHtml);

            // Get references to all the UI elements
            this._fill = this._element.querySelector(".xbox-slider-fill");
            this._fillContainer = this._element.querySelector(".xbox-slider-fillcontainer");
            this._sliderBar = this._element.querySelector(".xbox-slider-bar");
            this._currentValue = this._element.querySelector(".xbox-slider-currentvalue");
            this._totalSeekBarWidth = this._sliderBar.clientWidth;

            // Hook up controller key handler  
            this._element.addEventListener("keydown", this._keydownInputHandler, false);

            DevHome.Utilities.Resources.processAll(this._element);
        };
        Slider.prototype._updateSlider = function () {
            this._currentValue.style.transform = "translateX(" + (this._value / this._total) * this._totalSeekBarWidth + "px)";
            this._fill.style.width = (this._value / this._total) * this._totalSeekBarWidth + "px";
        };
        Slider.prototype.dispose = function () {
            if (this._disposed) {
                return;
            }
            this._disposed = true;
        };
        return Slider;
    })();
    DevHome.UI = DevHome.UI || {};
    DevHome.UI.Slider = Slider;
}(this));