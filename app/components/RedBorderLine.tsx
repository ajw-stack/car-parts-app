"use client";

import { useEffect, useRef } from "react";

export default function RedBorderLine() {
  const lineRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    function update() {
      const header = document.querySelector("header");
      const footer = document.querySelector("footer");
      const gap        = 2;
      const headerBottom = header ? header.getBoundingClientRect().bottom : 89;
      const lineY      = headerBottom + gap;
      const lineX      = gap;
      const endY       = footer ? footer.getBoundingClientRect().top : window.innerHeight - 50;
      const curveSize  = 20;
      const cornerY    = lineY + curveSize;

      // Red line
      if (lineRef.current) {
        lineRef.current.setAttribute(
          "d",
          `M 2000 ${lineY} L ${lineX + curveSize} ${lineY} Q ${lineX} ${lineY} ${lineX} ${cornerY} L ${lineX} ${endY}`
        );
      }

      // Fill only the region outside the red line but BELOW the header —
      // the horizontal gap strip + the curved corner + the left vertical strip
      if (fillRef.current) {
        fillRef.current.setAttribute(
          "d",
          `M 0 ${headerBottom}
           L ${lineX + curveSize} ${headerBottom}
           L ${lineX + curveSize} ${lineY}
           Q ${lineX} ${lineY} ${lineX} ${cornerY}
           L ${lineX} ${endY}
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
        d="M 0 89 L 22 89 L 22 91 Q 2 91 2 111 L 2 5000 L 0 5000 Z"
        fill="#141414"
        stroke="none"
      />
      <path
        ref={lineRef}
        d="M 2000 91 L 22 91 Q 2 91 2 111 L 2 5000"
        stroke="#CC0000"
        strokeWidth="2.25"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
