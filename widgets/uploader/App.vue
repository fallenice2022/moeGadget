<script setup lang="ts">
import { onMounted, ref, watch, reactive, computed } from 'vue';
import { getHints, upload, errorInfo, checkFileNames, UserGroup } from './query.ts';
interface fileInfo {
    charaName: string;
    author: string;
    source: string;
    license: string;
    body: string | File;
    fileName: string;
}
interface uploadResult {
    fileName: string;
    result: boolean;
}
// data
const allowedFileTypes = ["ogg", "ogv", "oga", "flac", "opus", "wav", "webm", "mp3", "png", "gif", "jpg", "jpeg", "webp", "svg", "pdf", "ppt", "jp2", "doc", "docx", "xls", "xlsx", "psd", "sai", "swf", "mp4"],
    files = ref<fileInfo[]>([]), // 待上传的文件
    categoryHints = ref<string[]>([]),
    license = computed(() => form.license), //授权协议
    sizelimit = UserGroup?.includes("bot") ? 20 : 2;
const form = reactive({
    fileName: "",
    categoryInput: "", // 分类输入栏
    categories: [] as string[], // 实际要提交的分类
    charaName: "",
    author: "",
    source: "",
    prefix: "",
    license: "",
});
let doubleClickTimeoutKey = 0,
    focusedFileIndex = 0,
    categoryInputDebounceTimeoutKey = 0,
    categoryHintFocusedIndex = -1,// 用于双击复制文件名
    status = 1; // 0：失败，1：初始化，2：提交中，3：成功; 

onMounted(() => {
    $("#loading").html('<a href="javascript:void(0);" id="show">点此重新调出上传界面</a>');
    $("#show").on("click", (e) => {
        e.preventDefault();
        $("#widget-fileUploader").fadeIn(200);
    });
})
//watch
watch(form, () => {
    if (!files[focusedFileIndex]) { return; }

    files[focusedFileIndex] = {
        ...files[focusedFileIndex],
        fileName: form.fileName,
        author: form.author,
        charaName: form.charaName,
        source: form.source,
        license: form.license,
    };
});
watch(license, (val) => {
    if (val === "none:gotoCommons") {
        alert("该协议需要手动填写授权证明，请到共享站进行上传");
        window.open(`${mw.config.get("wgServer").replace("zh.moegirl", "commons.moegirl") + mw.config.get("wgScriptPath")}/Special:上传文件`, "_blank");
    }
});
//methods
const createFileItem = (fileBody: string | File) => {
    return {
        body: fileBody,
        objectUrl: typeof fileBody === "string" ? fileBody : URL.createObjectURL(fileBody),
        fileName: typeof fileBody === "string" ? fileBody.replace(/.+\/(.+?)$/, "$1") : fileBody.name,
        author: "",
        charaName: "",
        source: "",
        license: "Copyright",
    };
};
const isImageFile = (fileBody: { name: string; }) => {
    const imageType = ["jpg", "png", "jpeg", "gif", "webp"];
    return imageType.includes((typeof fileBody === "string" ? fileBody : fileBody.name).replace(/.+\.(.+?)$/, "$1"));
};
const hideWidget = () => {
    $("#widget-fileUploader").fadeOut(200);
    $("#content").css("position", "relative");
};
const loadCategoryHint = () => {
    clearTimeout(categoryInputDebounceTimeoutKey);
    categoryInputDebounceTimeoutKey = setTimeout(() => {
        if (form.categoryInput === "") { return; }
        getHints(form.categoryInput)
            .then(data => {
                const hints = data.query.search.map((item: { title: string; }) => item.title.split("Category:")[1]);
                categoryHints.value = hints;
            });
    }, 500);
};
const clearHint = () => categoryHints.value = [];

const addCategory = (categoryName: string) => {
    if (!form.categories.includes(categoryName)) {
        form.categories.push(categoryName);
    }
    form.categoryInput = "";
    categoryHints.value = [];
    categoryHintFocusedIndex = -1;
};

