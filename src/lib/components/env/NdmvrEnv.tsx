import NdmvrBase from "./NdmvrBase.tsx";
import NdmvrContent from "../scene/NdmvrContent.tsx";
import SceneDecorations from "../scene/SceneDecorations.tsx";
import Menu from "../ui/shared/Menu.tsx";
import Demo from "../ui/shared/Demo.tsx";
import { HttpConnectionMenu, WsConnectionMenu } from "../ui/shared/ConnectionMenu.tsx";
import BrowserMenu from "../ui/shared/BrowserMenu.tsx";
import BinInfo from "../ui/shared/BinInfo.tsx";
import DrawOptions from "../ui/shared/DrawOptions.tsx";
import SettingsPanel from "../ui/shared/SettingsPanel.tsx";
import BrowserContent from "../ui/shared/BrowserContent.tsx";
import type { BrowserConfig } from "../ui/shared/BrowserContent.tsx";

export interface NdmvrEnvProps {
    children?: React.ReactNode;
    menuDefaultOpen?: boolean;
    browserConfig?: BrowserConfig;
}

export default function NdmvrEnv({
    children,
    menuDefaultOpen = true,
    browserConfig,
}: NdmvrEnvProps) {
    return (
        <NdmvrBase>
            <SceneDecorations />
            <NdmvrContent />
            <Menu defaultOpen={menuDefaultOpen}>
                <Demo />
                <HttpConnectionMenu />
                <WsConnectionMenu />
                <BrowserMenu browserConfig={browserConfig} />
                <BinInfo />
                <DrawOptions />
                <SettingsPanel />
            </Menu>
            <BrowserContent browserConfig={browserConfig} />
            {children}
        </NdmvrBase>
    );
}
