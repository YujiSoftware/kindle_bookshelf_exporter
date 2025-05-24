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
    
    function downloadBooklog(items) {
        const formatDate = function(time) {
            const pad = (n) => n.toString().padStart(2, "0");
            const d = new Date(time);
            return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        }

        // Shift-JIS 表現
        const textEncoder = new TextEncoder();
        const doubleQuote = textEncoder.encode('"');
        const comma = textEncoder.encode(",");
        const lineBreak = textEncoder.encode("\r\n");
        const one = textEncoder.encode("1");
        const 読み終わった = Uint8Array.of(0x93, 0xc7, 0x82, 0xdd, 0x8f, 0x49, 0x82, 0xed, 0x82, 0xc1, 0x82, 0xbd);
        const 積読 = Uint8Array.of(0x90, 0xcf, 0x93, 0xc7);

        // Shift-JIS形式
        // ----
        // サービスID, アイテムID, 13桁ISBN, カテゴリ, 評価, 読書状況, レビュー, タグ, 読書メモ(非公開), 登録日時, 読了日
        // "1","B00005S8LI","","-","4","読み終わった","","ジブリ","","2012-03-06 17:40:08","2012-03-06 17:41:39"
        const rows =
            items.map(item => {
                const row = [
                    one,
                    textEncoder.encode(item["asin"] ?? ""),
                    "",
                    "",
                    "",
                    item["readStatus"] == "READ" ? 読み終わった : 積読,
                    "",
                    "",
                    "",
                    textEncoder.encode(formatDate(item["acquiredTime"])),
                    "",
                ];
    
                const length = row.map(c => c.length + doubleQuote.length * 2 + comma.length).reduce((sum, r) => sum + r, 0) + lineBreak.length;
                const a = new Uint8Array(length);
                let offset = 0;
                for (const column of row) {
                    a.set(doubleQuote, offset);
                    offset += doubleQuote.length;

                    a.set(column, offset);
                    offset += column.length;

                    a.set(doubleQuote, offset);
                    offset += doubleQuote.length;

                    a.set(comma, offset)
                    offset += comma.length;
                }
                a.set(lineBreak, offset);

                return a;
            });
    
        const blob = new Blob([...rows], { type: "text/csv", endings: "transparent" });
        const link = document.createElement('a');
        link.download = "kindle.csv";
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
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
    
        const bom  = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const csv = rows.map(r => r.join(",")).join("\n");
        const blob = new Blob([bom, csv], { type: "text/csv", endings: "native" });
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
            <button class="action_button booklog-download" style="display: flex; border-radius: 3px; min-height: 1.8rem; border-color: rgb(173, 177, 184) rgb(162, 166, 172) rgb(141, 144, 150); border-style: solid; border-width: 1px; border-image: none 100% / 1 / 0 stretch; cursor: pointer; background: rgba(0, 0, 0, 0) linear-gradient(rgb(247, 248, 250), rgb(231, 233, 236)) repeat scroll 0% 0%; word-break: break-word; outline: currentcolor none medium; text-align: center; align-items: center; justify-content: center; width: 10rem;">ブクログ形式で<br>ダウンロード</button>
            <div style="padding-right: 0.8rem;"></div>
            <button class="action_button csv-download" style="display: flex; border-radius: 3px; min-height: 1.8rem; border-color: rgb(173, 177, 184) rgb(162, 166, 172) rgb(141, 144, 150); border-style: solid; border-width: 1px; border-image: none 100% / 1 / 0 stretch; cursor: pointer; background: rgba(0, 0, 0, 0) linear-gradient(rgb(247, 248, 250), rgb(231, 233, 236)) repeat scroll 0% 0%; word-break: break-word; outline: currentcolor none medium; text-align: center; align-items: center; justify-content: center; width: 10rem;">CSV 形式で<br>ダウンロード</button>
            <div style="padding-right: 0.8rem;"></div>
            <button class="action_button json-download" style="display: flex; border-radius: 3px; min-height: 1.8rem; border-color: rgb(173, 177, 184) rgb(162, 166, 172) rgb(141, 144, 150); border-style: solid; border-width: 1px; border-image: none 100% / 1 / 0 stretch; cursor: pointer; background: rgba(0, 0, 0, 0) linear-gradient(rgb(247, 248, 250), rgb(231, 233, 236)) repeat scroll 0% 0%; word-break: break-word; outline: currentcolor none medium; text-align: center; align-items: center; justify-content: center; width: 10rem;">JSON 形式で<br>ダウンロード</button>
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
    
    panel.getElementsByClassName("booklog-download")[0].addEventListener("click", async function (event) {
        await run(downloadBooklog);
    });
    
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