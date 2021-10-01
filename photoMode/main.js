let lastFrameTime = Date.now() / 1000;
let WebGL, canvas;
const mvp = new spine.webgl.Matrix4();
let spineObject = new Array();

const e = "https://static.shinycolors.moe/spines/mei/04fd22ed-d080-4f46-914d-40d58a72f600/big_cloth1/data";
const exp = "https://static.shinycolors.moe/spines/asahi/8d0ce50a-8ac1-43fa-855d-3331decf9583/big_cloth1/data";
const exp2 = "https://static.shinycolors.moe/spines/fuyuko/c203ce95-86c3-446e-80a0-600fe49cd5eb/big_cloth1/data";

let asset = new Array();
let link = [e, exp, exp2],
    cardName = ["【シャッターチャンス！？】和泉愛依", "【不機嫌なテーマパーク】芹沢あさひ", "【starring F】黛冬優子"];

let dressMap = new Map(), dressTypes = new Array();

let idolInfo = null,
    idolID = null,
    idolName = null;
let dressInfo = null,
    dressID = null,
    dressType = null;

let cn = null;

let currentEdit = null;

const BIG0 = "big_cloth0",
    BIG1 = "big_cloth1",
    SML0 = "sml_cloth0",
    SML1 = "sml_cloth1";

let backgroundColor = [0, 0, 0];

const dataURL = "https://static.shinycolors.moe/spines";

const $ = document.querySelectorAll.bind(document);

async function Init() {
    UpdateLog();

    document.getElementById("iptShiftX").placeholder = `X座標、推奨±${Math.round(window.innerWidth / 2 / 100) * 100}`;
    document.getElementById("iptShiftY").placeholder = `Y座標、推奨±${Math.round(window.innerHeight / 2 / 100) * 100}`;
    document.getElementById("iptEditX").placeholder = `X座標、推奨±${Math.round(window.innerWidth / 2 / 100) * 100}`;
    document.getElementById("iptEditY").placeholder = `Y座標、推奨±${Math.round(window.innerHeight / 2 / 100) * 100}`;
    // Setup canvas and WebGL context. We pass alpha: false to canvas.getContext() so we don't use premultiplied alpha when
    // loading textures. That is handled separately by PolygonBatcher.
    canvas = document.getElementById("big_canvas");

    const config = { alpha: false };
    WebGL = canvas.getContext("webgl", config) || canvas.getContext("experimental-webgl", config);
    if (!WebGL) {
        alert("WebGL");
        return;
    }
    mvp.ortho2d(0, 0, canvas.width - 1, canvas.height - 1);

    // Create a simple shader, mesh, model-view-projection matrix and SkeletonRenderer.
    let g = -400;
    for (let k = 0; k < link.length; k++) {
        CreateNewObject(link[k], cardName[k], g);
        g += 400;
    }

    if (!idolInfo) {
        idolInfo = (await axios.get("https://api.shinycolors.moe/spines/idolList")).data;
        //console.log(idolInfo);
        localStorage.setItem("idolInfo", JSON.stringify(idolInfo));
    }

    const colorPicker = document.querySelector("#color-picker");
    colorPicker.onchange = (event) => {
        backgroundColor = HexToRgb(event.target.value);
    };
    BuildActiveList();

    SetupIdolList();
    SetupDressList();
    SetupTypeList();

    LoadAsset();
}

