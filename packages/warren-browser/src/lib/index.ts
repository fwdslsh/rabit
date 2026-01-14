// Warren Browser - Svelte component for navigating Warren and Burrow content spaces

// Main component
export { default as WarrenBrowser } from './WarrenBrowser.svelte';

// Sub-components (for custom layouts)
export { default as AddressBar } from './components/AddressBar.svelte';
export { default as Breadcrumbs } from './components/Breadcrumbs.svelte';
export { default as WarrenView } from './components/WarrenView.svelte';
export { default as BurrowView } from './components/BurrowView.svelte';
export { default as ContentViewer } from './components/ContentViewer.svelte';

// Client utilities
export {
  normalizeUrl,
  resolveUri,
  discover,
  fetchWarren,
  fetchBurrow,
  fetchContent,
  fetchEntryContent,
  sortByPriority,
  getEntryIcon,
  formatSize
} from './client';

// Types
export type {
  DocumentKind,
  EntryKind,
  Entry,
  AgentInstructions,
  Burrow,
  BurrowReference,
  WarrenReference,
  Warren,
  NavigationItem,
  BreadcrumbItem,
  LoadingState,
  FetchResult
} from './types';
