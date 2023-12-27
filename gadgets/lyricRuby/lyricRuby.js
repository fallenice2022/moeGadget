// 原作者：https://zh.moegirl.org.cn/User:東東君 since 1.38 mw version
/* global require*/
"use strict";
$(() => {
    const { common, kakikotoba } = require("./lyricRuby-transferGroup.json");
    const { createApp, h, ref, defineComponent, unref } = Vue;
    const escapes = new RegExp("[àâäèéêëîïôœùûüÿçÀÂÄÈÉÊËÎÏÔŒÙÛÜŸÇ？！·♡⸱]", "g"),
        wikiEditor = $("#wpTextbox1"),
        messages = {
            notFound: "代码中并未找到歌词模板(LyricsKai及其衍生模板)！",
            badFormat: "歌词模板的格式不正确或不受支持，请手动复制粘贴！",
            emptyText: "要注音的内容不能为空！",
            badText: "无法注音，请检查内容中是否包含特殊字符或非日语当用汉字、除拉丁字母以外的文字",
            timeout: "请求超时！",
        },
        lyricskai = /(\{\{[Ll]yricsKai[\s\S]*?\|original=)([\s\S]*?)(\|translated)/;
    // 函数定义体
    /**
     * @param {string} kanji 
     * @param {string} kana 
     */
    const ruby = (kanji, kana) => `{{photrans|${kanji}|${kana}}}`;
    // vue3
    const App = defineComponent({
        data() {
            return {
                lefttext: ref(""),
                checkbox: {
                    ifkakikotoba:ref(),
                },
                diseditor: false,
                disupdate: true,
                diskakikotoba: false,
                dissigndiff: true,
            };
        },
        //框架
        render() {
            const kakikotoba = h("label", {
                "for": "ruby-kakikotoba",
                title: "是否应用书面语注音规则，如：「明日」(あした => あす)，多用于一些比较文艺的歌",
            }, [
                h("input", {
                    type: "checkbox",
                    id: "ruby-kakikotoba",
                    checked: this.checkbox.ifkakikotoba,
                    onChange: $event => this.checkbox.ifkakikotoba = $event.target.checked,
                    disabled:this.diskakikotoba,
                }),
                h("span", {}, "书面语注音"),
            ]);
            const editorBody = h("textarea", {
                id: "ruby-textbox",
                lang: "ja",
                value: unref(this.lefttext),
                onChange: $event => this.lefttext = $event.target.value,
                onMouseup: this.openDiffRuby,
                disabled:this.diseditor,
            });
            const btngroup = h("div", { "class": "ruby-btn-group" }, [
                h("button", {
                    title: "从模板中获取歌词",
                    onClick: this.getText,
                }, "获取歌词"),
                h("button", {
                    title: "对内容添加注音",
                    onClick: this.execute,
                }, "添加注音"),
                h("button", {
                    id:"ruby-update",
                    title: "将歌词提交至模板",
                    disabled: this.disupdate,
                    onClick: this.upDate,
                }, "提交歌词"),
                h("button", {
                    title: "复制歌词至剪切板",
                    onClick:this.copyText,
                }, "复制歌词"),
                kakikotoba,
                h("button", {
                    title: "由于注音API返回一些读音在歌词中并不常用，需要将其替换为常用读音，你可以在转换列表中添加新的转换规则",
                    onClick: () => {
                        if (mw.config.get("wgUserGroups").includes("interface-admin")) {
                            window.open("/MediaWiki:Gadget-lyricRuby-transferGroup.json", "_blank");
                        } else {
                            window.open("/MediaWiki_talk:Gadget-lyricRuby-transferGroup.json", "_blank");
                        }
                    },
                }, "打开转换列表页面"),
                h("button", {
                    id:"ruby-sign-diff",
                    title: "标注选中文字的特殊读音",
                    disabled:this.dissigndiff,
                    onClick:this.diffRuby,
                }, "特殊读音标记"),
            ]);
            const leftEditor = h("div", {
                "class": "ruby-editor",
            }, [editorBody, btngroup]);
            const rightView = h("div", {
                "class": "ruby-view",
                lang: "ja",
            });
            return [
                h("div", {
                    id: "widget-lyricRuby-hide",
                    onClick: this.hideWidget,
                }, "×"),
                h("div", { "class": "ruby-left" }, [leftEditor]), //左边
                h("div", { "class": "ruby-right" }, [rightView]), //右边
            ];
        },
        methods: {
            openDiffRuby() {
                if(window.getSelection().toString() !== "") {
                    this.dissigndiff = false;
                }
            },
            //标注写作xx读作oo
            async diffRuby() {
                const text = window.getSelection().toString();
                if (!/[\u3041-\u309f\u30a0-\u30ff]/.test(text)) {
                    const sing = await OO.ui.prompt("请输入它不一样的读音", {
                        textInput: { placeholder: "写作xx读作oo" },
                    });
                    if (sing !== "") {
                        this.lefttext = $("#ruby-textbox").textSelection("encapsulateSelection", {
                            pre: "{{ruby|",
                            peri: text,
                            post: `|${sing}}}`,
                        }).val();
                    } else {
                        mw.notify("您没有输入读音", { type: "error" });
                    }
                } else {
                    mw.notify("请不要给假名注音", { type: "error" });
                }
                this.dissigndiff = true;
            },
            hideWidget() {
                $("#widget-lyricRuby").fadeOut(200);
                $("#content").css("position", "relative");
            },
            getText() {
                const codeContent = wikiEditor.val();
                if (!/\{\{[Ll]yricsKai/.test(codeContent)) {
                    mw.notify(messages.notFound, { type: "error" });
                } else if (!codeContent.match(lyricskai)) {
                    mw.notify(messages.badFormat, { type: "error" });
                } else {
                    this.lefttext = codeContent.match(lyricskai)[2].trim();
                }

            },
            execute() {
                let text = this.lefttext.trim();
                if (text.length === 0) {
                    mw.notify(messages.emptyText, { type: "error" });
                } else if (text.includes("photrans")){
                    mw.notify("那个，您已经完成注音了吧？", { type: "warn" });
                } else {
                    text = text.replace(escapes, (s) => `!UNICODE(${ escape(s).replace("%", "#") })`);
                    this.diseditor = true, this.disupdate = true, this.diskakikotoba = true;
                    $.ajax({
                        type: "post",
                        url: "https://api.nzh21.site/yahooapis/FuriganaService/V2/furigana",
                        contentType: "application/json",
                        headers: {
                            "x-ua": "Yahoo AppID: dj00aiZpPXE2azZNYXFyR29kSSZzPWNvbnN1bWVyc2VjcmV0Jng9ODY-",
                        },
                        data: JSON.stringify({
                            id: "1234-1",
                            jsonrpc: "2.0",
                            method: "jlp.furiganaservice.furigana",
                            params: {
                                q: text,
                                grade: 1,
                                appid: "dj00aiZpPXE2azZNYXFyR29kSSZzPWNvbnN1bWVyc2VjcmV0Jng9ODY-",
                            },
                        }),
                        timeout: "15000",
                    }).always(() => {
                        this.diseditor = false, this.diskakikotoba = false;
                    }).done((data) => {
                        if (data.Error) {
                            mw.notify(messages.badText, { type: "error" });
                        } else {
                            const wordList = data.result.word;
                            /** 
                             * 检查是否有额外的ruby模板
                             * @param {number} num
                             */
                            function diffruby(num){
                                const text = [];
                                for (let i = 1; i < 3; i++) {
                                    if(num - i > 2){
                                        text.push(wordList[num-i].surface);
                                    } else {
                                        break;
                                    }
                                }
                                if(text.reverse().join("") === "ruby|"){
                                    return true;
                                }
                                return false;
                            }
                            let result = wordList.reduce((result, item, num) => result + (() => {
                                if (item.furigana) {
                                    if (item.subword) {
                                        return item.subword.map((item) => {
                                            if(item.furigana !== item.surface){
                                                return ruby(item.surface, item.furigana);
                                            }
                                            return item.surface;
                                        }).join("");
                                    }
                                    if(diffruby(num)){
                                        return item.surface;
                                    }
                                    return ruby(item.surface, item.furigana);
                                }
                                return item.surface;
                            })(), "");
                            /**
                             * @param {string[][]} patterns 
                             */
                            function rubyReplace(patterns) {
                                for (let i = 0, len = patterns.length; i < len; i++) {
                                    const regex = new RegExp(`(\\{\\{photrans\\|${ patterns[i][0] }\\|)${ patterns[i][1] }\\}\\}`, "g");
                                    result = result.replace(regex, `$1${ patterns[i][2] }}}`);
                                }
                            }
                            rubyReplace(common);
                            this.checkbox.ifkakikotoba && rubyReplace(kakikotoba);
                            result = result.replace(/!UNICODE\((.+?)\)/g, (_, s) => unescape(s.replace("#", "%")) );
                            this.lefttext = result;
                            $(".ruby-view").html(result.replace(/\n/g, "<br>").replace(/\{\{(photrans|ruby)\|(.+?)\|(.+?)\}\}/g, "<ruby>$2<rt>$3</rt></ruby>"));
                            this.disupdate = false;
                        }
                    }).fail(() => {
                        mw.notify(messages.timeout, { type: "error" });
                    });
                }
            },
            upDate() {
                const codeContent = wikiEditor.val();
                const ruby = `\n${this.lefttext}\n\n`;
                if (!lyricskai.test(codeContent)) {
                    mw.notify(messages.badFormat, { type: "error" });
                } else {
                    wikiEditor.val(codeContent.replace(lyricskai, "{{photrans/button}}\n" + `$1${ruby}$3`));
                    mw.notify("提交成功！", { type: "success" });
                    this.hideWidget();
                }
            },
            async copyText() {
                await navigator.clipboard.writeText(this.lefttext);
                mw.notify("已复制至剪切板", { type: "success" });
            },
        },
    });
    //函数执行体
    mw.util.addPortletLink("p-cactions", "javascript:void(0)", "注音工具", "btn-ruby", "为日语歌词进行注音");
    $("#btn-ruby").on("click", () => {
        if (!document.getElementById("widget-lyricRuby")) {
            $(document.body).append('<div id="widget-lyricRuby" style="display:none"></div>');
            createApp(App).mount("#widget-lyricRuby");
        }
        $("#widget-lyricRuby").fadeIn(200);
    });

});
