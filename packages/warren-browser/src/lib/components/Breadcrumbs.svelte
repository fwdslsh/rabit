<script lang="ts">
  import type { BreadcrumbItem } from '../types';

  interface Props {
    items: BreadcrumbItem[];
    onNavigate: (item: BreadcrumbItem) => void;
  }

  let { items, onNavigate }: Props = $props();
</script>

<nav class="breadcrumbs" aria-label="Navigation breadcrumbs">
  {#each items as item, index}
    {#if index > 0}
      <span class="separator">/</span>
    {/if}
    <button
      class="breadcrumb"
      class:current={index === items.length - 1}
      onclick={() => onNavigate(item)}
      disabled={index === items.length - 1}
    >
      <span class="icon">{item.type === 'warren' ? '🏠' : '🐰'}</span>
      <span class="label">{item.title}</span>
    </button>
  {/each}
</nav>

<style>
  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 14px;
  }

  .separator {
    color: var(--wb-muted, #6b7280);
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    color: var(--wb-link, #818cf8);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background 0.15s ease;
  }

  .breadcrumb:hover:not(:disabled) {
    background: var(--wb-hover, rgba(99, 102, 241, 0.1));
  }

  .breadcrumb:disabled {
    cursor: default;
  }

  .breadcrumb.current {
    color: var(--wb-text, #e5e7eb);
    font-weight: 500;
  }

  .icon {
    font-size: 12px;
  }
</style>
