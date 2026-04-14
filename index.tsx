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
  columns: 3,
};

function getAssetId(id: (typeof resumeImages)[number]["id"]) {
  return AssetRecordType.createId(`resume-${id}`);
}

function getShapeId(id: (typeof resumeImages)[number]["id"]) {
  return createShapeId(`resume-${id}`);
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

    const shapes = resumeImages.map((image, index) => {
      const column = index % page.columns;
      const row = Math.floor(index / page.columns);

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

    editor.run(() => {
      editor.createAssets(assets.filter((asset) => !editor.getAsset(asset.id)));
      editor.createShapes(shapes.filter((shape) => !editor.getShape(shape.id)));
    });

    editor.zoomToBounds(
      {
        x: 0,
        y: 0,
        w: page.columns * page.w + (page.columns - 1) * page.gap,
        h: 2 * page.h + page.gap,
      },
      { animation: { duration: 600 }, inset: 96 },
    );
    editor.setCurrentTool("select");
  };

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Tldraw hideUi onMount={handleMount} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
