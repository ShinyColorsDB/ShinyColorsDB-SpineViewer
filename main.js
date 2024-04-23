"use strict";
let app, urlFlag = false;
const dropLoader = PIXI.Assets, cont = new PIXI.Container();
const SML0 = "sml_cloth0", SML1 = "sml_cloth1", BIG0 = "big_cloth0", BIG1 = "big_cloth1";
const urlParams = new URLSearchParams(window.location.search);

const idolMap = new Map();
const spineMap = new Map();

PIXI.settings.RENDER_OPTIONS.hello = false;

const migrateMap = {
    "sml_cloth0": "cb",
    "sml_cloth1": "cb_costume",
    "big_cloth0": "stand",
    "big_cloth1": "stand_costume",
};

function dropHandler(event) {
    event.preventDefault();
    let pathJSON, pathAtlas, pathTexture;
    if (event.dataTransfer.items) {
        for (let item of event.dataTransfer.items) {
            if (item.kind === "file") {
                const file = item.getAsFile();
                const blobURL = window.URL.createObjectURL(file);
                if (file.name.endsWith(".atlas")) {
                    pathAtlas = blobURL;
                } else if (file.name.endsWith(".png") || file.name.endsWith(".webp")) {
                    pathTexture = file;
                } else if (file.name.endsWith(".json")) {
                    pathJSON = blobURL;
                }
            }
        }
    } else {
        for (let file of event.dataTransfer.files) {
            const blobURL = window.URL.createObjectURL(file);
            if (file.name.endsWith(".atlas")) {
                pathAtlas = blobURL;
            } else if (file.name.endsWith(".png") || file.name.endsWith(".webp")) {
                pathTexture = file;
            } else if (file.name.endsWith(".json")) {
                pathJSON = blobURL;
            }
        }
    }

    if (pathAtlas && pathTexture && pathJSON) {
        PIXI.Assets.add({
            alias: "dropJson",
            src: pathJSON,
            format: 'json',
            loadParser: 'loadJson'
        });
        PIXI.Assets.add({
            src: pathAtlas,
            alias: "dropAtlas",
            format: 'txt',
            loadParser: 'loadTxt'
        });

        PIXI.Assets.load(["dropJson", "dropAtlas"]).then(() => {
            renderByDrop(pathTexture);
        });
    }
    else {
        alert("missing files!");
    }
}

function dragOverHandler(event) {
    event.preventDefault();
}

async function renderByDrop(dataTexture) {
    const rawJson = PIXI.Assets.get("dropJson");
    const rawAtlas = PIXI.Assets.get("dropAtlas");
    const rawTexture = await blobToBase64(dataTexture);
    //console.log(rawJson, rawAtlas, rawTexture);
    const spineAtlas = new PIXI.spine.TextureAtlas(rawAtlas, (_, callback) => {
        //line = rawTexture;
        callback(PIXI.BaseTexture.from(rawTexture));
    });
    //const spineAtlasLoader = new PIXI.spine.core.AtlasAttachmentLoader(spineAtlas);
    //const spineJsonParser = new PIXI.spine.core.SkeletonJson(spineAtlasLoader);
    const spineJsonParser = new PIXI.spine.SkeletonJson();
    const spineData = spineJsonParser.readSkeletonData(spineAtlas, rawJson);
    await setupAnimationList(spineData);
}

function toastInit() {
    let toastTrigger = document.getElementById('copyToClipboard');
    let toastLiveExample = document.getElementById('copied');
    if (toastTrigger) {
        toastTrigger.addEventListener('click', function () {
            let toast = new bootstrap.Toast(toastLiveExample);

            toast.show();
        });
    }
}

function toMobileUI() {
    window.location.href = "https://mspine.shinycolors.moe";
}

