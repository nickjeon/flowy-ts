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
  function Flowy(canvas, grab, release, snapping, rearrange, spacing_x, spacing_y) {
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
    if (spacing_x === void 0) {
      spacing_x = 20;
    }
    if (spacing_y === void 0) {
      spacing_y = 80;
    }
    this.loaded = false;
    this.blocks = [];
    this.blockstemp = [];
    this.absx = 0;
    this.absy = 0;
    this.active = false;
    this.offsetleft = 0;
    this.rearrange = false;
    this.dragblock = false;
    this.prevblock = 0;
    this.grab = function (block) {};
    this.canvas_div = canvas;
    this.paddingx = spacing_x;
    this.paddingy = spacing_y;
    // polyfill for the Element.matches and Element.closest methods
    if (!Element.prototype.matches) {
      Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
    }
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
    if (grab) {
      this.grab = grab;
    }
    this.el = document.createElement("DIV");
    this.el.classList.add("indicator");
    this.el.classList.add("invisible");
    this.canvas_div.appendChild(this.el);
    // Implement other methods
  }

  Flowy.prototype.import = function (output) {
    this.canvas_div.innerHTML = output.html;
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
    var html_ser = this.canvas_div.innerHTML;
    var json_data = {
      html: html_ser,
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
        json_data.blocks.push(blockOutput);
        var blockParent = (_a = document.querySelector(".blockid[value='".concat(this_1.blocks[i].id, "']"))) === null || _a === void 0 ? void 0 : _a.parentNode;
        if (blockParent) {
          blockParent.querySelectorAll("input").forEach(function (block) {
            var json_name = block.getAttribute("name");
            var json_value = block.value;
            blockOutput.data.push({
              name: json_name,
              value: json_value
            });
          });
          Array.prototype.slice.call(blockParent.attributes).forEach(function (attribute) {
            var jsonobj = {};
            jsonobj[attribute.name] = attribute.value;
            blockOutput.attr.push(jsonobj);
          });
        }
      };
      var this_1 = this;
      for (var i = 0; i < this.blocks.length; i++) {
        _loop_1(i);
      }
    }
    return json_data;
  };
  Flowy.prototype.deleteBlocks = function () {
    this.blocks = [];
    this.canvas_div.innerHTML = "<div class='indicator invisible'></div>";
  };
  Flowy.prototype.blockGrabbed = function (block) {
    this.grab(block);
  };
  Flowy.prototype.beginDrag = function (event) {
    var _a;
    if (window.getComputedStyle(this.canvas_div).position === "absolute" || window.getComputedStyle(this.canvas_div).position === "fixed") {
      this.absx = this.canvas_div.getBoundingClientRect().left;
      this.absy = this.canvas_div.getBoundingClientRect().top;
    }
    var isTouchEvent = ("targetTouches" in event);
    var clientX = isTouchEvent ? event.changedTouches[0].clientX : event.clientX;
    var clientY = isTouchEvent ? event.changedTouches[0].clientY : event.clientY;
    var targetElement = event.target.closest(".create-flowy");
    if (event instanceof MouseEvent && event.which === 3) return;
    if (!targetElement) return;
    this.original = targetElement;
    var newNode = targetElement.cloneNode(true);
    targetElement.classList.add("dragnow");
    newNode.classList.add("block");
    newNode.classList.remove("create-flowy");
    var blockId = this.blocks.length === 0 ? 0 : Math.max.apply(Math, this.blocks.map(function (a) {
      return a.id;
    })) + 1;
    newNode.innerHTML += "<input type='hidden' name='blockid' class='blockid' value='".concat(blockId, "'>");
    document.body.appendChild(newNode);
    this.drag = (_a = document.querySelector(".blockid[value='".concat(blockId, "']"))) === null || _a === void 0 ? void 0 : _a.parentNode;
    this.blockGrabbed(targetElement);
    this.drag.classList.add("dragging");
    this.active = true;
    this.dragx = clientX - targetElement.getBoundingClientRect().left;
    this.dragy = clientY - targetElement.getBoundingClientRect().top;
    this.drag.style.left = "".concat(clientX - this.dragx, "px");
    this.drag.style.top = "".concat(clientY - this.dragy, "px");
  };
  Flowy.prototype.endDrag = function (event) {
    var _a, _b, _c, _d;
    if (event.which !== 3 && (this.active || this.rearrange)) {
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
      var blockId = parseInt(((_d = (_c = this.drag) === null || _c === void 0 ? void 0 : _c.querySelector(".blockid")) === null || _d === void 0 ? void 0 : _d.value) || "");
      if (blockId === 0 && this.rearrange) {
        this.firstBlock("rearrange");
      } else if (this.active && this.blocks.length === 0 && this.drag.getBoundingClientRect().top + window.scrollY > this.canvas_div.getBoundingClientRect().top + window.scrollY && this.drag.getBoundingClientRect().left + window.scrollX > this.canvas_div.getBoundingClientRect().left + window.scrollX) {
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
            if (this.blockSnap(this.drag, false, document.querySelector(".blockid[value='".concat(blockIds[i], "']")).parentNode)) {
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
            this_2.drag.classList.remove("dragging");
            this_2.snap(this_2.drag, i, blockIds_1);
            return "break";
          } else if (i === this_2.blocks.length - 1) {
            if (this_2.beforeDelete(this_2.drag, this_2.blocks.filter(function (id) {
              return id.id === blockIds_1[i];
            })[0])) {
              this_2.active = false;
              this_2.drag.classList.remove("dragging");
              this_2.snap(this_2.drag, blockIds_1.indexOf(this_2.prevblock), blockIds_1);
              return "break";
            } else {
              this_2.rearrange = false;
              this_2.blockstemp = [];
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
    var xpos = this.drag.getBoundingClientRect().left + window.scrollX + parseInt(window.getComputedStyle(this.drag).width) / 2 + this.canvas_div.scrollLeft - this.canvas_div.getBoundingClientRect().left;
    var ypos = this.drag.getBoundingClientRect().top + window.scrollY + this.canvas_div.scrollTop - this.canvas_div.getBoundingClientRect().top;
    var block = this.blocks.filter(function (a) {
      return a.id === id;
    })[0];
    if (xpos >= block.x - block.width / 2 - this.paddingx && xpos <= block.x + block.width / 2 + this.paddingx && ypos >= block.y - block.height / 2 && ypos <= block.y + block.height) {
      return true;
    } else {
      return false;
    }
  };
  Flowy.prototype.removeSelection = function () {
    var _a;
    this.canvas_div.appendChild(document.querySelector(".indicator"));
    (_a = this.drag.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(this.drag);
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