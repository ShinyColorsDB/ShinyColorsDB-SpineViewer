let lastFrameTime = Date.now() / 1000;
let canvas;
let shader;
let batcher;
let WebGL;
const mvp = new spine.webgl.Matrix4();
let assetManager;
let skeletonRenderer;
let shapes;

let pathJSON = null;
let pathAtlas = null;
let pathTexture = null;

let asset = null;

let assetType = "cb";
let assetID = "0000010010";
let idolDir;

let idolInfo = null, idolID = null, idolName = null;
let dressInfo = null, dressID = null, dressType = null;
const BIG0 = "big_cloth0", BIG1 = "big_cloth1", SML0 = "sml_cloth0", SML1 = "sml_cloth1";
//JSON.parse(localStorage.getItem("idolInfo"))
let assetInfo = {};

let backgroundColor = [0, 0, 0];

const dataURL = "https://static.shinycolors.moe/spines";

const $ = document.querySelectorAll.bind(document);

async function Init() {
    // Setup canvas and WebGL context. We pass alpha: false to canvas.getContext() so we don't use premultiplied alpha when
    // loading textures. That is handled separately by PolygonBatcher.
    canvas = $("canvas")[0];
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const config = { alpha: false };
    WebGL =
        canvas.getContext("webgl", config) ||
        canvas.getContext("experimental-webgl", config);
    if (!WebGL) {
        alert("WebGL");
        return;
    }

    mvp.ortho2d(0, 0, canvas.width - 1, canvas.height - 1);

    // Create a simple shader, mesh, model-view-projection matrix and SkeletonRenderer.
    skeletonRenderer = new spine.webgl.SkeletonRenderer(WebGL, false);
    assetManager = new spine.webgl.AssetManager(WebGL);
    batcher = new spine.webgl.PolygonBatcher(WebGL, false);
    shapes = new spine.webgl.ShapeRenderer(WebGL);
    shader = spine.webgl.Shader.newColoredTextured(WebGL);

    // 애셋 불러오기
    if (!idolInfo) {
        idolInfo = (await axios.get("https://api.shinycolors.moe/spines/idolList")).data;
        //console.log(idolInfo);
        localStorage.setItem("idolInfo", JSON.stringify(idolInfo));
    }
    //gameInfo = [{ id: 0, dir: "00-haduki", name: "七草はづき" }, { id: 1, dir: "01-mano", name: "櫻木真乃"}];
    //assetInfo = (await axios.get(dataURL + "/asset.json")).data;

    // 애셋 데이터 가공
    for (let key in assetInfo) {
        assetInfo[key] = assetInfo[key].map((id) => {
            const idArray = id.split("").map((item) => {
                return parseInt(item);
            });
            return {
                value: id,
                type: idArray.shift(),
                special_type: idArray.shift(),
                rarity: idArray.shift(),
                idol_id: parseInt(idArray.splice(0, 3).join("")),
                release_id: parseInt(idArray.splice(0, 3).join("")),
                other: idArray.shift()
            };
        });
    }

    // 배경 색상 선택기
    const colorPicker = document.querySelector("#color-picker");
    colorPicker.onchange = (event) => {
        backgroundColor = HexToRgb(event.target.value);
    };

    SetupIdolList();
    SetupDressList();
    SetupTypeList();

    LoadAsset();
}

function HexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? result.slice(1, 4).map((item) => {
            return parseInt(item, 16) / 255;
        })
        : null;
}