// 实现上下键切换分类提示
const handlerFor_categoryHints_wasKeyDowned = (e: { code: string; }) => {
    if (e.code === "ArrowUp") {
        categoryHintFocusedIndex++;
        if (categoryHintFocusedIndex > categoryHints.value.length - 1) {
            categoryHintFocusedIndex = 0;
        }
    } else if (e.code === "ArrowDown") {
        categoryHintFocusedIndex--;
        if (categoryHintFocusedIndex < 0) {
            $(".categoryInput").trigger("focus");
        }
    }

    categoryHintFocusedIndex >= 0 && $(".categoryHint").find("<div>")[categoryHintFocusedIndex].scrollIntoView();
};

const handlerFor_categoryInput_wasKeyDowned = () => {
    if (categoryHints.value.length === 0 || !categoryHints.value) { return; }
    $(".categoryHint").trigger("focus");
    categoryHintFocusedIndex = 0;
};

const addFileByFileSelector = (e: { target: { files: Iterable<File> | ArrayLike<File>; value: string; }; }) => {
    Array.from(e.target.files).forEach(file => {
        if (files.value.length === 50) { return; }
        if (file.size / 1024 / 1024 > sizelimit) {
            return alert(`文件【${file.name}】大小超过${sizelimit}m，无法使用本工具！`);
        }
        files.value.push(createFileItem(file));
    });

    e.target.value = "";
    if (files.value.length === 50) { mw.notify("一次最多上传50个文件", { type: "warn" }); }
};

const addFileByDropping = (e: { dataTransfer: { files: Iterable<File> | ArrayLike<File>; }; }) => {
    Array.from(e.dataTransfer.files).forEach(file => {
        if (files.value.length === 50) { return; }

        if (!allowedFileTypes.includes(file.name.replace(/.+\.(.+?)$/, "$1"))) { return alert(`【${file.name}】不支持上传这种格式的文件！`); }
        if (file.size / 1024 / 1024 > sizelimit) {
            return alert(`文件【${file.name}】大小超过${sizelimit}m，无法使用本工具！`);
        }
        files.value.push(createFileItem(file));
    });

    if (files.value.length === 50) { mw.notify("一次最多上传50个文件", { type: "warn" }); }
};
const focusFile = async (index: number) => {
    focusedFileIndex = index;
    const file = files[index];
    form.fileName = file.fileName;
    form.author = file.author;
    form.charaName = file.charaName;
    form.source = file.source;
    form.license = file.license;

    // 实现双击复制文件名
    if (doubleClickTimeoutKey === 0) {
        doubleClickTimeoutKey = setTimeout(() => {
            doubleClickTimeoutKey = 0;
        }, 300);
    } else {
        await navigator.clipboard.writeText(form.prefix + file.fileName);
        mw.notify("已复制文件名");
        clearTimeout(doubleClickTimeoutKey);
        doubleClickTimeoutKey = 0;
    }

};

const addSourceUrlFile = () => {
    const url = (prompt("请输入文件地址：") || "").trim();
    if (!url) { return; }
    files.value.push(createFileItem(url));
};

const syncCurrentFileInfo = () => {
    if (!confirm("确定要将当前选中的文件信息(不含文件名)同步到所有文件中？")) { return; }
    const currentFile = files.value[focusedFileIndex];
    if (!currentFile) { return mw.notify("当前未选中文件"); }

    files.value.forEach((item) => {
        item.author = currentFile.author;
        item.charaName = currentFile.charaName;
        item.source = currentFile.source;
        item.license = currentFile.license;
    });

    mw.notify("已同步");
};