async function init() {
    if (!PIXI.utils.isWebGLSupported()) {
        const hardwareAccel = new bootstrap.Modal(document.getElementById("divWebGL"));
        hardwareAccel.toggle();
        console.log('WebGL is not supported in this browser.');
    }

    if (/(Android|iPhone|iPad)/i.test(navigator.userAgent) && !window.location.href.match(/mspine/)) {
        const mobileWarning = new bootstrap.Modal(document.getElementById("divMobile"));
        mobileWarning.toggle();
    }

    toastInit();
    const canvas = document.getElementById("canvas"), resetBtn = document.getElementById("resetAnimation");

    app = new PIXI.Application({
        view: canvas,
        width: canvas.clientWidth - 1,
        height: canvas.clientHeight - 1,
    });

    app.stage.addChild(cont);

    const colorPicker = document.getElementById("colorPicker");
    colorPicker.onchange = (event) => {
        app.renderer.backgroundColor = String(event.target.value).replace(/#/, "0X");
    };

    resetBtn.onclick = () => {
        resetAllAnimation();
    }

    const continuousShootingModeSwitch = document.getElementById("continuousShootingModeSwitch")
    continuousShootingModeSwitch.addEventListener("change", (event) => {
        isContinuousShootingEnabled = event.target.checked
        // console.info(`enableContinuousShooting:${isContinuousShootingEnabled}`)
    });


    fetch("https://api.shinycolors.moe/spine/idollist").then(async (response) => {
        const idolInfo = await response.json();
        const idolInfoMap = new Map();
        idolInfo.forEach((element) => {
            idolInfoMap.set(element.idolId, element);
        });
        setupIdolList(idolInfoMap);
    });

    _hello();
}

function _hello() {
    const log = [
        `\n\n %c  %c   ShinyColors Spine Viewer   %c  %c  https://github.com/ShinyColorsDB/ShinyColorsDB-SpineViewer  %c \n\n`,
        'background: #28de10; padding:5px 0;',
        'color: #28de10; background: #030307; padding:5px 0;',
        'background: #28de10; padding:5px 0;',
        'background: #5eff84; padding:5px 0;',
        'background: #28de10; padding:5px 0;',
    ];
    console.log(...log);
}

function setupIdolList(idolInfo) {
    const idolList = document.getElementById("idolList");
    let idolId = urlParams.has("idolId") ? Number(urlParams.get("idolId")) : 1,
        idolName = idolInfo.get(idolId).idolName;
    idolList.innerHTML = "";

    idolInfo.forEach((element, index) => {
        const option = document.createElement("option");
        option.textContent = element.idolName;
        option.value = element.idolId;
        if (element.idolId === idolId) {
            option.selected = true;
        };
        idolList.appendChild(option);
    });

    idolList.onchange = () => {
        idolId = idolList.value;
        idolName = idolInfo.get(Number(idolId)).idolName;
        testAndLoadDress(idolId, idolName);
    };

    testAndLoadDress(idolId, idolName);
}
/*
function testAndLoadPreset(idolId) {
    if (!apiLoader.resources[`preset${idolId}`]) {
        apiLoader.add(`preset${idolId}`, `https://api.shinycolors.moe/spine/spinepreset?idolId=${idolId}`).load(function (_, resources) {
            setupPreset(JSON.parse(resources[`preset${idolId}`].data));
        });
    }
    else {
        setupPreset(JSON.parse(apiLoader.resources[`preset${idolId}`]));
    }
}
*/
function setupPreset(presetList) {

}

function testAndLoadDress(idolId, idolName) {
    if (!idolMap.has(idolName)) {
        if (idolId == 0) {
            fetch(`https://cf-static.shinycolors.moe/others/hazuki.json`).then(async (response) => {
                idolMap.set(idolName, await response.json());
                setupDressList(idolMap.get(idolName));
            });
        }
        else {
            fetch(`https://api.shinycolors.moe/spine/dressList?idolId=${idolId}`).then(async (response) => {
                idolMap.set(idolName, await response.json());
                setupDressList(idolMap.get(idolName));
            });
        }
    }
    else {
        setupDressList(idolMap.get(idolName));
    }
}

function setupDressList(idolDressList) {
    const dressList = document.getElementById("dressList");
    dressList.innerHTML = "";

    let lastType = "P_SSR", optGroup = document.createElement("optgroup");
    optGroup.label = "P_SSR";
    let arrayOrder = 0;

    idolDressList.forEach((element, index) => {
        if (element.dressType != lastType) {
            if (optGroup.childElementCount > 0) {
                dressList.appendChild(optGroup);
            }
            lastType = element.dressType;
            optGroup = document.createElement("optgroup");
            optGroup.label = element.dressType;
        }
        let option = document.createElement("option");
        option.textContent = element.dressName;
        option.setAttribute("value", index);
        option.setAttribute("enzaId", element.enzaId);
        if (element.idolId == 0) {
            option.setAttribute("path", element.path);
        }
        if (!element.exist) {
            option.setAttribute("disabled", true);
        }
        optGroup.appendChild(option);

        if (!urlParams.has("enzaId") && index == 0) {
            option.selected = true;
        }

        if (urlParams.has("enzaId") && element.enzaId.match(urlParams.get("enzaId")) && !urlFlag) {
            option.selected = true;
            arrayOrder = index;
        }
    });
    dressList.appendChild(optGroup);

    dressList.onchange = () => {
        arrayOrder = dressList.value;
        setupTypeList(idolDressList[arrayOrder]);
    };

    setupTypeList(idolDressList[arrayOrder]);
}

function setupTypeList(dressObj) {
    const typeList = document.getElementById("typeList");
    let dressType;
    typeList.innerHTML = "";

    let big0, big1, sml0, sml1;
    let flag_sml0 = false, flag_big0 = false,
        flag_sml1 = false, flag_big1 = false;
    if (dressObj.sml_Cloth0) {
        flag_sml0 = true;
        sml0 = document.createElement("option");
        sml0.textContent = "Q版_通常服";
        sml0.value = SML0;
        typeList.appendChild(sml0);
    }
    if (dressObj.sml_Cloth1) {
        flag_sml0 = true;
        sml1 = document.createElement("option");
        sml1.textContent = "Q版_演出服";
        sml1.value = SML1;
        typeList.appendChild(sml1);
    }
    if (dressObj.big_Cloth0) {
        flag_big0 = true;
        big0 = document.createElement("option");
        big0.textContent = "一般_通常服";
        big0.value = BIG0;
        typeList.appendChild(big0);
    }
    if (dressObj.big_Cloth1) {
        flag_big1 = true;
        big1 = document.createElement("option");
        big1.textContent = "一般_演出服";
        big1.value = BIG1;
        typeList.appendChild(big1);
    }

    if (urlParams.has("dressType")
        && (urlParams.get("dressType") === SML0
            || urlParams.get("dressType") === SML1
            || urlParams.get("dressType") === BIG0
            || urlParams.get("dressType") === BIG1)
        && !urlFlag) {

        const typeFromUri = urlParams.get("dressType");
        switch (typeFromUri) {
            case SML0:
                dressType = SML0;
                sml0.selected = true;
                break;
            case SML1:
                dressType = SML1;
                sml1.selected = true;
                break;
            case BIG0:
                dressType = BIG0;
                big0.selected = true;
                break;
            case BIG1:
                dressType = BIG1;
                big1.selected = true;
                break;
        }

        urlFlag = true;
    }
    else {
        if (flag_big0) {
            dressType = BIG0;
            big0.selected = true;
        }
        else if (flag_big1) {
            dressType = BIG1;
            big1.selected = true;
        }
        else if (flag_sml0) {
            dressType = SML0;
            sml0.selected = true;
        }
        else if (flag_sml1) {
            dressType = SML1;
            sml1.selected = true;
        }
    }

    typeList.onchange = () => {
        const dressList = document.getElementById("dressList");
        dressType = typeList.value;

        if (dressObj.idolId == 0) {
            testAndLoadAnimation(dressList.options[dressList.selectedIndex].getAttribute("path"), dressType, true);
        }
        else {
            testAndLoadAnimation(dressList.options[dressList.selectedIndex].getAttribute("enzaId"), dressType);
        }
    };

    if (dressObj.idolId == 0) {
        testAndLoadAnimation(dressObj.path, dressType, true);
    }
    else {
        testAndLoadAnimation(dressObj.enzaId, dressType);
    }

}

function testAndLoadAnimation(enzaId, type, flag = false) {
    if (!spineMap.has(`${enzaId}/${type}`)) {
        if (flag) {
            PIXI.Assets.load(`https://cf-static.shinycolors.moe/spine/sub_characters/${migrateMap[type]}/${enzaId}`).then((resource) => {
                const waifu = resource.spineData;
                spineMap.set(`${enzaId}/${type}`, waifu);
                setupAnimationList(waifu);
            });
        }
        else {
            PIXI.Assets.load(`https://cf-static.shinycolors.moe/spine/idols/${migrateMap[type]}/${enzaId}/data.json`).then((resource) => {
                const waifu = resource.spineData;
                spineMap.set(`${enzaId}/${type}`, waifu);
                setupAnimationList(waifu);
            });
        }
    }
    else {
        setupAnimationList(spineMap.get(`${enzaId}/${type}`));
    }
}

function setupAnimationList(spineData) {
    const animationList = document.getElementById("divAnimationBody");
    animationList.innerHTML = "";

    const defaultAnimation = "wait";

    let currentSpine = new PIXI.spine.Spine(spineData),
        hasWait = false;

    try {
        currentSpine.skeleton.setSkinByName("normal");
    } catch (e) {
        currentSpine.skeleton.setSkinByName("default");
    }

    for (let [index, animation] of (spineData.animations).entries()) {
        const div = document.createElement("div"),
            input = document.createElement("input"),
            label = document.createElement("label");
        const name = animation.name;

        input.setAttribute("type", "checkbox");
        input.setAttribute("name", name);
        input.setAttribute("id", name);
        input.setAttribute("trackNo", index);
        input.classList.add("form-check-input", "animationElement");

        if (name == defaultAnimation) {
            input.setAttribute("checked", true);
            currentSpine.state.setAnimation(index, defaultAnimation, true);
            hasWait = true;
        }

        input.addEventListener('change', (e) => {
            animationOnChange(input, index, currentSpine);
        });

        label.setAttribute("for", name);
        label.textContent = name;
        label.classList.add("form-check-label");

        div.appendChild(input);
        div.appendChild(label);

        div.classList.add("col-6", "form-check");
        animationList.appendChild(div);
    }

    if (!hasWait) {
        document.getElementById(currentSpine.spineData.animations[0].name).checked = true;
        currentSpine.state.setAnimation(0, currentSpine.spineData.animations[0].name, true);
    }

    renderToStage(currentSpine);
}

function animationOnChange(theInput, trackNo, currentSpine) {
    if (theInput.checked) {
        const theAnimation = theInput.getAttribute("name");
        currentSpine.state.setAnimation(trackNo, theAnimation, true);
    }
    else {
        currentSpine.state.clearTrack(trackNo);
    }
    currentSpine.skeleton.setToSetupPose();
    currentSpine.update(0);
    currentSpine.autoUpdate = true;
}

function blobToBase64(blob) {
    return new Promise((resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

function renderToStage(currentSpine) {
    cont.removeChild(cont.children[0]);
    cont.addChild(currentSpine);

    const dressType = document.getElementById("typeList").value;
    const spineLocalBound = currentSpine.getLocalBounds();

    currentSpine.position.set(-spineLocalBound.x, -spineLocalBound.y);

    let scale = 0.9;
    switch (dressType) {
        case SML0:
            break;
        case SML1:
            scale = 2.5;
            break;
        case BIG0:
        case BIG1:
            scale = (app.view.height / currentSpine.spineData.height) * 0.9;
            break;
    }

    const contLocalBound = cont.getLocalBounds();
    cont.scale.set(scale);
    cont.pivot.set(contLocalBound.width / 2, contLocalBound.height / 2);
    cont.position.set(app.view.width / 2, app.view.height / 2);
}

function resetAllAnimation() {
    let hasWait = false;
    for (let k of document.getElementsByClassName("animationElement")) {
        if (k.getAttribute("name") == "wait") {
            hasWait = true;
            k.checked = true;
        }
        else {
            k.checked = false;
        }
        k.dispatchEvent(new Event("change"));
    }

    if (!hasWait) {
        const first = document.getElementsByClassName("animationElement")[0];
        first.checked = true;
        first.dispatchEvent(new Event("change"));
    }
}

function copyLinkToClipboard() {
    const idolId = document.getElementById("idolList").value;
    const dressList = document.getElementById("dressList");
    const dressType = document.getElementById("typeList").value;
    const enzaId = dressList.options[dressList.selectedIndex].getAttribute("enzaId");
    const link = `https://spine.shinycolors.moe/?idolId=${idolId}&enzaId=${enzaId}&dressType=${dressType}`;
    navigator.clipboard.writeText(link);
}

async function saveImage() {
    const renderer = app.renderer;
    const image = await renderer.extract.image(cont);
    const anchor = document.createElement('a');
    const idolName = document.getElementById("idolList").selectedOptions[0].text;
    const optionElement = document.getElementById("dressList").selectedOptions[0];
    const dressCategory = optionElement.parentNode.label;
    const dressName = optionElement.text;
    const dressType = document.getElementById("typeList").selectedOptions[0].text;
    const fileName = `${idolName}-${dressCategory}-${dressName}-${dressType}.png`;
    // Windows: <>:"/\|?*
    // macOS/Linux : /
    const invalidRagex = /[<>:"\/\\|?*\x00-\x1F]/g;
    const validFileName = fileName.replace(invalidRagex, '_');

    anchor.download = validFileName;
    anchor.href = image.src;
    // Trigger a click event on the anchor element to initiate the download
    anchor.click();
}
