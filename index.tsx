import type { TouchEventHandler } from "react";
import { createRoot } from "react-dom/client";
import {
  AssetRecordType,
  Vec,
  createShapeId,
  type Editor,
  type TLEventInfo,
  type TLImageAsset,
  type TLShapeId,
  Tldraw,
} from "tldraw";
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

function isResumeShapeId(shapeId: TLShapeId) {
  return resumeImages.some((image) => getShapeId(image.id) === shapeId);
}

function getResumeShapeIdFromElement(target: EventTarget | null) {
  if (!(target instanceof Element)) return;

  const shapeElement = target.closest("[data-shape-id]");
  const shapeId = shapeElement?.getAttribute("data-shape-id") as TLShapeId | null;

  if (!shapeId) return;
  if (!isResumeShapeId(shapeId)) return;

  return shapeId;
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

function zoomToResumeImage(editor: Editor, shapeId: TLShapeId) {
  const bounds = editor.getShapePageBounds(shapeId);
  if (!bounds) return;

  editor.zoomToBounds(bounds, {
    animation: { duration: 450 },
    inset: 96,
  });
}

function getResumeShapeIdAtPointer(editor: Editor, info: TLEventInfo) {
  if (info.type !== "pointer") return;

  const shape =
    info.target === "shape"
      ? info.shape
      : editor.getShapeAtPoint(editor.inputs.getCurrentPagePoint(), {
          hitInside: true,
          margin: editor.options.hitTestMargin / editor.getZoomLevel(),
          renderingOnly: true,
        });

  if (!shape) return;
  if (!isResumeShapeId(shape.id)) return;

  return shape.id;
}

function App() {
  const handleTouchCapture: TouchEventHandler<HTMLDivElement> = (event) => {
    if (getResumeShapeIdFromElement(event.target)) {
      event.stopPropagation();
    }
  };

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
        // These are rectangular pages, so we can skip tldraw's transparent PNG alpha hit-testing.
        mimeType: null,
        src: `${import.meta.env.BASE_URL}images/resume/${image.id}.png`,
      },
    }));

    editor.run(() => {
      editor.createAssets(assets.filter((asset) => !editor.getAsset(asset.id)));
    });

    layoutResumeImages(editor, true);

    const handleResize = () => layoutResumeImages(editor);
    let pointerDown:
      | {
          point: Vec;
          pointerId: number;
          shapeId: TLShapeId;
        }
      | undefined;

    const handleEvent = (info: TLEventInfo) => {
      if (info.type !== "pointer") return;
      if (info.button !== 0) return;

      const shapeId = getResumeShapeIdAtPointer(editor, info);

      if (!shapeId) {
        pointerDown = undefined;
        return;
      }

      if (info.name === "pointer_down") {
        pointerDown = {
          point: Vec.From(info.point),
          pointerId: info.pointerId,
          shapeId,
        };
        return;
      }

      if (info.name !== "pointer_up") return;
      if (!pointerDown) return;
      if (pointerDown.pointerId !== info.pointerId || pointerDown.shapeId !== shapeId) return;

      const distance = Vec.Dist(pointerDown.point, Vec.From(info.point));
      pointerDown = undefined;

      if (distance > 8) return;

      zoomToResumeImage(editor, shapeId);
    };

    editor.on("resize", handleResize);
    editor.on("event", handleEvent);

    editor.setCurrentTool("select");

    return () => {
      editor.off("resize", handleResize);
      editor.off("event", handleEvent);
    };
  };

  return (
    <div
      style={{ position: "fixed", inset: 0 }}
      onTouchEndCapture={handleTouchCapture}
      onTouchStartCapture={handleTouchCapture}
    >
      <Tldraw hideUi onMount={handleMount} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
