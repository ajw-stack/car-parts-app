"use client";

import { useEffect, useRef } from "react";

export default function RedBorderLine() {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    function update() {
      const header = document.querySelector("header");
      const footer = document.querySelector("footer");
      const gap = 2;
      const lineY = header ? header.getBoundingClientRect().bottom + gap : 91;
      const lineX = gap;
      const endY = footer ? footer.getBoundingClientRect().top : window.innerHeight - 50;
      const width = window.innerWidth;
      const cornerY = lineY + 20;
      if (pathRef.current) {
        pathRef.current.setAttribute(
          "d",
          `M ${width} ${lineY} L ${lineX + 20} ${lineY} Q ${lineX} ${lineY} ${lineX} ${cornerY} L ${lineX} ${endY}`
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
        ref={pathRef}
        d="M 1920 91 L 22 91 Q 2 91 2 111 L 2 2000"
        stroke="#CC0000"
        strokeWidth="2.25"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
