"use strict";
let app, urlFlag = false;
const dropLoader = PIXI.Assets, cont = new PIXI.Container();
const SML0 = "sml_cloth0", SML1 = "sml_cloth1", BIG0 = "big_cloth0", BIG1 = "big_cloth1";
const urlParams = new URLSearchParams(window.location.search);
let PIXIrenderer = 'webgpu';

// State
let isContinuousShootingEnabled = false

const idolMap = new Map();
const spineMap = new Map();

const migrateMap = {
    "sml_cloth0": "cb",
    "sml_cloth1": "cb_costume",
    "big_cloth0": "stand",
    "big_cloth1": "stand_costume",
}

function dropHandler(event) {
    event.preventDefault();
    let pathJSON, pathAtlas;
    const pathTexture = new Map(); //有可能不止一張圖片
    if (event.dataTransfer.items) {
        for (let item of event.dataTransfer.items) {
            if (item.kind === "file") {
                const file = item.getAsFile();
                const blobURL = window.URL.createObjectURL(file);
                if (file.name.endsWith(".atlas")) {
                    pathAtlas = blobURL;
                } else if (file.name.endsWith(".png") || file.name.endsWith(".webp")) {
                    pathTexture.set(file.name, file); //有可能不止一張圖片
                } else if (file.name.endsWith(".json")) {
                    pathJSON = blobURL;
                }
            }
        }
    }
    else {
        for (let file of event.dataTransfer.files) {
            const blobURL = window.URL.createObjectURL(file);
            if (file.name.endsWith(".atlas")) {
                pathAtlas = blobURL;
            } else if (file.name.endsWith(".png") || file.name.endsWith(".webp")) {
                pathTexture.set(file.name, file); //有可能不止一張圖片
            } else if (file.name.endsWith(".json")) {
                pathJSON = blobURL;
            }
        }
    }

    if (pathAtlas && pathJSON && pathTexture.size > 0) {
        createDropSpine(pathAtlas, pathJSON, pathTexture);
    }
    else{
        alert("missing files!");
    }
}

function dragOverHandler(event) {
    event.preventDefault();
}

