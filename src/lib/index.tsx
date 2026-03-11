import JsrootEnv from "./components/env/JsrootEnv.tsx";
import NdmspcEnv from "./components/env/NdmspcEnv.tsx";
import NdmvrEnv from "./components/env/NdmvrEnv.tsx";
import NdmspcDefaultBrowserEnv from "./components/env/NdmspcDefaultBrowserEnv.tsx";
import CanvasComponent from "./components/scene/CanvasComponent.tsx";
import HistogramWrapper from "./components/scene/HistogramWrapper.tsx";
import NdmvrContent from "./components/scene/NdmvrContent.tsx";
import CameraSync from "./components/systems/CameraSync.tsx";
import Controllers from "./components/systems/inputs/Controllers.tsx";
import DesktopController from "./components/systems/inputs/DesktopController.tsx";
import VRController from "./components/systems/inputs/VRController.tsx";
import BinInfo from "./components/ui/shared/BinInfo.tsx";
import DrawOptions from "./components/ui/shared/DrawOptions.tsx";
import SettingsPanel from "./components/ui/shared/SettingsPanel.tsx";
import HelperTips from "./components/ui/shared/HelperTips.tsx";
import Demo from "./components/ui/shared/Demo.tsx";
import { WsConnectionMenu, HttpConnectionMenu } from "./components/ui/shared/ConnectionMenu.tsx";
import Menu from "./components/ui/shared/Menu.tsx";
import IframeService from "./components/service/IframeService.tsx";
import IframeCernboxService from "./components/service/IframeCernboxService.tsx";
import NdmspcNavigator from "./components/app/NdmspcNavigator.tsx";
import useNdmspcConfig from "./hooks/useNdmspcConfig.tsx";
import useNdmspcWebsocket from "./hooks/useNdmspcWebsocket.tsx";

import {
    histogramSubjectGet,
    brokerManagerGet,
    binInfoSubjectGet,
    canvasSubjectGet,
    configSubjectGet,
    functionSubjectGet,
    stateSubjectGet,
} from "@ndmspc/ndmvr-core";

export {
    NdmspcNavigator,
    JsrootEnv,
    NdmspcEnv,
    NdmvrEnv,
    NdmspcDefaultBrowserEnv,
    CanvasComponent,
    HistogramWrapper,
    NdmvrContent,
    CameraSync,
    Menu,
    BinInfo,
    DrawOptions,
    SettingsPanel,
    HelperTips,
    Demo,
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
    canvasSubjectGet,
    configSubjectGet,
    functionSubjectGet,
    stateSubjectGet,
    useNdmspcConfig,
    useNdmspcWebsocket,
};

// Export types for component props
export type { NdmspcEnvProps } from "./components/env/NdmspcEnv.tsx";
export type { NdmvrEnvProps } from "./components/env/NdmvrEnv.tsx";
export type { HistogramContext } from "./components/scene/NdmvrContent.tsx";
export type { NdmspcDefaultBrowserEnvProps } from "./components/env/NdmspcDefaultBrowserEnv.tsx";
export type { CanvasComponentProps, CanvasLocation } from "./components/scene/CanvasComponent.tsx";
export type { HistogramWrapperProps } from "./components/scene/HistogramWrapper.tsx";
export type { CameraSyncProps } from "./components/systems/CameraSync.tsx";
export type { ControllersProps } from "./components/systems/inputs/Controllers.tsx";
export type { DesktopControllerProps } from "./components/systems/inputs/DesktopController.tsx";
export type { VRControllerProps } from "./components/systems/inputs/VRController.tsx";
export type { MenuProps } from "./components/ui/shared/Menu.tsx";
export type { BinInfoProps } from "./components/ui/shared/BinInfo.tsx";
export type { NdmspcConfig } from "./interfaces/NdmspcConfig.ts";
export type { NdmvrConfig } from "./interfaces/NdmvrConfig.ts";

// Re-export the XR store for consumers
export { store } from "./components/env/NdmvrEnv.tsx";
