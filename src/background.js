import { connectPageSummarizer } from './page_summarizer.js';
import { connectSelectionSummarizer } from './selection_summarizer.js';
import { connectFormFiller } from './form_filler.js';

import {
  setDefaultConfig,
  updateConfigToUseProfiles_20231117,
  updateModelNaming_20240129,
  updateModelNaming_20240423,
  updateProfileStructure_20240620,
} from './compat.js';

const OPEN_POPUP_MENU_ID = 'openPopup';
const OPEN_SUMMARIZE_PARENT_MENU_ID = 'openSummarizeBatchParent';
const OPEN_SUMMARIZE_ALL_TABS_MENU_ID = 'openSummarizeAllTabs';
const OPEN_SUMMARIZE_SELECTED_TABS_MENU_ID = 'openSummarizeSelectedTabs';
const BATCH_CONFIRM_LIMIT = 15;

const BLOCKED_URL_PREFIXES = [
  'chrome://',
  'edge://',
  'about:',
  'brave://',
  'vivaldi://',
  'opera://',
  'devtools://',
  'chrome-extension://',
  'view-source:',
];

function popupUrlForTab(tabId, autoSummarize = false) {
  let url = `src/pages/popup.html?tabId=${tabId}`;
  if (autoSummarize) {
    url += '&autoSummarize=1';
  }
  return url;
}

async function openPopupTab(tab, autoSummarize = false) {
  if (!tab || tab.id == null) {
    return;
  }

  const createProperties = {
    url: popupUrlForTab(tab.id, autoSummarize),
  };

  if (typeof tab.index === 'number') {
    createProperties.index = tab.index + 1;
  }

  await chrome.tabs.create(createProperties);
}

