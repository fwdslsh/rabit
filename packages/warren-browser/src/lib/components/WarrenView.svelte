<script lang="ts">
  import type { Warren, BurrowReference, WarrenReference } from '../types';
  import { sortByPriority } from '../client';

  interface Props {
    warren: Warren;
    onSelectBurrow: (ref: BurrowReference) => void;
    onSelectWarren: (ref: WarrenReference) => void;
  }

  let { warren, onSelectBurrow, onSelectWarren }: Props = $props();

  const sortedBurrows = $derived(sortByPriority(warren.burrows || []));
  const sortedWarrens = $derived(warren.warrens || []);
</script>

<div class="warren-view">
  <header class="warren-header">
    {#if warren.title}
      <h2 class="warren-title">{warren.title}</h2>
    {/if}
    {#if warren.description}
      <p class="warren-description">{warren.description}</p>
    {/if}
    {#if warren.updated}
      <span class="warren-updated">Updated: {new Date(warren.updated).toLocaleDateString()}</span>
    {/if}
  </header>

  {#if sortedBurrows.length > 0}
    <section class="section">
      <h3 class="section-title">Burrows</h3>
      <div class="item-grid">
        {#each sortedBurrows as burrow}
          <button class="item-card" onclick={() => onSelectBurrow(burrow)}>
            <div class="item-icon">🐰</div>
            <div class="item-content">
              <span class="item-title">{burrow.title || burrow.id}</span>
              {#if burrow.description}
                <span class="item-description">{burrow.description}</span>
              {/if}
              {#if burrow.tags && burrow.tags.length > 0}
                <div class="item-tags">
                  {#each burrow.tags.slice(0, 3) as tag}
                    <span class="tag">{tag}</span>
                  {/each}
                </div>
              {/if}
            </div>
            <div class="item-arrow">→</div>
          </button>
        {/each}
      </div>
    </section>
  {/if}

  {#if sortedWarrens.length > 0}
    <section class="section">
      <h3 class="section-title">Federated Warrens</h3>
      <div class="item-grid">
        {#each sortedWarrens as w}
          <button class="item-card federated" onclick={() => onSelectWarren(w)}>
            <div class="item-icon">🏠</div>
            <div class="item-content">
              <span class="item-title">{w.title || w.id}</span>
              {#if w.description}
                <span class="item-description">{w.description}</span>
              {/if}
            </div>
            <div class="item-arrow">→</div>
          </button>
        {/each}
      </div>
    </section>
  {/if}

  {#if sortedBurrows.length === 0 && sortedWarrens.length === 0}
    <div class="empty-state">
      <span class="empty-icon">📭</span>
      <p>This warren is empty</p>
    </div>
  {/if}
</div>

<style>
  .warren-view {
    padding: 24px;
  }

  .warren-header {
    margin-bottom: 32px;
  }

  .warren-title {
    font-size: 24px;
    font-weight: 600;
    color: var(--wb-text, #e5e7eb);
    margin: 0 0 8px 0;
  }

  .warren-description {
    color: var(--wb-muted, #9ca3af);
    font-size: 14px;
    margin: 0 0 8px 0;
    line-height: 1.5;
  }

  .warren-updated {
    font-size: 12px;
    color: var(--wb-muted, #6b7280);
  }

  .section {
    margin-bottom: 32px;
  }

  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--wb-muted, #9ca3af);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 16px 0;
  }

  .item-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .item-card {
    display: flex;
    align-items: center;
    gap: 16px;
    background: var(--wb-card-bg, #1e1e32);
    border: 1px solid var(--wb-border, #2d2d44);
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
    width: 100%;
  }

  .item-card:hover {
    border-color: var(--wb-primary, #6366f1);
    background: var(--wb-card-hover, #252540);
  }

  .item-card.federated {
    border-style: dashed;
  }

  .item-icon {
    font-size: 24px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--wb-icon-bg, rgba(99, 102, 241, 0.1));
    border-radius: 8px;
    flex-shrink: 0;
  }

  .item-content {
    flex: 1;
    min-width: 0;
  }

  .item-title {
    display: block;
    font-weight: 500;
    color: var(--wb-text, #e5e7eb);
    margin-bottom: 4px;
  }

  .item-description {
    display: block;
    font-size: 13px;
    color: var(--wb-muted, #9ca3af);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-tags {
    display: flex;
    gap: 4px;
    margin-top: 8px;
  }

  .tag {
    font-size: 11px;
    padding: 2px 8px;
    background: var(--wb-tag-bg, rgba(99, 102, 241, 0.15));
    color: var(--wb-link, #818cf8);
    border-radius: 4px;
  }

  .item-arrow {
    color: var(--wb-muted, #6b7280);
    font-size: 18px;
    flex-shrink: 0;
  }

  .empty-state {
    text-align: center;
    padding: 48px;
    color: var(--wb-muted, #6b7280);
  }

  .empty-icon {
    font-size: 48px;
    display: block;
    margin-bottom: 16px;
  }
</style>
