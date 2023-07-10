import * as fgui from 'fairygui-ccc370';
import { VertAlignType, AlignType, GObjectPool, GComponent, GLoader, LoaderFillType, GGraph } from 'fairygui-ccc370';
import { isNull, PoolModule, getEnumName, className, arrayRemoveAll, Shake2DModule, deepClone, notNull, removeNullKeys } from 'gnfun';
import { UITransform, Widget, Vec2, find, tween, Tween, Color } from 'cc';
import { SysBase, KitBase } from 'coolgame-cc';
import TimeSys from 'coolgame-cc-sys-time';
import { XTween } from 'gnfun-cc';

let gid = 0;
class BoneAnim {
    get lod3d() {
        return this._lod3d;
    }
    get skeleton() {
        return this._lod3d.content;
    }
    constructor(lod3d, owner) {
        this._lod3d = lod3d;
        this._owner = owner;
        this._ignoreAutoIdle = false;
        this._timeSys = owner.dlgkit.timeSys;
        this._onLastAnimComplete = null;
    }
    config(option) {
        var _a;
        const vAlign = (!option.vAlign || option.vAlign == "m") ? VertAlignType.Middle :
            (option.vAlign == "b" ? VertAlignType.Bottom : VertAlignType.Top);
        const align = (!option.align || option.align == "c") ? AlignType.Center :
            (option.align == "l" ? AlignType.Left : AlignType.Right);
        this._idleAnim = option.idleAnim;
        if (this._onLastAnimComplete) {
            this._ignoreAutoIdle = true;
            this._onLastAnimComplete();
            this._ignoreAutoIdle = false;
            this._lod3d.animationName = null;
        }
        this._lod3d.verticalAlign = vAlign;
        this._lod3d.align = align;
        this._lod3d.url = this._owner.dlgkit.fuiSys.toUrl(option.model, (_a = option.package) !== null && _a !== void 0 ? _a : "Main");
        this.playAnim(option.idleAnim, true);
    }
    playAnim(anim, loop, onComplete, thisArg, option) {
        var _a, _b;
        const autoIdle = (_a = option === null || option === void 0 ? void 0 : option.autoIdle) !== null && _a !== void 0 ? _a : true;
        const skeleton = this.skeleton;
        let timeScale = (_b = option === null || option === void 0 ? void 0 : option.timeScale) !== null && _b !== void 0 ? _b : 1;
        const id = gid++;
        if (this._onLastAnimComplete) {
            this._ignoreAutoIdle = true;
            this._onLastAnimComplete();
            this._ignoreAutoIdle = false;
            this._lod3d.animationName = null;
        }
        this._lod3d.loop = loop;
        this._lod3d.animationName = anim;
        console.log(`[BoneAnim]${id} anim (${anim}) play...`);
        this._timeSys.nextFrame(() => {
            if (this._owner.isClosed)
                return;
            if (!loop) {
                console.log(`[BoneAnim]${id} anim (${anim}) play..`);
                skeleton.timeScale = timeScale;
                const track = skeleton.getCurrent(0);
                const dealTrackDone = () => {
                    console.log(`[BoneAnim]${id} anim (${anim}) play over, autoIdle? ` + autoIdle);
                    if (!this._owner.isClosed) {
                        if (autoIdle && !this._ignoreAutoIdle) {
                            this._lod3d.loop = true;
                            this._lod3d.animationName = this._idleAnim;
                        }
                        skeleton.timeScale = 1;
                        onComplete === null || onComplete === void 0 ? void 0 : onComplete.apply(thisArg);
                    }
                };
                if (track) {
                    let timer = -1;
                    let onLastAnimComplete = () => {
                        if (isNull(timer))
                            return;
                        timer = this._timeSys.delete(timer);
                        this._onLastAnimComplete = null;
                        dealTrackDone();
                    };
                    timer = this._timeSys.delay(track.animation.duration / timeScale, () => {
                        console.log(`[BoneAnim]${id} anim (${anim}) time out`);
                        onLastAnimComplete();
                    });
                    this._onLastAnimComplete = onLastAnimComplete;
                    console.log(`[BoneAnim]${id} anim (${anim}) play.`);
                    skeleton.setTrackCompleteListener(track, this._onLastAnimComplete);
                }
                else {
                    dealTrackDone();
                }
            }
        });
    }
}

var _a;
class FgoPool {
    static alloc(url) {
        const item = this._poolOfpool.alloc();
        item.reset(url);
        return item;
    }
    constructor() {
        this._pool = new GObjectPool();
    }
    get() {
        // console.log('get', this._url, this._pool.count);
        return this._pool.getObject(this._url);
    }
    ret(obj) {
        // console.log('ret', this._url, this._pool.count);
        this._pool.returnObject(obj);
        obj.removeFromParent();
    }
    reset(url) {
        this._pool.clear();
        this._url = url;
    }
}
_a = FgoPool;
FgoPool._poolOfpool = new PoolModule(() => new FgoPool(), (p) => p.reset(""));
FgoPool.free = _a._poolOfpool.free.bind(_a._poolOfpool);

