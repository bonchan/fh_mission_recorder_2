import { DJI_PROJECT_BASE_REGEX, ICONS_ON, ICONS_OFF } from '@/utils/constants';

export default defineBackground(() => {
  /**
   * Updates the extension icon and side panel availability
   */
  const generalListener = async (tabId: number, url: string | undefined) => {
    const isMatch = !!url?.match(DJI_PROJECT_BASE_REGEX);

    await browser.action.setIcon({
      tabId,
      path: isMatch ? ICONS_ON : ICONS_OFF,
    });

    // We enable/disable the side panel based on the URL match
    await browser.sidePanel.setOptions({
      tabId,
      path: 'sidepanelview.html',
      enabled: isMatch
    });
  };

  browser.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return;

    // Check if the current URL is a match before trying to open
    const isMatch = !!tab.url?.match(DJI_PROJECT_BASE_REGEX);
    
    if (isMatch) {
      await browser.sidePanel.open({ tabId: tab.id });
    }
  });

  browser.tabs.onActivated.addListener(async (info) => {
    const tab = await browser.tabs.get(info.tabId);
    await generalListener(info.tabId, tab.url);
  });

  browser.tabs.onUpdated.addListener((tabId, info, tab) => {
    if (info.status === 'complete' || info.url) {
      generalListener(tabId, tab.url);
    }
  });
});