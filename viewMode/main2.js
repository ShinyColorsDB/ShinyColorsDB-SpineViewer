let app, canvas;
const testLink = "https://static.shinycolors.moe/spines/mano/a86b42a2-2f0d-4a88-8178-91aecebefae2/big_cloth0/data";
const UUID = "a86b42a2-2f0d-4a88-8178-91aecebefae2";
const apiLoader = new PIXI.Loader(), cont = new PIXI.Container();
const SML0 = "sml_cloth0", SML1 = "sml_cloth1", BIG0 = "big_cloth0", BIG1 = "big_cloth1";
let currentSpine = null;
let idolInfo, idolID, idolName;
let dressTypes = [], dressMap = new Map(), 
    dressInfo, dressType;
let currentUUID = "";
function Init() {
    canvas = document.getElementById("canvas");

    app = new PIXI.Application({
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        view: canvas
    });
    app.stage.addChild(cont);

    apiLoader
        .add("IdolList", "https://api.shinycolors.moe/spines/IdolList")
        .add("UpdateLog", "https://api.shinycolors.moe/spines/UpdateLog")
        .load(onJsonLoaded);
    /*
    app.loader
        .add(UUID, testLink + ".json")
        .load(onAssetLoaded);
    */
}

function SetupUpdateLog(updateLog) {
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
        
        modal.appendChild(divTitle.appendChild(document.createTextNode(element.Date.substr(0,10))));
        modal.appendChild(divContent);
    });
    document.getElementById('showLog').click();
}

function SetupIdolList() {
    const idolList = $("#idolList")[0];
    //console.log(idolList)
    //const idolTextList = gameInfo.idol;

    idolList.innerHTML = "";

    //console.log(idolInfo);
    idolInfo.forEach((element, index) => {
        const option = document.createElement("option");
        option.textContent = element.IdolName;
        option.value = element.IdolID;
        if (index == 1) option.selected = true;
        idolList.appendChild(option);
    });
    idolID = 1;
    idolName = idolInfo[idolID].Directory;
    //return;
    idolList.onchange = () => {
        idolID = idolList.value;
        idolName = idolInfo[idolID].Directory;
        console.log(idolID, idolName);
        testAndLoadDress();
    };

    testAndLoadDress();
}

function testAndLoadDress() {
    if (!apiLoader.resources[idolName]) {
        apiLoader.add(idolName, `https://api.shinycolors.moe/spines/dressList/${idolID}`).load(SetupDressList);
    }
    else {
        SetupDressList();
    }
}

function SetupDressList() {
    const dressList = $("#dressList")[0];
    dressList.innerHTML = "";

    dressTypes = new Array();
    dressMap.clear();

    if (!apiLoader.resources[idolName].data) return;

    dressInfo = JSON.parse(apiLoader.resources[idolName].data);
    let flag = false;

    dressInfo.forEach((element, index) => {
        if (element.Exist && !flag) {
            flag = true;
            dressID = index;
        }
        const option = document.createElement("option");
        option.textContent = element.DressName;
        option.value = index;
        if (!element.Exist) option.disabled = true;
        if (index == dressID) option.selected = true;
        if (!dressMap.has(element.DressType)) {
            dressMap.set(element.DressType, new Array());
            dressTypes.push(element.DressType);
        }
        dressMap.get(element.DressType).push(option);
    });

    dressTypes.forEach(element => {
        const optGroup = document.createElement("optgroup");
        optGroup.label = element;
        dressMap.get(element).forEach(e => {
            optGroup.appendChild(e);
        });
        dressList.appendChild(optGroup);
    });

    console.log(dressInfo, dressID);

    dressList.onchange = () => {
        dressID = dressList.value;
        SetupTypeList();
    };

    SetupTypeList();
}

