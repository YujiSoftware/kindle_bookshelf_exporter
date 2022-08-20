(function(){
    const download = async function(progress){
        const batchSize = 100;
        var startIndex = 0;
        var hasMoreItems = true;
        var items = [];

        while(hasMoreItems) {
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
                "body": new URLSearchParams({"data": post, "csrfToken": csrfToken}),
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

            progress.max = data["numberOfItems"];
            progress.value = items.length;
        }

        console.log(items);
    };

    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
        position: "absolute",
        top: "0px",
        left: "0px",
        width:  "100%",
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
    <progress class="progress" style="display: none; width: 100%;"></progress>
</div>`);

    panel.getElementsByClassName("csv-download")[0].addEventListener("click", async function(event) {
        const buttons = panel.getElementsByClassName("buttons")[0];
        buttons.style.display = "none";
        const progress = panel.getElementsByClassName("progress")[0];
        progress.style.display = "inline-block";

        await download(progress);
    });

    window.scrollTo(0,0);
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
})();