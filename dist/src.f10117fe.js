// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"src/index.ts":[function(require,module,exports) {
"use strict";

var Flowy = /** @class */function () {
  function Flowy(canvas, grab, release, snapping, rearrange, spacingX, spacingY) {
    if (grab === void 0) {
      grab = function grab() {};
    }
    if (release === void 0) {
      release = function release() {};
    }
    if (snapping === void 0) {
      snapping = function snapping() {
        return true;
      };
    }
    if (rearrange === void 0) {
      rearrange = function rearrange() {
        return false;
      };
    }
    if (spacingX === void 0) {
      spacingX = 20;
    }
    if (spacingY === void 0) {
      spacingY = 80;
    }
    this.loaded = false;
    this.blocks = [];
    this.tempBlocks = [];
    this.absX = 0;
    this.absY = 0;
    this.active = false;
    this.offsetleft = 0;
    this.dragblock = false;
    this.prevblock = 0;
    this.grab = function (block) {};
    this.release = function () {};
    this.snapping = function (drag, first, parent) {
      return true;
    };
    this.rearrange = function (drag, parent) {
      return false;
    };
    this.canvasDiv = canvas;
    this.paddingX = spacingX;
    this.paddingY = spacingY;
    this.grab = grab;
    this.release = release;
    this.snapping = snapping;
    this.rearrange = rearrange;
    var canvasPosition = window.getComputedStyle(this.canvasDiv).position;
    if (canvasPosition === "absolute" || canvasPosition === "fixed") {
      this.absX = this.canvasDiv.getBoundingClientRect().left;
      this.absY = this.canvasDiv.getBoundingClientRect().top;
    }
    // polyfill for the Element.closest method
    if (!Element.prototype.closest) {
      Element.prototype.closest = function (s) {
        var el = this;
        do {
          if (Element.prototype.matches.call(el, s)) return el;
          el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === 1);
        return null;
      };
    }
    this.el = document.createElement("DIV");
    this.el.classList.add("indicator");
    this.el.classList.add("invisible");
    this.canvasDiv.appendChild(this.el);
  }
  Flowy.prototype.import = function (output) {
    this.canvasDiv.innerHTML = output.html;
    for (var i = 0; i < output.blockarr.length; i++) {
      this.blocks.push({
        childwidth: output.blockarr[i].childwidth,
        parent: output.blockarr[i].parent,
        id: output.blockarr[i].id,
        x: output.blockarr[i].x,
        y: output.blockarr[i].y,
        width: output.blockarr[i].width,
        height: output.blockarr[i].height
      });
    }
    if (this.blocks.length > 1) {
      this.rearrangeMe();
      this.checkOffset();
    }
  };
  Flowy.prototype.output = function () {
    var _a;
    var canvasHTML = this.canvasDiv.innerHTML;
    var outputData = {
      html: canvasHTML,
      blockarr: this.blocks,
      blocks: []
    };
    if (this.blocks.length > 0) {
      var _loop_1 = function _loop_1(i) {
        var blockOutput = {
          id: this_1.blocks[i].id,
          parent: this_1.blocks[i].parent,
          data: [],
          attr: []
        };
        outputData.blocks.push(blockOutput);
        var blockParent = (_a = document.querySelector(".blockid[value='".concat(this_1.blocks[i].id, "']"))) === null || _a === void 0 ? void 0 : _a.parentElement;
        if (blockParent) {
          blockParent.querySelectorAll("input").forEach(function (block) {
            var json_name = block.getAttribute("name");
            var json_value = block.value;
            blockOutput.data.push({
              name: json_name || "",
              value: json_value
            });
          });
          blockOutput.attr = Array.from(blockParent.attributes).map(function (attribute) {
            var _a;
            return _a = {}, _a[attribute.name] = attribute.value, _a;
          });
        }
      };
      var this_1 = this;
      for (var i = 0; i < this.blocks.length; i++) {
        _loop_1(i);
      }
    }
    return outputData;
  };
  Flowy.prototype.deleteBlocks = function () {
    this.blocks = [];
    this.canvasDiv.innerHTML = "<div class='indicator invisible'></div>";
  };
  Flowy.prototype.blockGrabbed = function (block) {
    this.grab(block);
  };
  Flowy.prototype.beginDrag = function (event) {
    var _a;
    var canvasPosition = window.getComputedStyle(this.canvasDiv).position;
    if (canvasPosition === "absolute" || canvasPosition === "fixed") {
      this.absX = this.canvasDiv.getBoundingClientRect().left;
      this.absY = this.canvasDiv.getBoundingClientRect().top;
    }
    var isTouchEvent = ("targetTouches" in event);
    var clientX = isTouchEvent ? event.changedTouches[0].clientX : event.clientX;
    var clientY = isTouchEvent ? event.changedTouches[0].clientY : event.clientY;
    var targetElement = event.target.closest(".create-flowy");
    if (event instanceof MouseEvent && event.button === 2) return;
    if (!targetElement) return;
    this.original = targetElement;
    var newNode = targetElement.cloneNode(true);
    targetElement.classList.add("dragnow");
    newNode.classList.add("block");
    newNode.classList.remove("create-flowy");
    var blockId = this.blocks.length === 0 ? 0 : Math.max.apply(Math, this.blocks.map(function (block) {
      return block.id;
    })) + 1;
    newNode.innerHTML += "<input type='hidden' name='blockid' class='blockid' value='".concat(blockId, "'>");
    document.body.appendChild(newNode);
    this.drag = (_a = document.querySelector(".blockid[value='".concat(blockId, "']"))) === null || _a === void 0 ? void 0 : _a.parentNode;
    this.blockGrabbed(targetElement);
    this.drag.classList.add("dragging");
    this.active = true;
    this.dragX = clientX - targetElement.getBoundingClientRect().left;
    this.dragY = clientY - targetElement.getBoundingClientRect().top;
    this.drag.style.left = "".concat(clientX - this.dragX, "px");
    this.drag.style.top = "".concat(clientY - this.dragY, "px");
  };
  Flowy.prototype.endDrag = function (event) {
    var _a, _b, _c, _d, _e, _f;
    if (event.button === 2 && (this.active || this.rearrange)) {
      this.dragblock = false;
      this.blockReleased();
      var indicator = document.querySelector(".indicator");
      if (indicator && !indicator.classList.contains("invisible")) {
        indicator.classList.add("invisible");
      }
      if (this.active) {
        (_a = this.original) === null || _a === void 0 ? void 0 : _a.classList.remove("dragnow");
        (_b = this.drag) === null || _b === void 0 ? void 0 : _b.classList.remove("dragging");
      }
      var blockInputElement = (_c = this.drag) === null || _c === void 0 ? void 0 : _c.querySelector(".blockid");
      var blockId = parseInt((_d = blockInputElement === null || blockInputElement === void 0 ? void 0 : blockInputElement.value) !== null && _d !== void 0 ? _d : "0");
      if (blockId === 0 && this.rearrange) {
        this.firstBlock("rearrange");
      } else if (this.active && this.blocks.length === 0 && this.drag && this.drag.getBoundingClientRect().top + window.scrollY > this.canvasDiv.getBoundingClientRect().top + window.scrollY && this.drag.getBoundingClientRect().left + window.scrollX > this.canvasDiv.getBoundingClientRect().left + window.scrollX) {
        this.firstBlock("drop");
      } else if (this.active && this.blocks.length === 0) {
        this.removeSelection();
      } else if (this.active) {
        var blockIds = this.blocks.map(function (a) {
          return a.id;
        });
        for (var i = 0; i < this.blocks.length; i++) {
          if (this.checkAttach(blockIds[i])) {
            this.active = false;
            var blockElement = document.querySelector(".blockid[value='".concat(blockIds[i], "']"));
            var parentNode = blockElement === null || blockElement === void 0 ? void 0 : blockElement.parentNode;
            if (this.drag && this.blockSnap(this.drag, false, parentNode)) {
              this.snap(this.drag, i, blockIds);
            } else {
              this.active = false;
              this.removeSelection();
            }
            break;
          } else if (i === this.blocks.length - 1) {
            this.active = false;
            this.removeSelection();
          }
        }
      } else if (this.rearrange) {
        var blockIds_1 = this.blocks.map(function (a) {
          return a.id;
        });
        var _loop_2 = function _loop_2(i) {
          if (this_2.checkAttach(blockIds_1[i])) {
            this_2.active = false;
            (_e = this_2.drag) === null || _e === void 0 ? void 0 : _e.classList.remove("dragging");
            if (this_2.drag) this_2.snap(this_2.drag, i, blockIds_1);
            return "break";
          } else if (i === this_2.blocks.length - 1) {
            if (this_2.drag && this_2.beforeDelete(this_2.drag, this_2.blocks.filter(function (id) {
              return id.id === blockIds_1[i];
            })[0])) {
              this_2.active = false;
              (_f = this_2.drag) === null || _f === void 0 ? void 0 : _f.classList.remove("dragging");
              this_2.snap(this_2.drag, blockIds_1.indexOf(this_2.prevblock), blockIds_1);
              return "break";
            } else {
              this_2.rearrange = function () {
                return false;
              };
              this_2.tempBlocks = [];
              this_2.active = false;
              this_2.removeSelection();
              return "break";
            }
          }
        };
        var this_2 = this;
        for (var i = 0; i < this.blocks.length; i++) {
          var state_1 = _loop_2(i);
          if (state_1 === "break") break;
        }
      }
    }
  };
  Flowy.prototype.checkAttach = function (id) {
    if (!this.drag) return false;
    var xpos = this.drag.getBoundingClientRect().left + window.scrollX + parseInt(window.getComputedStyle(this.drag).width) / 2 + this.canvasDiv.scrollLeft - this.canvasDiv.getBoundingClientRect().left;
    var ypos = this.drag.getBoundingClientRect().top + window.scrollY + this.canvasDiv.scrollTop - this.canvasDiv.getBoundingClientRect().top;
    var block = this.blocks.filter(function (a) {
      return a.id === id;
    })[0];
    if (xpos >= block.x - block.width / 2 - this.paddingX && xpos <= block.x + block.width / 2 + this.paddingX && ypos >= block.y - block.height / 2 && ypos <= block.y + block.height) {
      return true;
    } else {
      return false;
    }
  };
  Flowy.prototype.removeSelection = function () {
    var _a;
    var indicator = document.querySelector(".indicator");
    if (indicator instanceof Node) {
      this.canvasDiv.appendChild(indicator);
    }
    if (this.drag) (_a = this.drag.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(this.drag);
  };
  Flowy.prototype.firstBlock = function (type) {
    if (type === "drop" && this.drag) {
      this.blockSnap(this.drag, true, null);
      this.active = false;
      var dragTop = this.drag.getBoundingClientRect().top + window.scrollY;
      var windowHeight = this.absY + window.scrollY;
      var scrollTop = this.canvasDiv.scrollTop;
      this.drag.style.top = "".concat(dragTop - windowHeight + scrollTop, "px");
      var dragLeft = this.drag.getBoundingClientRect().left + window.scrollX;
      var windowWidth = this.absX + window.scrollX;
      var scrollLeft = this.canvasDiv.scrollLeft;
      this.drag.style.left = "".concat(dragLeft - windowWidth + scrollLeft, "px");
      this.canvasDiv.appendChild(this.drag);
      var blockIdInput = this.drag.querySelector(".blockid");
      var id = blockIdInput ? parseInt(blockIdInput.value) : -1;
      var width = parseInt(window.getComputedStyle(this.drag).width);
      var height = parseInt(window.getComputedStyle(this.drag).height);
      this.blocks.push({
        parent: -1,
        childwidth: 0,
        id: id,
        x: dragLeft + width / 2 + scrollLeft - this.canvasDiv.getBoundingClientRect().left,
        y: dragTop + height / 2 + scrollTop - this.canvasDiv.getBoundingClientRect().top,
        width: width,
        height: height
      });
    } else if (type === "rearrange" && this.drag) {
      this.drag.classList.remove("dragging");
      this.rearrange = function () {
        return false;
      };
      var blockIdElement = this.drag.querySelector(".blockid");
      var blockId = blockIdElement ? parseInt(blockIdElement.value) : NaN;
      for (var _i = 0, _a = this.tempBlocks; _i < _a.length; _i++) {
        var tempBlock = _a[_i];
        if (tempBlock.id !== blockId) {
          var blockIdValue = tempBlock.id;
          var blockElement = document.querySelector(".blockid[value='".concat(blockIdValue, "']"));
          var blockParent = blockElement ? blockElement.parentNode : null;
          if (blockParent) {
            var blockParentLeft = blockParent ? blockParent.getBoundingClientRect().left + this.canvasDiv.scrollLeft - this.absX - 1 : 0;
            blockParent.style.left = "".concat(blockParentLeft, "px");
            var blockParentTop = blockParent ? blockParent.getBoundingClientRect().top + this.canvasDiv.scrollTop - this.absY - 1 : 0;
            blockParent.style.top = "".concat(blockParentTop, "px");
            this.canvasDiv.appendChild(blockParent);
            tempBlock.x = blockParentLeft + blockParent.offsetWidth / 2 + this.canvasDiv.scrollLeft - this.canvasDiv.getBoundingClientRect().left - 1;
            tempBlock.y = blockParentTop + blockParent.offsetHeight / 2 + this.canvasDiv.scrollTop - this.canvasDiv.getBoundingClientRect().top - 1;
          }
          var arrowElement = document.querySelector(".arrowid[value='".concat(blockIdValue, "']"));
          var arrowParent = arrowElement ? arrowElement.parentNode : null;
          if (arrowParent) {
            var arrowParentLeft = arrowParent ? arrowParent.getBoundingClientRect().left + this.canvasDiv.scrollLeft - this.absX - 1 : 0;
            arrowParent.style.left = "".concat(arrowParentLeft, "px");
            var arrowParentTop = arrowParent ? arrowParent.getBoundingClientRect().top + this.canvasDiv.scrollTop - this.absY - 1 : 0;
            arrowParent.style.top = "".concat(arrowParentTop, "px");
            this.canvasDiv.appendChild(arrowParent);
          }
        }
      }
      this.tempBlocks.filter(function (a) {
        return a.id == 0;
      })[0].x = this.drag.getBoundingClientRect().left + window.scrollX + parseInt(window.getComputedStyle(this.drag).width) / 2 + this.canvasDiv.scrollLeft - this.canvasDiv.getBoundingClientRect().left;
      this.tempBlocks.filter(function (a) {
        return a.id == 0;
      })[0].y = this.drag.getBoundingClientRect().top + window.scrollY + parseInt(window.getComputedStyle(this.drag).height) / 2 + this.canvasDiv.scrollTop - this.canvasDiv.getBoundingClientRect().top;
      this.blocks = this.blocks.concat(this.tempBlocks);
      this.tempBlocks = [];
    }
  };
  Flowy.prototype.drawArrow = function (arrow, x, y, id) {
    if (x < 0) {
      this.canvasDiv.innerHTML += "<div class=\"arrowblock\"><input type=\"hidden\" class=\"arrowid\" value=\"".concat(this.drag.querySelector(".blockid").value, "\"><svg preserveaspectratio=\"none\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M").concat(this.blocks.filter(function (a) {
        return a.id == id;
      })[0].x - arrow.x + 5, " 0L").concat(this.blocks.filter(function (a) {
        return a.id == id;
      })[0].x - arrow.x + 5, " ").concat(this.paddingY / 2, "L5 ").concat(this.paddingY / 2, "L5 ").concat(y, "\" stroke=\"#C5CCD0\" stroke-width=\"2px\"/><path d=\"M0 ").concat(y - 5, "H10L5 ").concat(y, "L0 ").concat(y - 5, "Z\" fill=\"#C5CCD0\"/></svg></div>");
      document.querySelector(".arrowid[value=\"".concat(this.drag.querySelector(".blockid").value, "\"]")).parentNode.style.left = arrow.x - 5 - (this.absX + window.scrollX) + this.canvasDiv.scrollLeft + this.canvasDiv.getBoundingClientRect().left + "px";
    } else {
      this.canvasDiv.innerHTML += "<div class=\"arrowblock\"><input type=\"hidden\" class=\"arrowid\" value=\"".concat(this.drag.querySelector(".blockid").value, "\"><svg preserveaspectratio=\"none\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M20 0L20 ").concat(this.paddingY / 2, "L").concat(x, " ").concat(this.paddingY / 2, "L").concat(x, " ").concat(y, "\" stroke=\"#C5CCD0\" stroke-width=\"2px\"/><path d=\"M").concat(x - 5, " ").concat(y - 5, "H").concat(x + 5, "L").concat(x, " ").concat(y, "L").concat(x - 5, " ").concat(y - 5, "Z\" fill=\"#C5CCD0\"/></svg></div>");
      document.querySelector(".arrowid[value=\"".concat(parseInt(this.drag.querySelector(".blockid").value), "\"]")).parentNode.style.left = this.blocks.filter(function (a) {
        return a.id == id;
      })[0].x - 20 - (this.absX + window.scrollX) + this.canvasDiv.scrollLeft + this.canvasDiv.getBoundingClientRect().left + "px";
    }
    document.querySelector(".arrowid[value=\"".concat(parseInt(this.drag.querySelector(".blockid").value), "\"]")).parentNode.style.top = this.blocks.filter(function (a) {
      return a.id == id;
    })[0].y + this.blocks.filter(function (a) {
      return a.id == id;
    })[0].height / 2 + this.canvasDiv.getBoundingClientRect().top - this.absY + "px";
  };
  Flowy.prototype.updateArrow = function (arrow, x, y, children) {
    if (x < 0) {
      document.querySelector(".arrowid[value=\"".concat(children.id, "\"]")).parentNode.style.left = arrow.x - 5 - (this.absX + window.scrollX) + this.canvasDiv.getBoundingClientRect().left + "px";
      document.querySelector(".arrowid[value=\"".concat(children.id, "\"]")).parentNode.innerHTML = "<input type=\"hidden\" class=\"arrowid\" value=\"".concat(children.id, "\"><svg preserveaspectratio=\"none\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M").concat(this.blocks.filter(function (id) {
        return id.id == children.parent;
      })[0].x - arrow.x + 5, " 0L").concat(this.blocks.filter(function (id) {
        return id.id == children.parent;
      })[0].x - arrow.x + 5, " ").concat(this.paddingY / 2, "L5 ").concat(this.paddingY / 2, "L5 ").concat(y, "\" stroke=\"#C5CCD0\" stroke-width=\"2px\"/><path d=\"M0 ").concat(y - 5, "H10L5 ").concat(y, "L0 ").concat(y - 5, "Z\" fill=\"#C5CCD0\"/></svg>");
    } else {
      document.querySelector(".arrowid[value=\"".concat(children.id, "\"]")).parentNode.style.left = this.blocks.filter(function (id) {
        return id.id == children.parent;
      })[0].x - 20 - (this.absX + window.scrollX) + this.canvasDiv.getBoundingClientRect().left + "px";
      document.querySelector(".arrowid[value=\"".concat(children.id, "\"]")).parentNode.innerHTML = "<input type=\"hidden\" class=\"arrowid\" value=\"".concat(children.id, "\"><svg preserveaspectratio=\"none\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M20 0L20 ").concat(this.paddingY / 2, "L").concat(x, " ").concat(this.paddingY / 2, "L").concat(x, " ").concat(y, "\" stroke=\"#C5CCD0\" stroke-width=\"2px\"/><path d=\"M").concat(x - 5, " ").concat(y - 5, "H").concat(x + 5, "L").concat(x, " ").concat(y, "L").concat(x - 5, " ").concat(y - 5, "Z\" fill=\"#C5CCD0\"/></svg>");
    }
  };
  Flowy.prototype.snap = function (drag, i, blocko) {
    if (!this.rearrange) {
      this.canvasDiv.appendChild(drag);
    }
    var totalwidth = 0;
    var totalremove = 0;
    var maxheight = 0;
    var parentBlocks = this.blocks.filter(function (id) {
      return id.parent === blocko[i];
    });
    for (var w = 0; w < parentBlocks.length; w++) {
      var children = parentBlocks[w];
      if (children.childwidth > children.width) {
        totalwidth += children.childwidth + this.paddingX;
      } else {
        totalwidth += children.width + this.paddingX;
      }
    }
    totalwidth += parseInt(window.getComputedStyle(drag).width);
    for (var w = 0; w < parentBlocks.length; w++) {
      var children = parentBlocks[w];
      var grandparentBlock = this.blocks.filter(function (a) {
        return a.id === blocko[i];
      })[0];
      if (children.childwidth > children.width) {
        document.querySelector(".blockid[value='".concat(children.id, "']")).parentNode.style.left = grandparentBlock.x - totalwidth / 2 + totalremove + children.childwidth / 2 - children.width / 2 + "px";
        children.x = grandparentBlock.x - totalwidth / 2 + totalremove + children.childwidth / 2;
        totalremove += children.childwidth + this.paddingX;
      } else {
        document.querySelector(".blockid[value='".concat(children.id, "']")).parentNode.style.left = grandparentBlock.x - totalwidth / 2 + totalremove + "px";
        children.x = grandparentBlock.x - totalwidth / 2 + totalremove + children.width / 2;
        totalremove += children.width + this.paddingX;
      }
    }
    var targetBlock = this.blocks.filter(function (id) {
      return id.id === blocko[i];
    })[0];
    drag.style.left = targetBlock.x - totalwidth / 2 + totalremove - (window.scrollX + this.absX) + this.canvasDiv.scrollLeft + this.canvasDiv.getBoundingClientRect().left + "px";
    drag.style.top = targetBlock.y + targetBlock.height / 2 + this.paddingY - (window.scrollY + this.absY) + this.canvasDiv.getBoundingClientRect().top + "px";
    if (this.rearrange()) {
      var blockID_1 = parseInt(drag.querySelector(".blockid").value);
      var blockTemp = this.tempBlocks.filter(function (a) {
        return a.id === blockID_1;
      })[0];
      blockTemp.x = drag.getBoundingClientRect().left + window.scrollX + parseInt(window.getComputedStyle(drag).width) / 2 + this.canvasDiv.scrollLeft - this.canvasDiv.getBoundingClientRect().left;
      blockTemp.y = drag.getBoundingClientRect().top + window.scrollY + parseInt(window.getComputedStyle(drag).height) / 2 + this.canvasDiv.scrollTop - this.canvasDiv.getBoundingClientRect().top;
      blockTemp.parent = blocko[i];
      for (var w = 0; w < this.tempBlocks.length; w++) {
        if (this.tempBlocks[w].id !== blockID_1) {
          var blockParent = document.querySelector(".blockid[value='".concat(this.tempBlocks[w].id, "']")).parentNode;
          var arrowParent = document.querySelector(".arrowid[value='".concat(this.tempBlocks[w].id, "']")).parentNode;
          blockParent.style.left = blockParent.getBoundingClientRect().left + window.scrollX - (window.scrollX + canvas_div.getBoundingClientRect().left) + canvas_div.scrollLeft + "px";
          window.scrollX + this.canvasDiv.getBoundingClientRect().left;
          +this.canvasDiv.scrollLeft + "px";
          blockParent.style.top = blockParent.getBoundingClientRect().top + window.scrollY - (window.scrollY + this.canvasDiv.getBoundingClientRect().top) + this.canvasDiv.scrollTop + "px";
          arrowParent.style.left = arrowParent.getBoundingClientRect().left + window.scrollX - (window.scrollX + this.canvasDiv.getBoundingClientRect().left) + this.canvasDiv.scrollLeft + 20 + "px";
          arrowParent.style.top = arrowParent.getBoundingClientRect().top + window.scrollY - (window.scrollY + this.canvasDiv.getBoundingClientRect().top) + this.canvasDiv.scrollTop + "px";
          this.canvasDiv.appendChild(blockParent);
          this.canvasDiv.appendChild(arrowParent);
          this.tempBlocks[w].x = blockParent.getBoundingClientRect().left + window.scrollX + parseInt(window.getComputedStyle(blockParent).width) / 2 + this.canvasDiv.scrollLeft - this.canvasDiv.getBoundingClientRect().left;
          this.tempBlocks[w].y = blockParent.getBoundingClientRect().top + window.scrollY + parseInt(window.getComputedStyle(blockParent).height) / 2 + this.canvasDiv.scrollTop - this.canvasDiv.getBoundingClientRect().top;
        }
      }
      this.blocks = this.blocks.concat(this.tempBlocks);
      this.tempBlocks = [];
    } else {
      this.blocks.push({
        childwidth: 0,
        parent: blocko[i],
        id: parseInt(drag.querySelector(".blockid").value),
        x: drag.getBoundingClientRect().left + window.scrollX + parseInt(window.getComputedStyle(drag).width) / 2 + this.canvasDiv.scrollLeft - this.canvasDiv.getBoundingClientRect().left,
        y: drag.getBoundingClientRect().top + window.scrollY + parseInt(window.getComputedStyle(drag).height) / 2 + this.canvasDiv.scrollTop - this.canvasDiv.getBoundingClientRect().top,
        width: parseInt(window.getComputedStyle(drag).width),
        height: parseInt(window.getComputedStyle(drag).height)
      });
    }
    var arrowblock = this.blocks.filter(function (a) {
      return a.id === parseInt(drag.querySelector(".blockid").value);
    })[0];
    var arrowx = arrowblock.x - targetBlock.x + 20;
    var arrowy = this.paddingY;
    this.drawArrow(arrowblock, arrowx, arrowy, blocko[i]);
    if (targetBlock.parent !== -1) {
      var flag = false;
      var idval_1 = blocko[i];
      while (!flag) {
        if (this.blocks.filter(function (a) {
          return a.id === idval_1;
        })[0].parent === -1) {
          flag = true;
        } else {
          var zwidth = 0;
          var idvalBlocks = this.blocks.filter(function (id) {
            return id.parent === idval_1;
          });
          for (var w = 0; w < idvalBlocks.length; w++) {
            var children = idvalBlocks[w];
            if (children.childwidth > children.width) {
              if (w === idvalBlocks.length - 1) {
                zwidth += children.childwidth;
              } else {
                zwidth += children.childwidth + this.paddingX;
              }
            } else {
              if (w === idvalBlocks.length - 1) {
                zwidth += children.width;
              } else {
                zwidth += children.width + this.paddingX;
              }
            }
          }
          this.blocks.filter(function (a) {
            return a.id === idval_1;
          })[0].childwidth = zwidth;
          idval_1 = this.blocks.filter(function (a) {
            return a.id === idval_1;
          })[0].parent;
        }
      }
      this.blocks.filter(function (id) {
        return id.id === idval_1;
      })[0].childwidth = totalwidth;
    }
    if (this.rearrange) {
      this.rearrange = function () {
        return false;
      };
      drag.classList.remove("dragging");
    }
    this.rearrangeMe();
    this.checkOffset();
  };
  Flowy.prototype.touchblock = function (event) {
    var dragblock = false;
    var targetElement = event.target;
    if (hasParentClass(targetElement, "block")) {
      var theblock = targetElement.closest(".block");
      var mouse_x = void 0;
      var mouseY = void 0;
      if ('targetTouches' in event) {
        mouse_x = event.targetTouches[0].clientX;
        mouseY = event.targetTouches[0].clientY;
      } else {
        mouse_x = event.clientX;
        mouseY = event.clientY;
      }
      if (event.type !== "mouseup" && hasParentClass(targetElement, "block")) {
        if ('which' in event && event.which !== 3) {
          if (!active && !rearrange) {
            dragblock = true;
            drag = theblock;
            dragx = mouse_x - (drag.getBoundingClientRect().left + window.scrollX);
            dragy = mouseY - (drag.getBoundingClientRect().top + window.scrollY);
          }
        }
      }
    }
  };
  Flowy.prototype.hasParentClass = function (element, classname) {
    if (element.className) {
      if (element.className.split(' ').indexOf(classname) >= 0) return true;
    }
    return element.parentNode instanceof HTMLElement && this.hasParentClass(element.parentNode, classname);
  };
  Flowy.prototype.moveBlock = function (event) {
    var _this = this;
    var _a;
    var mouse_x;
    var mouseY;
    if ('targetTouches' in event) {
      mouse_x = event.targetTouches[0].clientX;
      mouseY = event.targetTouches[0].clientY;
    } else {
      mouse_x = event.clientX;
      mouseY = event.clientY;
    }
    if (this.dragblock) {
      this.rearrange = function () {
        return true;
      };
      (_a = this.drag) === null || _a === void 0 ? void 0 : _a.classList.add("dragging");
      var blockid_1 = parseInt(this.drag.querySelector(".blockid").value);
      var prevblock = this.blocks.filter(function (a) {
        return a.id === blockid_1;
      })[0].parent;
      this.tempBlocks.push(this.blocks.filter(function (a) {
        return a.id === blockid_1;
      })[0]);
      this.blocks = this.blocks.filter(function (e) {
        return e.id !== blockid_1;
      });
      if (blockid_1 !== 0) {
        document.querySelector(".arrowid[value='" + blockid_1 + "']").parentNode.remove();
      }
      var layer_1 = this.blocks.filter(function (a) {
        return a.parent === blockid_1;
      });
      var flag = false;
      var foundids_1 = [];
      var allids = [];
      while (!flag) {
        var _loop_3 = function _loop_3(i) {
          if (layer_1[i] !== blockid_1) {
            this_3.tempBlocks.push(this_3.blocks.filter(function (a) {
              return a.id === layer_1[i].id;
            })[0]);
            var blockParent = document.querySelector(".blockid[value='" + layer_1[i].id + "']").parentNode;
            var arrowParent = document.querySelector(".arrowid[value='" + layer_1[i].id + "']").parentNode;
            blockParent.style.left = "".concat(blockParent.getBoundingClientRect().left + window.scrollX - (this_3.drag.getBoundingClientRect().left + window.scrollX), "px");
            blockParent.style.top = "".concat(blockParent.getBoundingClientRect().top + window.scrollY - (this_3.drag.getBoundingClientRect().top + window.scrollY), "px");
            arrowParent.style.left = "".concat(arrowParent.getBoundingClientRect().left + window.scrollX - (this_3.drag.getBoundingClientRect().left + window.scrollX), "px");
            arrowParent.style.top = "".concat(arrowParent.getBoundingClientRect().top + window.scrollY - (this_3.drag.getBoundingClientRect().top + window.scrollY), "px");
            this_3.drag.appendChild(blockParent);
            this_3.drag.appendChild(arrowParent);
            foundids_1.push(layer_1[i].id);
            allids.push(layer_1[i].id);
          }
        };
        var this_3 = this;
        for (var i = 0; i < layer_1.length; i++) {
          _loop_3(i);
        }
        if (foundids_1.length === 0) {
          flag = true;
        } else {
          layer_1 = this.blocks.filter(function (a) {
            return foundids_1.includes(a.parent);
          });
          foundids_1 = [];
        }
      }
      var _loop_4 = function _loop_4(i) {
        var blocknumber = this_4.blocks.filter(function (a) {
          return a.parent === blockid_1;
        })[i];
        this_4.blocks = this_4.blocks.filter(function (e) {
          return e.id !== blocknumber;
        });
      };
      var this_4 = this;
      for (var i = 0; i < this.blocks.filter(function (a) {
        return a.parent === blockid_1;
      }).length; i++) {
        _loop_4(i);
      }
      var _loop_5 = function _loop_5(i) {
        var blocknumber = allids[i];
        this_5.blocks = this_5.blocks.filter(function (e) {
          return e.id !== blocknumber;
        });
      };
      var this_5 = this;
      for (var i = 0; i < allids.length; i++) {
        _loop_5(i);
      }
      if (this.blocks.length > 1) {
        this.rearrangeMe();
      }
      this.dragblock = false;
    }
    if (this.active) {
      this.drag.style.left = "".concat(mouse_x - this.dragX, "px");
      this.drag.style.top = "".concat(mouseY - this.dragY, "px");
    } else if (this.rearrange) {
      this.drag.style.left = "".concat(mouse_x - this.dragX - (window.scrollX + this.absX) + this.canvasDiv.scrollLeft, "px");
      this.drag.style.top = "".concat(mouseY - this.dragY - (window.scrollY + this.absY) + this.canvasDiv.scrollTop, "px");
      this.tempBlocks.filter(function (a) {
        return a.id === parseInt(_this.drag.querySelector(".blockid").value);
      }).x = this.drag.getBoundingClientRect().left + window.scrollX + parseInt(window.getComputedStyle(this.drag).width) / 2 + this.canvasDiv.scrollLeft;
      this.tempBlocks.filter(function (a) {
        return a.id === parseInt(_this.drag.querySelector(".blockid").value);
      }).y = this.drag.getBoundingClientRect().top + window.scrollY + parseInt(window.getComputedStyle(this.drag).height) / 2 + this.canvasDiv.scrollTop;
    }
    if (this.active || this.rearrange) {
      if (this.active) {
        this.drag.style.left = "".concat(this.mouseX - this.dragX, "px");
        this.drag.style.top = "".concat(this.mouseY - this.dragY, "px");
      } else if (this.rearrange) {
        this.drag.style.left = "".concat(this.mouseX - this.dragX - (window.scrollX + this.absX) + this.canvasDiv.scrollLeft, "px");
        this.drag.style.top = "".concat(this.mouseY - this.dragY - (window.scrollY + this.absY) + this.canvasDiv.scrollTop, "px");
        this.tempBlocks.filter(function (a) {
          return a.id === parseInt(_this.drag.querySelector(".blockid").value);
        }).x = this.drag.getBoundingClientRect().left + window.scrollX + parseInt(window.getComputedStyle(this.drag).width) / 2 + this.canvasDiv.scrollLeft;
        this.tempBlocks.filter(function (a) {
          return a.id === parseInt(_this.drag.querySelector(".blockid").value);
        }).y = this.drag.getBoundingClientRect().top + window.scrollY + parseInt(window.getComputedStyle(this.drag).height) / 2 + this.canvasDiv.scrollTop;
      }
      if (this.mouseX > this.canvasDiv.getBoundingClientRect().width + this.canvasDiv.getBoundingClientRect().left - 10 && this.mouseX < this.canvasDiv.getBoundingClientRect().width + this.canvasDiv.getBoundingClientRect().left + 10) {
        this.canvasDiv.scrollLeft += 10;
      } else if (this.mouseX < this.canvasDiv.getBoundingClientRect().left + 10 && this.mouseX > this.canvasDiv.getBoundingClientRect().left - 10) {
        this.canvasDiv.scrollLeft -= 10;
      } else if (this.mouseY > this.canvasDiv.getBoundingClientRect().height + this.canvasDiv.getBoundingClientRect().top - 10 && this.mouseY < this.canvasDiv.getBoundingClientRect().height + this.canvasDiv.getBoundingClientRect().top + 10) {
        this.canvasDiv.scrollTop += 10;
      } else if (this.mouseY < this.canvasDiv.getBoundingClientRect().top + 10 && this.mouseY > this.canvasDiv.getBoundingClientRect().top - 10) {
        this.canvasDiv.scrollLeft -= 10;
      }
      var xpos = this.drag.getBoundingClientRect().left + window.scrollX + parseInt(window.getComputedStyle(this.drag).width) / 2 + this.canvasDiv.scrollLeft - this.canvasDiv.getBoundingClientRect().left;
      var ypos = this.drag.getBoundingClientRect().top + window.scrollY + this.canvasDiv.scrollTop - this.canvasDiv.getBoundingClientRect().top;
      var blocko = this.blocks.map(function (a) {
        return a.id;
      });
      for (var i = 0; i < this.blocks.length; i++) {
        if (this.checkAttach(blocko[i])) {
          document.querySelector(".blockid[value='" + blocko[i] + "']").parentNode.appendChild(document.querySelector(".indicator"));
          document.querySelector(".indicator").style.left = "".concat(document.querySelector(".blockid[value='" + blocko[i] + "']").parentNode.offsetWidth / 2 - 5, "px");
          document.querySelector(".indicator").style.top = "".concat(document.querySelector(".blockid[value='" + blocko[i] + "']").parentNode.offsetHeight, "px");
          document.querySelector(".indicator").classList.remove("invisible");
          break;
        } else if (i === this.blocks.length - 1) {
          if (!document.querySelector(".indicator").classList.contains("invisible")) {
            document.querySelector(".indicator").classList.add("invisible");
          }
        }
      }
    }
  };
  Flowy.prototype.checkOffset = function () {
    var _this = this;
    var offsetleftX = this.blocks.map(function (a) {
      return a.x;
    });
    var widths = this.blocks.map(function (a) {
      return a.width;
    });
    var mathmin = offsetleftX.map(function (item, index) {
      return item - widths[index] / 2;
    });
    var offsetleft = Math.min.apply(Math, mathmin);
    if (offsetleft < this.canvasDiv.getBoundingClientRect().left + window.scrollX - this.absX) {
      var blocko_1 = this.blocks.map(function (a) {
        return a.id;
      });
      var _loop_6 = function _loop_6(w) {
        document.querySelector(".blockid[value='" + this_6.blocks.filter(function (a) {
          return a.id === blocko_1[w];
        })[0].id + "']").parentNode.style.left = "".concat(this_6.blocks.filter(function (a) {
          return a.id === blocko_1[w];
        })[0].x - this_6.blocks.filter(function (a) {
          return a.id === blocko_1[w];
        })[0].width / 2 - offsetleft + this_6.canvasDiv.getBoundingClientRect().left - this_6.absX + 20, "px");
        if (this_6.blocks.filter(function (a) {
          return a.id === blocko_1[w];
        })[0].parent !== -1) {
          var arrowblock = this_6.blocks.filter(function (a) {
            return a.id === blocko_1[w];
          })[0];
          var arrowx = arrowblock.x - this_6.blocks.filter(function (a) {
            return a.id === _this.blocks.filter(function (a) {
              return a.id === blocko_1[w];
            })[0].parent;
          })[0].x;
          if (arrowx < 0) {
            document.querySelector('.arrowid[value="' + blocko_1[w] + '"]').parentNode.style.left = "".concat(arrowblock.x - offsetleft + 20 - 5 + this_6.canvasDiv.getBoundingClientRect().left - this_6.absX, "px");
          } else {
            document.querySelector('.arrowid[value="' + blocko_1[w] + '"]').parentNode.style.left = "".concat(this_6.blocks.filter(function (id) {
              return id.id === _this.blocks.filter(function (a) {
                return a.id === blocko_1[w];
              })[0].parent;
            })[0].x - 20 - offsetleft + this_6.canvasDiv.getBoundingClientRect().left - this_6.absX + 20, "px");
          }
        }
      };
      var this_6 = this;
      for (var w = 0; w < this.blocks.length; w++) {
        _loop_6(w);
      }
      for (var w = 0; w < this.blocks.length; w++) {
        this.blocks[w].x = document.querySelector(".blockid[value='" + this.blocks[w].id + "']").parentNode.getBoundingClientRect().left + window.scrollX + this.canvasDiv.scrollLeft + parseInt(window.getComputedStyle(document.querySelector(".blockid[value='" + this.blocks[w].id + "']").parentNode).width) / 2 - 20 - this.canvasDiv.getBoundingClientRect().left;
      }
    }
  };
  Flowy.prototype.rearrangeMe = function () {
    var paddingx = 40;
    var paddingy = 100;
    var result = this.blocks.map(function (a) {
      return a.parent;
    });
    var _loop_7 = function _loop_7(z) {
      if (result[z] === -1) {
        z++;
      }
      var totalwidth = 0;
      var totalremove = 0;
      var maxheight = 0;
      var _loop_8 = function _loop_8(w) {
        var children = this_7.blocks.filter(function (id) {
          return id.parent === result[z];
        })[w];
        if (this_7.blocks.filter(function (id) {
          return id.parent === children.id;
        }).length === 0) {
          children.childwidth = 0;
        }
        if (children.childwidth > children.width) {
          if (w === this_7.blocks.filter(function (id) {
            return id.parent === result[z];
          }).length - 1) {
            totalwidth += children.childwidth;
          } else {
            totalwidth += children.childwidth + paddingx;
          }
        } else {
          if (w === this_7.blocks.filter(function (id) {
            return id.parent === result[z];
          }).length - 1) {
            totalwidth += children.width;
          } else {
            totalwidth += children.width + paddingx;
          }
        }
      };
      for (var w = 0; w < this_7.blocks.filter(function (id) {
        return id.parent === result[z];
      }).length; w++) {
        _loop_8(w);
      }
      if (result[z] !== -1) {
        this_7.blocks.filter(function (a) {
          return a.id === result[z];
        })[0].childwidth = totalwidth;
      }
      var _loop_9 = function _loop_9(w) {
        var children = this_7.blocks.filter(function (id) {
          return id.parent === result[z];
        })[w];
        var r_block = document.querySelector(".blockid[value='" + children.id + "']").parentNode;
        var r_array = this_7.blocks.filter(function (id) {
          return id.id === result[z];
        });
        r_block.style.top = "".concat(r_array.y + paddingy + this_7.canvasDiv.getBoundingClientRect().top - this_7.absY, "px");
        r_array.y = r_array.y + paddingy;
        if (children.childwidth > children.width) {
          r_block.style.left = "".concat(r_array[0].x - totalwidth / 2 + totalremove + children.childwidth / 2 - children.width / 2 - (this_7.absX + window.scrollX) + this_7.canvasDiv.getBoundingClientRect().left, "px");
          children.x = r_array[0].x - totalwidth / 2 + totalremove + children.childwidth / 2;
          totalremove += children.childwidth + paddingx;
        } else {
          r_block.style.left = "".concat(r_array[0].x - totalwidth / 2 + totalremove - (this_7.absX + window.scrollX) + this_7.canvasDiv.getBoundingClientRect().left, "px");
          children.x = r_array[0].x - totalwidth / 2 + totalremove + children.width / 2;
          totalremove += children.width + paddingx;
        }
        var arrowblock = this_7.blocks.filter(function (a) {
          return a.id === children.id;
        })[0];
        var arrowx = arrowblock.x - this_7.blocks.filter(function (a) {
          return a.id === children.parent;
        })[0].x + 20;
        var arrowy = paddingy;
        this_7.updateArrow(arrowblock, arrowx, arrowy, children);
      };
      for (var w = 0; w < this_7.blocks.filter(function (id) {
        return id.parent === result[z];
      }).length; w++) {
        _loop_9(w);
      }
      out_z_1 = z;
    };
    var this_7 = this,
      out_z_1;
    for (var z = 0; z < result.length; z++) {
      _loop_7(z);
      z = out_z_1;
    }
  };
  Flowy.prototype.blockReleased = function () {
    this.release();
  };
  Flowy.prototype.blockSnap = function (drag, first, parent) {
    return this.snapping(drag, first, parent);
  };
  Flowy.prototype.beforeDelete = function (drag, parent) {
    return this.rearrange(drag, parent);
  };
  Flowy.prototype.addEventListenerMulti = function (type, listener, capture, selector) {
    var nodes = document.querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].addEventListener(type, listener, capture);
    }
  };
  Flowy.prototype.removeEventListenerMulti = function (type, listener, capture, selector) {
    var nodes = document.querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].removeEventListener(type, listener, capture);
    }
  };
  return Flowy;
}();
},{}],"node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;
function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}
module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;
if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "44103" + '/');
  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);
    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);
          if (didAccept) {
            handled = true;
          }
        }
      });

      // Enable HMR for CSS by default.
      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });
      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else if (location.reload) {
        // `location` global exists in a web worker context but lacks `.reload()` function.
        location.reload();
      }
    }
    if (data.type === 'reload') {
      ws.close();
      ws.onclose = function () {
        location.reload();
      };
    }
    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }
    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}
function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.remove();
  }
}
function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;

  // html encode message and stack trace
  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}
function getParents(bundle, id) {
  var modules = bundle.modules;
  if (!modules) {
    return [];
  }
  var parents = [];
  var k, d, dep;
  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];
      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }
  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }
  return parents;
}
function hmrApply(bundle, asset) {
  var modules = bundle.modules;
  if (!modules) {
    return;
  }
  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}
function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;
  if (!modules) {
    return;
  }
  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }
  if (checkedAssets[id]) {
    return;
  }
  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);
  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }
  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}
function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};
  if (cached) {
    cached.hot.data = bundle.hotData;
  }
  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }
  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];
  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });
    return true;
  }
}
},{}]},{},["node_modules/parcel-bundler/src/builtins/hmr-runtime.js","src/index.ts"], null)
//# sourceMappingURL=/src.f10117fe.js.map