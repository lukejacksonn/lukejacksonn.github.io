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
  { id: "Cover", label: "Cover", file: "Cover.png" },
  { id: "About", label: "About", file: "About.png" },
  { id: "Work", label: "Work", file: "Work.png" },
  { id: "Toolbox", label: "Toolbox", file: "Toolbox.png" },
  { id: "Extra", label: "Extra", file: "Extra.png" },
  { id: "Contact", label: "Contact", file: "Contact.png" },
] as const;

const portfolioImages = [
  { id: "Nitros", label: "Nitros", file: "Nitros.png" },
  { id: "EnergyRank", label: "Energy Rank", file: "EnergyRank.png" },
  { id: "TinyShop", label: "TinyShop", file: "TinyShop.png" },
  { id: "Chatea", label: "Chatea", file: "Chatea.png" },
  { id: "Huddlum", label: "Huddlum", file: "Huddlum.png" },
  { id: "Paddock", label: "Paddock", file: "Paddock.png" },
] as const;

const inspirationImages = [
  { id: "People", label: "People", file: "People.png" },
  { id: "Films", label: "Films", file: "Films.png" },
  { id: "Things", label: "Things", file: "Things.png" },
  { id: "Places", label: "Places", file: "Places.png" },
  { id: "Music", label: "Music", file: "Music.png" },
  { id: "Books", label: "Books", file: "Books.png" },
] as const;

const photoImages = [
  { id: "2026", label: "2026", file: "2026.png" },
  { id: "2025", label: "2025", file: "2025.png" },
  { id: "2024", label: "2024", file: "2024.png" },
  { id: "2023", label: "2023", file: "2023.png" },
  { id: "2022", label: "2022", file: "2022.png" },
  { id: "2021", label: "2021", file: "2021.png" },
] as const;

const pageGroups = [
  { id: "resume", label: "Resume", folder: "resume", images: resumeImages },
  { id: "portfolio", label: "Portfolio", folder: "portfolio", images: portfolioImages },
  { id: "inspiration", label: "Inspiration", folder: "inspiration", images: inspirationImages },
  { id: "photos", label: "Photos", folder: "photos", images: photoImages },
] as const;

const homeImages = [
  { id: "intro", label: "Intro", file: "Intro.png", w: 595, h: 595 },
  { id: "resume", label: "Resume", file: "Resume.png", w: 287, h: 287 },
  { id: "photos", label: "Photos", file: "Photos.png", w: 287, h: 287 },
  { id: "inspiration", label: "Inspiration", file: "Inspiration.png", w: 287, h: 287 },
  { id: "portfolio", label: "Portfolio", file: "Portfolio.png", w: 287, h: 287 },
] as const;

type PageGroupId = (typeof pageGroups)[number]["id"];
type Bounds = { x: number; y: number; w: number; h: number };
type CanvasFocus =
  | { type: "home" }
  | { type: "grid" }
  | { type: "shape"; groupId: PageGroupId; shapeId: TLShapeId };
type VisiblePages = "all" | "none" | PageGroupId;

const cameraAnimationMs = 600;

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

function getPageAssetId(groupId: string, imageId: string) {
  return AssetRecordType.createId(`page-${groupId}-${imageId}`);
}

function getPageShapeId(groupId: string, imageId: string) {
  return createShapeId(`page-${groupId}-${imageId}`);
}

function getHomeAssetId(id: (typeof homeImages)[number]["id"]) {
  return AssetRecordType.createId(`home-${id}`);
}

function getHomeShapeId(id: (typeof homeImages)[number]["id"]) {
  return createShapeId(`home-${id}`);
}

function isPageGroupId(id: string): id is PageGroupId {
  return pageGroups.some((group) => group.id === id);
}

function isPageShapeId(shapeId: TLShapeId) {
  return pageGroups.some((group) =>
    group.images.some((image) => getPageShapeId(group.id, image.id) === shapeId),
  );
}

function getPageShapeGroupId(shapeId: TLShapeId) {
  const group = pageGroups.find((pageGroup) =>
    pageGroup.images.some((image) => getPageShapeId(pageGroup.id, image.id) === shapeId),
  );

  return group?.id;
}

function isHomeShapeId(shapeId: TLShapeId) {
  return homeImages.some((image) => getHomeShapeId(image.id) === shapeId);
}

function isSeededShapeId(shapeId: TLShapeId) {
  return isPageShapeId(shapeId) || isHomeShapeId(shapeId);
}

function getHomeTargetGroupId(shapeId: TLShapeId) {
  const homeImage = homeImages.find((image) => getHomeShapeId(image.id) === shapeId);

  if (!homeImage) return;
  if (!isPageGroupId(homeImage.id)) return;

  return homeImage.id;
}