const showManual = () => {
    alert([
        "使用说明",
        "1. 该插件是一个文件上传工具，支持拖拽上传、批量上传。",
        "2. 若文件上传时发生异常，请以萌娘共享的监视列表为准。",
        "3. 每个文件拥有独立的信息，但“分类”和“添加前缀”是共享的。在需要同步每个文件的角色名、作者等信息时可以使用“同步文件信息”的功能。",
        "4. 什么是“差分上传”：在发生文件名已存在的情况时，自动滤掉已存在的文件。通常用于在上一次批量上传中一部分失败后，再次尝试将之前没传上去的文件重新上传。",
        "5. 双击文件可以自动复制“前缀 + 文件名”。",
    ].join("\n"));
}
const submit = async (diffMode: boolean) => {
    if (files.value.length === 0) { return mw.notify("您还没有上传任何文件", { type: "warn" }); }
    if (files.value.some(item => item.fileName === "")) { return mw.notify("存在文件名为空的文件", { type: "warn" }); }

    const duplicateFilesName = new Set();
    const filesName = files.value.map(({ fileName }) => fileName);
    for (const n of filesName) {
        if (filesName.indexOf(n) !== filesName.lastIndexOf(n)) {
            duplicateFilesName.add(n);
        }
    }
    if (duplicateFilesName.size > 0) {
        return alert([
            "这些文件名发生了重复，请不要给要上传的文件设置相同的名称：",
            ...Array.from(duplicateFilesName.values()),
        ].join("\n"));
    }

    const authorizedForMoegirlFiles = files.value.filter(item => item.license === "none:gotoCommons");
    if (authorizedForMoegirlFiles.length > 0) {
        return alert([
            "这些文件的授权协议不允许使用上传工具，请在本次上传中删除，使用特殊页面进行上传：",
            ...authorizedForMoegirlFiles.map(item => item.fileName),
        ].join("\n"));
    }

    if (!confirm("确定要开始上传吗？")) { return; }

    let postData = files.value.map((item) => {
        const metaCategories = `${item.charaName ? `[[分类:${item.charaName}]]` : ""}${item.author ? `[[分类:作者:${item.author}]]` : ""}`;
        const source = item.source ? `源地址:${item.source}` : "";

        const comment: string[] = [];
        if (item.license) {
            comment.push(`协议：${item.license}`);
        }
        if (item.charaName) {
            comment.push(`人物：[[分类:${item.charaName}|${item.charaName}]]`);
        }
        if (item.author) {
            comment.push(`作者：[[分类:作者:${item.author}|${item.author}]]`);
        }
        if (item.source) {
            comment.push(`源地址：${item.source}`);
        }
        if (form.categories.length > 0) {
            comment.push(`其他分类：[[分类:${form.categories.join("]]、[[分类:")}]]`);
        }
        const pageContent = [
            "== 文件说明 ==",
            metaCategories + form.categories.map(item => `[[分类:${item}]]`).join(""),
            source,
            "== 授权协议 ==",
            `{{${item.license}}}`,
        ].join("\n");

        return {
            body: item.body,
            fileName: form.prefix + item.fileName,
            comment: comment.join("，"),
            pageContent,
        };
    });

    mw.notify(`开始${diffMode ? "差分" : ""}上传，共${postData.length}个文件...`);
    console.log(`---- Moegirl:fileUploader 开始${diffMode ? "差分" : ""}上传，共${postData.length}个文件 ----`);
    status = 2;

    const printLog = (msg: string, type: "error" | "info" | "warn" = "info") => {
        mw.notify(msg, { type });
        console.log(msg);
    };

    try {
        const ifreupload = UserGroup?.some((value: string) => ["patroller", "sysop", "techeditor", "scripteditor"].includes(value));
        const checkedResult = await checkFileNames(postData.map(item => item.fileName));
        let existedFiles = postData.filter((item) => checkedResult[item.fileName.replace(/^./, s => s.toUpperCase())]); // 首字母转大写，因为checkedResult返回的文件名首字母是大写
        if (existedFiles.length > 0 && ifreupload) {
            existedFiles = [];
            if (!confirm("您正在进行覆盖上传，确定吗？")) {
                status = 1;
                return;
            }
        } else if (existedFiles.length > 0 && !diffMode) {
            alert([
                "这些文件名已被使用，请为对应的文件更换其他名称：",
                ...existedFiles.map(item => item.fileName),
            ].join("\n"));
            status = 1;
            return;
        }

        if (diffMode) { postData = postData.filter(item => !checkedResult[item.fileName.replace(/^./, s => s.toUpperCase())]); }
        if (diffMode && postData.length === 0) {
            alert("差分模式下没有可以上传的文件");
            status = 1;
            return;
        }

        printLog(`差分上传共需要上传${postData.length}个文件`, "warn");

        let uploadResults: uploadResult[] = [];
        if (postData.length <= 3) {
            uploadResults = await Promise.all(
                postData.map((item) => new Promise(resolve => {
                    upload(item)
                        .then(() => {
                            printLog(`【${item.fileName}】上传成功`);
                            resolve({ fileName: item.fileName, result: true });
                        })
                        .catch((e) => {
                            printLog(`【${item.fileName}】上传失败：${errorInfo(e)}`, "error");
                            console.error(e);
                            resolve({ fileName: item.fileName, result: false });
                        });
                }) as Promise<uploadResult>),
            );
        } else {
            alert("上传的文件超过个三个，执行分段上传，请耐心等待。进入控制台可查看全部日志(按F12后选择Console)。");
            printLog("上传文件超过3个，执行分段上传", "warn");

            // 分段上传
            const segmentedPostData = [[]] as [{
                body: string | File;
                fileName: string;
                comment: string;
                pageContent: string;
            }[]];
            for (const item of postData) {
                if (segmentedPostData[segmentedPostData.length - 1].length >= 3) {
                    segmentedPostData.push([]);
                }
                segmentedPostData[segmentedPostData.length - 1].push(item);
            }

            console.log(segmentedPostData);

            for (let i = 0, len = segmentedPostData.length; i < len; i++) {
                printLog(`共${len}个分段，现在开始第${i + 1}个`);

                const segment = segmentedPostData[i];
                const segmenteduploadResult = await Promise.all(
                    segment.map((item) => new Promise(resolve => {
                        upload(item).then(() => {
                            printLog(`【${item.fileName}】上传成功`);
                            resolve({ fileName: item.fileName, result: true });
                        }).catch((e) => {
                            printLog(`【${item.fileName}】上传失败：${errorInfo(e)}`, "error");
                            resolve({ fileName: item.fileName, result: false });
                        });
                    }) as Promise<uploadResult>),
                );

                uploadResults.push(...segmenteduploadResult);
                printLog(`第${i + 1}个分段完成，其中${segmenteduploadResult.filter(item => item.result).length}个成功，${segmenteduploadResult.filter(item => !item.result).length}个失败`);
            }
        }

        const report = [
            `全部上传结果：共计${uploadResults.length}个文件，其中${uploadResults.filter(item => item.result).length}个成功，${uploadResults.filter(item => !item.result).length}个失败`,
            ...uploadResults.map((item, index) => `${index + 1}. 【${item.fileName}】${item.result ? "成功" : "失败"}`),
        ].join("\n");

        console.log(report);
        alert(report);

        status = 3;
    } catch (e) {
        console.log("上传流程出现错误", e);
        mw.notify("网络错误，请重试", { type: "error" });
        status = 0;
    }
},
</script>
<template>
    <div id="widget-fileUploader" class="container">
        <input ref="fileInput" style="display:none" type="file" multiple="multiple"
            :accept="allowedFileTypes.map(item => '.' + item).join(',')" @change="addFileByFileSelector"
            @click="clearHint" />
        <div class="closeBtn" @click="hideWidget">×</div>

        <div class="body">
            <div class="fileList" @dragenter.prevent="() => { }" @dragover.prevent="() => { }"
                @drop.prevent="addFileByDropping">
                <div v-if="files.length === 0" key="hintMask" class="hintMask" @click="$refs.fileInput.click()">
                    <div class="hintText">点此添加文件，或将文件拖放至此</div>
                </div>

                <div v-for="(item, index) in files" :key="item.body.lastModified" class="item"
                    :data-name="item.fileName" :data-selected="index === focusedFileIndex" title="单击选中文件，双击复制文件名"
                    @click="focusFile(index)">
                    <img v-if="isImageFile(item.body)" :src="item.objectUrl" />
                    <div v-else class="unablePreviewHint">
                        <div>不支持预览的文件类型</div>
                        <div v-if="typeof item.body !== 'string'" class="type">Mimetype: {{ item.body.type }}</div>
                    </div>
                    <div class="removeBtn" @click.stop="files.splice(index, 1)">×</div>
                </div>

                <div v-if="files.length !== 0" class="item addFileBox" @click="$refs.fileInput.click()" />
            </div>

            <div class="panel">
                <div class="block">
                    <div class="input-container" title="上传后使用文件时的名字，要求不能和现有文件重复">
                        <span>文件名：</span>
                        <input v-model.trim="form.fileName" @click="clearHint" />
                    </div>

                    <div class="input-container categoryInput" title="所有文件共享分类">
                        <span>分<span style="visibility: hidden;">一</span>类：</span>
                        <input ref="categoryInput" v-model.trim="form.categoryInput" @input="loadCategoryHint"
                            @keydown.enter="addCategory(form.categoryInput)"
                            @keydown.up.prevent="handlerFor_categoryInput_wasKeyDowned" />
                        <div class="inputHint">按下回车添加分类</div>
                        <div ref="categoryHints" v-if="categoryHints.length !== 0" class="categoryHints" tabindex="0"
                            @keydown.enter="addCategory(categoryHints[categoryHintFocusedIndex])"
                            @keydown.prevent="handlerFor_categoryHints_wasKeyDowned">
                            <div v-for="(item, index) in categoryHints" class="item"
                                :data-selected="index === categoryHintFocusedIndex" @click="addCategory(item)">{{ item
                                }}</div>
                        </div>
                    </div>

                    <div class="categories">
                        <div v-for="(item, index) in form.categories" class="item" title="点击删除分类"
                            @click="form.categories.splice(index, 1)">{{ item }}</div>
                    </div>
                </div>

                <div class="block">
                    <div class="input-container">
                        <span>角色名：</span>
                        <input v-model.trim="form.charaName" @click="clearHint" />
                    </div>

                    <div class="input-container">
                        <span>作<span style="visibility: hidden;">一</span>者：</span>
                        <input v-model.trim="form.author" @click="clearHint" />
                    </div>

                    <div class="input-container">
                        <span>源地址：</span>
                        <input v-model.trim="form.source" @click="clearHint" />
                    </div>
                </div>

                <div class="block" style="flex-direction:column; justify-content:space-around; align-items:flex-start;">
                    <div class="input-container" title="所有文件共享前缀">
                        <span>添加前缀：</span>
                        <input v-model.trim="form.prefix" style="width:calc(100% - 6em)" @click="clearHint" />
                    </div>

                    <div class="input-container" style="justify-content:flex-start;">
                        <select v-model.trim="form.license" @click="clearHint">
                            <option disabled="disabled" value="">选择授权协议(将鼠标放在选项上显示详情)</option>
                            <optgroup label="CC协议">
                                <option value="CC Zero" title="作者授权以无著作权方式使用">CC-0</option>
                                <option value="CC BY" title="作者授权以署名方式使用，该授权需兼容3.0协议">CC BY 3.0</option>
                                <option value="CC BY-SA" title="作者授权以署名-相同方式方式使用，该授权需兼容3.0协议">CC BY-SA 3.0</option>
                                <option value="CC BY-NC-SA" title="作者授权以署名-非商业使用-相同协议方式使用，该授权需兼容3.0协议">CC BY-NC-SA 3.0
                                </option>
                            </optgroup>
                            <optgroup label="公有领域">
                                <option value="PD-Old">作者离世一定年限后流入公有领域</option>
                                <option value="PD-Other">其他原因流入公有领域</option>
                            </optgroup>
                            <optgroup label="其他">
                                <option value="Copyright" title="原作者没有明确的授权声明">原作者保留权利</option>
                                <option value="none:gotoCommons">原作者授权萌百使用</option>
                                <option value="可自由使用" title="作者放弃版权或声明可自由使用">可自由使用</option>
                                <option value="萌娘百科版权所有">萌娘百科版权所有</option>
                            </optgroup>
                        </select>
                    </div>

                    <div class="buttons" @click="clearHint">
                        <button @click="addSourceUrlFile">添加源地址文件</button>
                        <button :disabled="status === 2" title="执行上传文件" @click="submit(false)">上传</button>
                        <button :disabled="status === 2"
                            title="在发生文件名已存在的情况时，自动滤掉已存在的文件。通常用于在上一次批量上传中一部分失败后，再次尝试将之前没传上去的文件重新上传"
                            @click="submit(true)">差分上传</button>
                        <button title="将当前文件除文件名的信息同步到全部文件" @click="syncCurrentFileInfo">同步文件信息</button>
                        <button @click="showManual">使用说明</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>