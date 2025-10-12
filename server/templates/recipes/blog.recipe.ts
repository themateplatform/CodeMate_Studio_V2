import { Recipe } from "../../generator/types.ts";

export const blogRecipe: Recipe = {
  name: "blog",
  pages: [
    { name: "Home", route: "/", template: "page" },
    { name: "Posts", route: "/posts", template: "page" },
    { name: "About", route: "/about", template: "page" },
  ],
  components: [
    { name: "PostCard", template: "component" },
    { name: "PostList", template: "component" },
  ],
  routes: [
    { path: "/", component: "Home" },
    { path: "/posts", component: "Posts" },
    { path: "/about", component: "About" },
  ],
  dataModels: [
    {
      name: "Post",
      fields: [
        { name: "id", type: "string" },
        { name: "title", type: "string" },
        { name: "content", type: "string" },
        { name: "author", type: "string" },
        { name: "publishedAt", type: "Date" },
      ],
    },
  ],
};
