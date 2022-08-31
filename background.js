chrome.browserAction.onClicked.addListener((ev) => {
    chrome.tabs
        .create({ url: "https://www.amazon.co.jp/hz/mycd/myx/" }, () => {
            chrome.tabs.executeScript({
                file: "./content.js",
            });
        });
});
