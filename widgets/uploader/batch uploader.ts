import { createApp } from 'vue';
import App from './App.vue';
import './index.less';
/**
 * 本小部件源自https://zh.moegirl.org.cn/User:東東君/js/uploader.js，采用moegirl.uk的版本转换至typescript
 * 出于对浏览器的兼容性，样式文件采用less格式
 */
declare global {
    namespace RLQ {
        /**
         * Process callbacks for modern browsers (Grade A) that require modules.
         * If the entry has two values, call mw.loader.using.
         */
        function push(entry: (() => any) | [string | string[], () => any]): void | JQuery.Promise<any>;
    }
}
RLQ.push([["jquery", "mediawiki.api"], () => {
    const root = document.createElement('div');
    root.id = "widget-fileUploader";
    document.body.appendChild(root);
    createApp(App).mount("#widget-fileUploader");
}]);
