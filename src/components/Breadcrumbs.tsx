import { useLocation, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Home, Activity, History, Brain, GitCompare, type LucideIcon } from 'lucide-react';

const routeMap: Record<string, { label: string; icon: LucideIcon }> = {
  '/': { label: 'Run Scan', icon: Activity },
  '/previous-scans': { label: 'Previous Scans', icon: History },
  '/session-comparison': { label: 'Session Comparison', icon: GitCompare },
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (location.pathname === '/') {
    return null;
  }

  const getBreadcrumbItems = () => {
    const items = [
      <BreadcrumbItem key="home">
        <BreadcrumbLink asChild>
          <Link to="/" className="flex items-center gap-1.5">
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>
        </BreadcrumbLink>
      </BreadcrumbItem>,
    ];

    let currentPath = '';
    pathnames.forEach((pathname, index) => {
      currentPath += `/${pathname}`;
      const isLast = index === pathnames.length - 1;
      const routeInfo = routeMap[currentPath];

      if (routeInfo) {
        const IconComponent = routeInfo.icon;
        items.push(
          <BreadcrumbSeparator key={`sep-${index}`} />,
          <BreadcrumbItem key={currentPath}>
            {isLast ? (
              <BreadcrumbPage className="flex items-center gap-1.5">
                <IconComponent className="h-4 w-4" />
                <span>{routeInfo.label}</span>
              </BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link to={currentPath} className="flex items-center gap-1.5">
                  <IconComponent className="h-4 w-4" />
                  <span>{routeInfo.label}</span>
                </Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        );
      } else if (pathname === 'session' && pathnames[index + 1]) {
        const sessionId = pathnames[index + 1];
        items.push(
          <BreadcrumbSeparator key={`sep-${index}`} />,
          <BreadcrumbItem key={currentPath}>
            <BreadcrumbLink asChild>
              <Link to="/previous-scans" className="flex items-center gap-1.5">
                <History className="h-4 w-4" />
                <span>Previous Scans</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>,
          <BreadcrumbSeparator key={`sep-session`} />,
          <BreadcrumbItem key={`${currentPath}/${sessionId}`}>
            <BreadcrumbPage className="flex items-center gap-1.5">
              <Brain className="h-4 w-4" />
              <span>Session {sessionId}</span>
            </BreadcrumbPage>
          </BreadcrumbItem>
        );
      }
    });

    return items;
  };

  return (
    <Breadcrumb className="px-6 py-3 bg-card/50 border-b border-border">
      <div className="max-w-[1800px] mx-auto">
        <BreadcrumbList>{getBreadcrumbItems()}</BreadcrumbList>
      </div>
    </Breadcrumb>
  );
}
