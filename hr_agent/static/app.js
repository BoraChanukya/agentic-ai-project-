/**
 * NexusHR Enterprise — Executive Autonomous Policy & Escalation Client Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Element References
  const chatForm = document.getElementById('chat-form');
  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const messagesStream = document.getElementById('messages-stream');
  const welcomeBanner = document.getElementById('welcome-banner');
  const typingIndicator = document.getElementById('typing-indicator');
  const clearChatBtn = document.getElementById('clear-chat-btn');
  const statusBadge = document.getElementById('system-status-badge');
  const statusText = document.getElementById('status-text');
  const chatViewport = document.getElementById('chat-viewport');
  
  // Pipeline Step Nodes
  const pipeStep1 = document.getElementById('pipe-step-1');
  const pipeStep2 = document.getElementById('pipe-step-2');
  const pipeStep3 = document.getElementById('pipe-step-3');
  const pipeStep4 = document.getElementById('pipe-step-4');

  // Theme Elements
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeIconSun = document.getElementById('theme-icon-sun');
  const themeIconMoon = document.getElementById('theme-icon-moon');

  // Metrics Modal Elements
  const metricsBtn = document.getElementById('metrics-btn');
  const metricsModal = document.getElementById('metrics-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');

  // Suggestion Chips
  const promptChips = document.querySelectorAll('.prompt-chip');

  let ticketCounter = 7842;

  // ---------------------------------------------------------------------------
  // 1. Theme Management (Default Dark)
  // ---------------------------------------------------------------------------
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nexushr_theme', theme);
    if (theme === 'dark') {
      themeIconSun.classList.remove('hidden');
      themeIconMoon.classList.add('hidden');
    } else {
      themeIconSun.classList.add('hidden');
      themeIconMoon.classList.remove('hidden');
    }
  }

  const savedTheme = localStorage.getItem('nexushr_theme') || 'dark';
  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Metrics & Audit Modal Control
  // ---------------------------------------------------------------------------
  if (metricsBtn && metricsModal) {
    metricsBtn.addEventListener('click', async () => {
      metricsModal.classList.remove('hidden');
      metricsModal.setAttribute('aria-hidden', 'false');
      // Optionally fetch real-time metrics
      try {
        const res = await fetch('/api/metrics');
        if (res.ok) {
          const metrics = await res.json();
          // Update values if present
        }
      } catch (e) {
        // Fallback to pre-rendered dashboard
      }
    });

    closeModalBtn.addEventListener('click', () => {
      metricsModal.classList.add('hidden');
      metricsModal.setAttribute('aria-hidden', 'true');
    });

    metricsModal.addEventListener('click', (e) => {
      if (e.target === metricsModal) {
        metricsModal.classList.add('hidden');
        metricsModal.setAttribute('aria-hidden', 'true');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !metricsModal.classList.contains('hidden')) {
        metricsModal.classList.add('hidden');
        metricsModal.setAttribute('aria-hidden', 'true');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Local Engine Operational Status Polling
  // ---------------------------------------------------------------------------
  async function checkSystemStatus() {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error('Status non-200');
      const data = await res.json();

      if (data.status === 'online') {
        statusBadge.className = 'engine-badge badge-online';
        statusText.textContent = `Online • ${data.llm_model}`;
        statusBadge.title = `Engine: ${data.llm_model} | Embed: ${data.embed_model} | Status: Ready`;
      } else {
        statusBadge.className = 'engine-badge badge-offline';
        statusText.textContent = 'Ollama Offline';
        statusBadge.title = 'Please ensure local Ollama service is running.';
      }
    } catch (err) {
      statusBadge.className = 'engine-badge badge-offline';
      statusText.textContent = 'Engine Offline';
      statusBadge.title = 'HR web server not reachable.';
    }
  }

  checkSystemStatus();
  setInterval(checkSystemStatus, 15000);

  // ---------------------------------------------------------------------------
  // 4. Autonomous 4-Stage Pipeline Animation
  // ---------------------------------------------------------------------------
  function resetPipeline() {
    if (pipeStep1) pipeStep1.classList.remove('active');
    if (pipeStep2) pipeStep2.classList.remove('active');
    if (pipeStep3) pipeStep3.classList.remove('active');
    if (pipeStep4) pipeStep4.classList.remove('active');
  }

  function setPipelineStep(stepIndex) {
    resetPipeline();
    if (stepIndex >= 1 && pipeStep1) pipeStep1.classList.add('active');
    if (stepIndex >= 2 && pipeStep2) pipeStep2.classList.add('active');
    if (stepIndex === 3 && pipeStep3) pipeStep3.classList.add('active');
    if (stepIndex === 4 && pipeStep4) pipeStep4.classList.add('active');
  }

  // ---------------------------------------------------------------------------
  // 5. Input Auto-Resize & Dynamic Send Button
  // ---------------------------------------------------------------------------
  function updateInputState() {
    userInput.style.height = 'auto';
    userInput.style.height = `${Math.min(userInput.scrollHeight, 140)}px`;

    if (userInput.value.trim().length > 0) {
      sendBtn.classList.add('active');
    } else {
      sendBtn.classList.remove('active');
    }
  }

  userInput.addEventListener('input', updateInputState);

  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (userInput.value.trim().length > 0) {
        chatForm.requestSubmit();
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 6. Suggestion Chips Quick Action
  // ---------------------------------------------------------------------------
  promptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.getAttribute('data-query');
      if (query) {
        submitQuery(query);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Form Submission & Agent Query Handling
  // ---------------------------------------------------------------------------
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = userInput.value.trim();
    if (!query) return;
    submitQuery(query);
  });

  async function submitQuery(queryText) {
    if (welcomeBanner) {
      welcomeBanner.classList.add('hidden');
    }

    appendUserMessage(queryText);

    userInput.value = '';
    updateInputState();
    userInput.focus();

    setLoadingState(true);
    setPipelineStep(1); // Step 1: Semantic Retrieval

    setTimeout(() => {
      setPipelineStep(2); // Step 2: Policy Triaging
    }, 450);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: queryText })
      });

      const data = await response.json();
      setLoadingState(false);

      const isEscalated = data.escalated || (data.response && data.response.includes('[ESCALATE_TO_HR'));

      if (isEscalated) {
        setPipelineStep(4); // Step 4: Escalation
      } else {
        setPipelineStep(3); // Step 3: Grounded Answer
      }

      if (data.response) {
        appendAssistantMessage(data.response, data.sources || [], isEscalated, data.reason || '');
      } else if (data.error) {
        appendAssistantMessage(`⚠️ System error: ${data.error}`, [], false, '');
      }
    } catch (err) {
      setLoadingState(false);
      resetPipeline();
      appendAssistantMessage(
        '⚠️ Could not connect to the Enterprise HR Policy backend. Please verify that `web.py` is running and local Ollama is active.',
        [],
        false,
        ''
      );
    }
  }

  function setLoadingState(isLoading) {
    if (isLoading) {
      typingIndicator.classList.remove('hidden');
      sendBtn.classList.remove('active');
      scrollToBottom();
    } else {
      typingIndicator.classList.add('hidden');
    }
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (chatViewport) {
        chatViewport.scrollTop = chatViewport.scrollHeight;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 8. Message Stream Rendering
  // ---------------------------------------------------------------------------
  function appendUserMessage(text) {
    const row = document.createElement('div');
    row.className = 'message-row user';

    const bubble = document.createElement('div');
    bubble.className = 'user-bubble';
    bubble.textContent = text;

    row.appendChild(bubble);
    messagesStream.appendChild(row);
    scrollToBottom();
  }

  function appendAssistantMessage(text, sources = [], isEscalated = false, reason = '') {
    const row = document.createElement('div');
    row.className = 'message-row assistant';

    const envelope = document.createElement('div');
    envelope.className = 'assistant-envelope';

    if (isEscalated) {
      // -----------------------------------------------------------------------
      // ESCALATION DISPATCH TICKET CARD
      // -----------------------------------------------------------------------
      ticketCounter += 1;
      const ticketId = `#TKT-HR-${ticketCounter}`;

      const ticketCard = document.createElement('div');
      ticketCard.className = 'escalation-ticket';

      // Ticket Header
      const header = document.createElement('div');
      header.className = 'ticket-header';
      header.innerHTML = `
        <div class="ticket-id-group">
          <span class="ticket-id">${ticketId}</span>
          <span class="urgency-badge">Priority Human Action Required</span>
        </div>
        <button class="copy-response-btn" title="Copy Ticket Record">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copy Ticket</span>
        </button>
      `;

      // Copy Handler
      const copyBtn = header.querySelector('.copy-response-btn');
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(`${ticketId}\n${text}`);
        copyBtn.innerHTML = `<span>Copied!</span>`;
        setTimeout(() => {
          copyBtn.innerHTML = `<span>Copy Ticket</span>`;
        }, 2000);
      });

      // Ticket Meta Grid
      const metaGrid = document.createElement('div');
      metaGrid.className = 'ticket-body-grid';
      metaGrid.innerHTML = `
        <div class="ticket-field">
          <span class="field-label">Triage Classification</span>
          <span class="field-val">Discretionary / Special Exception</span>
        </div>
        <div class="ticket-field">
          <span class="field-label">Assigned PeopleOps Queue</span>
          <span class="field-val">Senior HR Specialist Desk</span>
        </div>
        <div class="ticket-field">
          <span class="field-label">Trigger Rule</span>
          <span class="field-val">${escapeHtml(reason || 'Extended Leave / Sabbatical Exception')}</span>
        </div>
      `;

      // Ticket Text
      const textWrap = document.createElement('div');
      textWrap.className = 'ticket-response-text';
      textWrap.innerHTML = formatMarkdown(text);

      ticketCard.appendChild(header);
      ticketCard.appendChild(metaGrid);
      ticketCard.appendChild(textWrap);
      envelope.appendChild(ticketCard);

    } else {
      // -----------------------------------------------------------------------
      // GROUNDED POLICY RESOLUTION CARD
      // -----------------------------------------------------------------------
      const resCard = document.createElement('div');
      resCard.className = 'resolution-card';

      // Header
      const header = document.createElement('div');
      header.className = 'resolution-card-header';
      header.innerHTML = `
        <div class="resolution-badge">
          <span class="grounded-tag">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Policy Grounded Resolution
          </span>
        </div>
        <div class="resolution-actions">
          <button class="copy-response-btn" title="Copy response to clipboard">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy</span>
          </button>
        </div>
      `;

      const copyBtn = header.querySelector('.copy-response-btn');
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(text);
        copyBtn.innerHTML = `<span>Copied!</span>`;
        setTimeout(() => {
          copyBtn.innerHTML = `<span>Copy</span>`;
        }, 2000);
      });

      // Text Content
      const textWrap = document.createElement('div');
      textWrap.className = 'resolution-text';
      textWrap.innerHTML = formatMarkdown(text);

      resCard.appendChild(header);
      resCard.appendChild(textWrap);

      // Citations Shelf
      if (sources && sources.length > 0) {
        const citationsBox = document.createElement('div');
        citationsBox.className = 'citations-box';
        citationsBox.innerHTML = `
          <div class="citations-title">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Referenced Policy Clauses (${sources.length})</span>
          </div>
        `;

        const listWrap = document.createElement('div');
        listWrap.className = 'citations-list';

        sources.forEach(src => {
          const chip = document.createElement('div');
          chip.className = 'citation-chip';
          chip.innerHTML = `
            <span class="citation-clause">📌 ${escapeHtml(src.source || 'HR Policy Document')}</span>
            <p class="citation-preview">${escapeHtml(src.preview || '')}</p>
          `;
          listWrap.appendChild(chip);
        });

        citationsBox.appendChild(listWrap);
        resCard.appendChild(citationsBox);
      }

      envelope.appendChild(resCard);
    }

    row.appendChild(envelope);
    messagesStream.appendChild(row);
    scrollToBottom();
  }

  // ---------------------------------------------------------------------------
  // 9. Reset Session
  // ---------------------------------------------------------------------------
  function resetSession() {
    messagesStream.innerHTML = '';
    resetPipeline();
    if (welcomeBanner) {
      welcomeBanner.classList.remove('hidden');
    }
    userInput.value = '';
    updateInputState();
    userInput.focus();
  }

  if (clearChatBtn) clearChatBtn.addEventListener('click', resetSession);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatMarkdown(text) {
    if (!text) return '';
    let escaped = escapeHtml(text);
    // Bold
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Bullet points
    escaped = escaped.replace(/^[•\-\*]\s+(.*)$/gm, '<li>$1</li>');
    escaped = escaped.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    return escaped;
  }
});
