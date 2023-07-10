import * as fgui from 'fairygui-ccc370';
import { GObjectPool } from 'fairygui-ccc370';
import { PoolModule } from 'gnfun';
import { UITransform, Widget, Vec2 } from 'cc';
import { SysBase } from 'coolgame-cc';

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
        this._allUILoaded = false;
    }
    get fgoPool() {
        return this._fgoPool;
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

export { FUISys, FgoPool };