async function UpdateLog() {
    let modal = document.getElementById("divModalBody");
    let updateInfo = (await axios.get("https://api.shinycolors.moe/spines/updateLog")).data;
    updateInfo.forEach(element => {
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

function HexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ?
        result.slice(1, 4).map((item) => {
            return parseInt(item, 16) / 255;
        }) :
        null;
}

function LoadAsset() {
    // Tell AssetManager to load the resources for each model, including the exported .json file, the .atlas file and the .png
    // file for the atlas. We then wait until all resources are loaded in the load() method.

    for (let z of spineObject) {
        z.asset = null;
        z.assetManager.removeAll();
        z.assetManager.loadText(z.link + ".json");
        z.assetManager.loadText(z.link + ".atlas");
        z.assetManager.loadTexture(z.link + ".png");
    }

    requestAnimationFrame(Load);
}

function LoadingComplete() {
    for (let z of spineObject) {
        if (!z.assetManager.isLoadingComplete()) return false;
    }
    return true;
}

function Load() {
    // Wait until the AssetManager has loaded all resources, then load the skeletons.
    if (!LoadingComplete()) {
        requestAnimationFrame(Load);
    }
    else {
        //for (let k = 0; k < spineObject.length; k++) {
        //    spineObject[k].asset = LoadSpine("wait", false, spineObject[k].link, k)
        //}
        for (let z of spineObject) {
            z.asset = LoadSpine("wait", false, z);
        }
        SetupAnimationList();

        requestAnimationFrame(Render);
    }
}

function LoadSpine(initialAnimation, premultipliedAlpha, z) {
    // Load the texture atlas using name.atlas and name.png from the AssetManager.
    // The function passed to TextureAtlas is used to resolve relative paths.
    //const fileArray = [dataURL, idolInfo[idolID].Directory, dressInfo[dressID].DressName, dressType, "data"];
    console.log("In LoadSpine", z.link);

    let atlas = new spine.TextureAtlas(z.assetManager.get(z.link + ".atlas"), (path) => {
        return z.assetManager.get(z.link + ".png");
    });

    // Create a AtlasAttachmentLoader that resolves region, mesh, boundingbox and path attachments
    let atlasLoader = new spine.AtlasAttachmentLoader(atlas);

    // Create a SkeletonJson instance for parsing the .json file.
    const skeletonJson = new spine.SkeletonJson(atlasLoader);

    // 
    const jsonData = JSON.parse(z.assetManager.get(z.link + ".json"));
    jsonData.slots.forEach((item) => {
        if (item.blend && item.name !== "eye_shadow_L") {
            delete item.blend;
        }
    });

    // Set the scale to apply during parsing, parse the file, and create a new skeleton.
    const skeletonData = skeletonJson.readSkeletonData(jsonData);
    const skeleton = new spine.Skeleton(skeletonData);
    try {
        skeleton.setSkinByName("normal");
    } catch (e) { }

    // Create an AnimationState, and set the initial animation in looping mode.
    animationStateData = new spine.AnimationStateData(skeleton.data);
    animationStateData.defaultMix = 0.3;
    const animationState = new spine.AnimationState(animationStateData);
    animationState.multipleMixing = true;

    try {
        animationState.setAnimation(0, initialAnimation, true);
    } catch (e) {
        animationState.setAnimation(0, Object.keys(jsonData.animations)[0], true); // 하즈키 SD 관련 수정
    }

    if (debug) {
        animationState.addListener({
            start: function (track) {
                console.log("Animation on track " + track.trackIndex + " started");
            },
            interrupt: function (track) {
                console.log("Animation on track " + track.trackIndex + " interrupted");
            },
            end: function (track) {
                console.log("Animation on track " + track.trackIndex + " ended");
            },
            disposed: function (track) {
                console.log("Animation on track " + track.trackIndex + " disposed");
            },
            complete: function (track) {
                console.log("Animation on track " + track.trackIndex + " completed");
            },
            event: function (track, event) {
                console.log("Event on track " + track.trackIndex + ": " + JSON.stringify(event));
            },
        });
    }

    // Pack everything up and return to caller.
    return {
        skeleton: skeleton,
        state: animationState,
        stateData: animationStateData,
        bounds: CalculateBounds(skeleton),
        premultipliedAlpha: premultipliedAlpha,
    };
}

let debug = false;

function CalculateBounds(skeleton) {
    skeleton.setToSetupPose();
    skeleton.updateWorldTransform();
    let offset = new spine.Vector2();
    let size = new spine.Vector2();
    skeleton.getBounds(offset, size, []);
    //console.log(offset, size)
    return { offset: offset, size: size };
}

function SetupIdolList() {
    const idolList = $("#idolList")[0];
    //console.log(idolList)
    //const idolTextList = gameInfo.idol;

    idolList.innerHTML = "";

    console.log(idolInfo);
    idolInfo.forEach((element, index) => {
        const option = document.createElement("option");
        option.textContent = element.IdolName;
        option.value = element.IdolID;
        if (index == 1) option.selected = true;
        idolList.appendChild(option);
    });
    idolID = 1;
    //return;
    idolList.onchange = () => {
        idolID = idolList.value;
        SetupDressList();
        SetupTypeList();
    };
}

async function SetupDressList() {
    const dressList = $("#dressList")[0];
    dressList.innerHTML = "";


    dressTypes = new Array();
    dressMap.clear();

    dressInfo = (await axios.get(`https://api.shinycolors.moe/spines/dressList/${idolID}`)).data;
    //console.log(dressInfo);
    let flag = false;
    cn = dressInfo[0].DressName;
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

    dressList.onchange = () => {
        dressID = dressList.value;
        cn = dressList.options[dressList.selectedIndex].text;
        console.log(dressList.value);
        SetupTypeList();
    };

    SetupTypeList();
    LoadAsset();
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
    };
}

function SetupAnimationList() {
    const animationList = $("#animationList")[0];
    const skeleton = spineObject[0].asset.skeleton;
    const state = spineObject[0].asset.state;
    const activeAnimation = state.tracks[0].animation.name;

    animationList.innerHTML = "";

    for (let animation of skeleton.data.animations) {
        const name = animation.name;
        const option = document.createElement("option");
        option.textContent = name;
        option.value = name;
        option.selected = name === activeAnimation;
        animationList.appendChild(option);
    }

    animationList.onchange = () => {
        const state = asset[0].state;
        const skeleton = asset[0].skeleton;
        const animationName = animationList.value;
        ClearTrack();
        skeleton.setToSetupPose();

        let trackIndex = 0;
        let isLoop = true;

        if (animationName.startsWith("eye")) {
            trackIndex = 1;
        } else if (animationName.startsWith("face")) {
            trackIndex = 2;
        } else if (animationName.startsWith("lip")) {
            trackIndex = 3;
        } else if (animationName.startsWith("arm")) {
            isLoop = false;
        }

        state.setAnimation(trackIndex, animationName, isLoop);
    };
}

function ClearTrack() {
    if (spineObject[0].asset) {
        spineObject[0].asset.state.clearTrack(1);
        spineObject[0].asset.state.clearTrack(2);
        spineObject[0].asset.state.clearTrack(3);
    }
}

function SetupSkinList() {
    const skinList = $("#skinList")[0];
    const skeleton = spineObject[0].asset.skeleton;
    const activeSkin = skeleton.skin == null ? "default" : skeleton.skin.name;

    skinList.innerHTML = "";

    for (let skin of skeleton.data.skins) {
        const name = skin.name;
        const option = document.createElement("option");
        option.textContent = name;
        option.value = name;
        option.selected = name === activeSkin;
        skinList.appendChild(option);
    }

    skinList.onchange = () => {
        const skeleton = spineObject[0].asset.skeleton;
        const skinName = skinList.value;
        skeleton.setSkinByName(skinName);
        skeleton.setSlotsToSetupPose();
    };
}

function Render() {
    //console.log(index)
    let now = Date.now() / 1000;
    let delta = now - lastFrameTime;
    lastFrameTime = now;

    WebGL.clearColor(...backgroundColor, 1);
    WebGL.clear(WebGL.COLOR_BUFFER_BIT);
    for (let z of spineObject) {
        if (z.asset === null) {
            return;
        }

        // Update the MVP matrix to adjust for canvas size changes
        Resize(z);
        // Apply the animation state based on the delta time.
        let state = z.asset.state;
        let skeleton = z.asset.skeleton;
        let premultipliedAlpha = z.asset.premultipliedAlpha;
        state.update(delta);
        state.apply(skeleton);
        skeleton.updateWorldTransform();

        // Bind the shader and set the texture and model-view-projection matrix.
        z.shader.bind();
        z.shader.setUniformi(spine.webgl.Shader.SAMPLER, 0);
        z.shader.setUniform4x4f(spine.webgl.Shader.MVP_MATRIX, mvp.values);

        // Start the batch and tell the SkeletonRenderer to render the active skeleton.
        z.batcher.begin(z.shader);
        z.skeletonRenderer.premultipliedAlpha = premultipliedAlpha;
        z.skeletonRenderer.draw(z.batcher, skeleton);
        z.batcher.end();
        z.shader.unbind();
    }

    requestAnimationFrame(Render);
}

function Resize(e) {
    let w = canvas.clientWidth;
    let h = canvas.clientHeight;
    let bounds = e.asset.bounds;
    if (canvas.width != w || canvas.height != h) {
        canvas.width = w;
        canvas.height = h;
    }

    // magic
    //let centerX = bounds.offset.x + bounds.size.x / 2;
    let centerX = (bounds.offset.x + bounds.size.x / 2) - e.shiftX;
    let centerY = (bounds.offset.y + bounds.size.y / 2) - e.shiftY;
    let scaleX = bounds.size.x / canvas.width;
    let scaleY = bounds.size.y / canvas.height;
    let scale = Math.max(scaleX, scaleY) / e.scale;
    if (scale < 1) scale = 1;
    let width = canvas.width * scale;  // higher the scale, bigger the character
    let height = canvas.height * scale;
    mvp.ortho2d(centerX - width / 2, centerY - height / 2, width, height);  // change centerX to change render location
    WebGL.viewport(0, 0, canvas.width, canvas.height);
}

function AddToActiveList() {
    let newPath = [dataURL, idolInfo[idolID].Directory, dressInfo[dressID].DressUUID, dressType, "data"].join("/");
    let shiftX = Number(document.getElementById("iptShiftX").value),
        shiftY = Number(document.getElementById("iptShiftY").value),
        scale = Number(document.getElementById("iptScale").value);

    scale = scale == 0 ? 0.8 : scale;
    if (isNaN(shiftX) || isNaN(shiftY) || isNaN(scale)) {
        alert("Please Input Numbers.");
    }

    document.getElementById("iptShiftX").value = '';
    document.getElementById("iptShiftY").value = '';
    document.getElementById("iptScale").value = 0.8;

    CreateNewObject(newPath, cn, shiftX, shiftY, scale);
    BuildActiveList();

    LoadAsset();
}
//<a href="javascript:void(0)"><span class="badge badge-pill badge-primary ml-2">&times;</span></a>
function CreateNewObject(spineLink, nm, x = 0, y = 0, scale = 0.8) {
    spineObject.push({
        name: nm,
        link: spineLink,
        skeletonRenderer: new spine.webgl.SkeletonRenderer(WebGL, false),
        assetManager: new spine.webgl.AssetManager(WebGL),
        asset: null,
        batcher: new spine.webgl.PolygonBatcher(WebGL, false),
        shader: spine.webgl.Shader.newColoredTextured(WebGL),
        shiftX: x,
        shiftY: y,
        scale: scale
    });
}

function DeleteSpineObject(e) {
    spineObject = spineObject.filter((element, index) => {
        return index != e ? element : false;
    });
    BuildActiveList();
}

function BuildActiveList() {
    const spineList = document.getElementById("activeSpine");
    spineList.innerHTML = "";

    for (let k in spineObject) {
        CreateActiveListElement(spineList, k);
    }
}

function EditShift(e) {
    currentEdit = e;
    document.getElementById("iptEditX").value = spineObject[e].shiftX;
    document.getElementById("iptEditY").value = spineObject[e].shiftY;
    document.getElementById("iptEditScale").value = spineObject[e].scale;
}

function ConfirmEdit() {
    if (currentEdit == null) return;

    let sftX = Number(document.getElementById("iptEditX").value),
        sftY = Number(document.getElementById("iptEditY").value),
        scal = Number(document.getElementById("iptEditScale").value);

    if (isNaN(sftX) || isNaN(sftY) || isNaN(scal)) return;

    spineObject[currentEdit].shiftX = sftX;
    spineObject[currentEdit].shiftY = sftY;
    spineObject[currentEdit].scale = scal;
    currentEdit = null;
}

function CreateActiveListElement(list, k) {
    const li = document.createElement("li");
    li.classList.add("dropdown-item", "ps-2", "pe-1", "btn");

    const button1 = document.createElement("button");
    button1.classList.add("btn", "text-light");
    button1.appendChild(document.createTextNode(spineObject[k].name));
    button1.setAttribute("data-bs-toggle", "modal");
    button1.setAttribute("data-bs-target", "#divEditCoord");
    button1.onclick = function () {
        EditShift(k);
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