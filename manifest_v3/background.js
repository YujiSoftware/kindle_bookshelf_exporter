chrome.action.onClicked.addListener((ev) => {
    chrome.tabs.create({ url: "https://www.amazon.co.jp/hz/mycd/myx/" }, (tab) => {
        chrome.scripting.executeScript({
            target: {tabId: tab.id},
            files: ['content.js'],            
            world: 'MAIN'
        });
    });
});
