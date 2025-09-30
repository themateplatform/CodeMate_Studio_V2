import { useState } from "react";
import { Square, Type, CreditCard, Table as TableIcon, Layout, Image, List, Calendar } from "lucide-react";
import { ComponentLibraryItem } from "@/types";
import { cn } from "@/lib/utils";

const componentLibrary: ComponentLibraryItem[] = [
  {
    id: 'button',
    name: 'Button',
    icon: 'Square',
    category: 'Form',
    template: '<Button variant="default">Click me</Button>',
    description: 'Interactive button component'
  },
  {
    id: 'input',
    name: 'Input',
    icon: 'Type',
    category: 'Form',
    template: '<Input placeholder="Enter text..." />',
    description: 'Text input field'
  },
  {
    id: 'card',
    name: 'Card',
    icon: 'CreditCard',
    category: 'Layout',
    template: '<Card><CardHeader><CardTitle>Title</CardTitle></CardHeader><CardContent>Content</CardContent></Card>',
    description: 'Container card component'
  },
  {
    id: 'table',
    name: 'Table',
    icon: 'TableIcon',
    category: 'Data',
    template: '<Table><TableHeader><TableRow><TableHead>Header</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Cell</TableCell></TableRow></TableBody></Table>',
    description: 'Data table component'
  },
  {
    id: 'layout',
    name: 'Layout',
    icon: 'Layout',
    category: 'Layout',
    template: '<div className="grid grid-cols-2 gap-4"><div>Left</div><div>Right</div></div>',
    description: 'Layout container'
  },
  {
    id: 'image',
    name: 'Image',
    icon: 'Image',
    category: 'Media',
    template: '<img src="https://via.placeholder.com/300x200" alt="Placeholder" className="rounded-lg" />',
    description: 'Image component'
  },
  {
    id: 'list',
    name: 'List',
    icon: 'List',
    category: 'Data',
    template: '<ul className="list-disc pl-6"><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>',
    description: 'List component'
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: 'Calendar',
    category: 'Form',
    template: '<Calendar />',
    description: 'Date picker calendar'
  }
];

const getIconComponent = (iconName: string) => {
  const icons: Record<string, any> = {
    Square,
    Type,
    CreditCard,
    TableIcon,
    Layout,
    Image,
    List,
    Calendar
  };
  return icons[iconName] || Square;
};

export function ComponentLibrary() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [draggedComponent, setDraggedComponent] = useState<ComponentLibraryItem | null>(null);

  const categories = ['All', 'Form', 'Layout', 'Data', 'Media'];

  const filteredComponents = selectedCategory === 'All' 
    ? componentLibrary 
    : componentLibrary.filter(comp => comp.category === selectedCategory);

  const handleDragStart = (component: ComponentLibraryItem) => {
    setDraggedComponent(component);
  };

  const handleDragEnd = () => {
    setDraggedComponent(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Category Filter */}
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Component Library</h3>
        <div className="flex flex-wrap gap-1">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "px-2 py-1 text-xs rounded",
                selectedCategory === category 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
              data-testid={`category-${category.toLowerCase()}`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Components Grid */}
      <div className="flex-1 p-3 overflow-auto">
        <div className="grid grid-cols-2 gap-2">
          {filteredComponents.map(component => {
            const IconComponent = getIconComponent(component.icon);
            
            return (
              <div
                key={component.id}
                className={cn(
                  "p-3 bg-secondary/50 rounded-md cursor-pointer hover:bg-secondary transition-colors",
                  draggedComponent?.id === component.id && "opacity-50"
                )}
                draggable
                onDragStart={() => handleDragStart(component)}
                onDragEnd={handleDragEnd}
                title={component.description}
                data-testid={`component-${component.name.toLowerCase()}`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <IconComponent className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium">{component.name}</span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {component.category}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {component.description}
                </div>
              </div>
            );
          })}
        </div>

        {filteredComponents.length === 0 && (
          <div className="text-center text-muted-foreground p-8">
            <Layout className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No components in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
