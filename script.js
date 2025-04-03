document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements - Main UI
  const layersContainer = document.getElementById("layers-container");
  const layersList = document.getElementById("layers-list");
  const addLayerButton = document.getElementById("add-layer-button");
  const deleteLayerButton = document.getElementById("delete-layer-button");
  const moveUpButton = document.getElementById("move-up-button");
  const moveDownButton = document.getElementById("move-down-button");
  const colorPicker = document.getElementById("color-picker");
  const brushSizeSlider = document.getElementById("brush-size");
  const brushSizeValue = document.getElementById("brush-size-value");
  const brushTypeSelector = document.getElementById("brush-type");
  const clearButton = document.getElementById("clear-button");
  const saveButton = document.getElementById("save-button");
  const undoButton = document.getElementById("undo-button");
  const redoButton = document.getElementById("redo-button");
  const canvasWidthInput = document.getElementById("canvas-width");
  const canvasHeightInput = document.getElementById("canvas-height");
  const resizeButton = document.getElementById("resize-button");
  const aiPromptInput = document.getElementById("ai-prompt");
  const aiGenerateButton = document.getElementById("ai-generate-button");
  const imageUpload = document.getElementById("image-upload");
  const importMode = document.getElementById("import-mode");

  // DOM Elements - Filters
  const brightnessSlider = document.getElementById("brightness");
  const contrastSlider = document.getElementById("contrast");
  const saturationSlider = document.getElementById("saturation");
  const brightnessValue = document.getElementById("brightness-value");
  const contrastValue = document.getElementById("contrast-value");
  const saturationValue = document.getElementById("saturation-value");
  const grayscaleButton = document.getElementById("grayscale-filter");
  const sepiaButton = document.getElementById("sepia-filter");
  const invertButton = document.getElementById("invert-filter");
  const resetFiltersButton = document.getElementById("reset-filters");
  const applyFiltersButton = document.getElementById("apply-filters");

  // DOM Elements - Collaboration
  const collabStatus = document.getElementById("collab-status");
  const usernameInput = document.getElementById("username-input");
  const roomInput = document.getElementById("room-input");
  const joinRoomButton = document.getElementById("join-room-button");
  const createRoomButton = document.getElementById("create-room-button");
  const leaveRoomButton = document.getElementById("leave-room-button");
  const activeUsers = document.getElementById("active-users");
  const cursorsContainer = document.getElementById("cursors-container");
  const chatMessages = document.getElementById("chat-messages");
  const chatInput = document.getElementById("chat-input");
  const sendMessageButton = document.getElementById("send-message-button");

  // DOM Elements - Presets
  const presetsList = document.getElementById("presets-list");
  const presetNameInput = document.getElementById("preset-name");
  const savePresetButton = document.getElementById("save-preset-button");

  // DOM Elements - Custom Brush
  const brushPreview = document.getElementById("brush-preview");
  const brushShape = document.getElementById("brush-shape");
  const brushTexture = document.getElementById("brush-texture");
  const brushOpacity = document.getElementById("brush-opacity");
  const brushScatter = document.getElementById("brush-scatter");
  const brushRotation = document.getElementById("brush-rotation");
  const brushOpacityValue = document.getElementById("brush-opacity-value");
  const brushScatterValue = document.getElementById("brush-scatter-value");
  const brushRotationValue = document.getElementById("brush-rotation-value");
  const applyBrushButton = document.getElementById("apply-brush-button");
  const customBrushModal = document.getElementById("custom-brush-modal");
  const customBrushName = document.getElementById("custom-brush-name");
  const saveCustomBrush = document.getElementById("save-custom-brush");
  const cancelCustomBrush = document.getElementById("cancel-custom-brush");
  const closeModal = document.querySelector(".close-modal");

  // App state
  const state = {
    isDrawing: false,
    layers: [],
    activeLayerIndex: -1,
    canvasWidth: 800,
    canvasHeight: 600,
    color: "#000000",
    brushSize: 5,
    brushType: "pencil",
    lastX: 0,
    lastY: 0,
    undoStack: [],
    redoStack: [],
    maxUndoSteps: 20,
    filters: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      grayscale: false,
      sepia: false,
      invert: false,
    },
    collaboration: {
      socket: null,
      connected: false,
      connecting: false,
      username: "",
      roomId: "",
      users: [],
      cursors: {},
    },
    presets: [],
    customBrushes: [],
    currentCustomBrush: {
      shape: "circle",
      texture: "solid",
      opacity: 100,
      scatter: 0,
      rotation: 0,
    },
  };

  // Initialize the app
  function init() {
    // Set canvas dimensions
    state.canvasWidth = parseInt(canvasWidthInput.value);
    state.canvasHeight = parseInt(canvasHeightInput.value);

    // Create initial layer
    addLayer();

    // Update UI
    updateLayersList();
    updateBrushSize(state.brushSize);
    updateHistoryButtons();
    updateFilterValues();
    updateCustomBrushPreview();

    // Load saved presets from localStorage
    loadPresets();
    loadCustomBrushes();

    // Add event listeners
    setupEventListeners();
  }

  // Layer management functions
  function addLayer() {
    const layerId = `layer-${state.layers.length}`;
    const layerCanvas = document.createElement("canvas");
    layerCanvas.width = state.canvasWidth;
    layerCanvas.height = state.canvasHeight;
    layerCanvas.className = "canvas-layer";
    layerCanvas.id = layerId;

    const context = layerCanvas.getContext("2d");
    context.lineCap = "round";
    context.lineJoin = "round";

    const layer = {
      id: layerId,
      name: `Layer ${state.layers.length + 1}`,
      canvas: layerCanvas,
      context: context,
      visible: true,
    };

    state.layers.push(layer);
    layersContainer.appendChild(layerCanvas);

    // Set as active layer
    setActiveLayer(state.layers.length - 1);

    // Clear redo stack when adding a new layer
    state.redoStack = [];

    return layer;
  }

  function deleteLayer() {
    if (state.layers.length <= 1 || state.activeLayerIndex === -1) {
      alert("Cannot delete the only layer");
      return;
    }

    // Remove canvas from DOM
    const layerToRemove = state.layers[state.activeLayerIndex];
    layerToRemove.canvas.remove();

    // Remove from layers array
    state.layers.splice(state.activeLayerIndex, 1);

    // Update active layer
    const newIndex = Math.min(state.activeLayerIndex, state.layers.length - 1);
    setActiveLayer(newIndex);

    // Update UI
    updateLayersList();

    // Clear redo stack when deleting a layer
    state.redoStack = [];

    // Send layer delete event to collaborators
    if (state.collaboration.connected) {
      sendDrawingAction({
        type: "deleteLayer",
        layerIndex: state.activeLayerIndex,
      });
    }
  }

  function moveLayerUp() {
    if (state.activeLayerIndex <= 0) return;

    // Swap layers in array
    const temp = state.layers[state.activeLayerIndex];
    state.layers[state.activeLayerIndex] =
      state.layers[state.activeLayerIndex - 1];
    state.layers[state.activeLayerIndex - 1] = temp;

    // Update active layer index
    setActiveLayer(state.activeLayerIndex - 1);

    // Update DOM order (for visual stacking)
    reorderCanvasElements();

    // Update UI
    updateLayersList();

    // Send layer reorder event to collaborators
    if (state.collaboration.connected) {
      sendDrawingAction({
        type: "reorderLayers",
        layers: state.layers.map((layer) => layer.id),
      });
    }
  }

  function moveLayerDown() {
    if (state.activeLayerIndex >= state.layers.length - 1) return;

    // Swap layers in array
    const temp = state.layers[state.activeLayerIndex];
    state.layers[state.activeLayerIndex] =
      state.layers[state.activeLayerIndex + 1];
    state.layers[state.activeLayerIndex + 1] = temp;

    // Update active layer index
    setActiveLayer(state.activeLayerIndex + 1);

    // Update DOM order (for visual stacking)
    reorderCanvasElements();

    // Update UI
    updateLayersList();

    // Send layer reorder event to collaborators
    if (state.collaboration.connected) {
      sendDrawingAction({
        type: "reorderLayers",
        layers: state.layers.map((layer) => layer.id),
      });
    }
  }

  function reorderCanvasElements() {
    // Remove all canvases
    state.layers.forEach((layer) => {
      if (layer.canvas.parentNode) {
        layer.canvas.remove();
      }
    });

    // Add them back in the correct order (first = bottom layer)
    state.layers.forEach((layer) => {
      layersContainer.appendChild(layer.canvas);
    });
  }

  function setActiveLayer(index) {
    if (index < 0 || index >= state.layers.length) return;

    state.activeLayerIndex = index;

    // Update UI to show active layer
    updateLayersList();

    // Send active layer change to collaborators
    if (state.collaboration.connected) {
      sendDrawingAction({
        type: "setActiveLayer",
        layerIndex: index,
      });
    }
  }

  function toggleLayerVisibility(index) {
    if (index < 0 || index >= state.layers.length) return;

    state.layers[index].visible = !state.layers[index].visible;
    state.layers[index].canvas.style.display = state.layers[index].visible
      ? "block"
      : "none";

    // Update UI
    updateLayersList();

    // Send layer visibility change to collaborators
    if (state.collaboration.connected) {
      sendDrawingAction({
        type: "toggleLayerVisibility",
        layerIndex: index,
        visible: state.layers[index].visible,
      });
    }
  }

  function updateLayersList() {
    layersList.innerHTML = "";

    // Create layer items in reverse order (top layer first in list)
    for (let i = state.layers.length - 1; i >= 0; i--) {
      const layer = state.layers[i];
      const layerItem = document.createElement("div");
      layerItem.className = `layer-item ${
        i === state.activeLayerIndex ? "active" : ""
      }`;
      layerItem.dataset.index = i;

      const visibilityIcon = document.createElement("span");
      visibilityIcon.className = "layer-visibility";
      visibilityIcon.innerHTML = layer.visible ? "👁️" : "👁️‍🗨️";
      visibilityIcon.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleLayerVisibility(i);
      });

      const layerName = document.createElement("span");
      layerName.className = "layer-name";
      layerName.textContent = layer.name;

      layerItem.appendChild(visibilityIcon);
      layerItem.appendChild(layerName);

      layerItem.addEventListener("click", () => {
        setActiveLayer(i);
      });

      layersList.appendChild(layerItem);
    }
  }

  // Drawing functions
  function startDrawing(event) {
    if (state.activeLayerIndex === -1) return;

    state.isDrawing = true;
    const { offsetX, offsetY } = getCoordinates(event);
    state.lastX = offsetX;
    state.lastY = offsetY;

    // For spray brush, start the spray interval
    if (state.brushType === "spray") {
      drawSpray(offsetX, offsetY);
    }

    // Save state for undo
    saveCurrentLayerState();

    // Send drawing start event to collaborators
    if (state.collaboration.connected) {
      sendDrawingAction({
        type: "startDrawing",
        x: offsetX,
        y: offsetY,
        brushType: state.brushType,
        color: state.color,
        brushSize: state.brushSize,
        layerIndex: state.activeLayerIndex,
      });
    }
  }

  function draw(event) {
    if (!state.isDrawing || state.activeLayerIndex === -1) return;
    event.preventDefault();

    const { offsetX, offsetY } = getCoordinates(event);
    const activeLayer = state.layers[state.activeLayerIndex];

    switch (state.brushType) {
      case "pencil":
        drawPencil(offsetX, offsetY, activeLayer.context);
        break;
      case "marker":
        drawMarker(offsetX, offsetY, activeLayer.context);
        break;
      case "eraser":
        drawEraser(offsetX, offsetY, activeLayer.context);
        break;
      case "spray":
        drawSpray(offsetX, offsetY, activeLayer.context);
        break;
      case "custom":
        drawCustomBrush(offsetX, offsetY, activeLayer.context);
        break;
      default:
        drawPencil(offsetX, offsetY, activeLayer.context);
    }

    // Send drawing event to collaborators
    if (state.collaboration.connected) {
      sendDrawingAction({
        type: "draw",
        x: offsetX,
        y: offsetY,
        lastX: state.lastX,
        lastY: state.lastY,
        brushType: state.brushType,
        layerIndex: state.activeLayerIndex,
      });
    }

    state.lastX = offsetX;
    state.lastY = offsetY;
  }

  function stopDrawing() {
    if (state.isDrawing) {
      state.isDrawing = false;

      // Send drawing stop event to collaborators
      if (state.collaboration.connected) {
        sendDrawingAction({
          type: "stopDrawing",
        });
      }
    }
  }

  // Brush types
  function drawPencil(x, y, context) {
    context.globalCompositeOperation = "source-over";
    context.strokeStyle = state.color;
    context.lineWidth = state.brushSize;
    context.globalAlpha = 1.0;

    context.beginPath();
    context.moveTo(state.lastX, state.lastY);
    context.lineTo(x, y);
    context.stroke();
  }

  function drawMarker(x, y, context) {
    context.globalCompositeOperation = "source-over";
    context.strokeStyle = state.color;
    context.lineWidth = state.brushSize * 2;
    context.globalAlpha = 0.6;

    context.beginPath();
    context.moveTo(state.lastX, state.lastY);
    context.lineTo(x, y);
    context.stroke();

    context.globalAlpha = 1.0;
  }

  function drawEraser(x, y, context) {
    context.globalCompositeOperation = "destination-out";
    context.lineWidth = state.brushSize * 2;

    context.beginPath();
    context.moveTo(state.lastX, state.lastY);
    context.lineTo(x, y);
    context.stroke();

    context.globalCompositeOperation = "source-over";
  }

  function drawSpray(x, y, context) {
    context.globalCompositeOperation = "source-over";
    context.fillStyle = state.color;

    const density = state.brushSize * 2;
    const radius = state.brushSize * 5;

    for (let i = 0; i < density; i++) {
      const offsetX = getRandomInt(-radius, radius);
      const offsetY = getRandomInt(-radius, radius);

      // Only draw within the circle
      if (offsetX * offsetX + offsetY * offsetY <= radius * radius) {
        context.beginPath();
        context.arc(x + offsetX, y + offsetY, 1, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawCustomBrush(x, y, context) {
    context.globalCompositeOperation = "source-over";
    context.fillStyle = state.color;
    context.strokeStyle = state.color;

    const opacity = state.currentCustomBrush.opacity / 100;
    const scatter = state.currentCustomBrush.scatter;
    const rotation = (state.currentCustomBrush.rotation * Math.PI) / 180;

    // Apply opacity
    context.globalAlpha = opacity;

    // Calculate scatter offset if needed
    let drawX = x;
    let drawY = y;
    if (scatter > 0) {
      const scatterRadius = (state.brushSize * scatter) / 20;
      drawX += getRandomInt(-scatterRadius, scatterRadius);
      drawY += getRandomInt(-scatterRadius, scatterRadius);
    }

    // Save context state for rotation
    context.save();
    context.translate(drawX, drawY);
    context.rotate(rotation);

    // Draw based on shape and texture
    const size = state.brushSize * 2;
    switch (state.currentCustomBrush.shape) {
      case "circle":
        drawCustomCircle(context, size, state.currentCustomBrush.texture);
        break;
      case "square":
        drawCustomSquare(context, size, state.currentCustomBrush.texture);
        break;
      case "triangle":
        drawCustomTriangle(context, size, state.currentCustomBrush.texture);
        break;
      case "star":
        drawCustomStar(context, size, state.currentCustomBrush.texture);
        break;
      case "heart":
        drawCustomHeart(context, size, state.currentCustomBrush.texture);
        break;
      default:
        drawCustomCircle(context, size, state.currentCustomBrush.texture);
    }

    // Restore context state
    context.restore();
    context.globalAlpha = 1.0;
  }

  function drawCustomCircle(context, size, texture) {
    const radius = size / 2;

    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);

    applyTexture(context, texture, -radius, -radius, size, size);
  }

  function drawCustomSquare(context, size, texture) {
    const halfSize = size / 2;

    context.beginPath();
    context.rect(-halfSize, -halfSize, size, size);

    applyTexture(context, texture, -halfSize, -halfSize, size, size);
  }

  function drawCustomTriangle(context, size, texture) {
    const halfSize = size / 2;

    context.beginPath();
    context.moveTo(0, -halfSize);
    context.lineTo(-halfSize, halfSize);
    context.lineTo(halfSize, halfSize);
    context.closePath();

    applyTexture(context, texture, -halfSize, -halfSize, size, size);
  }

  function drawCustomStar(context, size, texture) {
    const outerRadius = size / 2;
    const innerRadius = outerRadius * 0.4;
    const spikes = 5;

    context.beginPath();

    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes;
      const x = radius * Math.sin(angle);
      const y = -radius * Math.cos(angle);

      if (i === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }

    context.closePath();
    applyTexture(context, texture, -outerRadius, -outerRadius, size, size);
  }

  function drawCustomHeart(context, size, texture) {
    const scale = size / 100;

    context.beginPath();
    context.moveTo(0, -30 * scale);
    context.bezierCurveTo(
      0 * scale,
      -70 * scale,
      -50 * scale,
      -70 * scale,
      -50 * scale,
      0 * scale
    );
    context.bezierCurveTo(
      -50 * scale,
      35 * scale,
      0 * scale,
      50 * scale,
      0 * scale,
      50 * scale
    );
    context.bezierCurveTo(
      0 * scale,
      50 * scale,
      50 * scale,
      35 * scale,
      50 * scale,
      0 * scale
    );
    context.bezierCurveTo(
      50 * scale,
      -70 * scale,
      0 * scale,
      -70 * scale,
      0 * scale,
      -30 * scale
    );
    context.closePath();

    applyTexture(
      context,
      texture,
      -50 * scale,
      -70 * scale,
      100 * scale,
      120 * scale
    );
  }

  function applyTexture(context, texture, x, y, width, height) {
    switch (texture) {
      case "solid":
        context.fill();
        break;
      case "dots":
        const dotPattern = createDotPattern(context);
        context.fillStyle = dotPattern;
        context.fill();
        break;
      case "lines":
        const linePattern = createLinePattern(context);
        context.fillStyle = linePattern;
        context.fill();
        break;
      case "rough":
        context.fill();
        applyRoughTexture(context, x, y, width, height);
        break;
      case "gradient":
        const gradient = context.createRadialGradient(0, 0, 0, 0, 0, width / 2);
        gradient.addColorStop(0, state.color);
        gradient.addColorStop(1, adjustColorBrightness(state.color, -30));
        context.fillStyle = gradient;
        context.fill();
        break;
      default:
        context.fill();
    }
  }

  function createDotPattern(context) {
    const patternCanvas = document.createElement("canvas");
    const patternContext = patternCanvas.getContext("2d");
    const patternSize = 10;

    patternCanvas.width = patternSize;
    patternCanvas.height = patternSize;

    // Clear pattern canvas
    patternContext.fillStyle = "rgba(0, 0, 0, 0)";
    patternContext.fillRect(0, 0, patternSize, patternSize);

    // Draw dot
    patternContext.fillStyle = state.color;
    patternContext.beginPath();
    patternContext.arc(patternSize / 2, patternSize / 2, 1, 0, Math.PI * 2);
    patternContext.fill();

    return context.createPattern(patternCanvas, "repeat");
  }

  function createLinePattern(context) {
    const patternCanvas = document.createElement("canvas");
    const patternContext = patternCanvas.getContext("2d");
    const patternSize = 10;

    patternCanvas.width = patternSize;
    patternCanvas.height = patternSize;

    // Clear pattern canvas
    patternContext.fillStyle = "rgba(0, 0, 0, 0)";
    patternContext.fillRect(0, 0, patternSize, patternSize);

    // Draw line
    patternContext.strokeStyle = state.color;
    patternContext.lineWidth = 1;
    patternContext.beginPath();
    patternContext.moveTo(0, 0);
    patternContext.lineTo(patternSize, patternSize);
    patternContext.stroke();

    return context.createPattern(patternCanvas, "repeat");
  }

  function applyRoughTexture(context, x, y, width, height) {
    const roughness = width / 10;
    const points = 20;

    context.save();
    context.globalCompositeOperation = "source-atop";
    context.strokeStyle = adjustColorBrightness(state.color, -20);
    context.lineWidth = 1;

    for (let i = 0; i < points; i++) {
      const startX = x + Math.random() * width;
      const startY = y + Math.random() * height;
      const endX = startX + (Math.random() - 0.5) * roughness;
      const endY = startY + (Math.random() - 0.5) * roughness;

      context.beginPath();
      context.moveTo(startX, startY);
      context.lineTo(endX, endY);
      context.stroke();
    }

    context.restore();
  }

  function adjustColorBrightness(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const r = (num >> 16) + percent;
    const g = ((num >> 8) & 0x00ff) + percent;
    const b = (num & 0x0000ff) + percent;

    const newR = Math.min(255, Math.max(0, r));
    const newG = Math.min(255, Math.max(0, g));
    const newB = Math.min(255, Math.max(0, b));

    return `#${((newR << 16) | (newG << 8) | newB)
      .toString(16)
      .padStart(6, "0")}`;
  }

  // Helper function for random integers
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Get coordinates for both mouse and touch events
  function getCoordinates(event) {
    if (event.touches && event.touches[0]) {
      const rect = event.target.getBoundingClientRect();
      return {
        offsetX: event.touches[0].clientX - rect.left,
        offsetY: event.touches[0].clientY - rect.top,
      };
    }
    return {
      offsetX: event.offsetX,
      offsetY: event.offsetY,
    };
  }

  // History management (undo/redo)
  function saveCurrentLayerState() {
    if (state.activeLayerIndex === -1) return;

    const activeLayer = state.layers[state.activeLayerIndex];
    const imageData = activeLayer.context.getImageData(
      0,
      0,
      state.canvasWidth,
      state.canvasHeight
    );

    // Add to undo stack
    state.undoStack.push({
      layerIndex: state.activeLayerIndex,
      imageData: imageData,
    });

    // Limit undo stack size
    if (state.undoStack.length > state.maxUndoSteps) {
      state.undoStack.shift();
    }

    // Clear redo stack when new action is performed
    state.redoStack = [];

    // Update UI
    updateHistoryButtons();
  }

  function undo() {
    if (state.undoStack.length === 0) return;

    const undoAction = state.undoStack.pop();
    const layer = state.layers[undoAction.layerIndex];

    // Save current state to redo stack
    const currentImageData = layer.context.getImageData(
      0,
      0,
      state.canvasWidth,
      state.canvasHeight
    );

    state.redoStack.push({
      layerIndex: undoAction.layerIndex,
      imageData: currentImageData,
    });

    // Restore previous state
    layer.context.putImageData(undoAction.imageData, 0, 0);

    // Update UI
    updateHistoryButtons();

    // Send undo event to collaborators
    if (state.collaboration.connected) {
      sendDrawingAction({
        type: "undo",
        layerIndex: undoAction.layerIndex,
        imageData: layer.canvas.toDataURL(),
      });
    }
  }

  function redo() {
    if (state.redoStack.length === 0) return;

    const redoAction = state.redoStack.pop();
    const layer = state.layers[redoAction.layerIndex];

    // Save current state to undo stack
    const currentImageData = layer.context.getImageData(
      0,
      0,
      state.canvasWidth,
      state.canvasHeight
    );

    state.undoStack.push({
      layerIndex: redoAction.layerIndex,
      imageData: currentImageData,
    });

    // Restore redo state
    layer.context.putImageData(redoAction.imageData, 0, 0);

    // Update UI
    updateHistoryButtons();

    // Send redo event to collaborators
    if (state.collaboration.connected) {
      sendDrawingAction({
        type: "redo",
        layerIndex: redoAction.layerIndex,
        imageData: layer.canvas.toDataURL(),
      });
    }
  }

  function updateHistoryButtons() {
    undoButton.disabled = state.undoStack.length === 0;
    redoButton.disabled = state.redoStack.length === 0;

    // Visual feedback for disabled buttons
    undoButton.style.opacity = undoButton.disabled ? "0.5" : "1";
    redoButton.style.opacity = redoButton.disabled ? "0.5" : "1";
  }

  // Canvas operations
  function clearActiveLayer() {
    if (state.activeLayerIndex === -1) return;

    const activeLayer = state.layers[state.activeLayerIndex];

    // Save current state for undo
    saveCurrentLayerState();

    // Clear the canvas
    activeLayer.context.clearRect(0, 0, state.canvasWidth, state.canvasHeight);

    // Send clear layer event to collaborators
    if (state.collaboration.connected) {
      sendDrawingAction({
        type: "clearLayer",
        layerIndex: state.activeLayerIndex,
      });
    }
  }

  function resizeCanvas() {
    const newWidth = parseInt(canvasWidthInput.value);
    const newHeight = parseInt(canvasHeightInput.value);

    if (
      isNaN(newWidth) ||
      isNaN(newHeight) ||
      newWidth < 300 ||
      newHeight < 200
    ) {
      alert("Please enter valid dimensions (width ≥ 300, height ≥ 200)");
      return;
    }

    // Create temporary canvases to store layer contents
    const tempLayers = state.layers.map((layer) => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = state.canvasWidth;
      tempCanvas.height = state.canvasHeight;
      const tempContext = tempCanvas.getContext("2d");
      tempContext.drawImage(layer.canvas, 0, 0);
      return tempCanvas;
    });

    // Update state dimensions
    state.canvasWidth = newWidth;
    state.canvasHeight = newHeight;

    // Resize all layer canvases
    state.layers.forEach((layer, index) => {
      layer.canvas.width = newWidth;
      layer.canvas.height = newHeight;

      // Reset context properties (they get reset on resize)
      layer.context = layer.canvas.getContext("2d");
      layer.context.lineCap = "round";
      layer.context.lineJoin = "round";

      // Draw the old content on the resized canvas
      layer.context.drawImage(tempLayers[index], 0, 0);
    });

    // Clear history stacks after resize
    state.undoStack = [];
    state.redoStack = [];
    updateHistoryButtons();

    // Send resize event to collaborators
    if (state.collaboration.connected) {
      sendDrawingAction({
        type: "resizeCanvas",
        width: newWidth,
        height: newHeight,
      });
    }
  }

  function saveDrawing() {
    // Create a composite canvas with all visible layers
    const compositeCanvas = document.createElement("canvas");
    compositeCanvas.width = state.canvasWidth;
    compositeCanvas.height = state.canvasHeight;
    const compositeContext = compositeCanvas.getContext("2d");

    // Draw all visible layers from bottom to top
    state.layers.forEach((layer) => {
      if (layer.visible) {
        compositeContext.drawImage(layer.canvas, 0, 0);
      }
    });

    // Create download link
    const dataUrl = compositeCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = "drawing.png";
    link.href = dataUrl;
    link.click();
  }

  // Image import functions
  function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file || !file.type.match(/image.*/)) return;

    const reader = new FileReader();
    reader.onload = function (readerEvent) {
      const img = new Image();
      img.onload = function () {
        importImage(img);
      };
      img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  }

  function importImage(img) {
    const mode = importMode.value;

    switch (mode) {
      case "new-layer":
        importAsNewLayer(img);
        break;
      case "background":
        importAsBackground(img);
        break;
      case "replace":
        importAsReplacement(img);
        break;
    }
  }

  function importAsNewLayer(img) {
    const layer = addLayer();

    // Scale image to fit canvas if needed
    const scale = Math.min(
      state.canvasWidth / img.width,
      state.canvasHeight / img.height
    );

    const width = img.width * scale;
    const height = img.height * scale;
    const x = (state.canvasWidth - width) / 2;
    const y = (state.canvasHeight - height) / 2;

    layer.context.drawImage(img, x, y, width, height);
    layer.name = "Image Layer " + state.layers.length;

    updateLayersList();
    saveCurrentLayerState();

    // Send import image event to collaborators
    if (state.collaboration.connected) {
      sendDrawingAction({
        type: "importImage",
        layerIndex: state.activeLayerIndex,
        imageData: layer.canvas.toDataURL(),
        layerName: layer.name,
      });
    }
  }

  function importAsBackground(img) {
    // Create a new layer at the bottom
    const layer = addLayer();

    // Move it to the bottom
    while (state.activeLayerIndex > 0) {
      moveLayerDown();
    }

    // Scale image to cover canvas
    const scale = Math.max(
      state.canvasWidth / img.width,
      state.canvasHeight / img.height
    );

    const width = img.width * scale;
    const height = img.height * scale;
    const x = (state.canvasWidth - width) / 2;
    const y = (state.canvasHeight - height) / 2;

    layer.context.drawImage(img, x, y, width, height);
    layer.name = "Background";

    updateLayersList();
    saveCurrentLayerState();

    // Send import background event to collaborators
    if (state.collaboration.connected) {
      sendDrawingAction({
        type: "importBackground",
        imageData: layer.canvas.toDataURL(),
      });
    }
  }

  function importAsReplacement(img) {
    if (state.activeLayerIndex === -1) return;

    const activeLayer = state.layers[state.activeLayerIndex];

    // Save current state for undo
    saveCurrentLayerState();

    // Clear the layer
    activeLayer.context.clearRect(0, 0, state.canvasWidth, state.canvasHeight);

    // Scale image to fit canvas if needed
    const scale = Math.min(
      state.canvasWidth / img.width,
      state.canvasHeight / img.height
    );

    const width = img.width * scale;
    const height = img.height * scale;
    const x = (state.canvasWidth - width) / 2;
    const y = (state.canvasHeight - height) / 2;

    activeLayer.context.drawImage(img, x, y, width, height);

    // Send replace image event to collaborators
    if (state.collaboration.connected) {
      sendDrawingAction({
        type: "replaceLayerWithImage",
        layerIndex: state.activeLayerIndex,
        imageData: activeLayer.canvas.toDataURL(),
      });
    }
  }

  // Filter functions
  function updateFilterValues() {
    brightnessValue.textContent = state.filters.brightness;
    contrastValue.textContent = state.filters.contrast;
    saturationValue.textContent = state.filters.saturation;

    brightnessSlider.value = state.filters.brightness;
    contrastSlider.value = state.filters.contrast;
    saturationSlider.value = state.filters.saturation;
  }

  function updateFilterState(filterType, value) {
    state.filters[filterType] = value;
    updateFilterValues();
  }

  function resetFilters() {
    state.filters = {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      grayscale: false,
      sepia: false,
      invert: false,
    };
    updateFilterValues();
  }

  function applyFilters() {
    if (state.activeLayerIndex === -1) return;

    const activeLayer = state.layers[state.activeLayerIndex];

    // Save current state for undo
    saveCurrentLayerState();

    // Get image data
    const imageData = activeLayer.context.getImageData(
      0,
      0,
      state.canvasWidth,
      state.canvasHeight
    );
    const data = imageData.data;

    // Apply filters
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Skip transparent pixels
      if (data[i + 3] === 0) continue;

      // Apply brightness
      if (state.filters.brightness !== 0) {
        const brightness = state.filters.brightness * 2.55;
        r += brightness;
        g += brightness;
        b += brightness;
      }

      // Apply contrast
      if (state.filters.contrast !== 0) {
        const contrast = state.filters.contrast / 100 + 1;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        b = factor * (b - 128) + 128;
      }

      // Apply saturation
      if (state.filters.saturation !== 0) {
        const saturation = state.filters.saturation / 100 + 1;
        const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
        r = gray + saturation * (r - gray);
        g = gray + saturation * (g - gray);
        b = gray + saturation * (b - gray);
      }

      // Apply grayscale
      if (state.filters.grayscale) {
        const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
        r = g = b = gray;
      }

      // Apply sepia
      if (state.filters.sepia) {
        const newR = 0.393 * r + 0.769 * g + 0.189 * b;
        const newG = 0.349 * r + 0.686 * g + 0.168 * b;
        const newB = 0.272 * r + 0.534 * g + 0.131 * b;
        r = newR;
        g = newG;
        b = newB;
      }

      // Apply invert
      if (state.filters.invert) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      }

      // Clamp values
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    // Put the modified image data back
    activeLayer.context.putImageData(imageData, 0, 0);

    // Send filter apply event to collaborators
    if (state.collaboration.connected) {
      sendDrawingAction({
        type: "applyFilters",
        layerIndex: state.activeLayerIndex,
        imageData: activeLayer.canvas.toDataURL(),
      });
    }

    // Reset filters after applying
    resetFilters();
  }

  // AI Drawing function (simulated)
  function generateAIDrawing() {
    if (state.activeLayerIndex === -1) return;

    const prompt = aiPromptInput.value.trim();

    if (!prompt) {
      alert("Please enter a prompt for the AI to draw");
      return;
    }

    // Show loading state
    aiGenerateButton.textContent = "Generating...";
    aiGenerateButton.disabled = true;

    // Save current state for undo
    saveCurrentLayerState();

    // Simulate AI processing time
    setTimeout(() => {
      // Clear active layer for new drawing
      const activeLayer = state.layers[state.activeLayerIndex];
      activeLayer.context.clearRect(
        0,
        0,
        state.canvasWidth,
        state.canvasHeight
      );

      // Generate a simple drawing based on the prompt
      simulateAIDrawing(prompt, activeLayer.context);

      // Send AI drawing event to collaborators
      if (state.collaboration.connected) {
        sendDrawingAction({
          type: "aiDrawing",
          layerIndex: state.activeLayerIndex,
          prompt: prompt,
          imageData: activeLayer.canvas.toDataURL(),
        });
      }

      // Reset button
      aiGenerateButton.textContent = "Generate";
      aiGenerateButton.disabled = false;
    }, 1500);
  }

  // Simulate AI drawing based on prompt
  function simulateAIDrawing(prompt, context) {
    const lowerPrompt = prompt.toLowerCase();

    // Set a random color based on the prompt
    const colors = [
      "#FF5733",
      "#33FF57",
      "#3357FF",
      "#F3FF33",
      "#FF33F3",
      "#33FFF3",
      "#FF3333",
      "#33FF33",
    ];

    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    context.strokeStyle = randomColor;
    context.fillStyle = randomColor;

    // Draw different shapes based on keywords in the prompt
    if (lowerPrompt.includes("circle") || lowerPrompt.includes("round")) {
      drawRandomCircles(5 + Math.floor(Math.random() * 10), context);
    } else if (lowerPrompt.includes("square") || lowerPrompt.includes("box")) {
      drawRandomSquares(5 + Math.floor(Math.random() * 10), context);
    } else if (lowerPrompt.includes("triangle")) {
      drawRandomTriangles(5 + Math.floor(Math.random() * 10), context);
    } else if (lowerPrompt.includes("line") || lowerPrompt.includes("stroke")) {
      drawRandomLines(10 + Math.floor(Math.random() * 20), context);
    } else if (lowerPrompt.includes("star")) {
      drawRandomStars(3 + Math.floor(Math.random() * 7), context);
    } else if (lowerPrompt.includes("heart")) {
      drawRandomHearts(3 + Math.floor(Math.random() * 5), context);
    } else {
      // Default: mix of shapes
      drawRandomMixedShapes(15 + Math.floor(Math.random() * 15), context);
    }
  }

  // Helper functions for AI drawing simulation
  function drawRandomCircles(count, context) {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * state.canvasWidth;
      const y = Math.random() * state.canvasHeight;
      const radius = 10 + Math.random() * 50;

      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.stroke();

      if (Math.random() > 0.5) {
        context.globalAlpha = 0.3;
        context.fill();
        context.globalAlpha = 1.0;
      }
    }
  }

  function drawRandomSquares(count, context) {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * state.canvasWidth;
      const y = Math.random() * state.canvasHeight;
      const size = 20 + Math.random() * 60;

      context.beginPath();
      context.rect(x - size / 2, y - size / 2, size, size);
      context.stroke();

      if (Math.random() > 0.5) {
        context.globalAlpha = 0.3;
        context.fill();
        context.globalAlpha = 1.0;
      }
    }
  }

  function drawRandomTriangles(count, context) {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * state.canvasWidth;
      const y = Math.random() * state.canvasHeight;
      const size = 30 + Math.random() * 70;

      context.beginPath();
      context.moveTo(x, y - size / 2);
      context.lineTo(x - size / 2, y + size / 2);
      context.lineTo(x + size / 2, y + size / 2);
      context.closePath();
      context.stroke();

      if (Math.random() > 0.5) {
        context.globalAlpha = 0.3;
        context.fill();
        context.globalAlpha = 1.0;
      }
    }
  }

  function drawRandomLines(count, context) {
    for (let i = 0; i < count; i++) {
      const x1 = Math.random() * state.canvasWidth;
      const y1 = Math.random() * state.canvasHeight;
      const x2 = Math.random() * state.canvasWidth;
      const y2 = Math.random() * state.canvasHeight;

      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
    }
  }

  function drawRandomStars(count, context) {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * state.canvasWidth;
      const y = Math.random() * state.canvasHeight;
      const outerRadius = 30 + Math.random() * 50;
      const innerRadius = outerRadius * 0.4;
      const spikes = 5;

      context.beginPath();

      for (let j = 0; j < spikes * 2; j++) {
        const radius = j % 2 === 0 ? outerRadius : innerRadius;
        const angle = (j * Math.PI) / spikes;
        const pointX = x + radius * Math.sin(angle);
        const pointY = y + radius * Math.cos(angle);

        if (j === 0) {
          context.moveTo(pointX, pointY);
        } else {
          context.lineTo(pointX, pointY);
        }
      }

      context.closePath();
      context.stroke();

      if (Math.random() > 0.3) {
        context.globalAlpha = 0.3;
        context.fill();
        context.globalAlpha = 1.0;
      }
    }
  }

  function drawRandomHearts(count, context) {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * state.canvasWidth;
      const y = Math.random() * state.canvasHeight;
      const size = 20 + Math.random() * 40;

      context.beginPath();
      context.moveTo(x, y - size * 0.3);
      context.bezierCurveTo(
        x,
        y - size * 0.7,
        x - size,
        y - size * 0.7,
        x - size,
        y
      );
      context.bezierCurveTo(
        x - size,
        y + size * 0.7,
        x,
        y + size,
        x,
        y + size * 0.3
      );
      context.bezierCurveTo(x, y + size, x + size, y + size * 0.7, x + size, y);
      context.bezierCurveTo(
        x + size,
        y - size * 0.7,
        x,
        y - size * 0.7,
        x,
        y - size * 0.3
      );
      context.closePath();
      context.stroke();

      context.globalAlpha = 0.3;
      context.fill();
      context.globalAlpha = 1.0;
    }
  }

  function drawRandomMixedShapes(count, context) {
    const shapes = [
      () => drawRandomCircles(1, context),
      () => drawRandomSquares(1, context),
      () => drawRandomTriangles(1, context),
      () => drawRandomLines(2, context),
      () => drawRandomStars(1, context),
      () => drawRandomHearts(1, context),
    ];

    for (let i = 0; i < count; i++) {
      // Pick a random color for each shape
      const randomColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
      context.strokeStyle = randomColor;
      context.fillStyle = randomColor;

      // Draw a random shape
      const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
      randomShape();
    }
  }

  // Tool Presets functions
  function savePreset() {
    const presetName = presetNameInput.value.trim();
    if (!presetName) {
      alert("Please enter a name for your preset");
      return;
    }

    const preset = {
      id: Date.now().toString(),
      name: presetName,
      color: state.color,
      brushSize: state.brushSize,
      brushType: state.brushType,
      customBrush:
        state.brushType === "custom" ? { ...state.currentCustomBrush } : null,
    };

    state.presets.push(preset);
    savePresetsToLocalStorage();
    updatePresetsList();
    presetNameInput.value = "";
  }

  function loadPreset(preset) {
    state.color = preset.color;
    state.brushSize = preset.brushSize;
    state.brushType = preset.brushType;

    // Update UI
    colorPicker.value = state.color;
    brushSizeSlider.value = state.brushSize;
    brushTypeSelector.value = state.brushType;
    updateBrushSize(state.brushSize);

    // If it's a custom brush, load the custom brush settings
    if (preset.brushType === "custom" && preset.customBrush) {
      state.currentCustomBrush = { ...preset.customBrush };
      updateCustomBrushControls();
      updateCustomBrushPreview();
    }
  }

  function deletePreset(presetId) {
    state.presets = state.presets.filter((preset) => preset.id !== presetId);
    savePresetsToLocalStorage();
    updatePresetsList();
  }

  function updatePresetsList() {
    presetsList.innerHTML = "";

    if (state.presets.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.className = "empty-message";
      emptyMessage.textContent = "No saved presets";
      presetsList.appendChild(emptyMessage);
      return;
    }

    state.presets.forEach((preset) => {
      const presetItem = document.createElement("div");
      presetItem.className = "preset-item";
      presetItem.dataset.id = preset.id;

      const presetColor = document.createElement("div");
      presetColor.className = "preset-color";
      presetColor.style.backgroundColor = preset.color;

      const presetInfo = document.createElement("div");
      presetInfo.className = "preset-info";

      const presetName = document.createElement("div");
      presetName.className = "preset-name";
      presetName.textContent = preset.name;

      const presetDetails = document.createElement("div");
      presetDetails.className = "preset-details";
      presetDetails.textContent = `${preset.brushType}, ${preset.brushSize}px`;

      const presetDelete = document.createElement("span");
      presetDelete.className = "preset-delete";
      presetDelete.innerHTML = "×";
      presetDelete.addEventListener("click", (e) => {
        e.stopPropagation();
        deletePreset(preset.id);
      });

      presetInfo.appendChild(presetName);
      presetInfo.appendChild(presetDetails);
      presetItem.appendChild(presetColor);
      presetItem.appendChild(presetInfo);
      presetItem.appendChild(presetDelete);

      presetItem.addEventListener("click", () => {
        loadPreset(preset);
      });

      presetsList.appendChild(presetItem);
    });
  }

  function savePresetsToLocalStorage() {
    localStorage.setItem("drawingAppPresets", JSON.stringify(state.presets));
  }

  function loadPresets() {
    const savedPresets = localStorage.getItem("drawingAppPresets");
    if (savedPresets) {
      state.presets = JSON.parse(savedPresets);
      updatePresetsList();
    }
  }

  // Custom Brush functions
  function updateCustomBrushPreview() {
    const previewContext = brushPreview.getContext("2d");
    previewContext.clearRect(0, 0, brushPreview.width, brushPreview.height);

    // Set background
    previewContext.fillStyle = "#ffffff";
    previewContext.fillRect(0, 0, brushPreview.width, brushPreview.height);

    // Draw grid for transparency
    previewContext.fillStyle = "#f0f0f0";
    const gridSize = 10;
    for (let x = 0; x < brushPreview.width; x += gridSize) {
      for (let y = 0; y < brushPreview.height; y += gridSize) {
        if ((x / gridSize + y / gridSize) % 2 === 0) {
          previewContext.fillRect(x, y, gridSize, gridSize);
        }
      }
    }

    // Save original color
    const originalColor = state.color;
    state.color = colorPicker.value;

    // Draw brush preview
    previewContext.save();
    previewContext.translate(brushPreview.width / 2, brushPreview.height / 2);

    const size = Math.min(brushPreview.width, brushPreview.height) * 0.6;
    const opacity = state.currentCustomBrush.opacity / 100;
    const rotation = (state.currentCustomBrush.rotation * Math.PI) / 180;

    previewContext.rotate(rotation);
    previewContext.globalAlpha = opacity;

    switch (state.currentCustomBrush.shape) {
      case "circle":
        drawCustomCircle(
          previewContext,
          size,
          state.currentCustomBrush.texture
        );
        break;
      case "square":
        drawCustomSquare(
          previewContext,
          size,
          state.currentCustomBrush.texture
        );
        break;
      case "triangle":
        drawCustomTriangle(
          previewContext,
          size,
          state.currentCustomBrush.texture
        );
        break;
      case "star":
        drawCustomStar(previewContext, size, state.currentCustomBrush.texture);
        break;
      case "heart":
        drawCustomHeart(previewContext, size, state.currentCustomBrush.texture);
        break;
    }

    previewContext.restore();

    // Restore original color
    state.color = originalColor;
  }

  function updateCustomBrushControls() {
    brushShape.value = state.currentCustomBrush.shape;
    brushTexture.value = state.currentCustomBrush.texture;
    brushOpacity.value = state.currentCustomBrush.opacity;
    brushScatter.value = state.currentCustomBrush.scatter;
    brushRotation.value = state.currentCustomBrush.rotation;

    brushOpacityValue.textContent = `${state.currentCustomBrush.opacity}%`;
    brushScatterValue.textContent = `${state.currentCustomBrush.scatter}%`;
    brushRotationValue.textContent = `${state.currentCustomBrush.rotation}°`;
  }

  function applyCustomBrush() {
    // Update brush type to custom
    state.brushType = "custom";
    brushTypeSelector.value = "custom";

    // Show save brush modal
    customBrushModal.classList.add("show");
  }

  function saveCustomBrushToLibrary() {
    const brushName = customBrushName.value.trim();
    if (!brushName) {
      alert("Please enter a name for your custom brush");
      return;
    }

    const customBrush = {
      id: Date.now().toString(),
      name: brushName,
      ...state.currentCustomBrush,
    };

    state.customBrushes.push(customBrush);
    saveCustomBrushesToLocalStorage();
    customBrushModal.classList.remove("show");
    customBrushName.value = "";

    // Add to brush type selector
    addCustomBrushToSelector(customBrush);
  }

  function addCustomBrushToSelector(customBrush) {
    // Check if option already exists
    const existingOption = Array.from(brushTypeSelector.options).find(
      (option) => option.value === `custom-${customBrush.id}`
    );

    if (!existingOption) {
      const option = document.createElement("option");
      option.value = `custom-${customBrush.id}`;
      option.textContent = `${customBrush.name} (Custom)`;
      brushTypeSelector.appendChild(option);
    }
  }

  function loadCustomBrushes() {
    const savedBrushes = localStorage.getItem("drawingAppCustomBrushes");
    if (savedBrushes) {
      state.customBrushes = JSON.parse(savedBrushes);

      // Add custom brushes to selector
      state.customBrushes.forEach((brush) => {
        addCustomBrushToSelector(brush);
      });
    }
  }

  function saveCustomBrushesToLocalStorage() {
    localStorage.setItem(
      "drawingAppCustomBrushes",
      JSON.stringify(state.customBrushes)
    );
  }

  function selectCustomBrushFromLibrary(brushId) {
    const customBrush = state.customBrushes.find(
      (brush) => `custom-${brush.id}` === brushId
    );

    if (customBrush) {
      state.currentCustomBrush = {
        shape: customBrush.shape,
        texture: customBrush.texture,
        opacity: customBrush.opacity,
        scatter: customBrush.scatter,
        rotation: customBrush.rotation,
      };

      updateCustomBrushControls();
      updateCustomBrushPreview();
    }
  }

  // Collaboration functions
  function setupWebSocket() {
    // For this example, we'll simulate WebSocket with a mock implementation
    // In a real application, you would connect to a real WebSocket server
    const mockSocket = {
      isConnected: false,
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
      send: function (data) {
        console.log("Mock WebSocket sending data:", data);
        // Simulate receiving the message back (echo)
        setTimeout(() => {
          if (this.onmessage && this.isConnected) {
            const message = JSON.parse(data);

            // Don't echo back cursor updates to avoid duplicates
            if (message.type !== "cursorMove") {
              this.onmessage({ data: data });
            }

            // Simulate other users in the room
            if (message.type === "joinRoom" || message.type === "createRoom") {
              simulateOtherUsers(message.roomId);
            }
          }
        }, 100);
      },
      close: function () {
        this.isConnected = false;
        if (this.onclose) {
          this.onclose({ code: 1000, reason: "Connection closed" });
        }
      },
      connect: function () {
        setTimeout(() => {
          this.isConnected = true;
          if (this.onopen) {
            this.onopen();
          }
        }, 500);
      },
    };

    return mockSocket;
  }

  function simulateOtherUsers(roomId) {
    // Simulate 2 other users joining the room
    const simulatedUsers = [
      { id: "user1", name: "Alice", color: "#FF5733" },
      { id: "user2", name: "Bob", color: "#33A1FF" },
    ];

    setTimeout(() => {
      simulatedUsers.forEach((user) => {
        const joinMessage = {
          type: "userJoined",
          userId: user.id,
          username: user.name,
          color: user.color,
          roomId: roomId,
        };

        if (state.collaboration.socket.onmessage) {
          state.collaboration.socket.onmessage({
            data: JSON.stringify(joinMessage),
          });
        }

        // Simulate cursor movements
        simulateCursorMovements(user);
      });

      // Simulate chat messages
      simulateChatMessages(simulatedUsers);
    }, 1000);
  }

  function simulateCursorMovements(user) {
    const interval = setInterval(() => {
      if (!state.collaboration.connected) {
        clearInterval(interval);
        return;
      }

      const x = Math.random() * state.canvasWidth;
      const y = Math.random() * state.canvasHeight;

      const cursorMessage = {
        type: "cursorMove",
        userId: user.id,
        x: x,
        y: y,
      };

      if (state.collaboration.socket.onmessage) {
        state.collaboration.socket.onmessage({
          data: JSON.stringify(cursorMessage),
        });
      }
    }, 2000);
  }

  function simulateChatMessages(users) {
    const messages = [
      "Hi everyone!",
      "I like what you're drawing!",
      "Can we add more colors?",
      "This is fun!",
      "Let's try a different brush",
    ];

    setTimeout(() => {
      if (!state.collaboration.connected) return;

      const user = users[Math.floor(Math.random() * users.length)];
      const message = messages[Math.floor(Math.random() * messages.length)];

      const chatMessage = {
        type: "chatMessage",
        userId: user.id,
        username: user.name,
        message: message,
        timestamp: new Date().toISOString(),
      };

      if (state.collaboration.socket.onmessage) {
        state.collaboration.socket.onmessage({
          data: JSON.stringify(chatMessage),
        });
      }

      // Schedule next message
      if (state.collaboration.connected) {
        setTimeout(() => simulateChatMessages(users), 5000);
      }
    }, 3000);
  }

  function connectToRoom(isCreating = false) {
    const username = usernameInput.value.trim();
    const roomId = isCreating ? generateRoomId() : roomInput.value.trim();

    if (!username) {
      alert("Please enter your name");
      return;
    }

    if (!roomId && !isCreating) {
      alert("Please enter a room ID");
      return;
    }

    // Update UI to show connecting state
    updateCollaborationStatus("connecting");

    // Initialize WebSocket if not already done
    if (!state.collaboration.socket) {
      state.collaboration.socket = setupWebSocket();

      state.collaboration.socket.onopen = () => {
        // Join or create room
        const action = isCreating ? "createRoom" : "joinRoom";
        sendCollaborationMessage({
          type: action,
          username: username,
          roomId: roomId,
        });

        state.collaboration.username = username;
        state.collaboration.roomId = roomId;
        state.collaboration.connecting = false;
        state.collaboration.connected = true;

        updateCollaborationStatus("online");
        updateCollaborationUI(true);

        // Add self to users list
        addUserToActiveUsers({
          id: "self",
          name: username,
          color: getRandomColor(),
        });

        // Add system message to chat
        addSystemMessage(`You joined room: ${roomId}`);
      };

      state.collaboration.socket.onmessage = (event) => {
        handleCollaborationMessage(JSON.parse(event.data));
      };

      state.collaboration.socket.onclose = () => {
        state.collaboration.connected = false;
        state.collaboration.connecting = false;
        updateCollaborationStatus("offline");
        updateCollaborationUI(false);
        clearActiveUsers();
        addSystemMessage("Disconnected from room");
      };

      state.collaboration.socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        state.collaboration.connected = false;
        state.collaboration.connecting = false;
        updateCollaborationStatus("offline");
        updateCollaborationUI(false);
        addSystemMessage("Error connecting to room");
      };
    }

    // Connect to WebSocket server
    state.collaboration.connecting = true;
    state.collaboration.socket.connect();
  }

  function leaveRoom() {
    if (state.collaboration.socket && state.collaboration.connected) {
      sendCollaborationMessage({
        type: "leaveRoom",
        username: state.collaboration.username,
        roomId: state.collaboration.roomId,
      });

      state.collaboration.socket.close();
    }
  }

  function sendCollaborationMessage(message) {
    if (state.collaboration.socket && state.collaboration.connected) {
      state.collaboration.socket.send(JSON.stringify(message));
    }
  }

  function handleCollaborationMessage(message) {
    switch (message.type) {
      case "userJoined":
        handleUserJoined(message);
        break;
      case "userLeft":
        handleUserLeft(message);
        break;
      case "cursorMove":
        handleCursorMove(message);
        break;
      case "chatMessage":
        handleChatMessage(message);
        break;
      case "drawingAction":
        handleRemoteDrawingAction(message.action);
        break;
      default:
        console.log("Unknown message type:", message.type);
    }
  }

  function handleUserJoined(message) {
    addUserToActiveUsers({
      id: message.userId,
      name: message.username,
      color: message.color,
    });

    addSystemMessage(`${message.username} joined the room`);
  }

  function handleUserLeft(message) {
    removeUserFromActiveUsers(message.userId);
    removeCursor(message.userId);
    addSystemMessage(`${message.username} left the room`);
  }

  function handleCursorMove(message) {
    updateRemoteCursor(message.userId, message.x, message.y);
  }

  function handleChatMessage(message) {
    addChatMessage(
      message.userId,
      message.username,
      message.message,
      message.timestamp
    );
  }

  function handleRemoteDrawingAction(action) {
    switch (action.type) {
      case "startDrawing":
        // Set remote drawing state
        state.color = action.color;
        state.brushSize = action.brushSize;
        state.brushType = action.brushType;
        state.activeLayerIndex = action.layerIndex;
        break;

      case "draw":
        // Continue remote drawing
        if (state.activeLayerIndex !== -1) {
          const activeLayer = state.layers[state.activeLayerIndex];
          state.lastX = action.lastX;
          state.lastY = action.lastY;

          switch (state.brushType) {
            case "pencil":
              drawPencil(action.x, action.y, activeLayer.context);
              break;
            case "marker":
              drawMarker(action.x, action.y, activeLayer.context);
              break;
            case "eraser":
              drawEraser(action.x, action.y, activeLayer.context);
              break;
            case "spray":
              drawSpray(action.x, action.y, activeLayer.context);
              break;
            case "custom":
              drawCustomBrush(action.x, action.y, activeLayer.context);
              break;
          }

          state.lastX = action.x;
          state.lastY = action.y;
        }
        break;

      case "stopDrawing":
        // Nothing special needed here
        break;

      case "clearLayer":
        if (action.layerIndex >= 0 && action.layerIndex < state.layers.length) {
          const layer = state.layers[action.layerIndex];
          layer.context.clearRect(0, 0, state.canvasWidth, state.canvasHeight);
        }
        break;

      case "deleteLayer":
        // This would need more complex handling to ensure layer sync
        break;

      case "setActiveLayer":
        setActiveLayer(action.layerIndex);
        break;

      case "toggleLayerVisibility":
        if (action.layerIndex >= 0 && action.layerIndex < state.layers.length) {
          state.layers[action.layerIndex].visible = action.visible;
          state.layers[action.layerIndex].canvas.style.display = action.visible
            ? "block"
            : "none";
          updateLayersList();
        }
        break;

      case "importImage":
      case "importBackground":
      case "replaceLayerWithImage":
      case "applyFilters":
      case "undo":
      case "redo":
        // These would require sending image data and applying it
        if (
          action.imageData &&
          action.layerIndex >= 0 &&
          action.layerIndex < state.layers.length
        ) {
          const layer = state.layers[action.layerIndex];
          const img = new Image();
          img.onload = () => {
            layer.context.clearRect(
              0,
              0,
              state.canvasWidth,
              state.canvasHeight
            );
            layer.context.drawImage(img, 0, 0);
          };
          img.src = action.imageData;
        }
        break;

      case "resizeCanvas":
        // This would need more complex handling
        break;

      case "aiDrawing":
        // Just load the resulting image
        if (
          action.imageData &&
          action.layerIndex >= 0 &&
          action.layerIndex < state.layers.length
        ) {
          const layer = state.layers[action.layerIndex];
          const img = new Image();
          img.onload = () => {
            layer.context.clearRect(
              0,
              0,
              state.canvasWidth,
              state.canvasHeight
            );
            layer.context.drawImage(img, 0, 0);
          };
          img.src = action.imageData;
          addSystemMessage(
            `${action.username} generated AI art with prompt: "${action.prompt}"`
          );
        }
        break;
    }
  }

  function updateCollaborationStatus(status) {
    collabStatus.className = `collab-status ${status}`;
    const statusText = collabStatus.querySelector(".status-text");

    switch (status) {
      case "online":
        statusText.textContent = `Online - Room: ${state.collaboration.roomId}`;
        break;
      case "connecting":
        statusText.textContent = "Connecting...";
        break;
      case "offline":
        statusText.textContent = "Offline";
        break;
    }
  }

  function updateCollaborationUI(isConnected) {
    // Update button states
    joinRoomButton.disabled = isConnected;
    createRoomButton.disabled = isConnected;
    leaveRoomButton.disabled = !isConnected;

    // Update input states
    usernameInput.disabled = isConnected;
    roomInput.disabled = isConnected;

    // Update chat input
    chatInput.disabled = !isConnected;
    sendMessageButton.disabled = !isConnected;
  }

  function addUserToActiveUsers(user) {
    // Check if user already exists
    if (state.collaboration.users.some((u) => u.id === user.id)) {
      return;
    }

    state.collaboration.users.push(user);

    // Create user avatar
    const userAvatar = document.createElement("div");
    userAvatar.className = "user-avatar";
    userAvatar.dataset.userId = user.id;
    userAvatar.style.backgroundColor = user.color;
    userAvatar.textContent = user.name.charAt(0).toUpperCase();
    userAvatar.title = user.name;

    activeUsers.appendChild(userAvatar);
  }

  function removeUserFromActiveUsers(userId) {
    state.collaboration.users = state.collaboration.users.filter(
      (user) => user.id !== userId
    );

    const userAvatar = activeUsers.querySelector(`[data-user-id="${userId}"]`);
    if (userAvatar) {
      userAvatar.remove();
    }
  }

  function clearActiveUsers() {
    state.collaboration.users = [];
    activeUsers.innerHTML = "";
  }

  function updateRemoteCursor(userId, x, y) {
    let cursor = cursorsContainer.querySelector(`[data-user-id="${userId}"]`);

    if (!cursor) {
      // Create new cursor
      cursor = document.createElement("div");
      cursor.className = "remote-cursor";
      cursor.dataset.userId = userId;

      const user = state.collaboration.users.find((u) => u.id === userId);
      const color = user ? user.color : getRandomColor();
      const name = user ? user.name : "User";

      const pointer = document.createElement("div");
      pointer.className = "cursor-pointer";
      pointer.style.borderBottomColor = color;

      const label = document.createElement("div");
      label.className = "cursor-label";
      label.textContent = name;
      label.style.backgroundColor = color;

      cursor.appendChild(pointer);
      cursor.appendChild(label);
      cursorsContainer.appendChild(cursor);
    }

    // Update cursor position
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
  }

  function removeCursor(userId) {
    const cursor = cursorsContainer.querySelector(`[data-user-id="${userId}"]`);
    if (cursor) {
      cursor.remove();
    }
  }

  function sendCursorPosition(x, y) {
    if (state.collaboration.connected) {
      sendCollaborationMessage({
        type: "cursorMove",
        x: x,
        y: y,
      });
    }
  }

  function sendDrawingAction(action) {
    if (state.collaboration.connected) {
      sendCollaborationMessage({
        type: "drawingAction",
        action: action,
      });
    }
  }

  function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message || !state.collaboration.connected) return;

    const chatMessage = {
      type: "chatMessage",
      message: message,
      timestamp: new Date().toISOString(),
    };

    sendCollaborationMessage(chatMessage);

    // Add own message to chat
    addChatMessage(
      "self",
      state.collaboration.username,
      message,
      chatMessage.timestamp,
      true
    );

    // Clear input
    chatInput.value = "";
  }

  function addChatMessage(
    userId,
    username,
    message,
    timestamp,
    isSelf = false
  ) {
    const messageElement = document.createElement("div");
    messageElement.className = `chat-message ${isSelf ? "user" : "other"}`;

    const sender = document.createElement("div");
    sender.className = "message-sender";
    sender.textContent = username;

    const content = document.createElement("div");
    content.className = "message-content";
    content.textContent = message;

    const time = document.createElement("div");
    time.className = "message-time";
    time.textContent = formatTimestamp(timestamp);

    messageElement.appendChild(sender);
    messageElement.appendChild(content);
    messageElement.appendChild(time);

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addSystemMessage(message) {
    const messageElement = document.createElement("div");
    messageElement.className = "system-message";
    messageElement.textContent = message;

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function generateRoomId() {
    return Math.random().toString(36).substring(2, 10);
  }

  function getRandomColor() {
    const colors = [
      "#FF5733",
      "#33FF57",
      "#3357FF",
      "#F3FF33",
      "#FF33F3",
      "#33FFF3",
      "#FF3333",
      "#33FF33",
      "#3333FF",
      "#FFFF33",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Set up event listeners
  function setupEventListeners() {
    // Layer management
    addLayerButton.addEventListener("click", addLayer);
    deleteLayerButton.addEventListener("click", deleteLayer);
    moveUpButton.addEventListener("click", moveLayerUp);
    moveDownButton.addEventListener("click", moveLayerDown);

    // Drawing tools
    colorPicker.addEventListener("input", (e) => {
      state.color = e.target.value;
      updateCustomBrushPreview();
    });

    brushSizeSlider.addEventListener("input", (e) => {
      updateBrushSize(Number(e.target.value));
      updateCustomBrushPreview();
    });

    brushTypeSelector.addEventListener("change", (e) => {
      const value = e.target.value;

      // Check if it's a custom brush from library
      if (value.startsWith("custom-")) {
        selectCustomBrushFromLibrary(value);
        state.brushType = "custom";
      } else {
        state.brushType = value;
      }
    });

    // Canvas operations
    clearButton.addEventListener("click", clearActiveLayer);
    saveButton.addEventListener("click", saveDrawing);
    undoButton.addEventListener("click", undo);
    redoButton.addEventListener("click", redo);
    resizeButton.addEventListener("click", resizeCanvas);

    // AI generation
    aiGenerateButton.addEventListener("click", generateAIDrawing);

    // Image import
    imageUpload.addEventListener("change", handleImageUpload);

    // Filter controls
    brightnessSlider.addEventListener("input", (e) => {
      updateFilterState("brightness", parseInt(e.target.value));
    });

    contrastSlider.addEventListener("input", (e) => {
      updateFilterState("contrast", parseInt(e.target.value));
    });

    saturationSlider.addEventListener("input", (e) => {
      updateFilterState("saturation", parseInt(e.target.value));
    });

    grayscaleButton.addEventListener("click", () => {
      updateFilterState("grayscale", true);
      updateFilterState("sepia", false);
      updateFilterState("invert", false);
    });

    sepiaButton.addEventListener("click", () => {
      updateFilterState("grayscale", false);
      updateFilterState("sepia", true);
      updateFilterState("invert", false);
    });

    invertButton.addEventListener("click", () => {
      updateFilterState("grayscale", false);
      updateFilterState("sepia", false);
      updateFilterState("invert", true);
    });

    resetFiltersButton.addEventListener("click", resetFilters);
    applyFiltersButton.addEventListener("click", applyFilters);

    // Preset controls
    savePresetButton.addEventListener("click", savePreset);

    // Custom brush controls
    brushShape.addEventListener("change", (e) => {
      state.currentCustomBrush.shape = e.target.value;
      updateCustomBrushPreview();
    });

    brushTexture.addEventListener("change", (e) => {
      state.currentCustomBrush.texture = e.target.value;
      updateCustomBrushPreview();
    });

    brushOpacity.addEventListener("input", (e) => {
      state.currentCustomBrush.opacity = parseInt(e.target.value);
      brushOpacityValue.textContent = `${state.currentCustomBrush.opacity}%`;
      updateCustomBrushPreview();
    });

    brushScatter.addEventListener("input", (e) => {
      state.currentCustomBrush.scatter = parseInt(e.target.value);
      brushScatterValue.textContent = `${state.currentCustomBrush.scatter}%`;
      updateCustomBrushPreview();
    });

    brushRotation.addEventListener("input", (e) => {
      state.currentCustomBrush.rotation = parseInt(e.target.value);
      brushRotationValue.textContent = `${state.currentCustomBrush.rotation}°`;
      updateCustomBrushPreview();
    });

    applyBrushButton.addEventListener("click", applyCustomBrush);
    saveCustomBrush.addEventListener("click", saveCustomBrushToLibrary);
    cancelCustomBrush.addEventListener("click", () => {
      customBrushModal.classList.remove("show");
    });
    closeModal.addEventListener("click", () => {
      customBrushModal.classList.remove("show");
    });

    // Collaboration controls
    joinRoomButton.addEventListener("click", () => connectToRoom(false));
    createRoomButton.addEventListener("click", () => connectToRoom(true));
    leaveRoomButton.addEventListener("click", leaveRoom);
    sendMessageButton.addEventListener("click", sendChatMessage);
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        sendChatMessage();
      }
    });

    // Track cursor position for collaboration
    document.addEventListener("mousemove", (e) => {
      if (state.collaboration.connected) {
        const canvasRect = layersContainer.getBoundingClientRect();
        if (
          e.clientX >= canvasRect.left &&
          e.clientX <= canvasRect.right &&
          e.clientY >= canvasRect.top &&
          e.clientY <= canvasRect.bottom
        ) {
          const x = e.clientX - canvasRect.left;
          const y = e.clientY - canvasRect.top;
          sendCursorPosition(x, y);
        }
      }
    });

    // Add drawing event listeners to all layer canvases
    function addCanvasEventListeners(canvas) {
      canvas.addEventListener("mousedown", startDrawing);
      canvas.addEventListener("mousemove", draw);
      canvas.addEventListener("mouseup", stopDrawing);
      canvas.addEventListener("mouseout", stopDrawing);
      canvas.addEventListener("touchstart", startDrawing);
      canvas.addEventListener("touchmove", draw);
      canvas.addEventListener("touchend", stopDrawing);
    }

    // Add event listeners to existing layers
    state.layers.forEach((layer) => {
      addCanvasEventListeners(layer.canvas);
    });

    // Observer to add event listeners to new layers
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.classList && node.classList.contains("canvas-layer")) {
              addCanvasEventListeners(node);
            }
          });
        }
      });
    });

    observer.observe(layersContainer, { childList: true });
  }

  // Helper function to update brush size
  function updateBrushSize(newSize) {
    state.brushSize = newSize;
    brushSizeValue.textContent = newSize;
  }

  // Initialize the app
  init();
});




