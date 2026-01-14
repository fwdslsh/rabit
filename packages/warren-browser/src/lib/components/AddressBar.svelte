<script lang="ts">
  interface Props {
    address: string;
    loading: boolean;
    onNavigate: (url: string) => void;
  }

  let { address, loading, onNavigate }: Props = $props();

  let inputValue = $state(address);

  function handleSubmit(event: Event) {
    event.preventDefault();
    if (inputValue.trim()) {
      onNavigate(inputValue.trim());
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleSubmit(event);
    }
  }

  $effect(() => {
    inputValue = address;
  });
</script>

<form class="address-bar" onsubmit={handleSubmit}>
  <span class="protocol">warren://</span>
  <input
    type="text"
    bind:value={inputValue}
    placeholder="warren.fwdslsh.dev"
    disabled={loading}
    onkeydown={handleKeydown}
    class="address-input"
  />
  <button type="submit" disabled={loading} class="go-button">
    {#if loading}
      <span class="spinner"></span>
    {:else}
      Go
    {/if}
  </button>
</form>

<style>
  .address-bar {
    display: flex;
    align-items: center;
    gap: 0;
    background: var(--wb-input-bg, #1a1a2e);
    border: 1px solid var(--wb-border, #2d2d44);
    border-radius: 8px;
    padding: 4px;
    width: 100%;
    max-width: 600px;
  }

  .protocol {
    padding: 8px 4px 8px 12px;
    color: var(--wb-muted, #6b7280);
    font-family: monospace;
    font-size: 14px;
    user-select: none;
  }

  .address-input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--wb-text, #e5e7eb);
    font-family: monospace;
    font-size: 14px;
    padding: 8px 4px;
    outline: none;
  }

  .address-input::placeholder {
    color: var(--wb-muted, #6b7280);
  }

  .address-input:disabled {
    opacity: 0.6;
  }

  .go-button {
    background: var(--wb-primary, #6366f1);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease;
    min-width: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .go-button:hover:not(:disabled) {
    background: var(--wb-primary-hover, #4f46e5);
  }

  .go-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
