import { Recipe } from "../../generator/types.ts";

export function renderLayoutTemplate(recipe: Recipe): string {
  const imports = recipe.pages
    .map((page) => `import ${page.name} from "./pages/${page.name}";`)
    .join("\n");

  const navLinks = recipe.routes
    .map((route) => `              <Link key="${route.path}" to="${route.path}" className="hover:text-white">${route.component}</Link>`)
    .join("\n");

  const routeElements = recipe.routes
    .map((route) => `            <Route path="${route.path}" element={<${route.component} />} />`)
    .join("\n");

  return `import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./index.css";
${imports}

export default function App() {
  return (
    <BrowserRouter>
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <header className="sticky top-0 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <span className="text-lg font-semibold">${recipe.name.charAt(0).toUpperCase() + recipe.name.slice(1)}</span>
            <nav className="flex gap-3 text-sm text-slate-200">
${navLinks}
            </nav>
          </div>
        </header>
        <section className="mx-auto max-w-5xl px-6 py-12">
          <Routes>
${routeElements}
          </Routes>
        </section>
      </main>
    </BrowserRouter>
  );
}
`;
}
