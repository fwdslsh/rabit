<script lang="ts">
  import type { Warren, Burrow, Entry, BurrowReference, WarrenReference, BreadcrumbItem } from './types';
  import { discover, fetchBurrow, fetchWarren, resolveUri } from './client';
  import AddressBar from './components/AddressBar.svelte';
  import Breadcrumbs from './components/Breadcrumbs.svelte';
  import WarrenView from './components/WarrenView.svelte';
  import BurrowView from './components/BurrowView.svelte';
  import ContentViewer from './components/ContentViewer.svelte';

  interface Props {
    defaultAddress?: string;
  }

  let { defaultAddress = 'warren.fwdslsh.dev' }: Props = $props();

  // State
  let address = $state(defaultAddress);
  let loading = $state(false);
  let error = $state<string | null>(null);

  let currentWarren = $state<(Warren & { sourceUri: string }) | null>(null);
  let currentBurrow = $state<(Burrow & { sourceUri: string }) | null>(null);
  let selectedEntry = $state<Entry | null>(null);

  let breadcrumbs = $state<BreadcrumbItem[]>([]);
  let history = $state<Array<{ warren?: Warren & { sourceUri: string }; burrow?: Burrow & { sourceUri: string }; breadcrumbs: BreadcrumbItem[] }>>([]);

  // Navigate to a new address
  async function navigateTo(url: string) {
    loading = true;
    error = null;
    selectedEntry = null;

    try {
      const result = await discover(url);

      if (!result.ok || (!result.data?.warren && !result.data?.burrow)) {
        error = result.error || 'No warren or burrow found at this address';
        loading = false;
        return;
      }

      // Reset state
      history = [];
      currentWarren = result.data.warren || null;
      currentBurrow = result.data.burrow || null;

      // Set breadcrumbs
      breadcrumbs = [];
      if (currentWarren) {
        breadcrumbs.push({
          uri: currentWarren.sourceUri,
          title: currentWarren.title || 'Warren',
          type: 'warren'
        });
      }
      if (currentBurrow && !currentWarren) {
        breadcrumbs.push({
          uri: currentBurrow.sourceUri,
          title: currentBurrow.title || 'Burrow',
          type: 'burrow'
        });
      }

      address = url;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load';
    } finally {
      loading = false;
    }
  }

  // Select a burrow from warren
  async function selectBurrowRef(ref: BurrowReference) {
    if (!currentWarren) return;

    loading = true;
    error = null;
    selectedEntry = null;

    try {
      const uri = resolveUri(currentWarren.baseUri, ref.uri);
      const result = await fetchBurrow(uri);

      if (!result.ok || !result.data) {
        error = result.error || 'Failed to load burrow';
        loading = false;
        return;
      }

      // Save current state to history
      history = [...history, { warren: currentWarren, breadcrumbs: [...breadcrumbs] }];

      currentBurrow = result.data;

      // Update breadcrumbs
      breadcrumbs = [...breadcrumbs, {
        uri: result.data.sourceUri,
        title: result.data.title || ref.title || ref.id,
        type: 'burrow'
      }];
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load burrow';
    } finally {
      loading = false;
    }
  }

  // Select a federated warren
  async function selectWarrenRef(ref: WarrenReference) {
    if (!currentWarren) return;

    loading = true;
    error = null;
    selectedEntry = null;

    try {
      const uri = resolveUri(currentWarren.baseUri, ref.uri);
      const result = await fetchWarren(uri);

      if (!result.ok || !result.data) {
        error = result.error || 'Failed to load warren';
        loading = false;
        return;
      }

      // Save current state to history
      history = [...history, { warren: currentWarren, breadcrumbs: [...breadcrumbs] }];

      currentWarren = result.data;
      currentBurrow = null;

      // Update breadcrumbs
      breadcrumbs = [...breadcrumbs, {
        uri: result.data.sourceUri,
        title: result.data.title || ref.title || ref.id,
        type: 'warren'
      }];
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load warren';
    } finally {
      loading = false;
    }
  }

  // Navigate into a sub-burrow from entry
  async function selectBurrowEntry(entry: Entry) {
    if (!currentBurrow) return;

    loading = true;
    error = null;
    selectedEntry = null;

    try {
      const uri = resolveUri(currentBurrow.baseUri, entry.uri);
      const result = await fetchBurrow(uri);

      if (!result.ok || !result.data) {
        error = result.error || 'Failed to load burrow';
        loading = false;
        return;
      }

      // Save current state to history
      history = [...history, { warren: currentWarren ?? undefined, burrow: currentBurrow, breadcrumbs: [...breadcrumbs] }];

      currentBurrow = result.data;

      // Update breadcrumbs
      breadcrumbs = [...breadcrumbs, {
        uri: result.data.sourceUri,
        title: result.data.title || entry.title || entry.id,
        type: 'burrow'
      }];
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load burrow';
    } finally {
      loading = false;
    }
  }

  // Select a file entry to view
  function selectFileEntry(entry: Entry) {
    selectedEntry = entry;
  }

  // Navigate via breadcrumb
  function navigateToBreadcrumb(item: BreadcrumbItem) {
    const index = breadcrumbs.findIndex(b => b.uri === item.uri);
    if (index === -1 || index === breadcrumbs.length - 1) return;

    // Find the history entry for this breadcrumb
    const targetHistory = history[index];
    if (targetHistory) {
      currentWarren = targetHistory.warren || null;
      currentBurrow = targetHistory.burrow || null;
      breadcrumbs = targetHistory.breadcrumbs;
      history = history.slice(0, index);
      selectedEntry = null;
    }
  }

  // Go back in history
  function goBack() {
    if (history.length === 0) return;

    const prev = history[history.length - 1];
    currentWarren = prev.warren || null;
    currentBurrow = prev.burrow || null;
    breadcrumbs = prev.breadcrumbs;
    history = history.slice(0, -1);
    selectedEntry = null;
  }

  // Initial load
  $effect(() => {
    if (defaultAddress) {
      navigateTo(defaultAddress);
    }
  });

  const showWarren = $derived(currentWarren && !currentBurrow);
  const showBurrow = $derived(currentBurrow);
  const canGoBack = $derived(history.length > 0);