function DropHandler(event) {
    // Prevent default behavior (Prevent file from being opened)
    event.preventDefault();

    if (event.dataTransfer.items) {
        for (let item of event.dataTransfer.items) {
            if (item.kind === "file") {
                const file = item.getAsFile();
                const blobURL = window.URL.createObjectURL(file);
                if (file.name.endsWith(".atlas")) {
                    pathAtlas = blobURL;
                } else if (file.name.endsWith(".png")) {
                    pathTexture = blobURL;
                } else if (file.name.endsWith(".json")) {
                    pathJSON = blobURL;
                } else if (file.name.endsWith(".webp")) {
                    pathTexture = blobURL;
                }
            }
        }
    } else {
        for (let file of event.dataTransfer.files) {
            const blobURL = window.URL.createObjectURL(file);
            if (file.name.endsWith(".atlas")) {
                pathAtlas = blobURL;
            } else if (file.name.endsWith(".png")) {
                pathTexture = blobURL;
            } else if (file.name.endsWith(".json")) {
                pathJSON = blobURL;
            } else if (file.name.endsWith(".webp")) {
                pathTexture = blobURL;
            }
        }
    }

    if (pathAtlas && pathTexture && pathJSON) {
        requestAnimationFrame(LoadAsset);
    } else {
        const loadedFiles = [
            pathAtlas ? "Atlas" : null,
            pathTexture ? "이미지" : null,
            pathJSON ? "JSON" : null
        ]
            .filter((item) => item)
            .join(", ");

        alert(
            "3개의 파일 (data.json, data.atlas, data.png) 을 한꺼번에 드롭해주세요.\n현재 불러온 파일: " +
            loadedFiles
        );
        ClearDragStatus();
    }
}

function ClearDragStatus() {
    pathJSON = null;
    pathAtlas = null;
    pathTexture = null;
}

function DragOverHandler(event) {
    // Prevent default behavior (Prevent file from being opened)
    event.preventDefault();
}

function LoadAsset() {
    // Tell AssetManager to load the resources for each model, including the exported .json file, the .atlas file and the .png
    // file for the atlas. We then wait until all resources are loaded in the load() method.

    // 현재 파일을 null로 설정하여 렌더링 중단
    asset = null;

    // 메모리 관리를 위한 unload 작업
    assetManager.removeAll();

    const path = [dataURL, idolInfo[idolID].Directory, dressInfo[dressID].DressName, dressType, "data"].join("/");
    assetManager.loadText(pathJSON || path + ".json");
    assetManager.loadText(pathAtlas || path + ".atlas");
    assetManager.loadTexture(pathTexture || path + ".png");

    requestAnimationFrame(Load);
}

function Load() {
    // Wait until the AssetManager has loaded all resources, then load the skeletons.
    if (assetManager.isLoadingComplete()) {
        asset = LoadSpine("wait", false);

        SetupAnimationList();

        requestAnimationFrame(Render);
    } else {
        requestAnimationFrame(Load);
    }
}

function LoadSpine(initialAnimation, premultipliedAlpha) {
    // Load the texture atlas using name.atlas and name.png from the AssetManager.
    // The function passed to TextureAtlas is used to resolve relative paths.
    const fileArray = [dataURL, idolInfo[idolID].Directory, dressInfo[dressID].DressName, dressType, "data"];
    const filePath = fileArray.join("/");
    const subPath = fileArray.slice(0, 4).join("/");
    console.log(filePath);

    atlas = new spine.TextureAtlas(
        assetManager.get(pathAtlas || filePath + ".atlas"),
        (path) => {
            return assetManager.get(pathTexture || [subPath, path].join("/"));
        }
    );

    // Create a AtlasAttachmentLoader that resolves region, mesh, boundingbox and path attachments
    atlasLoader = new spine.AtlasAttachmentLoader(atlas);

    // Create a SkeletonJson instance for parsing the .json file.
    const skeletonJson = new spine.SkeletonJson(atlasLoader);

    // 불투명도 버그 수정
    const jsonData = JSON.parse(assetManager.get(pathJSON || filePath + ".json"));
    jsonData.slots.forEach((item) => {
        if (item.blend && item.name !== "eye_shadow_L") {
            delete item.blend;
        }
    });

    // Set the scale to apply during parsing, parse the file, and create a new skeleton.
    const skeletonData = skeletonJson.readSkeletonData(jsonData);
    const skeleton = new spine.Skeleton(skeletonData);
    try {
        skeleton.setSkinByName("normal"); // SD 일러스트 기본 스킨
    } catch (e) { }

    // Create an AnimationState, and set the initial animation in looping mode.
    animationStateData = new spine.AnimationStateData(skeleton.data);
    animationStateData.defaultMix = 0.3; // 애니메이션 사이를 부드럽게 전환. 값을 높일수록 느리게 전환됨
    const animationState = new spine.AnimationState(animationStateData);
    animationState.multipleMixing = true; // 여러 애니메이션의 믹싱을 활성화.

    // animationStateData.setMix("wait", "ok", 0.4);
    // animationStateData.setMix("jump", "run", 0.4);
    // animationState.setAnimation(0, "walk", true);
    // let jumpEntry = animationState.addAnimation(0, "jump", false, 3);
    // animationState.addAnimation(0, "run", true, 0);

    try {
        animationState.setAnimation(0, initialAnimation, true);
    } catch (e) {
        animationState.setAnimation(0, "talk_wait", true); // 하즈키 SD 관련 수정
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
                console.log(
                    "Event on track " + track.trackIndex + ": " + JSON.stringify(event)
                );
            }
        });
    }

    // Pack everything up and return to caller.
    return {
        skeleton: skeleton,
        state: animationState,
        stateData: animationStateData,
        bounds: CalculateBounds(skeleton),
        premultipliedAlpha: premultipliedAlpha
    };
}

