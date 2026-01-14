<script lang="ts">
  import WarrenBrowser from './lib/WarrenBrowser.svelte';
</script>

<div class="demo-container">
  <WarrenBrowser defaultAddress="warren.fwdslsh.dev" />
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: #0f0f1a;
  }

  .demo-container {
    width: 100vw;
    height: 100vh;
  }
</style>
