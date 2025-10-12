import { Recipe } from "../../generator/types.ts";

export const dashboardRecipe: Recipe = {
  name: "dashboard",
  pages: [
    { name: "Dashboard", route: "/", template: "page" },
    { name: "Analytics", route: "/analytics", template: "page" },
    { name: "Settings", route: "/settings", template: "page" },
  ],
  components: [
    { name: "StatsCard", template: "component" },
    { name: "Chart", template: "component" },
    { name: "DataTable", template: "component" },
  ],
  routes: [
    { path: "/", component: "Dashboard" },
    { path: "/analytics", component: "Analytics" },
    { path: "/settings", component: "Settings" },
  ],
  dataModels: [
    {
      name: "Metric",
      fields: [
        { name: "id", type: "string" },
        { name: "name", type: "string" },
        { name: "value", type: "number" },
        { name: "timestamp", type: "Date" },
      ],
    },
  ],
};
