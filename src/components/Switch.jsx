import { useState } from "react";
import "../styles/switch.css";

export default function Switch({ onToggle, label = "JSROOT Mode" }) {
  const [checked, setChecked] = useState(false);

  const handleChange = () => {
    setChecked(!checked);
    if (onToggle) onToggle(!checked);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
      }}
    >
      <label className="switch">
        <input type="checkbox" checked={checked} onChange={handleChange} />
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