let debug = false;

function CalculateBounds(skeleton) {
    skeleton.setToSetupPose();
    skeleton.updateWorldTransform();
    let offset = new spine.Vector2();
    let size = new spine.Vector2();
    skeleton.getBounds(offset, size, []);
    return { offset: offset, size: size };
}
/*
function SetupTypeList() {
    const typeList = $("#typeList")[0];
    const typeTextList = gameInfo.type;

    typeList.innerHTML = "";

    for (const type of Object.keys(assetInfo)) {
        const option = document.createElement("option");
        const typeText = _.find(typeTextList, { id: type }) || { name: "타입" };
        option.textContent = typeText.name;
        option.value = type;
        option.selected = type === assetType;
        typeList.appendChild(option);
    }

    typeList.onchange = () => {
        assetType = typeList.value;
        SetupIdolList();
        ClearDragStatus();
        requestAnimationFrame(LoadAsset);
    };

    const firstNode = $("#typeList option")[0];
    firstNode.selected = true;
    assetType = firstNode.value;
}
*/
function SetupIdolList() {
    const idolList = $("#idolList")[0];
    //console.log(idolList)
    //const idolTextList = gameInfo.idol;

    idolList.innerHTML = "";
/*
    for (const asset of assetInfo[assetType]) {
        const option = document.createElement("option");
        const idolText = _.find(idolTextList, { id: asset.idol_id }) || {
            name: "아이돌"
        };
        option.textContent = idolText.name.split(" ").pop();
        option.value = asset.value;
        idolList.appendChild(option);
    }
*/
    console.log(idolInfo);
    idolInfo.forEach(element => {
        const option = document.createElement("option");
        option.textContent = element.IdolName;
        option.value = element.IdolID;
        idolList.appendChild(option);
    });
    //return;
    idolList.onchange = () => {
        idolID = idolList.value;
        SetupDressList();
        SetupTypeList();
        ClearDragStatus();
        requestAnimationFrame(LoadAsset);
    };

    const firstNode = $("#idolList option")[0];
    firstNode.selected = true;
    idolID = firstNode.value;
}

async function SetupDressList() {
    const dressList = $("#dressList")[0];
    dressList.innerHTML = "";

    dressInfo = (await axios.get(`https://api.shinycolors.moe/spines/dressList/${idolID}`)).data;
    console.log(dressInfo);

    dressInfo.forEach((element, index) => {
        const option = document.createElement("option");
        option.textContent = element.DressName;
        option.value = index;
        dressList.appendChild(option);
    });

    dressList.onchange = () => {
        dressID = dressList.value;
        console.log(dressList.value);
        SetupTypeList();
        ClearDragStatus();
        requestAnimationFrame(LoadAsset);

    }

    dressID = 0;
}

