/**
 * CampusCore AI — Client Application Logic
 * Academic & Student Intelligence Portal
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
  const newChatBtn = document.getElementById('new-chat-btn');
  const statusBadge = document.getElementById('system-status-badge');
  const statusText = document.getElementById('status-text');
  const chatViewport = document.getElementById('chat-viewport');
  const sidebar = document.getElementById('sidebar');
  const mobileToggle = document.getElementById('mobile-sidebar-toggle');
  
  // Theme Toggle Elements
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeIconSun = document.getElementById('theme-icon-sun');
  const themeIconMoon = document.getElementById('theme-icon-moon');

  // Category Filter Buttons
  const topicBtns = document.querySelectorAll('.topic-btn');
  const promptChipCards = document.querySelectorAll('.prompt-chip-card');

  // ---------------------------------------------------------------------------
  // 1. Theme Management
  // ---------------------------------------------------------------------------
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('campuscore_theme', theme);
    if (theme === 'dark') {
      themeIconSun.classList.remove('hidden');
      themeIconMoon.classList.add('hidden');
    } else {
      themeIconSun.classList.add('hidden');
      themeIconMoon.classList.remove('hidden');
    }
  }

  const savedTheme = localStorage.getItem('campuscore_theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Mobile Sidebar Drawer
  // ---------------------------------------------------------------------------
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Category Filter Navigation
  // ---------------------------------------------------------------------------
  topicBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      topicBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const cat = btn.getAttribute('data-category');
      promptChipCards.forEach(card => {
        const cardCat = card.getAttribute('data-category');
        if (cat === 'all' || cardCat === cat) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });

      // If on mobile, close sidebar after selecting
      if (window.innerWidth <= 860 && sidebar) {
        sidebar.classList.remove('open');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Local Engine Telemetry Check
  // ---------------------------------------------------------------------------
  async function checkSystemStatus() {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error('Status non-200');
      const data = await res.json();

      if (data.status === 'online') {
        statusBadge.className = 'telemetry-badge status-online';
        statusText.textContent = `Online • ${data.llm_model}`;
        statusBadge.title = `Engine: ${data.llm_model} | Embedding: ${data.embed_model} | Status: Ready`;
      } else {
        statusBadge.className = 'telemetry-badge status-offline';
        statusText.textContent = 'Ollama Offline';
        statusBadge.title = 'Please ensure `ollama serve` is active.';
      }
    } catch (err) {
      statusBadge.className = 'telemetry-badge status-offline';
      statusText.textContent = 'Engine Offline';
      statusBadge.title = 'Helpdesk server not reachable.';
    }
  }

  checkSystemStatus();
  setInterval(checkSystemStatus, 15000);

  // ---------------------------------------------------------------------------
  // 5. Input Auto-Resize & Dynamic Send Button State
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
  // 6. Suggestion Card Click Handling
  // ---------------------------------------------------------------------------
  promptChipCards.forEach(card => {
    card.addEventListener('click', () => {
      const query = card.getAttribute('data-query');
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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: queryText })
      });

      const data = await response.json();
      setLoadingState(false);

      if (data.answer) {
        appendAssistantMessage(data.answer, data.sources || [], data.model || 'qwen2.5');
      } else if (data.error) {
        appendAssistantMessage(`⚠️ Notice: ${data.error}`, [], 'System');
      }
    } catch (err) {
      setLoadingState(false);
      appendAssistantMessage(
        '⚠️ Could not establish connection to the local academic helpdesk backend. Please ensure the Python web server is running and local Ollama is responding.',
        [],
        'Offline'
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

  function appendAssistantMessage(text, sources = [], model = 'qwen2.5') {
    const row = document.createElement('div');
    row.className = 'message-row assistant';

    const card = document.createElement('div');
    card.className = 'assistant-card';

    // Header
    const header = document.createElement('div');
    header.className = 'assistant-card-header';

    const badge = document.createElement('div');
    badge.className = 'assistant-agent-badge';
    badge.innerHTML = `
      <div class="agent-icon-pill">🏛️</div>
      <span class="agent-name">CampusCore AI</span>
      <span class="agent-model-tag">${escapeHtml(model)}</span>
    `;

    const actions = document.createElement('div');
    actions.className = 'assistant-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-icon-btn';
    copyBtn.title = 'Copy Answer to clipboard';
    copyBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span>Copy</span>
    `;
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(text);
      copyBtn.innerHTML = `<span>Copied!</span>`;
      setTimeout(() => {
        copyBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copy</span>
        `;
      }, 2000);
    });

    actions.appendChild(copyBtn);
    header.appendChild(badge);
    header.appendChild(actions);
    card.appendChild(header);

    // Text Content
    const textWrap = document.createElement('div');
    textWrap.className = 'assistant-text-content';
    textWrap.innerHTML = formatMarkdown(text);
    card.appendChild(textWrap);

    // Sources Shelf
    if (sources && sources.length > 0) {
      const sourcesShelf = document.createElement('div');
      sourcesShelf.className = 'sources-shelf';

      const shelfTitle = document.createElement('div');
      shelfTitle.className = 'sources-shelf-title';
      shelfTitle.innerHTML = `
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        <span>Verified Campus Knowledge Sources (${sources.length})</span>
      `;
      sourcesShelf.appendChild(shelfTitle);

      const itemsWrap = document.createElement('div');
      itemsWrap.className = 'source-items-wrap';

      sources.forEach(src => {
        const item = document.createElement('div');
        item.className = 'source-card';
        const scorePct = src.score ? Math.round(src.score * 100) : 85;
        
        item.innerHTML = `
          <div class="source-file-header">
            <span class="source-filename">📄 ${escapeHtml(src.source || 'Handbook')}</span>
            <span class="source-score">${scorePct}% Match</span>
          </div>
          <p class="source-preview-text">${escapeHtml(src.preview || '')}</p>
        `;
        itemsWrap.appendChild(item);
      });

      sourcesShelf.appendChild(itemsWrap);
      card.appendChild(sourcesShelf);
    }

    row.appendChild(card);
    messagesStream.appendChild(row);
    scrollToBottom();
  }

  // ---------------------------------------------------------------------------
  // 9. Reset / Clear Session
  // ---------------------------------------------------------------------------
  function resetSession() {
    messagesStream.innerHTML = '';
    if (welcomeBanner) {
      welcomeBanner.classList.remove('hidden');
    }
    userInput.value = '';
    updateInputState();
    userInput.focus();
  }

  if (clearChatBtn) clearChatBtn.addEventListener('click', resetSession);
  if (newChatBtn) newChatBtn.addEventListener('click', resetSession);

  // ---------------------------------------------------------------------------
  // Helper Formatters
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
