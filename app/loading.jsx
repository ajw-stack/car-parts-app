import Image from "next/image";

export default function Loading() {
  return (
    <div className="loading-screen">
      <div className="wheel">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="wheel-bar" style={{ "--i": i }} />
        ))}

        <div className="wheel-logo">
          <Image
            src="/gpc-full-logo.png"
            alt="Logo"
            width={28}
            height={28}
          />
        </div>
      </div>
    </div>
  );
}