class FUISys extends SysBase {
    constructor() {
        super(...arguments);
        this.sysName = "FUISys";
    }
    get timeSys() {
        return this._timeSys;
    }
    get fgoPool() {
        return this._fgoPool;
    }
    get plat() {
        return this._getPlat();
    }
    get channel() {
        return this._getChannel();
    }
    get root() {
        return fgui.GRoot.inst;
    }
    OnInit(complete) {
        fgui.GRoot.create();
        this.root.node.getComponent(UITransform).setContentSize(1920, 1080);
        const rootWidget = this.root.node.addComponent(Widget);
        rootWidget.isAlignHorizontalCenter = true;
        rootWidget.isAlignVerticalCenter = true;
        this._fgoPool = new fgui.GObjectPool();
        complete();
    }
    OnLateInit(complete) {
        complete();
    }
    OnDispose() {
    }
    init(timeSys, getPlat, getChannel) {
        this._timeSys = timeSys;
        this._getPlat = getPlat;
        this._getChannel = getChannel;
    }
    loadPackage(packPath, onProgress, onLoaded) {
        fgui.UIPackage.loadPackage(packPath, onProgress, onLoaded);
    }
    createObject(pak, name) {
        return fgui.UIPackage.createObject(pak, name);
    }
    toUrl(pak, name) {
        return fgui.UIPackage.getItemURL(pak, name);
    }
    toUrlByArr(pair) {
        return fgui.UIPackage.getItemURL(pair[0], pair[1]);
    }
    allocPool(url) {
        return FgoPool.alloc(url);
    }
    freePool(pool) {
        FgoPool.free(pool);
    }
    centerOfGlobal(fgo) {
        const pivotX = fgo.pivotAsAnchor ? 0.5 - fgo.pivotX : 0.5;
        const pivotY = fgo.pivotAsAnchor ? 0.5 - fgo.pivotY : 0.5;
        const localCenter = new Vec2(fgo.width * pivotX, fgo.height * pivotY);
        return fgo.localToGlobal(localCenter.x, localCenter.y);
    }
}

var DlgLayer;
(function (DlgLayer) {
    DlgLayer[DlgLayer["Background"] = 0] = "Background";
    DlgLayer[DlgLayer["Base"] = 1] = "Base";
    DlgLayer[DlgLayer["Front"] = 2] = "Front";
    DlgLayer[DlgLayer["Topest"] = 3] = "Topest";
    DlgLayer[DlgLayer["GM"] = 4] = "GM";
    DlgLayer[DlgLayer["ItemFly"] = 5] = "ItemFly";
    DlgLayer[DlgLayer["TopMask"] = 6] = "TopMask";
})(DlgLayer || (DlgLayer = {}));
class DlgKit extends KitBase {
    constructor() {
        super(...arguments);
        this.kitName = "DlgKit";
    }
    get timeSys() {
        return this._timeSys;
    }
    get fuiSys() {
        return this._fuiSys;
    }
    get plat() {
        return this._fuiSys.plat;
    }
    get channle() {
        return this._fuiSys.channel;
    }
    OnInit(complete) {
        this._fuiSys = this.sys(FUISys);
        this._timeSys = this.sys(TimeSys);
        this._layers = new Map();
        this._dlgList = [];
        this._getLayer(DlgLayer.Base); // Base层先实例化出来
        complete();
    }
    OnLateInit(complete) {
        complete();
    }
    OnDispose() {
    }
    _getLayer(layer) {
        if (this._layers.has(layer)) {
            return this._layers.get(layer);
        }
        else {
            const layerCom = new GComponent();
            layerCom.node.name = getEnumName(DlgLayer, layer);
            let nearestFrontLayerCom;
            // 找到存在且在自己之前的然后插入到后面
            for (let tmpLayer = layer + 1; tmpLayer <= DlgLayer.TopMask; tmpLayer++) {
                if (this._layers.has(tmpLayer)) {
                    nearestFrontLayerCom = this._layers.get(tmpLayer);
                    break;
                }
            }
            if (nearestFrontLayerCom) {
                this._fuiSys.root.addChildAt(layerCom, this._fuiSys.root.getChildIndex(nearestFrontLayerCom));
            }
            else {
                this._fuiSys.root.addChild(layerCom);
            }
            this._layers.set(layer, layerCom);
            return layerCom;
        }
    }
    fetchDlg(dlgCtrlType) {
        for (let index = 0; index < this._dlgList.length; index++) {
            const dlg = this._dlgList[index];
            if (!dlg.isClosed && dlg instanceof dlgCtrlType) {
                return dlg;
            }
        }
        var dlgCtrl = new dlgCtrlType();
        var fgo = this._fuiSys.createObject(dlgCtrl.dlgPak, dlgCtrl.dlgRes).asCom;
        this._getLayer(dlgCtrl.dlgLayer).addChild(fgo);
        dlgCtrl.init(fgo, this);
        this._dlgList.push(dlgCtrl);
        console.log("... " + className(dlgCtrl) + "<res:" + dlgCtrl.dlgRes + ">");
        return dlgCtrl;
    }
    getDlg(dlgCtrlType) {
        for (let index = 0; index < this._dlgList.length; index++) {
            const dlg = this._dlgList[index];
            if (!dlg.isClosed && dlg instanceof dlgCtrlType) {
                return dlg;
            }
        }
    }
    closeDlg(dlgCtrlType) {
        arrayRemoveAll(this._dlgList, dlg => dlg.isClosed);
        for (let index = 0; index < this._dlgList.length; index++) {
            const dlg = this._dlgList[index];
            if (dlg instanceof dlgCtrlType) {
                dlg.close();
            }
        }
    }
    shake() {
        var _a;
        const node = find("Canvas/Camera");
        const ori = new Vec2(node.position.x, node.position.y);
        const shake2d = new Shake2DModule(3, 1, 2, "smoothHalfCircle", 8, () => ori, (v2) => {
            find("Canvas/Camera").setPosition(v2.x, v2.y);
        });
        (_a = this._shakeTween) === null || _a === void 0 ? void 0 : _a.stop();
        this._shakeTween = tween(shake2d).to(0.15, { ratio: 1 }).start();
    }
}

