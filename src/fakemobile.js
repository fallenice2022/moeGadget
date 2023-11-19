/**
 * only for zh moegirlPedia
 * 把moeskin当移动版皮肤，vector当桌面端皮肤
 * <pre>
 */
"use strict";
(async (mw) => {
    await Promise.all([mw.loader.using('user.options'), $.ready]);
    // 判断用户的桌面版皮肤
    if (mw.user.options.get('skin') !== 'vector') {
        return;
    }
    // 切换按钮
    if (location.hostname.startsWith('mzh')) {
        $("#footer-copyright-text .align-center").append(' | ',
            $("<a>", { href: location.href.replace('//mzh.moegirl', '//zh.moegirl'), title: "desktopview", text: "桌面版" })
        );
    }
    else if (location.hostname.startsWith('zh')) {
        $("ul#footer-places").append(
            $("<li>", { id: "footer-mobileview" }).append(
                $("<a>", { href: location.href.replace('//zh.moegirl', '//mzh.moegirl'), title: "mobileview", text: "手机版视图" })
            )
        );
    }
})(mediaWiki);
/* </pre> */