declare module "@ndmspc/ndmvr-core" {
    import { Subject, Subscription } from "rxjs";
    import * as THREE from "three";

    export interface Broker {
        ws?: WebSocket;
        connect(): void;
    }

    export interface BrokerManager {
        createWs(url: string, flag: boolean, timeout: number): void;
        getBrokerByUrl(url: string, flag: boolean): Broker | undefined;
        disconnectWsByUrl(url: string): void;
        getSubject(): Subject<any>;
    }

    export interface HistogramSubject {
        next(data: any): void;
        getStream(id: string): Subject<any>;
    }

    export interface HistogramData {
        id: string;
        obj: any;
        opts?: {
            render?: "jsroot" | "ndmvr";
            config?: Record<string, unknown>;
        };
    }

    export class THnPainter {
        constructor(histo: HistogramData, id: string, opts?: Record<string, unknown>);
        stateSub: Subscription;
        functionSub: Subscription;
        configSub: Subscription;
        dispatchSub: Subscription;
        keyDownHandler(event: KeyboardEvent): void;
        keyUpHandler(event: KeyboardEvent): void;
        pointer: any;
        wireframe: {
            wireframe: THREE.Object3D;
            stateSub: Subscription;
            dispose(): void;
        };
        BVHTree: any;
        maxInstancesPerLayer: number;
        maxContentPerLayer: number;
        totalInstances: number;
        color: any;
        matrixCache: any;
        selectedSet: string[];
        selectedArray: string;
        availableSets: string[];
        renderHistory: string[];
        dirtyInstance: string[];
        limits: any;
        mesh: THREE.InstancedMesh;
        instGeom: THREE.BufferGeometry;
        material: THREE.Material;
        instancePositions: Float32Array;
        instanceScales: Float32Array;
        instanceColors: Float32Array;
        colorArray: Float32Array;
        updateHistogram(histo: HistogramData): Promise<void>;
        renderHistogram(startIndex: number, endIndex: number, layer: number): Promise<void>;
        pushVisibleInstances(): void;
        remove(): void;
        checkIntersectionBVH(ray: THREE.Ray): any[];
        intersectionHandler(intersection: any, triggerSource: string): void;
    }

    export class HistogramJsrootClass {
        constructor(id: string, obj: any, camera: THREE.Camera);
        histogramGroup: THREE.Group;
        binInfoComponent: any;
        id: string;
        configSub: Subscription;
        sub: Subscription;
        buildPromise: Promise<void>;
        rootObj: any;
        histoSub: Subscription;
        dummyEl: HTMLElement;
        defaultRaycastHandler: any;
        mouseEvents: any;
        color: any;
        colorTarget: any;
        getHistogramMesh(): THREE.Group;
        updateHistogram(obj: any): void;
        remove(): void;
    }

    export interface ConfigSubject {
        next(config: any): Record<string, unknown>;
        getValue(): any;
        getObservable(): Subject<any>;
        appendPads(ids: string[], disp_kind: string, settings: Record<string, unknown>): void;
    }

    export interface FunctionSubject {
        addFunctions(config: any): void;
        removeFunctions(config: any): void;
    }

    export interface BinInfoSubject {
        getObservable(): Subject<any>;
    }

    export interface StateSubject {
        next(state: any): void;
        getValue(): any;
        getObservable(): Subject<any>;
    }

    export interface DispatchSubject {
        next(data: any): void;
        getObservable(): Subject<any>;
    }

    export function brokerManagerGet(): BrokerManager;
    export function histogramSubjectGet(): HistogramSubject;
    export function configSubjectGet(): ConfigSubject;
    export function functionSubjectGet(): FunctionSubject;
    export function binInfoSubjectGet(): BinInfoSubject;
    export function dispatchSubjectGet(): DispatchSubject;
    export function stateSubjectGet(id: string): StateSubject;
}
