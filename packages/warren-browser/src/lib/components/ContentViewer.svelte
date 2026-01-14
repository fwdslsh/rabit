<script lang="ts">
  import type { Entry, Burrow } from '../types';
  import { fetchEntryContent, resolveUri } from '../client';

  interface Props {
    burrow: Burrow;
    entry: Entry;
  }

  let { burrow, entry }: Props = $props();

  let content = $state<string | null>(null);
  let mediaType = $state<string>('text/plain');
  let loading = $state(true);
  let error = $state<string | null>(null);

  async function loadContent() {
    loading = true;
    error = null;
    content = null;

    const result = await fetchEntryContent(burrow, entry);

    if (result.ok && result.data) {
      content = result.data.content;
      mediaType = result.data.mediaType;
    } else {
      error = result.error || 'Failed to load content';
    }

    loading = false;
  }

  $effect(() => {
    loadContent();
  });

  const isImage = $derived(mediaType.startsWith('image/'));
  const isMarkdown = $derived(mediaType === 'text/markdown');
  const isJson = $derived(mediaType === 'application/json');
  const isCode = $derived(
    mediaType.startsWith('text/x-') ||
    mediaType === 'text/javascript' ||
    mediaType === 'text/typescript' ||
    mediaType === 'text/css' ||
    mediaType === 'application/xml' ||
    mediaType === 'application/yaml'
  );

  const formattedContent = $derived(() => {
    if (!content) return '';

    if (isJson) {
      try {
        return JSON.stringify(JSON.parse(content), null, 2);
      } catch {
        return content;
      }
    }

    return content;
  });

  const entryUrl = $derived(resolveUri(burrow.baseUri, entry.uri));
</script>

<div class="content-viewer">
  <header class="content-header">
    <div class="header-info">
      <h3 class="content-title">{entry.title || entry.id}</h3>
      {#if entry.summary}
        <p class="content-summary">{entry.summary}</p>
      {/if}
    </div>
    <a
      href={entryUrl}
      target="_blank"
      rel="noopener noreferrer"
      class="open-external"
      title="Open in new tab"
    >
      ↗
    </a>
  </header>

  <div class="content-body">
    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <span>Loading content...</span>
      </div>
    {:else if error}
      <div class="error-state">
        <span class="error-icon">⚠️</span>
        <p class="error-message">{error}</p>
        <button class="retry-button" onclick={loadContent}>Retry</button>
      </div>
    {:else if isImage}
      <div class="image-container">
        <img src={entryUrl} alt={entry.title || entry.id} class="content-image" />
      </div>
    {:else}
      <pre class="content-text" class:markdown={isMarkdown} class:code={isCode || isJson}>{formattedContent()}</pre>
    {/if}
  </div>

  <footer class="content-footer">
    <span class="media-type">{mediaType}</span>
    {#if entry.modified}
      <span class="modified">Modified: {new Date(entry.modified).toLocaleString()}</span>
    {/if}
  </footer>
</div>

<style>
  .content-viewer {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--wb-content-bg, #12121e);
  }

  .content-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 16px;
    border-bottom: 1px solid var(--wb-border, #2d2d44);
    flex-shrink: 0;
  }

  .header-info {
    flex: 1;
    min-width: 0;
  }

  .content-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--wb-text, #e5e7eb);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .content-summary {
    font-size: 13px;
    color: var(--wb-muted, #9ca3af);
    margin: 4px 0 0 0;
  }

  .open-external {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: var(--wb-card-bg, #1e1e32);
    border-radius: 6px;
    color: var(--wb-muted, #9ca3af);
    text-decoration: none;
    font-size: 16px;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }

  .open-external:hover {
    background: var(--wb-hover, rgba(99, 102, 241, 0.1));
    color: var(--wb-link, #818cf8);
  }

  .content-body {
    flex: 1;
    overflow: auto;
    padding: 16px;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 16px;
    color: var(--wb-muted, #9ca3af);
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--wb-border, #2d2d44);
    border-top-color: var(--wb-primary, #6366f1);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 12px;
    text-align: center;
  }

  .error-icon {
    font-size: 36px;
  }

  .error-message {
    color: var(--wb-error, #ef4444);
    margin: 0;
  }

  .retry-button {
    background: var(--wb-primary, #6366f1);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .retry-button:hover {
    background: var(--wb-primary-hover, #4f46e5);
  }

  .image-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }

  .content-image {
    max-width: 100%;
    max-height: 100%;
    border-radius: 8px;
  }

  .content-text {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
    font-size: 13px;
    line-height: 1.6;
    color: var(--wb-text, #e5e7eb);
    background: var(--wb-code-bg, #0d0d15);
    padding: 16px;
    border-radius: 8px;
    margin: 0;
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .content-text.markdown {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    white-space: pre-wrap;
  }

  .content-text.code {
    white-space: pre;
    word-wrap: normal;
  }

  .content-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    border-top: 1px solid var(--wb-border, #2d2d44);
    font-size: 11px;
    color: var(--wb-muted, #6b7280);
    flex-shrink: 0;
  }

  .media-type {
    font-family: monospace;
    padding: 2px 6px;
    background: var(--wb-tag-bg, rgba(99, 102, 241, 0.15));
    border-radius: 4px;
  }
</style>