function isSummarizableTab(tab) {
  if (!tab || tab.id == null) {
    return false;
  }

  const url = tab.url || tab.pendingUrl || '';
  if (typeof url !== 'string' || url.length === 0) {
    return false;
  }

  return !BLOCKED_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function sortTabsForAdjacentInsertion(tabs) {
  return [...tabs].sort((a, b) => (b.index || 0) - (a.index || 0));
}

async function openSummariesForTabs(tabs) {
  const orderedTabs = sortTabsForAdjacentInsertion(tabs);
  for (const candidateTab of orderedTabs) {
    await openPopupTab(candidateTab, true);
  }
}

async function createBatchWarningPopup(token, count, scope) {
  const url = chrome.runtime.getURL(
    `src/pages/batch_confirm.html?token=${encodeURIComponent(token)}&count=${count}&scope=${encodeURIComponent(scope)}`
  );

  await chrome.windows.create({
    url,
    type: 'popup',
    width: 460,
    height: 280,
  });
}

async function runBatchIfSafe(tabs, scope) {
  const summarizableTabs = tabs.filter(isSummarizableTab);
  if (summarizableTabs.length === 0) {
    return;
  }

  if (summarizableTabs.length <= BATCH_CONFIRM_LIMIT) {
    await openSummariesForTabs(summarizableTabs);
    return;
  }

  const token = crypto.randomUUID();
  await chrome.storage.session.set({
    [`pendingBatch__${token}`]: {
      tabs: summarizableTabs,
      scope,
      createdAt: Date.now(),
    },
  });
  await createBatchWarningPopup(token, summarizableTabs.length, scope);
}

async function collectTabsForScope(tab, scope) {
  if (!tab || tab.windowId == null) {
    return [];
  }

  const query = { windowId: tab.windowId };
  if (scope === 'selected') {
    query.highlighted = true;
  }

  return await chrome.tabs.query(query);
}

async function applyActionBehavior() {
  const { skipPopupOnActionClick } = await chrome.storage.sync.get('skipPopupOnActionClick');
  const popup = skipPopupOnActionClick ? '' : 'src/pages/popup.html';
  await chrome.action.setPopup({ popup });
}

function createActionContextMenus() {
  const menuIds = [
    OPEN_SUMMARIZE_SELECTED_TABS_MENU_ID,
    OPEN_SUMMARIZE_ALL_TABS_MENU_ID,
    OPEN_SUMMARIZE_PARENT_MENU_ID,
    OPEN_POPUP_MENU_ID,
  ];

  let remaining = menuIds.length;
  for (const id of menuIds) {
    chrome.contextMenus.remove(id, () => {
      // Ignore the expected "not found" case when reloading the extension.
      chrome.runtime.lastError;

      remaining -= 1;
      if (remaining !== 0) {
        return;
      }

      chrome.contextMenus.create({
        id: OPEN_POPUP_MENU_ID,
        title: 'Open popup',
        contexts: ['action'],
      });

      chrome.contextMenus.create({
        id: OPEN_SUMMARIZE_PARENT_MENU_ID,
        title: 'Open+Summarize...',
        contexts: ['action'],
      });

      chrome.contextMenus.create({
        id: OPEN_SUMMARIZE_ALL_TABS_MENU_ID,
        parentId: OPEN_SUMMARIZE_PARENT_MENU_ID,
        title: 'All tabs in this window',
        contexts: ['action'],
      });

      chrome.contextMenus.create({
        id: OPEN_SUMMARIZE_SELECTED_TABS_MENU_ID,
        parentId: OPEN_SUMMARIZE_PARENT_MENU_ID,
        title: 'Selected tabs in this window',
        contexts: ['action'],
      });
    });
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  const { skipPopupOnActionClick } = await chrome.storage.sync.get('skipPopupOnActionClick');

  if (skipPopupOnActionClick) {
    await openPopupTab(tab, true);
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === OPEN_POPUP_MENU_ID) {
    await openPopupTab(tab, false);
    return;
  }

  if (info.menuItemId === OPEN_SUMMARIZE_ALL_TABS_MENU_ID) {
    const tabs = await collectTabsForScope(tab, 'all');
    await runBatchIfSafe(tabs, 'all');
    return;
  }

  if (info.menuItemId === OPEN_SUMMARIZE_SELECTED_TABS_MENU_ID) {
    const tabs = await collectTabsForScope(tab, 'selected');
    await runBatchIfSafe(tabs, 'selected');
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || (msg.action !== 'RUN_OPEN_SUMMARIZE_BATCH' && msg.action !== 'CANCEL_OPEN_SUMMARIZE_BATCH')) {
    return;
  }

  (async () => {
    const storageKey = `pendingBatch__${msg.token}`;
    if (msg.action === 'CANCEL_OPEN_SUMMARIZE_BATCH') {
      await chrome.storage.session.remove(storageKey);
      sendResponse({ ok: true });
      return;
    }

    const config = await chrome.storage.session.get(storageKey);
    const pendingBatch = config[storageKey];
    if (!pendingBatch || !Array.isArray(pendingBatch.tabs)) {
      sendResponse({ ok: false, error: 'No pending batch found.' });
      return;
    }

    await openSummariesForTabs(pendingBatch.tabs.filter(isSummarizableTab));
    await chrome.storage.session.remove(storageKey);
    sendResponse({ ok: true });
  })().catch((error) => {
    sendResponse({ ok: false, error: error?.message || String(error) });
  });

  return true;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.skipPopupOnActionClick) {
    applyActionBehavior();
  }
});

// Summarize page
connectPageSummarizer();

// Summarize selected text (context menu item)
connectSelectionSummarizer();

// Fill in form input (context menu item)
connectFormFiller();

// Automatically upgrade the user's config if they are still using the old config format.
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    await setDefaultConfig();
    await updateConfigToUseProfiles_20231117();
    await updateModelNaming_20240129();
    await updateModelNaming_20240423();
    await updateProfileStructure_20240620();
    await applyActionBehavior();
    createActionContextMenus();
  }
});

applyActionBehavior();
createActionContextMenus();
