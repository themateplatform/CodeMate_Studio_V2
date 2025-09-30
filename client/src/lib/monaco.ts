// Monaco Editor initialization and configuration
declare global {
  interface Window {
    monaco: any;
    require: any;
  }
}

let monacoLoaded = false;
let editorInstance: any = null;

export async function initializeMonaco(containerId: string): Promise<any> {
  if (editorInstance) {
    return editorInstance;
  }

  return new Promise((resolve) => {
    if (monacoLoaded && window.monaco) {
      createEditor(containerId, resolve);
      return;
    }

    // Load Monaco Editor from CDN
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/monaco-editor@0.45.0/min/vs/loader.js';
    script.onload = () => {
      window.require.config({ 
        paths: { 
          vs: 'https://unpkg.com/monaco-editor@0.45.0/min/vs' 
        } 
      });
      
      window.require(['vs/editor/editor.main'], () => {
        monacoLoaded = true;
        createEditor(containerId, resolve);
      });
    };
    
    document.head.appendChild(script);
  });
}

function createEditor(containerId: string, resolve: (editor: any) => void) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('Monaco container not found');
    return;
  }

  const editor = window.monaco.editor.create(container, {
    value: '// Welcome to CodeVibe\n// Start typing or use AI to generate code\n',
    language: 'typescript',
    theme: 'vs-dark',
    fontSize: 14,
    lineHeight: 1.5,
    fontFamily: 'JetBrains Mono, Consolas, monospace',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: 'on',
    renderLineHighlight: 'line',
    selectOnLineNumbers: true,
    matchBrackets: 'always',
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    formatOnPaste: true,
    formatOnType: true,
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on',
    tabCompletion: 'on',
  });

  // Configure TypeScript compiler options
  window.monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: window.monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: window.monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: window.monaco.languages.typescript.ModuleKind.CommonJS,
    noEmit: true,
    esModuleInterop: true,
    jsx: window.monaco.languages.typescript.JsxEmit.React,
    reactNamespace: 'React',
    allowJs: true,
    typeRoots: ['node_modules/@types'],
  });

  // Add React types
  const reactTypes = `
    declare module 'react' {
      export interface FunctionComponent<P = {}> {
        (props: P, context?: any): React.ReactElement<any, any> | null;
      }
      export interface Component<P = {}, S = {}> {}
      export function useState<T>(initialState: T): [T, (newState: T) => void];
      export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
      export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
      export function useMemo<T>(factory: () => T, deps: any[]): T;
      export const ReactNode: any;
      export const ReactElement: any;
    }
  `;

  window.monaco.languages.typescript.typescriptDefaults.addExtraLib(
    reactTypes,
    'file:///node_modules/@types/react/index.d.ts'
  );

  editorInstance = editor;
  resolve(editor);
}

export function disposeMonaco() {
  if (editorInstance) {
    editorInstance.dispose();
    editorInstance = null;
  }
}
