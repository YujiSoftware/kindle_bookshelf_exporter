'use strict';

(function(){
    async function collect(update) {
        const batchSize = 100;
        const csrfToken = window.wrappedJSObject.csrfToken;
        let startIndex = 0;
        let hasMoreItems = true;
        let items = [];
    
        while (hasMoreItems) {
            const post = JSON.stringify({
                "param": {
                    "OwnershipData": {
                        "sortOrder": "DESCENDING",
                        "sortIndex": "DATE",
                        "startIndex": startIndex,
                        "batchSize": batchSize,
                        "contentType": "Ebook",
                        "totalContentCount": 0,
                        "itemStatus": [
                            "Active"
                        ],
                        "originType": [
                            "Purchase",
                            "Pottermore"
                        ],
                        "isExtendedMYK": false
                    }
                }
            });
    
            const response = await fetch("https://www.amazon.co.jp/hz/mycd/ajax", {
                "headers": {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin"
                },
                "body": new URLSearchParams({ "data": post, "csrfToken": csrfToken }),
                "method": "POST",
                "credentials": "include"
            });
            const json = await response.json();
            if (json.hasOwnProperty("success") && !json["success"]) {
                throw json["error"];
            }
    
            const data = json["OwnershipData"];
            hasMoreItems = data["hasMoreItems"];
            startIndex += batchSize;
    
            items.push(...data["items"]);
    
            update(items.length, data["numberOfItems"])
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
            <a class="myx-button myx-button-primary csv-download"><span class="myx-button-inner"><button class="myx-button-text">CSV でダウンロード</button></span></a>
            <a class="myx-button myx-button-primary json-download"><span class="myx-button-inner"><button class="myx-button-text">JSON でダウンロード</button></span></a>
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