function SetupTypeList() {
    if (!dressInfo) return;
    const typeList = $("#typeList")[0];

    typeList.innerHTML = "";

    let big0, big1, sml0, sml1;
    let flag_sml0 = false, flag_big0 = false,
        flag_sml1 = false, flag_big1 = false;
    if (dressInfo[dressID].Sml_Cloth0) {
        flag_sml0 = true;
        sml0 = document.createElement("option");
        sml0.textContent = "Q版_通常服";
        sml0.value = SML0;
        typeList.appendChild(sml0);
    }
    if (dressInfo[dressID].Sml_Cloth1) {
        flag_sml0 = true;
        sml1 = document.createElement("option");
        sml1.textContent = "Q版_演出服";
        sml1.value = SML1;
        typeList.appendChild(sml1);
    }
    if (dressInfo[dressID].Big_Cloth0) {
        flag_big0 = true;
        big0 = document.createElement("option");
        big0.textContent = "一般_通常服";
        big0.value = BIG0;
        typeList.appendChild(big0);
    }
    if (dressInfo[dressID].Big_Cloth1) {
        flag_big1 = true;
        big1 = document.createElement("option");
        big1.textContent = "一般_演出服";
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
        dressType = typeList.value;
        console.log(dressType);
        testAndLoadAnimation();
    };

    testAndLoadAnimation();
}

function testAndLoadAnimation() {
    currentUUID = dressInfo[dressID].DressUUID;
    if(!app.loader.resources[`${currentUUID}/${dressType}`]) {
        app.loader.add(`${currentUUID}/${dressType}`, `https://static.shinycolors.moe/spines/${idolName}/${currentUUID}/${dressType}/data.json`).load(SetupAnimationList);
    }
    else {
        SetupAnimationList();
    }
}

function SetupAnimationList() {
    const animationList = $("#animationList")[0];
    //console.log(app.loader.resources[currentUUID]);
    currentSpine = new PIXI.spine.Spine(app.loader.resources[`${currentUUID}/${dressType}`].spineData);
    //const activeAnimation = currentSpine.state.tracks[0].animation.name;

    animationList.innerHTML = "";
    const animationName = "wait"

    for (let animation of currentSpine.stateData.skeletonData.animations) {
        const name = animation.name;
        const option = document.createElement("option");
        option.textContent = name;
        option.value = name;
        option.selected = name === "wait";
        animationList.appendChild(option);
    }

    animationList.onchange = () => {
        const animationName = animationList.value;

        renderToStage(animationName);
    };

    renderToStage(animationName);
}

function renderToStage(aName) {
    currentSpine.skeleton.setToSetupPose();
    currentSpine.update(0);
    currentSpine.autoUpdate = true;

    cont.removeChild(cont.children[0]);

    cont.addChild(currentSpine);

    const localRect = currentSpine.getLocalBounds();
    currentSpine.position.set(-localRect.x, -localRect.y);
    //console.log(cont);
    /*
    const scale = Math.min(
        app.screen.width * 0.8 / cont.width,
        app.screen.height * 0.8 / cont.height
    );
    */
    cont.scale.set(0.7);
    cont.position.set(
        (app.screen.width - cont.width) * 0.5,
        (app.screen.height - cont.height) * 0.5
    );

    // add the container to the stage

    currentSpine.state.setAnimation(0, aName, true);

    //app.start();
}

function onJsonLoaded(loader, resources) {
    idolInfo = JSON.parse(resources.IdolList.data)
    SetupUpdateLog(JSON.parse(resources.UpdateLog.data));
    SetupIdolList();
}

function onAssetLoaded(loader, resources) {
    //console.log(resources["IdolList"].data);
    currentSpine = new PIXI.spine.Spine(resources[UUID].spineData);
    currentSpine.skeleton.setToSetupPose();
    currentSpine.update(0);
    currentSpine.autoUpdate = true;

    const char1 = new PIXI.Container();
    char1.addChild(currentSpine);

    const localRect = currentSpine.getLocalBounds();
    currentSpine.position.set(-localRect.x, -localRect.y);

    const scale = Math.min(
        app.screen.width * 0.9 / char1.width,
        app.screen.height * 0.9 / char1.height
    );

    char1.scale.set(scale, scale);
    char1.position.set(
        (app.screen.width - char1.width) * 0.5,
        (app.screen.height - char1.height) * 0.5
    );

    // add the container to the stage
    app.stage.addChild(char1);

    currentSpine.state.setAnimation(0, 'wait', true);

    app.start();
}
