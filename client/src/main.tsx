import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.title = "訂單管理系統";

createRoot(document.getElementById("root")!).render(<App />);
