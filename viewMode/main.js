'use strict';
let app;
const apiLoader = new PIXI.Loader(), dropLoader = new PIXI.Loader(), cont = new PIXI.Container();
const SML0 = "sml_cloth0", SML1 = "sml_cloth1", BIG0 = "big_cloth0", BIG1 = "big_cloth1";

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
            .load(function(loader, resources) {
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

function init() {
    let animationCount = 1;
    const canvas = document.getElementById("canvas"), resetBtn = document.getElementById("resetAnimation");

    app = new PIXI.Application({
        view: canvas,
        width: canvas.clientWidth,
        height: canvas.clientHeight
    });

    app.stage.addChild(cont);

    apiLoader
        .add("IdolList", "https://api.shinycolors.moe/spines/IdolList")
        .add("UpdateLog", "https://api.shinycolors.moe/spines/UpdateLog")
        //.add("Version", "https://api.shinycolors.moe/spines/Version")
        .load(function(loader, resources) {
            onJsonLoaded(JSON.parse(resources.IdolList.data), JSON.parse(resources.UpdateLog.data));
        });

    const colorPicker = document.getElementById("colorPicker");
    colorPicker.onchange = (event) => {
        app.renderer.backgroundColor = String(event.target.value).replace(/#/, '0X');
    };

    resetBtn.onclick = () => {
        resetAllAnimation();
    }
}

function onJsonLoaded(idolList, updateLog) {
    setupUpdateLog(updateLog);
    setupIdolList(idolList);
}

function setupUpdateLog(updateLog) {
    let modal = document.getElementById("divModalBody");

    updateLog.forEach(element => {
        let divTitle = document.createElement("div");
        divTitle.classList.add("p-1");
        let divContent = document.createElement("p");
        divContent.classList.add("p-3");

        element.Content.forEach(e => {
            let span = document.createElement("span");
            span.textContent = e;
            span.classList.add("text-info");
            divContent.appendChild(span);
            divContent.appendChild(document.createElement("br"));
        });

        modal.appendChild(divTitle.appendChild(document.createTextNode(element.Date)));
        modal.appendChild(divContent);
    });
    document.getElementById('showLog').click();
}

function setupIdolList(idolInfo) {
    const idolList = document.getElementById("idolList");
    let idolId = 1, idolName = 'mano';
    idolList.innerHTML = "";

    idolInfo.forEach((element, index) => {
        const option = document.createElement("option");
        option.textContent = element.IdolName;
        option.value = element.IdolID;
        if (index == 1) option.selected = true;
        idolList.appendChild(option);
    });

    idolList.onchange = () => {
        idolId = idolList.value;
        idolName = idolInfo[idolId].Directory;
        testAndLoadDress(idolId, idolName);
    };

    testAndLoadDress(idolId, idolName);
}

function testAndLoadDress(idolId, idolName) {
    if (!apiLoader.resources[idolName]) {
        apiLoader.add(idolName, `https://api.shinycolors.moe/spines/dressList/${idolId}`).load(function(loader, resources) {
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

    let lastType = "P_SSR", optGroup = document.createElement('optgroup');
    optGroup.label = "P_SSR";

    idolDressList.forEach((element, index) => {
        if (element.DressType != lastType) {
            if (optGroup.childElementCount > 0) {
                dressList.appendChild(optGroup);
            }
            lastType = element.DressType;
            optGroup = document.createElement('optgroup');
            optGroup.label = element.DressType;
        }
        let option = document.createElement("option");
        option.textContent = element.DressName;
        option.setAttribute("value", index);
        option.setAttribute("dressUUID", element.DressUUID);
        optGroup.appendChild(option);
    });
    dressList.appendChild(optGroup);

    let arrayOrder = 0;
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
    if (dressObj.Sml_Cloth0) {
        flag_sml0 = true;
        sml0 = document.createElement("option");
        sml0.textContent = "Q???_?????????";
        sml0.value = SML0;
        typeList.appendChild(sml0);
    }
    if (dressObj.Sml_Cloth1) {
        flag_sml0 = true;
        sml1 = document.createElement("option");
        sml1.textContent = "Q???_?????????";
        sml1.value = SML1;
        typeList.appendChild(sml1);
    }
    if (dressObj.Big_Cloth0) {
        flag_big0 = true;
        big0 = document.createElement("option");
        big0.textContent = "??????_?????????";
        big0.value = BIG0;
        typeList.appendChild(big0);
    }
    if (dressObj.Big_Cloth1) {
        flag_big1 = true;
        big1 = document.createElement("option");
        big1.textContent = "??????_?????????";
        big1.value = BIG1;
        typeList.appendChild(big1);
    }

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

    typeList.onchange = () => {
        const dressList = document.getElementById("dressList");
        dressType = typeList.value;

        if (dressType == SML0 || dressType == SML1) {
            toggleTrackSelectList(false);
        }
        else {
            toggleTrackSelectList(true);
        }

        testAndLoadAnimation(dressList.options[dressList.selectedIndex].getAttribute("dressUUID"), dressType);
    };

    testAndLoadAnimation(dressObj.DressUUID, dressType);
}

function toggleTrackSelectList(toggle) {
    const animationList2 = document.getElementById("animationList2"),
        animationList3 = document.getElementById("animationList3"),
        animationList4 = document.getElementById("animationList4");
    if (!toggle) { // disable
        for (let k of [animationList2, animationList3, animationList4]) {
            k.classList.add("bg-secondary");
            k.disabled = true;
        }        
    }
    else { //enable
        for (let k of [animationList2, animationList3, animationList4]) {
            k.classList.remove("bg-secondary");
            k.disabled = false;
        }
    }
}

function testAndLoadAnimation(uuid, type) {
    if (!app.loader.resources[`${uuid}/${type}`]) {
        app.loader.add(`${uuid}/${type}`, `https://static.shinycolors.moe/spines/${uuid}/${type}/data.json`).load(function(loader, resources) {
            setupAnimationList(resources[`${uuid}/${type}`].spineData);
        });
    }
    else {
        setupAnimationList(app.loader.resources[`${uuid}/${type}`].spineData);
    }
}

function setupAnimationList(spineData) {
    const animationList1 = document.getElementById("animationList1"),
        animationList2 = document.getElementById("animationList2"),
        animationList3 = document.getElementById("animationList3"),
        animationList4 = document.getElementById("animationList4");
    const defaultAnimation = "wait", noAnimation = "none";

    let currentSpine = new PIXI.spine.Spine(spineData);
    
    try {
        currentSpine.skeleton.setSkinByName('normal');
    } catch (e) {
        currentSpine.skeleton.setSkinByName('default');
    }

    if (currentSpine.state.hasAnimation(defaultAnimation)) {
        currentSpine.state.setAnimation(0, defaultAnimation, true);
    }
    else {
        currentSpine.state.setAnimation(0, currentSpine.spineData.animations[0].name, true);
    }

    for (let list of [animationList1, animationList2, animationList3, animationList4]) {
        list.innerHTML = "";

        if (list != animationList1) {
            const de = document.createElement("option");
            de.textContent = noAnimation;
            de.value = noAnimation;
            de.selected = true;
            list.appendChild(de);
        }

        for (let animation of spineData.animations) {
            const name = animation.name;
            const option = document.createElement("option");
            option.textContent = name;
            option.value = name;
            option.selected = (name === defaultAnimation) && (list == animationList1);
            list.appendChild(option);
        }

    }

    animationOnChange(animationList1, 0, currentSpine);
    animationOnChange(animationList2, 1, currentSpine);
    animationOnChange(animationList3, 2, currentSpine);
    animationOnChange(animationList4, 3, currentSpine);

    renderToStage(currentSpine);
}

function animationOnProgress() {

}

function animationOnChange(list, trackNo, currentSpine) {
    list.onchange = () => {
        console.log(`Changing track No. ${trackNo}`);
        let newAnimation = list.value;
        if (newAnimation == "none") {
            currentSpine.state.clearTrack(trackNo);
        }
        else {
            currentSpine.state.setAnimation(trackNo, newAnimation, true);
        }                
        currentSpine.skeleton.setToSetupPose();
        currentSpine.update(0);
        currentSpine.autoUpdate = true;
        //slider.setAttribute("max", currentSpine.state.tracks[trackNo].animation.duration * 1000);
    }
}

async function renderByDrop(dataAtlas, dataJson, dataTexture) {
    const rawJson = dataJson;
    const rawAtlas = dataAtlas;
    const rawTexture = await blobToBase64(dataTexture);
    const spineAtlas = new PIXI.spine.core.TextureAtlas(rawAtlas, (line, callback) => {
        callback(PIXI.BaseTexture.from(rawTexture));
    });
    const spineAtlasLoader = new PIXI.spine.core.AtlasAttachmentLoader(spineAtlas);
    const spineJsonParser = new PIXI.spine.core.SkeletonJson(spineAtlasLoader);
    const spineData = spineJsonParser.readSkeletonData(rawJson);
    let thisSpine = new PIXI.spine.Spine(spineData);
    renderToStage(thisSpine);
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

    const localRect = currentSpine.getLocalBounds();
    currentSpine.position.set(-localRect.x, -localRect.y);

    const dressType = document.getElementById("typeList").value;

    let scale = 1;
    switch (dressType) {
        case SML0:
            break;
        case SML1:
            scale = 2.5;
            break;
        case BIG0:
        case BIG1:
            scale = Math.min(
                app.view.width / currentSpine.spineData.width,
                app.view.height / currentSpine.spineData.height
            ) * 0.85
            if (scale < 0.8) scale = 0.8;
            break;
    }

    cont.scale.set(scale);
    cont.position.set(
        (app.screen.width - cont.width) * 0.5,
        (app.screen.height - cont.height) * 0.5
    );
}

function resetAllAnimation() {
    const animationList1 = document.getElementById("animationList1"),
        animationList2 = document.getElementById("animationList2"),
        animationList3 = document.getElementById("animationList3"),
        animationList4 = document.getElementById("animationList4");

    animationList1.value = "wait";
    animationList1.dispatchEvent(new Event("change"));

    for (let k of [animationList2, animationList3, animationList4]) {
        k.value = "none";
        k.dispatchEvent(new Event("change"));
    }

}
