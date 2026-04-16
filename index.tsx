import { useCallback, useRef, useState, type TouchEventHandler } from "react";
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
  { id: "about", label: "About" },
  { id: "work", label: "Work" },
  { id: "toolbox", label: "Toolbox" },
  { id: "extra", label: "Extra" },
  { id: "contact", label: "Contact" },
] as const;

const homeImages = [
  { id: "intro", label: "Intro", file: "Intro.png", w: 595, h: 595 },
  { id: "resume", label: "Resume", file: "Resume.png", w: 287, h: 287 },
  { id: "photos", label: "Photos", file: "Photos.png", w: 287, h: 287 },
  { id: "inspiration", label: "Inspiration", file: "Inspiration.png", w: 287, h: 287 },
  { id: "portfolio", label: "Portfolio", file: "Portfolio.png", w: 287, h: 287 },
] as const;

type Screen = "home" | "resume";

const page = {
  w: 1190,
  h: 1684,
  gap: 120,
};

const home = {
  w: 595,
  h: 595,
  tile: 287,
  gap: 21,
};

function getResumeAssetId(id: (typeof resumeImages)[number]["id"]) {
  return AssetRecordType.createId(`resume-${id}`);
}

function getResumeShapeId(id: (typeof resumeImages)[number]["id"]) {
  return createShapeId(`resume-${id}`);
}

function getHomeAssetId(id: (typeof homeImages)[number]["id"]) {
  return AssetRecordType.createId(`home-${id}`);
}

function getHomeShapeId(id: (typeof homeImages)[number]["id"]) {
  return createShapeId(`home-${id}`);
}

function isResumeShapeId(shapeId: TLShapeId) {
  return resumeImages.some((image) => getResumeShapeId(image.id) === shapeId);
}

function isHomeResumeShapeId(shapeId: TLShapeId) {
  return shapeId === getHomeShapeId("resume");
}

function isHomeShapeId(shapeId: TLShapeId) {
  return homeImages.some((image) => getHomeShapeId(image.id) === shapeId);
}

function isSeededShapeId(shapeId: TLShapeId) {
  return isResumeShapeId(shapeId) || isHomeShapeId(shapeId);
}

function getSeededShapeIdFromElement(target: EventTarget | null) {
  if (!(target instanceof Element)) return;

  const shapeElement = target.closest("[data-shape-id]");
  const shapeId = shapeElement?.getAttribute("data-shape-id") as TLShapeId | null;

  if (!shapeId) return;
  if (!isSeededShapeId(shapeId)) return;

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
      id: getResumeShapeId(image.id),
      type: "image" as const,
      x: column * (page.w + page.gap),
      y: row * (page.h + page.gap),
      props: {
        assetId: getResumeAssetId(image.id),
        w: page.w,
        h: page.h,
        altText: `Resume ${image.label.toLowerCase()} page`,
      },
    };
  });
}

function getHomeLayout(viewport: { w: number; h: number }) {
  const isLandscape = viewport.w >= viewport.h;
  const firstTile = home.w + home.gap;
  const secondTile = firstTile + home.tile + home.gap;

  return {
    bounds: {
      x: 0,
      y: 0,
      w: isLandscape ? home.w + home.gap + home.tile + home.gap + home.tile : home.w,
      h: isLandscape ? home.h : home.h + home.gap + home.tile + home.gap + home.tile,
    },
    positions: {
      intro: { x: 0, y: 0 },
      resume: { x: isLandscape ? firstTile : 0, y: isLandscape ? 0 : firstTile },
      photos: {
        x: isLandscape ? secondTile : home.tile + home.gap,
        y: isLandscape ? 0 : firstTile,
      },
      inspiration: {
        x: isLandscape ? firstTile : 0,
        y: isLandscape ? home.tile + home.gap : secondTile,
      },
      portfolio: {
        x: isLandscape ? secondTile : home.tile + home.gap,
        y: isLandscape ? home.tile + home.gap : secondTile,
      },
    },
  };
}

function getHomeShapes(viewport: { w: number; h: number }) {
  const layout = getHomeLayout(viewport);

  return homeImages.map((image) => ({
    id: getHomeShapeId(image.id),
    type: "image" as const,
    x: layout.positions[image.id].x,
    y: layout.positions[image.id].y,
    props: {
      assetId: getHomeAssetId(image.id),
      w: image.w,
      h: image.h,
      altText: image.label,
    },
  }));
}

function clearCanvas(editor: Editor) {
  editor.selectNone();
  editor.deleteShapes([...editor.getCurrentPageShapeIds()]);
}

function createImageAssets(editor: Editor, assets: TLImageAsset[]) {
  editor.createAssets(assets.filter((asset) => !editor.getAsset(asset.id)));
}

function createOrUpdateShapes(editor: Editor, shapes: ReturnType<typeof getResumeShapes>) {
  editor.createShapes(shapes.filter((shape) => !editor.getShape(shape.id)));
  editor.updateShapes(shapes.filter((shape) => editor.getShape(shape.id)));
}

function zoomToBounds(
  editor: Editor,
  bounds: { x: number; y: number; w: number; h: number },
  animate = false,
) {
  editor.zoomToBounds(bounds, {
    animation: animate ? { duration: 600 } : undefined,
    inset: 96,
  });
}

