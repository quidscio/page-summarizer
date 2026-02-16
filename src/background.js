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

async function applyActionBehavior() {
  const { skipPopupOnActionClick } = await chrome.storage.sync.get('skipPopupOnActionClick');
  const popup = skipPopupOnActionClick ? '' : 'src/pages/popup.html';
  await chrome.action.setPopup({ popup });
}

function createActionContextMenus() {
  chrome.contextMenus.remove(OPEN_POPUP_MENU_ID, () => {
    // Ignore the expected "not found" case when reloading the extension.
    chrome.runtime.lastError;

    chrome.contextMenus.create({
      id: OPEN_POPUP_MENU_ID,
      title: 'Open popup',
      contexts: ['action'],
    });
  });
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
  }
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
