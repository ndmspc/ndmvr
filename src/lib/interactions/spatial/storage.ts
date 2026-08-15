export interface StoredVector3 {
    x: number;
    y: number;
    z: number;
}

export interface StoredRotation {
    x: number;
    y: number;
}

export type StoredJsonResult<T> =
    | { status: "missing" }
    | { status: "invalid" }
    | { status: "value"; value: T };

export function getSpatialStorageKeys(storageKey: string) {
    return {
        offset: `${storageKey}Offset`,
        rotation: `${storageKey}Rotation`,
        follow: `${storageKey}Follow`,
        anchor: `${storageKey}Anchor`,
    };
}

export function readStoredJson<T>(key: string): StoredJsonResult<T> {
    const stored = sessionStorage.getItem(key);
    if (!stored) return { status: "missing" };

    try {
        const value = JSON.parse(stored) as T;
        return value === null
            ? { status: "invalid" }
            : { status: "value", value };
    } catch {
        return { status: "invalid" };
    }
}

export function readStoredBoolean(key: string): boolean | null {
    const stored = sessionStorage.getItem(key);
    return stored === null ? null : stored === "true";
}

export function writeStoredJson(key: string, value: unknown): void {
    sessionStorage.setItem(key, JSON.stringify(value));
}

export function writeStoredBoolean(key: string, value: boolean): void {
    sessionStorage.setItem(key, String(value));
}

export function removeStoredValue(key: string): void {
    sessionStorage.removeItem(key);
}