// State management for the interactive background
const state = {
  mouseX: 0,
  mouseY: 0,
  backgroundX: 0,
  backgroundY: 0,

  // Update mouse position and calculate background movement
  updateMousePosition(event) {
    // Get mouse position relative to window
    const x = (event.clientX / window.innerWidth) * 100;
    const y = (event.clientY / window.innerHeight) * 100;

    // Smooth transition for background movement
    this.backgroundX = (x - 50) * 0.05;
    this.backgroundY = (y - 50) * 0.05;

    // Update the DOM
    this.updateDOM();
  },

  // Update DOM elements based on state
  updateDOM() {
    const backgroundContainer = document.querySelector(".background-container");
    const gradientOverlay = document.querySelector(".gradient-overlay");

    if (backgroundContainer) {
      backgroundContainer.style.transform = `translate(${this.backgroundX}px, ${this.backgroundY}px)`;
    }

    if (gradientOverlay) {
      gradientOverlay.style.transform = `translate(${this.backgroundX * -1.5}px, ${this.backgroundY * -1.5}px)`;
    }
  },
};

// Create floating particles
function createParticles(count = 15) {
  const particlesContainer = document.querySelector(".particles-container");

  if (!particlesContainer) return;

  // Clear existing particles
  particlesContainer.innerHTML = "";

  // Create new particles
  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div");
    particle.classList.add("particle");

    // Random size between 1-3px
    const size = Math.random() * 2 + 1;

    // Random position
    const top = Math.random() * 100;

    // Random animation duration between 20-45s
    const duration = Math.random() * 25 + 20;

    // Random opacity
    const opacity = Math.random() * 0.3 + 0.2;

    // Set styles
    Object.assign(particle.style, {
      width: `${size}px`,
      height: `${size}px`,
      top: `${top}%`,
      opacity: opacity,
      animation: `${i % 2 === 0 ? "float" : "floatReverse"} ${duration}s linear infinite`,
    });

    particlesContainer.appendChild(particle);
  }
}

