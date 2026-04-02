"use client";

import { useEffect, useRef } from "react";

export default function RedBorderLine() {
  const lineRef  = useRef<SVGPathElement>(null);
  const fillRef  = useRef<SVGPathElement>(null);

  useEffect(() => {
    function update() {
      const header = document.querySelector("header");
      const footer = document.querySelector("footer");
      const gap        = 2;
      const headerBottom = header ? header.getBoundingClientRect().bottom : 89;
      const lineY      = headerBottom + gap;
      const lineX      = gap;
      const endY       = footer ? footer.getBoundingClientRect().top : window.innerHeight - 50;
      const width      = window.innerWidth;
      const curveSize  = 20;
      const cornerY    = lineY + curveSize;

      // Red line
      if (lineRef.current) {
        lineRef.current.setAttribute(
          "d",
          `M ${width} ${lineY} L ${lineX + curveSize} ${lineY} Q ${lineX} ${lineY} ${lineX} ${cornerY} L ${lineX} ${endY}`
        );
      }

      // Large fill: covers from top-left of page, across the top (full width),
      // down to the red line level, in along the line, round the corner, then
      // down the left strip and back. This fills everything "outside" the red
      // line with header colour so there are zero seams.
      if (fillRef.current) {
        fillRef.current.setAttribute(
          "d",
          `M 0 0
           L ${width} 0
           L ${width} ${lineY}
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
      {/* Fill everything outside the red line with header colour */}
      <path
        ref={fillRef}
        d="M 0 0 L 1920 0 L 1920 91 L 22 91 Q 2 91 2 111 L 2 5000 L 0 5000 Z"
        fill="#141414"
        stroke="none"
      />
      {/* Red border line on top */}
      <path
        ref={lineRef}
        d="M 1920 91 L 22 91 Q 2 91 2 111 L 2 5000"
        stroke="#CC0000"
        strokeWidth="2.25"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
