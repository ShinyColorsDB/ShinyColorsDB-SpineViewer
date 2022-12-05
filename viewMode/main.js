"use strict";
let app;
const apiLoader = new PIXI.Loader(), dropLoader = new PIXI.Loader(), cont = new PIXI.Container();
const SML0 = "sml_cloth0", SML1 = "sml_cloth1", BIG0 = "big_cloth0", BIG1 = "big_cloth1";
//https://spine.shinycolors.moe/viewMode?idolId=1&dressUuid=safuwqsjaflk&dressType=big_cloth0
const urlParams = new URLSearchParams(window.location.search);

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
        dropLoader
            .add("dropJson", pathJSON)
            .add("dropAtlas", pathAtlas)
            .load(function (_, resources) {
                renderByDrop(resources.dropAtlas.data, JSON.parse(resources.dropJson.data), pathTexture);
            });
    }
    else {
        alert("missing files!");
    }
}

function dragOverHandler(event) {
    event.preventDefault();
    dropLoader.reset();
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

function init() {
    toastInit();
    const canvas = document.getElementById("canvas"), resetBtn = document.getElementById("resetAnimation");

    app = new PIXI.Application({
        view: canvas,
        width: canvas.clientWidth,
        height: canvas.clientHeight
    });

    app.stage.addChild(cont);

    apiLoader
        .add("idolList", "https://api.shinycolors.moe/spine/idollist")
        .load(function (_, resources) {
            setupIdolList(JSON.parse(resources.idolList.data));
        });

    const colorPicker = document.getElementById("colorPicker");
    colorPicker.onchange = (event) => {
        app.renderer.backgroundColor = String(event.target.value).replace(/#/, "0X");
    };

    resetBtn.onclick = () => {
        resetAllAnimation();
    }
}

function setupIdolList(idolInfo) {
    const idolList = document.getElementById("idolList");
    let idolId = urlParams.has("idolId") ? Number(urlParams.get("idolId")) : 1,
        idolName = idolInfo[idolId].idolName;
    idolList.innerHTML = "";

    idolInfo.forEach((element, index) => {
        const option = document.createElement("option");
        option.textContent = element.idolName;
        option.value = element.idolId;
        if (index === idolId) {
            option.selected = true;
        };
        idolList.appendChild(option);
    });

    idolList.onchange = () => {
        idolId = idolList.value;
        idolName = idolInfo[idolId].idolName;
        testAndLoadDress(idolId, idolName);
    };

    testAndLoadDress(idolId, idolName);
}

function testAndLoadDress(idolId, idolName) {
    if (!apiLoader.resources[idolName]) {
        apiLoader.add(idolName, `https://api.shinycolors.moe/spine/dressList?idolId=${idolId}`).load(function (_, resources) {
            setupDressList(JSON.parse(resources[idolName].data));
        });
    }
    else {
        setupDressList(JSON.parse(apiLoader.resources[idolName].data));
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
        option.setAttribute("dressUUID", element.dressUuid);
        optGroup.appendChild(option);

        if (urlParams.has("dressUuid") && urlParams.get("dressUuid") === element.dressUuid) {
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
            || urlParams.get("dressType") === BIG1)) {

        const typeFromUri = urlParams.get("dressType");
        if (typeFromUri == SML0) {
            dressType = SML0;
            sml0.selected = true;
        }
        else if (typeFromUri == SML1) {
            dressType = SML1;
            sml1.selected = true;
        }
        else if (typeFromUri == BIG0) {
            dressType = BIG0;
            big0.selected = true;
        }
        else if (typeFromUri == BIG1) {
            dressType = BIG1;
            big1.selected = true;
        }
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

        testAndLoadAnimation(dressList.options[dressList.selectedIndex].getAttribute("dressUUID"), dressType);
    };

    testAndLoadAnimation(dressObj.dressUuid, dressType);
}

function testAndLoadAnimation(uuid, type) {
    if (!app.loader.resources[`${uuid}/${type}`]) {
        app.loader.add(`${uuid}/${type}`, `https://static.shinycolors.moe/spines/${uuid}/${type}/data.json`).load(function (_, resources) {
            setupAnimationList(resources[`${uuid}/${type}`].spineData);
        });
    }
    else {
        setupAnimationList(app.loader.resources[`${uuid}/${type}`].spineData);
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

        div.classList.add("col-md-4", "col-lg-3", "col-sm-6", "form-check");
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

async function renderByDrop(dataAtlas, dataJson, dataTexture) {
    const rawJson = dataJson;
    const rawAtlas = dataAtlas;
    const rawTexture = await blobToBase64(dataTexture);
    const spineAtlas = new PIXI.spine.core.TextureAtlas(rawAtlas, (_, callback) => {
        callback(PIXI.BaseTexture.from(rawTexture));
    });
    const spineAtlasLoader = new PIXI.spine.core.AtlasAttachmentLoader(spineAtlas);
    const spineJsonParser = new PIXI.spine.core.SkeletonJson(spineAtlasLoader);
    const spineData = spineJsonParser.readSkeletonData(rawJson);
    setupAnimationList(spineData);
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
    const dressUuid = dressList.options[dressList.selectedIndex].getAttribute("dressuuid");
    const link = `https://spine.shinycolors.moe/viewMode?idolId=${idolId}&dressUuid=${dressUuid}&dressType=${dressType}`;
    navigator.clipboard.writeText(link);
}