// Initialize the background
function initBackground() {
  // Create initial particles
  createParticles();

  // Add mouse move event listener
  document.addEventListener("mousemove", (event) => {
    state.updateMousePosition(event);
  });
}

// Create ripple effect at click/touch point
function createRippleEffect(x, y) {
  const backgroundContainer = document.querySelector(".background-container");

  if (!backgroundContainer) return;

  // Create ripple element
  const ripple = document.createElement("div");
  ripple.classList.add("ripple");

  // Set position at click/touch point
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  // Set size based on container dimensions for full-screen effect
  const size =
    Math.max(
      backgroundContainer.offsetWidth,
      backgroundContainer.offsetHeight,
    ) * 2;
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;

  // Add to container
  backgroundContainer.appendChild(ripple);

  // Apply color pulse to background
  backgroundContainer.classList.add("color-pulse");

  // Remove after animation completes
  setTimeout(() => {
    ripple.remove();
    backgroundContainer.classList.remove("color-pulse");
  }, 1500);
}

// Sound state
const soundState = {
  muted: false,

  // Toggle mute state
  toggleMute() {
    this.muted = !this.muted;
    document.querySelector('.sound-toggle').classList.toggle('muted', this.muted);
  },

  // Play a sound if not muted
  playSound(soundId) {
    if (this.muted) return;

    const sound = document.getElementById(soundId);
    if (sound) {
      // Reset the audio to start
      sound.currentTime = 0;

      // Play with random pitch variation for more natural sound
      sound.playbackRate = 0.9 + Math.random() * 0.2;

      // Play the sound
      sound.play().catch(err => {
        // Handle autoplay restrictions
        console.log('Audio playback error:', err);
      });
    }
  }
};

