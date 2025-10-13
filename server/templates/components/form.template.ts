export function renderFormTemplate(componentName: string, recipeName: string): string {
  const safeName = componentName || "GeneratedForm";
  const submitLabel = recipeName ? `Submit ${recipeName}` : "Submit";

  return `import { FormEvent } from "react";

export interface ${safeName}Props {
  onSubmit?: (formData: Record<string, string>) => void;
}

export default function ${safeName}({ onSubmit }: ${safeName}Props) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = Object.fromEntries(data.entries());

    onSubmit?.(payload as Record<string, string>);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* TODO: Replace with generated inputs */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-200">Example field</label>
        <input
          name="example"
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-slate-500 focus:outline-none"
          placeholder="Populate via generator"
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 shadow transition hover:bg-white"
      >
        ${submitLabel}
      </button>
    </form>
  );
}
`;
}
