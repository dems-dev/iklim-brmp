import { useEffect, useState } from "react";

/** True selama lebar layar di bawah `bp` (bawaan: breakpoint `sm` Tailwind). */
export function useLayarKecil(bp = 640) {
  const [kecil, setKecil] = useState(
    () => typeof window !== "undefined" && window.innerWidth < bp
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp - 1}px)`);
    const onChange = (e) => setKecil(e.matches);
    setKecil(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [bp]);

  return kecil;
}
