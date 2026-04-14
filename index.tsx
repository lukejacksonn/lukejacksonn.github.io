import { createRoot } from "react-dom/client";
import { AssetRecordType, createShapeId, type Editor, type TLImageAsset, Tldraw } from "tldraw";
import "tldraw/tldraw.css";

const resumeImages = [
  { id: "cover", label: "Cover" },
  { id: "readme", label: "Readme" },
  { id: "work", label: "Work" },
  { id: "toolbox", label: "Toolbox" },
  { id: "extra", label: "Extra" },
  { id: "contact", label: "Contact" },
] as const;

const page = {
  w: 1190,
  h: 1684,
  gap: 120,
};

function getAssetId(id: (typeof resumeImages)[number]["id"]) {
  return AssetRecordType.createId(`resume-${id}`);
}

function getShapeId(id: (typeof resumeImages)[number]["id"]) {
  return createShapeId(`resume-${id}`);
}

function getResumeLayout(viewport: { w: number; h: number }) {
  const columns = viewport.w >= viewport.h ? 3 : 2;
  const rows = Math.ceil(resumeImages.length / columns);

  return {
    columns,
    bounds: {
      x: 0,
      y: 0,
      w: columns * page.w + (columns - 1) * page.gap,
      h: rows * page.h + (rows - 1) * page.gap,
    },
  };
}

function getResumeShapes(columns: number) {
  return resumeImages.map((image, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);

    return {
      id: getShapeId(image.id),
      type: "image" as const,
      x: column * (page.w + page.gap),
      y: row * (page.h + page.gap),
      props: {
        assetId: getAssetId(image.id),
        w: page.w,
        h: page.h,
        altText: `Resume ${image.label.toLowerCase()} page`,
      },
    };
  });
}

function layoutResumeImages(editor: Editor, animate = false) {
  const layout = getResumeLayout(editor.getViewportScreenBounds());
  const shapes = getResumeShapes(layout.columns);

  editor.run(() => {
    editor.createShapes(shapes.filter((shape) => !editor.getShape(shape.id)));
    editor.updateShapes(shapes.filter((shape) => editor.getShape(shape.id)));
  });

  editor.zoomToBounds(layout.bounds, {
    animation: animate ? { duration: 600 } : undefined,
    inset: 96,
  });
}

function App() {
  const handleMount = (editor: Editor) => {
    const assets: TLImageAsset[] = resumeImages.map((image) => ({
      id: getAssetId(image.id),
      type: "image",
      typeName: "asset",
      meta: {},
      props: {
        w: page.w,
        h: page.h,
        name: `${image.id}.png`,
        isAnimated: false,
        mimeType: "image/png",
        src: `${import.meta.env.BASE_URL}images/resume/${image.id}.png`,
      },
    }));

    editor.run(() => {
      editor.createAssets(assets.filter((asset) => !editor.getAsset(asset.id)));
    });

    layoutResumeImages(editor, true);

    const handleResize = () => layoutResumeImages(editor);
    editor.on("resize", handleResize);

    editor.setCurrentTool("select");

    return () => {
      editor.off("resize", handleResize);
    };
  };

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Tldraw hideUi onMount={handleMount} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