async function createDropSpine(atlas, json, texture) {
    //skel
    const rawJSON = await PIXI.DOMAdapter.get().fetch(json).then((response)=>response.json());
    PIXI.Assets.cache.set("skel_drop", rawJSON);
    console.log(rawJSON)
    //atlas
    const rawAtlas = await PIXI.DOMAdapter.get().fetch(atlas).then((response)=>response.text());
    const textureAtlas = new PIXI.Spine37.TextureAtlas(rawAtlas);
    PIXI.Assets.cache.set("atlas_drop", textureAtlas);
    //textures
    const textureLoadingPromises = [];
    for (const page of textureAtlas.pages) {
        
        const base64Texture = await blobToBase64(texture.get(page.name));
        
        const pixiPromise = PIXI.Assets.load({
            alias: page.name,
            src: base64Texture,
            data : {
                alphaMode: page.pma ? 'premultiplied-alpha' : 'premultiply-alpha-on-upload'
            }
        }).then((rawtexture)=>{
            page.setTexture(PIXI.Spine37.SpineTexture.from(rawtexture.source));
        })

        textureLoadingPromises.push(pixiPromise);
    }
    await Promise.all(textureLoadingPromises);

    await setupAnimationList('drop');
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

function tooltipInit() {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
}

function toMobileUI() {
    window.location.href = "https://mspine.shinycolors.moe";
}

async function init() {
    if (!PIXI.isWebGLSupported() && !PIXI.isWebGPUSupported()) {
        const hardwareAccel = new bootstrap.Modal(document.getElementById("divWebGL"));
        hardwareAccel.toggle();
        console.log('WebGL/WebGPU is not supported in this browser.');
    }

    if (/(Android|iPhone|iPad)/i.test(navigator.userAgent) && !window.location.href.match(/mspine/)) {
        const mobileWarning = new bootstrap.Modal(document.getElementById("divMobile"));
        mobileWarning.toggle();
    }

    toastInit();
    tooltipInit();
    const canvas = document.getElementById("canvas"), resetBtn = document.getElementById("resetAnimation");

    PIXIrenderer = urlParams.has('renderer') ? urlParams.get('renderer') : 'webgpu'; // 'webgl', 'webgpu'
    app = new PIXI.Application();
    await app.init({
        preference : PIXIrenderer,
        view: canvas,
        width: canvas.clientWidth - 1,
        height: canvas.clientHeight - 1,
    })
    PIXIrenderer = app.renderer.name;

    app.stage.addChild(cont);

    const colorPicker = document.getElementById("colorPicker");
    colorPicker.onchange = (event) => {
        app.renderer.background.color = String(event.target.value).replace(/#/, "0X");
    };

    resetBtn.onclick = () => {
        resetAllAnimation();
    }

    const continuousShootingModeSwitch = document.getElementById("continuousShootingModeSwitch")
    continuousShootingModeSwitch.addEventListener("change", (event) => {
        isContinuousShootingEnabled = event.target.checked
        // console.info(`enableContinuousShooting:${isContinuousShootingEnabled}`)
    })

    fetch("https://api.shinycolors.moe/spine/idollist").then(async (response) => {
        const idolInfo = await response.json();
        const idolInfoMap = new Map();
        idolInfo.forEach((element) => {
            idolInfoMap.set(element.idolId, element);
        });
        await setupIdolList(idolInfoMap);
    });

    _hello();
}

function _hello() {
    const log = [
        `\n\n %c  %c   ShinyColors Spine Viewer (${PIXIrenderer}) %c  %c  https://github.com/ShinyColorsDB/ShinyColorsDB-SpineViewer  %c \n\n`,
        'background: #28de10; padding:5px 0;',
        'color: #28de10; background: #030307; padding:5px 0;',
        'background: #28de10; padding:5px 0;',
        'background: #5eff84; padding:5px 0;',
        'background: #28de10; padding:5px 0;',
    ];
    console.log(...log);
}

async function setupIdolList(idolInfo) {
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

    idolList.onchange = async () => {
        idolId = idolList.value;
        idolName = idolInfo.get(Number(idolId)).idolName;
        await testAndLoadDress(idolId, idolName);
    };

    await testAndLoadDress(idolId, idolName);
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

async function testAndLoadDress(idolId, idolName) {
    if (!idolMap.has(idolName)) {
        if (idolId == 91) {
            fetch(`https://cf-static.shinycolors.moe/others/hazuki.json`).then(async (response) => {
                idolMap.set(idolName, await response.json());
                await setupDressList(idolMap.get(idolName));
            });
        }
        else {
            fetch(`https://api.shinycolors.moe/spine/dressList?idolId=${idolId}`).then(async (response) => {
                idolMap.set(idolName, await response.json());
                await setupDressList(idolMap.get(idolName));
            });
        }
    }
    else {
        await setupDressList(idolMap.get(idolName));
    }
}

async function setupDressList(idolDressList) {
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

    dressList.onchange = async () => {
        arrayOrder = dressList.value;
        await setupTypeList(idolDressList[arrayOrder]);
    };

    await setupTypeList(idolDressList[arrayOrder]);
}

async function setupTypeList(dressObj) {
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

    typeList.onchange = async () => {
        const dressList = document.getElementById("dressList");
        dressType = typeList.value;

        if (dressObj.idolId == 0) {
            await testAndLoadAnimation(dressList.options[dressList.selectedIndex].getAttribute("path"), dressType, true);
        }
        else {
            await testAndLoadAnimation(dressList.options[dressList.selectedIndex].getAttribute("enzaId"), dressType);
        }
    };

    if (dressObj.idolId == 0) {
        await testAndLoadAnimation(dressObj.path, dressType, true);
    }
    else {
        await testAndLoadAnimation(dressObj.enzaId, dressType);
    }

}

async function testAndLoadAnimation(enzaId, type, flag = false) {
    if (!spineMap.has(`${enzaId}/${type}`)) {
        if (flag) {
            // 不知道這是幹什麼的 
            // PIXI.Assets.load(`https://cf-static.shinycolors.moe/spine/sub_characters/${migrateMap[type]}/${enzaId}`).then(async (resource) => {
            //     const waifu = resource.spineData;
            //     spineMap.set(`${enzaId}/${type}`, waifu);
            //     await setupAnimationList(waifu);
            // });
        }
        else {
            let label = `${enzaId}_${type}`;
            PIXI.Assets.load([
                {alias: `skel_${label}`, src: `https://cf-static.shinycolors.moe/spine/idols/${migrateMap[type]}/${enzaId}/data.json`},
                {alias: `atlas_${label}`, src: `https://cf-static.shinycolors.moe/spine/idols/${migrateMap[type]}/${enzaId}/data.atlas`}
            ]).then(async ()=>{
                // console.log(resource)
                await setupAnimationList(label)
            })
        }
    }
    else {
        // await setupAnimationList(spineMap.get(`${enzaId}/${type}`));
    }
}

async function setupAnimationList(spineLabel) {
    const animationList = document.getElementById("divAnimationBody");
    animationList.innerHTML = "";

    const defaultAnimation = "wait";

    let currentSpine = PIXI.Spine37.Spine.from({
        skeleton : `skel_${spineLabel}`,
        atlas : `atlas_${spineLabel}`,
    })
    let hasWait = false;

    try {
        currentSpine.skeleton.setSkinByName("normal");
    } catch (e) {
        currentSpine.skeleton.setSkinByName("default");
    }

    for (let [index, animation] of (currentSpine.skeleton.data.animations).entries()) {
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
        document.getElementById(currentSpine.skeleton.data.animations[0].name).checked = true;
        currentSpine.state.setAnimation(0, currentSpine.skeleton.data.animations[0].name, true);
    }

    await renderToStage(currentSpine);
}

function animationOnChange(theInput, trackNo, currentSpine) {
    if (theInput.checked) {
        const theAnimation = theInput.getAttribute("name");
        currentSpine.state.setAnimation(trackNo, theAnimation, true);
    }
    else {
        currentSpine.state.clearTrack(trackNo);
    }
    if (!currentSpine.autoUpdate){
        currentSpine.skeleton.setToSetupPose();
        currentSpine.update(0);
        currentSpine.autoUpdate = true;
    }
}

function blobToBase64(blob) {
    return new Promise((resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}
const clearState = (spine) => {
    spine.state.clearTracks();
    spine.skeleton.setToSetupPose();
    spine.lastTime = null;
};
async function renderToStage(currentSpine) {
    if (isContinuousShootingEnabled) { clearState(currentSpine) }
    cont.removeChildren();
    cont.addChild(currentSpine);

    const dressType = document.getElementById("typeList").value;

    let scale = 0.9;
    switch (dressType) {
        case SML0:
            break;
        case SML1:
            scale = 2.5;
            break;
        case BIG0:
        case BIG1:
            scale = (app.view.height / currentSpine.skeleton.data.height) * 0.9;
            break;
    }

    currentSpine.update(0);
    //不知為何大部分的SC spine都無法獲得完整的Bound 出於下策用Graphics去骨架大小
    const gp = createGraphics(currentSpine);
    const gpBound = gp.getLocalBounds();
    currentSpine.position.set(-gpBound.x, -gpBound.y);
    //根據Graphics的Bound 用Sprite去繪製出範圍 用於截圖
    const emptysprite = PIXI.Sprite.from(PIXI.Texture.EMPTY);
    emptysprite.alpha = 0;
    emptysprite.width = Math.max(currentSpine.skeleton.data.width, gpBound.width) + 50;
    emptysprite.height = Math.max(currentSpine.skeleton.data.height, gpBound.height) + 20;
    emptysprite.position.set(-25, -10);
    cont.addChild(emptysprite);

    cont.scale.set(scale);
    const contLocalBound = cont.getLocalBounds();
    cont.pivot.set(contLocalBound.width / 2, contLocalBound.height / 2);
    cont.position.set(app.view.width / 2, app.view.height / 2);

    if (isContinuousShootingEnabled) { await saveImage(); }
}


function createGraphics(spine){
    const graphics = new PIXI.Graphics();
    graphics.alpha = 0;

    const skeleton = spine.skeleton;
    const slots = skeleton.slots;
    for (let i = 0, len = slots.length; i < len; i++) {
        const slot = slots[i];

        if (!slot.bone.isActive) {
            continue;
        }
        const attachment = slot.getAttachment();

        if (attachment === null || !(attachment instanceof PIXI.Spine37.MeshAttachment)) {
            continue;
        }

        const meshAttachment = attachment;

        const vertices = new Float32Array(meshAttachment.worldVerticesLength);
        let hullLength = meshAttachment.hullLength;
        const triangles = meshAttachment.triangles;

        meshAttachment.computeWorldVertices(slot, 0, meshAttachment.worldVerticesLength, vertices, 0, 2);
        // draw the skinned mesh (triangle)
        
        for (let i = 0, len = triangles.length; i < len; i += 3) {
            const v1 = triangles[i] * 2;
            const v2 = triangles[i + 1] * 2;
            const v3 = triangles[i + 2] * 2;

            graphics.context
                .moveTo(vertices[v1], vertices[v1 + 1])
                .lineTo(vertices[v2], vertices[v2 + 1])
                .lineTo(vertices[v3], vertices[v3 + 1]);
        }

        // draw skin border
        if (hullLength > 0) {
            hullLength = (hullLength >> 1) * 2;
            let lastX = vertices[hullLength - 2];
            let lastY = vertices[hullLength - 1];

            for (let i = 0, len = hullLength; i < len; i += 2) {
                const x = vertices[i];
                const y = vertices[i + 1];

                graphics.context
                    .moveTo(x, y)
                    .lineTo(lastX, lastY);
                lastX = x;
                lastY = y;
            }
        }
    }

    graphics.stroke({ width: 1, color: 0xFFFFFF });
    return graphics;
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
