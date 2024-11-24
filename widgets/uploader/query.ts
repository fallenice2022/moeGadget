const UserGroup = mw.config.get("wgUserGroups");
const api = new mw.Api();
interface MwApiError {
    code: string;
    info: string;
    status: number | null;
    statusText: string;
}
const getHints = (word: string): Promise<object | Error> | any => api.post({
    action: "query",
    format: "json",
    list: "search",
    srsearch: word,
    srnamespace: "14",
    srlimit: "20",
});

//東東君居然不知道mediawiki.ForeignApi！
async function upload({ body, fileName, comment, pageContent }: { body: File | string; fileName: string; comment: string; pageContent: string; }): Promise<object | Error> {
    const data = {
        filename: fileName,
        comment: comment,
        text: pageContent,
        ignorewarnings: true,
        bot: false,
        tags: "",
    };
    if (UserGroup?.includes("bot")) {
        data.tags = "Bot";
        data.bot = true;
    }
    let result = {};
    try {
        if (typeof body === "string") {
            result = await api.postWithToken("csrf", {
                ...data,
                format: "json",
                url: body,
                action: "upload",
            });
        } else {
            result = await api.upload(body, data);
        }
        return result;
    } catch (error) {
        throw error;
    }

}

function errorInfo(errorObject: Error | MwApiError): string {
    if (errorObject instanceof Error) {
        return `${errorObject} ${errorObject?.stack?.split("\n")[1].trim()}`;
    } else if (typeof errorObject.status === "number") {
        return `[${errorObject.status}] ${errorObject.statusText}`;
    }
    return `${errorObject.code} - ${errorObject.info}`;
}


async function checkFileNames(fileNames: string[]): Promise<object | Error> {
    const data = await api.post({
        action: "query",
        format: "json",
        titles: fileNames.map(item => `File:${item}`).join("|"),
        prop: "",
    });
    return Object.fromEntries(Object.values(data.query.pages).map((item: any) => [item.title.replace("File:", ""), !("missing" in item)]));
}
export { getHints, upload, errorInfo, checkFileNames, UserGroup }