class UIBase {
    constructor() {
        this._isClosed = false;
        this._fgo = null;
        this._node = null;
        this._wrapList = null;
        this._everOnClickObj = null;
        this._everEvtListens = null;
        this._everFgoListens = null;
        this._everTimers = null;
        this._everTweenTarget = null;
        this._dlgkit = null;
    }
    get dlgkit() {
        return this._dlgkit;
    }
    get isClosed() {
        return this._isClosed;
    }
    get fgc() {
        return this._fgo.asCom;
    }
    get node() {
        return this._node;
    }
    init(fgo, dlgkit) {
        if (this._fgo != null)
            return;
        this._fgo = fgo;
        this._node = fgo.node;
        this._dlgkit = dlgkit;
    }
    show() {
        if (this.isClosed)
            return;
        this._fgo.visible = true;
    }
    hide() {
        if (this.isClosed)
            return;
        this._fgo.visible = false;
    }
    /**
     * 提到最上层
     */
    moveToFront() {
        this._fgo.parent.setChildIndex(this._fgo, this._fgo.parent.numChildren - 1);
    }
    close() {
        var _a, _b, _c, _d, _e, _f;
        if (this.isClosed)
            return;
        (_a = this._everEvtListens) === null || _a === void 0 ? void 0 : _a.forEach(([e, event, listener, thisArg]) => {
            e === null || e === void 0 ? void 0 : e.off(event, listener, thisArg);
        });
        this._everEvtListens = null;
        (_b = this._everFgoListens) === null || _b === void 0 ? void 0 : _b.forEach(([fgo, event, listener, thisArg]) => {
            fgo && !fgo.isDisposed && fgo.off(event, listener, thisArg);
        });
        this._everFgoListens = null;
        (_c = this._everOnClickObj) === null || _c === void 0 ? void 0 : _c.forEach(obj => {
            if (obj && !obj.isDisposed) {
                obj.clearClick();
            }
        });
        this._everOnClickObj = null;
        (_d = this._wrapList) === null || _d === void 0 ? void 0 : _d.forEach((w) => {
            if (!w.isClosed) {
                w.close();
            }
        });
        this._wrapList = null;
        (_e = this._everTimers) === null || _e === void 0 ? void 0 : _e.forEach(tid => {
            this._dlgkit.timeSys.delete(tid);
        });
        this._everTimers = null;
        (_f = this._everTweenTarget) === null || _f === void 0 ? void 0 : _f.forEach(tar => {
            // console.log("stop tar ", tar, tar.uuid);
            Tween.stopAllByTarget(tar);
        });
        this._everTweenTarget = null;
        this.OnDisposeSelfFgo(this._fgo);
        this._fgo = null;
        this._node = null;
        this._isClosed = true;
    }
    wrap(type, fgo) {
        if (typeof fgo == "string") {
            fgo = this.getChild(fgo);
        }
        if (!this._wrapList) {
            this._wrapList = [];
        }
        var wrap = new type();
        wrap.init(fgo, this._dlgkit);
        this._wrapList.push(wrap);
        return wrap;
    }
    unwrap(wrap) {
        if (!this._wrapList)
            return;
        const idx = this._wrapList.indexOf(wrap);
        if (idx > -1) {
            this._wrapList.splice(idx, 1);
            wrap.close();
            console.log("unwrap suc " + wrap);
        }
        else {
            console.error("this wrap not in list");
        }
    }
    getWrap(type) {
        if (!this._wrapList)
            return null;
        arrayRemoveAll(this._wrapList, wrap => wrap.isClosed);
        for (let index = 0; index < this._wrapList.length; index++) {
            const wrap = this._wrapList[index];
            if (wrap instanceof type)
                return wrap;
        }
        return null;
    }
    getWraps(type) {
        if (!this._wrapList)
            return [];
        arrayRemoveAll(this._wrapList, wrap => wrap.isClosed);
        return this._wrapList.filter(wrap => wrap instanceof type);
    }
    getChild(childName) {
        if (childName == "")
            return this.fgc;
        else
            return this.fgc.getChild(childName);
    }
    getChildInGroup(childName, groupName) {
        return this.fgc.getChildInGroup(childName, this.getGroup(groupName));
    }
    ajustPlat(childName, ctrlName = "plat") {
        const plat = this._dlgkit.plat;
        if (isNull(plat))
            return;
        const c = this.getChild(childName);
        if (c) {
            const ctrl = c.asCom.getController(ctrlName);
            if (ctrl) {
                let index = 0;
                for (let i = 1; i < ctrl.pageCount; i++) {
                    const name = ctrl.getPageName(i);
                    if (name.includes(plat)) {
                        index = i;
                        break;
                    }
                }
                ctrl.setSelectedIndex(index);
            }
        }
    }
    ajustChannel(childName, ctrlName = "channel") {
        const channel = this._dlgkit.channle;
        if (isNull(channel))
            return;
        const c = this.getChild(childName);
        if (c) {
            const ctrl = c.asCom.getController(ctrlName);
            if (ctrl) {
                let index = 0;
                for (let i = 1; i < ctrl.pageCount; i++) {
                    const name = ctrl.getPageName(i);
                    if (name.includes(channel)) {
                        index = i;
                        break;
                    }
                }
                ctrl.setSelectedIndex(index);
            }
        }
    }
    //#region getter for child
    getCom(childName) {
        return this.getChild(childName).asCom;
    }
    getBtn(childName) {
        return this.getChild(childName).asBtn;
    }
    getGraph(childName) {
        return this.getChild(childName).asGraph;
    }
    getLoader(childName) {
        return this.getChild(childName).asLoader;
    }
    getLoader3D(childName) {
        return this.getChild(childName).asLoader3D;
    }
    getTxt(childName) {
        return this.getChild(childName).asTextField;
    }
    getLabel(childName) {
        return this.getChild(childName).asLabel;
    }
    getList(childName) {
        return this.getChild(childName).asList;
    }
    getGroup(childName) {
        return this.getChild(childName).asGroup;
    }
    getTransition(name) {
        return this.fgc.getTransition(name);
    }
    getController(name) {
        return this.fgc.getController(name);
    }
    //#endregion
    //#region addXXX
    /**
     * 添加自释放的按钮绑定
     * @param objName 节点名称。为空表示当前节点本身 | 节点
     * @param listener
     */
    addBtnEvt(objName, listener, thisArg) {
        if (this._everOnClickObj == null) {
            this._everOnClickObj = new Set();
        }
        if (typeof objName == "string") {
            objName = this.getChild(objName);
        }
        const btn = objName;
        btn.onClick(() => {
            const oriG = btn.grayed;
            btn.enabled = false;
            btn.grayed = false;
            listener.call(this, () => {
                btn.enabled = true;
                btn.grayed = oriG;
            });
        }, this);
        this._everOnClickObj.add(btn);
    }
    addTween(target) {
        if (this._everTweenTarget == null) {
            this._everTweenTarget = new Set();
        }
        // console.log("add tween ", target.uuid)
        this._everTweenTarget.add(target);
        return tween(target);
    }
    addXTween(target) {
        if (this._everTweenTarget == null) {
            this._everTweenTarget = new Set();
        }
        this._everTweenTarget.add(target);
        return new XTween(target);
    }
    addEvt(e, event, listener, thisArg) {
        if (!e)
            return;
        if (this._everEvtListens == null) {
            this._everEvtListens = [];
        }
        thisArg !== null && thisArg !== void 0 ? thisArg : (thisArg = this);
        e.on(event, listener, thisArg);
        this._everEvtListens.push([e, event, listener, thisArg]);
    }
    addFgoEvt(fgo, event, listener, thisArg) {
        if (!fgo)
            return;
        if (this._everFgoListens == null) {
            this._everFgoListens = [];
        }
        thisArg !== null && thisArg !== void 0 ? thisArg : (thisArg = this);
        fgo.on(event, listener, thisArg);
        this._everFgoListens.push([fgo, event, listener, thisArg]);
    }
    addDelay(delay, func, caller, ...arg) {
        caller !== null && caller !== void 0 ? caller : (caller = this);
        return this._addTimer(delay, 1, func, caller, ...arg);
    }
    addNextFrame(func, caller, ...arg) {
        caller !== null && caller !== void 0 ? caller : (caller = this);
        return this._addTimer(0, 1, func, caller, ...arg);
    }
    addInterval(interval, loop, func, caller, ...arg) {
        caller !== null && caller !== void 0 ? caller : (caller = this);
        return this._addTimer(interval, loop, func, caller, ...arg);
    }
    delTimer(timerId) {
        this._dlgkit.timeSys.delete(timerId);
        return null;
    }
    _addTimer(interval, loops, func, caller, ...arg) {
        if (this._isClosed) {
            console.warn("ui is closed cant add timer");
            return;
        }
        const t = this._dlgkit.timeSys.timer(interval, loops, func, caller, ...arg);
        if (!this._everTimers) {
            this._everTimers = [];
        }
        this._everTimers.push(t);
        return t;
    }
    //#endregion
    /**
     * <can-override>
     * 在销毁 Fgo 时被调用
     */
    OnDisposeSelfFgo(selfFgo) {
        selfFgo.dispose();
    }
}

