'use strict';

(function(){
    async function collect(update) {
        const batchSize = 100;
        const csrfToken = window.wrappedJSObject ? window.wrappedJSObject.csrfToken : window.csrfToken;
        let startIndex = 0;
        let numberOfItems = Number.MAX_SAFE_INTEGER;
        let items = [];
    
        while (items.length < numberOfItems) {
            const post = JSON.stringify({
                "contentType": "Ebook",
                "contentCategoryReference": "booksAll",
                "itemStatusList": [
                    "Active"
                ],
                "originTypes": [
                    "Purchase",
                    "Pottermore"
                ],
                "showSharedContent": true,
                "fetchCriteria": {
                    "sortOrder": "DESCENDING",
                    "sortIndex": "DATE",
                    "startIndex": startIndex,
                    "batchSize": batchSize,
                    "totalContentCount": -1
                },
                "surfaceType": "Desktop"
            });
    
            const response = await fetch("https://www.amazon.co.jp/hz/mycd/digital-console/ajax", {
                "headers": {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin"
                },
                "body": new URLSearchParams({ "activity": "GetContentOwnershipData", "activityInput": post, "csrfToken": csrfToken }),
                "method": "POST",
                "credentials": "include"
            });
            const json = await response.json();
            if (json.hasOwnProperty("success") && !json["success"]) {
                throw json["error"];
            }
    
            const data = json["GetContentOwnershipData"];
            numberOfItems = data["numberOfItems"];
            startIndex += batchSize;
    
            items.push(...data["items"]);
    
            update(items.length, numberOfItems)
        }
    
        return items;
    };
    
    function downloadCSV(items) {
        const rows =
            items.map(item => {
                const row = [
                    item["title"],
                    item["authors"],
                    item["acquiredDate"],
                    item["readStatus"]
                ];
    
                return row
                    .map(v => v ?? "")
                    .map(v => '"' + v.replaceAll('"', '""') + '"')
            });
        rows.unshift(['"title"', '"authors"', '"date"', '"status"']);
    
        const csv = rows.map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv", endings: "native" });
        const link = document.createElement('a');
        link.download = "kindle.csv";
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    };
    
    function downloadJSON(items) {
        const rows =
            items.map(item => ({
                "title": item["title"],
                "authors": item["authors"],
                "acquiredTime": item["acquiredTime"],
                "readStatus": item["readStatus"],
                "asin": item["asin"],
                "productImage": item["productImage"]
            }));
    
        const blob = new Blob([JSON.stringify(rows)], { type: "text/javascript", endings: "native" });
        const link = document.createElement('a');
        link.download = 'kindle.json';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    };
    
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
        position: "absolute",
        top: "0px",
        left: "0px",
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(255,255,255,0.9)",
        zIndex: 999,
    });
    
    const panel = document.createElement("div");
    Object.assign(panel.style, {
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    });
    overlay.appendChild(panel);
    
    panel.insertAdjacentHTML('beforeend', `
    <div style="background-color: gainsboro; padding: 30px; border-radius: 10px;">
        <div style="font-size: 28px; margin-bottom: 1em;">Kindle 本の一覧をダウンロード</div>
        <div class="buttons" style="display: flex; justify-content: center;">
            <button class="action_button csv-download" style="display: flex; border-radius: 3px; min-height: 1.8rem; border-color: rgb(173, 177, 184) rgb(162, 166, 172) rgb(141, 144, 150); border-style: solid; border-width: 1px; border-image: none 100% / 1 / 0 stretch; cursor: pointer; background: rgba(0, 0, 0, 0) linear-gradient(rgb(247, 248, 250), rgb(231, 233, 236)) repeat scroll 0% 0%; word-break: break-word; outline: currentcolor none medium; text-align: center; align-items: center; justify-content: center; width: 10rem;">CSV でダウンロード</button>
            <div style="padding-right: 0.8rem;"></div>
            <button class="action_button json-download" style="display: flex; border-radius: 3px; min-height: 1.8rem; border-color: rgb(173, 177, 184) rgb(162, 166, 172) rgb(141, 144, 150); border-style: solid; border-width: 1px; border-image: none 100% / 1 / 0 stretch; cursor: pointer; background: rgba(0, 0, 0, 0) linear-gradient(rgb(247, 248, 250), rgb(231, 233, 236)) repeat scroll 0% 0%; word-break: break-word; outline: currentcolor none medium; text-align: center; align-items: center; justify-content: center; width: 10rem;">JSON でダウンロード</button>
        </div>
        <div class="status" style="display: none;">
            <progress class="progress" style="width: 100%;"></progress>
            <p class="progress-text" style="text-align: center;">処理中 (<span class="progress-value">---</span> / <span class="progress-max">---</span>)</p>
        </div>
    </div>`);
    
    async function run(download) {
        const buttons = panel.getElementsByClassName("buttons")[0];
        buttons.style.display = "none";
        const status = panel.getElementsByClassName("status")[0];
        status.style.display = "block";
    
        const progress = status.getElementsByClassName("progress")[0];
        const progressValue = status.getElementsByClassName("progress-value")[0];
        const progressMax = status.getElementsByClassName("progress-max")[0];
        const update = function (value, max) {
            progress.value = value;
            progressValue.innerText = value;
            progress.max = max;
            progressMax.innerText = max;
        }
    
        const items = await collect(update);
        download(items);
    
        const progressText = status.getElementsByClassName("progress-text")[0];
        progressText.innerText = "完了";
    }
    
    panel.getElementsByClassName("csv-download")[0].addEventListener("click", async function (event) {
        await run(downloadCSV);
    });
    
    panel.getElementsByClassName("json-download")[0].addEventListener("click", async function (event) {
        await run(downloadJSON);
    });
    
    window.scrollTo(0, 0);
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
})();