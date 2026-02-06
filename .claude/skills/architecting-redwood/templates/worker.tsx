import { defineApp, render, layout, index, route, prefix } from "rwsdk/worker";
import { Document } from "./Document";
import { MainLayout } from "./layouts/MainLayout";
import { HomePage } from "./routes/Home";

export default defineApp([
  // CRITICAL: Document must use render(), not layout()
  render(Document, [
    layout(MainLayout, [
      index(HomePage),
      // route("/about", AboutPage),
    ]),
  ]),
]);