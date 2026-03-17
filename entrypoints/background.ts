import { DJI_PROJECT_BASE_REGEX, ICONS_ON, ICONS_OFF } from '@/utils/constants';

export default defineBackground(() => {
  const registry = new Map<number, number>();
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


  browser.runtime.onMessage.addListener(async (message) => {
    if (message.type === 'OPEN_DASHBOARD') {
      const { missionId, orgId, projectId, sourceTabId } = message;

      const url = browser.runtime.getURL(`/dashboard.html?missionId=${missionId}&orgId=${orgId}&projectId=${projectId}`);

      const dashboardTab = await browser.tabs.create({ url });
      registry.set(sourceTabId, dashboardTab.id!);
    }
  });

  // Listen for tab removals
  browser.tabs.onRemoved.addListener((tabId) => {
    if (registry.has(tabId)) {
      const dashboardId = registry.get(tabId);
      browser.tabs.remove(dashboardId!).catch(() => { }); // Ignore if already closed
      registry.delete(tabId);
    }
  });

});