/* ─────────────────────────────────────────────────────────
 * DialKit — Live CSS Tuning Panel for Rails
 *
 * Self-contained vanilla JS. No dependencies.
 * Injected by DialKit::Middleware in development.
 *
 * Config on [data-dial-kit] elements → floating panel
 * with sliders/toggles/controls → CSS custom properties
 * on the target element, updated at 60fps.
 * ───────────────────────────────────────────────────────── */

;(function() {
  "use strict";

  // ── Config ──────────────────────────────────────────────

  var scriptEl = document.currentScript;
  var CONFIG = scriptEl
    ? JSON.parse(scriptEl.dataset.dialKitConfig || "{}")
    : {};

  var POSITION = CONFIG.position || "bottom-right";
  var Z_INDEX = CONFIG.zIndex || 99999;
  var SHORTCUT = parseShortcut(CONFIG.keyboardShortcut || "ctrl+shift+d");

  // ── State ───────────────────────────────────────────────

  var registry = new Map();   // element → { name, config, controls }
  var panelEl = null;
  var panelInner = null;
  var bodyEl = null;
  var toggleBtn = null;
  var isVisible = false;
  var isDragging = false;
  var dragOffset = { x: 0, y: 0 };

  // ── Init ────────────────────────────────────────────────

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    createPanel();
    createToggleButton();
    scanElements();
    observeMutations();
    listenKeyboard();
  }

  // ── Panel ───────────────────────────────────────────────

  function createPanel() {
    panelEl = document.createElement("div");
    panelEl.id = "dial-kit-panel";
    panelEl.className = "dk-pos-" + POSITION;
    panelEl.style.zIndex = Z_INDEX;

    panelInner = document.createElement("div");
    panelInner.className = "dk-panel-inner";

    // Header
    var header = document.createElement("div");
    header.className = "dk-header";
    header.innerHTML =
      '<h3>DialKit</h3>' +
      '<div class="dk-header-actions">' +
        '<button class="dk-header-btn dk-close-btn" title="Close">&times;</button>' +
      '</div>';

    // Toolbar with copy
    var toolbar = document.createElement("div");
    toolbar.className = "dk-toolbar";
    var copyBtn = document.createElement("button");
    copyBtn.className = "dk-toolbar-copy";
    copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>' +
      '<span class="dk-toolbar-copy-label">Copy values</span>';
    toolbar.appendChild(copyBtn);

    // Body
    bodyEl = document.createElement("div");
    bodyEl.className = "dk-body";

    panelInner.appendChild(header);
    panelInner.appendChild(toolbar);
    panelInner.appendChild(bodyEl);
    panelEl.appendChild(panelInner);
    document.body.appendChild(panelEl);

    header.querySelector(".dk-close-btn").addEventListener("click", toggle);
    copyBtn.addEventListener("click", copyValues);
    initDrag(header, panelEl);
  }

  function createToggleButton() {
    toggleBtn = document.createElement("button");
    toggleBtn.id = "dial-kit-toggle";
    toggleBtn.className = "dk-pos-" + POSITION;
    toggleBtn.style.zIndex = Z_INDEX - 1;
    toggleBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>';
    toggleBtn.title = "DialKit (" + CONFIG.keyboardShortcut + ")";
    toggleBtn.addEventListener("click", toggle);
    document.body.appendChild(toggleBtn);
  }

  function toggle() {
    isVisible = !isVisible;
    panelEl.classList.toggle("dk-visible", isVisible);
    toggleBtn.classList.toggle("dk-hidden", isVisible);
  }

  // ── Scanning ────────────────────────────────────────────

  function scanElements() {
    document.querySelectorAll("[data-dial-kit]").forEach(registerElement);
    updateEmptyState();
  }

  function registerElement(el) {
    if (registry.has(el)) return;

    var configStr = el.getAttribute("data-dial-kit");
    if (!configStr) return;

    var config;
    try {
      config = JSON.parse(configStr);
    } catch (e) {
      console.warn("[DialKit] Invalid config on element:", el, e);
      return;
    }

    var name = el.getAttribute("data-dial-kit-name") || inferName(el);
    var controls = [];
    var section = createSection(name, config, el, controls);

    registry.set(el, { name: name, config: config, controls: controls, section: section });
    bodyEl.appendChild(section);

    // Highlight on hover
    section.addEventListener("mouseenter", function() { el.classList.add("dk-highlight"); });
    section.addEventListener("mouseleave", function() { el.classList.remove("dk-highlight"); });
  }

  function unregisterElement(el) {
    var entry = registry.get(el);
    if (!entry) return;
    entry.section.remove();
    el.classList.remove("dk-highlight");
    registry.delete(el);
  }

  function inferName(el) {
    if (el.id) return "#" + el.id;
    var cls = el.className;
    if (typeof cls === "string" && cls.trim()) {
      return "." + cls.trim().split(/\s+/)[0];
    }
    return el.tagName.toLowerCase();
  }

  function updateEmptyState() {
    var existing = bodyEl.querySelector(".dk-empty");
    if (registry.size === 0 && !existing) {
      var empty = document.createElement("div");
      empty.className = "dk-empty";
      empty.textContent = "No dial_kit elements found.\nAdd dial_kit(...) to an element in your view.";
      bodyEl.appendChild(empty);
    } else if (registry.size > 0 && existing) {
      existing.remove();
    }
  }

  // ── Section ─────────────────────────────────────────────

  function createSection(name, config, element, controlsArr) {
    var section = document.createElement("div");
    section.className = "dk-section";

    var header = document.createElement("div");
    header.className = "dk-section-header";

    var titleRow = document.createElement("div");
    titleRow.className = "dk-section-title-row";

    var chevron = document.createElement("span");
    chevron.className = "dk-section-chevron";
    chevron.innerHTML = "&#x25BC;";

    var nameSpan = document.createElement("span");
    nameSpan.className = "dk-section-name";
    nameSpan.textContent = name;

    titleRow.appendChild(chevron);
    titleRow.appendChild(nameSpan);
    header.appendChild(titleRow);

    header.addEventListener("click", function() {
      section.classList.toggle("dk-collapsed");
    });

    var controls = document.createElement("div");
    controls.className = "dk-section-controls";

    var keys = Object.keys(config);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var spec = config[key];
      var ctrl = createControl(key, spec, element);
      if (ctrl) {
        controlsArr.push(ctrl);
        controls.appendChild(ctrl.el);
      }
    }

    section.appendChild(header);
    section.appendChild(controls);
    return section;
  }

  // ── Controls ────────────────────────────────────────────

  function createControl(key, spec, element) {
    if (!spec || !spec.type) return null;

    switch (spec.type) {
      case "slider":  return createSlider(key, spec, element);
      case "toggle":  return createToggleControl(key, spec, element);
      case "color":   return createColorControl(key, spec, element);
      case "select":  return createSelectControl(key, spec, element);
      case "text":    return createTextControl(key, spec, element);
      case "action":  return createActionControl(key, spec, element);
      case "group":   return createGroupControl(key, spec, element);
      default:
        console.warn("[DialKit] Unknown control type:", spec.type);
        return null;
    }
  }

  // ── Slider ──────────────────────────────────────────────

  function createSlider(key, spec, element) {
    var value = spec["default"];
    var min = spec.min;
    var max = spec.max;
    var step = spec.step || 1;

    // Wrapper
    var wrapper = document.createElement("div");
    wrapper.className = "dk-slider-wrapper";

    // Track (visual background)
    var track = document.createElement("div");
    track.className = "dk-slider-track";

    // Fill bar
    var fill = document.createElement("div");
    fill.className = "dk-slider-fill";

    // Handle
    var handle = document.createElement("div");
    handle.className = "dk-slider-handle";

    // Label
    var label = document.createElement("span");
    label.className = "dk-slider-label";
    label.textContent = formatLabel(key);

    // Value display
    var valueDisplay = document.createElement("span");
    valueDisplay.className = "dk-slider-value";
    valueDisplay.textContent = formatValue(value, step);

    // Invisible native range input for interaction
    var input = document.createElement("input");
    input.type = "range";
    input.className = "dk-slider-input";
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;

    function updateVisuals(val) {
      var pct = ((val - min) / (max - min)) * 100;
      fill.style.width = pct + "%";
      handle.style.left = pct + "%";
    }

    input.addEventListener("input", function() {
      value = parseFloat(input.value);
      valueDisplay.textContent = formatValue(value, step);
      updateVisuals(value);
      setCSSVar(element, key, value);
    });

    input.addEventListener("mousedown", function() { wrapper.classList.add("dk-active"); });
    input.addEventListener("mouseup", function() { wrapper.classList.remove("dk-active"); });
    input.addEventListener("touchstart", function() { wrapper.classList.add("dk-active"); }, { passive: true });
    input.addEventListener("touchend", function() { wrapper.classList.remove("dk-active"); });

    track.appendChild(fill);
    track.appendChild(handle);
    track.appendChild(label);
    track.appendChild(valueDisplay);
    track.appendChild(input);
    wrapper.appendChild(track);

    updateVisuals(value);
    setCSSVar(element, key, value);

    return {
      el: wrapper,
      key: key,
      spec: spec,
      getValue: function() { return value; },
    };
  }

  // ── Toggle ──────────────────────────────────────────────

  function createToggleControl(key, spec, element) {
    var value = spec["default"];

    var row = document.createElement("div");
    row.className = "dk-toggle-row";
    row.setAttribute("data-checked", String(value));

    var label = document.createElement("span");
    label.className = "dk-toggle-label";
    label.textContent = formatLabel(key);

    var trackEl = document.createElement("div");
    trackEl.className = "dk-toggle-track";

    var thumb = document.createElement("div");
    thumb.className = "dk-toggle-thumb";

    // Hidden input for form semantics
    var input = document.createElement("input");
    input.type = "checkbox";
    input.checked = value;

    trackEl.appendChild(thumb);

    row.appendChild(label);
    row.appendChild(trackEl);
    row.appendChild(input);

    row.addEventListener("click", function() {
      value = !value;
      input.checked = value;
      row.setAttribute("data-checked", String(value));
      setCSSVar(element, key, value ? 1 : 0);
    });

    setCSSVar(element, key, value ? 1 : 0);

    return {
      el: row,
      key: key,
      spec: spec,
      getValue: function() { return value; },
    };
  }

  // ── Color ───────────────────────────────────────────────

  function createColorControl(key, spec, element) {
    var value = spec["default"] || "#000000";

    var row = document.createElement("div");
    row.className = "dk-color-row";

    var label = document.createElement("span");
    label.className = "dk-color-label";
    label.textContent = formatLabel(key);

    var inputs = document.createElement("div");
    inputs.className = "dk-color-inputs";

    var hexDisplay = document.createElement("span");
    hexDisplay.className = "dk-color-hex";
    hexDisplay.textContent = value;

    var swatch = document.createElement("button");
    swatch.className = "dk-color-swatch";
    swatch.style.background = value;

    // Hidden native color input
    var nativeInput = document.createElement("input");
    nativeInput.type = "color";
    nativeInput.className = "dk-color-native";
    nativeInput.value = normalizeHex(value);

    swatch.addEventListener("click", function(e) {
      e.stopPropagation();
      nativeInput.click();
    });

    nativeInput.addEventListener("input", function() {
      value = nativeInput.value;
      hexDisplay.textContent = value;
      swatch.style.background = value;
      setCSSVar(element, key, value);
    });

    inputs.appendChild(hexDisplay);
    inputs.appendChild(swatch);
    inputs.appendChild(nativeInput);

    row.appendChild(label);
    row.appendChild(inputs);

    setCSSVar(element, key, value);

    return {
      el: row,
      key: key,
      spec: spec,
      getValue: function() { return value; },
    };
  }

  // ── Select ──────────────────────────────────────────────

  function createSelectControl(key, spec, element) {
    var options = spec.options || [];
    var value = spec["default"] || (options[0] && (options[0].value || options[0]));

    var selectRow = document.createElement("div");
    selectRow.className = "dk-select-row";

    var trigger = document.createElement("button");
    trigger.className = "dk-select-trigger";
    trigger.setAttribute("data-open", "false");

    var triggerLabel = document.createElement("span");
    triggerLabel.className = "dk-select-label";
    triggerLabel.textContent = formatLabel(key);

    var triggerValue = document.createElement("span");
    triggerValue.className = "dk-select-value";
    triggerValue.textContent = getDisplayLabel(value, options);

    var triggerChevron = document.createElement("span");
    triggerChevron.className = "dk-select-chevron";
    triggerChevron.innerHTML = "&#x25BC;";

    var triggerRight = document.createElement("span");
    triggerRight.style.display = "flex";
    triggerRight.style.alignItems = "center";
    triggerRight.style.gap = "4px";
    triggerRight.appendChild(triggerValue);
    triggerRight.appendChild(triggerChevron);

    trigger.appendChild(triggerLabel);
    trigger.appendChild(triggerRight);

    var dropdown = null;

    function openDropdown() {
      if (dropdown) return;
      trigger.setAttribute("data-open", "true");

      dropdown = document.createElement("div");
      dropdown.className = "dk-select-dropdown";

      for (var i = 0; i < options.length; i++) {
        (function(opt) {
          var optBtn = document.createElement("button");
          optBtn.className = "dk-select-option";
          var optValue = typeof opt === "object" ? opt.value : opt;
          var optLabel = typeof opt === "object" ? (opt.label || opt.value) : opt;
          optBtn.textContent = optLabel;
          optBtn.setAttribute("data-selected", String(optValue === value));

          optBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            value = optValue;
            triggerValue.textContent = optLabel;
            setCSSVar(element, key, value);
            closeDropdown();
          });

          dropdown.appendChild(optBtn);
        })(options[i]);
      }

      selectRow.appendChild(dropdown);

      // Close on outside click
      setTimeout(function() {
        document.addEventListener("click", closeOnOutside);
      }, 0);
    }

    function closeDropdown() {
      if (!dropdown) return;
      trigger.setAttribute("data-open", "false");
      dropdown.remove();
      dropdown = null;
      document.removeEventListener("click", closeOnOutside);
    }

    function closeOnOutside(e) {
      if (!selectRow.contains(e.target)) {
        closeDropdown();
      }
    }

    trigger.addEventListener("click", function(e) {
      e.stopPropagation();
      if (dropdown) {
        closeDropdown();
      } else {
        openDropdown();
      }
    });

    selectRow.appendChild(trigger);

    setCSSVar(element, key, value);

    return {
      el: selectRow,
      key: key,
      spec: spec,
      getValue: function() { return value; },
    };
  }

  function getDisplayLabel(value, options) {
    for (var i = 0; i < options.length; i++) {
      var opt = options[i];
      if (typeof opt === "object" && opt.value === value) return opt.label || opt.value;
      if (opt === value) return opt;
    }
    return value;
  }

  // ── Text Input ──────────────────────────────────────────

  function createTextControl(key, spec, element) {
    var value = spec["default"] || "";

    var row = document.createElement("div");
    row.className = "dk-text-row";

    var label = document.createElement("span");
    label.className = "dk-text-label";
    label.textContent = formatLabel(key);

    var input = document.createElement("input");
    input.type = "text";
    input.className = "dk-text-input";
    input.value = value;
    if (spec.placeholder) input.placeholder = spec.placeholder;

    input.addEventListener("input", function() {
      value = input.value;
      setCSSVar(element, key, value);
    });

    row.appendChild(label);
    row.appendChild(input);

    setCSSVar(element, key, value);

    return {
      el: row,
      key: key,
      spec: spec,
      getValue: function() { return value; },
    };
  }

  // ── Action Button ───────────────────────────────────────

  function createActionControl(key, spec, element) {
    var btn = document.createElement("button");
    btn.className = "dk-action-btn";
    btn.textContent = spec.label || formatLabel(key);

    btn.addEventListener("click", function() {
      element.dispatchEvent(new CustomEvent("dial-kit:action", {
        detail: { action: key },
        bubbles: true,
      }));
    });

    return {
      el: btn,
      key: key,
      spec: spec,
      getValue: function() { return null; },
    };
  }

  // ── Group / Folder ──────────────────────────────────────

  function createGroupControl(key, spec, element) {
    var group = document.createElement("div");
    group.className = "dk-group";

    var header = document.createElement("div");
    header.className = "dk-group-header";

    var titleRow = document.createElement("div");
    titleRow.className = "dk-group-title-row";

    var chevron = document.createElement("span");
    chevron.className = "dk-group-chevron";
    chevron.innerHTML = "&#x25BC;";

    var nameSpan = document.createElement("span");
    nameSpan.className = "dk-group-name";
    nameSpan.textContent = formatLabel(key);

    titleRow.appendChild(chevron);
    titleRow.appendChild(nameSpan);
    header.appendChild(titleRow);

    header.addEventListener("click", function() {
      group.classList.toggle("dk-collapsed");
    });

    var controls = document.createElement("div");
    controls.className = "dk-group-controls";

    var childControls = [];
    var subConfig = spec.controls || {};
    var subKeys = Object.keys(subConfig);

    for (var i = 0; i < subKeys.length; i++) {
      var subKey = subKeys[i];
      var ctrl = createControl(subKey, subConfig[subKey], element);
      if (ctrl) {
        childControls.push(ctrl);
        controls.appendChild(ctrl.el);
      }
    }

    group.appendChild(header);
    group.appendChild(controls);

    return {
      el: group,
      key: key,
      spec: spec,
      getValue: function() {
        var vals = {};
        for (var i = 0; i < childControls.length; i++) {
          vals[childControls[i].key] = childControls[i].getValue();
        }
        return vals;
      },
    };
  }

  // ── CSS Custom Properties ───────────────────────────────

  function setCSSVar(element, key, value) {
    element.style.setProperty("--dk-" + key, value);
  }

  // ── Copy Values ─────────────────────────────────────────

  function copyValues() {
    var lines = [];
    lines.push("I tuned the following values using DialKit. Update the styles to use these values:");
    lines.push("");

    registry.forEach(function(entry) {
      lines.push("### " + entry.name);
      lines.push("");

      var changes = [];
      var noChanges = [];
      collectChanges(entry.controls, changes, noChanges);

      if (changes.length > 0) {
        lines.push("**Changed from defaults:**");
        for (var i = 0; i < changes.length; i++) {
          lines.push("- " + changes[i]);
        }
        lines.push("");
      }

      if (noChanges.length > 0) {
        lines.push("**Kept at defaults:**");
        for (var i = 0; i < noChanges.length; i++) {
          lines.push("- " + noChanges[i]);
        }
        lines.push("");
      }
    });

    var text = lines.join("\n");
    writeToClipboard(text);
  }

  function collectChanges(controls, changes, noChanges) {
    for (var i = 0; i < controls.length; i++) {
      var ctrl = controls[i];
      var val = ctrl.getValue();
      if (val === null) continue;

      var spec = ctrl.spec;
      if (!spec) {
        changes.push("`" + ctrl.key + "`: " + val);
        continue;
      }

      if (typeof val === "object" && !Array.isArray(val)) {
        var keys = Object.keys(val);
        for (var j = 0; j < keys.length; j++) {
          var subSpec = spec.controls && spec.controls[keys[j]];
          var subDefault = subSpec ? subSpec["default"] : undefined;
          var line = "`" + ctrl.key + "." + keys[j] + "`: **" + val[keys[j]] + "**";
          if (subDefault !== undefined && val[keys[j]] !== subDefault) {
            changes.push(line + " (was " + subDefault + ")");
          } else {
            noChanges.push("`" + ctrl.key + "." + keys[j] + "`: " + val[keys[j]]);
          }
        }
      } else {
        var dflt = spec["default"];
        var line = "`" + ctrl.key + "`: **" + val + "**";
        if (dflt !== undefined && val !== dflt) {
          changes.push(line + " (was " + dflt + ")");
        } else {
          noChanges.push("`" + ctrl.key + "`: " + val);
        }
      }
    }
  }

  function writeToClipboard(text) {
    var copyBtn = panelEl.querySelector(".dk-toolbar-copy");
    var labelEl = copyBtn && copyBtn.querySelector(".dk-toolbar-copy-label");

    function onSuccess() {
      if (labelEl) {
        labelEl.textContent = "Copied!";
        setTimeout(function() {
          labelEl.textContent = "Copy values";
        }, 1200);
      }
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(onSuccess);
    } else {
      var textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      onSuccess();
    }
  }

  // ── Drag ────────────────────────────────────────────────

  function initDrag(handle, panel) {
    handle.addEventListener("mousedown", function(e) {
      if (e.target.closest(".dk-header-btn")) return;
      isDragging = true;
      dragOffset.x = e.clientX - panel.getBoundingClientRect().left;
      dragOffset.y = e.clientY - panel.getBoundingClientRect().top;
      e.preventDefault();
    });

    document.addEventListener("mousemove", function(e) {
      if (!isDragging) return;
      panel.style.left = (e.clientX - dragOffset.x) + "px";
      panel.style.top = (e.clientY - dragOffset.y) + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      panel.style.transform = "none";
    });

    document.addEventListener("mouseup", function() {
      isDragging = false;
    });
  }

  // ── Keyboard ────────────────────────────────────────────

  function listenKeyboard() {
    document.addEventListener("keydown", function(e) {
      if (matchesShortcut(e, SHORTCUT)) {
        e.preventDefault();
        toggle();
      }
    });
  }

  function parseShortcut(str) {
    var parts = str.toLowerCase().split("+");
    return {
      ctrl: parts.indexOf("ctrl") !== -1,
      shift: parts.indexOf("shift") !== -1,
      alt: parts.indexOf("alt") !== -1,
      meta: parts.indexOf("meta") !== -1 || parts.indexOf("cmd") !== -1,
      key: parts[parts.length - 1],
    };
  }

  function matchesShortcut(e, s) {
    return (
      e.ctrlKey === s.ctrl &&
      e.shiftKey === s.shift &&
      e.altKey === s.alt &&
      e.metaKey === s.meta &&
      e.key.toLowerCase() === s.key
    );
  }

  // ── MutationObserver ────────────────────────────────────

  function observeMutations() {
    var observer = new MutationObserver(function(mutations) {
      var changed = false;

      for (var i = 0; i < mutations.length; i++) {
        var mutation = mutations[i];

        for (var j = 0; j < mutation.addedNodes.length; j++) {
          var node = mutation.addedNodes[j];
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.id === "dial-kit-panel" || node.id === "dial-kit-toggle") continue;

          if (node.hasAttribute("data-dial-kit")) {
            registerElement(node);
            changed = true;
          }
          var children = node.querySelectorAll("[data-dial-kit]");
          for (var k = 0; k < children.length; k++) {
            registerElement(children[k]);
            changed = true;
          }
        }

        for (var j = 0; j < mutation.removedNodes.length; j++) {
          var node = mutation.removedNodes[j];
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          if (registry.has(node)) {
            unregisterElement(node);
            changed = true;
          }
          var children = node.querySelectorAll("[data-dial-kit]");
          for (var k = 0; k < children.length; k++) {
            if (registry.has(children[k])) {
              unregisterElement(children[k]);
              changed = true;
            }
          }
        }
      }

      if (changed) updateEmptyState();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ── Helpers ─────────────────────────────────────────────

  function formatLabel(key) {
    return key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  }

  function formatValue(val, step) {
    if (step && step < 1) {
      var decimals = String(step).split(".")[1];
      return val.toFixed(decimals ? decimals.length : 2);
    }
    return String(Math.round(val * 100) / 100);
  }

  function normalizeHex(hex) {
    if (hex.length === 4) {
      return "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    return hex;
  }

})();
