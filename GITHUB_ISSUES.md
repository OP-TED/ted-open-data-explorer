# GitHub Issues for TED Open Data Explorer

## Table of Contents
- [Critical Bugs (2)](#critical-bugs)
- [High Priority Visual Design (5)](#high-priority-visual-design)
- [Interaction Design Issues (5)](#interaction-design-issues)
- [Code Cleanup (3)](#code-cleanup)
- [Summary](#summary)

---

# Critical Bugs

## Issue #1: Session cleanup feature completely broken - onMounted used incorrectly in Pinia store

**Priority**: 🔴 Critical
**Labels**: bug, critical, state-management
**Component**: Storage/Session Management

### Description
The session expiration cleanup mechanism is broken because `onMounted()` is used inside a Pinia store, where Vue lifecycle hooks don't work. This means expired facets are never cleaned up, defeating the entire purpose of the session-based storage feature added in the ted_together_adjustments branch.

### Problem
`onMounted()` only works inside Vue component `setup()` functions, not in Pinia stores. The cleanup interval is never initialized, so:
- Old session data persists indefinitely
- The 60-second cleanup never runs
- Users see facets from previous browser sessions

### Location
`src/app/controllers/selectionController.js:68-72`

```javascript
// ❌ BROKEN CODE
let cleanupInterval
onMounted(() => {
  cleanupInterval = setInterval(() => {
    facetsList.value = removeExpiredFacets(facetsList.value)
  }, 60000)
})
```

### Expected Behavior
- Expired facets should be cleaned up every 60 seconds
- Session cleanup should start when the store initializes

### Actual Behavior
- `onMounted` has no effect in Pinia stores
- Cleanup never runs
- Session expiration feature is non-functional

### Proposed Solution
Remove `onMounted()` and run the interval directly in the store setup:

```javascript
export const useSelectionController = defineStore('notice', () => {
  initializeStorage()

  const facetsList = useStorage('facets-v3', [])

  // Run cleanup immediately on store init
  const cleanupInterval = setInterval(() => {
    facetsList.value = removeExpiredFacets(facetsList.value)
  }, 60000)

  // Optional: Export cleanup function for manual cleanup
  function cleanup() {
    if (cleanupInterval) clearInterval(cleanupInterval)
  }

  return {
    // ... existing exports
    cleanup
  }
})
```

### How to Test
1. Add test data using `test/test-storage.html`
2. Check browser console for interval execution
3. Verify old session data is cleaned on new session
4. Monitor that cleanup runs every 60 seconds

---

## Issue #2: Memory leak - setInterval never cleaned up

**Priority**: 🔴 Critical
**Labels**: bug, critical, performance, memory-leak
**Component**: Storage/Session Management

### Description
The session cleanup interval is created but never cleared, causing a memory leak. In development with hot-reload, multiple intervals can stack up. Even in production, the interval continues running after components unmount.

### Problem
No corresponding `clearInterval()` or cleanup mechanism exists for the interval created at line 67-72 of `selectionController.js`.

### Location
`src/app/controllers/selectionController.js:67-72`

```javascript
let cleanupInterval  // ❌ Never cleared
onMounted(() => {
  cleanupInterval = setInterval(() => {
    facetsList.value = removeExpiredFacets(facetsList.value)
  }, 60000)
})
// ❌ No onUnmounted() or clearInterval() anywhere
```

### Expected Behavior
- Interval should be cleared when no longer needed
- No memory leaks during development hot-reload
- Proper cleanup on app/component destruction

### Actual Behavior
- Interval runs forever
- Memory usage grows over time
- Multiple intervals can stack in development

### Proposed Solution
Add cleanup mechanism (see Issue #1 for combined fix):

```javascript
const cleanupInterval = setInterval(...)

function cleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
  }
}

// Export cleanup for manual invocation if needed
return { cleanup, /* other exports */ }
```

Or use `watchEffect` with automatic cleanup:

```javascript
watchEffect((onCleanup) => {
  const interval = setInterval(() => {
    facetsList.value = removeExpiredFacets(facetsList.value)
  }, 60000)

  onCleanup(() => clearInterval(interval))
})
```

### How to Test
1. Open DevTools → Performance Monitor
2. Watch memory usage over 5+ minutes
3. Trigger hot-reload multiple times in dev mode
4. Verify memory doesn't continuously grow

---

# High Priority Visual Design

## Issue #3: Split radio button groups look broken and confusing

**Priority**: 🟡 High
**Labels**: ui, visual-design, enhancement
**Component**: DataView

### Description
The view mode selection uses two separate `<n-radio-group>` components for a single choice, creating an awkward visual gap that looks like a bug or two separate controls.

### Location
`src/app/components/DataView.vue:79-92`

### Current Code
```vue
<n-radio-group v-model:value="viewMode" size="small">
  <n-radio-button value="tree" :disabled="tooManyTriples">
    Tree View
  </n-radio-button>
  <n-radio-button value="turtle">
    Turtle
  </n-radio-button>
</n-radio-group>
<!-- Gap in visual layout -->
<n-radio-group v-model:value="viewMode" size="small">
  <n-radio-button value="query">
    SPARQL Query
  </n-radio-button>
</n-radio-group>
```

### Problem
- Two separate radio groups for one logical choice
- Visual gap makes it look broken
- Users might think these are two different controls
- Inconsistent with standard UI patterns

### Proposed Solution
Combine into a single radio group:

```vue
<n-radio-group v-model:value="viewMode" size="small">
  <n-radio-button value="tree" :disabled="tooManyTriples">
    Tree View
  </n-radio-button>
  <n-radio-button value="turtle">
    Turtle
  </n-radio-button>
  <n-radio-button value="query">
    SPARQL Query
  </n-radio-button>
</n-radio-group>
```

### Visual Impact
Before: `[Tree View | Turtle] ............ [SPARQL Query]`
After: `[Tree View | Turtle | SPARQL Query]`

---

## Issue #4: URLs display backwards (RTL text direction) making them unreadable

**Priority**: 🟡 High
**Labels**: ui, visual-design, bug
**Component**: Multiple components

### Description
Multiple components use `direction: rtl` (right-to-left) to truncate long URLs, causing them to display backwards. This makes URLs confusing and unprofessional.

### Locations
- `src/custom-styles.css:100` (`.entity-header a`)
- `src/app/Facet.vue:97` (`.facet-label`)
- `src/app/components/BacklinksView.vue:231` (`.subject-item`)

### Example
Input: `http://data.europa.eu/ontology/epo#Notice`
Display: `ecitoN#ope/ygolotn...`

### Current Code
```css
.entity-header a {
  direction: rtl;      /* ❌ Reverses text */
  text-align: left;
  text-overflow: ellipsis;
}
```

### Problem
- URLs read backwards
- Confusing for users
- Looks broken/unprofessional
- Hard to identify resources

### Proposed Solution

**Option 1: Show end of URL with CSS**
```css
.entity-header a {
  direction: ltr;
  text-align: right;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
```

**Option 2: Truncate in middle with JavaScript**
```javascript
function truncateMiddle(str, maxLength) {
  if (str.length <= maxLength) return str
  const half = Math.floor(maxLength / 2)
  return str.slice(0, half) + '...' + str.slice(-half)
}
```

**Option 3: Use title attribute for full text**
```vue
<a :href="url" :title="url">{{ displayText }}</a>
```

### Affected Components
- Term.vue (entity links)
- Facet.vue (facet labels)
- BacklinksView.vue (subject items)
- custom-styles.css (entity headers)

---

## Issue #5: Fixed widths break responsive layout on smaller screens

**Priority**: 🟡 High
**Labels**: ui, responsive, visual-design
**Component**: Multiple

### Description
Multiple components use hardcoded fixed widths that break responsive design, causing horizontal scrolling on mobile and awkward truncation on different screen sizes.

### Locations and Issues

**custom-styles.css:**
```css
line 96:  max-width: 300px;   /* entity-header a */
line 127: width: 330px;        /* vertical-value > li */
line 144: max-width: 100px;    /* vertical-value .entity-header a */
```

**BacklinksView.vue:222:**
```css
max-width: 200px;  /* subject-item */
```

**Facet.vue:89:**
```css
max-width: 150px;  /* tag-content */
```

### Problem
- Content cuts off at arbitrary points
- Horizontal scrolling on mobile devices
- Wasted space on larger screens
- Inconsistent truncation behavior

### Proposed Solution

1. **Remove fixed widths where possible:**
```css
/* Instead of: */
width: 330px;

/* Use: */
width: 100%;
max-width: 100%;
```

2. **Use container queries or percentages:**
```css
max-width: min(300px, 100%);
```

3. **Use Naive UI's responsive props:**
```vue
<n-space :size="[8, 8]" responsive>
  <!-- Content adapts to screen size -->
</n-space>
```

### Testing
- Test on mobile (320px, 375px, 414px widths)
- Test on tablet (768px, 1024px)
- Test on desktop (1280px, 1920px)
- Verify no horizontal scrolling
- Verify content doesn't awkwardly wrap

---

## Issue #6: Footer layout CSS is incorrect

**Priority**: 🟢 Medium
**Labels**: ui, visual-design, css, introduced-in-ted-together
**Component**: Layout

### Description
The footer added in the ted_together_adjustments branch has CSS issues: height doesn't account for padding, and `align-items` doesn't work because flexbox isn't enabled.

### Location
`index.html:44-51`

### Current Code
```css
.ted-footer {
    height: 30px;           /* ❌ Doesn't include padding */
    padding: 10px 20px;     /* Adds 20px to height */
    align-items: center;    /* ❌ Doesn't work without display: flex */
    background-color: #faf9fb;
    border-top: 1px solid #8e8c8c;
    flex-shrink: 0;
}
```

### Problem
- Declared height (30px) doesn't match actual height (50px with padding)
- `align-items: center` has no effect (not a flex container)
- Content may not be vertically centered

### Proposed Solution
```css
.ted-footer {
    display: flex;
    align-items: center;
    min-height: 30px;       /* Use min-height instead of height */
    padding: 10px 20px;
    background-color: #faf9fb;
    border-top: 1px solid #8e8c8c;
    flex-shrink: 0;
}
```

### Visual Impact
- Properly centers footer text vertically
- More predictable height behavior
- Better handling of multi-line content if needed

---

## Issue #7: Empty input validation has no UI feedback

**Priority**: 🟡 High
**Labels**: ux, interaction-design, enhancement
**Component**: Search

### Description
When users try to search with an empty notice number, nothing happens and there's no feedback explaining why. The validation only logs to console.

### Location
`src/app/Navigator.vue:35-42`

### Current Code
```javascript
function searchByNoticeNumber () {
  if (!noticeNumber.value.trim()) {
    console.warn('Notice number is required')  // ❌ User never sees this
    return
  }
  const facet = createPublicationNumberFacet(noticeNumber.value)
  if (facet) selectionController.selectFacet(facet)
}
```

### Problem
- User clicks "Search" with empty field
- Nothing happens
- No feedback explaining why
- Confusing user experience

### Proposed Solution
Use Naive UI's message system for user feedback:

```javascript
const message = useMessage()  // Already imported

function searchByNoticeNumber () {
  if (!noticeNumber.value.trim()) {
    message.warning('Please enter a publication number')
    return
  }
  const facet = createPublicationNumberFacet(noticeNumber.value)
  if (facet) selectionController.selectFacet(facet)
}
```

**Alternative:** Add visual validation to input field:
```vue
<n-input
  v-model:value="noticeNumber"
  placeholder="Enter publication number"
  :status="noticeNumber.trim() ? undefined : 'warning'"
  @keyup.enter="searchByNoticeNumber"
/>
```

### User Impact
- Clear feedback when validation fails
- Users understand what's required
- Better overall experience

---

# Interaction Design Issues

## Issue #8: Error messages are too technical and unhelpful

**Priority**: 🟡 High
**Labels**: ux, interaction-design, enhancement
**Component**: Multiple

### Description
Error messages throughout the app display raw technical errors (like "NetworkError" or "Failed to fetch") without user-friendly explanations or actionable next steps.

### Locations
- `src/app/components/DataView.vue:51`
- `src/app/components/NoticeView.vue:117`
- Other query execution locations

### Current Code
```vue
<div v-if="error" class="error-message">{{ error.message }}</div>
```

### Problem
Examples of unhelpful messages:
- "NetworkError: Failed to fetch"
- "SyntaxError: Unexpected token"
- "TypeError: Cannot read property 'value' of undefined"

Users don't know:
- What went wrong
- Why it happened
- What they should do next

### Proposed Solution

Create an error message mapper:

```javascript
// composables/useErrorMessages.js
export function getUserFriendlyError(error) {
  const message = error.message?.toLowerCase() || ''

  if (message.includes('network') || message.includes('fetch')) {
    return {
      title: 'Connection Error',
      message: 'Unable to reach the server. Please check your internet connection and try again.',
      action: 'Retry'
    }
  }

  if (message.includes('syntax') || message.includes('query')) {
    return {
      title: 'Query Error',
      message: 'There is an error in the SPARQL query. Please check the syntax and try again.',
      action: 'Edit Query'
    }
  }

  if (message.includes('timeout')) {
    return {
      title: 'Request Timeout',
      message: 'The query is taking too long. Try simplifying your query or adding more filters.',
      action: 'Modify Query'
    }
  }

  // Default fallback
  return {
    title: 'Error',
    message: 'Something went wrong. Please try again or contact support if the problem persists.',
    action: 'Try Again'
  }
}
```

Usage in components:
```vue
<script setup>
import { getUserFriendlyError } from '@/composables/useErrorMessages'

const friendlyError = computed(() =>
  error.value ? getUserFriendlyError(error.value) : null
)
</script>

<template>
  <n-alert v-if="friendlyError" type="error" :title="friendlyError.title">
    {{ friendlyError.message }}
    <template #action>
      <n-button size="small" @click="retry">
        {{ friendlyError.action }}
      </n-button>
    </template>
  </n-alert>
</template>
```

### User Impact
- Clear understanding of what went wrong
- Actionable next steps
- Less frustration and support requests

---

## Issue #9: Navigation buttons have no labels or tooltips

**Priority**: 🟢 Medium
**Labels**: ux, interaction-design, enhancement
**Component**: DataView, BacklinksView

### Description
Previous/Next navigation buttons show only chevron icons without any text labels or tooltips, making their purpose unclear to users.

### Locations
- `src/app/components/DataView.vue:58-77` (facet navigation)
- `src/app/components/BacklinksView.vue:171-190` (pagination)

### Current Code
```vue
<n-button size="small" :disabled="!previousFacet" @click="goToPrevious" secondary>
  <n-icon><ChevronBackOutline/></n-icon>
</n-button>
<n-button size="small" :disabled="!nextFacet" @click="goToNext" secondary>
  <n-icon><ChevronForwardOutline/></n-icon>
</n-button>
```

### Problem
- Users don't know what these buttons do
- Icon-only buttons rely on learned behavior
- Previous/Next could mean different things in different contexts:
  - Navigate through facet history?
  - Navigate through search results?
  - Pagination?

### Proposed Solution

**Option 1: Add tooltips**
```vue
<n-tooltip trigger="hover">
  <template #trigger>
    <n-button size="small" :disabled="!previousFacet" @click="goToPrevious" secondary>
      <n-icon><ChevronBackOutline/></n-icon>
    </n-button>
  </template>
  Previous facet
</n-tooltip>
```

**Option 2: Add text labels**
```vue
<n-button size="small" :disabled="!previousFacet" @click="goToPrevious" secondary>
  <n-icon><ChevronBackOutline/></n-icon>
  Previous
</n-button>
```

**Option 3: Use Naive UI's button group with labels**
```vue
<n-button-group>
  <n-button :disabled="!previousFacet" @click="goToPrevious">
    <template #icon><n-icon><ChevronBackOutline/></n-icon></template>
    Previous
  </n-button>
  <n-button :disabled="!nextFacet" @click="goToNext">
    Next
    <template #icon><n-icon><ChevronForwardOutline/></n-icon></template>
  </n-button>
</n-button-group>
```

### Recommended
Use Option 1 (tooltips) for compact UI, or Option 2 (text labels) for better clarity.

---

## Issue #10: No confirmation when removing facets

**Priority**: 🟢 Medium
**Labels**: ux, interaction-design, enhancement
**Component**: Facets

### Description
Clicking the X button on a facet tag immediately removes it without confirmation or undo capability. Accidental clicks result in lost work.

### Locations
- `src/app/Facet.vue:43-45`
- `src/app/FacetsList.vue:30-35`

### Current Code
```javascript
function handleClose (e) {
  emit('remove', props.index)  // ❌ Immediate removal
}
```

### Problem
- Accidental clicks remove facets instantly
- No way to undo
- Loss of work if facet was result of complex navigation
- Especially problematic on mobile (fat finger clicks)

### Proposed Solution

**Option 1: Confirmation dialog**
```javascript
async function handleClose (e) {
  const confirmed = await new Promise((resolve) => {
    const dialog = window.$dialog.warning({
      title: 'Remove Facet',
      content: 'Are you sure you want to remove this facet?',
      positiveText: 'Remove',
      negativeText: 'Cancel',
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
    })
  })

  if (confirmed) {
    emit('remove', props.index)
  }
}
```

**Option 2: Undo toast (better UX)**
```javascript
function handleClose (e) {
  const removedFacet = facetsList.value[props.index]
  emit('remove', props.index)

  message.warning('Facet removed', {
    duration: 5000,
    closable: true,
    action: () => h(
      NButton,
      {
        text: true,
        type: 'primary',
        onClick: () => {
          // Restore facet
          selectionController.restoreFacet(removedFacet, props.index)
        }
      },
      { default: () => 'Undo' }
    )
  })
}
```

### Recommendation
Use Option 2 (undo toast) - modern pattern, non-intrusive, allows accidental click recovery.

---

## Issue #11: Pagination shows vague "of many" instead of total count

**Priority**: 🟢 Low
**Labels**: ux, enhancement
**Component**: BacklinksView

### Description
The backlinks pagination displays "Showing 1-30 of many" which is vague and unprofessional. Users want to know the total count.

### Location
`src/app/components/BacklinksView.vue:40-44`

### Current Code
```javascript
const paginationInfo = computed(() => {
  if (!results.value?.dataset) return ''
  // ... calculation
  if (hasNextPage.value) {
    return `Showing ${start}-${end} of many`  // ❌ Vague
  } else {
    return `Showing ${start}-${end}`
  }
})
```

### Problem
- "of many" is vague and unprofessional
- Users can't gauge how much data exists
- Doesn't indicate if there are 2 more pages or 200

### Proposed Solution

**Option 1: Calculate total with COUNT query**
```javascript
// Add a COUNT query alongside the CONSTRUCT query
async function loadBacklinks() {
  const dataQuery = createBacklinkQuery(currentOffset.value)
  const countQuery = createBacklinkCountQuery()

  const [dataResults, countResults] = await Promise.all([
    executeQuery(dataQuery),
    executeCountQuery(countQuery)
  ])

  totalCount.value = countResults.count
}

// Update display
return `Showing ${start}-${end} of ${totalCount.value.toLocaleString()}`
```

**Option 2: Better wording without count**
```javascript
if (hasNextPage.value) {
  return `Showing ${start}-${end} (more available)`
} else {
  return `Showing ${start}-${end} (all results)`
}
```

**Option 3: Progressive loading indicator**
```javascript
return `Showing ${start}-${end}${hasNextPage.value ? ' • Load more ↓' : ''}`
```

### Recommendation
Use Option 2 (better wording) for quick fix, or Option 1 (total count) for complete solution.

---

## Issue #12: Selected facet indicator is too subtle

**Priority**: 🟢 Medium
**Labels**: ui, visual-design, enhancement
**Component**: Facets

### Description
The difference between selected and unselected facet tags is very subtle (tag type changes from "default" to "info"), making it hard for users to identify which facet is currently active.

### Location
`src/app/Facet.vue:37`

### Current Code
```javascript
const tagType = computed(() => (props.isSelected ? 'info' : 'default'))
```

```vue
<n-tag :type="tagType" closable @click="handleClick">
  <div class="tag-content">
    <span class="facet-label">{{ facetLabel }}</span>
  </div>
</n-tag>
```

### Problem
- Color change is subtle (especially for colorblind users)
- No other visual indicator
- Users may not notice which facet is active
- Especially hard to see when many facets are present

### Proposed Solution

**Option 1: Add icon indicator**
```vue
<n-tag :type="tagType" closable @click="handleClick">
  <div class="tag-content">
    <n-icon v-if="isSelected" size="small" style="margin-right: 4px">
      <CheckmarkCircle />
    </n-icon>
    <span class="facet-label">{{ facetLabel }}</span>
  </div>
</n-tag>
```

**Option 2: Add border highlight**
```css
.custom-facet-tag[data-selected="true"] {
  border: 2px solid var(--n-border-color-active);
  box-shadow: 0 0 0 2px rgba(24, 160, 88, 0.2);
}
```

**Option 3: Add background color change**
```javascript
const tagType = computed(() => (props.isSelected ? 'success' : 'default'))
```

**Option 4: Combine multiple indicators**
```vue
<n-tag
  :type="tagType"
  :bordered="isSelected"
  :class="{ 'selected-facet': isSelected }"
  closable
  @click="handleClick"
>
  <div class="tag-content">
    <span v-if="isSelected" class="active-dot">●</span>
    <span class="facet-label">{{ facetLabel }}</span>
  </div>
</n-tag>

<style>
.selected-facet {
  font-weight: 600;
}
.active-dot {
  color: var(--n-color-success);
  margin-right: 4px;
}
</style>
```

### Recommendation
Use Option 4 (combined indicators) for strongest visual feedback.

---

# Code Cleanup

## Issue #13: Dead code - Random button functions orphaned

**Priority**: 🟢 Low
**Labels**: code-quality, cleanup, introduced-in-ted-together
**Component**: Navigator, TopBar

### Description
The `handleSelectRandom()` function still exists in both Navigator.vue and TopBar.vue, but the UI buttons were removed in the ted_together_adjustments branch. This leaves dead code and unused imports.

### Locations
- `src/app/Navigator.vue:44-47` (function declared but unused)
- `src/app/TopBar.vue:27-30` (function declared but unused)
- Navigator button deleted at line 269-272
- TopBar button commented at line 55

### Current State
```javascript
// ❌ Function exists but is never called
async function handleSelectRandom () {
  noticeNumber.value = await getRandomPublicationNumber()
  searchByNoticeNumber()
}

// Import is now unused
import { getRandomPublicationNumber } from '../services/randomNoticeService.js'

// Button was removed/commented
// <n-button @click="handleSelectRandom">Random</n-button>
```

### Proposed Solution

**Remove dead code from both files:**

1. Delete `handleSelectRandom()` function
2. Remove import: `import { getRandomPublicationNumber } from ...`
3. Remove commented button from TopBar.vue line 55

**Files to modify:**
- `src/app/Navigator.vue`: Remove lines 44-47, remove import
- `src/app/TopBar.vue`: Remove lines 27-30, remove line 55, remove import

### Note
If random notice functionality might be restored later, consider:
- Documenting the decision in comments
- Creating a feature flag instead of deleting code
- Adding to project backlog

---

## Issue #14: Commented code should be removed

**Priority**: 🟢 Low
**Labels**: code-quality, cleanup
**Component**: Multiple

### Description
Multiple files contain large blocks of commented code that should either be deleted or properly feature-flagged. Commented code creates maintenance burden and confusion.

### Locations

**1. Navigator.vue:76** (History panel)
```javascript
/*  { i: 'facets-2', x: 10, y: 13, w: 2, h: 52, title: 'History',
     component: 'facets-2', collapsed: false }, */
```

**2. Navigator.vue:281-283** (History panel template)
```vue
<!-- History -->
<div v-else-if="item.component === 'facets-2'" class="facets-content">
  <FacetsList :facets="verticalFacets"/>
</div>
```

**3. TopBar.vue:55** (Random button)
```vue
<!-- n-button secondary size="tiny" @click="handleSelectRandom">Random</n-button -->
```

**4. custom-styles.css:154-179** (Layout experiments)
```css
/*TODO Ask for feedback about distinct layout options: */
/*Option 1 */
/*.row > .property {*/
/*    flex: 0 0 180px; !* fixed width, adjust as needed *!*/
/*    word-wrap: break-word;*/
/*}*/
/* ... more commented options */
```

**5. index.html:40** (Commented border)
```css
/* border-bottom: 1px solid #dee2e6; */
/*  padding: 0.5rem 0; */
```

### Problem
- Creates maintenance confusion
- Future developers don't know if code is intentionally disabled or forgotten
- Clutters codebase
- Git history already preserves old code

### Proposed Solution

**Decision tree:**
1. **If feature might return soon** → Use feature flag instead:
   ```javascript
   const ENABLE_HISTORY_PANEL = false

   if (ENABLE_HISTORY_PANEL) {
     // ... feature code
   }
   ```

2. **If feature is experiment/uncertain** → Document decision:
   ```javascript
   // History panel removed in PR #22 - see discussion in issue #123
   // verticalFacets computed property kept for potential future use
   ```

3. **If feature is definitely not coming back** → Delete entirely
   - Git history preserves the code if needed later
   - Use `git log -S "facets-2"` to find it

**Recommended action:**
- Delete commented code from all locations
- Add brief comment explaining removal if context needed
- Rely on git history for recovery

---

## Issue #15: Storage initialization timing is fragile

**Priority**: 🟢 Medium
**Labels**: code-quality, maintenance, state-management
**Component**: Storage

### Description
The storage initialization in `selectionController.js` relies on careful ordering of statements, but has no safeguards to prevent accidental reordering during refactoring. This could cause silent breakage.

### Location
`src/app/controllers/selectionController.js:34-51`

### Current Code
```javascript
export const useSelectionController = defineStore('notice', () => {
  // ⚠️ CRITICAL: This MUST run before useStorage
  initializeStorage()

  // ... other composables (20+ lines)

  // ⚠️ CRITICAL: Reads localStorage - must happen AFTER initializeStorage
  const facetsList = useStorage('facets-v3', [])

  // ... rest of store
})
```

### Problem
- No safeguard preventing reordering
- No comment warning about order dependency
- Could be accidentally broken during refactoring
- Silent failure mode (old data persists)

### Proposed Solution

**Option 1: Add protective wrapper**
```javascript
function initializeFacetsStorage() {
  initializeStorage()
  return useStorage('facets-v3', [])
}

export const useSelectionController = defineStore('notice', () => {
  const facetsList = initializeFacetsStorage()
  // ... rest of code
})
```

**Option 2: Add clear warning comments**
```javascript
export const useSelectionController = defineStore('notice', () => {
  // ⚠️ CRITICAL ORDER DEPENDENCY ⚠️
  // initializeStorage() MUST run before useStorage('facets-v3')
  // to ensure old session data is cleaned up before reading.
  // DO NOT reorder without testing session expiration!
  initializeStorage()

  const { ... } = useUrlFacetParams()
  const { ... } = useFacetQuery()

  // Storage now cleaned, safe to read
  const facetsList = useStorage('facets-v3', [])
  // ... rest of code
})
```

**Option 3: Integrate into useStorage wrapper**
```javascript
// utils/useSessionStorage.js
export function useSessionStorage(key, defaultValue) {
  // Automatically clean on first access
  if (!sessionCleanupRun) {
    initializeStorage()
    sessionCleanupRun = true
  }
  return useStorage(key, defaultValue)
}
```

### Recommendation
Use Option 2 (clear comments) for quick fix, or Option 1 (wrapper) for robustness.

---

# Summary

## Issues by Priority

### 🔴 Critical (2) - Fix Immediately
1. Session cleanup broken (onMounted in store)
2. Memory leak (interval never cleared)

### 🟡 High (5) - Fix Soon
3. Split radio buttons
4. RTL text direction
5. Fixed widths breaking responsive
6. Footer CSS issues
7. Empty input validation

### 🟢 Medium-Low (8) - Plan to Address
8. Error messages too technical
9. Navigation buttons need labels
10. No confirmation for removing facets
11. Pagination "of many"
12. Selected facet indicator subtle
13. Dead code (Random function)
14. Commented code cleanup
15. Storage initialization fragile

---

**Total: 15 well-defined issues ready to create**

## How to Use This File

Copy the individual issue sections and paste them into GitHub's issue creation form. Each issue is self-contained with:
- Clear title
- Priority and labels
- Detailed description
- Code examples
- Proposed solutions
- Testing guidance
