"use client";

import { useEffect, useRef } from "react";

export default function RedBorderLine() {
  const lineRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    function update() {
      const header = document.querySelector("header");
      const footer = document.querySelector("footer");

      const gap          = 2;   // gap between fill edge and red line, all sides
      const lineX        = 10;  // x position of red line's vertical segment
      const curveSize    = 20;

      const headerBottom = header ? header.getBoundingClientRect().bottom : 89;
      const lineY        = headerBottom + gap;
      const cornerY      = lineY + curveSize;
      const endY         = footer ? footer.getBoundingClientRect().top : window.innerHeight - 50;
      const width        = window.innerWidth;

      // Red line: horizontal → curve → vertical
      if (lineRef.current) {
        lineRef.current.setAttribute(
          "d",
          `M ${width} ${lineY} L ${lineX + curveSize} ${lineY} Q ${lineX} ${lineY} ${lineX} ${cornerY} L ${lineX} ${endY}`
        );
      }

      // Fill: covers the header-colour region outside the red line.
      // Offset inward by `gap` so there's consistent whitespace between fill and line.
      // fill right edge on vertical  = lineX - gap
      // fill curve control offset    = (lineX - gap, headerBottom)  [= lineY - gap]
      if (fillRef.current) {
        fillRef.current.setAttribute(
          "d",
          `M 0 ${headerBottom}
           L ${lineX + curveSize} ${headerBottom}
           Q ${lineX - gap} ${headerBottom} ${lineX - gap} ${cornerY}
           L ${lineX - gap} ${endY}
           L 0 ${endY}
           Z`
        );
      }
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <svg
      className="pointer-events-none fixed top-0 left-0 z-40"
      style={{ width: "100vw", height: "100vh", overflow: "visible" }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        ref={fillRef}
        d=""
        fill="#141414"
        stroke="none"
      />
      <path
        ref={lineRef}
        d=""
        stroke="#CC0000"
        strokeWidth="2.25"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
