import { createRoot } from "react-dom/client";
import { type Editor, Tldraw, toRichText } from "tldraw";
import "tldraw/tldraw.css";

function App() {
  const handleMount = (editor: Editor) => {
    editor.createShape({
      type: "text",
      x: 0,
      y: 0,
      props: {
        richText: toRichText("Luke Jackson"),
      },
    });

    editor.createShape({
      type: "text",
      x: 0,
      y: 80,
      props: {
        richText: toRichText("A new homepage canvas."),
      },
    });

    editor.selectAll();
    editor.zoomToSelection({ animation: { duration: 600 } });
    editor.setCurrentTool("select");
  };

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Tldraw hideUi onMount={handleMount} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
