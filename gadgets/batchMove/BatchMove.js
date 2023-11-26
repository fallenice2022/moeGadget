"use strict";
$((() => {
    const wgUserGroups = mw.config.get("wgUserGroups"),
        isMGPMGUser = wgUserGroups.includes("patroller") || wgUserGroups.includes("sysop"),
        batchmove = wgULS("批量移动", "批次移動");
    let RegisterToMove = 0;
    /**
     * @param {number} second 
     */
    const sleep = (second) => new Promise((res) => setTimeout(res, second * 1000));
    /**
     * @param {string} fromname 
     * @param {string} toname 
     * @param {object} choices 
     */
    async function movepage(fromname,toname,choices){
        try {
            await new mw.Api().postWithToken("csrf", {
                action: "move",
                from: fromname,
                reason:choices.summary,
                to: toname,
                format: "json",
                watchlist: choices.watchlist,
                movetalk: choices.movetalk,
                noredirect: choices.noredirect? false: true,
                tags: "Automation tool",
            });
            RegisterToMove++;
            console.log(`已成功移动${RegisterToMove}个页面`);
        } catch (error) {
            switch (error) {
                case "missingtitle":
                    console.warn(`页面${fromname}不存在`);
                    break;
                case "articleexists":
                    console.error(`目标页面${toname}已存在，请检查！`);
                    break;
                default:console.error("[Move a page]", error);
                    break;
            }
        }
    }
    class moveDialog extends OO.ui.ProcessDialog {
        static static = {
            ...super.static,
            name: "flagGD",
            title: wgULS("批量移动页面", "批次移動頁面"),
            actions: [
                {
                    action: "cancel",
                    label: "取消",
                    flags: ["safe", "close", "destructive"],
                },
                {
                    action: "submit",
                    label: wgULS("确认", "確認"),
                    flags: ["primary", "progressive"],
                },
            ],
        };
        constructor(config) {
            // Parent constructor
            super(config);
        }
        initialize() {
            // Parent method
            super.initialize();
            /**
             * @param {JQuery<HTMLElement>} widget 
             * @param {object} choices 
             * @returns {JQuery<HTMLElement>}
             */
            const fieldLayout = (widget,choices) => new OO.ui.FieldLayout(widget,choices);
            //要移动的页面和目标页面输入
            this.fromlayout = new OO.ui.MultilineTextInputWidget({
                rows: 18,
                placeholder: wgULS("一行一个，不加[[]]", "一行一個，不加[[]]"),
            });
            const fromField = fieldLayout(this.fromlayout, {
                label: "要移动的页面：",
                align: "top",
                classes: ["bm-input"],
            });
            this.tolayout = new OO.ui.MultilineTextInputWidget({
                rows: 18,
                placeholder: wgULS("一行一个，不加[[]]", "一行一個，不加[[]]"),
            });
            const toField = fieldLayout(this.tolayout, {
                label: "目标页面：",
                align: "top",
                classes: ["bm-input"],
            });
            //移动页面选项
            this.summaryBox = new OO.ui.TextInputWidget();
            const summaryField = fieldLayout(this.summaryBox, {
                label: "原因",
                align: "top",
                id: "diff-summary",
                help:"大量移动页面之工具，请慎用！如有滥用之行为，后果请阁下自行承担。",
            });
            this.watchlist = new OO.ui.DropdownInputWidget({
                options: [
                    { data: "preferences", label: "与参数设置同步" },
                    { data: "nochange", label: "不更改" },
                    { data: "watch", label: "加入监视列表" },
                    { data: "unwatch", label: "取消监视" },
                ],
                $overlay: true,
            });
            const watchlistField = fieldLayout(this.watchlist, {
                label: wgULS("监视页面", "監視頁面"),
                align: "top",
            });
            this.iftalkBox = new OO.ui.CheckboxInputWidget({
                selected: true,
            });
            const movetalkField = fieldLayout(this.iftalkBox, {
                label: wgULS("移动关联的讨论页", "移動相關的對話頁面"),
                align: "inline",
                id: "move-talkpage",
            });
            this.ifnoreBox = new OO.ui.CheckboxInputWidget({
                selected: true,
            });
            const ifnoreField = fieldLayout(this.ifnoreBox, {
                label: wgULS("保留重定向", "留下重新導向頁面"),
                align: "inline",
                id: "move-no-redirect",
            });
            /* 组装widget */
            //button Layout
            this.panelLayout = new OO.ui.PanelLayout({
                scrollable: false,
                expanded: false,
                padded: true,
            });
            this.panelLayout.$element.append(summaryField.$element, watchlistField.$element, movetalkField.$element,ifnoreField.$element);
            this.$body.append(fromField.$element,toField.$element,this.panelLayout.$element);
        }
        getActionProcess(action) {
            const fromlayout = this.fromlayout.getValue().split("\n");
            const tolayout = this.tolayout.getValue().split("\n");
            if (action === "cancel") {
                return new OO.ui.Process(() => {
                    this.close({ action: action });
                }, this);
            } else if (action === "submit" && tolayout.length !== fromlayout.length) {
                return new OO.ui.Process(() => {
                    mw.notify(wgULS("请检查原页面和目标页面数量！", "請檢查原頁面和目標頁面數量！"), {
                        type: "error",
                        tag: "input-error",
                    });
                }, this);
            } else if (action === "submit" && tolayout.length === fromlayout.length) {
                return new OO.ui.Process($.when((async () => {
                    this.fromlayout.setDisabled();
                    this.tolayout.setDisabled();
                    mw.notify(wgULS("开始移动，请查看控制台", "開始移動，請檢視控制台"));
                    const choices = {
                        summary: this.summaryBox.getValue(),
                        watchlist: this.watchlist.getValue(),
                        movetalk: this.iftalkBox.isSelected(),
                        noredirect: this.ifnoreBox.isSelected(),
                    };
                    for(let i=0; i < tolayout.length; i++){
                        await movepage(fromlayout[i],tolayout[i],choices);
                        if (!wgUserGroups.includes("flood") && i !== tolayout.length) {
                            await sleep(20);
                        }
                    }
                    mw.notify(wgULS("移动完成", "移動完成"), { type: "success" });
                    await sleep(0.73);
                    this.close({ action: action });
                })()).promise, this);
            }
        }
        getBodyHeight() {
            return Math.round($(window).height() * 0.9);
        }
    }
    if (isMGPMGUser) {
        mw.util.addPortletLink("p-cactions", "javascript:void(0);", batchmove, "ca-batchmove", batchmove);
        $("#ca-batchmove").on("click", async () => {
            //对话框调用
            const flagWindow = new moveDialog({
                id: "batch-move",
                size: "larger",
            });
            const windowManager = new OO.ui.WindowManager();
            $("body").append(windowManager.$element);
            windowManager.addWindows([flagWindow]);
            await sleep(0.2);
            windowManager.openWindow(flagWindow);
        });
    }
})());