</script>

<div class="warren-browser">
  <header class="browser-header">
    <div class="header-row">
      <button
        class="back-button"
        onclick={goBack}
        disabled={!canGoBack || loading}
        title="Go back"
      >
        ←
      </button>
      <AddressBar {address} {loading} onNavigate={navigateTo} />
    </div>
    {#if breadcrumbs.length > 0}
      <Breadcrumbs items={breadcrumbs} onNavigate={navigateToBreadcrumb} />
    {/if}
  </header>

  <main class="browser-main">
    {#if loading && !currentWarren && !currentBurrow}
      <div class="loading-overlay">
        <div class="spinner-large"></div>
        <span>Loading...</span>
      </div>
    {:else if error && !currentWarren && !currentBurrow}
      <div class="error-screen">
        <span class="error-icon">⚠️</span>
        <h3>Failed to load</h3>
        <p>{error}</p>
        <button class="retry-button" onclick={() => navigateTo(address)}>Try Again</button>
      </div>
    {:else}
      <div class="content-layout" class:has-preview={selectedEntry}>
        {#if showWarren && currentWarren}
          <div class="main-panel">
            <WarrenView
              warren={currentWarren}
              onSelectBurrow={selectBurrowRef}
              onSelectWarren={selectWarrenRef}
            />
          </div>
        {:else if showBurrow && currentBurrow}
          <div class="sidebar-panel">
            <BurrowView
              burrow={currentBurrow}
              onSelectEntry={selectFileEntry}
              onSelectBurrow={selectBurrowEntry}
              selectedEntryId={selectedEntry?.id}
            />
          </div>
          {#if selectedEntry}
            <div class="preview-panel">
              <ContentViewer burrow={currentBurrow} entry={selectedEntry} />
            </div>
          {:else}
            <div class="preview-panel empty-preview">
              <div class="empty-preview-content">
                <span class="preview-icon">📄</span>
                <p>Select a file to preview its contents</p>
              </div>
            </div>
          {/if}
        {/if}
      </div>

      {#if loading}
        <div class="loading-indicator">
          <div class="loading-bar"></div>
        </div>
      {/if}

      {#if error}
        <div class="error-toast">
          <span>⚠️ {error}</span>
          <button class="dismiss" onclick={() => error = null}>×</button>
        </div>
      {/if}
    {/if}
  </main>
</div>

<style>
  .warren-browser {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 400px;
    background: var(--wb-bg, #0f0f1a);
    color: var(--wb-text, #e5e7eb);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --wb-bg: #0f0f1a;
    --wb-text: #e5e7eb;
    --wb-muted: #6b7280;
    --wb-border: #2d2d44;
    --wb-primary: #6366f1;
    --wb-primary-hover: #4f46e5;
    --wb-link: #818cf8;
    --wb-input-bg: #1a1a2e;
    --wb-card-bg: #1e1e32;
    --wb-card-hover: #252540;
    --wb-hover: rgba(99, 102, 241, 0.1);
    --wb-selected: rgba(99, 102, 241, 0.2);
    --wb-tag-bg: rgba(99, 102, 241, 0.15);
    --wb-icon-bg: rgba(99, 102, 241, 0.1);
    --wb-content-bg: #12121e;
    --wb-code-bg: #0d0d15;
    --wb-info-bg: rgba(99, 102, 241, 0.1);
    --wb-error: #ef4444;
    --wb-warning: #f59e0b;
  }

  .browser-header {
    padding: 16px;
    border-bottom: 1px solid var(--wb-border);
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex-shrink: 0;
  }

  .header-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .back-button {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--wb-input-bg);
    border: 1px solid var(--wb-border);
    border-radius: 8px;
    color: var(--wb-text);
    font-size: 18px;
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }

  .back-button:hover:not(:disabled) {
    background: var(--wb-hover);
    border-color: var(--wb-primary);
  }

  .back-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .browser-main {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  .content-layout {
    display: flex;
    height: 100%;
  }

  .main-panel {
    flex: 1;
    overflow: auto;
  }

  .sidebar-panel {
    width: 320px;
    min-width: 280px;
    max-width: 400px;
    border-right: 1px solid var(--wb-border);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .preview-panel {
    flex: 1;
    overflow: hidden;
    min-width: 0;
  }

  .empty-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--wb-content-bg);
  }

  .empty-preview-content {
    text-align: center;
    color: var(--wb-muted);
  }

  .preview-icon {
    font-size: 48px;
    display: block;
    margin-bottom: 12px;
    opacity: 0.5;
  }

  .loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background: var(--wb-bg);
    color: var(--wb-muted);
  }

  .spinner-large {
    width: 48px;
    height: 48px;
    border: 4px solid var(--wb-border);
    border-top-color: var(--wb-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-screen {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    text-align: center;
    padding: 24px;
  }

  .error-screen .error-icon {
    font-size: 48px;
  }

  .error-screen h3 {
    margin: 0;
    font-size: 20px;
    color: var(--wb-text);
  }

  .error-screen p {
    margin: 0;
    color: var(--wb-error);
    max-width: 400px;
  }

  .retry-button {
    background: var(--wb-primary);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 10px 20px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s ease;
    margin-top: 8px;
  }

  .retry-button:hover {
    background: var(--wb-primary-hover);
  }

  .loading-indicator {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--wb-border);
    overflow: hidden;
  }

  .loading-bar {
    height: 100%;
    width: 30%;
    background: var(--wb-primary);
    animation: loading 1s ease-in-out infinite;
  }

  @keyframes loading {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(400%);
    }
  }

  .error-toast {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(239, 68, 68, 0.9);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .error-toast .dismiss {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    opacity: 0.8;
  }

  .error-toast .dismiss:hover {
    opacity: 1;
  }

  @media (max-width: 768px) {
    .content-layout {
      flex-direction: column;
    }

    .sidebar-panel {
      width: 100%;
      max-width: none;
      height: 40%;
      border-right: none;
      border-bottom: 1px solid var(--wb-border);
    }

    .preview-panel {
      height: 60%;
    }

    .content-layout.has-preview .sidebar-panel {
      height: 35%;
    }

    .content-layout.has-preview .preview-panel {
      height: 65%;
    }
  }
</style>
