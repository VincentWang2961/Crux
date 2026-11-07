import { MatrixGlobe } from "./matrix-globe";

// No card wrapper: the globe floats directly on the page background.
export function GlobeSection() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">服务器节点 Servers</h2>
      <div className="flex justify-center">
        <MatrixGlobe />
      </div>
    </section>
  );
}
