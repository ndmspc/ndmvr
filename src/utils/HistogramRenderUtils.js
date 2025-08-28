export function computeBinSizePos(rootObj, relPos, padding, overallSize = { x: 1, y: 1, z: 1 }) {
  const getAxisData = (axis) => {
    const bins = rootObj[axis].fNbins;
    const min = rootObj[axis].fXmin;
    const max = rootObj[axis].fXmax;
    const step = (max - min) / bins;
    return { bins, min, step };
  };

  const axX = getAxisData("fXaxis");
  const axY = getAxisData("fYaxis");
  const axZ = getAxisData("fZaxis");

  const center = (step, i, padding) => (i - 0.5) * step + padding * (i - 1);
  const size = (step, padding) => step - padding;

  return {
    x: {
      pos: center(axX.step, relPos.x, padding.x),
      size: size(axX.step, padding.x) * overallSize.x,
    },
    y: {
      pos: center(axY.step, relPos.y, padding.y),
      size: size(axY.step, padding.y) * overallSize.y,
    },
    z: {
      pos: center(axZ.step, relPos.z, padding.z),
      size: size(axZ.step, padding.z) * overallSize.z,
    },
  };
}
