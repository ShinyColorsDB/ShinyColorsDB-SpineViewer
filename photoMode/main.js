'use strict';
let app, canvas;
const apiLoader = new PIXI.Loader(), cont = new PIXI.Container();
const SML0 = "sml_cloth0", SML1 = "sml_cloth1", BIG0 = "big_cloth0", BIG1 = "big_cloth1";

let spineMap = new Map(), activeSpine = new Array();

class SpineObject {
    constructor(spinePath, spineName) {
        this.spinePath = spinePath;
        this.spineName = spineName;
        this.stageObj = null;
    }

    setScale(scale) {
        this.scale = scale;
        this.stageObj.scale.set(scale);
    }

    storePosition(x, y) {
        this.positionX = x;
        this.positionY = y;
    }

    setPosition() {
        //this.stageObj.position.set(-this.positionX, -this.positionY);
        this.stageObj.position.set(
            (app.screen.width / 2) + this.positionX,
            (app.screen.height / 2) + this.positionY + 30
            //(app.screen.height /2 ) - this.stageObj.spineData.height + this.positionY
        );
    }

    storeAnimation(animationName) {
        this.animationName = animationName;
    }

    setAnimation() {
        this.stageObj.state.setAnimation(0, this.animationName, true);
    }

    /**
     * @param {any} obj
     */
    set setSpineObj(obj) {
        this.stageObj = obj;
    }

    get getSpineObj() {
        return this.stageObj;
    }
}

function Init() {
    let offcanvasElementList = [].slice.call(document.querySelectorAll('.offcanvas'));
    let offcanvasList = offcanvasElementList.map(function (offcanvasEl) {
        return new bootstrap.Offcanvas(offcanvasEl)
    });

    canvas = document.getElementById("bigCanvas");

    app = new PIXI.Application({
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        view: canvas
    });
    app.stage.addChild(cont);

    apiLoader
        .add("IdolList", "https://api.shinycolors.moe/spines/IdolList")
        .add("UpdateLog", "https://api.shinycolors.moe/spines/UpdateLog")
        .add("Version", "https://api.shinycolors.moe/spines/Version")
        .load(OnJsonLoaded);

    CreateDefault();
    /*
    let myGraph = new PIXI.Graphics();
    app.stage.addChild(myGraph);

    // Move it to the beginning of the line
    myGraph.position.set(app.stage.width / 2, 0);
    myGraph.beginFill(0xFFFF00);
    myGraph.lineStyle(5, 0x2596be);
    myGraph.drawRect(canvas.clientWidth / 2, 0, 5, canvas.clientHeight);

    let myGraph2 = new PIXI.Graphics();
    app.stage.addChild(myGraph2);

    // Move it to the beginning of the line
    myGraph2.position.set(0, app.stage.width / 2);
    myGraph2.beginFill(0xFFFF00);
    myGraph2.lineStyle(5, 0x2596be);
    myGraph2.drawRect(0, canvas.clientHeight / 2 + 200, canvas.clientWidth, 5);
    */
    const colorPicker = document.getElementById("colorPicker");
    colorPicker.onchange = (event) => {
        app.renderer.backgroundColor = String(event.target.value).replace(/#/, '0X');
    };

}

function CreateDefault() {
    app.loader.add(`04fd22ed-d080-4f46-914d-40d58a72f600/big_cloth1`, `https://static.shinycolors.moe/spines/04fd22ed-d080-4f46-914d-40d58a72f600/big_cloth1/data.json`)
        .add(`8d0ce50a-8ac1-43fa-855d-3331decf9583/big_cloth1`, `https://static.shinycolors.moe/spines/8d0ce50a-8ac1-43fa-855d-3331decf9583/big_cloth1/data.json`)
        .add(`c203ce95-86c3-446e-80a0-600fe49cd5eb/big_cloth1`, `https://static.shinycolors.moe/spines/c203ce95-86c3-446e-80a0-600fe49cd5eb/big_cloth1/data.json`)
        .load(function () {
            TestAndGenerateObject("04fd22ed-d080-4f46-914d-40d58a72f600/big_cloth1", "【シャッターチャンス！？】和泉愛依", 400, 0, 0.8, "wait");
            TestAndGenerateObject("8d0ce50a-8ac1-43fa-855d-3331decf9583/big_cloth1", "【不機嫌なテーマパーク】芹沢あさひ", 0, 0, 0.8, "wait");
            TestAndGenerateObject("c203ce95-86c3-446e-80a0-600fe49cd5eb/big_cloth1", "【starring F】黛冬優子", -400, 0, 0.8, "wait");
            GenerateActiveList();
        });
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

        modal.appendChild(divTitle.appendChild(document.createTextNode(element.Date)));
        modal.appendChild(divContent);
    });
    document.getElementById('showLog').click();
}