// Create particle burst at click/touch point with gravity effects
function createParticleBurst(x, y) {
  const backgroundContainer = document.querySelector('.background-container');

  if (!backgroundContainer) return;

  // Play burst sound
  soundState.playSound('burstSound');

  // Number of particles in the burst
  const particleCount = 20;

  // Create multiple particles
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('burst-particle');

    // Random size with more variation
    const size = Math.random() * 4 + 1;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;

    // Position at click/touch point
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;

    // Random direction with more upward bias for initial trajectory
    const angle = Math.random() * Math.PI * 2;

    // Particles travel farther horizontally than vertically (gravity will pull them down)
    const horizontalDistance = Math.random() * 150 + 50;
    const verticalDistance = Math.random() * 100 - 50; // Negative values make particles go up initially

    const tx = Math.cos(angle) * horizontalDistance;
    const ty = Math.sin(angle) * verticalDistance;

    // Set custom properties for the animation
    particle.style.setProperty('--tx', `${tx}px`);
    particle.style.setProperty('--ty', `${ty}px`);

    // Random color with more variation
    const hue = Math.random() * 80 + 180; // Wider blue to purple range
    const saturation = 80 + Math.random() * 20;
    const lightness = 60 + Math.random() * 20;
    particle.style.backgroundColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`;

    // Randomize animation duration for more natural effect
    const duration = Math.random() * 0.8 + 0.7;
    particle.style.animation = `burstOut ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`;

    // Add to container
    backgroundContainer.appendChild(particle);

    // Remove after animation completes
    setTimeout(() => {
      particle.remove();
    }, duration * 1000);
  }
}


// Handle click/touch events
function handleInteraction(event) {
  // Get coordinates (works for both mouse and touch)
  const x = event.clientX || event.touches[0].clientX;
  const y = event.clientY || event.touches[0].clientY;

  // Play click sound
  soundState.playSound('clickSound');

  // Create visual effects
  createRippleEffect(x, y);
  createParticleBurst(x, y);
}

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initBackground();

  // Add event listeners for mouse and touch
  document.addEventListener('click', (event) => {
    // Don't trigger effects if clicking the sound toggle button
    if (!event.target.closest('.sound-toggle')) {
      handleInteraction(event);
    }
  });

  document.addEventListener('touchstart', (event) => {
    // Don't trigger effects if touching the sound toggle button
    if (!event.target.closest('.sound-toggle')) {
      handleInteraction(event);
    }
  }, { passive: true });

  // Add sound toggle functionality
  const soundToggle = document.querySelector('.sound-toggle');
  if (soundToggle) {
    soundToggle.addEventListener('click', () => {
      soundState.toggleMute();
    });
  }
});

// Recreate particles on window resize
window.addEventListener("resize", () => {
  createParticles();
});