function getFirstPageShapeId(groupId: PageGroupId) {
  const group = pageGroups.find((pageGroup) => pageGroup.id === groupId);
  const firstImage = group?.images[0];

  if (!group || !firstImage) return;

  return getPageShapeId(group.id, firstImage.id);
}

function getSeededShapeIdFromElement(target: EventTarget | null) {
  if (!(target instanceof Element)) return;

  const shapeElement = target.closest("[data-shape-id]");
  const shapeId = shapeElement?.getAttribute("data-shape-id") as TLShapeId | null;

  if (!shapeId) return;
  if (!isSeededShapeId(shapeId)) return;

  return shapeId;
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

function getHomeShapes(viewport: { w: number; h: number }, origin = { x: 0, y: 0 }) {
  const layout = getHomeLayout(viewport);

  return homeImages.map((image) => ({
    id: getHomeShapeId(image.id),
    type: "image" as const,
    x: origin.x + layout.positions[image.id].x,
    y: origin.y + layout.positions[image.id].y,
    props: {
      assetId: getHomeAssetId(image.id),
      w: image.w,
      h: image.h,
      altText: image.label,
    },
  }));
}

function getGridSize(isLandscape: boolean) {
  const columns = isLandscape ? 6 : pageGroups.length;
  const rows = isLandscape ? pageGroups.length : 6;

  return {
    columns,
    rows,
    w: columns * page.w + (columns - 1) * page.gap,
    h: rows * page.h + (rows - 1) * page.gap,
  };
}

function getBoundsAround(bounds: Bounds[]): Bounds {
  const minX = Math.min(...bounds.map((bound) => bound.x));
  const minY = Math.min(...bounds.map((bound) => bound.y));
  const maxX = Math.max(...bounds.map((bound) => bound.x + bound.w));
  const maxY = Math.max(...bounds.map((bound) => bound.y + bound.h));

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };
}

function getCanvasLayout(viewport: { w: number; h: number }) {
  const isLandscape = viewport.w >= viewport.h;
  const homeLayout = getHomeLayout(viewport);
  const gridSize = getGridSize(isLandscape);
  const layoutGap = Math.max(viewport.w, viewport.h, page.gap * 2);
  const homeOrigin = isLandscape
    ? { x: 0, y: (gridSize.h - homeLayout.bounds.h) / 2 }
    : { x: (gridSize.w - homeLayout.bounds.w) / 2, y: 0 };
  const grid: Bounds = isLandscape
    ? { x: homeLayout.bounds.w + layoutGap, y: 0, w: gridSize.w, h: gridSize.h }
    : { x: 0, y: homeLayout.bounds.h + layoutGap, w: gridSize.w, h: gridSize.h };
  const homeBounds = {
    x: homeOrigin.x,
    y: homeOrigin.y,
    w: homeLayout.bounds.w,
    h: homeLayout.bounds.h,
  };
  const groupBounds = Object.fromEntries(
    pageGroups.map((group, groupIndex) => {
      const bounds = isLandscape
        ? {
          x: grid.x,
          y: grid.y + groupIndex * (page.h + page.gap),
          w: grid.w,
          h: page.h,
        }
        : {
          x: grid.x + groupIndex * (page.w + page.gap),
          y: grid.y,
          w: page.w,
          h: grid.h,
        };

      return [group.id, bounds];
    }),
  ) as Record<PageGroupId, Bounds>;

  return {
    isLandscape,
    bounds: getBoundsAround([homeBounds, grid]),
    grid,
    homeBounds,
    homeOrigin,
    groupBounds,
  };
}

function getPageShapes(layout: ReturnType<typeof getCanvasLayout>, visiblePages: VisiblePages = "all") {
  if (visiblePages === "none") return [];

  return pageGroups.flatMap((group, groupIndex) => {
    if (visiblePages !== "all" && group.id !== visiblePages) return [];

    return group.images.map((image, imageIndex) => {
      const column = layout.isLandscape ? imageIndex : groupIndex;
      const row = layout.isLandscape ? groupIndex : imageIndex;

      return {
        id: getPageShapeId(group.id, image.id),
        type: "image" as const,
        x: layout.grid.x + column * (page.w + page.gap),
        y: layout.grid.y + row * (page.h + page.gap),
        props: {
          assetId: getPageAssetId(group.id, image.id),
          w: page.w,
          h: page.h,
          altText: `${group.label} ${image.label} page`,
        },
      };
    });
  });
}

