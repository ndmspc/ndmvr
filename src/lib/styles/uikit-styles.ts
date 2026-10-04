import { setPreferredColorScheme, StyleSheet } from "@pmndrs/uikit";

setPreferredColorScheme("dark");

StyleSheet["foobar"] = {};

StyleSheet["buttonPrimary"] = {
    width: "100%",
    backgroundColor: "#10b981",
    color: "#ffffff",
    borderWidth: 0,
    borderRadius: 8,
    paddingY: 12,
};

StyleSheet["webSocketButton"] = {
    backgroundColor: "#10b981",
    color: "#ffffff",
    borderWidth: 0,
    borderRadius: 8,
    padding: 4,
    fontSize: 12,
};

StyleSheet["menuContainer"] = {
    minWidth: 300,
    backgroundColor: "#1e293b",
    color: "#fff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
    flexDirection: "column",
    alignItems: "center",
};

StyleSheet["menuHeader"] = {
    textAlign: "center",
    color: "#f1f5f9",
    marginBottom: 12,
    fontSize: 20,
};

StyleSheet["menuBlock"] = {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
    flexDirection: "column",
};

StyleSheet["section"] = {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
};

StyleSheet["sectionInner"] = {
    display: "flex",
    flexDirection: "column",
    gap: 12,
};

StyleSheet["input"] = {
    backgroundColor: "#020617",
    borderColor: "#475569",
    color: "#f1f5f9",
    borderWidth: 1,
    paddingX: 12,
    paddingY: 12,
    borderRadius: 8,
    focus: {
        borderColor: "#10b981",
    },
};

StyleSheet["chevron"] = {
    color: "#475569",
    borderWidth: 1,
};

StyleSheet["dropdown"] = {
    display: "flex",
    backgroundColor: "#020617",
    borderColor: "#475569",
    color: "#f1f5f9",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    hover: {
        borderColor: "#10b981",
    },
    cursor: "pointer",
};

StyleSheet["dropdownText"] = {
    flexGrow: 1,
};

StyleSheet["dropdownListWrapper"] = {
    backgroundColor: "#020617",
    borderColor: "#475569",
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 10,
    overflow: "hidden",
};

StyleSheet["dropdownList"] = {
    width: "100%",
    height: "100%",
    backgroundColor: "#020617",
    color: "#f1f5f9",
    borderRadius: 8,
    overflow: "scroll",
    scrollbarColor: "#475569",
};

StyleSheet["dropdownItem"] = {
    height: 40,
    alignItems: "center",
    paddingX: 12,
    cursor: "pointer",
};

StyleSheet["dropdownItemSelected"] = {
    fontWeight: "bold",
};

StyleSheet["checkboxContainer"] = {
    cursor: "pointer",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
};

StyleSheet["checkboxBox"] = {
    backgroundColor: "#020617",
    borderColor: "#475569",
    borderWidth: 2,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    hover: {
        borderColor: "#10b981",
    },
};

StyleSheet["checkboxBoxChecked"] = {
    backgroundColor: "#022c22",
};

StyleSheet["checkboxLabel"] = {
    color: "#f1f5f9",
};

StyleSheet["VRButton"] = {
    backgroundColor: "#334155",
    color: "#f1f5f9",
    borderRadius: 16,
};

StyleSheet["ModeToolsPanelWrapper"] = {
    positionType: "absolute",
    positionLeft: 0,
    positionRight: 0,
    width: "100%",
    positionBottom: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    zIndex: 12,
};

StyleSheet["ModeToolsPanel"] = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    borderRadius: 16,
    backgroundColor: "rgba(20, 24, 31, 0.32)",
    receiveShadow: true,
};

StyleSheet["NotificationBubble"] = {
    width: "auto",
    maxWidth: 320,
    paddingX: 12,
    paddingY: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    borderRadius: 14,
    backgroundColor: "rgba(10, 14, 20, 0.86)",
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: 13,
    lineHeight: 1.35,
    textAlign: "center",
    whiteSpace: "pre-line",
    wordBreak: "break-word",
};

StyleSheet["ToolButton"] = {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    borderWidth: 1,
    borderRadius: 14,
    cursor: "pointer",
};

StyleSheet["ToolButtonIcon"] = {
    width: 20,
    height: 20,
    color: "rgba(255, 255, 255, 0.74)",
};

