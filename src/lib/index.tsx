import JsrootEnv from "./components/env/JsrootEnv.tsx";
import NdmspcEnv from "./components/env/NdmspcEnv.tsx";
import NdmvrEnv from "./components/env/NdmvrEnv.tsx";
import NdmspcDefaultBrowserEnv from "./components/env/NdmspcDefaultBrowserEnv.tsx";
import CanvasComponent from "./components/scene/CanvasComponent.tsx";
import HistogramWrapper from "./components/scene/HistogramWrapper.tsx";
import NdmvrScene from "./components/scene/NdmvrScene.tsx";
import RaycasterBridge from "./components/scene/RaycasterBridge.tsx";
import CameraSync from "./components/systems/CameraSync.tsx";
import Controllers from "./components/systems/inputs/Controllers.tsx";
import DesktopController from "./components/systems/inputs/DesktopController.tsx";
import VRController from "./components/systems/inputs/VRController.tsx";
import BinInfo from "./components/ui/shared/BinInfo.tsx";
import ControlsHelp from "./components/ui/shared/ControlsHelp.tsx";
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
} from "@ndmspc/ndmvr-aframe";

export {
    NdmspcNavigator,
    JsrootEnv,
    NdmspcEnv,
    NdmvrEnv,
    NdmspcDefaultBrowserEnv,
    CanvasComponent,
    HistogramWrapper,
    NdmvrScene,
    RaycasterBridge,
    CameraSync,
    Menu,
    BinInfo,
    ControlsHelp,
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
export type { NdmvrEnvProps, HistogramContext } from "./components/env/NdmvrEnv.tsx";
export type { NdmspcDefaultBrowserEnvProps } from "./components/env/NdmspcDefaultBrowserEnv.tsx";
export type { CanvasComponentProps, CanvasLocation } from "./components/scene/CanvasComponent.tsx";
export type { HistogramWrapperProps } from "./components/scene/HistogramWrapper.tsx";
export type { NdmvrSceneProps } from "./components/scene/NdmvrScene.tsx";
export type { RaycasterBridgeProps } from "./components/scene/RaycasterBridge.tsx";
export type { CameraSyncProps } from "./components/systems/CameraSync.tsx";
export type { ControllersProps } from "./components/systems/inputs/Controllers.tsx";
export type { DesktopControllerProps } from "./components/systems/inputs/DesktopController.tsx";
export type { VRControllerProps } from "./components/systems/inputs/VRController.tsx";
export type { MenuProps } from "./components/ui/shared/Menu.tsx";
export type { BinInfoProps } from "./components/ui/shared/BinInfo.tsx";
export type { FocusContextType } from "./components/env/context/FocusContext.tsx";
export type { NdmspcConfig } from "./interfaces/NdmspcConfig.ts";
export type { NdmvrConfig } from "./interfaces/NdmvrConfig.ts";

// Re-export the XR store for consumers
export { store } from "./components/env/NdmvrEnv.tsx";
