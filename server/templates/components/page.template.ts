export function renderPageTemplate(pageName: string, recipeName: string): string {
  const title = pageName.charAt(0).toUpperCase() + pageName.slice(1);

  return `import { Link } from "react-router-dom";

export default function ${title}Page() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-100">${title}</h1>
        <p className="text-slate-400">Scaffolded page for the ${recipeName} template.</p>
      </header>
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm text-slate-300">
          TODO: Populate this section with generated components and data.
        </p>
      </section>
      <footer className="text-xs text-slate-600">
        <Link to="/">← Back to home</Link>
      </footer>
    </div>
  );
}
`;
}
