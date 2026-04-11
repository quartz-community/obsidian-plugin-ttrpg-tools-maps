/*
 * Portions of this file are ported from:
 *   zoom-map by Jareika
 *   https://github.com/Jareika/zoom-map
 *   Commit: da748dbcca9247ef26cf596b9e64b0b552fdb175
 *   MIT License — Copyright (c) 2025 Jareika
 */

// @ts-nocheck

(function () {
  const STRINGS = {
    resetView: "Reset view",
    layers: "Layers",
    baseImage: "Base image",
    errorTitle: "Map failed to load",
    errorInvalidYaml: "Invalid map configuration",
    errorMarkersMissing: "Marker data not found",
    errorInvalidMarkers: "Marker data is corrupted",
  };

  const ERROR_MESSAGES = {
    "invalid-yaml": STRINGS.errorInvalidYaml,
    "markers-missing": STRINGS.errorMarkersMissing,
    "invalid-markers": STRINGS.errorInvalidMarkers,
  };

  function svgDataUrl(svg) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  function pinSvg(color) {
    return svgDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <path fill="${color}" d="M16 1C9.925 1 5 5.925 5 12c0 8.25 11 19 11 19s11-10.75 11-19C27 5.925 22.075 1 16 1z"/>
        <circle cx="16" cy="12" r="5" fill="#fff" opacity="0.65"/>
      </svg>`,
    );
  }

  const ICONS = {
    "pin-red": pinSvg("#e53935"),
    "pin-blue": pinSvg("#1e88e5"),
    "pin-green": pinSvg("#43a047"),
    "pin-yellow": pinSvg("#fdd835"),
    star: svgDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="#ffd54f" d="M12 2l2.95 6.3 6.9.88-5.05 4.66 1.3 6.76L12 17.9l-6.1 2.7 1.3-6.76L2.15 9.18l6.9-.88L12 2z"/>
      </svg>`,
    ),
    flag: svgDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="#90caf9" d="M5 2h2v20H5z"/>
        <path fill="#42a5f5" d="M7 3h12l-3 4 3 4H7z"/>
      </svg>`,
    ),
    skull: svgDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <circle cx="12" cy="10" r="6" fill="#eceff1"/>
        <circle cx="9" cy="10" r="1.5" fill="#37474f"/>
        <circle cx="15" cy="10" r="1.5" fill="#37474f"/>
        <rect x="10" y="15" width="4" height="4" fill="#b0bec5"/>
      </svg>`,
    ),
    castle: svgDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="#b0bec5" d="M4 20V8h3V6h3v2h4V6h3v2h3v12H4z"/>
        <rect x="10" y="12" width="4" height="8" fill="#78909c"/>
      </svg>`,
    ),
    tree: svgDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <circle cx="12" cy="9" r="6" fill="#66bb6a"/>
        <rect x="10" y="13" width="4" height="8" fill="#8d6e63"/>
      </svg>`,
    ),
    question: svgDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="#ffcc80"/>
        <path fill="#6d4c41" d="M12 6a4 4 0 00-4 4h2a2 2 0 114 0c0 2-3 1.75-3 5h2c0-2.5 3-2.5 3-5a4 4 0 00-4-4z"/>
        <circle cx="12" cy="18" r="1" fill="#6d4c41"/>
      </svg>`,
    ),
  };

  function createDiv(parent, className) {
    const el = document.createElement("div");
    if (className) el.className = className;
    if (parent) parent.appendChild(el);
    return el;
  }

  function createEl(parent, tag, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (parent) parent.appendChild(el);
    return el;
  }

  function createSvgEl(parent, tag, className) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    if (className) el.setAttribute("class", className);
    if (parent) parent.appendChild(el);
    return el;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  class ReadOnlyMapInstance {
    constructor(rootEl, cfg, data) {
      this.rootEl = rootEl;
      this.cfg = cfg;
      this.data = data;

      this.viewportEl = null;
      this.clipEl = null;
      this.worldEl = null;
      this.imgEl = null;
      this.overlaysEl = null;
      this.gridEl = null;
      this.markersEl = null;
      this.drawEl = null;
      this.textEl = null;
      this.hudEl = null;

      this.scale = 1;
      this.tx = 0;
      this.ty = 0;
      this.vw = 0;
      this.vh = 0;
      this.imgW = 0;
      this.imgH = 0;

      this.ro = null;
      this.cleanupFns = [];
      this.pointerState = {
        pointers: new Map(),
        mode: "none",
        lastPos: null,
        pinch: null,
      };

      this.markerInvNodes = [];
      this.markerNodes = [];

      this.visibleLayers = new Set();
      this.visibleDrawLayers = new Set();
      this.visibleGrids = new Set();
      this.visibleTextLayers = new Set();

      this.baseList = [];
      this.overlayList = [];
      this.activeBase = null;

      this.resolvedUrlMap = new Map();
      if (cfg && Array.isArray(cfg.resolvedImageUrls)) {
        for (const ref of cfg.resolvedImageUrls) {
          if (ref && ref.url && ref.destRel) {
            this.resolvedUrlMap.set(ref.destRel, ref.url);
          }
          if (ref && ref.url && ref.sourcePath) {
            this.resolvedUrlMap.set(ref.sourcePath, ref.url);
          }
          if (ref && ref.url && ref.url) {
            this.resolvedUrlMap.set(ref.url, ref.url);
          }
          if (ref && ref.url && ref.url.startsWith("/") && ref.destRel) {
            this.resolvedUrlMap.set(ref.destRel, ref.url);
          }
          if (ref && ref.url && ref.url && ref.url.startsWith("/") && ref.sourcePath) {
            this.resolvedUrlMap.set(ref.sourcePath, ref.url);
          }
          if (ref && ref.url && ref.url && ref.url.startsWith("/")) {
            const raw = ref.url.replace(/^\/+/, "");
            this.resolvedUrlMap.set(raw, ref.url);
          }
        }
      }

      this.mount();
    }

    mount() {
      const yaml = this.cfg?.yaml ?? {};

      this.rootEl.classList.add("zm-root");
      this.rootEl.innerHTML = "";

      if (Array.isArray(yaml.classes)) {
        for (const cls of yaml.classes) {
          if (typeof cls === "string") this.rootEl.classList.add(cls);
        }
      }

      if (yaml.width) this.rootEl.style.width = String(yaml.width);
      if (yaml.height) this.rootEl.style.height = String(yaml.height);
      if (yaml.responsive) {
        this.rootEl.style.width = "100%";
        this.rootEl.style.height = "auto";
      }

      this.viewportEl = createDiv(this.rootEl, "zm-viewport");
      this.clipEl = createDiv(this.viewportEl, "zm-clip");
      this.worldEl = createDiv(this.clipEl, "zm-world");
      this.imgEl = createEl(this.worldEl, "img", "zm-image");
      this.overlaysEl = createDiv(this.worldEl, "zm-overlays");
      this.gridEl = createDiv(this.worldEl, "zm-mapgrid");
      this.markersEl = createDiv(this.worldEl, "zm-markers");
      this.drawEl = createDiv(this.worldEl, "zm-draw");
      this.textEl = createDiv(this.worldEl, "zm-text");
      this.hudEl = createDiv(this.rootEl, "zm-hud");

      this.buildBaseList();
      this.buildOverlayList();
      this.initVisibleSets();
      this.buildHud();
      this.attachEventListeners();
      this.observeResize();
      this.loadActiveBase();
    }

    destroy() {
      for (const fn of this.cleanupFns) {
        try {
          fn();
        } catch {
          // ignore
        }
      }
      this.cleanupFns = [];
      if (this.ro) this.ro.disconnect();
      if (this.imgEl) {
        this.imgEl.onload = null;
        this.imgEl.onerror = null;
      }
      this.rootEl.innerHTML = "";
      this.rootEl.classList.remove("zm-root");
      this.rootEl.classList.remove("ttrpg-map-root");
      this.rootEl.removeAttribute("data-qz-ttrpg-map-inited");
    }

    attachEventListeners() {
      const onWheel = (event) => {
        if (!this.imgW || !this.imgH) return;
        event.preventDefault();
        const rect = this.viewportEl.getBoundingClientRect();
        const cx = event.clientX - rect.left;
        const cy = event.clientY - rect.top;
        const factor = Math.pow(1.1, event.deltaY < 0 ? 1 : -1);
        this.zoomAt(cx, cy, factor);
      };

      const onDblClick = (event) => {
        if (!this.imgW || !this.imgH) return;
        const rect = this.viewportEl.getBoundingClientRect();
        const cx = event.clientX - rect.left;
        const cy = event.clientY - rect.top;
        this.zoomAt(cx, cy, 1.5);
      };

      const onPointerDown = (event) => {
        if (!this.imgW || !this.imgH) return;
        this.viewportEl.setPointerCapture(event.pointerId);
        const rect = this.viewportEl.getBoundingClientRect();
        const pos = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        this.pointerState.pointers.set(event.pointerId, pos);

        if (this.pointerState.pointers.size === 1) {
          this.pointerState.mode = "drag";
          this.pointerState.lastPos = pos;
        } else if (this.pointerState.pointers.size === 2) {
          this.startPinch();
        }
      };

      const onPointerMove = (event) => {
        if (!this.pointerState.pointers.has(event.pointerId)) return;
        const rect = this.viewportEl.getBoundingClientRect();
        const pos = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        this.pointerState.pointers.set(event.pointerId, pos);

        if (this.pointerState.mode === "drag" && this.pointerState.pointers.size === 1) {
          const last = this.pointerState.lastPos;
          if (!last) return;
          const dx = pos.x - last.x;
          const dy = pos.y - last.y;
          this.pointerState.lastPos = pos;
          this.panBy(dx, dy);
        } else if (this.pointerState.mode === "pinch" && this.pointerState.pointers.size >= 2) {
          this.updatePinch();
        }
      };

      const onPointerUp = (event) => {
        if (this.pointerState.pointers.has(event.pointerId)) {
          this.pointerState.pointers.delete(event.pointerId);
        }
        try {
          this.viewportEl.releasePointerCapture(event.pointerId);
        } catch {
          // ignore
        }

        if (this.pointerState.pointers.size >= 2) {
          this.pointerState.mode = "pinch";
          this.startPinch();
          return;
        }

        if (this.pointerState.pointers.size === 1) {
          this.pointerState.mode = "drag";
          const last = Array.from(this.pointerState.pointers.values())[0];
          this.pointerState.lastPos = last;
        } else {
          this.pointerState.mode = "none";
          this.pointerState.lastPos = null;
          this.pointerState.pinch = null;
        }
      };

      this.addListener(this.viewportEl, "wheel", onWheel, { passive: false });
      this.addListener(this.viewportEl, "dblclick", onDblClick);
      this.addListener(this.viewportEl, "pointerdown", onPointerDown);
      this.addListener(this.viewportEl, "pointermove", onPointerMove);
      this.addListener(this.viewportEl, "pointerup", onPointerUp);
      this.addListener(this.viewportEl, "pointercancel", onPointerUp);
      this.addListener(this.viewportEl, "pointerleave", onPointerUp);
    }

    addListener(el, event, handler, options) {
      el.addEventListener(event, handler, options);
      this.cleanupFns.push(() => el.removeEventListener(event, handler, options));
    }

    observeResize() {
      if (!this.viewportEl) return;
      this.ro = new ResizeObserver(() => {
        const rect = this.viewportEl.getBoundingClientRect();
        this.vw = rect.width;
        this.vh = rect.height;
        if (this.imgW && this.imgH) {
          this.fitToView();
        }
      });
      this.ro.observe(this.viewportEl);
      this.cleanupFns.push(() => this.ro && this.ro.disconnect());
    }

    buildBaseList() {
      const yaml = this.cfg?.yaml ?? {};
      const bases = [];
      if (this.data && Array.isArray(this.data.bases) && this.data.bases.length > 0) {
        for (const entry of this.data.bases) {
          if (typeof entry === "string") bases.push({ path: entry });
          else if (entry && entry.path) bases.push({ path: entry.path, name: entry.name });
        }
      } else if (Array.isArray(yaml.imageBases)) {
        for (const entry of yaml.imageBases) {
          if (entry && entry.path) bases.push({ path: entry.path, name: entry.name });
        }
      } else if (yaml.image) {
        bases.push({ path: yaml.image, name: yaml.image });
      }
      this.baseList = bases;

      const preferred = this.data?.activeBase ?? yaml.image;
      if (preferred) {
        const match = bases.find((b) => b.path === preferred);
        if (match) {
          this.activeBase = match.path;
          return;
        }
      }
      this.activeBase = bases.length > 0 ? bases[0].path : null;
    }

    buildOverlayList() {
      const yaml = this.cfg?.yaml ?? {};
      const overlays = [];
      if (this.data && Array.isArray(this.data.overlays) && this.data.overlays.length > 0) {
        for (const o of this.data.overlays) {
          if (o && o.path) overlays.push(o);
        }
      } else if (Array.isArray(yaml.imageOverlays)) {
        for (const o of yaml.imageOverlays) {
          if (o && o.path) overlays.push(o);
        }
      }
      this.overlayList = overlays;
    }

    initVisibleSets() {
      if (this.data && Array.isArray(this.data.layers)) {
        for (const layer of this.data.layers) {
          if (layer && layer.visible !== false) this.visibleLayers.add(layer.id);
        }
      }
      if (this.data && Array.isArray(this.data.drawLayers)) {
        for (const layer of this.data.drawLayers) {
          if (layer && layer.visible !== false) this.visibleDrawLayers.add(layer.id);
        }
      }
      if (this.data && Array.isArray(this.data.grids)) {
        for (const grid of this.data.grids) {
          if (grid && grid.visible !== false) this.visibleGrids.add(grid.id);
        }
      }
      if (this.data && Array.isArray(this.data.textLayers)) {
        for (const layer of this.data.textLayers) {
          if (layer && layer.visible !== false) this.visibleTextLayers.add(layer.id);
        }
      }
    }

    buildHud() {
      if (!this.hudEl) return;

      if (this.baseList.length > 1) {
        const select = createEl(this.hudEl, "select", "zm-hud__select");
        select.setAttribute("aria-label", STRINGS.baseImage);
        for (const base of this.baseList) {
          const option = document.createElement("option");
          option.value = base.path;
          option.textContent = base.name || base.path;
          if (base.path === this.activeBase) option.selected = true;
          select.appendChild(option);
        }
        select.addEventListener("change", () => {
          const next = select.value;
          if (next) {
            this.setActiveBase(next);
          }
        });
        this.cleanupFns.push(() => select.remove());
      }

      const button = createEl(this.hudEl, "button", "zm-hud__button");
      button.type = "button";
      button.textContent = STRINGS.resetView;
      button.addEventListener("click", () => this.fitToView());
      this.cleanupFns.push(() => button.remove());

      const panel = createDiv(this.hudEl, "zm-hud__panel");
      const title = createDiv(panel, "zm-hud__panel-title");
      title.textContent = STRINGS.layers;

      if (this.data?.layers?.length) {
        const group = createDiv(panel, "zm-hud__panel-title");
        group.textContent = "Markers";
        for (const layer of this.data.layers) {
          this.addLayerToggle(panel, "marker", layer.id, layer.name, layer.visible, layer.locked);
        }
      }

      if (this.data?.drawLayers?.length) {
        const group = createDiv(panel, "zm-hud__panel-title");
        group.textContent = "Drawings";
        for (const layer of this.data.drawLayers) {
          this.addLayerToggle(panel, "draw", layer.id, layer.name, layer.visible, layer.locked);
        }
      }

      if (this.data?.grids?.length) {
        const group = createDiv(panel, "zm-hud__panel-title");
        group.textContent = "Grids";
        for (const grid of this.data.grids) {
          this.addLayerToggle(panel, "grid", grid.id, grid.name, grid.visible, false);
        }
      }

      if (this.data?.textLayers?.length) {
        const group = createDiv(panel, "zm-hud__panel-title");
        group.textContent = "Text";
        for (const layer of this.data.textLayers) {
          this.addLayerToggle(panel, "text", layer.id, layer.name, layer.visible, layer.locked);
        }
      }
    }

    addLayerToggle(panel, kind, id, name, visible, locked) {
      const item = createDiv(panel, "zm-hud__panel-item");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = visible !== false;
      if (locked) checkbox.disabled = true;
      const inputId = `ttrpg-${this.cfg?.yaml?.id || "map"}-${kind}-${id}`;
      checkbox.id = inputId;
      const label = document.createElement("label");
      label.htmlFor = inputId;
      label.textContent = name || id;
      item.appendChild(checkbox);
      item.appendChild(label);

      checkbox.addEventListener("change", () => {
        const isOn = checkbox.checked;
        if (kind === "marker") {
          if (isOn) this.visibleLayers.add(id);
          else this.visibleLayers.delete(id);
          this.renderMarkers();
        } else if (kind === "draw") {
          if (isOn) this.visibleDrawLayers.add(id);
          else this.visibleDrawLayers.delete(id);
          this.renderDrawings();
        } else if (kind === "grid") {
          if (isOn) this.visibleGrids.add(id);
          else this.visibleGrids.delete(id);
          this.renderGrids();
        } else if (kind === "text") {
          if (isOn) this.visibleTextLayers.add(id);
          else this.visibleTextLayers.delete(id);
          this.renderText();
        }
      });
    }

    setActiveBase(path) {
      if (this.activeBase === path) return;
      this.activeBase = path;
      this.loadActiveBase();
    }

    resolveUrl(path) {
      if (!path) return path;
      if (this.resolvedUrlMap.has(path)) return this.resolvedUrlMap.get(path);
      const normalized = path.replace(/^\/+/, "");
      if (this.resolvedUrlMap.has(normalized)) return this.resolvedUrlMap.get(normalized);
      return path;
    }

    loadActiveBase() {
      if (!this.activeBase || !this.imgEl) return;
      const url = this.resolveUrl(this.activeBase);
      this.imgEl.onload = () => {
        this.imgW = this.imgEl.naturalWidth || this.imgEl.width || 0;
        this.imgH = this.imgEl.naturalHeight || this.imgEl.height || 0;
        this.updateWorldSize();
        this.fitToView();
        this.renderAll();
      };
      this.imgEl.onerror = () => {
        this.renderError("invalid-markers");
      };
      this.imgEl.src = url || "";
    }

    updateWorldSize() {
      if (!this.worldEl) return;
      const w = `${this.imgW}px`;
      const h = `${this.imgH}px`;
      this.worldEl.style.width = w;
      this.worldEl.style.height = h;
      if (this.overlaysEl) {
        this.overlaysEl.style.width = w;
        this.overlaysEl.style.height = h;
      }
      if (this.markersEl) {
        this.markersEl.style.width = w;
        this.markersEl.style.height = h;
      }
    }

    fitToView() {
      if (!this.viewportEl || !this.imgW || !this.imgH) return;
      const rect = this.viewportEl.getBoundingClientRect();
      this.vw = rect.width;
      this.vh = rect.height;
      if (!this.vw || !this.vh) return;
      const s = Math.min(this.vw / this.imgW, this.vh / this.imgH);
      const tx = (this.vw - this.imgW * s) / 2;
      const ty = (this.vh - this.imgH * s) / 2;
      this.applyTransform(s, tx, ty, true);
    }

    zoomAt(cx, cy, factor) {
      if (!this.imgW || !this.imgH) return;
      const wx = (cx - this.tx) / this.scale;
      const wy = (cy - this.ty) / this.scale;
      const newScale = this.scale * factor;
      const newTx = cx - wx * newScale;
      const newTy = cy - wy * newScale;
      this.applyTransform(newScale, newTx, newTy);
    }

    panBy(dx, dy) {
      this.applyTransform(this.scale, this.tx + dx, this.ty + dy);
    }

    applyTransform(scale, tx, ty, force) {
      const yaml = this.cfg?.yaml ?? {};
      const minZoom = typeof yaml.minZoom === "number" ? yaml.minZoom : 0.25;
      const maxZoom = typeof yaml.maxZoom === "number" ? yaml.maxZoom : 8;
      const newScale = clamp(scale, minZoom, maxZoom);
      let newTx = tx;
      let newTy = ty;
      const panClamp = this.data?.panClamp !== false;

      if (panClamp && this.vw && this.vh && this.imgW && this.imgH) {
        const worldW = this.imgW * newScale;
        const worldH = this.imgH * newScale;

        if (worldW < this.vw) {
          newTx = (this.vw - worldW) / 2;
        } else {
          const minX = this.vw - worldW;
          const maxX = 0;
          newTx = clamp(newTx, minX, maxX);
        }

        if (worldH < this.vh) {
          newTy = (this.vh - worldH) / 2;
        } else {
          const minY = this.vh - worldH;
          const maxY = 0;
          newTy = clamp(newTy, minY, maxY);
        }
      }

      const scaleChanged = newScale !== this.scale;
      this.scale = newScale;
      this.tx = newTx;
      this.ty = newTy;

      if (this.worldEl) {
        this.worldEl.style.transform = `translate3d(${this.tx}px, ${this.ty}px, 0) scale3d(${this.scale}, ${this.scale}, 1)`;
      }

      if (scaleChanged || force) {
        this.updateMarkerInvScaleOnly();
        this.updateMarkerZoomVisibilityOnly();
      }
    }

    startPinch() {
      const points = Array.from(this.pointerState.pointers.values());
      if (points.length < 2) return;
      const p0 = points[0];
      const p1 = points[1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const dist = Math.hypot(dx, dy) || 1;
      const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
      this.pointerState.mode = "pinch";
      this.pointerState.pinch = {
        startDist: dist,
        startMid: mid,
        startScale: this.scale,
        startTx: this.tx,
        startTy: this.ty,
      };
    }

    updatePinch() {
      const points = Array.from(this.pointerState.pointers.values());
      if (points.length < 2 || !this.pointerState.pinch) return;
      const p0 = points[0];
      const p1 = points[1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const dist = Math.hypot(dx, dy) || 1;
      const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };

      const pinch = this.pointerState.pinch;
      const ratio = dist / pinch.startDist;
      const newScale = pinch.startScale * ratio;

      const wx = (pinch.startMid.x - pinch.startTx) / pinch.startScale;
      const wy = (pinch.startMid.y - pinch.startTy) / pinch.startScale;
      let newTx = pinch.startMid.x - wx * newScale;
      let newTy = pinch.startMid.y - wy * newScale;
      newTx += mid.x - pinch.startMid.x;
      newTy += mid.y - pinch.startMid.y;

      this.applyTransform(newScale, newTx, newTy);
    }

    renderAll() {
      this.renderOverlays();
      this.renderGrids();
      this.renderDrawings();
      this.renderText();
      this.renderMarkers();
    }

    renderError(code) {
      const msg = ERROR_MESSAGES[code] || STRINGS.errorInvalidMarkers;
      this.rootEl.innerHTML = "";
      const errorEl = createDiv(this.rootEl, "ttrpg-map-error");
      errorEl.innerHTML = `<strong>${STRINGS.errorTitle}</strong>${msg}`;
    }

    renderOverlays() {
      if (!this.overlaysEl) return;
      this.overlaysEl.innerHTML = "";
      for (const overlay of this.overlayList) {
        if (!overlay.visible) continue;
        const img = createEl(this.overlaysEl, "img", "zm-overlay-image");
        const url = this.resolveUrl(overlay.path);
        img.src = url || "";
        img.style.width = `${this.imgW}px`;
        img.style.height = `${this.imgH}px`;
      }
    }

    renderMarkers() {
      if (!this.markersEl) return;
      this.markersEl.innerHTML = "";
      this.markerInvNodes = [];
      this.markerNodes = [];

      const markers = this.data?.markers ?? [];
      const pinOverrides = this.data?.pinSizeOverrides ?? {};
      const defaultSize = 32;

      for (const marker of markers) {
        if (!marker) continue;
        if (!this.visibleLayers.has(marker.layer)) continue;

        const x = marker.x * this.imgW;
        const y = marker.y * this.imgH;
        const markerEl = createDiv(this.markersEl, "zm-marker");
        markerEl.style.left = `${x}px`;
        markerEl.style.top = `${y}px`;
        markerEl.dataset.layer = marker.layer || "";
        if (typeof marker.minZoom === "number") markerEl.dataset.minz = String(marker.minZoom);
        if (typeof marker.maxZoom === "number") markerEl.dataset.maxz = String(marker.maxZoom);

        const inv = createDiv(markerEl, "zm-marker-inv");
        const anchor = createDiv(inv, "zm-marker-anchor");

        let size = defaultSize;
        if (marker.stickerSize) size = marker.stickerSize;
        if (marker.iconKey && pinOverrides[marker.iconKey]) {
          size = pinOverrides[marker.iconKey];
        }

        let anchorX = size / 2;
        let anchorY = size;
        if (marker.type === "sticker") {
          anchorX = size / 2;
          anchorY = size / 2;
        }

        anchor.style.transform = `translate(${-anchorX}px, ${-anchorY}px)`;

        const iconEl = document.createElement("img");
        iconEl.className = "zm-marker-icon";
        if (marker.type === "sticker") {
          const stickerUrl = marker.resolvedStickerUrl || this.resolveUrl(marker.stickerPath);
          iconEl.src = stickerUrl || "";
          iconEl.style.width = `${size}px`;
          iconEl.style.height = `${size}px`;
        } else {
          const iconKey = marker.iconKey || "pin-red";
          let iconUrl = ICONS[iconKey];
          if (!iconUrl && marker.iconColor) {
            iconUrl = pinSvg(marker.iconColor);
          }
          if (!iconUrl) {
            console.warn(`[TTRPGMap] Unknown iconKey: ${iconKey}, falling back to pin-red`);
            iconUrl = ICONS["pin-red"];
          }
          iconEl.src = iconUrl;
          iconEl.style.width = `${size}px`;
          iconEl.style.height = `${size}px`;
        }

        if (marker.tooltip) {
          iconEl.alt = marker.tooltip;
        }

        const link = marker.resolvedHref || marker.link;
        if (link) {
          const linkEl = document.createElement("a");
          linkEl.className = "zm-marker-link";
          linkEl.href = link;
          linkEl.appendChild(iconEl);
          anchor.appendChild(linkEl);
        } else {
          anchor.appendChild(iconEl);
        }

        if (marker.tooltip) {
          const tooltip = createDiv(markerEl, "zm-marker-tooltip");
          tooltip.textContent = marker.tooltip;
        }

        if (marker.tooltipLabelAlways && marker.tooltip) {
          const label = createDiv(markerEl, "zm-marker-label");
          label.textContent = marker.tooltip;
          if (marker.tooltipLabelPosition === "above") {
            label.style.top = "auto";
            label.style.bottom = "100%";
            label.style.marginTop = "0";
            label.style.marginBottom = "4px";
          }
          if (typeof marker.tooltipLabelOffsetX === "number") {
            label.style.marginLeft = `${marker.tooltipLabelOffsetX}px`;
          }
          if (typeof marker.tooltipLabelOffsetY === "number") {
            label.style.marginTop = `${marker.tooltipLabelOffsetY}px`;
          }
        }

        this.markerInvNodes.push(inv);
        this.markerNodes.push(markerEl);
      }

      this.updateMarkerInvScaleOnly();
      this.updateMarkerZoomVisibilityOnly();
    }

    updateMarkerInvScaleOnly() {
      const invScale = this.scale ? 1 / this.scale : 1;
      for (const inv of this.markerInvNodes) {
        inv.style.transform = `scale(${invScale})`;
      }
    }

    updateMarkerZoomVisibilityOnly() {
      for (const el of this.markerNodes) {
        const minz = el.dataset.minz ? Number(el.dataset.minz) : null;
        const maxz = el.dataset.maxz ? Number(el.dataset.maxz) : null;
        let hidden = false;
        if (typeof minz === "number" && !Number.isNaN(minz) && this.scale < minz) {
          hidden = true;
        }
        if (typeof maxz === "number" && !Number.isNaN(maxz) && this.scale > maxz) {
          hidden = true;
        }
        if (hidden) el.classList.add("zm-marker--hidden");
        else el.classList.remove("zm-marker--hidden");
      }
    }

    renderGrids() {
      if (!this.gridEl) return;
      this.gridEl.innerHTML = "";
      const grids = this.data?.grids ?? [];
      if (grids.length === 0) return;

      const svg = createSvgEl(this.gridEl, "svg", "zm-mapgrid__svg");
      svg.setAttribute("width", this.imgW);
      svg.setAttribute("height", this.imgH);

      for (const grid of grids) {
        if (!grid || !grid.visible) continue;
        if (!this.visibleGrids.has(grid.id)) continue;
        if (grid.boundBase && this.activeBase && grid.boundBase !== this.activeBase) continue;

        const pathEl = createSvgEl(svg, "path", "zm-mapgrid__path");
        const d =
          grid.shape === "hex"
            ? buildHexGridPath(this.imgW, this.imgH, grid.spacing, grid.offsetX, grid.offsetY)
            : buildSquareGridPath(this.imgW, this.imgH, grid.spacing, grid.offsetX, grid.offsetY);
        pathEl.setAttribute("d", d);
        pathEl.setAttribute("stroke", grid.color || "#fff");
        pathEl.setAttribute("stroke-width", String(grid.width || 1));
        pathEl.setAttribute("opacity", String(grid.opacity ?? 1));
      }
    }

    renderDrawings() {
      if (!this.drawEl) return;
      this.drawEl.innerHTML = "";
      const drawings = this.data?.drawings ?? [];
      if (!drawings.length) return;

      const svg = createSvgEl(this.drawEl, "svg", "zm-draw__svg");
      svg.setAttribute("width", this.imgW);
      svg.setAttribute("height", this.imgH);

      const defs = createSvgEl(svg, "defs");
      const drawLayerMap = new Map();
      if (this.data?.drawLayers) {
        for (const layer of this.data.drawLayers) drawLayerMap.set(layer.id, layer);
      }

      for (const drawing of drawings) {
        if (!drawing || !drawing.visible) continue;
        if (!this.visibleDrawLayers.has(drawing.layerId)) continue;

        const layer = drawLayerMap.get(drawing.layerId);
        if (layer?.boundBase && this.activeBase && layer.boundBase !== this.activeBase) continue;

        const style = drawing.style || {};
        const shapeEl = buildDrawingShape(svg, defs, drawing, style, this.imgW, this.imgH);
        if (!shapeEl) continue;
        shapeEl.setAttribute("class", "zm-draw__shape");
        applyDrawingStyle(shapeEl, defs, drawing, style);

        if (style.label) {
          const pos = drawingLabelPosition(drawing, this.imgW, this.imgH);
          if (pos) {
            const textEl = createSvgEl(svg, "text");
            textEl.setAttribute("x", pos.x);
            textEl.setAttribute("y", pos.y);
            textEl.setAttribute("fill", style.strokeColor || "#fff");
            textEl.setAttribute("font-size", "12");
            textEl.textContent = style.label;
          }
        }

        if (style.distanceLabel) {
          const label = computeDistanceLabel(drawing, this.imgW, this.imgH);
          const pos = drawingLabelPosition(drawing, this.imgW, this.imgH);
          if (label && pos) {
            const textEl = createSvgEl(svg, "text");
            textEl.setAttribute("x", pos.x);
            textEl.setAttribute("y", pos.y + 14);
            textEl.setAttribute("fill", style.strokeColor || "#fff");
            textEl.setAttribute("font-size", "11");
            textEl.textContent = label;
          }
        }
      }
    }

    renderText() {
      if (!this.textEl) return;
      this.textEl.innerHTML = "";
      const layers = this.data?.textLayers ?? [];
      if (!layers.length) return;
      const svg = createSvgEl(this.textEl, "svg", "zm-text__svg");
      svg.setAttribute("width", this.imgW);
      svg.setAttribute("height", this.imgH);

      for (const layer of layers) {
        if (!layer || !layer.visible) continue;
        if (!this.visibleTextLayers.has(layer.id)) continue;
        if (layer.boundBase && this.activeBase && layer.boundBase !== this.activeBase) continue;

        for (const box of layer.boxes || []) {
          const style = { ...layer.style, ...box.style };
          for (const baseline of box.lines || []) {
            if (!baseline.text) continue;
            const x0 = baseline.x0 * this.imgW;
            const y0 = baseline.y0 * this.imgH;
            const x1 = baseline.x1 * this.imgW;
            const y1 = baseline.y1 * this.imgH;
            const angle = Math.atan2(y1 - y0, x1 - x0) * (180 / Math.PI);
            const textEl = createSvgEl(svg, "text");
            textEl.setAttribute("x", x0);
            textEl.setAttribute("y", y0 + (style.baselineOffset || 0));
            textEl.setAttribute("fill", style.color || "#fff");
            textEl.setAttribute("font-family", style.fontFamily || "inherit");
            textEl.setAttribute("font-size", style.fontSize || 12);
            if (style.fontWeight) textEl.setAttribute("font-weight", style.fontWeight);
            if (style.italic) textEl.setAttribute("font-style", "italic");
            if (style.letterSpacing) textEl.setAttribute("letter-spacing", style.letterSpacing);
            if (Math.abs(angle) > 0.01) {
              textEl.setAttribute("transform", `rotate(${angle} ${x0} ${y0})`);
            }
            textEl.textContent = baseline.text;
          }
        }
      }
    }
  }

  function buildDrawingShape(svg, defs, drawing, style, imgW, imgH) {
    if (drawing.kind === "rect" && drawing.rect) {
      const rect = createSvgEl(svg, "rect");
      const x0 = drawing.rect.x0 * imgW;
      const y0 = drawing.rect.y0 * imgH;
      const x1 = drawing.rect.x1 * imgW;
      const y1 = drawing.rect.y1 * imgH;
      rect.setAttribute("x", Math.min(x0, x1));
      rect.setAttribute("y", Math.min(y0, y1));
      rect.setAttribute("width", Math.abs(x1 - x0));
      rect.setAttribute("height", Math.abs(y1 - y0));
      return rect;
    }
    if (drawing.kind === "circle" && drawing.circle) {
      const circle = createSvgEl(svg, "circle");
      circle.setAttribute("cx", drawing.circle.cx * imgW);
      circle.setAttribute("cy", drawing.circle.cy * imgH);
      circle.setAttribute("r", drawing.circle.r * imgW);
      return circle;
    }
    if (drawing.kind === "polygon" && drawing.polygon) {
      const path = createSvgEl(svg, "path");
      const d = pointsToPath(drawing.polygon, imgW, imgH, true);
      path.setAttribute("d", d);
      return path;
    }
    if (drawing.kind === "polyline" && drawing.polyline) {
      const path = createSvgEl(svg, "path");
      const d = pointsToPath(drawing.polyline, imgW, imgH, false);
      path.setAttribute("d", d);
      return path;
    }
    return null;
  }

  function applyDrawingStyle(shapeEl, defs, drawing, style) {
    if (style.strokeColor) shapeEl.setAttribute("stroke", style.strokeColor);
    if (style.strokeWidth != null) shapeEl.setAttribute("stroke-width", style.strokeWidth);
    if (style.strokeOpacity != null) shapeEl.setAttribute("stroke-opacity", style.strokeOpacity);
    if (Array.isArray(style.strokeDash)) {
      shapeEl.setAttribute("stroke-dasharray", style.strokeDash.join(","));
    }

    let fill = "none";
    if (style.fillColor) fill = style.fillColor;
    if (style.fillPattern && style.fillPattern !== "none") {
      if (style.fillPattern === "solid") {
        fill = style.fillColor || "none";
      } else if (style.fillPattern === "striped") {
        const id = `pat-${drawing.id}`;
        const pattern = createSvgEl(defs, "pattern");
        pattern.setAttribute("id", id);
        pattern.setAttribute("patternUnits", "userSpaceOnUse");
        const spacing = style.fillPatternSpacing || 8;
        pattern.setAttribute("width", spacing);
        pattern.setAttribute("height", spacing);
        const rect = createSvgEl(pattern, "rect");
        rect.setAttribute("width", spacing);
        rect.setAttribute("height", spacing);
        rect.setAttribute("fill", style.fillColor || "transparent");
        const line = createSvgEl(pattern, "line");
        line.setAttribute("x1", "0");
        line.setAttribute("y1", "0");
        line.setAttribute("x2", spacing);
        line.setAttribute("y2", spacing);
        line.setAttribute("stroke", style.strokeColor || style.fillColor || "#fff");
        line.setAttribute("stroke-width", style.fillPatternStrokeWidth || 1);
        line.setAttribute("stroke-opacity", style.fillPatternOpacity || 0.5);
        fill = `url(#${id})`;
      } else {
        fill = style.fillColor || "none";
      }
    }

    if (style.fillOpacity != null) shapeEl.setAttribute("fill-opacity", style.fillOpacity);
    shapeEl.setAttribute("fill", fill);

    if (style.arrowEnd) {
      const id = `arrow-${drawing.id}`;
      const marker = createSvgEl(defs, "marker");
      marker.setAttribute("id", id);
      marker.setAttribute("markerWidth", "10");
      marker.setAttribute("markerHeight", "7");
      marker.setAttribute("refX", "10");
      marker.setAttribute("refY", "3.5");
      marker.setAttribute("orient", "auto");
      const path = createSvgEl(marker, "path");
      path.setAttribute("d", "M0,0 L10,3.5 L0,7 Z");
      path.setAttribute("fill", style.strokeColor || "#fff");
      shapeEl.setAttribute("marker-end", `url(#${id})`);
    }
  }

  function pointsToPath(points, imgW, imgH, closed) {
    if (!points || points.length === 0) return "";
    let d = "";
    points.forEach((p, idx) => {
      const x = p.x * imgW;
      const y = p.y * imgH;
      d += `${idx === 0 ? "M" : "L"}${x} ${y} `;
    });
    if (closed) d += "Z";
    return d.trim();
  }

  function drawingLabelPosition(drawing, imgW, imgH) {
    if (drawing.kind === "rect" && drawing.rect) {
      const x0 = drawing.rect.x0 * imgW;
      const y0 = drawing.rect.y0 * imgH;
      const x1 = drawing.rect.x1 * imgW;
      const y1 = drawing.rect.y1 * imgH;
      return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
    }
    if (drawing.kind === "circle" && drawing.circle) {
      return {
        x: drawing.circle.cx * imgW,
        y: drawing.circle.cy * imgH,
      };
    }
    if (drawing.kind === "polygon" && drawing.polygon) {
      let x = 0;
      let y = 0;
      for (const p of drawing.polygon) {
        x += p.x * imgW;
        y += p.y * imgH;
      }
      return { x: x / drawing.polygon.length, y: y / drawing.polygon.length };
    }
    if (drawing.kind === "polyline" && drawing.polyline) {
      let x = 0;
      let y = 0;
      for (const p of drawing.polyline) {
        x += p.x * imgW;
        y += p.y * imgH;
      }
      return { x: x / drawing.polyline.length, y: y / drawing.polyline.length };
    }
    return null;
  }

  function computeDistanceLabel(drawing, imgW, imgH) {
    if (drawing.kind === "circle" && drawing.circle) {
      return `${Math.round(drawing.circle.r * imgW * 2)} px`;
    }
    if (drawing.kind === "rect" && drawing.rect) {
      const w = Math.abs(drawing.rect.x1 - drawing.rect.x0) * imgW;
      const h = Math.abs(drawing.rect.y1 - drawing.rect.y0) * imgH;
      return `${Math.round(w)}×${Math.round(h)} px`;
    }
    if (drawing.kind === "polygon" && drawing.polygon) {
      const len = polylineLength(drawing.polygon, imgW, imgH, true);
      return `${Math.round(len)} px`;
    }
    if (drawing.kind === "polyline" && drawing.polyline) {
      const len = polylineLength(drawing.polyline, imgW, imgH, false);
      return `${Math.round(len)} px`;
    }
    return null;
  }

  function polylineLength(points, imgW, imgH, closed) {
    if (!points || points.length < 2) return 0;
    let len = 0;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const dx = (p1.x - p0.x) * imgW;
      const dy = (p1.y - p0.y) * imgH;
      len += Math.hypot(dx, dy);
    }
    if (closed) {
      const p0 = points[0];
      const p1 = points[points.length - 1];
      const dx = (p1.x - p0.x) * imgW;
      const dy = (p1.y - p0.y) * imgH;
      len += Math.hypot(dx, dy);
    }
    return len;
  }

  function buildSquareGridPath(imgW, imgH, spacing, offsetX, offsetY) {
    const s = Math.max(1, spacing || 0);
    const ox = (((offsetX || 0) % s) + s) % s;
    const oy = (((offsetY || 0) % s) + s) % s;
    let d = "";

    for (let x = ox; x <= imgW; x += s) {
      d += `M${x} 0 L${x} ${imgH} `;
    }
    for (let y = oy; y <= imgH; y += s) {
      d += `M0 ${y} L${imgW} ${y} `;
    }
    return d.trim();
  }

  function buildHexGridPath(imgW, imgH, spacing, offsetX, offsetY) {
    const size = Math.max(1, spacing || 0);
    const dx = Math.sqrt(3) * size;
    const dy = 1.5 * size;
    let d = "";
    const cols = Math.ceil(imgW / dx) + 2;
    const rows = Math.ceil(imgH / dy) + 2;
    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const cx = col * dx + ((row % 2) * dx) / 2 + (offsetX || 0);
        const cy = row * dy + (offsetY || 0);
        const points = hexPoints(cx, cy, size);
        d += `M${points[0].x} ${points[0].y} `;
        for (let i = 1; i < points.length; i++) {
          d += `L${points[i].x} ${points[i].y} `;
        }
        d += "Z ";
      }
    }
    return d.trim();
  }

  function hexPoints(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    return pts;
  }

  function renderErrorOnly(rootEl, errorCode) {
    const msg = ERROR_MESSAGES[errorCode] || STRINGS.errorInvalidMarkers;
    rootEl.innerHTML = "";
    const errorEl = createDiv(rootEl, "ttrpg-map-error");
    errorEl.innerHTML = `<strong>${STRINGS.errorTitle}</strong>${msg}`;
  }

  function init() {
    const roots = document.querySelectorAll(".ttrpg-map-root:not([data-qz-ttrpg-map-inited])");
    roots.forEach((root) => {
      const errorAttr = root.getAttribute("data-qz-ttrpg-map-error");
      const cfgRaw = root.getAttribute("data-qz-ttrpg-map-cfg");
      const dataRaw = root.getAttribute("data-qz-ttrpg-map-data");

      if (!cfgRaw) return;
      root.setAttribute("data-qz-ttrpg-map-inited", "true");

      try {
        const cfg = JSON.parse(cfgRaw);
        if (errorAttr || cfg.error) {
          renderErrorOnly(root, errorAttr || cfg.error);
          return;
        }
        if (!dataRaw) return;
        const data = JSON.parse(dataRaw);
        const instance = new ReadOnlyMapInstance(root, cfg, data);
        if (typeof window !== "undefined" && window.addCleanup) {
          window.addCleanup(() => instance.destroy());
        }
      } catch (err) {
        console.error("[TTRPGMap] init failed:", err);
        renderErrorOnly(root, "invalid-markers");
      }
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("nav", init);
    document.addEventListener("render", init);
    init();
  }
})();