function OnJsonLoaded(loader, resources) {
    SetupUpdateLog(JSON.parse(resources.UpdateLog.data));
    SetupIdolList(JSON.parse(resources.IdolList.data));
}

function SetupIdolList(idolInfo) {
    const idolList = document.getElementById("idolList");

    idolList.innerHTML = "";

    idolInfo.forEach((element, index) => {
        const option = document.createElement("option");
        option.textContent = element.IdolName;
        option.setAttribute("value", element.IdolID);
        option.setAttribute("idolName", element.Directory);
        if (index == 1) option.selected = true;
        idolList.appendChild(option);
    });
    let idolName = idolInfo[1].Directory;
    idolList.onchange = () => {
        idolName = idolInfo[idolList.value].Directory;
        TestAndLoadDressList(idolList.value, idolName);
    };

    TestAndLoadDressList(1, idolName);
}

function TestAndLoadDressList(idolID, idolName) {
    console.log("TestAndLoadDressList");
    if (!apiLoader.resources[idolName]) {
        apiLoader.add(idolName, `https://api.shinycolors.moe/spines/dressList/${idolID}`)
            .load(function() {
                SetupDressList(idolName);
            });
    }
    else {
        SetupDressList(idolName);
    }
}

function SetupDressList(idolName) {
    console.log("SetupDressList");
    const dressList = document.getElementById("dressList");
    dressList.innerHTML = "";

    let lastType = "P_SSR", optGroup = document.createElement('optgroup');
    optGroup.label = "P_SSR";

    if (!apiLoader.resources[idolName].data) return;

    const dressInfo = JSON.parse(apiLoader.resources[idolName].data);

    dressInfo.forEach((element, index) => {
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
    let dressID = 0;
    dressList.onchange = () => {
        dressID = dressList.value;
        SetupTypeList(dressInfo, dressID);
    };

    SetupTypeList(dressInfo, dressID);
}

function SetupTypeList(dressInfo, dressID) {
    const typeList = document.getElementById("typeList");

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

    let dressType = null;

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

    TestAndLoadAnimation();
}

function TestAndLoadAnimation() {
    console.log("TestAndLoadAnimation");
    const idolName = document.getElementById("idolList").options[document.getElementById("idolList").selectedIndex].getAttribute("idolName"), 
        dressUUID = document.getElementById("dressList").options[document.getElementById("dressList").selectedIndex].getAttribute("dressUUID"),
        dressType = document.getElementById("typeList").value;

    if (!app.loader.resources[`${dressUUID}/${dressType}`]) {
        app.loader.add(`${dressUUID}/${dressType}`, `https://static.shinycolors.moe/spines/${dressUUID}/${dressType}/data.json`)
            .load(function() {
                SetupAnimationList(app.loader.resources[`${dressUUID}/${dressType}`].data.animations);
            });
    }
    else {
        SetupAnimationList(app.loader.resources[`${dressUUID}/${dressType}`].data.animations);
    }

}

function SetupAnimationList(animations) {
    console.log("SetupAnimationList");
    const iptAnimation = document.getElementById("iptAnimation");
        //iptEditAnimation = document.getElementById("iptEditAnimation");

    iptAnimation.innerHTML = "";
    //iptEditAnimation.innerHTML = "";

    Object.keys(animations).forEach((element) => {
        let option = document.createElement("option");
        option.textContent = element;
        option.value = element;
        option.selected = element === "wait" ? true : false;
        iptAnimation.appendChild(option);
    });

}

function AddToActiveList() {
    const idolName = document.getElementById("idolList").getAttribute("idolName"), 
        dressUUID = document.getElementById("dressList").options[document.getElementById("dressList").selectedIndex].getAttribute("dressUUID"),
        dressName = document.getElementById("dressList").options[document.getElementById("dressList").selectedIndex].textContent,
        dressType = document.getElementById("typeList").value;

    const positionX = document.getElementById("iptShiftX").value ? document.getElementById("iptShiftX").value : 0,
        positionY = document.getElementById("iptShiftY").value ? document.getElementById("iptShiftY").value : 0,
        spineScale = document.getElementById("iptScale").value ? document.getElementById("iptScale").value : 0.8,
        animation = document.getElementById("iptAnimation").value;
    //console.log(idolName, dressUUID, dressName, dressType, positionX, positionY, spineScale, animation);

    if (!app.loader.resources[`${dressUUID}/${dressType}`]) {
        app.loader.add(`${dressUUID}/${dressType}`, `https://static.shinycolors.moe/spines/${dressUUID}/${dressType}/data.json`)
        .load(function() {
            TestAndGenerateObject(`${dressUUID}/${dressType}`, dressName, Number(positionX), Number(positionY), Number(spineScale), animation);
        });
    }
    else {
        TestAndGenerateObject(`${dressUUID}/${dressType}`, dressName, Number(positionX), Number(positionY), Number(spineScale), animation);
    }

}

function TestAndGenerateObject(spinePath, spineName, positionX, positionY, spineScale, animationName) {
    let thisSpineObj;
    if (spineMap.has(spineName)) {
        thisSpineObj = spineMap.get(spineName);
    }
    else {
        thisSpineObj = new SpineObject(spinePath, spineName);
        thisSpineObj.stageObj = new PIXI.spine.Spine(app.loader.resources[spinePath].spineData);

        spineMap.set(spineName, thisSpineObj);
    }

    thisSpineObj.setScale(spineScale);
    thisSpineObj.storePosition(positionX, positionY);

    thisSpineObj.storeAnimation(animationName);
    thisSpineObj.setAnimation();

    RenderToStage(thisSpineObj);
}

function RenderToStage(sObj) {
    console.log("RenderToStage");
    try {
        sObj.stageObj.skeleton.setSkinByName('normal');
    } catch (e) {
        sObj.stageObj.skeleton.setSkinByName('default');
    }

    sObj.stageObj.skeleton.setToSetupPose();
    sObj.stageObj.update(0);
    sObj.stageObj.autoUpdate = true;

    cont.addChild(sObj.stageObj);

    const localRect = sObj.stageObj.getLocalBounds();
    sObj.setPosition();

    activeSpine.push(sObj.spineName);
    GenerateActiveList();
}

function GenerateActiveList() {
    console.log("GenerateActiveList");
    const spineList = document.getElementById("activeSpine");
    spineList.innerHTML = "";

    for (let k in activeSpine) {
        CreateActiveListElement(spineList, k);
    }
}

function CreateActiveListElement(list, k) {
    console.log("CreateActiveListElement");
    const li = document.createElement("li");
    li.classList.add("dropdown-item", "ps-2", "pe-1", "btn");

    const button1 = document.createElement("button");
    button1.classList.add("btn", "text-light");
    button1.appendChild(document.createTextNode(activeSpine[k]));
    button1.setAttribute("data-bs-toggle", "modal");
    button1.setAttribute("data-bs-target", "#divEditCoord");
    button1.onclick = function () {
        //EditShift(k);
    }
    li.appendChild(button1);

    const button2 = document.createElement("button");
    button2.onclick = function () {
        DeleteSpineObject(k);
    }
    button2.classList.add("btn");

    const span = document.createElement("span");
    span.classList.add("badge", "badge-pill", "badge-primary", "ml-2");
    span.innerHTML = "&times;";

    button2.appendChild(span);
    li.appendChild(button2);
    list.appendChild(li);
}

function DeleteSpineObject(e) {
    console.log("DeleteSpineObject");
    console.log(e, activeSpine[e]);
    activeSpine = activeSpine.filter((element, index) => {
        return index != e ? element : false;
    });
    cont.removeChild(cont.children[e]);
    GenerateActiveList();
}