class UIDocker {
    /**
     * 创建一个docker但是不执行
     * @param target docker目标对象
     * @param dockPars docker参数
     * @param complete docker结束之后的回调，可选
     * @return UIDocker实例
     */
    static create(target, dockPars) {
        let docker = (UIDocker._pool && UIDocker._pool.length > 0) ? this._pool.pop() : new UIDocker();
        docker._reset(target, dockPars);
        return docker;
    }
    /**
     * 销毁docker
     * @param docker 被销毁的docker，可以传null
     * @return undefined
     */
    static destroy(docker) {
        if (docker) {
            docker._destroy();
            if (!this._pool) {
                this._pool = [];
            }
            this._pool.push(docker);
        }
        return undefined;
    }
    constructor() {
    }
    _reset(target, dockPars) {
        var _a, _b;
        this._reversing = undefined;
        this._target = target;
        this._outEase = dockPars.out_ease || "quadOut";
        this._backEase = dockPars.back_ease || "quadIn";
        this._outDur = (_a = dockPars.out_dur) !== null && _a !== void 0 ? _a : 0.4;
        this._backDur = (_b = dockPars.back_dur) !== null && _b !== void 0 ? _b : 0.4;
        let out = this._parseProps(target, dockPars.out);
        let back = this._parseProps(target, dockPars.back);
        let props = out || back;
        if (out && back) {
            props = deepClone(props);
            for (let k in back) {
                props[k] = 0;
            }
        }
        this._outProps = this._getProps(target, props);
        this._backProps = back;
        if (out) {
            this._setProps(target, out);
        }
    }
    /**
     * 停靠出来（展示出来）
     */
    dockOut(cb) {
        this._internal_dock(true, cb);
    }
    /**
     * 停靠回去（隐藏）
     */
    dockBack(cb) {
        this._internal_dock(false, cb);
    }
    /**
    * 停靠
    * @param dockOut 是否停靠出来（显示）
    */
    _internal_dock(dockOut, cb) {
        if (this._takens) {
            for (let t of this._takens) {
                t._internal_dock(dockOut);
            }
        }
        if (this._reversing === !dockOut) {
            cb === null || cb === void 0 ? void 0 : cb();
            return;
        }
        this._clearTween();
        this._reversing = !dockOut;
        if (dockOut) {
            if (this._outProps) {
                this._tween = tween(this._target).to(this._outDur, this._outProps, {
                    easing: this._outEase,
                    onComplete: this._handleTweenComplete.bind(this, cb)
                }).start();
            }
            else {
                this._handleTweenComplete(cb);
            }
        }
        else {
            if (this._backProps) {
                this._tween = tween(this._target).to(this._backDur, this._backProps, {
                    easing: this._backEase,
                    onComplete: this._handleTweenComplete.bind(this, cb)
                }).start();
            }
            else {
                this._handleTweenComplete(cb);
            }
        }
    }
    /**
     * 顺带一个docker，跟自己绑定
     * @param docker
     * @return this
     */
    take(docker) {
        if (!docker) {
            return this;
        }
        if (!this._takens) {
            this._takens = new Array();
        }
        this._takens.push(docker);
        return this;
    }
    /**
     * 删除
     */
    _destroy() {
        if (this._takens) {
            for (let t of this._takens) {
                UIDocker.destroy(t);
            }
            this._takens = undefined;
        }
        this._clearTween();
        this._target = undefined;
        this._reversing = undefined;
        this._outEase = undefined;
        this._backEase = undefined;
    }
    _handleTweenComplete(cb) {
        this._clearTween();
        cb === null || cb === void 0 ? void 0 : cb();
    }
    _clearTween() {
        if (this._tween) {
            this._tween.stop();
            this._tween = undefined;
        }
    }
    _getProps(target, props) {
        if (isNull(props)) {
            return undefined;
        }
        let current = {};
        this._notNullAndSet(current, props, target, "x");
        this._notNullAndSet(current, props, target, "y");
        this._notNullAndSet(current, props, target, "alpha");
        this._notNullAndSet(current, props, target, "scaleX");
        this._notNullAndSet(current, props, target, "scaleY");
        return current;
    }
    _setProps(target, props) {
        this._notNullAndSet(target, props, props, "x");
        this._notNullAndSet(target, props, props, "y");
        this._notNullAndSet(target, props, props, "alpha");
        this._notNullAndSet(target, props, props, "scaleX");
        this._notNullAndSet(target, props, props, "scaleY");
    }
    _notNullAndSet(target, props, valSource, propName) {
        if (notNull(props[propName])) {
            target[propName] = valSource[propName];
        }
    }
    _parseProps(target, mod) {
        if (isNull(mod))
            return undefined;
        return removeNullKeys({
            x: this._dealPropOfMod(target, mod, "x"),
            y: this._dealPropOfMod(target, mod, "y"),
            alpha: this._dealPropOfMod(target, mod, "alpha"),
            scaleX: this._dealPropOfMod(target, mod, "scaleX"),
            scaleY: this._dealPropOfMod(target, mod, "scaleY"),
        });
    }
    _dealPropOfMod(target, mod, propName) {
        let base = mod[propName];
        const rMod = mod[`r${propName}`];
        const sMod = mod[`s${propName}`];
        if (rMod || sMod) {
            base !== null && base !== void 0 ? base : (base = 0);
            if (rMod)
                base += target[propName] + rMod;
            if (sMod)
                base += target[propName == "x" ? "width" :
                    propName == "y" ? "width" :
                        propName] * sMod;
        }
        return base;
    }
}
/**
 * 几种基本停靠类型
 */
