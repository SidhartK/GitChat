// @ts-check

(function () {
  /** @type {ReturnType<typeof acquireVsCodeApi>} */
  const vscode = acquireVsCodeApi();

  const chatFeed = /** @type {HTMLElement} */ (document.getElementById('chat-feed'));
  const noteInput = /** @type {HTMLTextAreaElement} */ (document.getElementById('note-input'));
  const sendBtn = /** @type {HTMLButtonElement} */ (document.getElementById('send-btn'));
  const checkpointBtn = /** @type {HTMLButtonElement} */ (document.getElementById('checkpoint-btn'));
  const restructureBtn = /** @type {HTMLButtonElement} */ (document.getElementById('restructure-btn'));
  const checkpointOverlay = /** @type {HTMLElement} */ (document.getElementById('checkpoint-overlay'));
  const checkpointTitleInput = /** @type {HTMLInputElement} */ (document.getElementById('checkpoint-title-input'));
  const checkpointGoBtn = /** @type {HTMLButtonElement} */ (document.getElementById('checkpoint-go-btn'));
  const checkpointCancelBtn = /** @type {HTMLButtonElement} */ (document.getElementById('checkpoint-cancel-btn'));
  const pastePreview = /** @type {HTMLElement} */ (document.getElementById('paste-preview'));

  /**
   * @typedef {{ type: string; text?: string; artifactType?: string; preview?: string; timestamp?: string }} EntryData
   * @typedef {{ entries: EntryData[] }} State
   */

  /** @type {State} */
  let state = vscode.getState() || { entries: [] };

  state.entries.forEach((entry) => renderEntryCard(entry));

  // ---- Send note ----

  sendBtn.addEventListener('click', () => {
    const text = noteInput.value.trim();
    if (!text) { return; }
    vscode.postMessage({ type: 'addNote', text });
    addEntry({ type: 'note', text, timestamp: new Date().toISOString() });
    noteInput.value = '';
    noteInput.focus();
  });

  noteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      sendBtn.click();
    }
  });

  // ---- Image paste ----

  noteInput.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) { return; }

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) { return; }

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = /** @type {string} */ (reader.result);
          vscode.postMessage({ type: 'pasteImage', dataUrl });
          showPasteIndicator(dataUrl);
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  });

  /** @param {string} dataUrl */
  function showPasteIndicator(dataUrl) {
    pastePreview.innerHTML = '';
    pastePreview.classList.add('visible');

    const img = document.createElement('img');
    img.src = dataUrl;
    img.className = 'paste-preview-img';
    pastePreview.appendChild(img);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '\u00d7';
    removeBtn.className = 'paste-remove-btn';
    removeBtn.addEventListener('click', clearPastePreview);
    pastePreview.appendChild(removeBtn);

    setTimeout(clearPastePreview, 3000);
  }

  function clearPastePreview() {
    pastePreview.innerHTML = '';
    pastePreview.classList.remove('visible');
  }

  // ---- Checkpoint flow ----

  checkpointBtn.addEventListener('click', showCheckpointInput);

  function showCheckpointInput() {
    checkpointOverlay.classList.add('visible');
    checkpointTitleInput.value = '';
    checkpointTitleInput.focus();
  }

  function hideCheckpointInput() {
    checkpointOverlay.classList.remove('visible');
  }

  checkpointGoBtn.addEventListener('click', () => {
    const title = checkpointTitleInput.value.trim() || 'Checkpoint';
    hideCheckpointInput();
    setLoading(true);
    vscode.postMessage({ type: 'checkpoint', title });
  });

  checkpointCancelBtn.addEventListener('click', hideCheckpointInput);

  checkpointTitleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { checkpointGoBtn.click(); }
    if (e.key === 'Escape') { hideCheckpointInput(); }
  });

  // ---- Restructure ----

  restructureBtn.addEventListener('click', () => {
    setLoading(true);
    vscode.postMessage({ type: 'restructure' });
  });

  // ---- Loading state ----

  /** @param {boolean} loading */
  function setLoading(loading) {
    checkpointBtn.disabled = loading;
    restructureBtn.disabled = loading;
    sendBtn.disabled = loading;
    checkpointBtn.textContent = loading ? 'Working\u2026' : 'Checkpoint';
  }

  // ---- Messages from extension ----

  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.type) {
      case 'artifactCaptured': {
        const entry = message.data;
        addEntry({
          type: 'artifact',
          artifactType: entry.artifact?.type ?? 'unknown',
          preview: entry.artifact?.preview ?? '',
          timestamp: entry.timestamp,
        });
        clearPastePreview();
        break;
      }

      case 'requestCheckpointTitle':
        showCheckpointInput();
        break;

      case 'checkpointComplete':
        setLoading(false);
        addCommittedMarker(message.message ?? 'Checkpoint committed');
        state.entries = [];
        vscode.setState(state);
        break;

      case 'checkpointError':
        setLoading(false);
        addErrorMarker(message.error ?? 'Checkpoint failed');
        break;

      case 'restructureComplete':
        setLoading(false);
        addCommittedMarker(message.message ?? 'Document restructured');
        break;

      case 'restructureError':
        setLoading(false);
        addErrorMarker(message.error ?? 'Restructure failed');
        break;
    }
  });

  // ---- Rendering helpers ----

  /** @param {EntryData} data */
  function addEntry(data) {
    state.entries.push(data);
    vscode.setState(state);
    renderEntryCard(data);
  }

  /** @param {EntryData} data */
  function renderEntryCard(data) {
    const card = document.createElement('div');
    card.className = `entry-card ${data.type}`;

    const ts = document.createElement('div');
    ts.className = 'timestamp';
    ts.textContent = data.timestamp
      ? new Date(data.timestamp).toLocaleTimeString()
      : new Date().toLocaleTimeString();
    card.appendChild(ts);

    if (data.type === 'artifact') {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = data.artifactType ?? 'artifact';
      card.appendChild(badge);
    }

    if (data.type === 'artifact' && data.artifactType === 'image' && data.preview) {
      const img = document.createElement('img');
      img.src = `data:image/png;base64,${data.preview}`;
      img.className = 'artifact-image';
      card.appendChild(img);
    } else {
      const content = document.createElement('div');
      content.className = 'content';
      content.textContent = data.text ?? data.preview ?? '';
      card.appendChild(content);
    }

    chatFeed.appendChild(card);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  /** @param {string} text */
  function addCommittedMarker(text) {
    const marker = document.createElement('div');
    marker.className = 'committed-marker';
    marker.textContent = text;
    chatFeed.appendChild(marker);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  /** @param {string} text */
  function addErrorMarker(text) {
    const marker = document.createElement('div');
    marker.className = 'error-marker';
    marker.textContent = text;
    chatFeed.appendChild(marker);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }
})();