function getPageShapeIds(visiblePages: VisiblePages = "all") {
  if (visiblePages === "none") return [];

  return pageGroups.flatMap((group) => {
    if (visiblePages !== "all" && group.id !== visiblePages) return [];

    return group.images.map((image) => getPageShapeId(group.id, image.id));
  });
}

function getVisiblePages(focus: CanvasFocus): VisiblePages {
  if (focus.type === "home") return "none";
  if (focus.type === "grid") return "all";

  return focus.groupId;
}

function getCanvasShapes(
  viewport: { w: number; h: number },
  layout: ReturnType<typeof getCanvasLayout>,
  includeHome = true,
  visiblePages: VisiblePages = "all",
) {
  const pageShapes = getPageShapes(layout, visiblePages);

  if (!includeHome) return pageShapes;

  return [...getHomeShapes(viewport, layout.homeOrigin), ...pageShapes];
}

function clearCanvas(editor: Editor) {
  editor.selectNone();
  editor.deleteShapes([...editor.getCurrentPageShapeIds()]);
}

function createImageAssets(editor: Editor, assets: TLImageAsset[]) {
  editor.createAssets(assets.filter((asset) => !editor.getAsset(asset.id)));
}

function deleteHomeShapes(editor: Editor) {
  const homeShapeIds = homeImages
    .map((image) => getHomeShapeId(image.id))
    .filter((shapeId) => editor.getShape(shapeId));

  if (homeShapeIds.length === 0) return;

  editor.deleteShapes(homeShapeIds);
}

function deleteHiddenPageShapes(editor: Editor, visiblePages: VisiblePages) {
  if (visiblePages === "all") return;

  const visibleShapeIds = new Set(getPageShapeIds(visiblePages));
  const hiddenShapeIds = getPageShapeIds().filter(
    (shapeId) => !visibleShapeIds.has(shapeId) && editor.getShape(shapeId),
  );

  if (hiddenShapeIds.length === 0) return;

  editor.deleteShapes(hiddenShapeIds);
}

function createOrUpdateShapes(editor: Editor, shapes: ReturnType<typeof getCanvasShapes>) {
  editor.createShapes(shapes.filter((shape) => !editor.getShape(shape.id)));
  editor.updateShapes(shapes.filter((shape) => editor.getShape(shape.id)));
}

function zoomToBounds(editor: Editor, bounds: Bounds, animate = false) {
  editor.zoomToBounds(bounds, {
    animation: animate ? { duration: cameraAnimationMs } : undefined,
    inset: 96,
  });
}