UIDocker.Dock = {
    /**
     * 左侧停靠
     */
    Left: {
        out: {
            rx: -120,
        },
        back: {
            x: -4,
            sx: -1,
        },
        out_ease: "backOut",
        back_ease: "backIn",
    },
    /**
     * 左侧停靠
     */
    LeftInRightOut: {
        out: {
            rx: -120,
        },
        back: {
            rx: 4,
            sx: 1,
        },
        out_ease: "backOut",
        back_ease: "backIn",
    },
    /**
     * 右侧停靠
     */
    Right: {
        out: {
            rx: 100,
        },
        back: {
            rx: 4,
            sx: 1,
        },
        out_ease: "backOut",
        back_ease: "backIn",
    },
    /**
     * 顶部停靠
     */
    Top: {
        out: {
            ry: -120,
        },
        back: {
            ry: -3,
            sy: -1,
        },
        out_ease: "backOut",
        back_ease: "backIn",
    },
    /**
     * 底部停靠
     */
    Bottom: {
        out: {
            ry: 70,
        },
        back: {
            ry: 4,
            sy: 1,
        },
        out_ease: "backOut",
        back_ease: "backIn",
    },
    /**
     * 渐显
     */
    Fade: {
        out: {
            alpha: 0,
        },
        back: {
            alpha: 0,
        },
        out_ease: "quadOut",
        back_ease: "quadIn",
    },
    /**
     * 缓慢渐显
     */
    FadeSlowly: {
        out: {
            alpha: 0,
        },
        back: {
            alpha: 0,
        },
        out_dur: 1.8,
        back_dur: 0.6,
        out_ease: "quadOut",
        back_ease: "quadIn",
    },
    /**
     * 从中间像气泡一样冒出来
     */
    Bubble: {
        out: {
            sscaleX: 0.7,
            sscaleY: 0.7,
            alpha: 0.2,
        },
        back: {
            scaleX: 0.0,
            scaleY: 0.0,
            alpha: 0,
        },
        out_ease: "elasticOut",
        back_ease: "backIn",
        out_dur: 0.6,
        back_dur: 0.6,
        pivotX: 0.5,
        pivotY: 0.5,
    },
    /**
     * 像幽灵一样浮上来
     */
    GhostUp: {
        out: {
            sscaleX: 0.9,
            sscaleY: 0.9,
            alpha: 0.8,
            ry: 10,
        },
        back: {
            alpha: 0,
            sscaleX: 0.9,
            sscaleY: 0.9,
            ry: 0,
        },
        out_ease: "backOut",
        back_ease: "backIn",
        out_dur: 0.3,
        back_dur: 0.2,
        pivotX: 0.5,
        pivotY: 0.5,
    },
    /**
     *
     */
    GhostUp2: {
        out: {
            sscaleX: 0.9,
            sscaleY: 0.9,
            alpha: 0.8,
            ry: 10,
        },
        back: {
            alpha: 0,
            sscaleX: 0.9,
            sscaleY: 0.9,
            ry: 0,
        },
        out_ease: "backOut",
        back_ease: "backIn",
        out_dur: 0.2,
        back_dur: 0,
        pivotX: 0.5,
        pivotY: 0.5,
    }
};
UIDocker.fade_ease = "quadOut";

