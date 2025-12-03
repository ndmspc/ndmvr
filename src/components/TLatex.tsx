import { useEffect, useState } from "react";
import { build3d, create } from "jsroot";

export default function TLatex({ formula, size = 0.05, color = 1, y = 1 }) {
    const [mesh, setMesh] = useState(null);

    useEffect(() => {
        const generate = async () => {
            try {
                const latex = create("TLatex");
                latex.fTitle = formula;
                latex.fTextAlign = 12;
                latex.fTextFont = 2;
                latex.fTitleFont = 2;
                latex.fLabelFont = 2;
                latex.fTextColor = color;
                latex.fTextSize = size;

                const textGroup = await build3d(latex, "p", y * 100, "", "");
                setMesh(textGroup);
            } catch (error) {
                console.error("Error creating text line:", error);
            }
        };

        generate();
    }, [formula, size, color, y]);

    return mesh ? <primitive object={mesh} /> : null;
}