function createPageAssets(): TLImageAsset[] {
  return pageGroups.flatMap((group) =>
    group.images.map((image) => ({
      id: getPageAssetId(group.id, image.id),
      type: "image",
      typeName: "asset",
      meta: {},
      props: {
        w: page.w,
        h: page.h,
        name: image.file,
        isAnimated: false,
        // These are rectangular pages, so we can skip tldraw's transparent PNG alpha hit-testing.
        mimeType: null,
        src: `${import.meta.env.BASE_URL}images/${group.folder}/${image.file}`,
      },
    })),
  );
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

function focusCamera(editor: Editor, layout: ReturnType<typeof getCanvasLayout>, focus: CanvasFocus, animate: boolean) {
  if (focus.type === "home") {
    zoomToBounds(editor, layout.homeBounds, animate);
    return;
  }

  if (focus.type === "grid") {
    zoomToBounds(editor, layout.grid, animate);
    return;
  }

  const bounds = editor.getShapePageBounds(focus.shapeId);

  if (bounds) {
    zoomToBounds(editor, bounds, animate);
  }
}

function layoutCanvas(
  editor: Editor,
  animate = false,
  clear = false,
  focus: CanvasFocus = { type: "grid" },
  includeHome = focus.type === "home",
  visiblePages = getVisiblePages(focus),
) {
  const viewport = editor.getViewportScreenBounds();
  const layout = getCanvasLayout(viewport);
  const shapes = getCanvasShapes(viewport, layout, includeHome, visiblePages);

  editor.run(() => {
    if (clear) clearCanvas(editor);
    createImageAssets(editor, createPageAssets());
    if (includeHome) {
      createImageAssets(editor, createHomeAssets());
    } else {
      deleteHomeShapes(editor);
    }
    createOrUpdateShapes(editor, shapes);
    deleteHiddenPageShapes(editor, visiblePages);
  });

  focusCamera(editor, layout, focus, animate);
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
  const editorRef = useRef<Editor | null>(null);
  const focusRef = useRef<CanvasFocus>({ type: "home" });
  const hideHomeTimeoutRef = useRef<number | undefined>(undefined);
  const pendingVisiblePagesRef = useRef<VisiblePages | undefined>(undefined);
  const focusRequestIdRef = useRef(0);
  const [isHomeFocused, setIsHomeFocused] = useState(true);

  const clearPendingHomeHide = useCallback(() => {
    if (hideHomeTimeoutRef.current === undefined) return;

    window.clearTimeout(hideHomeTimeoutRef.current);
    hideHomeTimeoutRef.current = undefined;
    pendingVisiblePagesRef.current = undefined;
  }, []);

  const focusCanvas = useCallback((focus: CanvasFocus, animate = true) => {
    const previousFocus = focusRef.current;
    const wasHomeFocused = previousFocus.type === "home";
    const isReturningHomeFromSection =
      focus.type === "home" && previousFocus.type === "shape" && animate;
    const requestId = focusRequestIdRef.current + 1;
    const includeHome = focus.type === "home" || (wasHomeFocused && animate);
    const visiblePages = isReturningHomeFromSection
      ? previousFocus.groupId
      : getVisiblePages(focus);

    focusRequestIdRef.current = requestId;
    const editor = editorRef.current;

    clearPendingHomeHide();
    focusRef.current = focus;
    setIsHomeFocused(focus.type === "home");

    if (!editor) return;

    layoutCanvas(editor, animate, false, focus, includeHome, visiblePages);

    if (focus.type === "home" && !isReturningHomeFromSection) return;
    if (focus.type !== "home" && !includeHome) return;

    pendingVisiblePagesRef.current = visiblePages;

    hideHomeTimeoutRef.current = window.setTimeout(
      () => {
        hideHomeTimeoutRef.current = undefined;
        pendingVisiblePagesRef.current = undefined;

        if (focusRequestIdRef.current !== requestId) return;

        const currentEditor = editorRef.current;
        if (!currentEditor) return;

        currentEditor.run(() => {
          if (focus.type === "home") {
            deleteHiddenPageShapes(currentEditor, "none");
          } else {
            deleteHomeShapes(currentEditor);
          }
        });
      },
      animate ? cameraAnimationMs : 0,
    );
  }, [clearPendingHomeHide]);

  const handleHomeClick = () => {
    focusCanvas({ type: "home" });
  };

  const handleTouchCapture: TouchEventHandler<HTMLDivElement> = (event) => {
    if (getSeededShapeIdFromElement(event.target)) {
      event.stopPropagation();
    }
  };

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      focusRef.current = { type: "home" };
      setIsHomeFocused(true);

      layoutCanvas(editor, true, true, focusRef.current);

      const handleResize = () =>
        layoutCanvas(
          editor,
          false,
          false,
          focusRef.current,
          focusRef.current.type === "home" || hideHomeTimeoutRef.current !== undefined,
          pendingVisiblePagesRef.current ?? getVisiblePages(focusRef.current),
        );
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

        const targetGroupId = getHomeTargetGroupId(targetShapeId);

        if (targetGroupId) {
          const shapeId = getFirstPageShapeId(targetGroupId);
          if (shapeId) {
            focusCanvas({ type: "shape", groupId: targetGroupId, shapeId });
          }
          return;
        }

        if (targetShapeId === getHomeShapeId("intro")) {
          focusCanvas({ type: "grid" });
          return;
        }

        if (isPageShapeId(targetShapeId)) {
          const groupId = getPageShapeGroupId(targetShapeId);
          if (groupId) {
            focusCanvas({ type: "shape", groupId, shapeId: targetShapeId });
          }
        }
      };

      editor.on("resize", handleResize);
      editor.on("event", handleEvent);

      editor.setCurrentTool("select");

      return () => {
        clearPendingHomeHide();
        editor.off("resize", handleResize);
        editor.off("event", handleEvent);
        editorRef.current = null;
      };
    },
    [clearPendingHomeHide, focusCanvas],
  );

  return (
    <div
      style={{ position: "fixed", inset: 0 }}
      onTouchEndCapture={handleTouchCapture}
      onTouchStartCapture={handleTouchCapture}
    >
      <Tldraw hideUi onMount={handleMount} />
      {!isHomeFocused && (
        <button
          type="button"
          aria-label="Focus landing screen"
          onClick={handleHomeClick}
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            zIndex: 1,
            display: "grid",
            placeItems: "center",
            height: 48,
            padding: "0 18px",
            border: "1px solid rgba(0, 0, 0, 0.14)",
            borderRadius: 8,
            background: "#ffffff",
            color: "#111111",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.18)",
            cursor: "pointer",
            font: "600 16px/1 system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            touchAction: "manipulation",
          }}
        >
          Home
        </button>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