var DockCompleteDo;
(function (DockCompleteDo) {
    DockCompleteDo[DockCompleteDo["None"] = 0] = "None";
    DockCompleteDo[DockCompleteDo["Hide"] = 1] = "Hide";
    DockCompleteDo[DockCompleteDo["Close"] = 2] = "Close";
})(DockCompleteDo || (DockCompleteDo = {}));
class DlgBase extends UIBase {
    constructor() {
        super(...arguments);
        this._bg = null;
    }
    get dlgPak() {
        return "Main";
    }
    ;
    get dlgLayer() {
        return DlgLayer.Base;
    }
    get isClosing() {
        return this._isClosing;
    }
    init(fgc, dlgkit) {
        super.init(fgc, dlgkit);
        this._isClosing = false;
        this._internal_isShow = true;
        this.node.name = this.dlgRes;
        this._initBlackGraph();
        this._initCloseButton();
        this._initPlatAjust();
        this._initChannelAjust();
        this.OnInit();
    }
    show() {
        if (this._internal_isShow)
            return;
        if (this.isClosed || this.isClosing)
            return;
        super.show();
        this._bg && (this._bg.visible = true);
        this._dockOut();
        this._internal_isShow = true;
    }
    hide() {
        if (!this._internal_isShow)
            return;
        if (this.isClosed || this.isClosing)
            return;
        this._dockBack(DockCompleteDo.Hide);
        this._internal_isShow = false;
    }
    _internal_hide() {
        super.hide();
        this._bg && (this._bg.visible = false);
    }
    _initCloseButton() {
        let closeBtn = this.getChild(DlgBase.SystemCtrl.CloseButton);
        if (closeBtn) {
            closeBtn.onClick(this.close, this);
        }
    }
    _initPlatAjust() {
        this.ajustPlat("");
    }
    _initChannelAjust() {
        this.ajustChannel("");
    }
    _initBlackGraph() {
        let blackGraph = this.getChild(DlgBase.SystemCtrl.BlackGraph);
        if (!blackGraph) {
            const bgAlpha = Math.floor(this.OnGetBgAlpha() * 255);
            if (bgAlpha > 0) {
                const bgType = this.OnGetBgType();
                if (bgType == "loader") {
                    let bg = new GLoader();
                    let w = this.fgc.width;
                    let h = this.fgc.height;
                    bg.setPosition(-w, -h);
                    bg.setSize(w * 3, h * 3);
                    bg.fill = LoaderFillType.ScaleFree;
                    bg.color = new Color(0, 0, 0, bgAlpha);
                    bg.url = this.OnGetBgLoaderResUrl();
                    bg.touchable = true;
                    let rootInParentIndex = this.fgc.parent.getChildIndex(this.fgc);
                    this.fgc.parent.addChildAt(bg, rootInParentIndex);
                    this.fgc.opaque = false;
                    blackGraph = bg;
                }
                else {
                    let bg = new GGraph();
                    let w = this.fgc.width;
                    let h = this.fgc.height;
                    let blackColor = new Color(0, 0, 0, bgAlpha);
                    bg.setPosition(-w, -h);
                    bg.setSize(w * 3, h * 3);
                    bg.drawRect(0, blackColor, blackColor);
                    let rootInParentIndex = this.fgc.parent.getChildIndex(this.fgc);
                    this.fgc.parent.addChildAt(bg, rootInParentIndex);
                    this.fgc.opaque = false;
                    blackGraph = bg;
                }
            }
        }
        if (blackGraph) {
            blackGraph.onClick(() => {
                if (this.OnBgClickClose()) {
                    this.close();
                }
            }, this);
            this._bg = blackGraph;
        }
    }
    close() {
        if (this.isClosed || this.isClosing) {
            console.warn("dlg alredy closed.");
            return;
        }
        this._isClosing = true;
        this.fgc.touchable = false;
        this._dockBack(DockCompleteDo.Close);
    }
    /**
    * 启用停靠
    * @param target 停靠执行的ui对象，名字或者对象实例，可选，默认DlgBase.SystemCtrl.Docker
    * @param bg 停靠界面背景对象执行alpha渐变的对象，可选，默认DlgBase.SystemCtrl.Black
    * @param dockPars target停靠参数，默认UIDocker.Dock.Left
    * @param bgDockPars bg停靠参数，默认UIDocker.Dock.Fade
    */
    dock(dockPars, bgDockPars) {
        this._docker = UIDocker.destroy(this._docker);
        dockPars || (dockPars = UIDocker.Dock.Left);
        bgDockPars || (bgDockPars = UIDocker.Dock.Fade);
        let docker = UIDocker.create(this.fgc, dockPars);
        if (this._bg) {
            const bgPars = deepClone(bgDockPars);
            bgPars.out_dur = dockPars.out_dur;
            bgPars.back_dur = dockPars.back_dur;
            let bgdocker = UIDocker.create(this._bg, bgPars);
            docker.take(bgdocker);
        }
        dockPars.pivotX && (this.fgc.pivotX = dockPars.pivotX);
        dockPars.pivotY && (this.fgc.pivotY = dockPars.pivotY);
        this._docker = docker;
        this._dockOut();
    }
    /**
     * 提到最上层
     */
    moveToFront() {
        if (this._bg) {
            this._bg.parent.setChildIndex(this._bg, this._bg.parent.numChildren - 1);
        }
        super.moveToFront();
    }
    _handleDockOver(reverse, completeDo) {
        if (reverse) {
            if (completeDo === DockCompleteDo.Hide) {
                this._internal_hide();
            }
            else if (completeDo === DockCompleteDo.Close) {
                this._internal_close();
            }
        }
        else {
            this.OnDockOut();
            this.fgc.touchable = true;
        }
    }
    /**
     * 停靠出来并显示（内部调用）
     */
    _dockOut() {
        if (this._docker) {
            this._docker.dockOut(this._handleDockOver.bind(this, false, DockCompleteDo.None));
        }
        else {
            this._handleDockOver(false, DockCompleteDo.None);
        }
    }
    _dockBack(completeDo) {
        if (this._docker) {
            this._docker.dockBack(this._handleDockOver.bind(this, true, completeDo));
        }
        else {
            this._handleDockOver(true, completeDo);
        }
    }
    _internal_close() {
        // console.log(this.dlgRes, "_internal_close");
        this.OnClose();
        super.close();
        if (this._bg) {
            this._bg.dispose();
            this._bg = null;
        }
    }
    /**
     * <To-Override>
     * 弹窗关闭时调用
     */
    OnClose() {
    }
    ;
    /**
     * <To-Override>
     * 窗口进入的停靠动画结束
     */
    OnDockOut() {
    }
    /**
     * 点击背景是否关闭
     */
    OnBgClickClose() {
        return true;
    }
    /**
     * 获取背景透明度，0表示不需要背景
    */
    OnGetBgAlpha() {
        return 0.7;
    }
    /**
     * 背景透明度大于0时有效。背景类型
     * @returns "loader" | "graph"
     */
    OnGetBgType() {
        return "loader";
    }
    /**
     * 背景类型为 "loader" 时起作用
     * @returns 背景Loader资源路径
     */
    OnGetBgLoaderResUrl() {
        return "ui://9fdeszvrl5pz1c";
    }
}
DlgBase.SystemCtrl = {
    /**
     * 关闭按钮
     */
    CloseButton: 'sys_closeButton',
    /**
     * 黑色半透明遮罩。如果 dlg 中没有设置，则会自动创建一个。
     */
    BlackGraph: 'sys_black',
};

