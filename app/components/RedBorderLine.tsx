"use client";

import { useEffect, useRef } from "react";

export default function RedBorderLine() {
  const lineRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    function update() {
      const header = document.querySelector("header");
      const footer = document.querySelector("footer");
      const gap = 2;
      const headerBottom = header ? header.getBoundingClientRect().bottom : 89;
      const lineY = headerBottom + gap;
      const lineX = gap;
      const endY = footer ? footer.getBoundingClientRect().top : window.innerHeight - 50;
      const width = window.innerWidth;
      const curveSize = 20;
      const cornerY = lineY + curveSize;

      // The red line itself
      if (lineRef.current) {
        lineRef.current.setAttribute(
          "d",
          `M ${width} ${lineY} L ${lineX + curveSize} ${lineY} Q ${lineX} ${lineY} ${lineX} ${cornerY} L ${lineX} ${endY}`
        );
      }

      // Filled corner shape — traces the outer edge of the red line corner,
      // filling the pocket between the header colour and the red line
      if (fillRef.current) {
        fillRef.current.setAttribute(
          "d",
          `M 0 ${headerBottom}
           L ${lineX + curveSize} ${headerBottom}
           L ${lineX + curveSize} ${lineY}
           Q ${lineX} ${lineY} ${lineX} ${cornerY}
           L 0 ${cornerY}
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
      {/* Header colour fills the corner pocket */}
      <path
        ref={fillRef}
        d="M 0 89 L 22 89 L 22 91 Q 2 91 2 111 L 0 111 Z"
        fill="#141414"
        stroke="none"
      />
      {/* Red border line */}
      <path
        ref={lineRef}
        d="M 1920 91 L 22 91 Q 2 91 2 111 L 2 2000"
        stroke="#CC0000"
        strokeWidth="2.25"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
