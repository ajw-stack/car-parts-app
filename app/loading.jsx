export default function Loading() {
  return (
    <div className="loading-screen">
      <div className="wheel">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="wheel-bar" style={{ "--i": i }} />
        ))}
      </div>
    </div>
  );
}
