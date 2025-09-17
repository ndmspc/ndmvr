import { useState } from "react";

import "../../../styles/switch.css";

export default function Switch({ onToggle, label = "VR Mode", startState = false }) {
    const [checked, setChecked] = useState(startState);

    const handleChange = () => {
        setChecked(!checked);
        if (onToggle) onToggle(!checked);
    };

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                position: "fixed",
                bottom: "20px",
                left: "20px",
                zIndex: 10,
            }}
        >
            <label className="switch">
                <input type="checkbox" checked={checked} onChange={handleChange}/>
                <span className="slider round"></span>
            </label>
            <div
                style={{
                    fontFamily: "Arial",
                    paddingLeft: "10px",
                    fontWeight: "bold",
                }}
            >
                {" "}
                {label}
            </div>
        </div>
    );
}
