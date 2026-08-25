import { configSubjectGet, histogramSubjectGet, stateSubjectGet } from "@ndmspc/ndmvr-core";
import type { Subscription } from "rxjs";
import {
    useHistogramWorkspace,
    type HistogramData,
    type HistogramPad,
    type HistogramPadState,
} from "./state";

type CoreConfigValue = {
    config?: {
        environment?: {
            histogramPads?: HistogramPad[];
        };
    };
};

let consumerCount = 0;
let configSubscription: Subscription | null = null;
let pendingStop: ReturnType<typeof setTimeout> | null = null;
const histogramSubscriptions = new Map<string, Subscription>();
const stateSubscriptions = new Map<string, Subscription>();

function unsubscribePad(padId: string) {
    histogramSubscriptions.get(padId)?.unsubscribe();
    histogramSubscriptions.delete(padId);
    stateSubscriptions.get(padId)?.unsubscribe();
    stateSubscriptions.delete(padId);
}

function subscribePad(padId: string) {
    if (!histogramSubscriptions.has(padId)) {
        const subscription = histogramSubjectGet()
            .getStream(padId)
            .subscribe((histogram: HistogramData) => {
                if (histogram?.id !== padId) return;
                useHistogramWorkspace.getState().receiveHistogram(padId, histogram);
            });
        histogramSubscriptions.set(padId, subscription);
    }

    if (!stateSubscriptions.has(padId)) {
        const subscription = stateSubjectGet(padId)
            .getObservable()
            .subscribe((state: HistogramPadState | undefined) => {
                useHistogramWorkspace.getState().receivePadState(padId, state);
            });
        stateSubscriptions.set(padId, subscription);
    }
}

function reconcilePads(pads: HistogramPad[]) {
    const padIds = new Set(pads.map((pad) => pad.id));

    for (const padId of histogramSubscriptions.keys()) {
        if (!padIds.has(padId)) unsubscribePad(padId);
    }

    useHistogramWorkspace.getState().replacePads(pads);

    for (const pad of pads) subscribePad(pad.id);
}

function startCoreAdapter() {
    if (configSubscription) return;

    configSubscription = configSubjectGet()
        .getObservable()
        .subscribe((value: CoreConfigValue) => {
            const configuredPads = value?.config?.environment?.histogramPads;
            reconcilePads(Array.isArray(configuredPads) ? configuredPads : []);
        });
}

function stopCoreAdapter() {
    configSubscription?.unsubscribe();
    configSubscription = null;

    for (const padId of [...histogramSubscriptions.keys()]) unsubscribePad(padId);

    useHistogramWorkspace.getState().reset();
}

export function retainHistogramWorkspace() {
    if (pendingStop) {
        clearTimeout(pendingStop);
        pendingStop = null;
    }

    consumerCount += 1;
    if (consumerCount === 1) startCoreAdapter();

    let released = false;
    return () => {
        if (released) return;
        released = true;
        consumerCount = Math.max(0, consumerCount - 1);
        if (consumerCount === 0 && !pendingStop) {
            pendingStop = setTimeout(() => {
                pendingStop = null;
                if (consumerCount === 0) stopCoreAdapter();
            }, 0);
        }
    };
}

export function getCorePadState(padId: string) {
    return stateSubjectGet(padId).getValue() as HistogramPadState | undefined;
}

export function publishPadState(padId: string, state: HistogramPadState) {
    stateSubjectGet(padId).next(state);
}

export function publishHistogram(histogram: HistogramData) {
    histogramSubjectGet().next(histogram);
}
