import { Recipe } from "../../generator/types.ts";

export const landingRecipe: Recipe = {
  name: "landing",
  pages: [
    { name: "Home", route: "/", template: "page" },
    { name: "Features", route: "/features", template: "page" },
    { name: "Pricing", route: "/pricing", template: "page" },
    { name: "Contact", route: "/contact", template: "page" },
  ],
  components: [
    { name: "Hero", template: "component" },
    { name: "FeatureCard", template: "component" },
    { name: "PricingCard", template: "component" },
    { name: "ContactForm", template: "form" },
  ],
  routes: [
    { path: "/", component: "Home" },
    { path: "/features", component: "Features" },
    { path: "/pricing", component: "Pricing" },
    { path: "/contact", component: "Contact" },
  ],
  dataModels: [
    {
      name: "ContactRequest",
      fields: [
        { name: "id", type: "string" },
        { name: "name", type: "string" },
        { name: "email", type: "string" },
        { name: "message", type: "string" },
        { name: "createdAt", type: "Date" },
      ],
    },
  ],
};