function SetupTypeList() {
    const typeList = $("#typeList")[0];

    typeList.innerHTML = "";

    let big0, big1, sml0, sml1;
    let flag0 = false, flag1 = false;
    if (dressInfo[dressID].Dress0) {
        big0 = document.createElement("option");
        big0.textContent = "一般_通常服";
        big0.value = BIG0;

        sml0 = document.createElement("option");
        sml0.textContent = "Q版_通常服";
        sml0.value = SML0;
        flag0 = true;
    }
    if (dressInfo[dressID].Dress1) {
        big1 = document.createElement("option");
        big1.textContent = "一般_演出服";
        big1.value = BIG1;

        sml1 = document.createElement("option");
        sml1.textContent = "Q版_演出服";
        sml1.value = SML1;
        flag1 = true;
    }

    if (flag0 && flag1) {
        dressType = SML0;
        typeList.appendChild(sml0);
        typeList.appendChild(sml1);
        typeList.appendChild(big0);
        typeList.appendChild(big1);
    }
    else if (flag0 && !flag1) {
        dressType = BIG0;
        typeList.appendChild(sml0);
        typeList.appendChild(big0);
    }
    else if (!flag0 && flag1) {
        dressType = BIG1;
        typeList.appendChild(sml1);
        typeList.appendChild(big1);
    }

    typeList.onchange = () => {
        dressType = typeList.value;
        ClearDragStatus();
        requestAnimationFrame(LoadAsset);
    }

    SetupAnimationList();
    //console.log(dressInfo[dressID]);
}

function SetupAnimationList() {
    const animationList = $("#animationList")[0];
    const skeleton = asset.skeleton;
    const state = asset.state;
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
        const state = asset.state;
        const skeleton = asset.skeleton;
        const animationName = animationList.value;
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
    if (asset) {
        asset.state.clearTrack(1);
        asset.state.clearTrack(2);
        asset.state.clearTrack(3);
    }
}

function SetupSkinList() {
    const skinList = $("#skinList")[0];
    const skeleton = asset.skeleton;
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
        const skeleton = asset.skeleton;
        const skinName = skinList.value;
        skeleton.setSkinByName(skinName);
        skeleton.setSlotsToSetupPose();
    };
}

function Render() {
    let now = Date.now() / 1000;
    let delta = now - lastFrameTime;
    lastFrameTime = now;

    // 배경 그리기
    WebGL.clearColor(...backgroundColor, 1);
    WebGL.clear(WebGL.COLOR_BUFFER_BIT);

    // 애셋이 없으면 여기서 마무리
    if (asset === null) {
        return;
    }

    // Update the MVP matrix to adjust for canvas size changes
    Resize();

    // Apply the animation state based on the delta time.
    let state = asset.state;
    let skeleton = asset.skeleton;
    let premultipliedAlpha = asset.premultipliedAlpha;
    state.update(delta);
    state.apply(skeleton);
    skeleton.updateWorldTransform();

    // Bind the shader and set the texture and model-view-projection matrix.
    shader.bind();
    shader.setUniformi(spine.webgl.Shader.SAMPLER, 0);
    shader.setUniform4x4f(spine.webgl.Shader.MVP_MATRIX, mvp.values);

    // Start the batch and tell the SkeletonRenderer to render the active skeleton.
    batcher.begin(shader);
    skeletonRenderer.premultipliedAlpha = premultipliedAlpha;
    skeletonRenderer.draw(batcher, skeleton);
    batcher.end();
    shader.unbind();

    requestAnimationFrame(Render);
}

function Resize() {
    let w = canvas.clientWidth;
    let h = canvas.clientHeight;
    let bounds = asset.bounds;
    if (canvas.width != w || canvas.height != h) {
        canvas.width = w;
        canvas.height = h;
    }

    // magic
    let centerX = bounds.offset.x + bounds.size.x / 2;
    let centerY = bounds.offset.y + bounds.size.y / 2;
    let scaleX = bounds.size.x / canvas.width;
    let scaleY = bounds.size.y / canvas.height;
    let scale = Math.max(scaleX, scaleY) * 1.2;
    if (scale < 1) scale = 1;
    let width = canvas.width * scale;
    let height = canvas.height * scale;

    mvp.ortho2d(centerX - width / 2, centerY - height / 2, width, height);
    WebGL.viewport(0, 0, canvas.width, canvas.height);
}

Init();
