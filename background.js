chrome.browserAction.onClicked.addListener((ev) => {
    chrome.tabs
        .create({ url: "https://www.amazon.co.jp/hz/mycd/digital-console/contentlist/booksAll/" }, () => {
            chrome.tabs.executeScript({
                file: "./content.js",
            });
        });
});
