chrome.action.onClicked.addListener((ev) => {
    chrome.tabs.create({ url: "https://www.amazon.co.jp/hz/mycd/digital-console/contentlist/booksAll/" }, (tab) => {
        chrome.scripting.executeScript({
            target: {tabId: tab.id},
            files: ['content.js'],            
            world: 'MAIN'
        });
    });
});
