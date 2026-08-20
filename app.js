(function () {
  "use strict";

  var PRESETS = [
    { id: "ink", label: "Ink", fg: "#272727", bg: "#ffffff" },
    { id: "teal", label: "Teal", fg: "#0e5c57", bg: "#ffffff" },
    { id: "night", label: "Night", fg: "#ffffff", bg: "#272727" },
  ];
  var HEX = /^#[0-9a-fA-F]{6}$/;
  var DEFAULT_SIZE = 256;

  var textEl = document.getElementById("qr-content");
  var countEl = document.getElementById("char-count");
  var fgSwatch = document.getElementById("fg-swatch");
  var bgSwatch = document.getElementById("bg-swatch");
  var fgHex = document.getElementById("fg-hex");
  var bgHex = document.getElementById("bg-hex");
  var fgFace = document.getElementById("fg-face");
  var bgFace = document.getElementById("bg-face");
  var sizeEl = document.getElementById("qr-size");
  var sizeValue = document.getElementById("qr-size-value");
  var previewSize = document.getElementById("preview-size");
  var previewLevel = document.getElementById("preview-level");
  var plate = document.getElementById("plate");
  var empty = document.getElementById("empty");
  var img = document.getElementById("preview-img");
  var errEl = document.getElementById("preview-error");
  var warnEl = document.getElementById("scan-warn");
  var saveBtn = document.getElementById("save-btn");
  var form = document.getElementById("qr-form");
  var palettes = document.getElementById("palettes");
  var dialog = document.getElementById("save-dialog");
  var saveImg = document.getElementById("save-img");
  var openImg = document.getElementById("open-img");
  var toastEl = document.getElementById("toast");

  var state = {
    fg: "#272727",
    bg: "#ffffff",
    size: DEFAULT_SIZE,
    level: "M",
    dataUrl: null,
    error: null,
    saveUrl: null,
    saveName: "qr-code.png",
    timer: null,
  };

  function isValidHex(value) {
    return HEX.test(value);
  }

  function channelToLinear(value) {
    var s = value / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }

  function relativeLuminance(hex) {
    var raw = hex.replace("#", "");
    var r = channelToLinear(parseInt(raw.slice(0, 2), 16));
    var g = channelToLinear(parseInt(raw.slice(2, 4), 16));
    var b = channelToLinear(parseInt(raw.slice(4, 6), 16));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrastRatio(a, b) {
    if (!isValidHex(a) || !isValidHex(b)) return 21;
    var l1 = relativeLuminance(a);
    var l2 = relativeLuminance(b);
    var hi = Math.max(l1, l2);
    var lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }

  function isForegroundDarker(fg, bg) {
    if (!isValidHex(fg) || !isValidHex(bg)) return true;
    return relativeLuminance(fg) < relativeLuminance(bg);
  }

  function slugFilename(text) {
    var slug = text
      .trim()
      .slice(0, 40)
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return "qr-" + (slug || "code") + ".png";
  }

  function isAppleTouchDevice() {
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
    return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  }

  function fileFromDataUrl(dataUrl, filename) {
    var comma = dataUrl.indexOf(",");
    var header = comma === -1 ? "data:image/png;base64" : dataUrl.slice(0, comma);
    var base64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
    var mimeMatch = /data:([^;]+)/.exec(header);
    var mime = mimeMatch ? mimeMatch[1] : "image/png";
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  }

  function canShareFile(file) {
    if (typeof navigator.share !== "function") return false;
    if (typeof navigator.canShare !== "function") return true;
    try {
      return navigator.canShare({ files: [file] });
    } catch (e) {
      return false;
    }
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    window.clearTimeout(toast.tid);
    toast.tid = window.setTimeout(function () {
      toastEl.classList.remove("show");
    }, 2200);
  }

  function content() {
    return textEl.value.trim();
  }

  function setFg(hex) {
    state.fg = hex;
    fgSwatch.value = hex;
    fgHex.value = hex;
    fgFace.style.backgroundColor = hex;
    updatePalettes();
    queueRender();
  }

  function setBg(hex) {
    state.bg = hex;
    bgSwatch.value = hex;
    bgHex.value = hex;
    bgFace.style.backgroundColor = hex;
    updatePalettes();
    queueRender();
  }

  function updatePalettes() {
    var buttons = palettes.querySelectorAll(".palette");
    for (var i = 0; i < buttons.length; i += 1) {
      var p = PRESETS[i];
      buttons[i].setAttribute(
        "aria-pressed",
        p.fg === state.fg && p.bg === state.bg ? "true" : "false"
      );
    }
  }

  function queueRender() {
    window.clearTimeout(state.timer);
    state.timer = window.setTimeout(render, 40);
  }

  function render() {
    var text = content();
    countEl.textContent = String(textEl.value.length).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    previewSize.textContent = String(state.size);
    previewLevel.textContent = state.level;
    sizeValue.textContent = state.size + " px";
    sizeEl.setAttribute("aria-valuetext", state.size + " pixels");

    if (!text) {
      state.dataUrl = null;
      state.error = null;
      img.classList.add("hidden");
      img.removeAttribute("src");
      errEl.classList.add("hidden");
      empty.classList.remove("hidden");
      plate.style.backgroundColor = "";
      warnEl.classList.add("hidden");
      saveBtn.disabled = true;
      return;
    }

    QRCode.toDataURL(text, {
      width: state.size,
      margin: 2,
      errorCorrectionLevel: state.level,
      color: { dark: state.fg, light: state.bg },
      type: "image/png",
    })
      .then(function (url) {
        if (content() !== text) return;
        state.dataUrl = url;
        state.error = null;
        empty.classList.add("hidden");
        errEl.classList.add("hidden");
        img.classList.remove("hidden");
        img.src = url;
        img.alt = "QR code for " + text;
        img.width = state.size;
        img.height = state.size;
        plate.style.backgroundColor = state.bg;
        saveBtn.disabled = false;
        updateWarn();
      })
      .catch(function (cause) {
        if (content() !== text) return;
        state.dataUrl = null;
        var message = cause && cause.message ? cause.message : "";
        state.error =
          message.toLowerCase().indexOf("too big") !== -1 ||
          message.toLowerCase().indexOf("capacity") !== -1
            ? "That text is too long for a QR code at this error-correction level. Shorten it or choose a lower level."
            : "Could not generate a QR code from this text.";
        empty.classList.add("hidden");
        img.classList.add("hidden");
        errEl.classList.remove("hidden");
        errEl.textContent = state.error;
        plate.style.backgroundColor = "";
        warnEl.classList.add("hidden");
        saveBtn.disabled = true;
      });
  }

  function updateWarn() {
    var contrast = contrastRatio(state.fg, state.bg);
    var inverted = !isForegroundDarker(state.fg, state.bg);
    var low = contrast < 3;
    if (!content() || (!low && !inverted)) {
      warnEl.classList.add("hidden");
      return;
    }
    warnEl.classList.remove("hidden");
    warnEl.textContent = low
      ? "Foreground and background are close in contrast. Many cameras will fail to scan this."
      : "Light modules on a dark field can be harder to scan. Prefer a darker foreground.";
  }

  function triggerFileDownload(file) {
    var url = URL.createObjectURL(file);
    var link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 2500);
  }

  function openSaveSheet(file) {
    if (state.saveUrl) URL.revokeObjectURL(state.saveUrl);
    state.saveUrl = URL.createObjectURL(file);
    state.saveName = file.name;
    saveImg.src = state.saveUrl;
    openImg.href = state.saveUrl;
    openImg.setAttribute("download", file.name);
    dialog.hidden = false;
    dialog.setAttribute("open", "");
    document.getElementById("save-close").focus();
  }

  function closeSaveSheet() {
    dialog.hidden = true;
    dialog.removeAttribute("open");
    if (state.saveUrl) {
      URL.revokeObjectURL(state.saveUrl);
      state.saveUrl = null;
    }
    saveImg.removeAttribute("src");
  }

  function handleDownload() {
    if (!state.dataUrl) return;
    var filename = slugFilename(content());
    var file = fileFromDataUrl(state.dataUrl, filename);

    if (canShareFile(file)) {
      navigator
        .share({ files: [file], title: filename })
        .then(function () {
          toast("PNG saved");
        })
        .catch(function (cause) {
          if (cause && cause.name === "AbortError") return;
          openSaveSheet(file);
        });
      return;
    }

    if (isAppleTouchDevice()) {
      openSaveSheet(file);
      return;
    }

    triggerFileDownload(file);
    toast("PNG saved");
  }

  PRESETS.forEach(function (preset) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "palette";
    btn.setAttribute("aria-label", preset.label + " palette");
    btn.innerHTML =
      '<span class="palette-swatch" style="background:linear-gradient(135deg,' +
      preset.fg +
      " 50%," +
      preset.bg +
      ' 50%)"></span><span>' +
      preset.label +
      "</span>";
    btn.addEventListener("click", function () {
      setFg(preset.fg);
      setBg(preset.bg);
    });
    palettes.appendChild(btn);
  });
  updatePalettes();

  textEl.addEventListener("input", queueRender);
  sizeEl.addEventListener("input", function () {
    state.size = Number(sizeEl.value) || DEFAULT_SIZE;
    queueRender();
  });

  var levelInputs = document.querySelectorAll('input[name="level"]');
  for (var i = 0; i < levelInputs.length; i += 1) {
    levelInputs[i].addEventListener("change", function (event) {
      state.level = event.target.value;
      queueRender();
    });
  }

  fgSwatch.addEventListener("input", function () {
    setFg(fgSwatch.value);
  });
  bgSwatch.addEventListener("input", function () {
    setBg(bgSwatch.value);
  });
  fgHex.addEventListener("input", function () {
    var next = fgHex.value;
    if (isValidHex(next)) setFg(next);
  });
  bgHex.addEventListener("input", function () {
    var next = bgHex.value;
    if (isValidHex(next)) setBg(next);
  });
  fgHex.addEventListener("blur", function () {
    fgHex.value = state.fg;
  });
  bgHex.addEventListener("blur", function () {
    bgHex.value = state.bg;
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    handleDownload();
  });

  document.getElementById("save-close").addEventListener("click", closeSaveSheet);
  document.getElementById("save-done").addEventListener("click", closeSaveSheet);
  document.getElementById("share-btn").addEventListener("click", function () {
    if (!state.dataUrl) return;
    var file = fileFromDataUrl(state.dataUrl, state.saveName);
    if (!canShareFile(file)) {
      toast("Sharing is not available in this browser.");
      return;
    }
    navigator.share({ files: [file], title: state.saveName }).catch(function (cause) {
      if (cause && cause.name === "AbortError") return;
      toast("Could not open the share sheet.");
    });
  });
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) closeSaveSheet();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !dialog.hidden) closeSaveSheet();
  });

  render();
})();
