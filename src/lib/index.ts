import JsrootEnv from "./components/env/JsrootEnv.tsx";
import NdmspcEnv from "./components/env/NdmspcEnv.tsx";
import NdmvrEnv from "./components/env/NdmvrEnv.tsx";
import NdmvrBase from "./components/env/NdmvrBase.tsx";
import NdmspcDefaultBrowserEnv from "./components/env/NdmspcDefaultBrowserEnv.tsx";
import SceneDecorations from "./components/scene/SceneDecorations.tsx";
import HistogramWrapper from "./components/scene/HistogramWrapper.tsx";
import NdmvrContent from "./components/scene/NdmvrContent.tsx";
import CameraSync from "./components/systems/CameraSync.tsx";
import Controllers from "./components/systems/inputs/Controllers.tsx";
import DesktopController from "./components/systems/inputs/DesktopController.tsx";
import VRController from "./components/systems/inputs/VRController.tsx";
import BinInfo from "./components/ui/shared/menu/panels/BinInfo.tsx";
import DrawOptions from "./components/ui/shared/menu/panels/DrawOptions.tsx";
import SettingsPanel from "./components/ui/shared/menu/panels/settings/SettingsPanel.tsx";
import Demo from "./components/ui/shared/menu/panels/Demo.tsx";
import ModeToolsPanel from "./components/ui/shared/panels/ModeToolsPanel.tsx";
import { WsConnectionMenu, HttpConnectionMenu } from "./components/ui/shared/menu/panels/ConnectionMenu.tsx";
import Menu from "./components/ui/shared/menu/Menu.tsx";
import IframeService from "./components/service/IframeService.tsx";
import IframeCernboxService from "./components/service/IframeCernboxService.tsx";
import NdmspcNavigator from "./components/env/NdmspcNavigator.tsx";
import useNdmspcConfig from "./hooks/useNdmspcConfig.ts";
import useNdmspcWebsocket from "./hooks/useNdmspcWebsocket.ts";

import { useSceneModeStore, defaultSceneModesConfig } from "./stores/sceneMode/store.ts";

import {
    histogramSubjectGet,
    brokerManagerGet,
    binInfoSubjectGet,
    configSubjectGet,
    functionSubjectGet,
    stateSubjectGet,
} from "@ndmspc/ndmvr-core";


export {
    NdmspcNavigator,
    JsrootEnv,
    NdmspcEnv,
    NdmvrEnv,
    NdmvrBase,
    NdmspcDefaultBrowserEnv,
    SceneDecorations,
    HistogramWrapper,
    NdmvrContent,
    CameraSync,
    Menu,
    BinInfo,
    DrawOptions,
    SettingsPanel,
    Demo,
    ModeToolsPanel,
    WsConnectionMenu,
    HttpConnectionMenu,
    VRController,
    DesktopController,
    Controllers,
    IframeService,
    IframeCernboxService,
    // useNdmspcConfig,
    histogramSubjectGet,
    brokerManagerGet,
    binInfoSubjectGet,
    configSubjectGet,
    functionSubjectGet,
    stateSubjectGet,
    useNdmspcConfig,
    useNdmspcWebsocket,
    useSceneModeStore,
    defaultSceneModesConfig
};

// Export types for component props
export type { NdmspcEnvProps } from "./components/env/NdmspcEnv.tsx";
export type { BrowserConfig } from "./components/ui/shared/browser/BrowserContent.tsx";
export type { NdmvrEnvProps } from "./components/env/NdmvrEnv.tsx";
export type { NdmvrBaseProps } from "./components/env/NdmvrBase.tsx";
export type { NdmspcDefaultBrowserEnvProps } from "./components/env/NdmspcDefaultBrowserEnv.tsx";
export type { HistogramWrapperProps } from "./components/scene/HistogramWrapper.tsx";
export type {
    HistogramEventName,
    HistogramEventFunction,
    HistogramEventFunctionConfig,
    ModeToolIcon,
    ModeToolIconProps,
    SceneModeConfig,
    SceneModesConfig,
} from "./stores/sceneMode/store.ts";
export type { CameraSyncProps } from "./components/systems/CameraSync.tsx";
export type { ControllersProps } from "./components/systems/inputs/Controllers.tsx";
export type { DesktopControllerProps } from "./components/systems/inputs/DesktopController.tsx";
export type { VRControllerProps } from "./components/systems/inputs/VRController.tsx";
export type { MenuProps } from "./components/ui/shared/menu/Menu.tsx";
export type { BinInfoProps } from "./components/ui/shared/menu/panels/BinInfo.tsx";
export type { NdmspcConfig } from "./interfaces/NdmspcConfig.ts";
export type { NdmvrConfig } from "./interfaces/NdmvrConfig.ts";

// Re-export the XR store for consumers
export { store } from "./stores/xr/store.ts";
