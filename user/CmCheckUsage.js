/*Check what links here in English and Japanese MoegirlPedia, made by User:Leranjun, refactored by User:屠麟傲血*/
"use strict";
(async ($, mw) => {
    if (mw.config.get("wgNamespaceNumber") !== 6 || !["view"].includes(mw.config.get("wgAction"))) {
        return;
    }
    await Promise.all([mw.loader.using(["ext.gadget.site-lib", "mediawiki.ForeignApi"]), $.ready]);
    const PageName = mw.config.get("wgPageName");
    /**
     * @param {string} sitename
     * @return {Promise<object, Error>}
     */
    async function check(sitename) {
        const api = new mw.ForeignApi(`https://${sitename}.moegirl.org.cn/api.php`, { anonymous: true });
        try {
            const data = await api.get({
                action: "query",
                format: "json",
                prop: "fileusage",
                fulimit: 1,
                titles: PageName,
            }, { retry: 3 });
            return data.query.pages;
        } catch (error) {
            console.error("[API Log]", error);
        }
    }
    /**
     * @param {string} sitename
     * @param {object[]} pages
     */
    function notify(sitename, pages) {
        const sitezhname = sitename === "en" ? wgULS("于嘤萌", "於嚶萌") : wgULS("于日萌", "於日萌");
        let result = wgULS("未知错误", "未知錯誤"),
            type = "error";
        if (typeof pages["-1"] === "undefined") {
            result = `笨蛋，此${wgULS("页面不是文件！", "頁面不是檔案！")}`;
        } else if (typeof pages["-1"].fileusage !== "undefined") {
            result = `不好！${wgULS("文件", "檔案")}${PageName}${sitezhname}${wgULS("有链入的说。", "有連入的說。")}<a href="https://${sitename}.moegirl.org.cn/Special:WhatLinksHere/${PageName}">${wgULS("查看链入", "查看連入")}</a>`;
            type = "warn";
        } else {
            result = wgULS("内个呢，文件", "內个呢，檔案") + PageName + sitezhname + wgULS("无链入喵。", "無連入喵。");
            type = "info";
        }
        mw.notify($("<span>").html(result), {
            title: `${sitename}MGP Usage Checker`,
            type: type,
            tag: "guc",
        });
    }
    /**
     * @param {string} zh
     * @param {string} en
     */
    const button = (zh, en) => $("<button>", {
        "class": "mw-ui-button mw-ui-progressive",
        id: `${en}mgpcheck`,
        text: `查看${zh}使用吧`,
    });

    $("#filelinks").after(button(wgULS("嘤萌", "嚶萌"), "en"), button("日萌", "ja"));
    let enusage, jausage;
    $("#enmgpcheck").on("click", async () => {
        /* eslint-disable */
        if (enusage === undefined) {
            enusage = await check("en");
        }
        notify("en", enusage);
    });
    $("#jamgpcheck").on("click", async () => {
        if (jausage === undefined) {
            jausage = await check("ja");
        }
        /* eslint-enable */
        notify("ja", jausage);
    });

})(jQuery, mediaWiki);