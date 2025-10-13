import { Recipe, GeneratedFiles } from "./types";
import { renderLayoutTemplate } from "../templates/components/layout.template.ts";
import { renderPageTemplate } from "../templates/components/page.template.ts";
import { renderFormTemplate } from "../templates/components/form.template.ts";

function renderComponentStub(name: string, recipeName: string): string {
  return `export interface ${name}Props {
  title?: string;
  description?: string;
}

export default function ${name}({ title = "${name}", description = "Generated component for the ${recipeName} experience." }: ${name}Props) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-slate-100">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}
`;
}

export function generateFiles(recipe: Recipe): GeneratedFiles {
  const files: GeneratedFiles = {};

  // Generate main App layout with routing
  files["src/App.tsx"] = renderLayoutTemplate(recipe);

  // Generate page components
  recipe.pages.forEach((page) => {
    files[`src/pages/${page.name}.tsx`] = renderPageTemplate(page.name, recipe.name);
  });

  // Generate additional components based on template type
  recipe.components.forEach((component) => {
    if (component.template === "form") {
      files[`src/components/${component.name}.tsx`] = renderFormTemplate(component.name, recipe.name);
      return;
    }

    files[`src/components/${component.name}.tsx`] = renderComponentStub(component.name, recipe.name);
  });

  return files;
}