function createResumeAssets(): TLImageAsset[] {
  return resumeImages.map((image) => ({
    id: getResumeAssetId(image.id),
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
}

function createHomeAssets(): TLImageAsset[] {
  return homeImages.map((image) => ({
    id: getHomeAssetId(image.id),
    type: "image",
    typeName: "asset",
    meta: {},
    props: {
      w: image.w,
      h: image.h,
      name: image.file,
      isAnimated: false,
      mimeType: null,
      src: `${import.meta.env.BASE_URL}images/home/${image.file}`,
    },
  }));
}

function layoutResumeImages(editor: Editor, animate = false, clear = false) {
  const layout = getResumeLayout(editor.getViewportScreenBounds());
  const shapes = getResumeShapes(layout.columns);

  editor.run(() => {
    if (clear) clearCanvas(editor);
    createImageAssets(editor, createResumeAssets());
    createOrUpdateShapes(editor, shapes);
  });

  zoomToBounds(editor, layout.bounds, animate);
}

function layoutHomeImages(editor: Editor, animate = false, clear = false) {
  const viewport = editor.getViewportScreenBounds();
  const layout = getHomeLayout(viewport);
  const shapes = getHomeShapes(viewport);

  editor.run(() => {
    if (clear) clearCanvas(editor);
    createImageAssets(editor, createHomeAssets());
    createOrUpdateShapes(editor, shapes);
  });

  zoomToBounds(editor, layout.bounds, animate);
}

function zoomToResumeImage(editor: Editor, shapeId: TLShapeId) {
  const bounds = editor.getShapePageBounds(shapeId);
  if (!bounds) return;

  editor.zoomToBounds(bounds, {
    animation: { duration: 450 },
    inset: 96,
  });
}

function getShapeIdAtPointer(editor: Editor, info: TLEventInfo) {
  if (info.type !== "pointer") return;

  const shape =
    info.target === "shape"
      ? info.shape
      : editor.getShapeAtPoint(editor.inputs.getCurrentPagePoint(), {
        hitInside: true,
        margin: editor.options.hitTestMargin / editor.getZoomLevel(),
        renderingOnly: true,
      });

  return shape?.id;
}

function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const editorRef = useRef<Editor | null>(null);
  const screenRef = useRef<Screen>("home");

  const setCurrentScreen = useCallback((nextScreen: Screen, animate = true, clear = true) => {
    const editor = editorRef.current;

    screenRef.current = nextScreen;
    setScreen(nextScreen);

    if (!editor) return;

    if (nextScreen === "home") {
      layoutHomeImages(editor, animate, clear);
    } else {
      layoutResumeImages(editor, animate, clear);
    }
  }, []);

  const handleTouchCapture: TouchEventHandler<HTMLDivElement> = (event) => {
    if (getSeededShapeIdFromElement(event.target)) {
      event.stopPropagation();
    }
  };

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      const layoutCurrentScreen = (animate = false, clear = false) => {
        if (screenRef.current === "home") {
          layoutHomeImages(editor, animate, clear);
        } else {
          layoutResumeImages(editor, animate, clear);
        }
      };

      layoutCurrentScreen(true, true);

      const handleResize = () => layoutCurrentScreen();
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

        const targetShapeId = getShapeIdAtPointer(editor, info);

        if (!targetShapeId) {
          pointerDown = undefined;
          return;
        }

        if (info.name === "pointer_down") {
          pointerDown = {
            point: Vec.From(info.point),
            pointerId: info.pointerId,
            shapeId: targetShapeId,
          };
          return;
        }

        if (info.name !== "pointer_up") return;
        if (!pointerDown) return;
        if (pointerDown.pointerId !== info.pointerId || pointerDown.shapeId !== targetShapeId)
          return;

        const distance = Vec.Dist(pointerDown.point, Vec.From(info.point));
        pointerDown = undefined;

        if (distance > 8) return;

        if (screenRef.current === "home" && isHomeResumeShapeId(targetShapeId)) {
          setCurrentScreen("resume");
          return;
        }

        if (screenRef.current === "resume" && isResumeShapeId(targetShapeId)) {
          zoomToResumeImage(editor, targetShapeId);
        }
      };

      editor.on("resize", handleResize);
      editor.on("event", handleEvent);

      editor.setCurrentTool("select");

      return () => {
        editor.off("resize", handleResize);
        editor.off("event", handleEvent);
        editorRef.current = null;
      };
    },
    [setCurrentScreen],
  );

  const handleBack = () => {
    setCurrentScreen("home");
  };

  return (
    <div
      style={{ position: "fixed", inset: 0 }}
      onTouchEndCapture={handleTouchCapture}
      onTouchStartCapture={handleTouchCapture}
    >
      <Tldraw hideUi onMount={handleMount} />
      {screen !== "home" && (
        <button
          type="button"
          aria-label="Back to home"
          onClick={handleBack}
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            zIndex: 1,
            display: "grid",
            placeItems: "center",
            width: 72,
            height: 72,
            padding: 0,
            border: "1px solid rgba(0, 0, 0, 0.14)",
            borderRadius: 8,
            background: "#ffffff",
            color: "#111111",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          <svg aria-hidden="true" width="42" height="42" viewBox="0 0 24 24">
            <path
              d="M15 5 8 12l7 7"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
