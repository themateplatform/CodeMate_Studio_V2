import { Link } from "wouter";
import { ChevronRight, Home, Folder, FileText, Sparkles } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface WorkflowBreadcrumbsProps {
  items?: BreadcrumbItem[];
  projectName?: string;
  specTitle?: string;
}

export function WorkflowBreadcrumbs({ items, projectName, specTitle }: WorkflowBreadcrumbsProps) {
  const defaultItems: BreadcrumbItem[] = [
    { label: "Home", href: "/", icon: <Home className="h-4 w-4" /> },
  ];

  if (projectName) {
    defaultItems.push({
      label: projectName,
      href: "/projects",
      icon: <Folder className="h-4 w-4" />,
    });
  }

  if (specTitle) {
    defaultItems.push({
      label: specTitle,
      href: "/spec-editor",
      icon: <FileText className="h-4 w-4" />,
    });
  }

  const breadcrumbs = items || defaultItems;

  return (
    <nav className="flex items-center space-x-1 text-sm text-gray-600">
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
          {item.href ? (
            <Link href={item.href}>
              <a className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                {item.icon}
                <span>{item.label}</span>
              </a>
            </Link>
          ) : (
            <span className="flex items-center gap-1 font-medium text-gray-900">
              {item.icon}
              <span>{item.label}</span>
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
