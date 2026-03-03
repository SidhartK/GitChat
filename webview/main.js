// @ts-check

(function () {
  /** @type {ReturnType<typeof acquireVsCodeApi>} */
  const vscode = acquireVsCodeApi();

  const chatFeed = /** @type {HTMLElement} */ (document.getElementById('chat-feed'));
  const noteInput = /** @type {HTMLTextAreaElement} */ (document.getElementById('note-input'));
  const sendBtn = /** @type {HTMLButtonElement} */ (document.getElementById('send-btn'));
  const checkpointBtn = /** @type {HTMLButtonElement} */ (document.getElementById('checkpoint-btn'));

  sendBtn.addEventListener('click', () => {
    const text = noteInput.value.trim();
    if (!text) { return; }
    vscode.postMessage({ type: 'addNote', text });
    addEntryCard({ type: 'note', text, timestamp: new Date().toISOString() });
    noteInput.value = '';
  });

  noteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      sendBtn.click();
    }
  });

  checkpointBtn.addEventListener('click', () => {
    const title = prompt('Checkpoint title (optional):') ?? '';
    vscode.postMessage({ type: 'checkpoint', title });
  });

  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.type) {
      case 'artifactCaptured':
        addEntryCard({
          type: 'artifact',
          artifactType: message.data.artifact?.type ?? 'unknown',
          preview: message.data.artifact?.preview ?? '',
          timestamp: message.data.timestamp,
        });
        break;

      case 'requestCheckpointTitle': {
        const title = prompt('Checkpoint title (optional):') ?? '';
        vscode.postMessage({ type: 'checkpoint', title });
        break;
      }

      case 'checkpointComplete':
        addCommittedMarker(message.message ?? 'Checkpoint committed');
        break;
    }
  });

  /**
   * @param {{ type: string; text?: string; artifactType?: string; preview?: string; timestamp?: string }} data
   */
  function addEntryCard(data) {
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

    const content = document.createElement('div');
    content.className = 'content';
    content.textContent = data.text ?? data.preview ?? '';
    card.appendChild(content);

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
})();
