<script lang="ts">
  import type { Burrow, Entry } from '../types';
  import { sortByPriority, getEntryIcon, formatSize } from '../client';

  interface Props {
    burrow: Burrow;
    onSelectEntry: (entry: Entry) => void;
    onSelectBurrow: (entry: Entry) => void;
    selectedEntryId?: string;
  }

  let { burrow, onSelectEntry, onSelectBurrow, selectedEntryId }: Props = $props();

  const sortedEntries = $derived(sortByPriority(burrow.entries));

  const entriesByKind = $derived(() => {
    const groups: Record<string, Entry[]> = {
      burrow: [],
      dir: [],
      map: [],
      file: [],
      link: []
    };

    for (const entry of sortedEntries) {
      if (groups[entry.kind]) {
        groups[entry.kind].push(entry);
      } else {
        groups.file.push(entry);
      }
    }

    return groups;
  });

  function handleEntryClick(entry: Entry) {
    if (entry.kind === 'burrow' || entry.kind === 'map' || entry.kind === 'dir') {
      onSelectBurrow(entry);
    } else if (entry.kind === 'link') {
      window.open(entry.uri, '_blank', 'noopener,noreferrer');
    } else {
      onSelectEntry(entry);
    }
  }
</script>

<div class="burrow-view">
  <header class="burrow-header">
    {#if burrow.title}
      <h2 class="burrow-title">{burrow.title}</h2>
    {/if}
    {#if burrow.description}
      <p class="burrow-description">{burrow.description}</p>
    {/if}
    {#if burrow.agents?.context}
      <div class="agent-context">
        <span class="context-label">AI Context:</span>
        <span class="context-text">{burrow.agents.context}</span>
      </div>
    {/if}
  </header>

  <div class="entries-list">
    {#each sortedEntries as entry}
      <button
        class="entry-item"
        class:selected={entry.id === selectedEntryId}
        class:navigable={entry.kind === 'burrow' || entry.kind === 'map' || entry.kind === 'dir'}
        class:external={entry.kind === 'link'}
        onclick={() => handleEntryClick(entry)}
      >
        <span class="entry-icon">{getEntryIcon(entry.kind)}</span>
        <div class="entry-content">
          <span class="entry-title">{entry.title || entry.id}</span>
          {#if entry.summary}
            <span class="entry-summary">{entry.summary}</span>
          {/if}
        </div>
        <div class="entry-meta">
          {#if entry.sizeBytes}
            <span class="entry-size">{formatSize(entry.sizeBytes)}</span>
          {/if}
          {#if entry.kind === 'burrow' || entry.kind === 'map' || entry.kind === 'dir'}
            <span class="entry-arrow">→</span>
          {:else if entry.kind === 'link'}
            <span class="entry-arrow">↗</span>
          {/if}
        </div>
      </button>
    {/each}
  </div>

  {#if sortedEntries.length === 0}
    <div class="empty-state">
      <span class="empty-icon">📭</span>
      <p>This burrow has no entries</p>
    </div>
  {/if}
</div>

<style>
  .burrow-view {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .burrow-header {
    padding: 16px;
    border-bottom: 1px solid var(--wb-border, #2d2d44);
    flex-shrink: 0;
  }

  .burrow-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--wb-text, #e5e7eb);
    margin: 0 0 4px 0;
  }

  .burrow-description {
    color: var(--wb-muted, #9ca3af);
    font-size: 13px;
    margin: 0;
    line-height: 1.4;
  }

  .agent-context {
    margin-top: 12px;
    padding: 8px 12px;
    background: var(--wb-info-bg, rgba(99, 102, 241, 0.1));
    border-radius: 6px;
    font-size: 12px;
  }

  .context-label {
    color: var(--wb-link, #818cf8);
    font-weight: 500;
    margin-right: 6px;
  }

  .context-text {
    color: var(--wb-muted, #9ca3af);
  }

  .entries-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .entry-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 12px;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s ease;
    text-align: left;
  }

  .entry-item:hover {
    background: var(--wb-hover, rgba(99, 102, 241, 0.1));
  }

  .entry-item.selected {
    background: var(--wb-selected, rgba(99, 102, 241, 0.2));
  }

  .entry-item.navigable .entry-title {
    color: var(--wb-link, #818cf8);
  }

  .entry-item.external .entry-title {
    color: var(--wb-warning, #f59e0b);
  }

  .entry-icon {
    font-size: 16px;
    width: 24px;
    text-align: center;
    flex-shrink: 0;
  }

  .entry-content {
    flex: 1;
    min-width: 0;
  }

  .entry-title {
    display: block;
    font-size: 14px;
    color: var(--wb-text, #e5e7eb);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .entry-summary {
    display: block;
    font-size: 12px;
    color: var(--wb-muted, #6b7280);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 2px;
  }

  .entry-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .entry-size {
    font-size: 11px;
    color: var(--wb-muted, #6b7280);
    font-family: monospace;
  }

  .entry-arrow {
    color: var(--wb-muted, #6b7280);
    font-size: 14px;
  }

  .empty-state {
    text-align: center;
    padding: 48px;
    color: var(--wb-muted, #6b7280);
  }

  .empty-icon {
    font-size: 36px;
    display: block;
    margin-bottom: 12px;
  }
</style>
