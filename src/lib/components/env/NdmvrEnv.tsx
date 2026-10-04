import NdmvrBase from "./NdmvrBase.tsx";
import NdmvrContent from "../scene/NdmvrContent.tsx";
import SceneDecorations from "../scene/SceneDecorations.tsx";
import Menu from "../ui/shared/menu/Menu.tsx";
import Demo from "../ui/shared/menu/panels/Demo.tsx";
import { HttpConnectionMenu, WsConnectionMenu } from "../ui/shared/menu/panels/ConnectionMenu.tsx";
import BrowserMenu from "../ui/shared/menu/BrowserMenu.tsx";
import BinInfo from "../ui/shared/menu/panels/BinInfo.tsx";
import DrawOptions from "../ui/shared/menu/panels/DrawOptions.tsx";
import SettingsPanel from "../ui/shared/menu/panels/settings/SettingsPanel.tsx";
import BrowserContent from "../ui/shared/browser/BrowserContent.tsx";
import type { BrowserConfig } from "../ui/shared/browser/BrowserContent.tsx";

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