class UIWrap extends UIBase {
    init(fgo, dlgkit) {
        super.init(fgo, dlgkit);
        this.OnInit();
    }
    close() {
        if (this.isClosed) {
            console.error("dlg alredy closed.");
            return;
        }
        this.OnClose();
        super.close();
    }
    OnDisposeSelfFgo(selfFgo) {
        // wrap 默认不销毁自身节点，而是随着父节点销毁而销毁
    }
    /**
     * <To-Override>
     * 装饰关闭时调用
     */
    OnClose() {
    }
    ;
}

class ListItem extends UIWrap {
    getCurData() {
        return this.curData;
    }
    refresh(data, index) {
        this.curData = data;
        this._index = index;
        this.OnRefresh(this.curData, this._index);
    }
    internalRefresh() {
        this.OnRefresh(this.curData, this._index);
    }
    get index() {
        return this._index;
    }
}

class ListWrap extends UIWrap {
    OnInit() {
        this._list = this.fgc.asList;
        this._list.setVirtual();
        this._list.itemRenderer = this._renderListItem.bind(this);
    }
    initList(type, sourceData) {
        this._itemType = type;
        this._itemDict = new Map();
        this.SourceData = sourceData;
    }
    set SourceData(data) {
        this._sourceData = data;
        this._list.numItems = this._sourceData.length;
    }
    get SourceData() {
        return this._sourceData;
    }
    get itemDict() {
        return this._itemDict;
    }
    /**
     * 刷新对应数据位置的格子
     */
    refreshItemByIndex(index) {
        this._itemDict.forEach((value) => {
            if (value.index === index) {
                value.internalRefresh();
                return false;
            }
        });
    }
    /**刷新全部 */
    refreshAll() {
        this._itemDict.forEach((value) => {
            value.internalRefresh();
        });
    }
    _renderListItem(index, obj) {
        let wrap;
        if (this._itemDict.has(obj.id)) {
            wrap = this._itemDict.get(obj.id);
        }
        else {
            wrap = this.wrap(this._itemType, obj);
            this._itemDict.set(obj.id, wrap);
        }
        wrap.refresh(this._sourceData[index], index);
    }
}

export { BoneAnim, DlgBase, DlgKit, FUISys, FgoPool, ListItem, ListWrap, UIBase, UIDocker, UIWrap };
