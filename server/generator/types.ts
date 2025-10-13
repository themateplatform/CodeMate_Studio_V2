export type PageTemplateKind = "page";

export type ComponentTemplateKind = "component" | "form";

export interface PageDefinition {
  name: string;
  route: string;
  template: PageTemplateKind;
}

export interface ComponentDefinition {
  name: string;
  template: ComponentTemplateKind;
}

export interface RouteDefinition {
  path: string;
  component: string;
}

export interface DataModelField {
  name: string;
  type: string;
}

export interface DataModelDefinition {
  name: string;
  fields: DataModelField[];
}

export interface Recipe {
  name: string;
  pages: PageDefinition[];
  components: ComponentDefinition[];
  routes: RouteDefinition[];
  dataModels: DataModelDefinition[];
}

export interface GeneratedFiles {
  [path: string]: string;
}
