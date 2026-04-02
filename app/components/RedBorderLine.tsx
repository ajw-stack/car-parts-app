"use client";

import { useEffect, useRef } from "react";

export default function RedBorderLine() {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    function update() {
      const footer = document.querySelector("footer");
      const endY = footer ? footer.getBoundingClientRect().top : window.innerHeight - 50;
      const width = window.innerWidth;
      if (pathRef.current) {
        pathRef.current.setAttribute(
          "d",
          `M ${width} 91 L 40 91 Q 10 91 10 121 L 10 ${endY}`
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
        d="M 1920 91 L 40 91 Q 10 91 10 121 L 10 2000"
        stroke="#CC0000"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
